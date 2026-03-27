
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  Users,
  UserCheck,
  UserX,
  BarChart3,
  Fingerprint,
  MessageCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

const Dashboard = () => {
  const navigate = useNavigate();
  
  const [stats, setStats] = useState([
    { label: "Total Students", value: "0", icon: Users, color: "bg-blue-500" },
    { label: "Present Today", value: "0", icon: UserCheck, color: "bg-green-500" },
    { label: "Absent Today", value: "0", icon: UserX, color: "bg-red-500" },
    { label: "Attendance Rate", value: "0%", icon: BarChart3, color: "bg-purple-500" },
  ]);

  const authData = JSON.parse(localStorage.getItem('bioattend-auth') || '{}');
  const currentCollege = authData.college || '';

  useEffect(() => {
    const fetchStudentStats = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        
        // Query for total students, attendance data, and absent students
        const [{ data: students }, { data: attendance }, { data: absentData }] = await Promise.all([
          supabase.from('total_students').select('roll_no, name, year, branch, mobile_no').eq('college', currentCollege),
          supabase.from('today_attendence').select('roll_no, status').eq('date', today).eq('college', currentCollege),
          supabase.from('today_absent').select('roll_no').eq('date', today).eq('college', currentCollege)
        ]);

        if (students) {
          const totalStudents = students.length;
          const presentStudents = attendance?.filter(a => a.status === 'Present').length || 0;
          const absentStudents = absentData?.length || 0;
          const attendanceRate = totalStudents > 0 
            ? Math.round((presentStudents / totalStudents) * 100)
            : 0;

          setStats([
            { label: "Total Students", value: totalStudents.toString(), icon: Users, color: "bg-blue-500" },
            { label: "Present Today", value: presentStudents.toString(), icon: UserCheck, color: "bg-green-500" },
            { label: "Absent Today", value: absentStudents.toString(), icon: UserX, color: "bg-red-500" },
            { label: "Attendance Rate", value: `${attendanceRate}%`, icon: BarChart3, color: "bg-purple-500" },
          ]);
        }
      } catch (error) {
        console.error('Error fetching student stats:', error);
      }
    };

    fetchStudentStats();

    // Subscribe to real-time changes
    const attendanceSubscription = supabase
      .channel('attendance_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'today_attendence', filter: `college=eq.${currentCollege}` },
        fetchStudentStats
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'today_absent', filter: `college=eq.${currentCollege}` },
        fetchStudentStats
      )
      .subscribe();

    return () => {
      attendanceSubscription.unsubscribe();
    };
  }, []);

  const quickActions = [
    { 
      label: "Start Biometric Scanner", 
      description: "Begin fingerprint attendance capture", 
      icon: Fingerprint,
      color: "bg-blue-500",
      path: "/dashboard/biometric"
    },
    { 
      label: "Send Absence Notifications", 
      description: "Message students who are absent today", 
      icon: MessageCircle,
      color: "bg-amber-500",
      path: "/dashboard/messaging"
    },
    { 
      label: "View Attendance Reports", 
      description: "Analyze attendance patterns and statistics", 
      icon: BarChart3,
      color: "bg-green-500", 
      path: "/dashboard/reports"
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500">Welcome back, Admin</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-medium">{new Date().toLocaleDateString()}</p>
          <p className="text-gray-500">Academic Year 2025-2026</p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
            className="bg-white p-6 rounded-xl shadow-sm"
          >
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-full ${stat.color} text-white`}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-gray-500 text-sm">{stat.label}</p>
                <h3 className="text-2xl font-bold">{stat.value}</h3>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickActions.map((action, index) => (
            <motion.div
              key={action.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1, duration: 0.5 }}
              className="bg-white p-6 rounded-xl shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(action.path)}
            >
              <div className={`p-3 rounded-full ${action.color} text-white w-fit mb-4`}>
                <action.icon size={24} />
              </div>
              <h3 className="text-lg font-bold mb-2">{action.label}</h3>
              <p className="text-gray-500">{action.description}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Recent activity (placeholder) */}
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Activity</h2>
        <div className="space-y-4">
          {[1, 2, 3].map((_, i) => (
            <div key={i} className="border-b border-gray-100 pb-4 last:border-0">
              <div className="flex justify-between">
                <p className="font-medium">Attendance session completed</p>
                <span className="text-sm text-gray-500">
                  {new Date(Date.now() - i * 24 * 60 * 60 * 1000).toLocaleDateString()}
                </span>
              </div>
              <p className="text-gray-500 text-sm">
                Recorded attendance for {Math.floor(Math.random() * 30) + 20} students
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
