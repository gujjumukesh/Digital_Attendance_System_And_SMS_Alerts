
import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex flex-col justify-center items-center px-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-center max-w-3xl mx-auto mb-12"
      >
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[#1d1d1f] mb-4">
          BioAttend
        </h1>
        <p className="text-lg sm:text-xl text-gray-500 mb-8">
          Streamlined biometric attendance system for educational institutions
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/login")}
            className="px-7 py-3 rounded-full bg-black text-white text-base font-medium tracking-wide transition-all hover:shadow-lg"
          >
            Admin Login
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/login")}
            className="px-7 py-3 rounded-full bg-blue-500 text-white text-base font-medium tracking-wide transition-all hover:shadow-lg"
          >
            Student Login
          </motion.button>
        </div>
      </motion.div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full"
      >
        {[
          {
            title: "Biometric Verification",
            description: "Securely identify students through fingerprint recognition"
          },
          {
            title: "Automated Notifications",
            description: "Send instant alerts to absent students via SMS"
          },
          {
            title: "Attendance Analytics",
            description: "Generate detailed reports and attendance percentages"
          }
        ].map((feature, i) => (
          <motion.div
            key={i}
            variants={item}
            className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
            <p className="text-gray-500 text-sm">{feature.description}</p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default Index;
