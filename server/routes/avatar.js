const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");

const router = express.Router();

async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required. Please log in." });
  }
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ message: "Server authentication is not configured." });
  }
  try {
    const decoded = jwt.verify(authHeader.slice("Bearer ".length), process.env.JWT_SECRET);
    if (!decoded.userId || !mongoose.isValidObjectId(decoded.userId)) {
      return res.status(401).json({ message: "Invalid login session. Please log in again." });
    }
    if (!(await User.exists({ _id: decoded.userId }))) {
      return res.status(401).json({ message: "Account not found. Please log in again." });
    }
    req.userId = decoded.userId;
    return next();
  } catch {
    return res.status(401).json({ message: "Session expired or invalid. Please log in again." });
  }
}

router.use(authenticateToken);

// Only return capability flags. Secret API keys never leave the backend.
router.get("/status", (req, res) => {
  const simliEnabled = Boolean(
    process.env.SIMLI_API_KEY?.trim() &&
    process.env.SIMLI_FACE_ID?.trim() &&
    process.env.GEMINI_API_KEY?.trim()
  );
  return res.json({
    simliEnabled,
    message: simliEnabled ? "Simli avatar is configured." : "Simli avatar is not configured; browser voice remains available.",
  });
});

// Create a short-lived session token. Never send SIMLI_API_KEY to the browser.
router.post("/simli-token", async (req, res) => {
  const apiKey = process.env.SIMLI_API_KEY?.trim();
  const faceId = process.env.SIMLI_FACE_ID?.trim();
  if (!apiKey || !faceId) {
    return res.status(503).json({ message: "Simli is not configured. Add SIMLI_API_KEY and SIMLI_FACE_ID to server/.env." });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch("https://api.simli.ai/compose/token", {
      method: "POST",
      headers: {
        "x-simli-api-key": apiKey,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        faceId,
        apiVersion: "v2",
        handleSilence: true,
        maxSessionLength: 1200,
        maxIdleTime: 300,
        audioInputFormat: "pcm16",
        streaming_width: 768,
        streaming_height: 768,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || typeof payload.session_token !== "string") {
      const detail = typeof payload.detail === "string"
        ? payload.detail
        : Array.isArray(payload.detail)
          ? payload.detail.map((item) => item?.msg).filter(Boolean).join("; ")
          : "Simli could not create a session token.";
      console.error("Simli token request failed:", response.status, detail.slice(0, 400));
      return res.status(502).json({ message: detail || "Simli could not create a session token." });
    }
    return res.json({ session_token: payload.session_token, warnings: payload.warnings || [] });
  } catch (error) {
    console.error("Simli token connection failed:", error.name || "Error", error.message);
    return res.status(502).json({ message: "Could not connect to Simli. Check the API key, face ID, and network connection." });
  } finally {
    clearTimeout(timeout);
  }
});

// Stream speech chunks to the browser as soon as Gemini produces them. This avoids
// waiting for a complete audio file before the avatar can begin speaking.
router.post("/simli-speech-stream", async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return res.status(503).json({ message: "Gemini TTS is not configured. Add GEMINI_API_KEY to server/.env." });
  }

  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  if (!text || text.length > 1200) {
    return res.status(400).json({ message: "Speech text must contain between 1 and 1,200 characters." });
  }

  const model = process.env.GEMINI_TTS_MODEL?.trim() || "gemini-3.8-flash-lite-tts";
  const voice = process.env.GEMINI_TTS_VOICE?.trim() || "Sulafat";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  let audioBytesSent = 0;

  res.on("close", () => {
    if (!res.writableEnded) controller.abort();
  });

  try {
    const upstream = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        input: [{
          type: "user_input",
          content: [{
            type: "text",
            text,
            annotations: [{
              type: "speech_metadata",
              style: "A warm, friendly female interviewer speaking naturally in clear conversational English. Use a relaxed medium pitch, gentle intonation, reassuring and professional tone, and a steady natural pace. Sound human and approachable. Do not sound spooky, ominous, whispery, breathy, robotic, or overly dramatic.",
            }],
          }],
        }],
        response_format: { type: "audio", mime_type: "audio/l16", sample_rate: 16000 },
        generation_config: { speech_config: [{ voice }] },
        stream: true,
      }),
    });

    if (!upstream.ok) {
      const body = await upstream.text().catch(() => "");
      let message = `Gemini TTS returned HTTP ${upstream.status}.`;
      try {
        const parsed = JSON.parse(body);
        message = parsed?.error?.message || parsed?.message || message;
      } catch {
        if (body) message = `${message} ${body.slice(0, 220)}`;
      }
      console.error("Gemini streaming TTS request failed:", upstream.status, message.slice(0, 350));
      return res.status(502).json({ message: `Gemini speech generation failed. ${message.slice(0, 240)}` });
    }
    if (!upstream.body) {
      return res.status(502).json({ message: "Gemini TTS did not return a readable audio stream." });
    }

    res.status(200);
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Cache-Control", "no-store, no-transform");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Audio-Sample-Rate", "16000");
    res.setHeader("X-Audio-Format", "pcm_s16le_mono");
    // The browser app runs on a different local port, so expose custom headers to CORS clients.
    res.setHeader("Access-Control-Expose-Headers", "X-Audio-Sample-Rate, X-Audio-Format");
    res.setHeader("X-Accel-Buffering", "no");
    if (typeof res.flushHeaders === "function") res.flushHeaders();

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let eventBuffer = "";
    let upstreamError = "";

    const writeAudioEvent = async (eventText) => {
      const dataLines = eventText
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart());
      if (!dataLines.length) return;
      const dataText = dataLines.join("\n").trim();
      if (!dataText || dataText === "[DONE]") return;

      let event;
      try {
        event = JSON.parse(dataText);
      } catch {
        return; // Ignore non-JSON keepalive/metadata frames.
      }
      if (event?.error || String(event?.event_type || "").toLowerCase().includes("error")) {
        upstreamError = event?.error?.message || event?.message || "Gemini streaming TTS failed mid-response.";
        throw new Error(upstreamError);
      }
      const audioData = event?.delta?.type === "audio" && typeof event?.delta?.data === "string"
        ? event.delta.data
        : (event?.type === "audio" && typeof event?.data === "string" ? event.data : null);
      if (!audioData) return;

      const chunk = Buffer.from(audioData, "base64");
      if (!chunk.length) return;
      audioBytesSent += chunk.length;
      if (!res.write(chunk)) {
        await new Promise((resolve) => res.once("drain", resolve));
      }
    };

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      eventBuffer += decoder.decode(value, { stream: true });

      let boundaryMatch;
      while ((boundaryMatch = /\r?\n\r?\n/.exec(eventBuffer)) !== null) {
        const frame = eventBuffer.slice(0, boundaryMatch.index);
        eventBuffer = eventBuffer.slice(boundaryMatch.index + boundaryMatch[0].length);
        await writeAudioEvent(frame);
      }
    }

    eventBuffer += decoder.decode();
    if (eventBuffer.trim()) await writeAudioEvent(eventBuffer);
    if (audioBytesSent === 0) {
      console.error("Gemini streaming TTS completed without audio data.", upstreamError || "");
    }
    return res.end();
  } catch (error) {
    console.error("Gemini streaming TTS failed:", error.name || "Error", (error.message || "").slice(0, 300));
    if (!res.headersSent) {
      return res.status(502).json({ message: "Could not stream speech audio. Browser voice fallback is still available." });
    }
    if (!res.writableEnded) res.destroy(error);
  } finally {
    clearTimeout(timeout);
  }
});

