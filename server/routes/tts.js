const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");

const router = express.Router();

async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Authentication required. Please log in."
    });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({
      message: "Server authentication is not configured."
    });
  }

  try {
    const token = authHeader.slice("Bearer ".length);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.userId || !mongoose.isValidObjectId(decoded.userId)) {
      return res.status(401).json({
        message: "Invalid login session."
      });
    }

    const userExists = await User.exists({ _id: decoded.userId });

    if (!userExists) {
      return res.status(401).json({
        message: "Account not found."
      });
    }

    req.userId = decoded.userId;
    return next();
  } catch {
    return res.status(401).json({
      message: "Session expired or invalid."
    });
  }
}

router.post("/", authenticateToken, async (req, res) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const text = typeof req.body?.text === "string"
      ? req.body.text.trim()
      : "";

    if (!text || text.length > 2000) {
      return res.status(400).json({
        message: "Speech text must contain between 1 and 2000 characters."
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        message: "Gemini TTS is not configured."
      });
    }

    const model = process.env.GEMINI_TTS_MODEL ||
      "gemini-3.8-flash-lite-tts";

    const voice = process.env.GEMINI_TTS_VOICE || "Sulafat";

    const upstream = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/interactions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY
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
                style: "calm, friendly, professional interviewer"
              }]
            }]
          }],
          response_format: { type: "audio" },
          generation_config: {
            speech_config: [{ voice }]
          }
        })
      }
    );

    const payload = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      console.error(
        "Gemini TTS error:",
        upstream.status,
        payload?.error?.message || "Unknown error"
      );

      return res.status(502).json({
        message: "AI voice generation failed."
      });
    }

    const audioParts = [];

    for (const step of payload?.steps || []) {
      if (step?.type !== "model_output" || !Array.isArray(step.content)) {
        continue;
      }

      for (const content of step.content) {
        if (content?.type === "audio" && typeof content.data === "string") {
          audioParts.push(content.data);
        }
      }
    }

    const audioBase64 = audioParts[audioParts.length - 1];

    if (!audioBase64) {
      return res.status(502).json({
        message: "Gemini returned no audio."
      });
    }

    const audioBuffer = Buffer.from(audioBase64, "base64");

    const isWaveFile =
      audioBuffer.length > 44 &&
      audioBuffer.toString("ascii", 0, 4) === "RIFF" &&
      audioBuffer.toString("ascii", 8, 12) === "WAVE";

    if (!isWaveFile) {
      return res.status(502).json({
        message: "Unsupported audio format returned by Gemini."
      });
    }

    res.set({
      "Content-Type": "audio/wav",
      "Content-Length": String(audioBuffer.length),
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    });

    return res.status(200).send(audioBuffer);

  } catch (error) {
    if (error?.name === "AbortError") {
      return res.status(504).json({
        message: "AI voice generation timed out."
      });
    }

    console.error("TTS route error:", error.message);

    return res.status(502).json({
      message: "AI voice service is temporarily unavailable."
    });

  } finally {
    clearTimeout(timeout);
  }
});

module.exports = router;
