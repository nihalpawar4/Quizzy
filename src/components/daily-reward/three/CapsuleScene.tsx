'use client';

/**
 * CapsuleScene — R3F Canvas wrapper for the floating orb + particles.
 * Lazy-loaded to avoid bundling Three.js on initial page load.
 */

import React from 'react';
import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr } from '@react-three/drei';
import FloatingOrb from './FloatingOrb';
import ParticleField from './ParticleField';

type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

const PARTICLE_COLORS: Record<Rarity, string> = {
    common: '#cbd5e1',
    uncommon: '#93c5fd',
    rare: '#7dd3fc',
    epic: '#c4b5fd',
    legendary: '#fde68a',
};

interface CapsuleSceneProps {
    rarity: Rarity;
    isOpening?: boolean;
}

export default function CapsuleScene({ rarity, isOpening = false }: CapsuleSceneProps) {
    return (
        <Canvas
            dpr={[1, 2]}
            camera={{ position: [0, 0, 4.5], fov: 45 }}
            style={{ background: 'transparent' }}
            gl={{ alpha: true, antialias: true }}
        >
            <AdaptiveDpr pixelated />

            {/* Lighting — clean, no spotlight glow */}
            <ambientLight intensity={0.5} />
            <directionalLight position={[3, 4, 5]} intensity={0.8} color="#f8fafc" />
            <directionalLight position={[-2, -1, 3]} intensity={0.3} color="#38bdf8" />

            {/* The orb */}
            <FloatingOrb rarity={rarity} isOpening={isOpening} />

            {/* Ambient particles */}
            <ParticleField
                count={80}
                color={PARTICLE_COLORS[rarity]}
                spread={4}
            />
        </Canvas>
    );
}
