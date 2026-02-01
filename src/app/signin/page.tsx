'use client';

import { motion } from 'framer-motion';
import { ShoppingBagIcon, WalletIcon } from '@phosphor-icons/react';
import { ArrowLeftIcon } from '@phosphor-icons/react';
import Link from 'next/link';

export default function SignIn() {
    return (
        <div className="min-h-screen bg-[#1c1209] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">

            {/* BACKGROUND ELEMENTS */}
            <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-orange-500/50 to-transparent shadow-[0_0_20px_rgba(249,115,22,0.4)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,var(--tw-gradient-stops))] from-orange-500/10 via-[#1c1209] to-[#1c1209]" />

            {/* GRID FLOOR */}
            <div className="absolute bottom-0 w-[200%] h-[50vh] bg-[linear-gradient(to_bottom,transparent,rgba(255,255,255,0.03)_1px),linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-size-[4rem_4rem] transform-[perspective(500px)_rotateX(60deg)] pointer-events-none origin-bottom opacity-20" />

            <div className="absolute top-8 left-8 z-20">
                <Link href="/" className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 hover:border-white/30 transition-all group">
                    <ArrowLeftIcon size={20} className="group-hover:-translate-x-0.5 transition-transform" />
                </Link>
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md relative z-10"
            >
                {/* LOGIN CARD */}
                <div className="bg-zinc-900/80 backdrop-blur-lg border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl">
                    {/* Icon */}
                    <motion.div
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-6 bg-orange-500/20 rounded-2xl flex items-center justify-center"
                    >
                        <WalletIcon size={40} className="text-orange-500" weight="bold" />
                    </motion.div>

                    {/* Title */}
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 text-center">Sign In</h1>
                    <p className="text-sm md:text-base text-zinc-400 mb-8 text-center px-4">
                        Wallet integration coming soon
                    </p>

                    {/* Placeholder Info */}
                    <div className="p-4 bg-zinc-800/50 rounded-xl border border-white/5">
                        <p className="text-xs md:text-sm text-zinc-400 text-center px-2">
                            🚧 Authentication system needs to be implemented. This page will be updated with wallet connection functionality.
                        </p>
                    </div>

                    {/* Home Link */}
                    <p className="text-xs md:text-sm text-center text-zinc-500 mt-6">
                        <a href="/" className="text-orange-500 hover:text-orange-400 font-medium">
                            ← Back to Home
                        </a>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
