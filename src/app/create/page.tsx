'use client';

import { WalletIcon, ShieldCheckIcon, LightningIcon, ArrowLeftIcon } from '@phosphor-icons/react';
import Link from 'next/link';

export default function CreateAccount() {
    return (
        <div className="min-h-screen bg-[#1c1209] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
            {/* AMBER GLOW BACKGROUND */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,var(--tw-gradient-stops))] from-orange-900/20 via-[#1c1209] to-[#1c1209]" />
            <div className="absolute bottom-0 w-[200%] h-[50vh] bg-[linear-gradient(to_bottom,transparent,rgba(255,255,255,0.03)_1px),linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-size-[4rem_4rem] transform-[perspective(500px)_rotateX(60deg)] pointer-events-none origin-bottom opacity-20" />

            {/* NAV BACK */}
            <div className="absolute top-8 left-8 z-20">
                <Link href="/" className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 hover:border-white/30 transition-all group">
                    <ArrowLeftIcon size={20} className="group-hover:-translate-x-0.5 transition-transform" />
                </Link>
            </div>

            {/* MAIN CONTENT GRID */}
            <div className="w-full max-w-6xl relative z-10 grid md:grid-cols-2 gap-12 items-center">
                {/* LEFT SIDE */}
                <div>
                    <h1 className="text-5xl font-black text-white mb-4 tracking-tight leading-tight">
                        Web3 Subscriptions.<br />
                        <span className="text-orange-500">Simplified.</span>
                    </h1>
                    <p className="text-zinc-400 mb-8 leading-relaxed">
                        A Solana-based subscription payment platform that makes recurring crypto payments simple and secure.
                    </p>

                    <div className="space-y-4">
                        <FeatureRow
                            icon={<ShieldCheckIcon size={20} />}
                            title="Secure Transactions"
                            desc="Built on Solana for fast and secure payments."
                        />
                        <FeatureRow
                            icon={<LightningIcon size={20} />}
                            title="Automated Billing"
                            desc="Set it and forget it subscription management."
                        />
                        <FeatureRow
                            icon={<WalletIcon size={20} />}
                            title="Wallet Integration"
                            desc="Connect your preferred Solana wallet."
                        />
                    </div>
                </div>

                {/* RIGHT SIDE */}
                <div className="bg-[#120c07] border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl relative">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-orange-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-orange-500/20 shadow-[0_0_30px_rgba(249,115,22,0.1)]">
                            <WalletIcon className="text-orange-500" size={32} />
                        </div>
                        <h2 className="text-2xl font-bold text-white">Create Wallet</h2>
                        <p className="text-sm text-zinc-400 mt-2 max-w-xs mx-auto">
                            Wallet integration coming soon
                        </p>
                    </div>

                    <div className="p-4 bg-zinc-800/50 rounded-xl border border-white/5">
                        <p className="text-xs md:text-sm text-zinc-400 text-center px-2">
                            🚧 Authentication system needs to be implemented. This page will be updated with wallet creation functionality.
                        </p>
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/5 text-center">
                        <p className="text-xs text-zinc-500 mb-4">
                            <Link href="/" className="text-orange-500 hover:text-orange-400 font-medium transition-colors">
                                ← Back to Home
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function FeatureRow({ icon, title, desc }: any) {
    return (
        <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border bg-orange-500/10 border-orange-500/20">
                <div className="text-orange-500">{icon}</div>
            </div>
            <div>
                <h3 className="font-semibold mb-0.5 text-white">
                    {title}
                </h3>
                <p className="text-sm text-zinc-500">
                    {desc}
                </p>
            </div>
        </div>
    );
}
