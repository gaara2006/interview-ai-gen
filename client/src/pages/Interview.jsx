import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowRight,
  FaBrain,
  FaCheckCircle,
  FaChevronLeft,
  FaClock,
  FaHeadphones,
  FaLightbulb,
  FaMicrophone,
  FaRobot,
  FaVolumeMute,
  FaVolumeUp,
  FaUser,
} from "react-icons/fa";
import DashboardLayout from "../layouts/DashboardLayout";
import { API_URL } from "../config/api";

const SESSION_QUESTION_COUNT = 5;
const RECENT_SESSIONS_TO_AVOID = 3;

const QUESTION_SETS = {
  HR: [
    "Tell me about yourself and your current goals.",
    "What is one strength that would help you in this role? Give an example.",
    "Describe a challenge you faced and how you handled it.",
    "How do you respond to feedback or criticism?",
    "Why should a company choose you for an entry-level software role?",
    "What motivates you to learn something difficult?",
    "Tell me about a time you made a mistake. What did you learn?",
    "Describe a time you worked with someone whose approach differed from yours.",
    "What is one skill you are actively improving, and how are you improving it?",
    "How do you prioritize tasks when several deadlines are close?",
    "What kind of team environment helps you do your best work?",
    "Tell me about an achievement you are proud of and why it matters to you.",
    "How would you handle a task you have never done before?",
    "What do you know about the role you are applying for?",
    "Where would you like to grow professionally over the next two years?",
    "Tell me about a time you took initiative without being asked.",
    "How do you stay consistent when a task becomes repetitive or difficult?",
    "What would you do if you disagreed with your team lead's decision?",
    "Describe a situation where you had to learn under time pressure.",
    "What does being reliable at work mean to you?",
    "How would you react if your work was not selected for a project?",
    "Tell me about a time you helped a teammate succeed.",
    "What do you expect from your first software job?",
    "How do you balance speed and quality when completing work?",
    "What would you like an interviewer to remember about you?",
    "How do you handle multiple opinions when making a team decision?",
    "Tell me about a goal you set and the steps you took to reach it.",
    "What would you do during your first month in a new role to learn quickly?",
    "Describe a time you had to explain a delay or problem honestly.",
    "What does professional growth mean to you?",
  ],
  Technical: [
    "Explain the four main principles of object-oriented programming.",
    "What is the difference between an array and a linked list?",
    "What is database normalization, and why is it useful?",
    "How is a process different from a thread?",
    "Explain one technical project you built and a challenge you solved.",
    "What is the difference between a stack and a queue? Give a use case for each.",
    "What is time complexity? Explain O(1), O(n), and O(n²) with examples.",
    "What is the difference between a primary key and a foreign key?",
    "Explain the difference between GET and POST in HTTP.",
    "What happens when you enter a URL into a browser?",
    "What is the difference between == and === in JavaScript?",
    "Explain client-side rendering and server-side rendering at a high level.",
    "What is an API, and how does a frontend use one?",
    "What is the difference between authentication and authorization?",
    "Why do we use indexes in a database, and what is one trade-off?",
    "Explain inheritance and composition. When might composition be better?",
    "What is recursion, and what is a base case?",
    "How would you find a duplicate element in an array? Explain your approach.",
    "What is the difference between SQL and a NoSQL database?",
    "Explain the purpose of Git commits and branches.",
    "What is exception handling, and why is it important?",
    "What is the difference between synchronous and asynchronous code?",
    "How would you debug an API request that returns a 500 status code?",
    "What is responsive web design, and how would you test it?",
    "Explain the MVC pattern in simple terms.",
    "What is a memory leak, and how might an application develop one?",
    "What is the difference between DELETE, TRUNCATE, and DROP in SQL?",
    "How would you prevent a password from being stored as plain text?",
    "What tests would you write for a signup form?",
    "Describe a bug you encountered in a project and how you isolated its cause.",
  ],
  Communication: [
    "Introduce yourself in a clear 60-second response.",
    "Explain a technical concept to someone without a technical background.",
    "How would you disagree respectfully with a teammate?",
    "Describe a project you worked on using a simple beginning, middle, and end.",
    "What would you say if you did not know the answer to an interview question?",
    "Explain your current project in 90 seconds to a recruiter.",
    "How would you ask a teammate for help after trying to solve a problem yourself?",
    "Give a concise update when a task is taking longer than expected.",
    "How would you explain a complex problem using a simple example?",
    "What questions would you ask to clarify an unclear requirement?",
    "How would you respond if an interviewer interrupted your answer?",
    "Summarize a technical article you recently read in your own words.",
    "How would you give constructive feedback to a teammate?",
    "Explain why active listening matters during a team discussion.",
    "Describe how you would present a project demo to a non-technical audience.",
    "How would you respond when someone misunderstands what you said?",
    "Explain a project limitation honestly without sounding defensive.",
    "How would you contribute to a meeting if you were the quietest person in the room?",
    "Give an example of how you would turn a vague request into clear next steps.",
    "How would you explain a delay and your recovery plan to a project mentor?",
    "Describe how you would handle two teammates talking over each other.",
    "How can you make an answer structured without sounding memorized?",
    "How would you politely ask an interviewer to repeat a question?",
    "Describe how you would explain a technical trade-off to a product manager.",
    "What would you say when you need a little time to think before answering?",
    "How would you summarize a long discussion into three action items?",
    "Explain the STAR method and how you would use it in an interview.",
    "How would you respond if your first explanation did not make sense to the listener?",
    "Describe how you would welcome a new member to your project team.",
    "How would you close an interview professionally and confidently?",
  ],
};

