import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import StatCard from "../components/StatCard";
import ActivityCard from "../components/ActivityCard";
import { API_URL } from "../config/api";

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalSessions: 0,
    questionsPracticed: 0,
    practiceMinutes: 0,
  });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const loadDashboard = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Your login session is missing. Please log in again.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/interviews/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const data = await response.json();

        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            navigate("/", { replace: true });
            return;
          }
          throw new Error(data.message || "Unable to load dashboard.");
        }

        setStats(data.stats);
        setRecent(data.recent || []);
      } catch (requestError) {
        if (requestError.name !== "AbortError") {
          setError(requestError.message || "Unable to load dashboard data.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    loadDashboard();
    return () => controller.abort();
  }, [navigate]);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <section>
          <h1 className="text-3xl font-bold">Interview Dashboard</h1>
          <p className="mt-2 text-slate-400">Your real interview practice history and preparation activity.</p>
        </section>

        <section className="rounded-3xl border border-violet-400/20 bg-gradient-to-br from-violet-600/90 via-violet-700/80 to-zinc-900 p-6 text-white shadow-xl shadow-violet-950/20">
          <h2 className="text-2xl font-bold">Ready for today's practice?</h2>
          <p className="mt-2 text-violet-100">Complete a practice session and build a consistent interview habit.</p>
          <button
            onClick={() => navigate("/interview")}
            className="mt-5 rounded-xl bg-white px-5 py-2 font-semibold text-violet-700 transition hover:bg-zinc-100"
          >
            Start Interview
          </button>
        </section>

        {error && (
          <div className="rounded-xl border border-red-800 bg-red-950/40 p-4 text-sm text-red-300" role="alert">
            {error}
          </div>
        )}

        <section className="grid gap-5 md:grid-cols-3">
          <StatCard title="Completed Sessions" value={loading ? "—" : String(stats.totalSessions)} color="text-violet-400" />
          <StatCard title="Questions Answered" value={loading ? "—" : String(stats.questionsPracticed)} color="text-green-400" />
          <StatCard title="Practice Time" value={loading ? "—" : `${stats.practiceMinutes} min`} color="text-orange-400" />
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-5 text-xl font-semibold">Recent Practice</h2>
          {loading ? (
            <p className="text-slate-400">Loading your activity…</p>
          ) : recent.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-700 p-6 text-center">
              <p className="font-medium">No practice sessions yet</p>
              <p className="mt-1 text-sm text-slate-400">Complete your first question set and it will appear here.</p>
              <button onClick={() => navigate("/interview")} className="mt-4 rounded-xl bg-violet-600 px-4 py-2 font-semibold hover:bg-violet-700">
                Start your first session
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {recent.map((session) => (
                <ActivityCard
                  key={session.id}
                  title={`${session.type} Practice · ${session.questionCount} questions`}
                  status={new Date(session.completedAt).toLocaleDateString()}
                />
              ))}
            </div>
          )}
        </section>
        <p className="text-xs text-slate-500">These numbers reflect saved practice sessions. AI scores and detailed feedback appear after an evaluated interview session.</p>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
