'use client';

/**
 * MysteryBoxScene — React Three Fiber 3D Scene
 * Procedurally generated gift box with ribbon, lid hinge animation.
 * No external models, no reflector, no environment maps.
 */

import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { RoundedBox, Sparkles, AdaptiveDpr } from '@react-three/drei';
import * as THREE from 'three';

// ─── Phase types ────────────────────────────────────────────────────────

export type ScenePhase =
    | 'idle'
    | 'countdown'
    | 'opening'
    | 'burst'
    | 'done';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

interface MysteryBoxSceneProps {
    phase: ScenePhase;
    rarity: Rarity;
    onOpeningComplete?: () => void;
}

// ─── Rarity configs ─────────────────────────────────────────────────────

const RARITY_CONFIGS: Record<Rarity, {
    spotColor: string;
    spotIntensity: number;
    sparkleColor: string;
    burstCount: number;
    boxColor: string;
    ribbonColor: string;
    emissive: string;
    emissiveIntensity: number;
}> = {
    common: {
        spotColor: '#fbbf24', spotIntensity: 1.5,
        sparkleColor: '#fde68a', burstCount: 40,
        boxColor: '#dc2626', ribbonColor: '#fbbf24',
        emissive: '#991b1b', emissiveIntensity: 0.06,
    },
    uncommon: {
        spotColor: '#fbbf24', spotIntensity: 1.7,
        sparkleColor: '#fde68a', burstCount: 50,
        boxColor: '#dc2626', ribbonColor: '#f59e0b',
        emissive: '#991b1b', emissiveIntensity: 0.08,
    },
    rare: {
        spotColor: '#f59e0b', spotIntensity: 2.0,
        sparkleColor: '#fcd34d', burstCount: 60,
        boxColor: '#b91c1c', ribbonColor: '#f59e0b',
        emissive: '#7f1d1d', emissiveIntensity: 0.12,
    },
    epic: {
        spotColor: '#c084fc', spotIntensity: 2.2,
        sparkleColor: '#e9d5ff', burstCount: 70,
        boxColor: '#9333ea', ribbonColor: '#fbbf24',
        emissive: '#581c87', emissiveIntensity: 0.15,
    },
    legendary: {
        spotColor: '#fbbf24', spotIntensity: 2.8,
        sparkleColor: '#fef3c7', burstCount: 100,
        boxColor: '#d97706', ribbonColor: '#fef08a',
        emissive: '#92400e', emissiveIntensity: 0.25,
    },
};

// ─── Camera Controller ──────────────────────────────────────────────────

function CameraRig({ phase }: { phase: ScenePhase }) {
    const { camera } = useThree();

    useFrame((_, delta) => {
        // Camera looks straight at box center (y=0.3) — no floor, no looking down
        let tx = 0, ty = 0.35, tz = 2.6;

        if (phase === 'countdown') {
            tx = 0; ty = 0.35; tz = 2.3;
        } else if (phase === 'opening' || phase === 'burst') {
            tx = 0; ty = 0.4; tz = 2.1;
        } else if (phase === 'done') {
            tx = 0; ty = 0.4; tz = 2.0;
        }

        camera.position.x += (tx - camera.position.x) * delta * 2.5;
        camera.position.y += (ty - camera.position.y) * delta * 2.5;
        camera.position.z += (tz - camera.position.z) * delta * 2.5;
        camera.lookAt(0, 0.3, 0);
    });

    return null;
}

// ─── Gift Box ───────────────────────────────────────────────────────────

