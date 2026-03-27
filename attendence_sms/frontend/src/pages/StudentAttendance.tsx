import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { LogOut, CheckCircle2, XCircle, Coffee, Activity, TrendingUp, CalendarDays } from "lucide-react";
import { isWeekend, isSameDay } from "date-fns";

interface AttendanceRecord {
  date: string;
  status: string;
}

interface Holiday {
  date: string;
  name: string;
}

const StudentAttendance = () => {
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [attendancePercentage, setAttendancePercentage] = useState<number>(0);
  const [metrics, setMetrics] = useState({ present: 0, absent: 0, holidays: 0, workingDays: 0 });
  const [isLoading, setIsLoading] = useState(true);
  
  // Calendar View Date
  const [month, setMonth] = useState<Date>(new Date());
  
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("bioattend-auth");
    toast({ title: "Logged out", description: "You have been logged out successfully." });
    navigate("/login");
  };

  useEffect(() => {
    const fetchAttendance = async () => {
      setIsLoading(true);
      try {
        const authData = localStorage.getItem("bioattend-auth");
        const auth = authData ? JSON.parse(authData) : null;
        const rollNo = auth?.userId;

        if (!auth?.isAuthenticated || !rollNo) {
          throw new Error("You must be logged in to view this data.");
        }
        
        const currentCollege = auth?.college || '';

        // 1. Fetch Student's Attendance
        const { data: historyData, error: historyError } = await supabase
          .from("today_attendence")
          .select("date, status")
          .eq("roll_no", rollNo)
          .eq('college', currentCollege)
          .order("date", { ascending: false });

        if (historyError) throw historyError;
        const records = historyData || [];
        setAttendanceHistory(records);

        // 2. Fetch Live Holidays from SQL Table
        const { data: holidayData, error: holidayError } = await supabase
          .from("holidays")
          .select("date, name");
        
        let fetchedHolidays: Holiday[] = [];
        if (!holidayError && holidayData) {
          fetchedHolidays = holidayData;
          setHolidays(fetchedHolidays);
        }

        // 3. Smart Calculation of Working Days & Percentage
        if (records.length > 0) {
          // Find the very first day they attended (start of tracking)
          const sortedRecords = [...records].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          const startDate = new Date(sortedRecords[0].date);
          const endDate = new Date(); // Today

          let workingDays = 0;
          let current = new Date(startDate);
          
          while (current <= endDate) {
            const isWeekendDay = isWeekend(current);
            const isHoliday = fetchedHolidays.some(h => isSameDay(new Date(h.date), current));
            
            // It's a valid working day if it's a weekday and not a holiday
            if (!isWeekendDay && !isHoliday) {
              workingDays++;
            }
            current.setDate(current.getDate() + 1);
          }

          const presentCount = records.filter((r) => r.status?.toLowerCase() === "present").length;
          const absentCount = records.filter((r) => r.status?.toLowerCase() === "absent").length;
          const holidayCount = fetchedHolidays.length; // Approximate overall

          // Dynamic percentage against pure working days
          const percentage = workingDays > 0 ? (presentCount / workingDays) * 100 : 0;
          
          setMetrics({ present: presentCount, absent: absentCount, holidays: holidayCount, workingDays });
          // Cap at 100 just in case there are missing data anomalies
          setAttendancePercentage(Math.min(100, parseFloat(percentage.toFixed(2))));
        }

      } catch (error: any) {
        console.error("Error fetching attendance:", error.message);
        toast({ title: "Access Denied", description: error.message, variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttendance();
  }, [toast]);

  // Derived calendar modifiers
  const presentDates = useMemo(() => 
    attendanceHistory.filter(r => r.status.toLowerCase() === 'present').map(r => new Date(r.date)),
  [attendanceHistory]);

  const absentDates = useMemo(() => 
    attendanceHistory.filter(r => r.status.toLowerCase() === 'absent').map(r => new Date(r.date)),
  [attendanceHistory]);

  const holidayDates = useMemo(() => 
    holidays.map(h => new Date(h.date)),
  [holidays]);

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950 p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-6xl mx-auto space-y-6"
      >
        {/* Top Navbar */}
        <div className="flex items-center justify-between bg-white dark:bg-gray-900 px-6 py-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-xl">
              <Activity className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
                My Dashboard
              </h1>
              <p className="text-sm text-gray-500 font-medium">Live Attendance Tracking</p>
            </div>
          </div>
          <Button variant="ghost" className="rounded-xl hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" /> Sign Out
          </Button>
        </div>

        {/* Hero Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <motion.div whileHover={{ y: -5 }} className="md:col-span-2">
            <Card className="h-full bg-gradient-to-br from-indigo-500 to-purple-600 border-none text-white shadow-lg overflow-hidden relative">
              <div className="absolute top-0 right-0 p-6 opacity-10">
                <TrendingUp className="h-32 w-32" />
              </div>
              <CardHeader>
                <CardTitle className="text-white/90 text-lg">Overall Attendance</CardTitle>
                <CardDescription className="text-white/70">Calculated excluding Google Calendar Holidays & Weekends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-3">
                  <span className="text-6xl font-black">{attendancePercentage}%</span>
                </div>
                <div className="mt-6 flex items-center justify-between">
                  <span className="text-sm font-medium text-white/80">Goal: 75% Target</span>
                </div>
                <Progress value={attendancePercentage} className="mt-3 h-2 bg-white/20" /> {/* Needs to inherit custom internal color but works */}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div whileHover={{ y: -5 }}>
            <Card className="h-full bg-white dark:bg-gray-900 shadow-sm border-gray-100 dark:border-gray-800 rounded-3xl">
              <CardContent className="p-6 flex flex-col justify-center items-center h-full text-center space-y-3">
                <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-full">
                  <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{metrics.present}</h3>
                <p className="text-sm font-semibold text-gray-500 text-uppercase tracking-wider">Days Present</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div whileHover={{ y: -5 }}>
            <Card className="h-full bg-white dark:bg-gray-900 shadow-sm border-gray-100 dark:border-gray-800 rounded-3xl">
              <CardContent className="p-6 flex flex-col justify-center items-center h-full text-center space-y-3">
                <div className="bg-yellow-100 dark:bg-yellow-900/30 p-4 rounded-full">
                  <Coffee className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
                </div>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{metrics.holidays}</h3>
                <p className="text-sm font-semibold text-gray-500 text-uppercase tracking-wider">Total Holidays Sync'd</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Main Interface: Calendar & Log side-by-side */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Visual Calendar */}
          <motion.div whileHover={{ scale: 1.01 }} className="lg:col-span-1">
            <Card className="shadow-sm border-gray-100 dark:border-gray-800 rounded-3xl h-full">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  <CardTitle>Attendance Calendar</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex justify-center p-0 pb-6">
                <Calendar
                  mode="multiple"
                  month={month}
                  onMonthChange={setMonth}
                  modifiers={{
                    present: presentDates,
                    absent: absentDates,
                    holiday: holidayDates,
                  }}
                  modifiersStyles={{
                    present: { backgroundColor: '#10b981', color: 'white', borderRadius: '12px' },
                    absent: { backgroundColor: '#ef4444', color: 'white', borderRadius: '12px' },
                    holiday: { backgroundColor: '#f59e0b', color: 'black', borderRadius: '12px', fontWeight: 'bold' }
                  }}
                  className="bg-transparent"
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* Detailed Timeline List */}
          <motion.div whileHover={{ scale: 1.01 }} className="lg:col-span-2">
            <Card className="shadow-sm border-gray-100 dark:border-gray-800 rounded-3xl h-full overflow-hidden">
              <CardHeader className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Activity Log</CardTitle>
                  <Badge variant="outline" className="font-mono">{attendanceHistory.length} Days Tracked</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0 max-h-[400px] overflow-y-auto">
                {isLoading ? (
                  <div className="p-12 flex justify-center items-center">
                    <Activity className="animate-pulse h-8 w-8 text-primary" />
                  </div>
                ) : attendanceHistory.length === 0 ? (
                  <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                    <LogOut className="h-10 w-10 mb-4 opacity-20" />
                    <p>No attendance records logged yet.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {attendanceHistory.map((record, idx) => (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        key={idx} 
                        className="p-4 px-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          {record.status.toLowerCase() === "present" ? (
                            <div className="bg-green-100 dark:bg-green-900/20 p-2 rounded-lg">
                              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500" />
                            </div>
                          ) : (
                            <div className="bg-red-100 dark:bg-red-900/20 p-2 rounded-lg">
                              <XCircle className="h-5 w-5 text-red-600 dark:text-red-500" />
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-gray-100">
                              {new Date(record.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
                            </p>
                            <p className="text-xs text-gray-500">Biometric Scan Recorded</p>
                          </div>
                        </div>
                        <Badge 
                          variant={record.status.toLowerCase() === "present" ? "default" : "destructive"}
                          className={`px-3 py-1 ${record.status.toLowerCase() === "present" ? "bg-green-500 hover:bg-green-600" : ""}`}
                        >
                          {record.status}
                        </Badge>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default StudentAttendance;