const TYPE_META = {
  HR: {
    label: "HR Interview",
    subtitle: "Confidence, teamwork, and recruiter questions",
    icon: FaUser,
    tint: "border-violet-400/25 bg-violet-500/10 text-violet-200",
    detail: "Practice how you present yourself and your experience.",
  },
  Technical: {
    label: "Technical Interview",
    subtitle: "Core concepts and problem-solving",
    icon: FaBrain,
    tint: "border-sky-400/25 bg-sky-500/10 text-sky-200",
    detail: "Explain concepts clearly and show your reasoning.",
  },
  Communication: {
    label: "Communication Practice",
    subtitle: "Clarity, structure, and collaboration",
    icon: FaHeadphones,
    tint: "border-emerald-400/25 bg-emerald-500/10 text-emerald-200",
    detail: "Build clear, thoughtful answers that sound natural.",
  },
};

const shuffle = (items) => {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
};

const chooseSessionQuestions = (bank, recentlyAsked) => {
  const freshQuestions = shuffle(bank.filter((question) => !recentlyAsked.has(question)));
  const fallbackQuestions = shuffle(bank.filter((question) => recentlyAsked.has(question)));
  return [...freshQuestions, ...fallbackQuestions].slice(0, SESSION_QUESTION_COUNT);
};

