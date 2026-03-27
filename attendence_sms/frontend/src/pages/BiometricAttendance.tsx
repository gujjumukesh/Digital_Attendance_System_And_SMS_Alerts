import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Fingerprint, Loader2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

const BiometricAttendance = () => {
  const [scannerStatus, setScannerStatus] = useState<"idle" | "connected" | "scanning">("idle");
  const [scannedStudents, setScannedStudents] = useState<any[]>([]);
  const { toast } = useToast();
  const channelRef = useRef<any>(null);

  const authData = JSON.parse(localStorage.getItem('bioattend-auth') || '{}');
  const currentCollege = authData.college || '';

  // Load today's existing attendance on mount
  useEffect(() => {
    fetchTodayAttendance();
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  const fetchTodayAttendance = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('today_attendence')
      .select('*')
      .eq('date', today)
      .eq('college', currentCollege)
      .order('verification_timestamp', { ascending: false });

    if (!error && data) {
      setScannedStudents(data.map(item => ({
        id: item.roll_no,
        studentId: `ROLL-${item.roll_no}`,
        name: item.name,
        timestamp: new Date(item.verification_timestamp),
        status: item.status
      })));
    }
  };

  const connectScanner = () => {
    setScannerStatus("connected");
    toast({
      title: "Scanner Linked",
      description: "Ready to receive biometric data from Supabase",
    });
  };

  const startScanning = () => {
    setScannerStatus("scanning");
    
    toast({
      title: "Live Monitoring Active",
      description: "Waiting for fingerprint scans...",
    });

    // SUBSCRIBE TO REALTIME CHANGES
    // This listens to any NEW inserts into the 'today_attendence' table
    channelRef.current = supabase
      .channel('attendance_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'today_attendence', filter: `college=eq.${currentCollege}` },
        (payload) => {
          const newRecord = payload.new;
          
          const newScan = {
            id: newRecord.roll_no,
            studentId: `ROLL-${newRecord.roll_no}`,
            name: newRecord.name,
            timestamp: new Date(newRecord.verification_timestamp),
            status: "present"
          };

          // Update UI list
          setScannedStudents(prev => [newScan, ...prev]);

          toast({
            title: "Attendance Marked",
            description: `${newRecord.name} is present`,
          });
        }
      )
      .subscribe();
  };

  const stopScanning = () => {
    setScannerStatus('connected');
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    toast({ title: "Monitoring Stopped" });
  };

  return (
    <div className="space-y-8 p-4 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Biometric Attendance</h1>
        <p className="text-gray-500">Live monitoring of ESP32 fingerprint scans</p>
      </div>

      {/* Control Panel */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center">
            <div className={`p-3 rounded-full mr-4 ${
              scannerStatus === "idle" ? "bg-gray-200" :
              scannerStatus === "connected" ? "bg-blue-500" : "bg-green-500"
            } text-white`}>
              <Fingerprint size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">System Status</h2>
              <p className="text-gray-500 capitalize">{scannerStatus}</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            {scannerStatus === "idle" && (
              <button onClick={connectScanner} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                Connect to Database
              </button>
            )}
            
            {scannerStatus === "connected" && (
              <button onClick={startScanning} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                Start Live Monitoring
              </button>
            )}
            
            {scannerStatus === "scanning" && (
              <button onClick={stopScanning} className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center">
                <Loader2 className="animate-spin mr-2" size={18} />
                Stop Monitoring
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <div className="p-4 border-b border-gray-50 bg-gray-50/50">
          <h2 className="font-bold text-gray-700">Today's Attendance Log</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs uppercase text-gray-400 font-semibold bg-gray-50">
                <th className="px-6 py-4">Roll No</th>
                <th className="px-6 py-4">Student Name</th>
                <th className="px-6 py-4">Verification Time</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {scannedStudents.length > 0 ? (
                scannedStudents.map((student, index) => (
                  <motion.tr 
                    initial={{ opacity: 0, x: -10 }} 
                    animate={{ opacity: 1, x: 0 }}
                    key={`${student.id}-${index}`}
                  >
                    <td className="px-6 py-4 font-medium text-gray-900">{student.id}</td>
                    <td className="px-6 py-4 text-gray-600">{student.name}</td>
                    <td className="px-6 py-4 text-gray-500">{student.timestamp.toLocaleTimeString()}</td>
                    <td className="px-6 py-4">
                      <span className="flex items-center text-green-600 text-sm font-medium">
                        <CheckCircle size={16} className="mr-1" /> Present
                      </span>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-gray-400">
                    No scans detected yet today.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BiometricAttendance;