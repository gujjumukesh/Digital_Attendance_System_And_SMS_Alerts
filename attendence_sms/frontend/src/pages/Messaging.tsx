import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Send, Users, UserX, Loader2, AlertCircle, UserCheck, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast"; // Assuming correct path
import { supabase } from "@/lib/supabase"; // Assuming correct path

// Define an interface for the student data structure
interface Student {
  id: number;
  name: string;
  studentId: number;
  phone: string;
  course: string;
}

// Define an interface for the history entry
interface HistoryEntry {
  id: number;
  timestamp: Date;
  message: string;
  recipients: Student[];
  successCount: number;
  failureCount: number;
}

const Messaging: React.FC = () => { // Define as Functional Component
  const [messageText, setMessageText] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);
  const [sentHistory, setSentHistory] = useState<HistoryEntry[]>([]); // Use HistoryEntry type
  const [absentStudents, setAbsentStudents] = useState<Student[]>([]); // Use Student type
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // State for the update absent button
  const [isUpdatingAbsents, setIsUpdatingAbsents] = useState<boolean>(false);

  const authData = JSON.parse(localStorage.getItem('bioattend-auth') || '{}');
  const currentCollege = authData.college || '';

  // Memoize fetchAbsentStudents using useCallback
  const fetchAbsentStudents = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      setError(null);

      const today = new Date().toISOString().split('T')[0];

      // Fetch data from 'today_absent' table
      const { data, error: fetchError } = await supabase
        .from('today_absent')
        .select('*') // Select specific columns if needed: 'roll_no, name, mobile_no, branch'
        .eq('date', today)
        .eq('college', currentCollege);

      if (fetchError) throw fetchError;

      // Process fetched data
      if (data && data.length > 0) {
        const formattedData: Student[] = data.map((item) => ({
          id: item.roll_no, // Use roll_no as the unique ID for React keys/selection
          name: item.name || 'Unknown Name',
          studentId: item.roll_no,
          phone: item.mobile_no || 'N/A', // Provide default if null/undefined
          course: item.branch || 'N/A'   // Provide default if null/undefined
        }));
        setAbsentStudents(formattedData);
        setSelectedStudents([]); // Reset selection when list updates
      } else {
        setAbsentStudents([]); // Set empty array if no data
        if (showLoading) {
             toast({
                title: "No Absent Students",
                description: "No absent students currently recorded for today. You might need to update the list.",
                duration: 5000,
            });
        }
      }
    } catch (err: any) {
      console.error('Error fetching absent students:', err);
      const errorMessage = err.message || 'An unknown error occurred.';
      setError(`Failed to load absent students: ${errorMessage}`);
      toast({
        title: "Error Loading Data",
        description: `Failed to load absent students data: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [toast]); // Dependency for useCallback

  // Initial fetch on component mount
  useEffect(() => {
    fetchAbsentStudents();
  }, [fetchAbsentStudents]); // Add fetchAbsentStudents as dependency

  // State for selected student IDs
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);

  // Toggle individual student selection
  const toggleStudentSelection = (studentId: number) => {
    setSelectedStudents(prevSelected =>
      prevSelected.includes(studentId)
        ? prevSelected.filter(id => id !== studentId)
        : [...prevSelected, studentId]
    );
  };

  // Select or deselect all students
  const selectAllStudents = () => {
    if (selectedStudents.length === absentStudents.length) {
      setSelectedStudents([]);
    } else {
      // Select only the IDs of the currently listed absent students
      setSelectedStudents(absentStudents.map(student => student.id));
    }
  };

  // Function to call Supabase RPC to update the absent list
  const handleUpdateAbsents = async () => {
    setIsUpdatingAbsents(true);
    setError(null); // Clear previous errors
    
    // The user's schema triggers now handle absent record maintenance automatically on INSERTS to today_attendence.
    // So all we need to do here is re-fetch the table.
    try {
      toast({
        title: "List Update Initiated",
        description: "Refreshing the absent student list...",
      });
      // Pass false to avoid showing the main loading spinner during refresh
      await fetchAbsentStudents(false);

    } catch (err: any) {
      console.error('Error updating absent list via RPC:', err);
      const errorMessage = err.message || 'Failed to execute update function.';
      toast({
        title: "Update Failed",
        description: `Could not update absent list: ${errorMessage}`,
        variant: "destructive",
      });
       setError(`Failed to update list: ${errorMessage}`); // Show error in the UI as well
    } finally {
      setIsUpdatingAbsents(false);
    }
  };

  // Function to send messages via the API route
  const sendMessages = async () => {
    if (messageText.trim() === "") {
      toast({ title: "Message Required", description: "Please enter a message to send.", variant: "destructive" });
      return;
    }
    if (selectedStudents.length === 0) {
      toast({ title: "Recipient Required", description: "Please select at least one student.", variant: "destructive" });
      return;
    }

    setIsSending(true);
    try {
      // Filter the full absentStudents list to get details of only the selected ones
      const selectedStudentDetails = absentStudents.filter(student =>
        selectedStudents.includes(student.id)
      );

      // Call the /api/send-sms endpoint for each selected student
      const results = await Promise.all(
        selectedStudentDetails.map(async (student) => {
          try {
            // Basic validation for phone number before sending
             if (!student.phone || student.phone === 'N/A' || student.phone.length < 10) {
                 console.warn(`Skipping SMS for ${student.name} (${student.studentId}) due to invalid phone number: ${student.phone}`);
                 throw new Error(`Invalid phone number`);
             }

            // In dev, prefer Vite's `/api` proxy; in prod use configured base URL.
            const baseUrl = import.meta.env.DEV ? "" : (import.meta.env.VITE_API_BASE_URL || "");
            const response = await fetch(`${baseUrl}/api/send-sms`, { // Ensure this API route exists
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                mobile_no: student.phone,
                message: messageText,
                roll_no: student.studentId // Send roll_no for logging/tracking if needed
              }),
            });

            // Handle non-OK HTTP responses
            if (!response.ok) {
              let errorBody = 'Unknown API error';
              try {
                 // Try parsing error details from API response
                 const errorData = await response.json();
                 errorBody = errorData.message || errorData.error || JSON.stringify(errorData);
              } catch (parseError){
                 // If parsing fails, use the status text
                 errorBody = response.statusText;
              }
              throw new Error(`API Error ${response.status}: ${errorBody}`);
            }

            // Optional: Check for success flag in API response if provided
            // const responseData = await response.json();
            // if (!responseData.success) {
            //    throw new Error(responseData.message || 'API reported failure');
            // }

            return { success: true, student };
          } catch (error: any) {
            console.error(`SMS sending failed for ${student.name} (${student.studentId}):`, error);
            return { success: false, student, error: error.message || 'Sending failed' };
          }
        })
      );

      // Process results
      const successfulSends = results.filter(r => r.success);
      const failedSends = results.filter(r => !r.success);

      // Create history entry
      const newHistoryEntry: HistoryEntry = {
        id: Date.now(),
        timestamp: new Date(),
        message: messageText,
        recipients: successfulSends.map(r => r.student), // Store only successful recipients for clarity
        successCount: successfulSends.length,
        failureCount: failedSends.length
      };

      setSentHistory(prevHistory => [newHistoryEntry, ...prevHistory]); // Add to history
      setMessageText(""); // Clear message input
      setSelectedStudents([]); // Clear selection after sending

      // Show appropriate toast message
      if (failedSends.length > 0) {
        const failedNames = failedSends.map(f => `${f.student.name} (${f.error})`).join(', ');
        toast({
          title: "Partial Success",
          description: `Sent to ${successfulSends.length}, failed for ${failedSends.length}. Failures: ${failedNames}`,
          variant: "destructive",
          duration: 9000, // Longer duration for detailed error
        });
      } else if (successfulSends.length > 0) {
        toast({
          title: "Messages Sent",
          description: `Successfully sent SMS to ${successfulSends.length} student(s).`,
        });
      } else {
         toast({
            title: "No Messages Sent",
            description: `Could not send messages. Check recipient phone numbers and logs.`,
            variant: "destructive",
        });
      }

    } catch (error: any) {
      console.error('Generic error in sendMessages function:', error);
      toast({
        title: "Sending Error",
        description: "An unexpected error occurred while trying to send messages.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false); // Ensure loading state is turned off
    }
  };

  // --- JSX Structure ---
  return (
    <div className="space-y-8 p-4 md:p-6"> {/* Main container with padding */}

      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Messaging</h1>
        <p className="text-gray-500 dark:text-gray-400">Send notifications to absent students</p>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Column 1: Absent Students List */}
        <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-sm">
          {/* Header for Absent Students Section */}
          <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
            <div className="flex items-center">
              <UserX className="text-red-500 mr-2" size={24} />
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Absent Students Today</h2>
            </div>
            {/* Update Absent List Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleUpdateAbsents}
              disabled={isUpdatingAbsents || isLoading}
              className={`px-4 py-2 bg-indigo-500 text-white text-sm rounded-lg font-medium flex items-center justify-center transition-colors duration-200 ${
                (isUpdatingAbsents || isLoading) ? "opacity-70 cursor-not-allowed bg-indigo-300" : "hover:bg-indigo-600"
              }`}
            >
              {isUpdatingAbsents ? (
                <><Loader2 className="animate-spin mr-2" size={16} /> Updating...</>
              ) : (
                <><RefreshCw className="mr-2" size={16} /> Update List</>
              )}
            </motion.button>
          </div>

          {/* Select All / Deselect All Button */}
          {!isLoading && !error && absentStudents.length > 0 && (
            <div className="text-right mb-4">
              <button
                onClick={selectAllStudents}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                {selectedStudents.length === absentStudents.length ? "Deselect All" : "Select All"}
              </button>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-blue-500 dark:text-blue-400 animate-spin mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Loading absent students...</p>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && ( // Show error only if not loading
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-8 w-8 text-red-500 mb-4" />
              <p className="text-red-500 font-medium mb-2">Error Loading Data</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">{error}</p>
               {/* Optionally add a retry button */}
               {/* <button onClick={() => fetchAbsentStudents()} className="mt-4 px-3 py-1 bg-blue-500 text-white rounded text-sm">Retry</button> */}
            </div>
          )}

          {/* No Data State */}
          {!isLoading && !error && absentStudents.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <UserCheck className="h-8 w-8 text-green-500 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No absent students recorded for today.</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Click "Update List" to check again.</p>
            </div>
          )}

          {/* Student Table */}
          {!isLoading && !error && absentStudents.length > 0 && (
            <div className="overflow-x-auto max-h-96 border border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="w-full min-w-[500px] divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Select</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Student ID</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Branch</th> {/* Changed header to Branch */}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {absentStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student.id)}
                          onChange={() => toggleStudentSelection(student.id)}
                          className="h-4 w-4 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-blue-400 dark:bg-gray-700"
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{student.studentId}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{student.name}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{student.course}</td> {/* Display course/branch */}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div> {/* End Column 1 */}

        {/* Column 2: Message Composer */}
        <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-sm">
          <div className="flex items-center mb-6">
            <MessageCircle className="text-blue-500 dark:text-blue-400 mr-3" size={24} />
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Compose Message</h2>
          </div>

          <div className="space-y-6">
            {/* Message Text Area */}
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Message
              </label>
              <textarea
                id="message"
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:outline-none resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Type your absence notification message here..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
              ></textarea>
            </div>

            {/* Recipients Summary */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Recipients
              </label>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                <div className="flex items-center">
                  <Users className="text-gray-500 dark:text-gray-400 mr-2" size={18} />
                  <span className="text-gray-700 dark:text-gray-200 font-medium">
                    {selectedStudents.length} student(s) selected
                  </span>
                </div>
                {/* Optional: Show names if few selected */}
                {/* {selectedStudents.length > 0 && selectedStudents.length <= 5 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                    {absentStudents.filter(s => selectedStudents.includes(s.id)).map(s => s.name).join(', ')}
                  </p>
                )} */}
              </div>
            </div>

            {/* Send Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={sendMessages}
              disabled={isSending || isLoading || isUpdatingAbsents || absentStudents.length === 0 || selectedStudents.length === 0} // Disable logic
              className={`w-full px-6 py-3 bg-blue-500 text-white rounded-lg font-medium flex items-center justify-center transition-colors duration-200 ${
                (isSending || isLoading || isUpdatingAbsents || absentStudents.length === 0 || selectedStudents.length === 0)
                 ? "opacity-60 cursor-not-allowed bg-blue-400 dark:bg-blue-700"
                 : "hover:bg-blue-600 dark:hover:bg-blue-500"
              }`}
            >
              {isSending ? (
                <><Loader2 className="animate-spin mr-2" size={18} /> Sending...</>
              ) : (
                <><Send className="mr-2" size={18} /> Send Messages</>
              )}
            </motion.button>
          </div>
        </div> {/* End Column 2 */}

      </div> {/* End Main Grid */}

      {/* Message History Section */}
      {sentHistory.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-sm">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Message History</h2>
          <div className="space-y-4 max-h-96 overflow-y-auto"> {/* Scrollable history */}
            {sentHistory.map((entry) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
              >
                <div className="flex flex-wrap justify-between items-center mb-2 gap-2">
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    Message Sent ({entry.successCount} successful, {entry.failureCount} failed)
                  </p>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {entry.timestamp.toLocaleString()}
                  </span>
                </div>
                <p className="text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg mb-2 text-sm">
                  "{entry.message}"
                </p>
                {entry.recipients && entry.recipients.length > 0 && (
                   <p className="text-xs text-gray-500 dark:text-gray-400">
                     Successfully sent to: {entry.recipients.map((s: Student) => s.name).join(", ")}
                   </p>
                )}
                 {entry.failureCount > 0 && (
                   <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                     Failed attempts: {entry.failureCount}
                   </p>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )} {/* End Message History */}

    </div> // End Main container div
  ); // End return statement parenthesis
}; // <<<<----- CORRECT SINGLE CLOSING BRACE for the Messaging component function

export default Messaging; // Export the component