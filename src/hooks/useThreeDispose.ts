import { useEffect } from 'react';
import * as THREE from 'three';

type DisposableResource = 
  | THREE.Material 
  | THREE.Material[] 
  | THREE.BufferGeometry 
  | THREE.Texture;

/**
 * Custom hook to ensure rigorous disposal of Three.js objects to prevent VRAM memory leaks,
 * specifically critical for weak mobile devices.
 * 
 * Takes an array of refs to Three.js materials, geometries, or textures.
 * Disposes of them automatically when the component unmounts.
 */
export function useThreeDispose(
  refs: React.RefObject<DisposableResource | null | undefined>[]
) {
  useEffect(() => {
    // Return a cleanup function
    return () => {
      refs.forEach((ref) => {
        if (!ref.current) return;
        
        const resource = ref.current;
        
        if (Array.isArray(resource)) {
          resource.forEach(disposeSingleItem);
        } else {
          disposeSingleItem(resource);
        }
      });
    };
  }, [refs]);
}

/** Helper to handle different types of disposable objects */
function disposeSingleItem(item: any) {
  if (!item) return;

  if (typeof item.dispose === 'function') {
    item.dispose();
  }

  // If it's a material, we might need to dispose of its textures too
  if (item instanceof THREE.Material) {
    const mat = item as any;
    // Map of common texture properties on materials
    const textureProps = [
      'map', 'lightMap', 'aoMap', 'emissiveMap', 'bumpMap', 'normalMap', 
      'displacementMap', 'roughnessMap', 'metalnessMap', 'alphaMap', 'envMap'
    ];
    
    textureProps.forEach(prop => {
      if (mat[prop] && typeof mat[prop].dispose === 'function') {
        mat[prop].dispose();
      }
    });
  }
}
