import { useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import { API_URL } from "../config/api";

const API_BASE = `${API_URL}/api/resumes`;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const bulletList = (items, emptyText = "No items returned.") => {
  if (!Array.isArray(items) || items.length === 0) {
    return <p className="text-sm text-slate-400">{emptyText}</p>;
  }

  return (
    <ul className="list-disc space-y-2 pl-5 text-slate-200">
      {items.map((item, index) => (
        <li key={`${index}-${item}`}>{item}</li>
      ))}
    </ul>
  );
};

const Resume = () => {
  const [file, setFile] = useState(null);
  const [review, setReview] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFileChange = (event) => {
    const selected = event.target.files?.[0] || null;
    setReview(null);
    setError("");

    if (!selected) {
      setFile(null);
      return;
    }

    const extension = selected.name.toLowerCase().split(".").pop();
    if (!["pdf", "docx"].includes(extension)) {
      setFile(null);
      event.target.value = "";
      setError("Please upload your resume as a PDF or DOCX file. Images such as WEBP/JPG are not supported yet.");
      return;
    }

    if (selected.size > MAX_FILE_SIZE) {
      setFile(null);
      event.target.value = "";
      setError("The file is too large. Please choose a resume under 5 MB.");
      return;
    }

    setFile(selected);
  };

  const handleAnalyze = async (event) => {
    event.preventDefault();
    setError("");
    setReview(null);

    if (!file) {
      setError("Choose a PDF or DOCX resume first.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setError("Your login session was not found. Please log in again.");
      return;
    }

    const formData = new FormData();
    formData.append("resume", file);

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/analyze`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || `Resume analysis failed (HTTP ${response.status}).`);
      }
      if (!payload.review) {
        throw new Error("The server did not return an analysis result. Please check the backend route.");
      }

      setReview(payload.review);
    } catch (requestError) {
      setError(requestError.message || "Unable to analyze the resume. Check that the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Resume Review</h1>
          <p className="mt-3 text-slate-400">Upload your resume and receive AI feedback on its content and ATS readiness.</p>
        </div>

        <form onSubmit={handleAnalyze} className="rounded-2xl border border-slate-700 bg-slate-800 p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex-1 space-y-2">
              <label htmlFor="resume-file" className="block text-sm font-medium text-slate-200">Resume file (PDF or DOCX, max 5 MB)</label>
              <input
                id="resume-file"
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileChange}
                disabled={loading}
                className="block w-full cursor-pointer rounded-lg border border-slate-600 bg-slate-900 p-3 text-sm text-slate-200 file:mr-4 file:rounded-md file:border-0 file:bg-slate-700 file:px-3 file:py-2 file:text-slate-100 hover:file:bg-slate-600"
              />
              {file && <p className="text-sm text-slate-400">Selected: {file.name} ({(file.size / 1024).toFixed(0)} KB)</p>}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-violet-600 px-6 py-3 font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Analyzing resume..." : "Analyze Resume"}
            </button>
          </div>

          <p className="mt-4 text-xs leading-5 text-slate-400">Your file is processed by the backend for analysis. The original resume text is not stored in the review history. Do not upload documents containing information you do not want sent to the configured AI provider.</p>
          {error && <div role="alert" className="mt-5 rounded-lg border border-red-700 bg-red-950/40 p-4 text-sm text-red-200">{error}</div>}
        </form>

        {review && (
          <section className="space-y-5 rounded-2xl border border-slate-700 bg-slate-800 p-6 sm:p-8" aria-live="polite">
            <div className="flex flex-col gap-4 border-b border-slate-700 pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-400">Resume analyzed</p>
                <h2 className="mt-1 text-xl font-bold text-white">{review.filename}</h2>
                <p className="mt-2 text-slate-300">{review.summary}</p>
              </div>
              <div className="min-w-32 rounded-xl border border-violet-500/40 bg-slate-900 p-4 text-center">
                <p className="text-sm text-slate-400">Resume score</p>
                <p className="text-3xl font-bold text-violet-400">{review.score}<span className="text-base text-slate-400">/100</span></p>
                <p className="mt-1 text-xs capitalize text-slate-300">ATS readiness: {review.atsReadiness}</p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-5">
                <h3 className="mb-3 font-semibold text-white">Skills identified</h3>
                {bulletList(review.skillsFound, "No specific skills identified.")}
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-5">
                <h3 className="mb-3 font-semibold text-white">Strengths</h3>
                {bulletList(review.strengths)}
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-5">
                <h3 className="mb-3 font-semibold text-white">What to improve</h3>
                {bulletList(review.improvements)}
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-5">
                <h3 className="mb-3 font-semibold text-white">Missing or weak sections</h3>
                {bulletList(review.missingSections, "No major missing sections identified.")}
              </div>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-5">
              <h3 className="mb-3 font-semibold text-white">Project and impact suggestions</h3>
              {bulletList(review.projectFeedback, "No project-specific suggestions returned.")}
            </div>

            {review.rewrittenSummary && (
              <div className="rounded-xl border border-violet-500/30 bg-violet-950/20 p-5">
                <h3 className="mb-3 font-semibold text-violet-200">Suggested professional summary</h3>
                <p className="whitespace-pre-wrap leading-7 text-slate-200">{review.rewrittenSummary}</p>
              </div>
            )}
            <p className="text-xs text-slate-500">AI feedback is an estimate to guide improvements, not a guarantee of ATS ranking or selection.</p>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Resume;
