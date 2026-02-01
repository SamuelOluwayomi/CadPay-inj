'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Bird = {
    id: number;
    x: number;
    y: number;
    rotation: number;
};

export default function ClickBirdEffect() {
    const [birds, setBirds] = useState<Bird[]>([]);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            const newBird = {
                id: Date.now() + Math.random(),
                x: e.clientX,
                y: e.clientY,
                rotation: Math.random() * 60 - 30, // Random rotation between -30 and 30
            };

            setBirds(prev => [...prev, newBird]);
        };

        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    const removeBird = (id: number) => {
        setBirds(prev => prev.filter(bird => bird.id !== id));
    };

    return (
        <div className="fixed inset-0 pointer-events-none z-9999 overflow-hidden">
            <AnimatePresence>
                {birds.map(bird => (
                    <BirdAnimation key={bird.id} bird={bird} onComplete={() => removeBird(bird.id)} />
                ))}
            </AnimatePresence>
        </div>
    );
}

function BirdAnimation({ bird, onComplete }: { bird: Bird; onComplete: () => void }) {
    // Randomize flight path slightly
    const xDist = (Math.random() - 0.5) * 200; // -100 to 100
    const yDist = -150 - Math.random() * 100; // -150 to -250 (upwards)

    return (
        <motion.div
            initial={{
                x: bird.x,
                y: bird.y,
                opacity: 0,
                scale: 0.5,
                rotate: bird.rotation
            }}
            animate={{
                x: bird.x + xDist,
                y: bird.y + yDist,
                opacity: [1, 1, 0],
                scale: [0.5, 1.2, 0.8],
                rotate: bird.rotation + (xDist > 0 ? 20 : -20)
            }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            onAnimationComplete={onComplete}
            className="absolute w-8 h-8 text-orange-500" // Use theme color
        >
            {/* Simple Bird SVG shape */}
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full drop-shadow-lg">
                <path d="M2,12 C4,14 8,16 12,12 C16,8 20,8 22,10 C20,14 16,16 12,14 C8,12 4,12 2,12 Z" />
            </svg>
        </motion.div>
    );
}
