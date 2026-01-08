import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

function AuroraGlow() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(({ clock }) => {
    if (meshRef.current) {
      const t = clock.getElapsedTime();
      meshRef.current.rotation.z = t * 0.1;
      (meshRef.current.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[3, 64]} />
      <shaderMaterial
        transparent
        uniforms={{
          uTime: { value: 0 },
          uColor1: { value: new THREE.Color('#6366f1') },
          uColor2: { value: new THREE.Color('#8b5cf6') },
          uColor3: { value: new THREE.Color('#06b6d4') },
        }}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float uTime;
          uniform vec3 uColor1;
          uniform vec3 uColor2;
          uniform vec3 uColor3;
          varying vec2 vUv;
          
          void main() {
            vec2 center = vUv - 0.5;
            float dist = length(center);
            
            float wave1 = sin(dist * 10.0 - uTime * 0.5) * 0.5 + 0.5;
            float wave2 = sin(dist * 8.0 - uTime * 0.7 + 1.0) * 0.5 + 0.5;
            float wave3 = sin(dist * 12.0 - uTime * 0.3 + 2.0) * 0.5 + 0.5;
            
            vec3 color = mix(uColor1, uColor2, wave1);
            color = mix(color, uColor3, wave2 * 0.5);
            
            float alpha = (1.0 - dist * 0.7) * (wave1 * 0.3 + wave2 * 0.3 + wave3 * 0.2 + 0.2);
            alpha *= smoothstep(1.0, 0.3, dist);
            
            gl_FragColor = vec4(color, alpha * 0.6);
          }
        `}
      />
    </mesh>
  );
}

function Platform() {
  return (
    <Float speed={1} rotationIntensity={0.1} floatIntensity={0.2}>
      <mesh position={[0, -0.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.8, 2, 64]} />
        <meshBasicMaterial color="#1e1b4b" transparent opacity={0.3} />
      </mesh>
    </Float>
  );
}

export default function AuroraPlatform() {
  return (
    <div className="w-full h-full">
      <Canvas camera={{ position: [0, 2, 5], fov: 50 }}>
        <ambientLight intensity={0.2} />
        <AuroraGlow />
        <Platform />
      </Canvas>
    </div>
  );
}
