import React from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const StudentLayout = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const authData = localStorage.getItem("bioattend-auth");
  const auth = authData ? JSON.parse(authData) : null;
  const name: string | null = auth?.name ?? null;

  const handleLogout = () => {
    localStorage.removeItem("bioattend-auth");
    toast({
      title: "Logged out",
      description: "You have been successfully logged out",
    });
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <div className="text-lg font-bold text-[#1d1d1f]">BioAttend</div>
            <div className="text-sm text-gray-500">
              Student Portal{name ? ` • ${name}` : ""}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-4 py-2 text-red-600 rounded-lg hover:bg-red-50 transition"
            type="button"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
};

export default StudentLayout;