// Generate the PCM audio Simli needs. TTS runs server-side so the Gemini key remains private.
router.post("/simli-speech", async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return res.status(503).json({ message: "Gemini TTS is not configured. Add GEMINI_API_KEY to server/.env." });
  }
  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  if (!text || text.length > 1200) {
    return res.status(400).json({ message: "Speech text must contain between 1 and 1,200 characters." });
  }

  const model = process.env.GEMINI_TTS_MODEL?.trim() || "gemini-3.8-flash-lite-tts";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        input: [{
          type: "user_input",
          content: [{
            type: "text",
            text,
            annotations: [{ type: "speech_metadata", style: "A warm, friendly female interviewer speaking naturally in clear conversational English. Use a relaxed medium pitch, gentle intonation, reassuring and professional tone, and a steady natural pace. Sound human and approachable. Do not sound spooky, ominous, whispery, breathy, robotic, or overly dramatic." }],
          }],
        }],
        response_format: { type: "audio", mime_type: "audio/l16", sample_rate: 16000 },
        generation_config: { speech_config: [{ voice: process.env.GEMINI_TTS_VOICE?.trim() || "Sulafat" }] },
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const apiMessage = payload?.error?.message || payload?.message || `Gemini TTS returned HTTP ${response.status}.`;
      console.error("Gemini TTS request failed:", response.status, String(apiMessage).slice(0, 350));
      return res.status(502).json({ message: `Gemini speech generation failed. ${String(apiMessage).slice(0, 240)}` });
    }

    // Interactions REST responses use steps[].content[].data for base64 audio;
    // the output_audio convenience field is also accepted for forward compatibility.
    const contentItems = Array.isArray(payload.steps)
      ? payload.steps.flatMap((step) => Array.isArray(step?.content) ? step.content : [])
      : [];
    const audioPart = contentItems.filter((item) => item?.type === "audio" && typeof item.data === "string").at(-1);
    const audioBase64 = payload?.output_audio?.data || audioPart?.data;
    if (!audioBase64) {
      console.error("Gemini TTS returned no audio data.");
      return res.status(502).json({ message: "Gemini TTS returned no audio. Check that the configured model supports speech generation." });
    }

    return res.json({ audioBase64, sampleRate: 16000, channels: 1, format: "pcm_s16le" });
  } catch (error) {
    console.error("Gemini TTS connection failed:", error.name || "Error", error.message);
    return res.status(502).json({ message: "Could not generate speech audio. Browser voice fallback is still available." });
  } finally {
    clearTimeout(timeout);
  }
});

module.exports = router;
