import { useState } from "react";
import AuthLayout from "../components/AuthLayout";
import InputField from "../components/InputField";
import { Link } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";
import { useNavigate } from "react-router-dom";

function Signup() {
  //States
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [serverError, setServerError] = useState("");

    const [errors, setErrors] = useState({});

    // 👇 Validation function yahan hoga
    const validateForm = () => {
        const newErrors = {};

        if (!name.trim()) {
            newErrors.name = "Name is required";
        }

        if (!email.trim()) {
            newErrors.email = "Email is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            newErrors.email = "Enter a valid email";
        }

        if (!password) {
            newErrors.password = "Password is required";
        } else if (password.length < 8) {
            newErrors.password = "Minimum 8 characters required";
        }

        if (password !== confirmPassword) {
            newErrors.confirmPassword = "Passwords do not match";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
  
// ✅ HANDLE SIGNUP YAHAN ADD KARNA HAI
  
    const handleSignup = async (e) => {
      e.preventDefault();
      setServerError("");

      if (!validateForm()) return;

      setLoading(true);

      try {
        const response = await fetch(
          "http://localhost:5000/api/auth/signup",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name,
              email,
              password,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          setServerError(data.message || "Signup failed");
          return;
        }

        alert("Account Created Successfully 🚀");
        navigate("/");
      } catch (error) {
        setServerError(
          "Server se connect nahi ho pa raha. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };


  return (
    <AuthLayout
      title="Create Account 🚀"
      subtitle="Start preparing for interviews with AI"
    >
      <form onSubmit={handleSignup} className="space-y-5">
        <InputField
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name} 
         
        />


        <InputField
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />

        <InputField
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />

        <InputField
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={errors.confirmPassword}
        />
        {serverError && (
        <p className="text-red-400 text-sm" role="alert">
        {serverError}
        </p>
        )}
     
        <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 transition font-semibold disabled:opacity-60"
        >
        {loading ? "Creating Account..." : "Create Account"}
        </button>

     
      <div className="my-6 flex items-center gap-4">
      <div className="flex-1 h-px bg-slate-700"></div>
      <span className="text-gray-500 text-sm">OR</span>
      <div className="flex-1 h-px bg-slate-700"></div>
      </div>

      <button
      type="button"
      className="w-full py-3 rounded-xl border border-slate-700 bg-slate-900/60 hover:bg-slate-800 flex items-center justify-center gap-3 transition"
      >
      <FcGoogle size={22} />
      Continue with Google
      </button>
      </form>

      <p className="text-center text-gray-400 mt-6 text-sm">
        Already have an account?{' '}
        <Link to="/" className="text-purple-400 font-semibold">
          Login
        </Link>
      </p>
    </AuthLayout>
  );
}

export default Signup;