import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

const Login = () => {
  const [college, setCollege] = useState(""); // College Name
  const [username, setUsername] = useState(""); // This is the Roll No or Admin ID
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 1. Call the Unified RPC function
      // This function checks the admin_login (and soon student if added to v2)
      const { data, error } = await supabase.rpc('authenticate_user_v2', {
        p_userid: username, 
        p_password: password,
        p_college: college
      });

      if (error) {
        console.error("Database Error:", error);
        throw new Error(error.message);
      }

      // 2. RPC returns an array; we take the first matching user
      const result = data && data.length > 0 ? data[0] : null;

      if (result && result.auth_success) {
        // 3. Prepare the authentication data for storage
        const authData = { 
          isAuthenticated: true,
          userId: username, // The Roll No or Admin ID string
          name: result.user_name,
          role: result.user_role,     // 'admin' or 'student'
          college: college            // College name
        };

        // 4. Save to localStorage so other pages can verify identity
        localStorage.setItem("bioattend-auth", JSON.stringify(authData));

        toast({
          title: "Login Successful",
          description: `Welcome back, ${result.user_name}!`,
        });

        // 5. Route Redirection Logic
        if (result.user_role === "admin") {
          console.log("Redirecting to Admin Dashboard...");
          navigate("/dashboard");
        } else {
          console.log("Redirecting to Student Portal...");
          navigate("/student");
        }

      } else {
        // Invalid credentials
        toast({
          title: "Login Failed",
          description: "Invalid ID or Password. Students: Password is Name+RollNo.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error("Login component error:", err);
      toast({
        title: "Connection Error",
        description: "Could not reach the database. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100"
      >
        <div className="text-center mb-8">
          <div className="inline-block p-3 bg-black rounded-xl mb-4">
            <span className="text-white font-bold text-xl">BA</span>
          </div>
          <h1 className="text-3xl font-bold text-[#1d1d1f] tracking-tight">BioAttend</h1>
          <p className="text-gray-500 mt-2">Attendance Management System</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="college" className="text-sm font-semibold text-gray-700 ml-1">
              College Name
            </label>
            <input
              id="college"
              type="text"
              value={college}
              onChange={(e) => setCollege(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all placeholder:text-gray-300"
              placeholder="e.g. MEC"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-semibold text-gray-700 ml-1">
              Roll Number / Admin ID
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all placeholder:text-gray-300"
              placeholder="e.g. 101 or admin123"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-semibold text-gray-700 ml-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all placeholder:text-gray-300"
              placeholder="Enter your password"
              required
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            disabled={isLoading}
            className={`w-full py-3.5 px-4 bg-black text-white rounded-xl font-bold shadow-lg transition-all ${
              isLoading ? "opacity-70 cursor-not-allowed" : "hover:bg-gray-800"
            }`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Verifying...</span>
              </div>
            ) : (
              "Sign In"
            )}
          </motion.button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-gray-50 text-center">
          <p className="text-xs text-gray-400">
            For students: Password is usually <span className="font-medium">NameRollNo</span>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;