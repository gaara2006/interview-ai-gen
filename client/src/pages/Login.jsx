import { useState } from "react";
import AuthLayout from "../components/AuthLayout";
import InputField from "../components/InputField";
import { Link } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  
  const validateForm = () => {
  const newErrors = {};

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

  const getPasswordStrength = () => {
    if (password.length === 0) return 0;
    if (password.length < 6) return 1;
    if (password.length < 8) return 2;
    if (
      /[A-Z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[!@#$%^&*]/.test(password)
    )
      return 4;
    return 3;
  };

  const strength = getPasswordStrength();

  setErrors(newErrors);

  return Object.keys(newErrors).length === 0;
  };

  const handleLogin = (e) => {
  e.preventDefault();

  if (!validateForm()) return;

  setLoading(true);

  // Temporary fake API call
  setTimeout(() => {
    setLoading(false);

    alert("Login Successful 🚀");
  }, 1500);
  };

  return (
    <AuthLayout
      title="Welcome Back 👋"
      subtitle="Login to continue your interview preparation"
    >
      {/*login form*/}
      <form onSubmit={handleLogin} className="space-y-5">
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
        
        <div className="flex justify-between text-sm text-gray-400">
          <label className="flex gap-2 items-center">
            <input type="checkbox" /> Remember me
          </label>
          <button type="button" className="text-blue-400">
            Forgot Password?
          </button>
        </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 font-semibold flex items-center justify-center gap-2 transition disabled:opacity-60"
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
      
       
      {/* </button> */}
      </form>

      {/* {divider - Form ke bahar}     */}
      <div className="my-6 flex items-center gap-4">
        <div className="flex-1 h-px bg-gray-700"></div>
        <span className="text-gray-500 text-sm">OR</span>
        <div className="flex-1 h-px bg-gray-700"></div>
      </div>

        {/* {google button} */}
          <button
          type="button"
          className="w-full border border-gray-700 rounded-xl py-3 hover:bg-white/10 transition flex items-center justify-center gap-3 font-medium"
          >
          <FcGoogle size={22} />
          Continue with Google
          </button>

     

      <p className="text-center text-gray-400 mt-6 text-sm">
        Don't have an account?{' '}
        <Link to="/signup" className="text-blue-400 font-semibold">
          Create one
        </Link>
      </p>
    </AuthLayout>
  );
}

export default Login;