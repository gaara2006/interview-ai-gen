
import { useEffect, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";

const Progress = () => {
  const [progress, setProgress] = useState({
    totalSessions: 0,
    totalQuestions: 0,
    totalMinutes: 0,
    byType: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const loadProgress = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        setError("Please log in to view your progress.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          "http://localhost:5000/api/interviews/progress",
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
            data.message || "Unable to load progress."
          );
        }

        setProgress(data);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Unable to load progress.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadProgress();

    return () => controller.abort();
  }, []);

  const categories = ["HR", "Technical", "Communication"];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <section>
          <h1 className="text-3xl font-bold text-white">
            Progress Tracker
          </h1>
          <p className="mt-2 text-slate-400">
            Track your actual interview preparation activity.
          </p>
        </section>

        {error && (
          <div
            className="rounded-xl border border-red-800 bg-red-950/40 p-4 text-red-300"
            role="alert"
          >
            {error}
          </div>
        )}

        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-5">
            <p className="text-slate-400">Completed Sessions</p>
            <p className="mt-3 text-3xl font-bold text-blue-400">
              {loading ? "..." : progress.totalSessions}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-5">
            <p className="text-slate-400">Questions Practiced</p>
            <p className="mt-3 text-3xl font-bold text-green-400">
              {loading ? "..." : progress.totalQuestions}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-5">
            <p className="text-slate-400">Practice Time</p>
            <p className="mt-3 text-3xl font-bold text-orange-400">
              {loading
                ? "..."
                : `${Math.floor(progress.totalMinutes / 60)}h ${
                    progress.totalMinutes % 60
                  }m`}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-700 bg-slate-800 p-6">
          <h2 className="mb-5 text-xl font-semibold text-white">
            Category-wise Progress
          </h2>

          {loading ? (
            <p className="text-slate-400">Loading progress...</p>
          ) : (
            <div className="space-y-5">
              {categories.map((category) => {
                const item = progress.byType.find(
                  (entry) => entry.type === category
                );

                return (
                  <div key={category}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="font-medium text-white">
                        {category}
                      </span>
                      <span className="text-sm text-slate-400">
                        {item?.sessions || 0} sessions ·{" "}
                        {item?.questions || 0} questions
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-slate-700">
                      <div
                        className="h-full rounded-full bg-blue-500"
                        style={{
                          width: `${
                            progress.totalQuestions > 0
                              ? ((item?.questions || 0) /
                                  progress.totalQuestions) *
                                100
                              : 0
                          }%`,
                        }}
                      />
                    </div>

                    <p className="mt-1 text-xs text-slate-400">
                      Practice time: {item?.minutes || 0} minutes
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          <p className="mt-6 text-xs text-slate-500">
            Category bars show each category's share of your
            answered questions, not an accuracy score.
          </p>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default Progress;
