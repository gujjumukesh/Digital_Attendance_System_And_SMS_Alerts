import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Search, Download, UserPlus, Pencil, Trash2, Fingerprint, Loader2, CheckCircle, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

const Students = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("All Branches");
  const [studentsData, setStudentsData] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const { toast } = useToast();

  const [newStudent, setNewStudent] = useState({
    name: '',
    roll_no: '',
    branch: 'CSE',
    year: 1,
    mobile_no: '',
    biometric_id: null,
    college: JSON.parse(localStorage.getItem('bioattend-auth') || '{}').college || ''
  });

  const authData = JSON.parse(localStorage.getItem('bioattend-auth') || '{}');
  const currentCollege = authData.college || '';

  // Fetch Students with Realtime Sync
  useEffect(() => {
    fetchStudents();
    const sub = supabase.channel('students_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'total_students', filter: `college=eq.${currentCollege}` }, fetchStudents)
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [currentCollege]);

  const fetchStudents = async () => {
    const { data } = await supabase.from('total_students').select('*').eq('college', currentCollege).order('roll_no');
    if (data) setStudentsData(data);
  };

  // --- FINGERPRINT ENROLLMENT LOGIC ---
  const handleFingerprintEnroll = async () => {
    if (!newStudent.roll_no) {
      toast({ title: "Error", description: "Enter Roll No first", variant: "destructive" });
      return;
    }

    setIsEnrolling(true);

    // 1. Send Command to ESP32 via Supabase
    await supabase.from('biometric_commands').insert([
      { command: 'ENROLL', target_roll_no: newStudent.roll_no }
    ]);

    toast({ title: "Scanner Active", description: "Please place your finger on the sensor..." });

    // 2. Listen for Response from ESP32
    const responseChannel = supabase
      .channel('enroll_response')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'biometric_responses' }, 
      async (payload) => {
        const res = payload.new;

        if (res.status === 'SUCCESS') {
          setNewStudent(prev => ({ ...prev, biometric_id: res.finger_id }));
          setIsEnrolling(false);
          toast({ title: "Success", description: `Fingerprint ID ${res.finger_id} captured!` });
          supabase.removeChannel(responseChannel);
        } 
        else if (res.status === 'FAILED') {
          setIsEnrolling(false);
          toast({ title: "Failed", description: res.message, variant: "destructive" });
          supabase.removeChannel(responseChannel);
        }
      })
      .subscribe();

    // Timeout after 30 seconds
    setTimeout(() => {
      if (isEnrolling) {
        setIsEnrolling(false);
        supabase.removeChannel(responseChannel);
        toast({ title: "Timeout", description: "No response from scanner", variant: "destructive" });
      }
    }, 30000);
  };

  // --- STUDENT ACTIONS ---
  const handleAddStudent = async () => {
    const { error } = await supabase.from('total_students').insert([newStudent]);
    if (!error) {
      toast({ title: "Success", description: "Student added" });
      setIsAddModalOpen(false);
      setNewStudent({ name: '', roll_no: '', branch: 'CSE', year: 1, mobile_no: '', biometric_id: null, college: currentCollege });
      fetchStudents();
    } else {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    
    const { error } = await supabase.from('total_students').delete().eq('roll_no', id).eq('college', currentCollege);
    if (!error) {
      toast({ title: "Deleted", description: "Student record removed" });
      fetchStudents();
    } else {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(studentsData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    XLSX.writeFile(workbook, "Students_List.xlsx");
  };

  const filteredStudents = studentsData.filter(s => 
    (s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.roll_no.toString().includes(searchTerm)) &&
    (selectedBranch === "All Branches" || s.branch === selectedBranch)
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Student Management</h1>
        <div className="flex gap-2">
          <button onClick={() => setIsAddModalOpen(true)} className="flex items-center px-4 py-2 bg-black text-white rounded-lg">
            <UserPlus className="mr-2" size={18} /> Add Student
          </button>
          <button onClick={handleExport} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg">
            <Download className="mr-2" size={18} /> Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 bg-white p-4 rounded-xl shadow-sm">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input 
            type="text" placeholder="Search name or ID..." 
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          className="border rounded-lg px-4"
          value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)}
        >
          <option value="All Branches">All Branches</option>
          <option value="CSE">CSE</option>
          <option value="AI">CSE</option>
          <option value="ECE">ECE</option>
          <option value="ME">MECH</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4">ID</th>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Branch</th>
              <th className="px-6 py-4">Year</th>
              <th className="px-6 py-4">Mobile No</th>
              <th className="px-6 py-4">College</th>
              <th className="px-6 py-4">Biometric ID</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredStudents.map((student) => (
              <tr key={student.roll_no} className="hover:bg-gray-50">
                <td className="px-6 py-4">{student.roll_no}</td>
                <td className="px-6 py-4 font-medium">{student.name}</td>
                <td className="px-6 py-4">{student.branch}</td>
                <td className="px-6 py-4">{student.year}</td>
                <td className="px-6 py-4">{student.mobile_no}</td>
                <td className="px-6 py-4 text-sm max-w-[150px] truncate" title={student.college}>{student.college}</td>
                <td className="px-6 py-4">
                  {student.biometric_id ? (
                    <span className="text-green-600 font-mono">ID: {student.biometric_id}</span>
                  ) : (
                    <span className="text-gray-400 italic">Not Enrolled</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => handleDeleteStudent(student.roll_no)} className="text-red-500 hover:text-red-700">
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md space-y-4">
            <h2 className="text-xl font-bold">Register Student</h2>
            <div className="grid grid-cols-2 gap-3">
              <input type="text" placeholder="Roll No" className="w-full p-2 border rounded" 
                value={newStudent.roll_no} onChange={e => setNewStudent({...newStudent, roll_no: e.target.value})} />
              <input type="text" placeholder="Full Name" className="w-full p-2 border rounded" 
                value={newStudent.name} onChange={e => setNewStudent({...newStudent, name: e.target.value})} />
              <input type="text" placeholder="Branch" className="w-full p-2 border rounded" 
                value={newStudent.branch} onChange={e => setNewStudent({...newStudent, branch: e.target.value})} />
              <input type="number" placeholder="Year" className="w-full p-2 border rounded" min="1" max="4"
                value={newStudent.year} onChange={e => setNewStudent({...newStudent, year: parseInt(e.target.value) || 1})} />
              <input type="text" placeholder="Mobile Number" className="w-full p-2 border rounded" 
                value={newStudent.mobile_no} onChange={e => setNewStudent({...newStudent, mobile_no: e.target.value})} />
              <input type="text" placeholder="College" className="w-full p-2 border rounded" 
                value={newStudent.college} onChange={e => setNewStudent({...newStudent, college: e.target.value})} />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium">Biometric Enrollment</span>
              <button 
                onClick={handleFingerprintEnroll}
                disabled={isEnrolling}
                className={`flex items-center px-3 py-1.5 rounded-md text-white text-sm ${isEnrolling ? 'bg-gray-400' : 'bg-blue-600'}`}
              >
                {isEnrolling ? <Loader2 className="animate-spin mr-1" size={14} /> : <Fingerprint className="mr-1" size={14} />}
                {newStudent.biometric_id ? "Re-enroll" : "Enroll"}
              </button>
            </div>
            {newStudent.biometric_id && (
              <p className="text-xs text-green-600 text-center font-bold">Fingerprint Linked: ID {newStudent.biometric_id}</p>
            )}

            <div className="flex gap-2 pt-4">
              <button onClick={() => setIsAddModalOpen(false)} className="flex-1 py-2 border rounded-lg">Cancel</button>
              <button onClick={handleAddStudent} className="flex-1 py-2 bg-black text-white rounded-lg">Save Student</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;