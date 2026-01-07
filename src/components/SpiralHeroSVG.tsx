/**
 * SPIRAL HERO SVG - Lightweight CSS-only visual replacement for WebGL
 * Eliminates Three.js overhead (~500KB) on mobile
 * Uses pure CSS animations for 60fps performance
 */

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface SpiralHeroSVGProps {
  className?: string;
}

export function SpiralHeroSVG({ className }: SpiralHeroSVGProps) {
  // Generate spiral path once
  const spiralPath = useMemo(() => {
    const points: string[] = [];
    const turns = 5;
    const maxRadius = 120;
    const centerX = 150;
    const centerY = 150;

    for (let i = 0; i <= 360 * turns; i += 5) {
      const angle = (i * Math.PI) / 180;
      const radius = (i / (360 * turns)) * maxRadius;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      points.push(`${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`);
    }
    return points.join(" ");
  }, []);

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
          className="absolute w-[400px] h-[400px] rounded-full opacity-30 animate-pulse"
          style={{
            background:
              "radial-gradient(circle, hsl(280 85% 65% / 0.4) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
        <div
          className="absolute w-[300px] h-[300px] rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(circle, hsl(50 95% 55% / 0.3) 0%, transparent 60%)",
            filter: "blur(40px)",
            animation: "ambient-float 25s ease-in-out infinite",
          }}
        />
      </div>

      {/* Central Orb - CSS glass effect */}
      <motion.div
        className="absolute w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, hsl(280 85% 75% / 0.8), hsl(280 60% 50% / 0.6) 50%, hsl(280 40% 30% / 0.4))",
          boxShadow: `
            inset 0 0 60px hsl(280 85% 65% / 0.3),
            0 0 80px hsl(280 85% 65% / 0.4),
            0 0 120px hsl(280 85% 65% / 0.2)
          `,
          backdropFilter: "blur(10px)",
        }}
        animate={{
          scale: [1, 1.05, 1],
          opacity: [0.9, 1, 0.9],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* Inner core pulse */}
        <motion.div
          className="absolute inset-4 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 40% 40%, hsl(280 90% 80% / 0.6), transparent 70%)",
          }}
          animate={{
            scale: [0.9, 1.1, 0.9],
            opacity: [0.6, 0.9, 0.6],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </motion.div>

      {/* Rotating SVG Spiral */}
      <svg
        viewBox="0 0 300 300"
        className="absolute w-[280px] h-[280px] sm:w-[350px] sm:h-[350px] md:w-[400px] md:h-[400px]"
        style={{
          animation: "spiral-rotate 30s linear infinite",
        }}
      >
        <defs>
          <linearGradient id="spiralGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(280, 85%, 65%)" stopOpacity="0.8" />
            <stop offset="50%" stopColor="hsl(50, 95%, 55%)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="hsl(280, 85%, 65%)" stopOpacity="0.4" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path
          d={spiralPath}
          fill="none"
          stroke="url(#spiralGradient)"
          strokeWidth="2"
          strokeLinecap="round"
          filter="url(#glow)"
          opacity="0.7"
        />
      </svg>

      {/* Halo Ring - pure CSS */}
      <motion.div
        className="absolute w-[250px] h-[250px] sm:w-[300px] sm:h-[300px] md:w-[350px] md:h-[350px] rounded-full border-2"
        style={{
          borderColor: "hsl(280 70% 70% / 0.4)",
          boxShadow: "0 0 20px hsl(280 85% 65% / 0.3)",
        }}
        animate={{
          rotate: [0, 360],
          scale: [1, 1.02, 1],
        }}
        transition={{
          rotate: { duration: 20, repeat: Infinity, ease: "linear" },
          scale: { duration: 3, repeat: Infinity, ease: "easeInOut" },
        }}
      />

      {/* Floating particles - CSS only */}
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full bg-primary/60"
          style={{
            left: `${30 + Math.random() * 40}%`,
            top: `${30 + Math.random() * 40}%`,
          }}
          animate={{
            y: [0, -20 - Math.random() * 20, 0],
            x: [0, Math.random() * 15 - 7.5, 0],
            opacity: [0.3, 0.8, 0.3],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

export default SpiralHeroSVG;
