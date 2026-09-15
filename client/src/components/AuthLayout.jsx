import { LuBrain } from "react-icons/lu";

function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden text-white">

      {/* Background Gradient */}
      <div className="absolute w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] -top-24 -left-24"></div>
      <div className="absolute w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] bottom-0 right-0"></div>

      <div className="relative z-10 min-h-screen grid lg:grid-cols-2">

        {/* LEFT SIDE */}
        <div className="hidden lg:flex flex-col justify-center px-20">
          <div className="flex items-center gap-4 mb-6">
            <LuBrain className="text-blue-400" size={46} />
            <h1 className="text-4xl font-bold">InterviewAI</h1>
          </div>

          <h2 className="text-5xl font-bold leading-tight mb-6">
            Practice Interviews.
            <br />
            Crack Real Jobs.
          </h2>

          <p className="text-gray-400 text-lg leading-8 max-w-md">
            AI-powered HR and Technical interviews with feedback, scoring,
            communication analysis, and progress tracking.
          </p>
        </div>

        {/* RIGHT SIDE */}
        <div className="flex items-center justify-center p-6 lg:p-10">
          <div className="w-full max-w-md backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl">
            <h2 className="text-3xl font-bold mb-2">{title}</h2>
            <p className="text-gray-400 mb-8">{subtitle}</p>

            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;