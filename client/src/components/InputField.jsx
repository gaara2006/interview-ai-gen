import { useState } from "react";
import { LuMail, LuLock, LuUser, LuEye, LuEyeOff } from "react-icons/lu";

function InputField({
  type = "text",
  placeholder,
  value,
  onChange,
  error,
}) {
  const [showPassword, setShowPassword] = useState(false);

  const inputType =
    type === "password"
      ? showPassword
        ? "text"
        : "password"
      : type;

  const Icon =
    type === "email"
      ? LuMail
      : type === "password"
      ? LuLock
      : LuUser;

  return (
    <div>
      <div className="relative">
        <Icon
          size={20}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
        />

        <input
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={`w-full rounded-xl bg-slate-900/80 border py-3 pl-12 pr-12 text-white outline-none transition-all
            ${
              error
                ? "border-red-500"
                : "border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
            }`}
        />

        {type === "password" && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
          >
            {showPassword ? <LuEyeOff size={20} /> : <LuEye size={20} />}
          </button>
        )}
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}

export default InputField;