function GiftBox({
    phase,
    rarity,
    onOpeningComplete,
}: {
    phase: ScenePhase;
    rarity: Rarity;
    onOpeningComplete?: () => void;
}) {
    const groupRef = useRef<THREE.Group>(null);
    const lidPivotRef = useRef<THREE.Group>(null);
    const innerLightRef = useRef<THREE.PointLight>(null);
    const cfg = RARITY_CONFIGS[rarity];

    const clock = useRef(0);
    const phaseStart = useRef(0);
    const prevPhase = useRef<ScenePhase>('idle');
    const completed = useRef(false);

    useEffect(() => {
        if (prevPhase.current !== phase) {
            phaseStart.current = clock.current;
            prevPhase.current = phase;
            completed.current = false;
        }
    }, [phase]);

    useFrame((_, dt) => {
        clock.current += dt;
        const t = clock.current;
        const elapsed = t - phaseStart.current;
        const g = groupRef.current;
        const lid = lidPivotRef.current;
        const light = innerLightRef.current;
        if (!g) return;

        // ── Idle: gentle float ──
        if (phase === 'idle') {
            g.position.y = Math.sin(t * 1.8) * 0.04;
            g.rotation.y = Math.sin(t * 1.2) * 0.02;
            g.position.x = 0;
            g.position.z = 0;
            if (lid) lid.rotation.x = 0;
            if (light) light.intensity = 0;
        }

        // ── Countdown: shake ──
        if (phase === 'countdown') {
            const intensity = Math.min(0.015 + elapsed * 0.02, 0.05);
            g.position.x = Math.sin(t * 28) * intensity;
            g.position.z = Math.cos(t * 21) * intensity * 0.4;
            g.position.y = Math.sin(t * 1.8) * 0.015;
            g.rotation.y = Math.sin(t * 16) * 0.01;
        }

        // ── Opening: lid hinge + light ──
        if (phase === 'opening') {
            // Settle shake
            g.position.x *= 0.9;
            g.position.z *= 0.9;
            g.position.y = 0;
            g.rotation.y *= 0.92;

            // Lid opens starting at 0.2s — reduced angle so lid stays attached
            if (lid && elapsed > 0.2) {
                const progress = Math.min((elapsed - 0.2) / 1.2, 1);
                // Smooth ease out (power 3 for more natural feel)
                const eased = 1 - Math.pow(1 - progress, 3);
                lid.rotation.x = -eased * 1.3; // ~75 degrees — stays visually attached
            }

            // Inner glow — reduced intensity
            if (light && elapsed > 0.3) {
                const lp = Math.min((elapsed - 0.3) / 1.0, 1);
                light.intensity = lp * 2.2;
            }

            // Signal complete at 1.6s
            if (elapsed > 1.6 && !completed.current) {
                completed.current = true;
                onOpeningComplete?.();
            }
        }

        // ── Burst: pulse light ──
        if (phase === 'burst') {
            g.position.x = 0;
            g.position.z = 0;
            g.position.y = 0;
            g.rotation.y = 0;
            if (lid) lid.rotation.x = -1.3;
            if (light) light.intensity = 2.2 + Math.sin(t * 5) * 0.6;
        }

        // ── Done: sink ──
        if (phase === 'done') {
            g.position.y += (-3 - g.position.y) * dt * 3;
            if (light) light.intensity *= 0.95;
        }
    });

    const boxMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: cfg.boxColor,
        metalness: 0.55,
        roughness: 0.25,
        emissive: new THREE.Color(cfg.emissive),
        emissiveIntensity: cfg.emissiveIntensity,
    }), [cfg]);

    const ribbonMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: cfg.ribbonColor,
        metalness: 0.6,
        roughness: 0.2,
        emissive: new THREE.Color(cfg.ribbonColor),
        emissiveIntensity: 0.1,
    }), [cfg]);

    // Box dimensions (~15% smaller for proper proportions)
    const W = 0.76, H = 0.6, D = 0.76;
    const LID_H = 0.15;
    const R = 0.07;
    const RIB_W = 0.06;

    return (
        <group ref={groupRef}>
            {/* ─── Box Body ─── */}
            <RoundedBox
                args={[W, H, D]}
                radius={R}
                smoothness={4}
                position={[0, H / 2, 0]}
                castShadow
                receiveShadow
                material={boxMat}
            />

            {/* ─── Body Ribbons (cross) ─── */}
            <mesh position={[0, H / 2 + 0.01, 0]} material={ribbonMat}>
                <boxGeometry args={[W + 0.02, RIB_W, RIB_W]} />
            </mesh>
            <mesh position={[0, H / 2 + 0.01, 0]} material={ribbonMat}>
                <boxGeometry args={[RIB_W, RIB_W, D + 0.02]} />
            </mesh>
            {/* Vertical ribbons on sides */}
            <mesh position={[0, H / 2, D / 2 + 0.005]} material={ribbonMat}>
                <boxGeometry args={[RIB_W, H + 0.02, 0.01]} />
            </mesh>
            <mesh position={[0, H / 2, -(D / 2 + 0.005)]} material={ribbonMat}>
                <boxGeometry args={[RIB_W, H + 0.02, 0.01]} />
            </mesh>
            <mesh position={[W / 2 + 0.005, H / 2, 0]} material={ribbonMat}>
                <boxGeometry args={[0.01, H + 0.02, RIB_W]} />
            </mesh>
            <mesh position={[-(W / 2 + 0.005), H / 2, 0]} material={ribbonMat}>
                <boxGeometry args={[0.01, H + 0.02, RIB_W]} />
            </mesh>

            {/* ─── Lid (pivot at back edge, Y = top of body, Z = -D/2) ─── */}
            <group
                ref={lidPivotRef}
                position={[0, H, -(D / 2)]}
            >
                {/* Lid box — centered so back edge aligns with pivot */}
                <RoundedBox
                    args={[W + 0.04, LID_H, D + 0.04]}
                    radius={R}
                    smoothness={4}
                    position={[0, LID_H / 2, (D + 0.04) / 2]}
                    castShadow
                    material={boxMat}
                />
                {/* Lid Ribbons */}
                <mesh position={[0, LID_H / 2 + 0.01, (D + 0.04) / 2]} material={ribbonMat}>
                    <boxGeometry args={[W + 0.06, 0.03, RIB_W]} />
                </mesh>
                <mesh position={[0, LID_H / 2 + 0.01, (D + 0.04) / 2]} material={ribbonMat}>
                    <boxGeometry args={[RIB_W, 0.03, D + 0.06]} />
                </mesh>

                {/* Bow on top (two small tilted boxes) */}
                <mesh
                    position={[0.07, LID_H + 0.04, (D + 0.04) / 2]}
                    rotation={[0, 0, 0.4]}
                    material={ribbonMat}
                >
                    <boxGeometry args={[0.15, 0.04, 0.06]} />
                </mesh>
                <mesh
                    position={[-0.07, LID_H + 0.04, (D + 0.04) / 2]}
                    rotation={[0, 0, -0.4]}
                    material={ribbonMat}
                >
                    <boxGeometry args={[0.15, 0.04, 0.06]} />
                </mesh>
                {/* Bow center knot */}
                <mesh position={[0, LID_H + 0.03, (D + 0.04) / 2]} material={ribbonMat}>
                    <boxGeometry args={[0.06, 0.06, 0.06]} />
                </mesh>
            </group>

            {/* ─── Inner glow light ─── */}
            <pointLight
                ref={innerLightRef}
                position={[0, H / 2 + 0.08, 0]}
                color={rarity === 'legendary' ? '#fbbf24' : '#fcd34d'}
                intensity={0}
                distance={3}
                decay={2}
            />
        </group>
    );
}

