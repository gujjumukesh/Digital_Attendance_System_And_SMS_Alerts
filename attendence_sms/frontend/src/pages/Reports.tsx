
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart3, CalendarRange, DownloadCloud, Filter, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Papa from 'papaparse';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid,   Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

const Reports = () => {
  const [dateRange, setDateRange] = useState("This Week");
  const [course, setCourse] = useState("All Branches");
  const [weeklyData, setWeeklyData] = useState([]);
  const [courseData, setCourseData] = useState([]);
  const [dailyAggregates, setDailyAggregates] = useState<Record<string, { total_presents: number, total_absents: number }>>({});

  const authData = JSON.parse(localStorage.getItem('bioattend-auth') || '{}');
  const currentCollege = authData.college || '';

  // Fetch attendance data (using only today_attendence table)
  const fetchWeeklyAttendance = async () => {
    try {
      let startDate, endDate;
      const today = new Date();

      switch(dateRange) {
        case "Today":
          startDate = today.toISOString().split('T')[0];
          endDate = startDate;
          break;
        case "This Week":
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay());
          startDate = weekStart.toISOString().split('T')[0];
          
          const weekEnd = new Date(today);
          weekEnd.setDate(today.getDate() - today.getDay() + 6);
          endDate = weekEnd.toISOString().split('T')[0];
          break;
        case "This Month":
          startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
          endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
          break;
        case "This Semester":
          const currentMonth = today.getMonth();
          const semesterStart = new Date(today.getFullYear(), currentMonth < 6 ? 0 : 6, 1);
          const semesterEnd = new Date(today.getFullYear(), currentMonth < 6 ? 5 : 11, 31);
          startDate = semesterStart.toISOString().split('T')[0];
          endDate = semesterEnd.toISOString().split('T')[0];
          break;
        default:
          startDate = today.toISOString().split('T')[0];
          endDate = startDate;
      }

      // Fetch ONLY from today_attendence (contains both present and absent via status field)
      const { data: attendanceData, error } = await supabase
        .from('today_attendence')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .eq('college', currentCollege)
        .order('date', { ascending: true });

      if (error) throw error;

      if (!attendanceData || attendanceData.length === 0) {
        setWeeklyData([]);
        setCourseData([]);
        setDailyAggregates({});
        return;
      }

      // Filter by course if not "All Branches"
      let filteredData = attendanceData;
      if (course !== 'All Branches') {
        filteredData = attendanceData.filter(record => record.branch === course);
      }

      // Aggregate daily data (presents and absents from status field)
      const dailyAggregates: Record<string, { total_presents: number, total_absents: number }> = {};
      
      filteredData.forEach(record => {
        if (!record || !record.date) return;
        const date = record.date;
        if (!dailyAggregates[date]) {
          dailyAggregates[date] = {
            total_presents: 0,
            total_absents: 0
          };
        }
        
        if (record.status === 'Present') {
          dailyAggregates[date].total_presents += 1;
        } else if (record.status === 'Absent') {
          dailyAggregates[date].total_absents += 1;
        }
      });

      // Format for chart based on selected date range
      const chartAggregates: Record<string, { present: number, absent: number }> = {};
      
      filteredData.forEach(record => {
        if (!record || !record.date) return;
        const recordDate = new Date(record.date);
        let label = record.date;

        if (dateRange === "Today") {
          label = "Today";
        } else if (dateRange === "This Week") {
          label = recordDate.toLocaleDateString('en-US', { weekday: 'long' });
        } else if (dateRange === "This Month") {
          const day = recordDate.getDate();
          if (day <= 7) label = 'Week 1';
          else if (day <= 14) label = 'Week 2';
          else if (day <= 21) label = 'Week 3';
          else label = 'Week 4';
        } else if (dateRange === "This Semester") {
          label = recordDate.toLocaleDateString('en-US', { month: 'short' });
        }

        if (!chartAggregates[label]) {
          chartAggregates[label] = { present: 0, absent: 0 };
        }
        
        if (record.status === 'Present') {
          chartAggregates[label].present += 1;
        } else if (record.status === 'Absent') {
          chartAggregates[label].absent += 1;
        }
      });

      const formattedWeeklyData = Object.entries(chartAggregates).map(([label, stats]) => ({
        label: label,
        present: stats.present,
        absent: stats.absent
      }));

      setWeeklyData(formattedWeeklyData);

      // Calculate course-wise data
      let courseWiseData = [];
      
      if (filteredData.length > 0) {
        const branches = [...new Set(filteredData.map(record => record.branch).filter(Boolean))];
        
        courseWiseData = branches.map(branchName => {
          const branchRecords = filteredData.filter(record => record.branch === branchName);
          const totalPresent = branchRecords.filter(record => record.status === 'Present').length;
          const totalAbsent = branchRecords.filter(record => record.status === 'Absent').length;
          const total = totalPresent + totalAbsent;
          
          return {
            name: branchName || 'Unknown',
            attendance: total > 0 ? Math.round((totalPresent / total) * 100) : 0,
            totalStudents: total
          };
        });
      }

      setCourseData(courseWiseData);
      setDailyAggregates(dailyAggregates);
    } catch (error) {
      console.error('Error fetching attendance data:', error);
    }
  };

  // Initial fetch and refetch on filter changes
  useEffect(() => {
    fetchWeeklyAttendance();
  }, [dateRange, course]);

  // REAL-TIME SUBSCRIPTION (key fix)
  useEffect(() => {
    const attendanceSubscription = supabase
      .channel('attendance_changes_reports')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'today_attendence', filter: `college=eq.${currentCollege}` },
        fetchWeeklyAttendance
      )
      .subscribe();

    return () => {
      attendanceSubscription.unsubscribe();
    };
  }, [currentCollege]); // Resubscribe if college changes

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Reports & Analytics</h1>
        <p className="text-gray-500">Monitor attendance patterns and generate insights</p>
      </div>

      {/* Filter controls */}
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <div className="flex flex-wrap gap-4 justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <CalendarRange className="text-gray-500 mr-2" size={20} />
              <select
                className="py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
              >
                <option>Today</option>
                <option>This Week</option>
                <option>This Month</option>
                <option>This Semester</option>
              </select>
            </div>

            <div className="flex items-center">
              <Filter className="text-gray-500 mr-2" size={20} />
              <select
                className="py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
              >
                <option>All Branches</option>
                <option>Computer Science</option>
                <option>Electrical</option>
                <option>Mechanical</option>
                <option>Civil</option>
              </select>
            </div>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg"
            onClick={() => {
              try {
                if (weeklyData.length === 0) {
                  alert('No data available for export in the selected period');
                  return;
                }

                const exportData = [
                  ['Date', 'Branch', 'Present Students', 'Absent Students', 'Total Students', 'Attendance Rate (%)'],
                  ...Object.entries(dailyAggregates).map(([date, stats]) => {
                    const total = stats.total_presents + stats.total_absents;
                    const attendanceRate = total > 0 ? Math.round((stats.total_presents / total) * 100) : 0;
                    return [
                      new Date(date).toLocaleDateString(),
                      course === 'All Branches' ? 'All Branches' : course,
                      stats.total_presents,
                      stats.total_absents,
                      total,
                      attendanceRate
                    ];
                  })
                ];
                
                const csv = Papa.unparse(exportData);
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                
                link.setAttribute('href', url);
                link.setAttribute('download', `attendance_report_${course.toLowerCase()}_${dateRange.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`);
                link.style.visibility = 'hidden';
                
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
              } catch (error) {
                console.error('Error exporting data:', error);
                alert('An error occurred while exporting the data. Please try again.');
              }
            }}
          >
            <DownloadCloud className="mr-2" size={18} />
            Export Report
          </motion.button>
        </div>
      </div>

      {/* Weekly Attendance Chart */}
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h2 className="text-xl font-bold text-gray-800 mb-6">Attendance Overview</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={weeklyData}
              margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="present" name="Present" fill="#4ade80" />
              <Bar dataKey="absent" name="Absent" fill="#f87171" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Course-wise Attendance */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Branch-wise Distribution</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={courseData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value} students`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="totalStudents"
                >
                  {courseData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value} students`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Attendance Summary - NOW REAL-TIME */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Attendance Summary</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <Users className="text-blue-500 mr-3" size={20} />
                <span className="font-medium">Total Attendence</span>
              </div>
              <span className="text-xl font-bold">
                {courseData.reduce((sum, course) => sum + course.totalStudents, 0)}
              </span>
            </div>
            
            <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
              <div className="flex items-center">
                <BarChart3 className="text-green-500 mr-3" size={20} />
                <span className="font-medium">Average Attendance</span>
              </div>
              <span className="text-xl font-bold">
                {courseData.length > 0 
                  ? Math.round(courseData.reduce((sum, course) => sum + course.attendance, 0) / courseData.length)
                  : 0}%
              </span>
            </div>
                        <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg">
              <div className="flex items-center">
                <BarChart3 className="text-red-500 mr-3" size={20} />
                <span className="font-medium">Total Present</span>
              </div>
              <span className="text-xl font-bold">
                {weeklyData.reduce((sum, day) => sum + day.present, 0)}
              </span>
            </div>
            
            <div className="flex justify-between items-center p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center">
                <BarChart3 className="text-purple-500 mr-3" size={20} />
                <span className="font-medium">Total Absent</span>
              </div>
              <span className="text-xl font-bold">
                {weeklyData.reduce((sum, day) => sum + day.absent, 0)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
