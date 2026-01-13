import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const auroraVertexShader = `
varying vec2 vUv;
varying float vElevation;

void main() {
  vUv = uv;
  vec4 modelPosition = modelMatrix * vec4(position, 1.0);
  vec4 viewPosition = viewMatrix * modelPosition;
  vec4 projectedPosition = projectionMatrix * viewPosition;
  gl_Position = projectedPosition;
}
`;

const auroraFragmentShader = `
uniform float uTime;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform vec3 uColor4;

varying vec2 vUv;

// Simplex 2D noise
vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
           -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
  + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main() {
    // Flowing noise
    float noise1 = snoise(vUv * 3.0 + uTime * 0.2);
    float noise2 = snoise(vUv * 6.0 - uTime * 0.3);
    
    // Mix colors based on noise
    vec3 mixedColor = mix(uColor1, uColor2, noise1 * 0.5 + 0.5);
    mixedColor = mix(mixedColor, uColor3, noise2 * 0.5 + 0.5);
    
    // Add glowing streaks
    float strength = snoise(vec2(vUv.x * 10.0, vUv.y * 2.0 + uTime * 0.5));
    strength = smoothstep(0.4, 0.8, strength);
    
    // Circular fade for platform
    float dist = distance(vUv, vec2(0.5));
    float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
    
    gl_FragColor = vec4(mixedColor + strength * 0.5, alpha * 0.6);
}
`;

export const AuroraPlatform: React.FC = () => {
    const materialRef = useRef<THREE.ShaderMaterial>(null);

    const uniforms = useMemo(
        () => ({
            uTime: { value: 0 },
            uColor1: { value: new THREE.Color('#00ffaa') },
            uColor2: { value: new THREE.Color('#0088ff') },
            uColor3: { value: new THREE.Color('#8b5cf6') },
            uColor4: { value: new THREE.Color('#ff00ff') },
        }),
        []
    );

    useFrame((state) => {
        if (materialRef.current) {
            materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
        }
    });

    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
            <planeGeometry args={[20, 20, 100, 100]} />
            <shaderMaterial
                ref={materialRef}
                vertexShader={auroraVertexShader}
                fragmentShader={auroraFragmentShader}
                transparent
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                side={THREE.DoubleSide}
                uniforms={uniforms}
            />
        </mesh>
    );
};
