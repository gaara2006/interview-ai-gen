
import { useEffect, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import { API_URL } from "../config/api";

const InterviewHistory = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedSession, setExpandedSession] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadHistory = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        setError("Please log in to view your interview history.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${API_URL}/api/interviews/history`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Unable to load interview history."
          );
        }

        setSessions(data.sessions || []);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Something went wrong.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadHistory();

    return () => controller.abort();
  }, []);

  const formatDate = (date) => {
    if (!date) return "Date unavailable";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "Date unavailable";
    }

    return parsedDate.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (seconds = 0) => {
    const safeSeconds = Math.max(0, Number(seconds) || 0);
    const minutes = Math.floor(safeSeconds / 60);
    const remainingSeconds = safeSeconds % 60;

    return minutes > 0
      ? `${minutes} min ${remainingSeconds} sec`
      : `${remainingSeconds} sec`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <section>
          <h1 className="text-3xl font-bold text-white">
            Interview History
          </h1>
          <p className="mt-2 text-slate-400">
            Review your completed practice sessions and answers.
          </p>
        </section>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-800 bg-red-950/40 p-4 text-red-300"
          >
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6 text-slate-300">
            Loading your interview history...
          </div>
        ) : !error && sessions.length === 0 ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-8 text-center">
            <h2 className="text-xl font-semibold text-white">
              No interviews yet
            </h2>
            <p className="mt-2 text-slate-400">
              Complete a practice session to see it here.
            </p>
          </div>
        ) : (
          <section className="space-y-4">
            {sessions.map((session) => {
              const isExpanded = expandedSession === session._id;
              const questions = session.questions || [];

              return (
                <article
                  key={session._id}
                  className="rounded-2xl border border-slate-700 bg-slate-800 p-5"
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                      <span className="inline-block rounded-full bg-blue-500/10 px-3 py-1 text-sm font-medium text-blue-300">
                        {session.type || "Interview"}
                      </span>

                      <p className="mt-3 text-sm text-slate-400">
                        {formatDate(
                          session.completedAt || session.createdAt
                        )}
                      </p>

                      <p className="mt-1 text-sm text-slate-300">
                        {questions.length} questions · {formatDuration(session.durationSeconds)}
                      </p>
                      {session.evaluation ? (
                        <p className="mt-2 text-sm font-semibold text-blue-300">
                          AI score: {session.evaluation.overallScore}/100
                        </p>
                      ) : (
                        <p className="mt-2 text-xs text-slate-500">
                          {session.evaluationStatus === "failed" ? "AI evaluation failed for this session" : "No AI score saved for this session"}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedSession(
                          isExpanded ? null : session._id
                        )
                      }
                      className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
                      aria-expanded={isExpanded}
                    >
                      {isExpanded ? "Hide Answers" : "View Answers"}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="mt-5 space-y-4 border-t border-slate-700 pt-5">
                      {questions.length === 0 ? (
                        <p className="text-sm text-slate-400">
                          No questions were saved for this session.
                        </p>
                      ) : (
                        questions.map((item, index) => (
                          <div
                            key={`${session._id}-${index}`}
                            className="rounded-xl border border-slate-700 bg-slate-900/60 p-4"
                          >
                            <p className="font-medium text-white">
                              Q{index + 1}. {item.question}
                            </p>

                            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                              {item.answer?.trim() ? item.answer : "No answer was provided."}
                            </p>
                            {session.evaluation?.answers?.[index] && (
                              <div className="mt-4 space-y-2 rounded-lg border border-slate-700 bg-slate-950/60 p-3">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-sm font-semibold text-blue-300">AI feedback</p>
                                  <span className="rounded-md bg-blue-500/10 px-2 py-1 text-sm font-semibold text-blue-300">
                                    {session.evaluation.answers[index].score}/10
                                  </span>
                                </div>
                                <p className="text-sm leading-6 text-slate-300">{session.evaluation.answers[index].feedback}</p>
                                {session.evaluation.answers[index].improvements?.length > 0 && (
                                  <p className="text-sm text-amber-300"><span className="font-semibold">Improve: </span>{session.evaluation.answers[index].improvements.join("; ")}</p>
                                )}
                                <details className="pt-1">
                                  <summary className="cursor-pointer text-sm font-medium text-blue-300">View improved sample</summary>
                                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{session.evaluation.answers[index].improvedAnswer}</p>
                                </details>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        )}
      </div>
    </DashboardLayout>
  );
};

export default InterviewHistory;
