"use client";
import { motion } from "framer-motion";

export default function LiquidBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 bg-black">
      {/* WhatsApp Dark Color: #0b141a, Primary Green: #25D366, Teal: #128C7E, Dark Teal: #075E54 */}
      <motion.div
        animate={{
          x: ["0%", "30%", "0%"],
          y: ["0%", "20%", "0%"],
          scale: [1, 1.2, 1],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="absolute top-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-[#128C7E] rounded-full mix-blend-screen filter blur-[120px] opacity-[0.25]"
      />
      <motion.div
        animate={{
          x: ["0%", "-40%", "0%"],
          y: ["0%", "30%", "0%"],
          scale: [1, 1.3, 1],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-[#25D366] rounded-full mix-blend-screen filter blur-[140px] opacity-[0.2]"
      />
      <motion.div
        animate={{
          x: ["0%", "20%", "0%"],
          y: ["0%", "-30%", "0%"],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute top-[20%] left-[20%] w-[40vw] h-[40vw] bg-[#075E54] rounded-full mix-blend-screen filter blur-[100px] opacity-[0.3]"
      />
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
    </div>
  );
}
