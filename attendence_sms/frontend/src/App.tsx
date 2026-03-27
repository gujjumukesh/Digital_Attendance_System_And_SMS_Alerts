import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import BiometricAttendance from "./pages/BiometricAttendance";
import Messaging from "./pages/Messaging";
import Reports from "./pages/Reports";
import Students from "./pages/Students";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import StudentAttendance from "./pages/StudentAttendance"; 

// Components
import AuthGuard from "./components/AuthGuard";
import DashboardLayout from "./components/DashboardLayout";
import RoleGuard from "./components/RoleGuard";
import StudentLayout from "./components/StudentLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* 1. Public routes */}
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          
          {/* 2. ADMIN Dashboard Routes */}
          <Route path="/dashboard" element={
            <AuthGuard>
              <RoleGuard requiredRole="admin">
                <DashboardLayout />
              </RoleGuard>
            </AuthGuard>
          }>
            <Route index element={<Dashboard />} />
            <Route path="biometric" element={<BiometricAttendance />} />
            <Route path="messaging" element={<Messaging />} />
            <Route path="reports" element={<Reports />} />
            <Route path="students" element={<Students />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* 3. STUDENT Routes */}
          <Route
            path="/student"
            element={
              <AuthGuard>
                <RoleGuard requiredRole="student">
                  <StudentLayout />
                </RoleGuard>
              </AuthGuard>
            }
          >
            <Route index element={<StudentAttendance />} />
          </Route>
          
          {/* Catch all for 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;