import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    let ignore = false;
    const token = localStorage.getItem("token");

    if (!token) {
      setStatus("unauthenticated");
      return () => {
        ignore = true;
      };
    }

    const verifySession = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/auth/me", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok || !data.user) {
          throw new Error(data.message || "Session is invalid");
        }

        if (!ignore) {
          localStorage.setItem("user", JSON.stringify(data.user));
          setStatus("authenticated");
        }
      } catch (error) {
        if (!ignore) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setStatus("unauthenticated");
        }
      }
    };

    verifySession();

    return () => {
      ignore = true;
    };
  }, []);

  if (status === "checking") {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p>Verifying your session...</p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
