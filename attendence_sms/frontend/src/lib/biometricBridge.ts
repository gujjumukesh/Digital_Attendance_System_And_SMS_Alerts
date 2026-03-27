import { supabase } from './supabase';
import { listenToFingerResponse, deactivateFingerprint } from './firebase';

/**
 * BiometricBridge - A service that connects Firebase fingerprint data with Supabase database
 * This bridge handles:
 * 1. Matching fingerprint IDs from Firebase with student records in Supabase
 * 2. Marking attendance in the today_attendence table
 * 3. Managing the fingerprint enrollment process
 */

// Function to mark a student as present based on fingerprint ID
export const markAttendanceByFingerprint = async (fingerprintId: string, confidence: number = 1.0): Promise<boolean> => {
  try {
    // Step 1: Find the student with this biometric_id
    const { data: student, error: studentError } = await supabase
      .from('total_students')
      .select('roll_no, name, year, branch')
      .eq('biometric_id', fingerprintId)
      .single();

    if (studentError || !student) {
      console.error('No student found with this fingerprint ID:', fingerprintId);
      return false;
    }

    // Get today's date in ISO format (YYYY-MM-DD)
    const today = new Date().toISOString().split('T')[0];

    // Step 2: Check if attendance already marked for today
    const { data: existingAttendance, error: attendanceCheckError } = await supabase
      .from('today_attendence')
      .select('roll_no')
      .eq('roll_no', student.roll_no)
      .eq('date', today)
      .single();

    // If attendance already exists, update it
    if (existingAttendance) {
      const { error: updateError } = await supabase
        .from('today_attendence')
        .update({
          status: 'Present',
          verified_by_biometric: true,
          fingerprint_confidence: confidence,
          verification_timestamp: new Date().toISOString()
        })
        .eq('roll_no', student.roll_no)
        .eq('date', today);

      if (updateError) {
        console.error('Error updating attendance:', updateError);
        return false;
      }
    } else {
      // Step 3: Insert new attendance record
      const { error: insertError } = await supabase
        .from('today_attendence')
        .insert([
          {
            roll_no: student.roll_no,
            name: student.name,
            year: student.year,
            branch: student.branch,
            status: 'Present',
            date: today,
            verified_by_biometric: true,
            fingerprint_confidence: confidence,
            verification_timestamp: new Date().toISOString()
          }
        ]);

      if (insertError) {
        console.error('Error marking attendance:', insertError);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error in markAttendanceByFingerprint:', error);
    return false;
  }
};

// Function to start listening for fingerprint scans and mark attendance
export const startAttendanceListener = (): (() => void) => {
  // Start listening to fingerprint responses from Firebase
  const unsubscribe = listenToFingerResponse(async (response) => {
    if (!response) return;
    
    // Extract fingerprint ID and confidence from the response
    const fingerprintId = response.fingerID?.toString();
    const confidence = response.confidence || 1.0;
    
    if (!fingerprintId) {
      console.error('Invalid fingerprint response - missing fingerID:', response);
      return;
    }

    console.log('Fingerprint detected:', { fingerprintId, confidence });
    
    // Mark attendance for this fingerprint ID with confidence
    const success = await markAttendanceByFingerprint(
      fingerprintId,
      confidence
    );
    
    if (success) {
      console.log(`Attendance marked for fingerprint ID: ${response.fingerID}`);
    } else {
      console.error(`Failed to mark attendance for fingerprint ID: ${response.fingerID}`);
    }
  });

  return () => {
    // Clean up the listener and deactivate fingerprint scanner
    unsubscribe();
    deactivateFingerprint().catch(error => {
      console.error('Error deactivating fingerprint scanner:', error);
    });
  };
};

// Function to check if a student has a registered fingerprint
export const hasRegisteredFingerprint = async (rollNo: number): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('total_students')
      .select('biometric_id')
      .eq('roll_no', rollNo)
      .single();

    if (error) throw error;
    
    return data && data.biometric_id !== null;
  } catch (error) {
    console.error('Error checking fingerprint registration:', error);
    return false;
  }
};

// Function to update a student's biometric ID
export const updateStudentBiometricId = async (rollNo: number, biometricId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('total_students')
      .update({ biometric_id: biometricId })
      .eq('roll_no', rollNo);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating student biometric ID:', error);
    return false;
  }
};