/**
 * SPIRAL HERO VISUAL - Lightweight CSS-only visual replacement for WebGL
 * Keeps FPS stable on mobile while delivering a cohesive glass/aurora look.
 */

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { motion, useReducedMotion } from "framer-motion";

interface SpiralHeroSVGProps {
  className?: string;
}

export function SpiralHeroSVG({ className }: SpiralHeroSVGProps) {
  const reduceMotion = useReducedMotion();
  const particles = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => ({
        id: i,
        left: 30 + Math.random() * 40,
        top: 28 + Math.random() * 44,
        delay: Math.random() * 2,
        duration: 3 + Math.random() * 2,
      })),
    []
  );

  return (
    <div
      className={cn(
        "relative h-full w-full flex items-center justify-center overflow-hidden",
        className
      )}
    >
      {/* Ambient glow layers */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="absolute w-[420px] h-[420px] rounded-full opacity-30"
          style={{
            background:
              "radial-gradient(circle, hsl(272 82% 62% / 0.45) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
        <div
          className="absolute w-[320px] h-[320px] rounded-full opacity-25"
          style={{
            background:
              "radial-gradient(circle, hsl(292 95% 68% / 0.3) 0%, transparent 65%)",
            filter: "blur(40px)",
            animation: reduceMotion ? "none" : "ambient-float 24s ease-in-out infinite",
          }}
        />
        <div
          className="absolute w-[280px] h-[280px] rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(circle, hsl(35 90% 60% / 0.25) 0%, transparent 70%)",
            filter: "blur(50px)",
          }}
        />
      </div>

      {/* Central Orb - glassmorphism */}
      <motion.div
        className="absolute w-32 h-32 sm:w-40 sm:h-40 md:w-52 md:h-52 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, hsl(280 85% 82% / 0.8), hsl(270 55% 48% / 0.6) 50%, hsl(265 45% 25% / 0.5))",
          boxShadow: `
            inset 0 0 60px hsl(280 85% 65% / 0.3),
            0 0 90px hsl(280 85% 65% / 0.45),
            0 0 140px hsl(280 85% 65% / 0.25)
          `,
          backdropFilter: "blur(10px)",
        }}
        animate={{
          scale: reduceMotion ? 1 : [1, 1.05, 1],
          opacity: reduceMotion ? 0.95 : [0.9, 1, 0.9],
        }}
        transition={{
          duration: 4,
          repeat: reduceMotion ? 0 : Infinity,
          ease: "easeInOut",
        }}
      >
        <motion.div
          className="absolute inset-4 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 40% 40%, hsl(280 90% 80% / 0.6), transparent 70%)",
          }}
          animate={{
            scale: reduceMotion ? 1 : [0.92, 1.08, 0.92],
            opacity: reduceMotion ? 0.7 : [0.6, 0.9, 0.6],
          }}
          transition={{
            duration: 2,
            repeat: reduceMotion ? 0 : Infinity,
            ease: "easeInOut",
          }}
        />
      </motion.div>

      {/* Halo rings */}
      <motion.div
        className="absolute w-[250px] h-[250px] sm:w-[310px] sm:h-[310px] md:w-[360px] md:h-[360px] rounded-full border-2"
        style={{
          borderColor: "hsl(280 70% 70% / 0.4)",
          boxShadow: "0 0 20px hsl(280 85% 65% / 0.3)",
        }}
        animate={{
          rotate: reduceMotion ? 0 : [0, 360],
          scale: reduceMotion ? 1 : [1, 1.03, 1],
        }}
        transition={{
          rotate: { duration: 22, repeat: reduceMotion ? 0 : Infinity, ease: "linear" },
          scale: { duration: 3, repeat: reduceMotion ? 0 : Infinity, ease: "easeInOut" },
        }}
      />
      <motion.div
        className="absolute w-[200px] h-[200px] sm:w-[240px] sm:h-[240px] md:w-[280px] md:h-[280px] rounded-full border"
        style={{
          borderColor: "hsl(32 92% 60% / 0.25)",
          boxShadow: "0 0 14px hsl(32 92% 60% / 0.2)",
        }}
        animate={{
          rotate: reduceMotion ? 0 : [360, 0],
        }}
        transition={{
          duration: 18,
          repeat: reduceMotion ? 0 : Infinity,
          ease: "linear",
        }}
      />

      {/* Floating particles */}
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute w-1.5 h-1.5 rounded-full bg-primary/60"
          style={{
            left: `${particle.left}%`,
            top: `${particle.top}%`,
          }}
          animate={{
            y: reduceMotion ? 0 : [0, -20, 0],
            x: reduceMotion ? 0 : [0, 8, 0],
            opacity: [0.3, 0.8, 0.3],
            scale: reduceMotion ? 1 : [0.85, 1.2, 0.85],
          }}
          transition={{
            duration: particle.duration,
            repeat: reduceMotion ? 0 : Infinity,
            delay: particle.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

export default SpiralHeroSVG;
