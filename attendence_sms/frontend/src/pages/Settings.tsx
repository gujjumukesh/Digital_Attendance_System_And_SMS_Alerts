
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Save, Bell, Shield, Database, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Settings = () => {
  const [biometricTimeout, setBiometricTimeout] = useState("5");
  const [twilioPhoneNumber, setTwilioPhoneNumber] = useState("");
  const [twilioAccountSid, setTwilioAccountSid] = useState("");
  const [twilioAuthToken, setTwilioAuthToken] = useState("");
  const [notifyAbsentees, setNotifyAbsentees] = useState(true);
  const [saveAttendanceLogs, setSaveAttendanceLogs] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate saving settings
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Settings Saved",
        description: "Your changes have been saved successfully",
      });
    }, 1500);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Settings</h1>
        <p className="text-gray-500">Configure your BioAttend system preferences</p>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-8">
        {/* Biometric Settings */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center mb-6">
            <Fingerprint className="text-blue-500 mr-3" size={24} />
            <h2 className="text-xl font-bold text-gray-800">Biometric Settings</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="biometricTimeout" className="block text-sm font-medium text-gray-700 mb-1">
                Scanner Timeout (minutes)
              </label>
              <input
                id="biometricTimeout"
                type="number"
                min="1"
                max="30"
                className="w-full sm:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={biometricTimeout}
                onChange={(e) => setBiometricTimeout(e.target.value)}
              />
              <p className="mt-1 text-sm text-gray-500">
                Time before the scanner automatically disconnects due to inactivity
              </p>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center mb-6">
            <Bell className="text-amber-500 mr-3" size={24} />
            <h2 className="text-xl font-bold text-gray-800">Notification Settings</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                id="notifyAbsentees"
                type="checkbox"
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                checked={notifyAbsentees}
                onChange={(e) => setNotifyAbsentees(e.target.checked)}
              />
              <label htmlFor="notifyAbsentees" className="ml-2 block text-sm font-medium text-gray-700">
                Automatically send notifications to absent students
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                id="saveAttendanceLogs"
                type="checkbox"
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                checked={saveAttendanceLogs}
                onChange={(e) => setSaveAttendanceLogs(e.target.checked)}
              />
              <label htmlFor="saveAttendanceLogs" className="ml-2 block text-sm font-medium text-gray-700">
                Save detailed attendance logs for reporting
              </label>
            </div>
          </div>
        </div>

        {/* Twilio Integration */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center mb-6">
            <MessageSquare className="text-purple-500 mr-3" size={24} />
            <h2 className="text-xl font-bold text-gray-800">Twilio SMS Integration</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="twilioPhoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Twilio Phone Number
              </label>
              <input
                id="twilioPhoneNumber"
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="+1234567890"
                value={twilioPhoneNumber}
                onChange={(e) => setTwilioPhoneNumber(e.target.value)}
              />
            </div>
            
            <div>
              <label htmlFor="twilioAccountSid" className="block text-sm font-medium text-gray-700 mb-1">
                Twilio Account SID
              </label>
              <input
                id="twilioAccountSid"
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Enter your Twilio Account SID"
                value={twilioAccountSid}
                onChange={(e) => setTwilioAccountSid(e.target.value)}
              />
            </div>
            
            <div>
              <label htmlFor="twilioAuthToken" className="block text-sm font-medium text-gray-700 mb-1">
                Twilio Auth Token
              </label>
              <input
                id="twilioAuthToken"
                type="password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Enter your Twilio Auth Token"
                value={twilioAuthToken}
                onChange={(e) => setTwilioAuthToken(e.target.value)}
              />
            </div>
            
            <p className="text-sm text-gray-500">
              Sign up for a free Twilio account at <a href="https://www.twilio.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">twilio.com</a> to send SMS notifications.
            </p>
          </div>
        </div>

        {/* Save button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={isLoading}
          className={`px-8 py-3 bg-blue-500 text-white rounded-lg font-medium flex items-center ${
            isLoading ? "opacity-70 cursor-not-allowed" : ""
          }`}
        >
          <Save className="mr-2" size={18} />
          {isLoading ? "Saving..." : "Save Settings"}
        </motion.button>
      </form>
    </div>
  );
};

const Fingerprint = ({ className, size }: { className?: string, size?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size || 24}
    height={size || 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M18.9 7a8 8 0 0 1 1.1 5v1a6 6 0 0 0 .8 3" />
    <path d="M8 11a4 4 0 0 1 8 0v1a10 10 0 0 0 2 6" />
    <path d="M12 11h0" />
    <path d="M16 8a4 4 0 0 0-8 0v2a8 8 0 0 0 1.1 4" />
    <path d="M5 8a8 8 0 0 0 2 5.5" />
    <path d="M18.9 7a8 8 0 0 1 1.1 5v1c0 4-1 6-3 8" />
    <path d="M7 15a6 6 0 0 0 3.5 4.4" />
    <path d="M10 7.5V8a4 4 0 0 0 8 0v-1" />
  </svg>
);

export default Settings;
