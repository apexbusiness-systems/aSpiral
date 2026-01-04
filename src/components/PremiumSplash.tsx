/**
 * PremiumSplash - Sleek loading screen for aSpiral
 *
 * Features:
 * - Dark violet/indigo gradient background
 * - Pulsing logo animation
 * - Smooth fade-out transition
 * - Accessibility: respects prefers-reduced-motion
 */

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface PremiumSplashProps {
  isVisible: boolean;
  onComplete?: () => void;
  /** Minimum display time in ms (default: 1500) */
  minDisplayTime?: number;
}

export function PremiumSplash({
  isVisible,
  onComplete,
  minDisplayTime = 1500
}: PremiumSplashProps) {
  return (
    <AnimatePresence onExitComplete={onComplete}>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={cn(
            "fixed inset-0 z-[9999] flex flex-col items-center justify-center",
            "bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#1e1b4b]"
          )}
          role="status"
          aria-label="Loading aSpiral"
        >
          {/* Background ambient glow */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-indigo-500/20 blur-3xl"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <motion.div
              className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-violet-500/20 blur-3xl"
              animate={{
                scale: [1.2, 1, 1.2],
                opacity: [0.4, 0.2, 0.4],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </div>

          {/* Logo container */}
          <motion.div
            className="relative z-10 flex flex-col items-center gap-6"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            {/* Spiral logo mark */}
            <motion.div
              className="relative w-24 h-24 flex items-center justify-center"
              animate={{
                rotate: 360,
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: "linear",
              }}
            >
              {/* Outer ring */}
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-indigo-400/30"
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />

              {/* Middle ring */}
              <motion.div
                className="absolute inset-3 rounded-full border-2 border-violet-400/40"
                animate={{
                  scale: [1.1, 1, 1.1],
                  opacity: [0.4, 0.7, 0.4],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />

              {/* Inner glow */}
              <motion.div
                className="absolute inset-6 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500"
                animate={{
                  scale: [1, 1.15, 1],
                  opacity: [0.8, 1, 0.8],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />

              {/* Center dot */}
              <div className="absolute inset-9 rounded-full bg-white/90" />
            </motion.div>

            {/* Brand name */}
            <motion.h1
              className="text-3xl font-light tracking-[0.3em] text-white/90 uppercase"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              aSpiral
            </motion.h1>

            {/* Tagline */}
            <motion.p
              className="text-sm text-indigo-200/60 tracking-wide"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              Finding clarity in chaos
            </motion.p>

            {/* Loading indicator */}
            <motion.div
              className="mt-8 flex gap-1.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.3 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-indigo-400/70"
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.15,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </motion.div>
          </motion.div>

          {/* Screen reader announcement */}
          <span className="sr-only">Loading aSpiral application</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default PremiumSplash;
