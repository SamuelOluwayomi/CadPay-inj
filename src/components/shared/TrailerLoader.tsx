'use client';

import { motion, Variants } from 'framer-motion';
import { useEffect, useState } from 'react';

export default function TrailerLoader({ onComplete }: { onComplete: () => void }) {

    // Triggers the removal of the component from the DOM
    useEffect(() => {
        const timer = setTimeout(() => {
            onComplete();
        }, 2200);
        return () => clearTimeout(timer);
    }, [onComplete]);

    // --- Animation Variants ---
    const containerVariants: Variants = {
        exit: {
            transition: { staggerChildren: 0.1 } // Stagger the logo fade and the door opening
        }
    };

    const topPanelVariants: Variants = {
        initial: { y: 0 },
        exit: {
            y: "-100%",
            transition: { duration: 0.8 }
        }
    };

    const bottomPanelVariants: Variants = {
        initial: { y: 0 },
        exit: {
            y: "100%",
            transition: { duration: 0.8 }
        }
    };

    const logoVariants: Variants = {
        initial: { opacity: 1, scale: 1 },
        exit: {
            opacity: 0,
            scale: 0.9,
            transition: { duration: 0.3 }
        }
    };

    return (
        <motion.div
            className="fixed inset-0 z-9999 flex items-center justify-center"
            variants={containerVariants}
            initial="initial"
            exit="exit"
        >
            {/* 1. TOP PANEL (Black) */}
            <motion.div
                variants={topPanelVariants}
                className="absolute top-0 left-0 right-0 h-[50vh] bg-black border-b border-zinc-800"
            />

            {/* 2. BOTTOM PANEL (Black) */}
            <motion.div
                variants={bottomPanelVariants}
                className="absolute bottom-0 left-0 right-0 h-[50vh] bg-black border-t border-zinc-800"
            />

            {/* 3. CENTER LOGO CONTENT */}
            {/* Placed in a relative container so it sits ON TOP of the split panels */}
            <motion.div
                variants={logoVariants}
                className="relative z-10 flex items-center gap-4"
            >
                {/* LOGO "C" - Slides in from Left */}
                <motion.div
                    initial={{ x: -60, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.8 }}
                    className="w-16 h-16 sm:w-20 sm:h-20 bg-orange-500 rounded-xl flex items-center justify-center shadow-[0_0_30px_rgba(249,115,22,0.4)]"
                >
                    <span className="text-black font-black text-4xl sm:text-5xl not-italic select-none pt-1">
                        C
                    </span>
                </motion.div>

                {/* TEXT "CADPAY" - Slides in from Right */}
                <motion.div
                    initial={{ x: 60, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.8 }}
                >
                    <span className="text-4xl sm:text-5xl font-bold text-white tracking-tighter italic">
                        CADPAY
                    </span>
                </motion.div>
            </motion.div>

        </motion.div>
    );
}
