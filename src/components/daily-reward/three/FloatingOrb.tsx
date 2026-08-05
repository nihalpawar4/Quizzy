'use client';

/**
 * FloatingOrb — Futuristic capsule/orb with rotating rings.
 * Procedural geometry, no external models.
 */

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

interface FloatingOrbProps {
    rarity: Rarity;
    isOpening?: boolean;
}

const RARITY_COLORS: Record<Rarity, {
    core: string;
    ring: string;
    emissive: string;
    emissiveIntensity: number;
    particleColor: string;
}> = {
    common: {
        core: '#64748b', ring: '#94a3b8', emissive: '#475569',
        emissiveIntensity: 0.05, particleColor: '#cbd5e1',
    },
    uncommon: {
        core: '#3b82f6', ring: '#60a5fa', emissive: '#1d4ed8',
        emissiveIntensity: 0.08, particleColor: '#93c5fd',
    },
    rare: {
        core: '#0ea5e9', ring: '#38bdf8', emissive: '#0284c7',
        emissiveIntensity: 0.12, particleColor: '#7dd3fc',
    },
    epic: {
        core: '#8b5cf6', ring: '#a78bfa', emissive: '#6d28d9',
        emissiveIntensity: 0.15, particleColor: '#c4b5fd',
    },
    legendary: {
        core: '#f59e0b', ring: '#fbbf24', emissive: '#d97706',
        emissiveIntensity: 0.2, particleColor: '#fde68a',
    },
};

export default function FloatingOrb({ rarity, isOpening = false }: FloatingOrbProps) {
    const groupRef = useRef<THREE.Group>(null);
    const coreRef = useRef<THREE.Mesh>(null);
    const ring1Ref = useRef<THREE.Mesh>(null);
    const ring2Ref = useRef<THREE.Mesh>(null);
    const ring3Ref = useRef<THREE.Mesh>(null);

    const colors = RARITY_COLORS[rarity];

    const coreMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: colors.core,
        emissive: colors.emissive,
        emissiveIntensity: colors.emissiveIntensity,
        metalness: 0.3,
        roughness: 0.4,
        transparent: true,
        opacity: 0.9,
    }), [colors]);

    const ringMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: colors.ring,
        emissive: colors.emissive,
        emissiveIntensity: colors.emissiveIntensity * 0.5,
        metalness: 0.6,
        roughness: 0.2,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
    }), [colors]);

    useFrame((state) => {
        const t = state.clock.elapsedTime;

        // Float the entire group
        if (groupRef.current) {
            groupRef.current.position.y = Math.sin(t * 0.8) * 0.15;
            groupRef.current.rotation.y = t * 0.1;
        }

        // Core subtle breathing scale
        if (coreRef.current) {
            const breathe = 1 + Math.sin(t * 1.2) * 0.03;
            coreRef.current.scale.setScalar(isOpening ? breathe * 1.3 : breathe);
        }

        // Rings rotate at different speeds/axes
        if (ring1Ref.current) {
            ring1Ref.current.rotation.x = t * 0.3;
            ring1Ref.current.rotation.z = t * 0.15;
        }
        if (ring2Ref.current) {
            ring2Ref.current.rotation.y = t * 0.4;
            ring2Ref.current.rotation.x = Math.PI / 3 + t * 0.1;
        }
        if (ring3Ref.current) {
            ring3Ref.current.rotation.z = t * 0.25;
            ring3Ref.current.rotation.y = Math.PI / 4 + t * 0.2;
        }
    });

    return (
        <group ref={groupRef}>
            {/* Core sphere (icosahedron for futuristic look) */}
            <mesh ref={coreRef}>
                <icosahedronGeometry args={[0.7, 2]} />
                <primitive object={coreMaterial} />
            </mesh>

            {/* Ring 1 — outer */}
            <mesh ref={ring1Ref}>
                <torusGeometry args={[1.2, 0.02, 16, 64]} />
                <primitive object={ringMaterial} />
            </mesh>

            {/* Ring 2 — middle */}
            <mesh ref={ring2Ref}>
                <torusGeometry args={[1.0, 0.015, 16, 64]} />
                <primitive object={ringMaterial} />
            </mesh>

            {/* Ring 3 — inner (only for epic/legendary) */}
            {(rarity === 'epic' || rarity === 'legendary') && (
                <mesh ref={ring3Ref}>
                    <torusGeometry args={[0.85, 0.012, 16, 48]} />
                    <primitive object={ringMaterial} />
                </mesh>
            )}
        </group>
    );
}
