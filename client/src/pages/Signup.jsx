import { useState } from "react";
import AuthLayout from "../components/AuthLayout";
import InputField from "../components/InputField";
import { Link } from "react-router-dom";

function Signup() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [errors, setErrors] = useState({});

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

  return (
    <AuthLayout
      title="Create Account 🚀"
      subtitle="Start preparing for interviews with AI"
    >
      <form onSubmit={validateForm} className="space-y-5">
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
        />

        <InputField
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <InputField
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

       <button
  type="submit"
  disabled={loading}
  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900 transition font-semibold flex justify-center items-center gap-2"
>
  {loading ? (
    <>
      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
      Signing In...
    </>
  ) : (
    "Sign In"
  )}
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