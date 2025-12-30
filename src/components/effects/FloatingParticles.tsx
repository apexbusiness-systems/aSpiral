import { motion } from "framer-motion";
import { useMemo } from "react";

interface FloatingParticlesProps {
  /** Number of primary particles (default: 8) */
  primaryCount?: number;
  /** Number of secondary particles (default: 5) */
  secondaryCount?: number;
  /** Container className for positioning */
  className?: string;
}

/**
 * Floating particles effect component - unified visual element
 * used across Landing and main app for cohesive aesthetic
 */
export function FloatingParticles({
  primaryCount = 8,
  secondaryCount = 5,
  className = "",
}: FloatingParticlesProps) {
  // Memoize particle configs so they don't regenerate on every render
  const primaryParticles = useMemo(() => 
    Array.from({ length: primaryCount }, (_, i) => ({
      id: i,
      width: Math.random() * 6 + 3,
      height: Math.random() * 6 + 3,
      left: Math.random() * 100,
      top: Math.random() * 100,
      xOffset: Math.random() * 20 - 10,
      duration: 3 + Math.random() * 2,
      delay: Math.random() * 2,
    })),
    [primaryCount]
  );

  const secondaryParticles = useMemo(() => 
    Array.from({ length: secondaryCount }, (_, i) => ({
      id: i,
      width: Math.random() * 4 + 2,
      height: Math.random() * 4 + 2,
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: 4 + Math.random() * 2,
      delay: Math.random() * 3,
    })),
    [secondaryCount]
  );

  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}>
      {/* Primary particles - primary color with glow */}
      {primaryParticles.map((particle) => (
        <motion.div
          key={`primary-${particle.id}`}
          className="absolute rounded-full bg-primary/40"
          style={{
            width: particle.width,
            height: particle.height,
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            boxShadow: `0 0 ${particle.width * 2}px hsl(var(--primary) / 0.5)`,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, particle.xOffset, 0],
            opacity: [0.3, 0.8, 0.3],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Secondary particles - secondary/accent color */}
      {secondaryParticles.map((particle) => (
        <motion.div
          key={`secondary-${particle.id}`}
          className="absolute rounded-full bg-secondary/50"
          style={{
            width: particle.width,
            height: particle.height,
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            boxShadow: `0 0 ${particle.width * 2}px hsl(var(--secondary) / 0.4)`,
          }}
          animate={{
            y: [0, -25, 0],
            opacity: [0.2, 0.6, 0.2],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
