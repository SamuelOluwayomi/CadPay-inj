'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { StorefrontIcon, UserCircleIcon, ArrowRightIcon, SpinnerIcon, LockKeyIcon, ArrowLeftIcon } from '@phosphor-icons/react';
import { useMerchant } from '@/context/MerchantContext';
import Image from 'next/image';

export default function MerchantAuthPage() {
    const [isSignup, setIsSignup] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const router = useRouter();
    const { createMerchant, loginMerchant } = useMerchant();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (isSignup) {
                // Register
                await createMerchant(name, email);
            } else {
                // Login with password validation
                const success = await loginMerchant(email, password);
                if (!success) {
                    throw new Error("Invalid email or password.");
                }
            }
            // Redirect
            router.push('/merchant');
        } catch (err: any) {
            setError(err.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
            {/* Background Decoration */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-orange-500/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[10%] right-[10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[100px]" />
            </div>

            {/* NAV BACK */}
            <div className="absolute top-4 left-4 md:top-8 md:left-8 z-20">
                <Link href="/" className="inline-flex items-center justify-center w-12 h-12 md:w-10 md:h-10 rounded-full bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 hover:border-white/30 transition-all group">
                    <ArrowLeftIcon size={20} className="group-hover:-translate-x-0.5 transition-transform" />
                </Link>
            </div>

            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-8">
                    <div className="relative w-16 h-16 mx-auto mb-4 bg-zinc-900 rounded-2xl flex items-center justify-center border border-white/10 shadow-2xl shadow-orange-500/20">
                        <Image
                            src="/lazorkit-logo.png"
                            alt="CadPay"
                            fill
                            sizes="64px"
                            className="object-contain p-3"
                        />
                    </div>
                    <h1 className="text-3xl font-black bg-linear-to-r from-white to-zinc-400 bg-clip-text text-transparent mb-2">
                        Merchant Portal
                    </h1>
                    <p className="text-zinc-400">
                        {isSignup ? "Create your business wallet instantly." : "Manage your subscriptions and revenue."}
                    </p>
                </div>

                <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-2xl md:rounded-3xl shadow-xl">
                    <div className="flex bg-black/40 p-1 rounded-xl mb-6">
                        <button
                            onClick={() => setIsSignup(false)}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${!isSignup ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                        >
                            Log In
                        </button>
                        <button
                            onClick={() => setIsSignup(true)}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${isSignup ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                        >
                            Create Account
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {isSignup && (
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Business Name</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Acme Corp"
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 pl-11 text-white focus:border-orange-500/50 focus:outline-none transition-colors"
                                        required={isSignup}
                                    />
                                    <StorefrontIcon size={20} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Email Address</label>
                            <div className="relative">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="founder@startup.com"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 pl-11 text-white focus:border-orange-500/50 focus:outline-none transition-colors"
                                    required
                                />
                                <UserCircleIcon size={20} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Password</label>
                            <div className="relative">
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 pl-11 text-white focus:border-orange-500/50 focus:outline-none transition-colors"
                                    required
                                />
                                <LockKeyIcon size={20} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-medium text-center">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-white text-black font-bold py-3.5 rounded-xl hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <SpinnerIcon size={20} className="animate-spin" />
                            ) : (
                                <>
                                    {isSignup ? "Generate Wallet & Join" : "Access Dashboard"}
                                    <ArrowRightIcon size={18} weight="bold" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {isSignup && (
                    <p className="text-center text-xs text-zinc-500 mt-6">
                        By joining, a new Solana wallet will be automatically created <br /> for your business to receive USDC payments.
                    </p>
                )}
            </div>
        </div>
    );
}
