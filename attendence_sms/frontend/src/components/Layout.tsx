
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  
  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      {location.pathname !== "/" && location.pathname !== "/login" && (
        <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
          <div className="container mx-auto px-6 py-4 flex justify-between items-center">
            <Link to="/dashboard">
              <motion.div 
                className="flex items-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <span className="text-xl font-semibold tracking-tight">BioAttend</span>
              </motion.div>
            </Link>
            <nav>
              <ul className="flex space-x-8">
                {[
                  { path: "/dashboard", label: "Dashboard" },
                  { path: "/students", label: "Students" },
                  { path: "/reports", label: "Reports" },
                  { path: "/settings", label: "Settings" },
                ].map((item) => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={cn(
                        "text-sm font-medium transition-colors hover:text-black relative py-2",
                        location.pathname === item.path
                          ? "text-black"
                          : "text-gray-500"
                      )}
                    >
                      {item.label}
                      {location.pathname === item.path && (
                        <motion.div
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-black"
                          layoutId="underline"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <Link 
              to="/login" 
              className="text-sm text-gray-500 hover:text-black transition-colors"
              onClick={(e) => {
                e.preventDefault();
                // In a real app, implement logout functionality here
                window.location.href = "/login";
              }}
            >
              Log out
            </Link>
          </div>
        </header>
      )}
      <main className={cn(
        "min-h-screen",
        location.pathname !== "/" && location.pathname !== "/login" && "pt-20"
      )}>
        {children}
      </main>
    </div>
  );
};

export default Layout;
