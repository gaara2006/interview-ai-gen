import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";

const QUESTION_SETS = {
  HR: [
    "Tell me about yourself and your current goals.",
    "What is one strength that would help you in this role? Give an example.",
    "Describe a challenge you faced and how you handled it.",
    "How do you respond to feedback or criticism?",
    "Why should a company choose you for an entry-level software role?",
  ],
  Technical: [
    "Explain the four main principles of object-oriented programming.",
    "What is the difference between an array and a linked list?",
    "What is database normalization, and why is it useful?",
    "How is a process different from a thread?",
    "Explain one technical project you built and a challenge you solved.",
  ],
  Communication: [
    "Introduce yourself in a clear 60-second response.",
    "Explain a technical concept to someone without a technical background.",
    "How would you disagree respectfully with a teammate?",
    "Describe a project you worked on using a simple beginning, middle, and end.",
    "What would you say if you did not know the answer to an interview question?",
  ],
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

  const questions = useMemo(() => QUESTION_SETS[type], [type]);
  const sessionActive = startedAt !== null && !finished;

  const startSession = () => {
    setAnswers([]);
    setAnswer("");
    setCurrentIndex(0);
    setError("");
    setFinished(null);
    setStartedAt(Date.now());
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
      const response = await fetch("http://localhost:5000/api/interviews", {
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
          <section className="space-y-4 rounded-2xl border border-green-700 bg-slate-800 p-6">
            <h2 className="text-2xl font-bold text-green-400">Practice session saved!</h2>
            <p className="text-slate-300">
              You completed {finished.questionCount} {finished.type} questions in {formatDuration(finished.durationSeconds)}.
            </p>
            {finished.evaluation ? (
              <div className="space-y-5 rounded-xl border border-slate-700 bg-slate-900/70 p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-slate-400">AI overall score</p>
                    <p className="text-4xl font-bold text-blue-400">{finished.evaluation.overallScore}<span className="text-lg text-slate-400">/100</span></p>
                  </div>
                  <span className="w-fit rounded-full border border-green-700 bg-green-950/40 px-3 py-1 text-sm text-green-300">Evaluation complete</span>
                </div>
                <p className="leading-7 text-slate-300">{finished.evaluation.summary}</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <h3 className="font-semibold text-green-300">What went well</h3>
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
                    <article key={`evaluation-${index}`} className="rounded-xl border border-slate-700 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="font-medium text-white">Question {index + 1}</h4>
                        <span className="shrink-0 rounded-lg bg-blue-500/10 px-3 py-1 font-semibold text-blue-300">{item.score}/10</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{item.feedback}</p>
                      {item.strengths?.length > 0 && <p className="mt-3 text-sm text-green-300"><span className="font-semibold">Strength: </span>{item.strengths.join("; ")}</p>}
                      {item.improvements?.length > 0 && <p className="mt-2 text-sm text-amber-300"><span className="font-semibold">Improve: </span>{item.improvements.join("; ")}</p>}
                      <details className="mt-3">
                        <summary className="cursor-pointer text-sm font-semibold text-blue-300">See an improved sample answer</summary>
                        <p className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-950/70 p-3 text-sm leading-6 text-slate-300">{item.improvedAnswer}</p>
                      </details>
                    </article>
                  ))}
                </div>
                <p className="text-xs leading-5 text-slate-500">AI feedback is a practice aid, not a definitive measure of interview performance. Check technical facts and personalize sample answers before using them.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-700/70 bg-amber-950/20 p-4">
                <h3 className="font-semibold text-amber-300">Your answers are safely saved.</h3>
                <p className="mt-1 text-sm leading-6 text-slate-300">
                  {finished.evaluationStatus === "failed"
                    ? "AI evaluation could not run. Check the server terminal and API key, then try another session."
                    : "AI feedback is not enabled yet. Configure GEMINI_API_KEY in server/.env and restart the backend to get scores and suggestions."}
                </p>
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              <button onClick={() => navigate("/dashboard")} className="rounded-xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-700">
                View Dashboard
              </button>
              <button onClick={startAnother} className="rounded-xl border border-slate-600 px-5 py-3 font-semibold hover:bg-slate-700">
                Practice Again
              </button>
            </div>
          </section>
        ) : !sessionActive ? (
          <section className="space-y-5 rounded-2xl border border-slate-700 bg-slate-800 p-6">
            <h2 className="text-xl font-semibold">Start a practice session</h2>
            <label className="block space-y-2">
              <span className="text-sm text-slate-300">Interview type</span>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-xl border border-slate-600 bg-slate-900 px-4 py-3 text-white outline-none focus:border-blue-500"
              >
                <option value="HR">HR Interview</option>
                <option value="Technical">Technical Interview</option>
                <option value="Communication">Communication Practice</option>
              </select>
            </label>
            <p className="text-sm text-slate-400">
              This session contains {QUESTION_SETS[type].length} questions. Write an answer to each one; the session will be saved when you finish.
            </p>
            <button onClick={startSession} className="rounded-xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-700">
              Start Interview
            </button>
          </section>
        ) : (
          <section className="space-y-5 rounded-2xl border border-slate-700 bg-slate-800 p-6">
            <div className="flex items-center justify-between gap-3 text-sm text-slate-400">
              <span>{type} Interview</span>
              <span>Question {currentIndex + 1} of {questions.length}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-700">
              <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} />
            </div>
            <h2 className="text-xl font-semibold leading-relaxed">{questions[currentIndex]}</h2>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={7}
              maxLength={10000}
              placeholder="Write your answer here..."
              className="w-full resize-y rounded-xl border border-slate-600 bg-slate-900 p-4 text-white placeholder:text-slate-500 outline-none focus:border-blue-500"
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
                className="rounded-xl border border-slate-600 px-5 py-3 font-semibold hover:bg-slate-700 disabled:opacity-50"
              >
                {currentIndex === 0 ? "Cancel" : "Previous"}
              </button>
              <button
                onClick={handleNext}
                disabled={loading}
                className="rounded-xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-700 disabled:opacity-50"
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
