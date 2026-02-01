'use client';

import { motion } from 'framer-motion';
import { Zap, TrendingUp, Shield, Sparkles, ArrowRight, Play } from 'lucide-react';
import { FingerprintIcon } from '@phosphor-icons/react';
import { SiSolana } from 'react-icons/si';
import Link from 'next/link';
import Image from 'next/image';

export default function ModernHero() {
    return (
        <section className="relative min-h-screen w-full overflow-hidden bg-linear-to-br from-gray-950 via-gray-900 to-black text-white">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-20 left-10 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
                <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-500" />
            </div>

            {/* Main Content */}
            <div className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-20">
                <div className="grid lg:grid-cols-2 gap-12 items-center">

                    {/* Left Column - Text Content */}
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                        className="space-y-8"
                    >
                        {/* Badge */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-linear-to-r from-orange-500/20 to-purple-500/20 border border-orange-500/30 rounded-full backdrop-blur-sm"
                        >
                            <Sparkles className="w-4 h-4 text-orange-400" />
                            <span className="text-sm font-semibold bg-linear-to-r from-orange-400 to-purple-400 bg-clip-text text-transparent">
                                Next-Gen Crypto Payments
                            </span>
                        </motion.div>

                        {/* Heading */}
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="text-5xl md:text-7xl font-black leading-tight"
                        >
                            Maximize Your{' '}
                            <span className="bg-linear-to-r from-orange-400 via-orange-500 to-orange-600 bg-clip-text text-transparent">
                                Financial
                            </span>
                            <br />
                            Potential
                        </motion.h1>

                        {/* Description */}
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="text-lg text-gray-400 max-w-lg leading-relaxed"
                        >
                            Experience Web3 payments with biometric security, gasless transactions, and automated subscriptions. No seed phrases. No complexity.
                        </motion.p>

                        {/* Trust Badges */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="flex items-center gap-6 flex-wrap"
                        >
                            <div className="flex items-center gap-2">
                                <div className="flex -space-x-2">
                                    <div className="w-8 h-8 rounded-full bg-linear-to-br from-orange-400 to-orange-600 border-2 border-gray-900" />
                                    <div className="w-8 h-8 rounded-full bg-linear-to-br from-purple-400 to-purple-600 border-2 border-gray-900" />
                                    <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-400 to-blue-600 border-2 border-gray-900" />
                                </div>
                                <div className="text-sm">
                                    <div className="flex items-center gap-1">
                                        {[...Array(5)].map((_, i) => (
                                            <span key={i} className="text-orange-400">★</span>
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-500">Trusted by thousands</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg">
                                <SiSolana className="text-purple-400" size={16} />
                                <span className="text-xs font-semibold text-gray-300">Built on Solana</span>
                            </div>
                        </motion.div>

                        {/* CTAs */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                            className="flex items-center gap-4 flex-wrap"
                        >
                            <Link
                                href="/create"
                                className="group px-8 py-4 bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-full font-bold text-white flex items-center gap-2 shadow-lg shadow-orange-500/50 transition-all hover:shadow-xl hover:shadow-orange-500/70 hover:scale-105"
                            >
                                <FingerprintIcon size={20} className="group-hover:rotate-12 transition-transform" />
                                Get Started
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Link>

                            <Link
                                href="/jupiter"
                                className="px-8 py-4 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 hover:border-gray-600 rounded-full font-semibold text-white flex items-center gap-2 transition-all hover:scale-105"
                            >
                                <Play className="w-4 h-4" />
                                View Demo
                            </Link>
                        </motion.div>
                    </motion.div>

                    {/* Right Column - Interactive Cards */}
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="relative"
                    >
                        <div className="relative w-full h-[600px]">
                            {/* Main Card - Wallet */}
                            <motion.div
                                animate={{
                                    y: [0, -10, 0],
                                }}
                                transition={{
                                    duration: 4,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }}
                                className="absolute top-0 right-0 w-80 h-56 bg-linear-to-br from-green-400 via-green-500 to-green-600 rounded-3xl shadow-2xl p-6 text-white"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="text-sm opacity-90">Total Balance</p>
                                        <h3 className="text-4xl font-bold mt-1">$9,823.28</h3>
                                    </div>
                                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                        <Shield className="w-6 h-6" />
                                    </div>
                                </div>
                                <div className="mt-6 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4" />
                                    <span className="text-sm">+12.5% this month</span>
                                </div>
                            </motion.div>

                            {/* Card 2 - Subscription Card */}
                            <motion.div
                                animate={{
                                    y: [0, -15, 0],
                                }}
                                transition={{
                                    duration: 5,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                    delay: 0.5
                                }}
                                className="absolute top-48 left-0 w-72 h-48 bg-linear-to-br from-blue-500 via-blue-600 to-purple-600 rounded-3xl shadow-2xl p-6 text-white"
                            >
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                        <Zap className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs opacity-90">Active</p>
                                        <p className="font-bold">Spotify Premium</p>
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <p className="text-2xl font-bold">$10.99/mo</p>
                                    <p className="text-sm opacity-90 mt-1">Next billing: Jan 24</p>
                                </div>
                                <div className="mt-4 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                    <p className="text-xs font-semibold">⚡ Gasless Payments</p>
                                </div>
                            </motion.div>

                            {/* Card 3 - Stats Card */}
                            <motion.div
                                animate={{
                                    y: [0, -12, 0],
                                }}
                                transition={{
                                    duration: 4.5,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                    delay: 1
                                }}
                                className="absolute bottom-0 right-12 w-64 h-44 bg-linear-to-br from-purple-500 via-purple-600 to-pink-600 rounded-3xl shadow-2xl p-6 text-white"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <p className="text-sm opacity-90">Total Saved</p>
                                        <h3 className="text-3xl font-bold mt-1">$127</h3>
                                    </div>
                                    <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                        <Sparkles className="w-5 h-5" />
                                    </div>
                                </div>
                                <div className="mt-4 space-y-1">
                                    <div className="flex justify-between text-xs">
                                        <span className="opacity-90">Gas fees saved</span>
                                        <span className="font-bold">$0.05/tx</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="opacity-90">Transactions</span>
                                        <span className="font-bold">2,540</span>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                </div>

                {/* Feature Stats Row */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8, duration: 0.8 }}
                    className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-6"
                >
                    {[
                        { label: '0% Gas Fees', value: '100%', subtitle: 'Transactions Sponsored' },
                        { label: 'Sub-second', value: '<1s', subtitle: 'Transaction Speed' },
                        { label: 'Biometric', value: '100%', subtitle: 'Secure Login' },
                        { label: 'Auto-Billing', value: '∞', subtitle: 'Recurring Payments' },
                    ].map((stat, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.9 + i * 0.1 }}
                            className="p-6 bg-gray-800/30 border border-gray-700/50 rounded-2xl backdrop-blur-sm hover:bg-gray-800/50 hover:border-gray-600/50 transition-all group"
                        >
                            <div className="text-3xl font-black bg-linear-to-r from-orange-400 to-purple-400 bg-clip-text text-transparent group-hover:scale-110 transition-transform">
                                {stat.value}
                            </div>
                            <div className="mt-2 text-sm font-semibold text-white">{stat.label}</div>
                            <div className="text-xs text-gray-500 mt-1">{stat.subtitle}</div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>

            {/* Bottom Wave */}
            <div className="absolute bottom-0 left-0 w-full z-5 pointer-events-none">
                <svg
                    viewBox="0 0 1200 120"
                    preserveAspectRatio="none"
                    className="w-full h-[150px] md:h-[200px] fill-[#0f0f0f]"
                >
                    <path d="M0,120 L1200,0 L1200,120 Z" />
                    <line x1="0" y1="120" x2="1200" y2="0" stroke="#f97316" strokeWidth="1" />
                </svg>
            </div>
        </section>
    );
}
