import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";

const API_BASE = "http://localhost:5000/api/auth";

const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

const Settings = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(() => {
    const user = readStoredUser();
    return { name: user?.name || "", email: user?.email || "" };
  });
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileNotice, setProfileNotice] = useState({ type: "", message: "" });

  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState({ type: "", message: "" });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/", { replace: true });
      return;
    }

    let cancelled = false;
    const loadProfile = async () => {
      try {
        const response = await fetch(`${API_BASE}/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json().catch(() => ({}));
        if (response.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/", { replace: true });
          return;
        }
        if (!response.ok) throw new Error(data.message || "Could not load account details.");
        if (!cancelled && data.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
          setProfile({ name: data.user.name || "", email: data.user.email || "" });
          window.dispatchEvent(new Event("interviewai-user-updated"));
        }
      } catch (error) {
        if (!cancelled) {
          setProfileNotice({ type: "error", message: error.message || "Could not load account details." });
        }
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    };

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("interviewai-user-updated"));
    navigate("/", { replace: true });
  };

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setProfile((current) => ({ ...current, [name]: value }));
    setProfileNotice({ type: "", message: "" });
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setProfileNotice({ type: "", message: "" });

    if (!profile.name.trim() || !profile.email.trim()) {
      setProfileNotice({ type: "error", message: "Name and email are required." });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim())) {
      setProfileNotice({ type: "error", message: "Enter a valid email address." });
      return;
    }

    setProfileSaving(true);
    try {
      const response = await fetch(`${API_BASE}/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({ name: profile.name.trim(), email: profile.email.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        handleLogout();
        return;
      }
      if (!response.ok) throw new Error(data.message || "Could not save your profile.");

      localStorage.setItem("user", JSON.stringify(data.user));
      setProfile({ name: data.user.name, email: data.user.email });
      window.dispatchEvent(new Event("interviewai-user-updated"));
      setProfileNotice({ type: "success", message: "Profile updated successfully." });
    } catch (error) {
      setProfileNotice({ type: "error", message: error.message || "Could not save your profile." });
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswords((current) => ({ ...current, [name]: value }));
    setPasswordNotice({ type: "", message: "" });
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setPasswordNotice({ type: "", message: "" });

    if (!passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword) {
      setPasswordNotice({ type: "error", message: "Complete all password fields." });
      return;
    }
    if (passwords.newPassword.length < 8) {
      setPasswordNotice({ type: "error", message: "The new password must be at least 8 characters." });
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordNotice({ type: "error", message: "The new passwords do not match." });
      return;
    }

    setPasswordSaving(true);
    try {
      const response = await fetch(`${API_BASE}/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify(passwords),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        handleLogout();
        return;
      }
      if (!response.ok) throw new Error(data.message || "Could not change your password.");

      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordNotice({ type: "success", message: "Password changed successfully." });
    } catch (error) {
      setPasswordNotice({ type: "error", message: error.message || "Could not change your password." });
    } finally {
      setPasswordSaving(false);
    }
  };

  const noticeClass = (type) =>
    type === "success"
      ? "border border-emerald-700 bg-emerald-950/50 text-emerald-300"
      : "border border-red-800 bg-red-950/40 text-red-300";

  const fieldClass =
    "mt-2 w-full rounded-xl border border-slate-600 bg-slate-900 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-6 pb-8">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="mt-2 text-slate-400">Manage your profile and account security.</p>
        </div>

        <section className="rounded-2xl border border-slate-700 bg-slate-800 p-5 sm:p-7">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">Profile information</h2>
            <p className="mt-1 text-sm text-slate-400">Update the name and email associated with your account.</p>
          </div>

          {profileNotice.message && (
            <p className={`mb-5 rounded-lg px-4 py-3 text-sm ${noticeClass(profileNotice.type)}`} role="status">
              {profileNotice.message}
            </p>
          )}

          <form onSubmit={handleProfileSubmit} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-200">
                Full name
                <input
                  className={fieldClass}
                  type="text"
                  name="name"
                  value={profile.name}
                  onChange={handleProfileChange}
                  maxLength={80}
                  autoComplete="name"
                  placeholder="Your full name"
                  disabled={profileLoading || profileSaving}
                  required
                />
              </label>
              <label className="block text-sm font-medium text-slate-200">
                Email address
                <input
                  className={fieldClass}
                  type="email"
                  name="email"
                  value={profile.email}
                  onChange={handleProfileChange}
                  maxLength={254}
                  autoComplete="email"
                  placeholder="you@example.com"
                  disabled={profileLoading || profileSaving}
                  required
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={profileLoading || profileSaving}
              className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {profileLoading ? "Loading profile..." : profileSaving ? "Saving..." : "Save profile"}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-700 bg-slate-800 p-5 sm:p-7">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">Change password</h2>
            <p className="mt-1 text-sm text-slate-400">Confirm your current password before choosing a new one.</p>
          </div>

          {passwordNotice.message && (
            <p className={`mb-5 rounded-lg px-4 py-3 text-sm ${noticeClass(passwordNotice.type)}`} role="status">
              {passwordNotice.message}
            </p>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-3">
              <label className="block text-sm font-medium text-slate-200">
                Current password
                <input
                  className={fieldClass}
                  type="password"
                  name="currentPassword"
                  value={passwords.currentPassword}
                  onChange={handlePasswordChange}
                  autoComplete="current-password"
                  placeholder="Current password"
                  disabled={passwordSaving}
                  required
                />
              </label>
              <label className="block text-sm font-medium text-slate-200">
                New password
                <input
                  className={fieldClass}
                  type="password"
                  name="newPassword"
                  value={passwords.newPassword}
                  onChange={handlePasswordChange}
                  autoComplete="new-password"
                  minLength={8}
                  placeholder="At least 8 characters"
                  disabled={passwordSaving}
                  required
                />
              </label>
              <label className="block text-sm font-medium text-slate-200">
                Confirm new password
                <input
                  className={fieldClass}
                  type="password"
                  name="confirmPassword"
                  value={passwords.confirmPassword}
                  onChange={handlePasswordChange}
                  autoComplete="new-password"
                  minLength={8}
                  placeholder="Repeat new password"
                  disabled={passwordSaving}
                  required
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={passwordSaving}
              className="rounded-xl border border-slate-600 px-5 py-3 font-semibold text-slate-100 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {passwordSaving ? "Updating password..." : "Update password"}
            </button>
          </form>
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-red-900/70 bg-slate-800 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div>
            <h2 className="text-xl font-semibold">Session</h2>
            <p className="mt-1 text-sm text-slate-400">Log out of this account on this browser.</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl bg-red-600 px-5 py-3 font-semibold text-white transition hover:bg-red-700"
          >
            Log out
          </button>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
