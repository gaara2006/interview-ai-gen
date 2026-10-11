import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Interview from "./pages/Interview";
import Resume from "./pages/Resume";
import Progress from "./pages/Progress";
import Settings from "./pages/Settings";
import ProtectedRoute from "./components/ProtectedRoute";
import InterviewHistory from "./pages/InterviewHistory";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public authentication pages */}
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Every application page validates the saved JWT first */}
        <Route
          path="/dashboard"
          element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
        />
        <Route
          path="/interview"
          element={<ProtectedRoute><Interview /></ProtectedRoute>}
        />
        <Route
          path="/resume"
          element={<ProtectedRoute><Resume /></ProtectedRoute>}
        />
        <Route
          path="/progress"
          element={<ProtectedRoute><Progress /></ProtectedRoute>}
        />
        <Route
          path="/settings"
          element={<ProtectedRoute><Settings /></ProtectedRoute>}
        />
        <Route
          path="/history"
          element={
          <ProtectedRoute>
          <InterviewHistory />
          </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
