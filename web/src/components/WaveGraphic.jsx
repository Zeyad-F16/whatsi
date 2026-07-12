"use client";
import { motion } from "framer-motion";

export default function WaveGraphic() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden flex items-center justify-center">
      
      {/* Background Volumetric Glow */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2 }}
        className="absolute w-[80vw] h-[60vh] bg-gradient-to-tr from-[#6BE17E]/40 via-[#22C55E]/10 to-transparent blur-[120px] rounded-full"
      />

      {/* Sweeping 3D Floating Ribbons */}
      <svg 
        viewBox="0 0 1440 800" 
        className="absolute inset-0 w-full h-full filter drop-shadow-[0_40px_30px_rgba(0,0,0,0.7)]"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="ribbonFront" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#A7F3D0" />
            <stop offset="30%" stopColor="#4ADE80" />
            <stop offset="70%" stopColor="#166534" />
            <stop offset="100%" stopColor="#064E3B" />
          </linearGradient>
          <linearGradient id="ribbonBack" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#064E3B" />
            <stop offset="50%" stopColor="#22C55E" />
            <stop offset="100%" stopColor="#14532D" />
          </linearGradient>
        </defs>

        {/* Back / Secondary Ribbon */}
        <motion.path 
          d="M -100 500 C 400 700 800 300 1500 480 L 1500 530 C 800 350 400 750 -100 550 Z" 
          fill="url(#ribbonBack)"
          animate={{
            d: [
              "M -100 500 C 400 700 800 300 1500 480 L 1500 530 C 800 350 400 750 -100 550 Z",
              "M -100 520 C 400 680 800 320 1500 500 L 1500 550 C 800 370 400 730 -100 570 Z",
              "M -100 500 C 400 700 800 300 1500 480 L 1500 530 C 800 350 400 750 -100 550 Z",
            ]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Front / Primary Ribbon */}
        <motion.path 
          d="M -100 400 C 500 600 900 200 1500 350 L 1500 430 C 900 280 500 680 -100 480 Z" 
          fill="url(#ribbonFront)"
          animate={{
            d: [
              "M -100 400 C 500 600 900 200 1500 350 L 1500 430 C 900 280 500 680 -100 480 Z",
              "M -100 420 C 500 580 900 220 1500 370 L 1500 450 C 900 300 500 660 -100 500 Z",
              "M -100 400 C 500 600 900 200 1500 350 L 1500 430 C 900 280 500 680 -100 480 Z",
            ]
          }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
      </svg>
    </div>
  );
}
