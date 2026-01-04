import { Suspense, useMemo, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { detectDeviceCapabilities } from "@/lib/performance/optimizer";
import { SpiralEntities } from "./SpiralEntities";
import { FrictionEffects } from "./FrictionEffects";

// ============================================================================
// CSS Variable Color Extraction for 3D Theme Unification
// Reads --primary, --secondary, --accent from CSS and converts to hex for Three.js
// ============================================================================
interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function parseHSLVariable(value: string): string {
  // Handle HSL format: "250 84% 54%" or "250, 84%, 54%"
  const match = value.match(/(\d+(?:\.\d+)?)\s*,?\s*(\d+(?:\.\d+)?)%?\s*,?\s*(\d+(?:\.\d+)?)%?/);
  if (match) {
    return hslToHex(parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3]));
  }
  // If already hex, return as-is
  if (value.startsWith('#')) return value;
  // Fallback
  return '#6366f1';
}

function getThemeColors(): ThemeColors {
  const style = getComputedStyle(document.documentElement);
  return {
    primary: parseHSLVariable(style.getPropertyValue('--primary').trim() || '263 70% 50%'),
    secondary: parseHSLVariable(style.getPropertyValue('--secondary').trim() || '280 85% 65%'),
    accent: parseHSLVariable(style.getPropertyValue('--accent').trim() || '173 80% 40%'),
    background: parseHSLVariable(style.getPropertyValue('--background').trim() || '240 10% 10%'),
  };
}

function useThemeColors(): ThemeColors {
  const [colors, setColors] = useState<ThemeColors>(() => getThemeColors());

  useEffect(() => {
    // Re-read colors when theme might change
    const updateColors = () => setColors(getThemeColors());

    // Listen for theme changes via media query
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    darkModeQuery.addEventListener('change', updateColors);

    // Also update on visibility change (in case theme changed while tab was hidden)
    document.addEventListener('visibilitychange', updateColors);

    return () => {
      darkModeQuery.removeEventListener('change', updateColors);
      document.removeEventListener('visibilitychange', updateColors);
    };
  }, []);

  return colors;
}

function SceneContent() {
  // Get theme colors from CSS variables
  const themeColors = useThemeColors();
  // Adaptive star count based on device capabilities
  const starCount = useMemo(() => {
    const capabilities = detectDeviceCapabilities();

    // Low-end devices: minimal stars
    if (capabilities.deviceType === 'mobile' || capabilities.gpuTier === 1) {
      return 300;
    }

    // Mid-range: moderate stars
    if (capabilities.deviceType === 'tablet' || capabilities.gpuTier === 2) {
      return 500;
    }

    // High-end: full stars
    return 800;
  }, []);

  return (
    <>
      {/* Lighting - uses theme-aware colors */}
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color={themeColors.secondary} />

      {/* Environment - adaptive count for performance */}
      <Stars
        radius={80}
        depth={40}
        count={starCount}
        factor={3}
        saturation={0}
        fade
        speed={0.2}
      />

      {/* Spiral center indicator - uses primary theme color */}
      <mesh position={[0, 0, 0]}>
        <torusGeometry args={[0.5, 0.02, 8, 48]} />
        <meshBasicMaterial
          color={themeColors.primary}
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* Ground plane hint - uses background theme color */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <ringGeometry args={[0.5, 5, 32]} />
        <meshBasicMaterial
          color={themeColors.background}
          transparent
          opacity={0.2}
          side={2}
        />
      </mesh>
      
      {/* Entities */}
      <SpiralEntities />
      
      {/* Friction & Breakthrough Effects */}
      <FrictionEffects />
      
      {/* Camera controls */}
      <OrbitControls
        enablePan={false}
        minDistance={3}
        maxDistance={15}
        autoRotate
        autoRotateSpeed={0.3}
      />
    </>
  );
}

export function SpiralScene() {
  return (
    <div className="h-full w-full gpu-accelerated">
      <Canvas
        camera={{ position: [5, 3, 5], fov: 60 }}
        style={{ background: "transparent" }}
        dpr={[1, 1.5]} // Limit pixel ratio for performance
        performance={{ min: 0.5 }} // Allow quality reduction
        frameloop="demand" // Only render when needed
      >
        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>
      </Canvas>
    </div>
  );
}
