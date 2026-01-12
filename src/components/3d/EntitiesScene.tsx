import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { EntityMesh } from './EntityMesh';
import { useEntities } from '@/hooks/useEntities';
import * as THREE from 'three';

export const EntitiesScene = () => {
    const { entities, getEntityPosition } = useEntities();

    return (
        <group>
            {entities.map((entity, index) => (
                <EntityMesh
                    key={entity.id}
                    index={index}
                    entity={entity}
                    position={getEntityPosition(entity.id)}
                />
            ))}
        </group>
    );
};
