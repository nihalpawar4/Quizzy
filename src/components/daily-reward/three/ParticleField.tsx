'use client';

/**
 * ParticleField — Ambient floating particles for the reward scene.
 * Pure Three.js Points, no external deps.
 */

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ParticleFieldProps {
    count?: number;
    color?: string;
    spread?: number;
}

export default function ParticleField({
    count = 120,
    color = '#38bdf8',
    spread = 5,
}: ParticleFieldProps) {
    const pointsRef = useRef<THREE.Points>(null);

    const { positions, sizes } = useMemo(() => {
        const pos = new Float32Array(count * 3);
        const sz = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * spread;
            pos[i * 3 + 1] = (Math.random() - 0.5) * spread;
            pos[i * 3 + 2] = (Math.random() - 0.5) * spread;
            sz[i] = 0.5 + Math.random() * 1.5;
        }

        return { positions: pos, sizes: sz };
    }, [count, spread]);

    const material = useMemo(() => new THREE.PointsMaterial({
        color,
        size: 0.03,
        transparent: true,
        opacity: 0.4,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    }), [color]);

    useFrame((state) => {
        if (!pointsRef.current) return;
        const t = state.clock.elapsedTime;

        // Slow rotation
        pointsRef.current.rotation.y = t * 0.02;
        pointsRef.current.rotation.x = Math.sin(t * 0.05) * 0.1;

        // Subtle position drift
        const posArray = pointsRef.current.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < count; i++) {
            const idx = i * 3 + 1; // Y axis
            posArray[idx] += Math.sin(t * 0.3 + i * 0.5) * 0.0003;
        }
        pointsRef.current.geometry.attributes.position.needsUpdate = true;
    });

    return (
        <points ref={pointsRef} material={material}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    args={[positions, 3]}
                />
                <bufferAttribute
                    attach="attributes-size"
                    args={[sizes, 1]}
                />
            </bufferGeometry>
        </points>
    );
}
