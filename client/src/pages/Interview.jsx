import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import { API_URL } from "../config/api";
import {
  FiAlertCircle,
  FiCamera,
  FiMic,
  FiPause,
  FiRefreshCw,
  FiVolume2,
  FiVolumeX,
  FiVideoOff,
  FiX,
} from "react-icons/fi";

const MAX_QUESTIONS = 8;

function AIIcon({ className = "h-10 w-10", alt = "AI interviewer" }) {
  return (
    <img
      src="/ai-interviewer.png"
      alt={alt}
      className={`${className} rounded-full object-cover object-top`}
    />
  );
}

const STARTERS = {
  HR: "Tell me about yourself and your current goals.",
  Technical: "Explain the four main principles of object-oriented programming.",
  Communication: "Introduce yourself in a clear 60-second response.",
};

const formatDuration = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes} min ${remainingSeconds} sec`;
};

const formatClock = (seconds) => {
  const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
  const remainingSeconds = String(seconds % 60).padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
};

let cachedPreferredBrowserVoice = null;
let preferredVoiceLoadPromise = null;

const choosePreferredBrowserVoice = (voices) => {
  const englishVoices = voices.filter((voice) => /^en([_-]|$)/i.test(voice.lang || ""));
  if (!englishVoices.length) return null;

  const likelyFemale = /female|zira|heera|aria|jenny|samantha|susan|karen|salli|joanna|tessa|moira|ava|priya|neerja|sonia|natasha|lisa|michelle|sara|sarah|kate|serena|victoria|hazel|emily|emma|amy|allison|linda|june|sulafat|aoede|leda|zephyr|callirrhoe|despina|erinome|achernar|vindemiatrix|schedar/i;
  const likelyMale = /\b(male|david|mark|guy|daniel|james|john|ravi|andrew|brian|christopher|eric|alex)\b/i;
  const scoreVoice = (voice) => {
    const identity = `${voice.name || ""} ${voice.voiceURI || ""}`;
    let score = likelyFemale.test(identity) ? 100 : 0;
    if (likelyMale.test(identity)) score -= 90;
    if (/en[-_]in/i.test(voice.lang || "")) score += 8;
    if (/en[-_]gb/i.test(voice.lang || "")) score += 3;
    if (/en[-_]us/i.test(voice.lang || "")) score += 2;
    if (voice.default) score += 1;
    return score;
  };
  return englishVoices.slice().sort((a, b) => scoreVoice(b) - scoreVoice(a))[0] || null;
};

const getPreferredBrowserVoice = async () => {
  if (!("speechSynthesis" in window)) return null;
  if (cachedPreferredBrowserVoice) return cachedPreferredBrowserVoice;

  const synth = window.speechSynthesis;
  const voices = synth.getVoices();
  const immediateVoice = choosePreferredBrowserVoice(voices);
  if (immediateVoice) {
    cachedPreferredBrowserVoice = immediateVoice;
    return immediateVoice;
  }

  // Share one short voice-list wait between callers, instead of delaying every spoken question.
  if (!preferredVoiceLoadPromise) {
    preferredVoiceLoadPromise = new Promise((resolve) => {
      let finished = false;
      let timeoutId;
      const finish = () => {
        if (finished) return;
        finished = true;
        window.clearTimeout(timeoutId);
        synth.removeEventListener?.("voiceschanged", finish);
        const selected = choosePreferredBrowserVoice(synth.getVoices());
        if (selected) cachedPreferredBrowserVoice = selected;
        resolve(selected);
      };
      timeoutId = window.setTimeout(finish, 200);
      synth.addEventListener?.("voiceschanged", finish, { once: true });
      if (synth.getVoices().length) finish();
    }).finally(() => {
      preferredVoiceLoadPromise = null;
    });
  }

  return preferredVoiceLoadPromise;
};

export default function Interview() {
  const navigate = useNavigate();
  const videoRef = useRef(null); // Candidate camera
  const streamRef = useRef(null);
  const recognitionRef = useRef(null);
  const transcriptRef = useRef("");
  const activeRef = useRef(false);
  const autoSubmitTimerRef = useRef(null);
  const autoListenTimerRef = useRef(null);
  const loadingRef = useRef(false);
  const submittingRef = useRef(false);
  const autoConversationRef = useRef(true);
  const questionRef = useRef(STARTERS.HR);
  const answersRef = useRef([]);
  const typeRef = useRef("HR");
  const startedAtRef = useRef(null);
  const mutedRef = useRef(false);
  const speechAbortRef = useRef(null);
  const speechAudioRef = useRef(null);
  const speechObjectUrlRef = useRef(null);

  const [type, setType] = useState("HR");
  const [status, setStatus] = useState("ready");
  const [question, setQuestion] = useState(STARTERS.HR);
  const [transcript, setTranscript] = useState("");
  const [answers, setAnswers] = useState([]);
  const [error, setError] = useState("");
  const [startedAt, setStartedAt] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [finished, setFinished] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [recognitionSupported, setRecognitionSupported] = useState(true);
  const [autoConversation, setAutoConversation] = useState(true);
  const [retryOpen, setRetryOpen] = useState({});
  const [retryDrafts, setRetryDrafts] = useState({});
  const [retryResults, setRetryResults] = useState({});
  const [retryLoading, setRetryLoading] = useState({});
  const [retryErrors, setRetryErrors] = useState({});

  // These refs keep automatic speech callbacks in sync with the latest React state.
  questionRef.current = question;
  answersRef.current = answers;
  typeRef.current = type;
  startedAtRef.current = startedAt;
  mutedRef.current = muted;

  const clearAutoSubmitTimer = () => {
    if (autoSubmitTimerRef.current !== null) {
      window.clearTimeout(autoSubmitTimerRef.current);
      autoSubmitTimerRef.current = null;
    }
  };

  const clearAutoListenTimer = () => {
    if (autoListenTimerRef.current !== null) {
      window.clearTimeout(autoListenTimerRef.current);
      autoListenTimerRef.current = null;
    }
  };

  // Stop either the server-generated audio or the local browser fallback voice.
  const stopSpeech = () => {
    if (speechAbortRef.current) {
      speechAbortRef.current.abort();
      speechAbortRef.current = null;
    }

    const player = speechAudioRef.current;
    if (player) {
      player.onended = null;
      player.onerror = null;
      player.pause();
      player.removeAttribute("src");
      player.load();
      speechAudioRef.current = null;
    }

    if (speechObjectUrlRef.current) {
      URL.revokeObjectURL(speechObjectUrlRef.current);
      speechObjectUrlRef.current = null;
    }

    window.speechSynthesis?.cancel();
  };

  const scheduleAutoSubmit = (text) => {
    clearAutoSubmitTimer();
    const cleanText = (text || "").trim();
    const wordCount = cleanText ? cleanText.split(/\s+/).length : 0;

    // Avoid auto-sending tiny fragments or a single accidental word.
    if (!autoConversationRef.current || cleanText.length < 12 || wordCount < 3) {
      return;
    }

    autoSubmitTimerRef.current = window.setTimeout(() => {
      autoSubmitTimerRef.current = null;
      if (!activeRef.current || loadingRef.current || !autoConversationRef.current) {
        return;
      }

      // Stop capture, allow any last final speech result to arrive, then submit.
      recognitionRef.current?.stop?.();
      autoSubmitTimerRef.current = window.setTimeout(() => {
        autoSubmitTimerRef.current = null;
        if (activeRef.current && !loadingRef.current && autoConversationRef.current) {
          void submitAnswer();
        }
      }, 250);
    }, 1800);
  };

  const toggleAutoConversation = () => {
    const nextValue = !autoConversationRef.current;
    autoConversationRef.current = nextValue;
    setAutoConversation(nextValue);
    if (!nextValue) {
      clearAutoSubmitTimer();
      clearAutoListenTimer();
    }
  };

  // Warm up browser voices while the user is still on the setup screen.
  // This avoids delaying the first spoken question after clicking Start.
  useEffect(() => {
    void getPreferredBrowserVoice();
  }, []);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    setRecognitionSupported(Boolean(SpeechRecognition));

    return () => {
      activeRef.current = false;
      clearAutoSubmitTimer();
      clearAutoListenTimer();
      stopSpeech();
      recognitionRef.current?.stop?.();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    setQuestion(STARTERS[type]);
  }, [type]);

  // Attach the camera stream after the live interview view has mounted.
  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraOn, status]);

  useEffect(() => {
    if (!startedAt || status === "ready" || status === "finished") return undefined;

    const updateElapsedTime = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    };

    updateElapsedTime();
    const intervalId = window.setInterval(updateElapsedTime, 1000);
    return () => window.clearInterval(intervalId);
  }, [startedAt, status]);

  const scheduleListeningAfterSpeech = () => {
    if (!activeRef.current) return;
    setStatus("ready-to-answer");
    if (!autoConversationRef.current || !recognitionSupported) return;

    clearAutoListenTimer();
    autoListenTimerRef.current = window.setTimeout(() => {
      autoListenTimerRef.current = null;
      if (activeRef.current && autoConversationRef.current && !loadingRef.current) {
        startListening();
      }
    }, 350);
  };

  const speakWithBrowserFallback = async (text) => {
    if (
      !("speechSynthesis" in window) ||
      typeof SpeechSynthesisUtterance === "undefined"
    ) {
      scheduleListeningAfterSpeech();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const preferredVoice = await getPreferredBrowserVoice();
    if (preferredVoice) {
      utterance.voice = preferredVoice;
      utterance.lang = preferredVoice.lang || "en-IN";
    } else {
      utterance.lang = "en-IN";
    }
    utterance.rate = 1.0;
    utterance.pitch = 1.04;
    utterance.volume = 1;
    utterance.onstart = () => setStatus("speaking");
    utterance.onend = scheduleListeningAfterSpeech;
    utterance.onerror = scheduleListeningAfterSpeech;
    window.speechSynthesis.speak(utterance);
  };

  const speak = async (text) => {
    const cleanText = String(text || "").trim();
    if (!cleanText) return;

    if (mutedRef.current) {
      scheduleListeningAfterSpeech();
      return;
    }

    stopSpeech();
    setStatus("speaking");

    const token = localStorage.getItem("token");
    const controller = new AbortController();
    speechAbortRef.current = controller;

    try {
      if (!token) throw new Error("Login session missing. Please log in again.");

      const response = await fetch(`${API_URL}/api/tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: cleanText }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "The consistent AI voice is temporarily unavailable.");
      }

      const audioBlob = await response.blob();
      if (controller.signal.aborted || !activeRef.current) return;
      if (!audioBlob.size || !audioBlob.type.includes("audio")) {
        throw new Error("The AI voice service returned an invalid audio file.");
      }

      const objectUrl = URL.createObjectURL(audioBlob);
      speechObjectUrlRef.current = objectUrl;
      const player = new Audio(objectUrl);
      player.preload = "auto";
      speechAudioRef.current = player;

      player.onended = () => {
        if (speechAudioRef.current !== player) return;
        speechAudioRef.current = null;
        if (speechObjectUrlRef.current === objectUrl) {
          URL.revokeObjectURL(objectUrl);
          speechObjectUrlRef.current = null;
        }
        scheduleListeningAfterSpeech();
      };

      player.onerror = () => {
        if (speechAudioRef.current !== player) return;
        player.onended = null;
        player.onerror = null;
        player.pause();
        speechAudioRef.current = null;
        if (speechObjectUrlRef.current === objectUrl) {
          URL.revokeObjectURL(objectUrl);
          speechObjectUrlRef.current = null;
        }
        setError("AI voice playback failed. Using this browser's backup voice for this question.");
        void speakWithBrowserFallback(cleanText);
      };

      await player.play();
    } catch (error) {
      if (error?.name === "AbortError" || controller.signal.aborted) return;
      if (!activeRef.current) return;

      console.error("Cloud AI voice failed:", error?.message || "Unknown TTS error");
      setError("The consistent AI voice is temporarily unavailable. Using this browser's backup voice for this question.");

      if (speechAudioRef.current) {
        speechAudioRef.current.onended = null;
        speechAudioRef.current.onerror = null;
        speechAudioRef.current.pause();
        speechAudioRef.current.removeAttribute("src");
        speechAudioRef.current.load();
        speechAudioRef.current = null;
      }
      if (speechObjectUrlRef.current) {
        URL.revokeObjectURL(speechObjectUrlRef.current);
        speechObjectUrlRef.current = null;
      }
      await speakWithBrowserFallback(cleanText);
    } finally {
      if (speechAbortRef.current === controller) {
        speechAbortRef.current = null;
      }
    }
  };

  const enableCamera = async () => {
    setError("");

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera access is not supported by this browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      streamRef.current = stream;
      setCameraOn(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setCameraOn(false);
      setError(
        "Camera access was blocked. Allow camera permission in your browser, or continue without the camera."
      );
    }
  };

  const toggleCamera = async () => {
    if (!cameraOn) {
      await enableCamera();
      return;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  };

  const toggleMute = () => {
    const nextMuted = !mutedRef.current;
    mutedRef.current = nextMuted;
    setMuted(nextMuted);

    if (nextMuted) {
      stopSpeech();
      if (status === "speaking") setStatus("ready-to-answer");
    }
  };

  const startListening = () => {
    setError("");
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError(
        "Speech recognition is not supported by this browser. Try the latest Google Chrome, or type your answer below."
      );
      setStatus("ready-to-answer");
      return;
    }

    stopSpeech();
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognitionRef.current = recognition;
    // transcriptRef stays authoritative; state may lag behind speech events.

    recognition.onstart = () => setStatus("listening");
    recognition.onresult = (event) => {
      let finalText = transcriptRef.current;
      let interim = "";

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const recognizedText = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += `${finalText ? " " : ""}${recognizedText}`;
        } else {
          interim += recognizedText;
        }
      }

      transcriptRef.current = finalText;
      setTranscript(
        `${finalText}${interim ? `${finalText ? " " : ""}${interim}` : ""}`.trim()
      );

      // Reset the silence timer for final and interim speech events so the
      // interviewer doesn't submit while the candidate is still talking.
      scheduleAutoSubmit(finalText);
    };

    recognition.onerror = (event) => {
      if (event.error === "no-speech" || event.error === "aborted") return;

      const microphoneMessages = {
        network: "Microphone issue: network. Check your internet connection and try again, or type your answer instead.",
        "not-allowed": "Microphone access was denied. Allow microphone permission in your browser, or type your answer instead.",
        "service-not-allowed": "Speech recognition is blocked by the browser. Check your microphone permissions, or type your answer instead.",
        "audio-capture": "No microphone was detected. Connect or enable a microphone, or type your answer instead.",
      };

      setError(
        microphoneMessages[event.error] ||
          `Microphone issue: ${event.error}. You can type your answer instead.`
      );
    };
    recognition.onend = () => {
      // Ignore an older recognizer ending after a newer listening session started.
      if (recognitionRef.current !== recognition) return;
      if (activeRef.current && !loadingRef.current) setStatus("ready-to-answer");
    };

    try {
      recognition.start();
    } catch {
      setError("Could not start microphone listening. Please try again, or type your answer instead.");
    }
  };

  const stopListening = () => {
    recognitionRef.current?.stop?.();
    setStatus("ready-to-answer");
  };

  const startInterview = async () => {
    setError("");
    setAnswers([]);
    answersRef.current = [];
    setTranscript("");
    transcriptRef.current = "";
    questionRef.current = STARTERS[typeRef.current];
    setQuestion(STARTERS[typeRef.current]);
    setFinished(null);
    setElapsedSeconds(0);
    const startTimestamp = Date.now();
    startedAtRef.current = startTimestamp;
    setStartedAt(startTimestamp);
    activeRef.current = true;
    loadingRef.current = false;
    submittingRef.current = false;
    clearAutoSubmitTimer();
    clearAutoListenTimer();

    // Request camera access in parallel; never make the first question wait for it.
    if (!cameraOn) void enableCamera();

    setStatus("speaking");
    void speak(`Let's begin. ${STARTERS[type]}`);
  };

  const getNextQuestion = async (currentAnswer, ending = false, history = answersRef.current) => {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("Login session missing. Please log in again.");

    const response = await fetch(`${API_URL}/api/interviews/next-question`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        type: typeRef.current,
        currentQuestion: questionRef.current,
        answer: currentAnswer,
        history,
        ending,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "The AI follow-up question could not be generated.");
    }

    return data.question;
  };

  const submitAnswer = async () => {
    if (submittingRef.current || loadingRef.current) return;

    const cleanAnswer = (transcriptRef.current || transcript).trim();

    if (!cleanAnswer) {
      setError("Please speak or type an answer before submitting.");
      return;
    }

    clearAutoSubmitTimer();
    clearAutoListenTimer();
    submittingRef.current = true;
    loadingRef.current = true;
    stopListening();
    setError("");
    setLoading(true);

    const currentQuestion = questionRef.current;
    const updatedAnswers = [...answersRef.current, { question: currentQuestion, answer: cleanAnswer }];
    answersRef.current = updatedAnswers;
    setAnswers(updatedAnswers);
    setTranscript("");
    transcriptRef.current = "";

    try {
      if (updatedAnswers.length >= MAX_QUESTIONS) {
        await finishInterview(updatedAnswers);
        return;
      }

      let nextQuestion = "";
      try {
        nextQuestion = await getNextQuestion(cleanAnswer, false, updatedAnswers.slice(0, -1));
      } catch (requestError) {
        nextQuestion =
          "Thanks for your answer. Can you give me a specific example or explain your reasoning in more detail?";
        setError(
          `${requestError.message} A temporary follow-up question will be used.`
        );
      }

      questionRef.current = nextQuestion;
      setQuestion(nextQuestion);
      speak(nextQuestion);
    } catch (submitError) {
      setError(submitError.message || "Could not continue the interview.");
    } finally {
      loadingRef.current = false;
      submittingRef.current = false;
      setLoading(false);
    }
  };

  const finishInterview = async (finalAnswers = answers) => {
    clearAutoSubmitTimer();
    clearAutoListenTimer();
    loadingRef.current = true;
    setLoading(true);
    setError("");

    const durationSeconds = Math.max(
      0,
      Math.floor((Date.now() - (startedAtRef.current || Date.now())) / 1000)
    );
    const token = localStorage.getItem("token");

    try {
      const response = await fetch(`${API_URL}/api/interviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type: typeRef.current, questions: finalAnswers, durationSeconds }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "The interview could not be saved.");

      activeRef.current = false;
      stopSpeech();
      recognitionRef.current?.stop?.();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setCameraOn(false);
      setStatus("finished");
      setRetryOpen({});
      setRetryDrafts({});
      setRetryResults({});
      setRetryLoading({});
      setRetryErrors({});
      setFinished({
        type: typeRef.current,
        questions: finalAnswers,
        questionCount: finalAnswers.length,
        durationSeconds,
        evaluation: data.session?.evaluation,
        evaluationStatus: data.session?.evaluationStatus,
      });
    } catch (saveError) {
      setError(`${saveError.message} Your answers are still available; try ending again.`);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  };

  const endInterview = async () => {
    clearAutoSubmitTimer();
    clearAutoListenTimer();
    stopListening();
    const currentAnswer = (transcriptRef.current || transcript).trim();
    const currentAnswers = answersRef.current;
    const finalAnswers = currentAnswer
      ? [...currentAnswers, { question: questionRef.current, answer: currentAnswer }]
      : currentAnswers;

    if (!finalAnswers.length) {
      setError("Please provide at least one answer before ending the interview.");
      return;
    }

    await finishInterview(finalAnswers);
  };

  const reset = () => {
    activeRef.current = false;
    clearAutoSubmitTimer();
    clearAutoListenTimer();
    loadingRef.current = false;
    submittingRef.current = false;
    autoConversationRef.current = true;
    mutedRef.current = false;
    answersRef.current = [];
    questionRef.current = STARTERS[typeRef.current];
    startedAtRef.current = null;
    setAutoConversation(true);
    stopSpeech();
    recognitionRef.current?.stop?.();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
    setFinished(null);
    setStatus("ready");
    setAnswers([]);
    setTranscript("");
    transcriptRef.current = "";
    setQuestion(STARTERS[typeRef.current]);
    setStartedAt(null);
    setElapsedSeconds(0);
    setError("");
    setLoading(false);
    setMuted(false);
  };

  const progressPercent = Math.min(100, (answers.length / MAX_QUESTIONS) * 100);
  const submitRetryAnswer = async (index, item) => {
    const retryAnswer = (retryDrafts[index] || "").trim();
    if (!retryAnswer) {
      setRetryErrors((current) => ({ ...current, [index]: "Write your improved answer first." }));
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setRetryErrors((current) => ({ ...current, [index]: "Login session missing. Please log in again." }));
      return;
    }

    setRetryLoading((current) => ({ ...current, [index]: true }));
    setRetryErrors((current) => ({ ...current, [index]: "" }));
    try {
      const response = await fetch(`${API_URL}/api/interviews/coach-answer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: finished?.type || typeRef.current,
          question: item.question,
          originalAnswer: item.answer,
          retryAnswer,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "The coach could not review this answer.");
      setRetryResults((current) => ({ ...current, [index]: data.result }));
    } catch (requestError) {
      setRetryErrors((current) => ({ ...current, [index]: requestError.message || "Could not review the retry." }));
    } finally {
      setRetryLoading((current) => ({ ...current, [index]: false }));
    }
  };

  const statusLabel = loading
    ? "AI is preparing the next question"
    : ({
      speaking: "AI is speaking",
      listening: autoConversation ? "Listening · pause to finish your answer" : "Listening to you",
      "ready-to-answer": "Ready for your answer",
      finished: "Interview completed",
      ready: "Ready to begin",
    }[status] || "Interview in progress");

  return (
    <DashboardLayout>
      <style>{`
        @keyframes voice-bar {
          0%, 100% { transform: scaleY(.28); opacity: .58; }
          50% { transform: scaleY(1.12); opacity: 1; }
        }
        @keyframes ai-avatar-float {
          0%, 100% { transform: translateY(0) rotate(-.6deg); }
          50% { transform: translateY(-7px) rotate(.6deg); }
        }
        @keyframes ai-avatar-speaking {
          0%, 100% { transform: translateY(0) scale(1); box-shadow: 0 10px 38px rgba(109, 40, 217, .22), 0 0 0 0 rgba(167, 139, 250, .2); }
          50% { transform: translateY(-5px) scale(1.035); box-shadow: 0 16px 48px rgba(109, 40, 217, .34), 0 0 0 10px rgba(167, 139, 250, .08); }
        }
        @keyframes ai-avatar-listening {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-3px) scale(1.018); }
        }
        @keyframes ai-avatar-aura {
          0%, 100% { opacity: .55; transform: scale(.88); }
          50% { opacity: .95; transform: scale(1.08); }
        }
        @keyframes ai-avatar-ring {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes ai-wave-ripple {
          0%, 100% { opacity: .42; transform: scale(.94); }
          50% { opacity: .9; transform: scale(1.04); }
        }
        .ai-avatar-stage {
          position: relative;
          isolation: isolate;
          display: grid;
          width: 148px;
          height: 148px;
          place-items: center;
          margin-inline: auto;
        }
        .ai-avatar-stage::before,
        .ai-avatar-stage::after {
          content: "";
          position: absolute;
          border-radius: 9999px;
          pointer-events: none;
        }
        .ai-avatar-stage::before {
          inset: 12%;
          z-index: -1;
          background: radial-gradient(circle, rgba(139, 92, 246, .42), rgba(59, 130, 246, .12) 56%, transparent 74%);
          filter: blur(13px);
          animation: ai-avatar-aura 3.6s ease-in-out infinite;
        }
        .ai-avatar-stage::after {
          inset: 3px;
          border: 1px dashed rgba(196, 181, 253, .34);
          border-left-color: rgba(96, 165, 250, .62);
          border-bottom-color: rgba(52, 211, 153, .28);
          animation: ai-avatar-ring 24s linear infinite;
        }
        .ai-avatar-frame {
          position: relative;
          z-index: 1;
          width: 112px;
          height: 112px;
          overflow: hidden;
          border: 4px solid rgba(196, 181, 253, .72);
          border-radius: 9999px;
          padding: 4px;
          background: #0f172a;
          box-shadow: 0 10px 38px rgba(109, 40, 217, .22);
          animation: ai-avatar-float 4.6s ease-in-out infinite;
          will-change: transform;
        }
        .ai-avatar-frame img { display: block; width: 100%; height: 100%; border-radius: 9999px; }
        .ai-avatar-stage--speaking .ai-avatar-frame {
          border-color: rgba(196, 181, 253, .98);
          animation: ai-avatar-speaking 1.25s ease-in-out infinite;
        }
        .ai-avatar-stage--speaking::before { background: radial-gradient(circle, rgba(139, 92, 246, .54), rgba(59, 130, 246, .18) 58%, transparent 76%); animation-duration: 1.35s; }
        .ai-avatar-stage--listening .ai-avatar-frame {
          border-color: rgba(110, 231, 183, .9);
          box-shadow: 0 10px 38px rgba(16, 185, 129, .2);
          animation: ai-avatar-listening 2.1s ease-in-out infinite;
        }
        .ai-avatar-stage--listening::before { background: radial-gradient(circle, rgba(16, 185, 129, .38), rgba(20, 184, 166, .12) 58%, transparent 76%); }
        .ai-voice-wave {
          display: flex;
          width: min(340px, 82vw);
          height: 58px;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding-inline: 8px;
          border-radius: 9999px;
          background: linear-gradient(90deg, transparent, rgba(139, 92, 246, .07), rgba(59, 130, 246, .07), transparent);
        }
        .ai-voice-wave__bar {
          display: block;
          width: 4px;
          flex: 0 0 4px;
          max-height: 42px;
          border-radius: 9999px;
          transform: scaleY(.28);
          transform-origin: center;
          opacity: .62;
          animation: voice-bar 1.9s ease-in-out infinite;
          animation-delay: var(--bar-delay, 0s);
          background: linear-gradient(180deg, #c4b5fd 0%, #8b5cf6 52%, #60a5fa 100%);
          box-shadow: 0 0 10px rgba(139, 92, 246, .22);
          will-change: transform, opacity;
        }
        .ai-voice-wave--speaking .ai-voice-wave__bar {
          animation-duration: .72s;
          opacity: .95;
          background: linear-gradient(180deg, #ddd6fe 0%, #a78bfa 52%, #7c3aed 100%);
          box-shadow: 0 0 12px rgba(167, 139, 250, .36);
        }
        .ai-voice-wave--listening .ai-voice-wave__bar {
          animation-duration: 1.08s;
          background: linear-gradient(180deg, #a7f3d0 0%, #34d399 55%, #0d9488 100%);
          box-shadow: 0 0 12px rgba(52, 211, 153, .28);
        }
        .ai-voice-wave--idle .ai-voice-wave__bar { animation-duration: 2.1s; opacity: .36; }
        @media (max-width: 520px) {
          .ai-avatar-stage { width: 132px; height: 132px; }
          .ai-avatar-frame { width: 100px; height: 100px; }
          .ai-voice-wave { gap: 3px; }
          .ai-voice-wave__bar { width: 3px; flex-basis: 3px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .voice-visualizer-bar,
          .ai-avatar-stage::before,
          .ai-avatar-stage::after,
          .ai-avatar-frame,
          .ai-voice-wave__bar { animation: none !important; }
          .ai-avatar-frame { transform: none !important; }
        }
      `}</style>
      <div className="mx-auto max-w-7xl space-y-6 text-white">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-violet-300">
              InterviewAI / Practice room
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              AI Mock Interview
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
              A realistic practice room to build confidence, explain your thinking, and improve with every answer.
            </p>
          </div>
          {status !== "ready" && !finished && (
            <div className="flex items-center gap-3 self-start rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-3 sm:self-auto">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </span>
              <span className="text-sm font-semibold text-emerald-300">Live session</span>
              <span className="border-l border-slate-700 pl-3 font-mono text-sm text-slate-300">
                {formatClock(elapsedSeconds)}
              </span>
            </div>
          )}
        </header>

        {error && (
          <div
            role="alert"
            className="relative z-20 flex items-start gap-3 rounded-2xl border border-rose-400/25 bg-rose-950/90 p-4 text-sm leading-6 text-rose-100 shadow-xl shadow-rose-950/20"
          >
            <FiAlertCircle className="mt-1 h-5 w-5 shrink-0 text-rose-300" aria-hidden="true" />
            <p className="min-w-0 flex-1">{error}</p>
            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss message"
              title="Dismiss message"
              className="rounded-lg p-1 text-rose-200 transition hover:bg-rose-400/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-rose-300/60"
            >
              <FiX className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {finished ? (
          <section className="overflow-hidden rounded-3xl border border-slate-700 bg-slate-900/90 shadow-2xl shadow-black/20">
            <div className="border-b border-slate-700 bg-gradient-to-r from-violet-950/70 to-slate-900 p-6 sm:p-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-3xl text-emerald-300">
                  ✓
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-emerald-300">Session saved successfully</p>
                  <h2 className="mt-1 text-2xl font-bold sm:text-3xl">Interview complete</h2>
                  <p className="mt-2 text-sm text-slate-400">
                    {finished.questionCount} answers · {formatDuration(finished.durationSeconds)}
                  </p>
                </div>
                {finished.evaluation && (
                  <div className="rounded-2xl border border-violet-400/20 bg-violet-400/10 px-6 py-4 text-center">
                    <p className="text-xs font-semibold uppercase tracking-wider text-violet-200">Overall score</p>
                    <p className="mt-1 text-4xl font-bold text-white">
                      {finished.evaluation.overallScore}<span className="text-lg text-slate-400">/100</span>
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6 p-6 sm:p-8">
              {finished.evaluation ? (
                <>
                  <div>
                    <h3 className="font-semibold text-white">Feedback summary</h3>
                    <p className="mt-2 max-w-4xl leading-7 text-slate-300">
                      {finished.evaluation.summary}
                    </p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-5">
                      <h3 className="font-semibold text-emerald-300">Strengths</h3>
                      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-300">
                        {(finished.evaluation.strengths || []).map((strength, index) => (
                          <li key={`${strength}-${index}`}>{strength}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5">
                      <h3 className="font-semibold text-amber-300">Areas to improve</h3>
                      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-300">
                        {(finished.evaluation.improvements || []).map((improvement, index) => (
                          <li key={`${improvement}-${index}`}>{improvement}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </>
              ) : (
                <p className="rounded-2xl border border-slate-700 bg-slate-950/70 p-5 leading-7 text-slate-300">
                  Your answers were saved. Evaluation status: {finished.evaluationStatus || "pending"}. Check that GEMINI_API_KEY is configured on the server for AI feedback.
                </p>
              )}

              <section className="space-y-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-300">Practice loop</p>
                  <h3 className="mt-1 text-xl font-bold text-white">Answer Improvement Coach</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-400">Review the feedback for each answer, try it again in your own words, and compare the coach's new assessment.</p>
                </div>

                <div className="space-y-4">
                  {(finished.questions || []).map((item, index) => {
                    const originalReview = finished.evaluation?.answers?.[index];
                    const retryReview = retryResults[index];
                    return (
                      <article key={`${index}-${item.question}`} className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4 sm:p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Question {index + 1}</p>
                            <h4 className="mt-1 font-semibold leading-6 text-white">{item.question}</h4>
                          </div>
                          {originalReview && (
                            <span className="shrink-0 rounded-xl border border-violet-400/20 bg-violet-400/10 px-3 py-2 text-sm font-bold text-violet-200">
                              First score {originalReview.score}/10
                            </span>
                          )}
                        </div>

                        <div className="mt-4 rounded-xl bg-slate-900 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Your first answer</p>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{item.answer}</p>
                        </div>

                        {originalReview && (
                          <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/5 p-4">
                              <p className="text-sm font-semibold text-emerald-300">What worked</p>
                              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-5 text-slate-300">
                                {(originalReview.strengths || []).map((value, i) => <li key={`${i}-${value}`}>{value}</li>)}
                              </ul>
                            </div>
                            <div className="rounded-xl border border-amber-400/15 bg-amber-400/5 p-4">
                              <p className="text-sm font-semibold text-amber-300">What to improve</p>
                              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-5 text-slate-300">
                                {(originalReview.improvements || []).map((value, i) => <li key={`${i}-${value}`}>{value}</li>)}
                              </ul>
                            </div>
                            <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 md:col-span-2">
                              <p className="text-sm font-semibold text-violet-200">Example of a stronger answer</p>
                              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{originalReview.improvedAnswer}</p>
                            </div>
                          </div>
                        )}

                        {retryReview && (
                          <div className="mt-4 rounded-xl border border-emerald-400/25 bg-emerald-400/5 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="font-semibold text-emerald-300">Retry review</p>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-lg bg-emerald-400/10 px-3 py-1.5 text-sm font-bold text-emerald-200">Retry score {retryReview.score}/10</span>
                                {originalReview && (() => {
                                  const difference = Math.round((retryReview.score - originalReview.score) * 10) / 10;
                                  return (
                                    <span className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${difference > 0 ? "bg-emerald-400/10 text-emerald-200" : difference < 0 ? "bg-amber-400/10 text-amber-200" : "bg-slate-800 text-slate-300"}`}>
                                      {difference > 0 ? "+" : ""}{difference.toFixed(1)} vs first attempt
                                    </span>
                                  );
                                })()}
                              </div>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-slate-300">{retryReview.comparison}</p>
                            <p className="mt-3 text-sm font-semibold text-white">Coach feedback</p>
                            <p className="mt-1 text-sm leading-6 text-slate-300">{retryReview.feedback}</p>
                            <div className="mt-3 grid gap-3 md:grid-cols-2">
                              <div>
                                <p className="text-sm font-semibold text-emerald-300">New strengths</p>
                                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-300">{retryReview.strengths.map((value, i) => <li key={`${i}-${value}`}>{value}</li>)}</ul>
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-amber-300">Next improvements</p>
                                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-300">{retryReview.improvements.map((value, i) => <li key={`${i}-${value}`}>{value}</li>)}</ul>
                              </div>
                            </div>
                            <div className="mt-3 rounded-lg bg-slate-950/70 p-3">
                              <p className="text-sm font-semibold text-violet-200">Suggested answer</p>
                              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-300">{retryReview.improvedAnswer}</p>
                            </div>
                          </div>
                        )}

                        <div className="mt-4">
                          {!retryOpen[index] ? (
                            <button
                              type="button"
                              onClick={() => setRetryOpen((current) => ({ ...current, [index]: true }))}
                              className="rounded-xl border border-violet-400/30 bg-violet-400/10 px-4 py-2.5 text-sm font-semibold text-violet-200 transition hover:bg-violet-400/15"
                            >
                              Practice this answer again <span aria-hidden="true">→</span>
                            </button>
                          ) : (
                            <div className="space-y-3">
                              <label htmlFor={`retry-answer-${index}`} className="block text-sm font-semibold text-slate-200">Your improved answer</label>
                              <textarea
                                id={`retry-answer-${index}`}
                                value={retryDrafts[index] || ""}
                                onChange={(event) => setRetryDrafts((current) => ({ ...current, [index]: event.target.value }))}
                                rows={4}
                                maxLength={10000}
                                placeholder="Try again in your own words. Include a clear point and a specific example where relevant."
                                className="w-full resize-y rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400"
                              />
                              {retryErrors[index] && <p className="text-sm text-rose-300" role="alert">{retryErrors[index]}</p>}
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  disabled={Boolean(retryLoading[index])}
                                  onClick={() => submitRetryAnswer(index, item)}
                                  className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {retryLoading[index] ? "Reviewing retry…" : "Analyze my retry"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRetryOpen((current) => ({ ...current, [index]: false }))}
                                  className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
                                >
                                  Close
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => navigate("/dashboard")}
                  className="rounded-xl bg-violet-600 px-5 py-3 font-semibold transition hover:bg-violet-500"
                >
                  View dashboard
                </button>
                <button
                  onClick={reset}
                  className="rounded-xl border border-slate-600 px-5 py-3 font-semibold transition hover:border-violet-400 hover:bg-slate-800"
                >
                  Start another interview
                </button>
              </div>
            </div>
          </section>
        ) : status === "ready" ? (
          <section className="grid grid-cols-1 gap-6">
            <div className="relative overflow-hidden rounded-[28px] border border-slate-700 bg-slate-900/95 p-6 shadow-2xl shadow-black/20 sm:p-8 lg:p-9">
              <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-violet-600/10 blur-3xl" />
              <div className="relative">
                <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-400/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-violet-200">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" /> AI-powered mock interview
                </div>
                <h2 className="mt-6 max-w-2xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                  Practice like it’s the <span className="bg-gradient-to-r from-violet-300 to-blue-300 bg-clip-text text-transparent">real thing.</span>
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
                  Practice with your AI interviewer using voice or typed answers, then get useful feedback at the end. In automatic conversation mode, the interviewer listens for a pause and moves to the next question for you.
                </p>

                <div className="mt-8">
                  <p className="mb-3 text-sm font-semibold text-slate-200">Choose your interview</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      { value: "HR", icon: "✦", title: "HR interview", detail: "Stories, strengths, goals" },
                      { value: "Technical", icon: "</>", title: "Technical", detail: "Concepts and problem-solving" },
                      { value: "Communication", icon: "◉", title: "Communication", detail: "Fluency and clear speaking" },
                    ].map((option) => {
                      const selected = type === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => setType(option.value)}
                          className={`group min-h-[132px] rounded-2xl border p-4 text-left transition duration-200 ${selected ? "border-violet-400 bg-violet-500/10 shadow-lg shadow-violet-950/20 ring-1 ring-violet-400/30" : "border-slate-700 bg-slate-950/60 hover:border-slate-500 hover:bg-slate-800/80"}`}
                        >
                          <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold ${selected ? "bg-gradient-to-br from-violet-500 to-indigo-500 text-white" : "bg-slate-800 text-slate-300 group-hover:text-white"}`}>
                            {option.icon}
                          </span>
                          <span className="mt-3 block text-sm font-semibold text-white">{option.title}</span>
                          <span className="mt-1 block text-xs leading-5 text-slate-400">{option.detail}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">↗</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-100">Automatic conversation</p>
                      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">AI starts listening after each question. After a complete spoken phrase, a 1.8-second pause sends it and continues the conversation.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={autoConversation}
                    onClick={toggleAutoConversation}
                    className={`inline-flex shrink-0 items-center gap-3 rounded-full border px-3 py-2 text-xs font-semibold transition ${autoConversation ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-slate-700 bg-slate-900 text-slate-400"}`}
                  >
                    <span className={`relative h-5 w-9 rounded-full transition ${autoConversation ? "bg-emerald-500" : "bg-slate-700"}`}>
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${autoConversation ? "left-[18px]" : "left-0.5"}`} />
                    </span>
                    {autoConversation ? "ON" : "OFF"}
                  </button>
                </div>

                <div className="mt-5 grid gap-3 text-xs text-slate-400 sm:grid-cols-3">
                  <div className="flex items-center gap-2 rounded-xl bg-slate-950/50 px-3 py-3"><span className="text-emerald-300">✓</span> Contextual questions</div>
                  <div className="flex items-center gap-2 rounded-xl bg-slate-950/50 px-3 py-3"><span className="text-emerald-300">✓</span> Voice or typed answers</div>
                  <div className="flex items-center gap-2 rounded-xl bg-slate-950/50 px-3 py-3"><span className="text-emerald-300">✓</span> Feedback after session</div>
                </div>

                <button
                  onClick={startInterview}
                  className="mt-7 flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 px-5 py-4 font-semibold shadow-xl shadow-violet-950/40 transition hover:-translate-y-0.5 hover:from-violet-500 hover:via-indigo-500 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:ring-offset-2 focus:ring-offset-slate-900"
                >
                  Start interview <span aria-hidden="true">→</span>
                </button>
                <p className="mt-3 text-center text-xs leading-5 text-slate-500">Use your microphone or type your answers. Your browser handles voice input and playback, and AI feedback is generated after your session.</p>
              </div>
            </div>

            <div className="relative flex min-h-[320px] items-center justify-center overflow-hidden rounded-[28px] border border-violet-400/25 bg-slate-950 p-6 shadow-2xl shadow-violet-950/20 sm:min-h-[360px] sm:p-8">
              <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-violet-600/15 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-blue-600/10 blur-3xl" />
              <div className="relative z-10 flex max-w-lg flex-col items-center text-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-200">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" /> AI interviewer · Ready
                </div>
                <div className="mt-8 h-32 w-32 overflow-hidden rounded-full border-4 border-violet-300/25 bg-slate-900 p-1 shadow-2xl shadow-violet-950/40 ring-4 ring-violet-400/10">
                  <AIIcon className="h-full w-full" />
                </div>
                <div className="mt-7 flex h-12 items-center justify-center gap-1.5" aria-hidden="true">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((bar) => (
                    <span key={bar} className="w-1.5 rounded-full bg-gradient-to-t from-violet-500 to-blue-300" style={{ height: `${10 + ((bar * 7) % 25)}px`, opacity: 0.65 + (bar % 3) * 0.1 }} />
                  ))}
                </div>
                <p className="mt-5 text-sm font-semibold text-violet-200">Meet your AI interviewer</p>
                <h3 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">Focus on your answers.</h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">Your interviewer will ask questions aloud. Speak naturally or type your answer, then review your personalized feedback after the session.</p>
                <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs font-medium">
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-slate-200">Browser voice</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-slate-200">Adaptive questions</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-slate-200">Answer coaching</span>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="grid items-start gap-5 2xl:grid-cols-[minmax(0,1.62fr)_minmax(360px,0.88fr)]">
            <div className="min-w-0 space-y-4">
              <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-700 bg-slate-900/90 p-4 sm:flex-row sm:items-center sm:px-5">
                <div className="flex items-center gap-3">
                  <span className="h-11 w-11 overflow-hidden rounded-full border border-violet-300/25 shadow-lg shadow-violet-950/30"><AIIcon className="h-full w-full" /></span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{type} interview</p>
                      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Live interview
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">Question {Math.min(answers.length + 1, MAX_QUESTIONS)} of {MAX_QUESTIONS} · {statusLabel}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <div className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-center">
                    <p className="font-mono text-sm font-semibold tabular-nums">{formatClock(elapsedSeconds)}</p>
                    <p className="mt-0.5 text-[10px] text-slate-500">Elapsed</p>
                  </div>
                  <button
                    onClick={endInterview}
                    disabled={loading}
                    className="rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    End interview
                  </button>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-3xl border border-violet-400/25 bg-slate-950 shadow-2xl shadow-violet-950/20">
                <div className="relative flex min-h-[380px] flex-col items-center justify-center overflow-hidden px-5 py-10 sm:min-h-[480px] sm:px-8 lg:min-h-[530px]">
                  <div className="pointer-events-none absolute -left-16 top-0 h-72 w-72 rounded-full bg-violet-600/15 blur-3xl" />
                  <div className="pointer-events-none absolute -bottom-12 right-0 h-72 w-72 rounded-full bg-blue-600/10 blur-3xl" />
                  <div className="relative z-10 flex max-w-2xl flex-col items-center text-center">
                    <div className={`ai-avatar-stage ${status === "speaking" ? "ai-avatar-stage--speaking" : status === "listening" ? "ai-avatar-stage--listening" : "ai-avatar-stage--idle"}`}>
                      <div className="ai-avatar-frame">
                        <AIIcon className="h-full w-full" />
                      </div>
                    </div>
                    <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/80 px-3 py-2 text-xs font-semibold text-slate-200">
                      <span className={`h-2 w-2 rounded-full ${status === "speaking" ? "animate-pulse bg-violet-300" : status === "listening" ? "animate-pulse bg-emerald-300" : "bg-slate-500"}`} />
                      {statusLabel}
                    </div>
                    <h2 className="mt-5 text-2xl font-bold text-white sm:text-3xl">Your AI interviewer</h2>
                    <p className="mt-3 max-w-xl text-base leading-7 text-slate-200">{question}</p>
                    <div
                      className={`ai-voice-wave ai-voice-wave--${status === "speaking" ? "speaking" : status === "listening" ? "listening" : "idle"} mt-7`}
                      role="img"
                      aria-label={status === "speaking" ? "AI voice waveform animation" : status === "listening" ? "Microphone listening animation" : "Voice activity indicator"}
                    >
                      {Array.from({ length: 21 }, (_, bar) => (
                        <span
                          key={bar}
                          className="ai-voice-wave__bar"
                          aria-hidden="true"
                          style={{
                            height: `${11 + (Math.sin((bar + 1) * 0.62) + 1) * 15}px`,
                            "--bar-delay": `${(bar % 9) * -0.11}s`,
                          }}
                        />
                      ))}
                    </div>
                    <p className="mt-4 text-xs text-slate-500">Speak naturally or type your answer. Your progress is saved when you finish the interview.</p>
                  </div>

                  <div className="absolute bottom-4 right-4 z-20 w-[104px] overflow-hidden rounded-2xl border border-white/15 bg-slate-900/90 shadow-xl sm:bottom-5 sm:right-5 sm:w-[150px]">
                    <div className="relative aspect-[4/5]">
                      <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className={`absolute inset-0 h-full w-full object-cover ${cameraOn ? "block" : "hidden"}`}
                      />
                      {!cameraOn && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-800 to-slate-950 p-2 text-center">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-600 bg-slate-800 text-slate-200"><FiVideoOff className="h-4 w-4" aria-hidden="true" /></span>
                          <span className="text-[10px] text-slate-300">Camera is off</span>
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-2 pb-2 pt-5">
                        <p className="text-[10px] font-semibold text-white">You · Candidate</p>
                        <p className="mt-0.5 text-[9px] text-slate-300">{cameraOn ? "Camera on" : "Camera off"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
                <div className="rounded-2xl border border-slate-700 bg-slate-900/90 p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Ready for your answer
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {status === "listening"
                          ? "I'm listening. Speak clearly and take your time."
                          : status === "speaking"
                            ? "The AI interviewer is asking a question."
                            : "Your microphone is ready when you are."}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${status === "listening"
                        ? "bg-emerald-400/10 text-emerald-300"
                        : status === "speaking"
                          ? "bg-violet-400/10 text-violet-200"
                          : "bg-slate-800 text-slate-300"
                        }`}
                    >
                      {status === "listening"
                        ? "Listening"
                        : status === "speaking"
                          ? "Speaking"
                          : "Ready"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-700 bg-slate-900/90 p-3 sm:flex sm:flex-wrap sm:items-center sm:justify-center">
                  <button
                    type="button"
                    onClick={toggleCamera}
                    aria-pressed={cameraOn}
                    title={cameraOn ? "Turn camera off" : "Turn camera on"}
                    className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 py-3 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-violet-400/60 sm:min-w-[112px] ${cameraOn ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-slate-700 bg-slate-950 text-slate-200 hover:border-violet-400"}`}
                  >
                    {cameraOn ? <FiCamera className="h-4 w-4" aria-hidden="true" /> : <FiVideoOff className="h-4 w-4" aria-hidden="true" />}
                    <span>{cameraOn ? "Camera on" : "Camera off"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={toggleMute}
                    aria-pressed={muted}
                    title={muted ? "Turn AI voice on" : "Mute AI voice"}
                    className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 py-3 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-violet-400/60 sm:min-w-[112px] ${muted ? "border-rose-400/30 bg-rose-500/10 text-rose-200" : "border-slate-700 bg-slate-950 text-slate-200 hover:border-violet-400"}`}
                  >
                    {muted ? <FiVolumeX className="h-4 w-4" aria-hidden="true" /> : <FiVolume2 className="h-4 w-4" aria-hidden="true" />}
                    <span>{muted ? "Unmute AI" : "Mute AI"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={status === "listening" ? stopListening : startListening}
                    disabled={loading}
                    aria-pressed={status === "listening"}
                    title={status === "listening" ? "Pause microphone listening" : "Start microphone listening"}
                    className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 py-3 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-violet-400/60 disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-[112px] ${status === "listening" ? "border-rose-400/30 bg-rose-500/10 text-rose-200" : "border-slate-700 bg-slate-950 text-slate-200 hover:border-violet-400"}`}
                  >
                    {status === "listening" ? <FiPause className="h-4 w-4" aria-hidden="true" /> : <FiMic className="h-4 w-4" aria-hidden="true" />}
                    <span>{status === "listening" ? "Pause" : "Listen"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => speak(question)}
                    disabled={muted || loading}
                    title="Repeat the current question"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-xs font-semibold text-slate-200 transition hover:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/60 disabled:cursor-not-allowed disabled:opacity-40 sm:min-w-[112px]"
                  >
                    <FiRefreshCw className="h-4 w-4" aria-hidden="true" />
                    <span>Repeat</span>
                  </button>
                </div>
              </div>
            </div>

            <aside className="min-w-0 space-y-4">
              <section className="rounded-2xl border border-slate-700 bg-slate-900/90 p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-violet-300/20"><AIIcon className="h-full w-full" /></span>
                    <div>
                      <h2 className="font-semibold">Current question</h2>
                      <p className="mt-0.5 text-xs text-slate-500">Question {Math.min(answers.length + 1, MAX_QUESTIONS)} of {MAX_QUESTIONS}</p>
                    </div>
                  </div>
                  <span className="rounded-lg bg-violet-500/15 px-2.5 py-1 text-[11px] font-semibold text-violet-200">{type}</span>
                </div>
                <p className="mt-4 leading-7 text-slate-100">{question}</p>
                <div className="mt-4 h-px bg-slate-800" />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-500">{muted ? "AI voice muted" : "Question audio available"}</span>
                  <button
                    disabled={muted || loading}
                    onClick={() => speak(question)}
                    className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-violet-400 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ↻ Repeat question
                  </button>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-700 bg-slate-900/90 p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-semibold">Live transcript</h2>
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-300">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Live
                  </span>
                </div>
                <div className="mt-4 max-h-[300px] space-y-4 overflow-y-auto pr-1">
                  {answers.slice(-3).map((item, index) => (
                    <div key={`${item.question}-${answers.length - index}`} className="space-y-2 border-b border-slate-800 pb-4 last:border-0">
                      <div className="flex gap-2">
                        <span className="h-7 w-7 shrink-0 overflow-hidden rounded-full border border-violet-300/20"><AIIcon className="h-full w-full" /></span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold text-violet-200">AI Interviewer</p>
                          <p className="mt-1 text-xs leading-5 text-slate-300">{item.question}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 pl-1">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs text-slate-200">You</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold text-slate-300">Your answer</p>
                          <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-400">{item.answer}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <span className="h-7 w-7 shrink-0 overflow-hidden rounded-full border border-violet-300/20"><AIIcon className="h-full w-full" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold text-violet-200">AI Interviewer</p>
                      <p className="mt-1 text-xs leading-5 text-slate-300">{question}</p>
                    </div>
                  </div>
                  {(transcript || status === "listening") && (
                    <div className="flex gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs text-slate-200">You</span>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 text-[11px] font-semibold text-slate-300">You {status === "listening" && <span className="text-emerald-300">· Listening…</span>}</p>
                        <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-300">{transcript || "Speak naturally. Your answer will appear here."}</p>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-700 bg-slate-900/90 p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="spoken-answer" className="font-semibold">Your answer</label>
                  <span className="text-[11px] text-slate-500">{transcript.length}/2000</span>
                </div>
                <textarea
                  id="spoken-answer"
                  rows={4}
                  maxLength={2000}
                  value={transcript}
                  onChange={(event) => {
                    setTranscript(event.target.value);
                    transcriptRef.current = event.target.value;
                  }}
                  placeholder={status === "listening" ? "Listening… your words will appear here." : "Type an answer here, or speak naturally."}
                  className="mt-3 w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/10"
                />
                <button
                  onClick={submitAnswer}
                  disabled={loading || !transcript.trim()}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-3 text-sm font-semibold transition hover:from-violet-500 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Preparing next question…" : autoConversation ? "Send answer now" : "Submit answer"} <span aria-hidden="true">→</span>
                </button>
                <p className="mt-2 text-[11px] leading-5 text-slate-500">
                  {autoConversation ? "When speaking, a complete answer is sent after a short pause. You can also send it manually." : "You control when to submit your answer."}
                </p>
              </section>

              <section className="rounded-2xl border border-slate-700 bg-slate-900/90 p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-semibold">Session progress</h2>
                  <span className="text-sm font-semibold text-violet-300">{answers.length}/{MAX_QUESTIONS}</span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-400 transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                    <p className="text-xs text-slate-500">Answered</p>
                    <p className="mt-1 text-2xl font-bold">{answers.length}</p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                    <p className="text-xs text-slate-500">Time elapsed</p>
                    <p className="mt-1 text-2xl font-bold tabular-nums">{formatClock(elapsedSeconds)}</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2 border-t border-slate-800 pt-4 text-xs text-slate-400">
                  <p>◆ Speak clearly at a natural pace.</p>
                  <p>◆ Use a real example when possible.</p>
                  <p>◆ Pause when you have finished; the interviewer will continue automatically.</p>
                </div>
              </section>
            </aside>
          </section>
        )}

      </div>
    </DashboardLayout>
  );
}