// ─── Burst Particles ────────────────────────────────────────────────────

function BurstParticles({ phase, rarity }: { phase: ScenePhase; rarity: Rarity }) {
    const cfg = RARITY_CONFIGS[rarity];
    if (phase !== 'opening' && phase !== 'burst') return null;

    return (
        <Sparkles
            count={Math.round(cfg.burstCount * 0.7)}
            scale={[2, 2, 2]}
            size={2.5}
            speed={2.5}
            color={cfg.sparkleColor}
            position={[0, 0.6, 0]}
        />
    );
}

// ─── Ambient particles ──────────────────────────────────────────────────

function AmbientParticles() {
    return (
        <Sparkles
            count={14}
            scale={[4, 3, 4]}
            size={0.8}
            speed={0.15}
            color="#f59e0b"
            opacity={0.15}
            position={[0, 0.4, 0]}
        />
    );
}

// Floor removed — transparent canvas now shows blurred dashboard through overlay

// ─── Main Export ────────────────────────────────────────────────────────

export default function MysteryBoxScene({ phase, rarity, onOpeningComplete }: MysteryBoxSceneProps) {
    const cfg = RARITY_CONFIGS[rarity];

    return (
        <Canvas
            dpr={[1, 1.5]}
            gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
            camera={{ position: [0, 0.35, 2.6], fov: 40, near: 0.1, far: 50 }}
            style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                zIndex: 0,
            }}
        >
            <AdaptiveDpr pixelated />
            <CameraRig phase={phase} />

            {/* Lighting */}
            <ambientLight color="#ffffff" intensity={0.8} />
            <spotLight
                position={[0, 4, 3]}
                angle={0.6}
                penumbra={0.8}
                intensity={cfg.spotIntensity * 0.85}
                color={cfg.spotColor}
            />
            <pointLight position={[-2, 1, -1]} color="#ffffff" intensity={0.3} distance={6} />
            <pointLight position={[2, 1, -0.5]} color="#ffffff" intensity={0.2} distance={5} />

            {/* The Gift Box */}
            <GiftBox phase={phase} rarity={rarity} onOpeningComplete={onOpeningComplete} />

            {/* Burst sparkles */}
            <BurstParticles phase={phase} rarity={rarity} />

            {/* Ambient floating particles */}
            <AmbientParticles />
        </Canvas>
    );
}