const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins} min ${secs} sec` : `${secs} sec`;
};

const Interview = () => {
  const navigate = useNavigate();
  const [type, setType] = useState("HR");
  const [startedAt, setStartedAt] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [finished, setFinished] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [starting, setStarting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState("");
  const recognitionRef = useRef(null);
  const sessionActive = startedAt !== null && !finished;

  useEffect(() => () => {
    try {
      recognitionRef.current?.stop();
      window.speechSynthesis?.cancel();
    } catch {
      // Ignore browser voice cleanup errors on unmount.
    }
  }, []);

  const stopRecording = () => {
    try {
      recognitionRef.current?.stop();
    } catch {
      // The browser may already have stopped listening.
    }
    recognitionRef.current = null;
    setIsRecording(false);
  };

  const toggleQuestionAudio = () => {
    if (!window.speechSynthesis || typeof window.SpeechSynthesisUtterance === "undefined") {
      setVoiceMessage("Question read-aloud is not supported by this browser.");
      return;
    }
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const utterance = new window.SpeechSynthesisUtterance(questions[currentIndex] || "");
    utterance.lang = "en-IN";
    utterance.rate = 0.94;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setVoiceMessage("");
    window.speechSynthesis.speak(utterance);
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
      setVoiceMessage("Voice input stopped. You can edit the transcript before submitting.");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceMessage("Voice input is not supported in this browser. You can type your answer instead.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "en-IN";
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.onresult = (event) => {
        let transcript = "";
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          transcript += `${event.results[index][0].transcript} `;
        }
        const cleanTranscript = transcript.trim();
        if (cleanTranscript) setAnswer((previous) => [previous.trim(), cleanTranscript].filter(Boolean).join(" "));
      };
      recognition.onerror = (event) => {
        setIsRecording(false);
        setVoiceMessage(event.error === "not-allowed"
          ? "Microphone permission was denied. Allow microphone access in your browser to use voice input."
          : "Voice input stopped. You can continue typing your answer.");
      };
      recognition.onend = () => {
        setIsRecording(false);
        recognitionRef.current = null;
      };
      recognitionRef.current = recognition;
      recognition.start();
      setIsRecording(true);
      setVoiceMessage("Listening… speak clearly, then stop and review the transcript.");
      setError("");
    } catch {
      setVoiceMessage("Could not start the microphone. Check browser permissions or type your answer.");
      setIsRecording(false);
    }
  };

  const startSession = async () => {
    setStarting(true);
    setError("");
    setVoiceMessage("");

    const recentlyAsked = new Set();
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const response = await fetch(`${API_URL}/api/interviews/history`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          (data.sessions || [])
            .filter((session) => session.type === type)
            .slice(0, RECENT_SESSIONS_TO_AVOID)
            .forEach((session) => (session.questions || []).forEach((item) => {
              if (typeof item.question === "string") recentlyAsked.add(item.question);
            }));
        }
      } catch {
        // Practice remains available if history cannot be fetched.
      }
    }

    setQuestions(chooseSessionQuestions(QUESTION_SETS[type], recentlyAsked));
    setAnswers([]);
    setAnswer("");
    setCurrentIndex(0);
    setFinished(null);
    setStartedAt(Date.now());
    setStarting(false);
  };

  const handleNext = async () => {
    setError("");
    setVoiceMessage("");
    stopRecording();
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);

    if (!answer.trim()) {
      setError("Please write or record an answer before continuing.");
      return;
    }

    const updatedAnswers = [...answers, { question: questions[currentIndex], answer: answer.trim() }];
    if (currentIndex < questions.length - 1) {
      setAnswers(updatedAnswers);
      setCurrentIndex((index) => index + 1);
      setAnswer("");
      return;
    }

    const durationSeconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Your login session is missing. Please log in again.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/interviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type, questions: updatedAnswers, durationSeconds }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "Could not save your practice session.");
        return;
      }
      setAnswers(updatedAnswers);
      setFinished({
        type,
        questionCount: updatedAnswers.length,
        durationSeconds,
        evaluationStatus: data.session?.evaluationStatus || "not_configured",
        evaluation: data.session?.evaluation || null,
      });
      setStartedAt(null);
    } catch {
      setError("Could not reach the server. Your answers are still on this page; please try again.");
    } finally {
      setLoading(false);
    }
  };

  const startAnother = () => {
    stopRecording();
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    setStartedAt(null);
    setFinished(null);
    setAnswers([]);
    setAnswer("");
    setCurrentIndex(0);
    setError("");
    setVoiceMessage("");
  };

  const cancelSession = () => {
    stopRecording();
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    setStartedAt(null);
    setAnswers([]);
    setAnswer("");
    setCurrentIndex(0);
    setError("");
    setVoiceMessage("");
  };

  const goPrevious = () => {
    stopRecording();
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    setCurrentIndex((index) => index - 1);
    setAnswers((items) => items.slice(0, -1));
    setAnswer(answers[currentIndex - 1]?.answer || "");
    setError("");
    setVoiceMessage("");
  };

  const progress = questions.length ? ((currentIndex + 1) / questions.length) * 100 : 0;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-[1280px] space-y-6 pb-5">
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-violet-300">Practice studio</p>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">AI interview session<span className="text-violet-300">.</span></h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">Practice one answer at a time, use voice or text, and get AI feedback when you finish.</p>
          </div>
          {sessionActive && <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[0.07] px-3 py-2 text-xs font-medium text-emerald-300"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" /> Session in progress</div>}
        </section>

        {error && <div role="alert" className="rounded-xl border border-red-900/80 bg-red-950/30 p-4 text-sm text-red-300">{error}</div>}

        {finished ? (
          <section className="rounded-[28px] border border-violet-400/15 bg-[#11111b] p-5 sm:p-8">
            <div className="flex flex-col gap-4 border-b border-white/[0.07] pb-6 sm:flex-row sm:items-center sm:justify-between">
              <div><div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[0.07] px-3 py-1.5 text-xs font-medium text-emerald-300"><FaCheckCircle /> Session completed</div><h2 className="mt-4 text-2xl font-semibold text-white sm:text-3xl">Nice work. You showed up and practiced.</h2><p className="mt-2 text-sm text-zinc-400">{finished.type} practice · {finished.questionCount} questions · {formatDuration(finished.durationSeconds)}</p></div>
              {finished.evaluation && <div className="flex h-28 w-28 shrink-0 flex-col items-center justify-center rounded-full border-[5px] border-violet-400/80 bg-violet-500/[0.07] shadow-[0_0_35px_rgba(139,92,246,0.12)]"><span className="text-3xl font-bold text-white">{finished.evaluation.overallScore}</span><span className="text-xs text-zinc-400">out of 100</span></div>}
            </div>
            {finished.evaluation ? (
              <div className="mt-6 space-y-6">
                <div className="rounded-2xl border border-white/[0.07] bg-[#0b0b13] p-5"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">AI coach summary</p><p className="mt-3 leading-7 text-zinc-300">{finished.evaluation.summary}</p></div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-emerald-400/10 bg-emerald-400/[0.035] p-5"><h3 className="font-semibold text-emerald-300">What went well</h3><ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-zinc-300">{(finished.evaluation.strengths || []).map((item, index) => <li key={`strength-${index}`}>{item}</li>)}</ul></div>
                  <div className="rounded-2xl border border-amber-400/10 bg-amber-400/[0.035] p-5"><h3 className="font-semibold text-amber-300">Focus next time</h3><ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-zinc-300">{(finished.evaluation.improvements || []).map((item, index) => <li key={`improvement-${index}`}>{item}</li>)}</ul></div>
                </div>
                <div><div className="mb-4"><h3 className="text-xl font-semibold text-white">Answer-by-answer feedback</h3><p className="mt-1 text-sm text-zinc-500">Use this to shape your next practice session.</p></div><div className="space-y-3">{(finished.evaluation.answers || []).map((item, index) => <article key={`evaluation-${index}`} className="rounded-2xl border border-white/[0.07] bg-[#0b0b13] p-4 sm:p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Question {index + 1}</p><p className="mt-2 font-medium leading-6 text-white">{questions[index]}</p></div><span className="shrink-0 rounded-xl border border-violet-400/15 bg-violet-500/10 px-3 py-2 text-sm font-semibold text-violet-200">{item.score}/10</span></div><p className="mt-4 text-sm leading-6 text-zinc-300">{item.feedback}</p>{item.strengths?.length > 0 && <p className="mt-3 text-sm leading-6 text-emerald-300"><span className="font-semibold">Strength: </span>{item.strengths.join("; ")}</p>}{item.improvements?.length > 0 && <p className="mt-2 text-sm leading-6 text-amber-300"><span className="font-semibold">Improve: </span>{item.improvements.join("; ")}</p>}<details className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"><summary className="cursor-pointer text-sm font-semibold text-violet-300">See an improved sample answer</summary><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-300">{item.improvedAnswer}</p></details></article>)}</div></div>
                <p className="text-xs leading-5 text-zinc-500">AI feedback is a practice aid, not a definitive measure of interview performance. Personalize sample answers to reflect your real experience.</p>
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-amber-400/15 bg-amber-400/[0.04] p-5"><h3 className="font-semibold text-amber-200">Your answers are saved.</h3><p className="mt-2 text-sm leading-6 text-zinc-300">{finished.evaluationStatus === "failed" ? "AI evaluation could not run for this session. Check the server logs and Gemini API configuration before trying again." : "AI feedback is not enabled for this session. Configure GEMINI_API_KEY on the backend to enable scores and suggestions."}</p></div>
            )}
            <div className="mt-6 flex flex-wrap gap-3"><button onClick={() => navigate("/dashboard")} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-500 px-5 py-3 text-sm font-semibold text-white hover:brightness-110">View dashboard <FaArrowRight size={12} /></button><button onClick={startAnother} className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-white/[0.05]">Practice again</button></div>
          </section>
        ) : !sessionActive ? (
          <section className="space-y-6 rounded-[28px] border border-white/[0.08] p-5 sm:p-7" style={{ background: "radial-gradient(ellipse at top left, rgba(124,58,237,0.19), transparent 46%), linear-gradient(135deg, #171327, #11111b 60%, #191027)" }}>
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><div className="inline-flex items-center gap-2 text-sm font-semibold text-violet-200"><FaBrain /> Choose your session</div><h2 className="mt-2 text-2xl font-semibold text-white">What would you like to practice?</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">Each session has {SESSION_QUESTION_COUNT} questions selected from a larger question bank. Your answers are evaluated after you finish.</p></div><span className="inline-flex w-fit items-center gap-2 rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2 text-xs text-zinc-300"><FaClock className="text-violet-300" /> 5 questions per session</span></div>
            <div className="grid gap-4 md:grid-cols-3">
              {Object.entries(TYPE_META).map(([key, meta]) => {
                const Icon = meta.icon;
                const selected = type === key;
                return <button type="button" key={key} onClick={() => setType(key)} className={`group rounded-2xl border p-5 text-left transition duration-200 ${selected ? "border-violet-300/50 bg-violet-500/[0.12] shadow-[0_0_30px_rgba(139,92,246,0.09)]" : "border-white/[0.08] bg-black/15 hover:border-white/20 hover:bg-white/[0.035]"}`} aria-pressed={selected}>
                  <div className="flex items-start justify-between gap-3"><div className={`flex h-12 w-12 items-center justify-center rounded-xl border ${meta.tint}`}><Icon size={18} /></div><span className={`mt-1 h-4 w-4 rounded-full border ${selected ? "border-violet-300 bg-violet-400 shadow-[inset_0_0_0_3px_#171327]" : "border-zinc-600"}`} /></div>
                  <h3 className="mt-5 font-semibold text-white">{meta.label}</h3><p className="mt-2 text-sm text-violet-200/90">{meta.subtitle}</p><p className="mt-3 text-sm leading-6 text-zinc-500">{meta.detail}</p>
                </button>;
              })}
            </div>
            <div className="flex flex-col justify-between gap-4 rounded-2xl border border-white/[0.06] bg-black/15 p-4 sm:flex-row sm:items-center sm:p-5"><div className="flex items-start gap-3"><div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300"><FaLightbulb /></div><div><p className="text-sm font-semibold text-white">Tip for a stronger answer</p><p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-400">Explain the main point first, add a specific example, and finish with what you learned.</p></div></div><button type="button" onClick={startSession} disabled={starting} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60">{starting ? "Preparing questions…" : "Start interview"} <FaArrowRight size={12} /></button></div>
          </section>
        ) : (
          <section className="overflow-hidden rounded-[30px] border border-violet-300/15 p-4 shadow-2xl shadow-violet-950/10 sm:p-6 lg:p-7" style={{ background: "radial-gradient(ellipse at 12% 0%, rgba(139,92,246,0.26), transparent 42%), radial-gradient(ellipse at 100% 80%, rgba(59,130,246,0.11), transparent 38%), linear-gradient(135deg, #211638, #171426 48%, #221638)" }}>
            <div className="mb-5 flex flex-col justify-between gap-4 border-b border-white/[0.09] pb-5 sm:flex-row sm:items-center">
              <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-200/75">{type} practice</p><h2 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">AI Interview Session</h2></div>
              <div className="w-full sm:w-[260px]"><div className="mb-2 flex items-center justify-between gap-3 text-sm"><span className="font-medium text-zinc-200">Question {currentIndex + 1} of {questions.length}</span><span className="text-xs text-violet-200">{Math.round(progress)}% complete</span></div><div className="h-2 overflow-hidden rounded-full bg-black/25"><div className="h-full rounded-full bg-gradient-to-r from-blue-400 via-violet-400 to-fuchsia-400 transition-all duration-500" style={{ width: `${progress}%` }} /></div></div>
            </div>

            <div className="grid items-stretch gap-4 lg:grid-cols-2 lg:gap-5">
              <article className="flex min-w-0 flex-col rounded-[24px] border border-white/[0.11] bg-white/[0.065] p-5 backdrop-blur-md sm:p-6">
                <div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 text-white shadow-lg shadow-violet-950/30"><FaRobot size={22} /></div><div><h3 className="font-semibold text-white">AI Interviewer</h3><p className="mt-1 flex items-center gap-1.5 text-xs text-emerald-200"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Ready to ask your question</p></div></div><button type="button" onClick={toggleQuestionAudio} aria-label={isSpeaking ? "Stop reading question" : "Read question aloud"} title={isSpeaking ? "Stop reading question" : "Read question aloud"} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-zinc-200 transition hover:bg-white/[0.1]">{isSpeaking ? <FaVolumeUp /> : <FaVolumeMute />}</button></div>
                <div className="mt-6 flex flex-1 flex-col rounded-2xl border border-violet-200/15 bg-gradient-to-br from-[#5552a4]/80 via-[#51458e]/75 to-[#30395c]/80 p-5 sm:p-6"><div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-violet-100/75"><span className="h-1.5 w-1.5 rounded-full bg-violet-200" /> Your question</div><h3 className="text-xl font-semibold leading-8 text-white sm:text-[22px]">{questions[currentIndex]}</h3><div className="mt-auto pt-7"><button type="button" onClick={toggleQuestionAudio} className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-black/10 px-3 py-2 text-xs font-medium text-violet-50 transition hover:bg-black/20"><FaHeadphones /> {isSpeaking ? "Stop question audio" : "Listen to question"}</button></div></div>
                <div className="mt-4 flex items-start gap-3 rounded-xl border border-white/[0.06] bg-black/10 p-3.5"><div className="mt-0.5 text-amber-300"><FaLightbulb /></div><p className="text-xs leading-5 text-zinc-300">Take a moment to think. A structured answer with one concrete example is usually stronger than a long, unfocused response.</p></div>
              </article>

              <article className="flex min-w-0 flex-col rounded-[24px] border border-white/[0.11] bg-white/[0.065] p-5 backdrop-blur-md sm:p-6">
                <div className="flex items-center gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/[0.09] bg-[#24213b] text-violet-100"><FaUser size={19} /></div><div><h3 className="font-semibold text-white">Your response</h3><p className="mt-1 text-xs text-zinc-300">Type your answer or use voice input</p></div></div>
                <label htmlFor="interview-answer" className="sr-only">Your interview answer</label>
                <textarea id="interview-answer" value={answer} onChange={(event) => setAnswer(event.target.value)} rows={9} maxLength={10000} placeholder="Start with your main point, then add an example…" className="mt-5 min-h-[220px] w-full flex-1 resize-y rounded-2xl border border-white/[0.09] bg-[#171528]/85 p-4 text-sm leading-7 text-white outline-none transition placeholder:text-zinc-500 focus:border-violet-300/60 focus:ring-2 focus:ring-violet-400/10 sm:min-h-[260px] sm:p-5" />
                <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-zinc-400"><span>Your answer is saved when you finish the session.</span><span>{answer.length}/10000</span></div>
                {voiceMessage && <p role="status" className="mt-3 rounded-lg border border-white/[0.06] bg-black/10 px-3 py-2 text-xs leading-5 text-violet-100/90">{voiceMessage}</p>}
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <button type="button" onClick={toggleRecording} disabled={loading} className={`inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition disabled:opacity-50 ${isRecording ? "border-red-300/30 bg-red-500/15 text-red-100" : "border-white/[0.1] bg-white/[0.04] text-zinc-100 hover:bg-white/[0.08]"}`}><FaMicrophone /> {isRecording ? "Stop recording" : "Record answer"}</button>
                  <button type="button" onClick={handleNext} disabled={loading || isRecording} className="inline-flex min-h-12 flex-[1.25] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">{loading ? "Saving & evaluating…" : currentIndex === questions.length - 1 ? "Submit & get feedback" : "Submit answer"} <FaArrowRight size={12} /></button>
                </div>
                {isRecording && <p className="mt-2 text-center text-xs text-emerald-200">Listening for speech…</p>}
              </article>
            </div>

            <div className="mt-5 flex flex-col justify-between gap-3 border-t border-white/[0.08] pt-5 sm:flex-row sm:items-center"><button type="button" onClick={cancelSession} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.1] px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.05] disabled:opacity-50"><FaChevronLeft size={11} /> Cancel session</button><div className="flex flex-wrap justify-center gap-2 sm:justify-end">{currentIndex > 0 && <button type="button" onClick={goPrevious} disabled={loading || isRecording} className="rounded-xl border border-white/[0.1] px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/[0.05] disabled:opacity-50">Previous question</button>}<span className="inline-flex items-center gap-2 px-2 text-xs text-zinc-400"><FaCheckCircle className="text-violet-300" /> {answers.length} answer{answers.length === 1 ? "" : "s"} completed</span></div></div>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Interview;
