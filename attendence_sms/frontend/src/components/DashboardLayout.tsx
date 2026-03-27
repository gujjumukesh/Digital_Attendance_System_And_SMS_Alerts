
import React, { useState } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Home, 
  Users, 
  BarChart3, 
  MessageCircle, 
  Fingerprint, 
  Settings, 
  LogOut,
  Menu,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const DashboardLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = () => {
    localStorage.removeItem("bioattend-auth");
    toast({
      title: "Logged out",
      description: "You have been successfully logged out",
    });
    navigate("/login");
  };

  const navItems = [
    { icon: Home, label: "Dashboard", path: "/dashboard" },
    { icon: Fingerprint, label: "Biometric Attendance", path: "/dashboard/biometric" },
    { icon: MessageCircle, label: "Messaging", path: "/dashboard/messaging" },
    { icon: Users, label: "Students", path: "/dashboard/students" },
    { icon: BarChart3, label: "Reports", path: "/dashboard/reports" },
    { icon: Settings, label: "Settings", path: "/dashboard/settings" },
  ];

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile sidebar toggle */}
      <button
        onClick={toggleSidebar}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-md shadow-md"
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <motion.div
        initial={{ x: -250 }}
        animate={{ x: isSidebarOpen ? 0 : -250 }}
        transition={{ duration: 0.3 }}
        className={`fixed md:relative inset-y-0 left-0 z-40 w-64 bg-white shadow-lg overflow-y-auto`}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar header */}
          <div className="px-6 py-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-[#1d1d1f]">BioAttend</h1>
            <p className="text-sm text-gray-500">Admin Dashboard</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-6 px-4">
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.label}>
                  <button
                    onClick={() => navigate(item.path)}
                    className="flex items-center w-full px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition"
                  >
                    <item.icon className="w-5 h-5 mr-3" />
                    <span>{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Logout button */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-3 text-red-600 rounded-lg hover:bg-red-50 transition"
            >
              <LogOut className="w-5 h-5 mr-3" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <main className={`p-6 transition-all duration-300 ${isSidebarOpen ? "md:ml-64" : ""}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
