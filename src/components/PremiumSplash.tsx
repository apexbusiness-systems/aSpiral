import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface PremiumSplashProps {
  isVisible: boolean;
}

export default function PremiumSplash({ isVisible }: PremiumSplashProps) {
  // Use local state to handle the exit animation delay
  const [shouldRender, setShouldRender] = useState(true);

  useEffect(() => {
    if (!isVisible) {
      const timer = setTimeout(() => setShouldRender(false), 1000); // Wait for fade out
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  if (!shouldRender) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#4a1a6b] overflow-hidden"
        >
          {/* Aurora Background Effect */}
          <div className="absolute inset-0 z-0">
             <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] animate-spin-slow bg-[conic-gradient(from_0deg,transparent_0deg,#ff00cc_90deg,transparent_180deg,#00dbde_270deg,transparent_360deg)] opacity-20 blur-[100px]" />
             <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#2d1b4e]/80 to-[#0f0c29]" />
          </div>

          <div className="relative z-10 flex flex-col items-center gap-6 p-6 text-center">
            {/* Logo Mark - Spinning/Pulsing */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="relative w-32 h-32 md:w-40 md:h-40"
            >
               {/* Glowing Orb Behind */}
               <div className="absolute inset-0 rounded-full bg-purple-500 blur-2xl opacity-40 animate-pulse" />
               <img
                 src="/src/assets/aspiral-logo.png"
                 alt="aSpiral Logo"
                 className="w-full h-full object-contain relative z-10 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                 onError={(e) => {
                    // Fallback if image fails
                    e.currentTarget.style.display = 'none';
                 }}
               />
               {/* Fallback Text if Image Missing */}
               <div className="absolute inset-0 flex items-center justify-center text-6xl text-white font-cinzel opacity-0">A</div>
            </motion.div>

            {/* Loading Indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-8 flex gap-2"
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                  className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee]"
                />
              ))}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
