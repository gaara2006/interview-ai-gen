import { LuBrain } from "react-icons/lu";
import { LuBrainCircuit } from "react-icons/lu";

function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden text-white">

      {/* Background Gradient */}
      <div className="absolute w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] -top-24 -left-24"></div>
      <div className="absolute w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] bottom-0 right-0"></div>
      <div className="absolute top-20 left-20 w-32 h-32 rounded-full bg-blue-500/20 blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-20 w-40 h-40 rounded-full bg-purple-500/20 blur-3xl animate-pulse"></div>
      <div className="absolute top-1/2 left-1/3 w-24 h-24 rounded-full bg-cyan-400/20 blur-2xl animate-bounce"></div>
      <div className="relative z-10 min-h-screen grid lg:grid-cols-2">

        {/* LEFT SIDE */}
        <div className="hidden lg:flex flex-col justify-center px-20">
        <div className="flex items-center gap-4 mb-8">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 rounded-2xl shadow-lg shadow-blue-500/30">
        <LuBrainCircuit size={36} />
        </div>

        <div>
        <h1 className="text-3xl font-bold">InterviewAI</h1>
        <p className="text-sm text-gray-400">
          AI Powered Interview Platform
        </p>
        </div>
        </div>

        <h2 className="text-5xl font-bold leading-tight mb-6">
          Master Interviews
        <br />
          Before You Face Them.
        </h2>

        <p className="text-gray-400 text-lg leading-8 max-w-md">
          HR Interview • Technical Interview • AI Feedback • Progress Tracking
        </p>
      </div>
    
        {/* RIGHT SIDE */}
       <div className="flex items-center justify-center p-8 lg:p-12">
          <div className="w-full max-w-lg backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl">
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