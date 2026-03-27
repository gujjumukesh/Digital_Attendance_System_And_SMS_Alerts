import { useState } from "react";
import { Navigate } from "react-router-dom";

interface RoleGuardProps {
  children: React.ReactNode;
  requiredRole: "admin" | "student";
}

const RoleGuard = ({ children, requiredRole }: RoleGuardProps) => {
  const [loading] = useState(false);
  // Use localStorage auth from custom RPC login (authenticate_user_final)
  const authData = localStorage.getItem("bioattend-auth");
  const auth = authData ? JSON.parse(authData) : null;
  const role: string | null = auth?.role ? String(auth.role).toLowerCase() : null;

  if (loading) return <div>Loading...</div>;

  if (!role) return <Navigate to="/login" replace />;

  if (requiredRole === "admin" && role !== "admin") return <Navigate to="/student" replace />;
  if (requiredRole === "student" && role !== "student") return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
};

export default RoleGuard;