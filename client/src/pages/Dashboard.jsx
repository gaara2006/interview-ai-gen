import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowRight,
  FaBolt,
  FaBrain,
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaFileAlt,
  FaLightbulb,
  FaMicrophone,
  FaRegChartBar,
  FaRegCommentDots,
  FaRegCompass,
  FaTrophy,
} from "react-icons/fa";
import DashboardLayout from "../layouts/DashboardLayout";
import { API_URL } from "../config/api";

const TYPE_META = {
  HR: { color: "#9b6bff", text: "text-violet-300", label: "HR interview" },
  Technical: { color: "#50d6a0", text: "text-emerald-300", label: "Technical" },
  Communication: { color: "#ffa640", text: "text-amber-300", label: "Communication" },
};

const toDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value) => {
  const date = toDate(value);
  return date
    ? date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
    : "Date unavailable";
};

const formatDuration = (seconds = 0) => {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  const mins = Math.floor(safeSeconds / 60);
  return mins ? `${mins} min` : `${safeSeconds} sec`;
};

const StatCard = ({ icon: Icon, label, value, helper, tone, loading }) => (
  <article className="group min-w-0 rounded-2xl border border-white/[0.07] bg-[#11111b] p-5 transition duration-200 hover:-translate-y-0.5 hover:border-violet-400/30 hover:bg-[#141421]">
    <div className="flex items-start justify-between gap-3">
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}><Icon size={17} /></div>
      <span className="rounded-full border border-white/[0.06] px-2.5 py-1 text-[11px] font-medium text-zinc-500">All time</span>
    </div>
    <p className="mt-5 text-sm text-zinc-400">{label}</p>
    <p className="mt-1 text-3xl font-semibold tracking-tight text-white">{loading ? "—" : value}</p>
    <p className="mt-2 text-xs text-zinc-500">{helper}</p>
  </article>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalSessions: 0, questionsPracticed: 0, practiceMinutes: 0 });
  const [recent, setRecent] = useState([]);
  const [sessions, setSessions] = useState([]);
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

      const headers = { Authorization: `Bearer ${token}` };
      try {
        const [dashboardResponse, historyResponse] = await Promise.all([
          fetch(`${API_URL}/api/interviews/dashboard`, { headers, signal: controller.signal }),
          fetch(`${API_URL}/api/interviews/history`, { headers, signal: controller.signal }),
        ]);

        const dashboardData = await dashboardResponse.json();
        if (!dashboardResponse.ok) {
          if (dashboardResponse.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            navigate("/", { replace: true });
            return;
          }
          throw new Error(dashboardData.message || "Unable to load dashboard.");
        }

        setStats(dashboardData.stats || { totalSessions: 0, questionsPracticed: 0, practiceMinutes: 0 });
        setRecent(dashboardData.recent || []);

        if (historyResponse.ok) {
          const historyData = await historyResponse.json();
          setSessions(Array.isArray(historyData.sessions) ? historyData.sessions : dashboardData.recent || []);
        } else {
          setSessions(dashboardData.recent || []);
        }
      } catch (requestError) {
        if (requestError.name !== "AbortError") setError(requestError.message || "Unable to load dashboard data.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    loadDashboard();
    return () => controller.abort();
  }, [navigate]);

  const averageScore = useMemo(() => {
    const scores = sessions
      .map((session) => Number(session.evaluation?.overallScore))
      .filter((score) => Number.isFinite(score) && score >= 0 && score <= 100);
    return scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null;
  }, [sessions]);

  const typeStats = useMemo(() => {
    const counts = { HR: 0, Technical: 0, Communication: 0 };
    sessions.forEach((session) => {
      if (Object.prototype.hasOwnProperty.call(counts, session.type)) counts[session.type] += 1;
    });
    return counts;
  }, [sessions]);

  const typeTotal = Object.values(typeStats).reduce((sum, value) => sum + value, 0);
  const donutBackground = useMemo(() => {
    if (!typeTotal) return "conic-gradient(#27272a 0deg 360deg)";
    const types = ["HR", "Technical", "Communication"];
    let cursor = 0;
    const stops = types.map((type) => {
      const next = cursor + (typeStats[type] / typeTotal) * 360;
      const stop = `${TYPE_META[type].color} ${cursor}deg ${next}deg`;
      cursor = next;
      return stop;
    });
    return `conic-gradient(${stops.join(", ")})`;
  }, [typeStats, typeTotal]);

  const weekActivity = useMemo(() => {
    const now = new Date();
    const days = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(now);
      day.setHours(0, 0, 0, 0);
      day.setDate(now.getDate() - (6 - index));
      return {
        key: `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`,
        date: day,
        label: day.toLocaleDateString("en-IN", { weekday: "short" }),
        count: 0,
      };
    });

    sessions.forEach((session) => {
      const date = toDate(session.completedAt || session.createdAt);
      if (!date) return;
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      const match = days.find((day) => day.key === key);
      if (match) match.count += 1;
    });
    return days;
  }, [sessions]);

  const chartPoints = useMemo(() => {
    const highest = Math.max(1, ...weekActivity.map((day) => day.count));
    return weekActivity.map((day, index) => ({
      ...day,
      x: 24 + index * 45,
      y: 103 - (day.count / highest) * 70,
    }));
  }, [weekActivity]);

  const chartLine = chartPoints.map((point) => `${point.x},${point.y}`).join(" ");
  const chartArea = chartPoints.length
    ? `M ${chartPoints[0].x} 118 L ${chartPoints.map((point) => `${point.x} ${point.y}`).join(" L ")} L ${chartPoints[chartPoints.length - 1].x} 118 Z`
    : "";
  const latestEvaluated = sessions.find((session) => session.evaluation?.improvements?.length || session.evaluation?.summary);
  const latestFocus = latestEvaluated?.evaluation?.improvements?.[0];

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-5">
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-violet-300">Your workspace</p>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Interview overview<span className="text-violet-300">.</span></h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400 sm:text-base">A clearer view of your practice, progress, and next step toward interview readiness.</p>
          </div>
          <button onClick={() => navigate("/interview")} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/35 transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2 focus:ring-offset-[#09090f]">
            <FaMicrophone /> Start an interview <FaArrowRight size={12} />
          </button>
        </section>

        {error && <div className="rounded-xl border border-red-900/80 bg-red-950/30 p-4 text-sm text-red-300" role="alert">{error}</div>}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={FaRegChartBar} label="Completed sessions" value={stats.totalSessions ?? 0} helper="Every saved practice session" tone="bg-violet-500/15 text-violet-300" loading={loading} />
          <StatCard icon={FaRegCommentDots} label="Questions answered" value={stats.questionsPracticed ?? 0} helper="Questions you have practiced" tone="bg-emerald-500/15 text-emerald-300" loading={loading} />
          <StatCard icon={FaClock} label="Practice time" value={`${stats.practiceMinutes ?? 0} min`} helper="Total time in interview sessions" tone="bg-amber-500/15 text-amber-300" loading={loading} />
          <StatCard icon={FaTrophy} label="Average AI score" value={averageScore === null ? "—" : `${averageScore}%`} helper={averageScore === null ? "Complete an evaluated session" : "Across evaluated sessions"} tone="bg-sky-500/15 text-sky-300" loading={loading} />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
          <article className="min-w-0 rounded-2xl border border-white/[0.07] bg-[#11111b] p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Practice activity</h2>
                <p className="mt-1 text-sm text-zinc-500">Saved sessions over the last 7 days</p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 py-2 text-xs text-zinc-400"><FaCalendarAlt className="text-violet-300" /> Last 7 days</span>
            </div>
            <div className="mt-5 rounded-xl border border-white/[0.04] bg-[#0b0b13] px-2 pt-3 sm:px-4">
              <div className="flex gap-3">
                <div className="flex flex-col justify-between pb-7 pt-1 text-[10px] text-zinc-600"><span>{Math.max(1, ...weekActivity.map((day) => day.count))}</span><span>1</span><span>0</span></div>
                <div className="min-w-0 flex-1">
                  <svg viewBox="0 0 320 128" role="img" aria-label="Interview sessions completed on each of the last seven days" className="h-48 w-full overflow-visible sm:h-52">
                    {[32, 61, 90, 118].map((y) => <line key={y} x1="18" y1={y} x2="300" y2={y} stroke="#292938" strokeDasharray="4 5" strokeWidth="1" />)}
                    <defs><linearGradient id="practice-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#9b6bff" stopOpacity="0.34" /><stop offset="100%" stopColor="#9b6bff" stopOpacity="0" /></linearGradient></defs>
                    <path d={chartArea} fill="url(#practice-area)" />
                    <polyline points={chartLine} fill="none" stroke="#a78bfa" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    {chartPoints.map((point) => <circle key={point.key} cx={point.x} cy={point.y} r="3.5" fill="#c4b5fd" stroke="#11111b" strokeWidth="2" />)}
                  </svg>
                  <div className="-mt-1 flex justify-between pb-3 text-[10px] text-zinc-500 sm:text-xs">{chartPoints.map((point) => <span key={point.key}>{point.label}</span>)}</div>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-4 text-sm">
              <span className="inline-flex items-center gap-2 text-zinc-400"><span className="h-2 w-2 rounded-full bg-violet-400" /> Sessions completed</span>
              <span className="font-semibold text-white">{loading ? "—" : weekActivity.reduce((sum, day) => sum + day.count, 0)} <span className="font-normal text-zinc-500">this week</span></span>
            </div>
          </article>

          <article className="rounded-2xl border border-white/[0.07] bg-[#11111b] p-5 sm:p-6">
            <div>
              <h2 className="text-lg font-semibold text-white">Practice by category</h2>
              <p className="mt-1 text-sm text-zinc-500">Where you have spent your practice time</p>
            </div>
            <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row xl:flex-col 2xl:flex-row">
              <div className="relative h-44 w-44 shrink-0 rounded-full p-[15px]" style={{ background: donutBackground }}>
                <div className="flex h-full w-full flex-col items-center justify-center rounded-full border border-white/[0.05] bg-[#11111b]">
                  <span className="text-3xl font-semibold text-white">{typeTotal}</span>
                  <span className="mt-1 text-xs text-zinc-500">sessions</span>
                </div>
              </div>
              <div className="w-full space-y-4">
                {Object.keys(TYPE_META).map((type) => {
                  const count = typeStats[type];
                  const percent = typeTotal ? Math.round((count / typeTotal) * 100) : 0;
                  return <div key={type}>
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <span className="flex items-center gap-2 text-zinc-300"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: TYPE_META[type].color }} />{TYPE_META[type].label}</span>
                      <span className="text-zinc-400">{count} <span className="text-zinc-600">({percent}%)</span></span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800"><div className="h-full rounded-full transition-all" style={{ width: `${percent}%`, backgroundColor: TYPE_META[type].color }} /></div>
                  </div>;
                })}
                {!typeTotal && <p className="text-xs leading-5 text-zinc-500">Your category breakdown will appear here after your first saved session.</p>}
              </div>
            </div>
          </article>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
          <article className="rounded-2xl border border-white/[0.07] bg-[#11111b] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div><h2 className="text-lg font-semibold text-white">Recent practice</h2><p className="mt-1 text-sm text-zinc-500">Your latest completed sessions</p></div>
              <button onClick={() => navigate("/history")} className="inline-flex items-center gap-2 text-sm font-medium text-violet-300 transition hover:text-violet-200">View history <FaArrowRight size={11} /></button>
            </div>
            <div className="mt-5 space-y-3">
              {loading ? <div className="rounded-xl bg-white/[0.025] p-5 text-sm text-zinc-500">Loading your practice activity…</div> : recent.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-700/80 p-6 text-center"><div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300"><FaMicrophone /></div><p className="mt-3 font-medium text-white">Your first session starts here</p><p className="mt-1 text-sm text-zinc-500">Complete a practice interview and your activity will show up here.</p><button onClick={() => navigate("/interview")} className="mt-4 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500">Start practicing</button></div>
              ) : recent.slice(0, 4).map((session) => {
                const fullSession = sessions.find((item) => String(item._id || item.id) === String(session._id || session.id));
                const score = fullSession?.evaluation?.overallScore;
                const typeMeta = TYPE_META[session.type] || TYPE_META.HR;
                return <div key={session.id || session._id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.055] bg-[#0c0c14] p-4 transition hover:border-violet-400/20">
                  <div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${typeMeta.color}20`, color: typeMeta.color }}><FaFileAlt /></div><div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{typeMeta.label}</p><p className="mt-1 text-xs text-zinc-500">{session.questionCount || session.questions?.length || 0} questions · {formatDate(session.completedAt)}</p></div></div>
                  <div className="flex items-center gap-3"><span className="hidden text-xs text-zinc-500 sm:inline">{formatDuration(session.durationSeconds)}</span>{score !== undefined ? <span className="rounded-lg border border-emerald-400/15 bg-emerald-400/[0.08] px-2.5 py-1.5 text-xs font-semibold text-emerald-300">{score}% AI score</span> : <span className="rounded-lg border border-zinc-700/70 px-2.5 py-1.5 text-xs text-zinc-500">Saved</span>}</div>
                </div>;
              })}
            </div>
          </article>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1">
            <article className="relative overflow-hidden rounded-2xl border border-violet-400/15 bg-gradient-to-br from-[#21123b] via-[#171327] to-[#11111b] p-5 sm:p-6">
              <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-violet-500/10 blur-2xl" />
              <div className="relative flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-400/15 text-violet-200"><FaBrain size={19} /></div><div><h2 className="font-semibold text-white">AI coach insight</h2><p className="mt-1 text-sm text-zinc-400">A useful next step based on your saved sessions.</p></div></div>
              <p className="relative mt-4 text-sm leading-6 text-zinc-300">{latestFocus || (averageScore !== null ? `Your current average score is ${averageScore}%. Review the answer-by-answer feedback to choose one thing to improve in your next session.` : "After an evaluated interview, your latest improvement point will be highlighted here. For now, focus on giving clear answers with specific examples.")}</p>
              <button onClick={() => navigate("/history")} className="relative mt-4 inline-flex items-center gap-2 text-sm font-semibold text-violet-300 hover:text-violet-200">Review feedback <FaArrowRight size={11} /></button>
            </article>

            <article className="rounded-2xl border border-white/[0.07] bg-[#11111b] p-5 sm:p-6">
              <div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300"><FaRegCompass size={18} /></div><div><h2 className="font-semibold text-white">Your next milestone</h2><p className="mt-1 text-sm text-zinc-500">Build a balanced preparation routine.</p></div></div>
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-3 rounded-xl bg-white/[0.025] p-3"><FaCheckCircle className="shrink-0 text-emerald-300" /><span className="text-sm text-zinc-300">Practice one interview category each day</span></div>
                <div className="flex items-center gap-3 rounded-xl bg-white/[0.025] p-3"><FaLightbulb className="shrink-0 text-amber-300" /><span className="text-sm text-zinc-300">Use feedback to improve one answer at a time</span></div>
              </div>
              <button onClick={() => navigate("/progress")} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-violet-300 hover:text-violet-200">Explore progress <FaArrowRight size={11} /></button>
            </article>
          </div>
        </section>

        <section className="flex flex-col justify-between gap-4 rounded-2xl border border-white/[0.07] bg-[#11111b] p-5 sm:flex-row sm:items-center sm:p-6">
          <div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-400/10 text-sky-300"><FaBolt /></div><div><h2 className="font-semibold text-white">Ready for your next question?</h2><p className="mt-1 text-sm text-zinc-500">Choose HR, technical, or communication practice and keep building confidence.</p></div></div>
          <button onClick={() => navigate("/interview")} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-violet-400/25 bg-violet-500/10 px-4 py-2.5 text-sm font-semibold text-violet-200 transition hover:bg-violet-500/20">Continue practice <FaArrowRight size={11} /></button>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
