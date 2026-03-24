import { secureMathRandom } from '@/lib/secureMathRandom';
/**
 * FilmGrainOverlay - Phase 4 Cinematic Polish
 * 
 * Adds a subtle film grain texture overlay to reduce the "clean vector" 
 * look of standard WebGL and give the scene a cinematic quality.
 */

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface FilmGrainOverlayProps {
  intensity?: number; // 0-1, default 0.15
  speed?: number; // Animation speed multiplier
  className?: string;
  blend?: "overlay" | "soft-light" | "multiply" | "screen";
}

export function FilmGrainOverlay({
  intensity = 0.15,
  speed = 1,
  className,
  blend = "overlay",
}: FilmGrainOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Size canvas to viewport
    const resize = () => {
      canvas.width = window.innerWidth / 2; // Lower res for performance
      canvas.height = window.innerHeight / 2;
    };
    resize();
    window.addEventListener("resize", resize);

    // Pre-generate noise frames for performance
    const frameCount = 8;
    const frames: ImageData[] = [];
    
    for (let f = 0; f < frameCount; f++) {
      const imageData = ctx.createImageData(canvas.width, canvas.height);
      const data = imageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        const noise = secureMathRandom() * 255;
        data[i] = noise;     // R
        data[i + 1] = noise; // G
        data[i + 2] = noise; // B
        data[i + 3] = 255;   // A (full opacity, controlled by CSS)
      }
      
      frames.push(imageData);
    }

    let frameIndex = 0;
    let lastTime = 0;
    const frameInterval = 1000 / (12 * speed); // 12 FPS base, multiplied by speed

    const animate = (time: number) => {
      if (time - lastTime >= frameInterval) {
        frameIndex = (frameIndex + 1) % frameCount;
        ctx.putImageData(frames[frameIndex], 0, 0);
        lastTime = time;
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [speed]);

  const blendMode = {
    overlay: "mix-blend-overlay",
    "soft-light": "mix-blend-soft-light",
    multiply: "mix-blend-multiply",
    screen: "mix-blend-screen",
  }[blend];

  return (
    <canvas
      ref={canvasRef}
      className={cn(
        "pointer-events-none fixed inset-0 z-50",
        blendMode,
        className
      )}
      style={{
        opacity: intensity,
        width: "100%",
        height: "100%",
        imageRendering: "pixelated",
      }}
      aria-hidden="true"
    />
  );
}

/**
 * CSS-only Film Grain (lighter weight alternative)
 * Uses SVG filter for a static grain effect
 */
export function FilmGrainCSS({
  intensity = 0.1,
  className,
}: {
  intensity?: number;
  className?: string;
}) {
  return (
    <>
      {/* SVG Filter Definition */}
      <svg className="absolute w-0 h-0" aria-hidden="true">
        <defs>
          <filter id="film-grain">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.8"
              numOctaves="4"
              stitchTiles="stitch"
              result="noise"
            />
            <feColorMatrix
              type="saturate"
              values="0"
              in="noise"
              result="mono"
            />
            <feBlend
              mode="overlay"
              in="SourceGraphic"
              in2="mono"
            />
          </filter>
        </defs>
      </svg>

      {/* Grain Overlay */}
      <div
        className={cn(
          "pointer-events-none fixed inset-0 z-50 mix-blend-overlay",
          className
        )}
        style={{
          opacity: intensity,
          background: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
        aria-hidden="true"
      />
    </>
  );
}
