import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import { API_URL } from "../config/api";

const SESSION_QUESTION_COUNT = 5;
const RECENT_SESSIONS_TO_AVOID = 3;

// A larger bank keeps practice sessions varied. Questions are shuffled per session,
// and questions from the user's latest sessions of the same type are deprioritized.
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
  const sessionActive = startedAt !== null && !finished;

  const startSession = async () => {
    setStarting(true);
    setError("");

    // Fetch the latest history so a user is less likely to see the same questions
    // in consecutive sessions. If history cannot be fetched, a random set still works.
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
            .forEach((session) => {
              (session.questions || []).forEach((item) => {
                if (typeof item.question === "string") recentlyAsked.add(item.question);
              });
            });
        }
      } catch {
        // The practice session should still be available if history is offline.
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
    if (!answer.trim()) {
      setError("Please write an answer before continuing.");
      return;
    }

    const updatedAnswers = [
      ...answers,
      { question: questions[currentIndex], answer: answer.trim() },
    ];
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
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type, questions: updatedAnswers, durationSeconds }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "Could not save your practice session.");
        return;
      }

      setFinished({
        type,
        questionCount: updatedAnswers.length,
        durationSeconds,
        evaluationStatus: data.session?.evaluationStatus || "not_configured",
        evaluation: data.session?.evaluation || null,
      });
      setStartedAt(null);
    } catch (requestError) {
      setError("Could not reach the server. Your answers are still on this page; please try again.");
    } finally {
      setLoading(false);
    }
  };

  const startAnother = () => {
    setStartedAt(null);
    setFinished(null);
    setAnswers([]);
    setAnswer("");
    setCurrentIndex(0);
    setError("");
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <section>
          <h1 className="text-3xl font-bold text-white">Practice Interview</h1>
          <p className="mt-2 text-slate-400">
            Answer each question in your own words. Completed sessions are saved to your account.
          </p>
        </section>

        {finished ? (
          <section className="space-y-4 rounded-2xl border border-violet-900/70 bg-zinc-900 p-6">
            <h2 className="text-2xl font-bold text-violet-300">Practice session saved!</h2>
            <p className="text-slate-300">
              You completed {finished.questionCount} {finished.type} questions in {formatDuration(finished.durationSeconds)}.
            </p>
            {finished.evaluation ? (
              <div className="space-y-5 rounded-xl border border-zinc-800 bg-zinc-950/80 p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-slate-400">AI overall score</p>
                    <p className="text-4xl font-bold text-violet-300">{finished.evaluation.overallScore}<span className="text-lg text-slate-400">/100</span></p>
                  </div>
                  <span className="w-fit rounded-full border border-violet-900 bg-violet-950/40 px-3 py-1 text-sm text-violet-200">Evaluation complete</span>
                </div>
                <p className="leading-7 text-slate-300">{finished.evaluation.summary}</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <h3 className="font-semibold text-violet-300">What went well</h3>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
                      {(finished.evaluation.strengths || []).map((item, index) => <li key={`strength-${index}`}>{item}</li>)}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold text-amber-300">Focus next time</h3>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
                      {(finished.evaluation.improvements || []).map((item, index) => <li key={`improvement-${index}`}>{item}</li>)}
                    </ul>
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-white">Answer-by-answer feedback</h3>
                  {(finished.evaluation.answers || []).map((item, index) => (
                    <article key={`evaluation-${index}`} className="rounded-xl border border-zinc-800 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="font-medium text-white">Question {index + 1}</h4>
                        <span className="shrink-0 rounded-lg bg-violet-500/10 px-3 py-1 font-semibold text-violet-300">{item.score}/10</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{item.feedback}</p>
                      {item.strengths?.length > 0 && <p className="mt-3 text-sm text-violet-300"><span className="font-semibold">Strength: </span>{item.strengths.join("; ")}</p>}
                      {item.improvements?.length > 0 && <p className="mt-2 text-sm text-amber-300"><span className="font-semibold">Improve: </span>{item.improvements.join("; ")}</p>}
                      <details className="mt-3">
                        <summary className="cursor-pointer text-sm font-semibold text-violet-300">See an improved sample answer</summary>
                        <p className="mt-2 whitespace-pre-wrap rounded-lg bg-zinc-950/80 p-3 text-sm leading-6 text-slate-300">{item.improvedAnswer}</p>
                      </details>
                    </article>
                  ))}
                </div>
                <p className="text-xs leading-5 text-slate-500">AI feedback is a practice aid, not a definitive measure of interview performance. Check technical facts and personalize sample answers before using them.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-900/70 bg-amber-950/20 p-4">
                <h3 className="font-semibold text-amber-300">Your answers are safely saved.</h3>
                <p className="mt-1 text-sm leading-6 text-slate-300">
                  {finished.evaluationStatus === "failed"
                    ? "AI evaluation could not run. Check the server terminal and API key, then try another session."
                    : "AI feedback is not enabled yet. Configure GEMINI_API_KEY in server/.env and restart the backend to get scores and suggestions."}
                </p>
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              <button onClick={() => navigate("/dashboard")} className="rounded-xl bg-violet-600 px-5 py-3 font-semibold shadow-lg shadow-violet-950/30 transition hover:bg-violet-500">
                View Dashboard
              </button>
              <button onClick={startAnother} className="rounded-xl border border-slate-600 px-5 py-3 font-semibold hover:bg-zinc-800">
                Practice Again
              </button>
            </div>
          </section>
        ) : !sessionActive ? (
          <section className="space-y-5 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-xl font-semibold">Start a practice session</h2>
            <label className="block space-y-2">
              <span className="text-sm text-slate-300">Interview type</span>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-violet-500"
              >
                <option value="HR">HR Interview</option>
                <option value="Technical">Technical Interview</option>
                <option value="Communication">Communication Practice</option>
              </select>
            </label>
            <p className="text-sm text-slate-400">
              This session contains {SESSION_QUESTION_COUNT} randomly selected questions from a larger question bank. Write an answer to each one; the session will be saved when you finish.
            </p>
            <button onClick={startSession} disabled={starting} className="rounded-xl bg-violet-600 px-5 py-3 font-semibold shadow-lg shadow-violet-950/40 transition hover:bg-violet-500 disabled:cursor-wait disabled:opacity-60">
              {starting ? "Preparing questions..." : "Start Interview"}
            </button>
          </section>
        ) : (
          <section className="space-y-5 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="flex items-center justify-between gap-3 text-sm text-slate-400">
              <span>{type} Interview</span>
              <span>Question {currentIndex + 1} of {questions.length}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-700">
              <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} />
            </div>
            <h2 className="text-xl font-semibold leading-relaxed">{questions[currentIndex]}</h2>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={7}
              maxLength={10000}
              placeholder="Write your answer here..."
              className="w-full resize-y rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-white placeholder:text-slate-500 outline-none focus:border-violet-500"
            />
            {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
            <div className="flex flex-wrap justify-between gap-3">
              <button
                onClick={() => {
                  if (currentIndex === 0) {
                    setStartedAt(null);
                    setAnswers([]);
                    setAnswer("");
                  } else {
                    setCurrentIndex((index) => index - 1);
                    setAnswers((items) => items.slice(0, -1));
                    setAnswer(answers[currentIndex - 1]?.answer || "");
                  }
                  setError("");
                }}
                disabled={loading}
                className="rounded-xl border border-slate-600 px-5 py-3 font-semibold hover:bg-zinc-800 disabled:opacity-50"
              >
                {currentIndex === 0 ? "Cancel" : "Previous"}
              </button>
              <button
                onClick={handleNext}
                disabled={loading}
                className="rounded-xl bg-violet-600 px-5 py-3 font-semibold hover:bg-violet-500 disabled:opacity-50"
              >
                {loading ? "Saving & evaluating..." : currentIndex === questions.length - 1 ? "Finish & Save" : "Next Question"}
              </button>
            </div>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Interview;
