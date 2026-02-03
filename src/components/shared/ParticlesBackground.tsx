'use client';

import { useEffect, useState } from 'react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import type { Engine } from '@tsparticles/engine';

interface ParticlesBackgroundProps {
    id?: string;
    particleCount?: number;
    linkDistance?: number;
    linkOpacity?: number;
    particleSize?: number;
    speed?: number;
    className?: string;
}

export default function ParticlesBackground({
    id = 'tsparticles-bg',
    particleCount = 100,
    linkDistance = 150,
    linkOpacity = 0.5,
    particleSize = 3,
    speed = 1.5,
    className = '',
}: ParticlesBackgroundProps) {
    const [init, setInit] = useState(false);

    useEffect(() => {
        initParticlesEngine(async (engine: Engine) => {
            await loadSlim(engine);
        }).then(() => {
            setInit(true);
        });
    }, []);

    if (!init) return null;

    return (
        <Particles
            id={id}
            className={className || "absolute inset-0 z-0 pointer-events-none"}
            options={{
                background: {
                    color: { value: "transparent" },
                },
                fpsLimit: 60,
                particles: {
                    color: { value: "#ff6600" },
                    links: {
                        color: "#ff6600",
                        distance: linkDistance,
                        enable: true,
                        opacity: linkOpacity,
                        width: 2,
                    },
                    move: {
                        enable: true,
                        speed: speed,
                        direction: "none",
                        random: true,
                        straight: false,
                        outModes: { default: "out" },
                    },
                    number: {
                        density: { enable: true },
                        value: particleCount,
                    },
                    opacity: {
                        value: 0.7,
                    },
                    shape: { type: "circle" },
                    size: {
                        value: { min: 1, max: particleSize },
                    },
                },
                detectRetina: true,
            }}
        />
    );
}
