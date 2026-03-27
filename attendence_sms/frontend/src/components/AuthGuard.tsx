import { Navigate } from "react-router-dom";

const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const authData = localStorage.getItem("bioattend-auth");
  const auth = authData ? JSON.parse(authData) : null;

  // If no auth data exists in localStorage, send back to login
  if (!auth || !auth.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default AuthGuard;