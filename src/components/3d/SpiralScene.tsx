import { Suspense, useMemo, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars, Sparkles } from "@react-three/drei";
import { detectDeviceCapabilities } from "@/lib/performance/optimizer";
import { SpiralEntities } from "./SpiralEntities";
import { FrictionEffects } from "./FrictionEffects";
import * as THREE from "three";

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
    if (capabilities.deviceType === 'mobile' || capabilities.gpuTier === 1) return 300;
    return 1000;
  }, []);

  return (
    <>
      {/* Audit Fix: Environmental Atmosphere */}
      <ambientLight intensity={0.3} />
      <fogExp2 attach="fog" args={['#0f0c29', 0.02]} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color={themeColors.secondary} />
      {/* Lighting - Dramatic "Aurora" Setup */}
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1.5} color="#ff00cc" distance={50} />
      <pointLight position={[-10, -5, -10]} intensity={1.5} color="#00dbde" distance={50} />
      <spotLight position={[0, 10, 0]} angle={0.5} penumbra={1} intensity={1} color="#ffffff" />

      {/* Environment - adaptive count for performance */}
      <Stars
        radius={50}
        depth={50}
        count={starCount}
        factor={4}
        saturation={1}
        fade
        speed={0.5}
      />


      {/* Audit Fix: Additional floating particles for "Space Dust" */}
      <Sparkles count={100} scale={10} size={2} speed={0.4} opacity={0.5} color="#cfcfff" />

      {/* Ground plane hint - subtle grid */}
      <gridHelper args={[20, 20, 0x444444, 0x222222]} position={[0, -2, 0]} rotation={[0, 0, 0]}>
        <meshBasicMaterial transparent opacity={0.1} />
      </gridHelper>
      
      {/* Entities */}
      <SpiralEntities />
      <FrictionEffects />

      {/* Camera controls */}
      <OrbitControls
        enablePan={false}
        minDistance={3}
        maxDistance={15}
        autoRotate
        autoRotateSpeed={0.5} // Slightly faster for more cinematic feel
        maxPolarAngle={Math.PI / 1.5} // Don't let user go under the floor
      />
    </>
  );
}

export function SpiralScene() {
  return (
    <div className="h-full w-full gpu-accelerated">
      <Canvas
        camera={{ position: [6, 4, 6], fov: 50 }} // Slightly tighter FOV for cinematic feel
        style={{ background: "transparent" }}
        dpr={[1, 1.5]}
        performance={{ min: 0.5 }}
        frameloop="demand"
        gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
      >
        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>
      </Canvas>
    </div>
  );
}
