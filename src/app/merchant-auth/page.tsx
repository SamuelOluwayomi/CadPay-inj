'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { StorefrontIcon, UserCircleIcon, ArrowRightIcon, SpinnerIcon, LockKeyIcon, ArrowLeftIcon, InfoIcon } from '@phosphor-icons/react';
import { useMerchant } from '@/context/MerchantContext';
import Image from 'next/image';

export default function MerchantAuthPage() {
    // Main Tab: "Admin Merchant" vs "Merchant Login/Sign Up"
    const [mainTab, setMainTab] = useState<'admin' | 'merchant'>('admin');

    // Subtab for Merchant: "signin" vs "register"
    const [merchantSubTab, setMerchantSubTab] = useState<'signin' | 'register'>('signin');

    // Form fields
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const router = useRouter();
    const { createMerchant, loginMerchant } = useMerchant();

    // Pre-fill demo credentials on mount
    useEffect(() => {
        if (mainTab === 'admin') {
            setEmail('demo@cadpay.xyz');
            setPassword('demo123');
        } else {
            // Clear when switching to merchant tab
            if (email === 'demo@cadpay.xyz') {
                setEmail('');
                setPassword('');
            }
        }
    }, [mainTab]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (mainTab === 'admin') {
                // Admin login (demo account)
                const success = await loginMerchant(email, password);
                if (!success) {
                    throw new Error("Invalid credentials.");
                }
            } else {
                // Real merchant account
                if (merchantSubTab === 'register') {
                    await createMerchant(name, email);
                } else {
                    const success = await loginMerchant(email, password);
                    if (!success) {
                        throw new Error("Invalid email or password.");
                    }
                }
            }
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
                            src="/icon.ico"
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
                        {mainTab === 'admin'
                            ? "Manage your subscriptions and revenue."
                            : merchantSubTab === 'register'
                                ? "Create your business wallet instantly."
                                : "Manage your subscriptions and revenue."}
                    </p>
                </div>

                <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-2xl md:rounded-3xl shadow-xl">
                    {/* MAIN TABS: Admin Merchant vs Merchant Login/Sign Up */}
                    <div className="flex bg-black/40 p-1 rounded-xl mb-6">
                        <button
                            onClick={() => setMainTab('admin')}
                            className={`flex-1 py-2 px-3 rounded-lg text-xs md:text-sm font-bold transition-all ${mainTab === 'admin' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                        >
                            ADMIN MERCHANT
                        </button>
                        <button
                            onClick={() => setMainTab('merchant')}
                            className={`flex-1 py-2 px-3 rounded-lg text-xs md:text-sm font-bold transition-all ${mainTab === 'merchant' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                        >
                            MERCHANT LOGIN/SIGN UP
                        </button>
                    </div>

                    {/* SUB-TABS for Merchant (Sign In / Register) */}
                    {mainTab === 'merchant' && (
                        <div className="flex bg-black/40 p-1 rounded-xl mb-6">
                            <button
                                onClick={() => setMerchantSubTab('signin')}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${merchantSubTab === 'signin' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'
                                    }`}
                            >
                                Sign In
                            </button>
                            <button
                                onClick={() => setMerchantSubTab('register')}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${merchantSubTab === 'register' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'
                                    }`}
                            >
                                Register
                            </button>
                        </div>
                    )}

                    {/* Admin Notice */}
                    {mainTab === 'admin' && (
                        <div className="mb-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl flex items-start gap-2">
                            <InfoIcon size={18} weight="fill" className="text-orange-500 mt-0.5 shrink-0" />
                            <div className="text-xs text-zinc-300">
                                <span className="font-bold text-orange-400">Admin Merchant Account</span>
                                <br />No wallet signature required.
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {mainTab === 'merchant' && merchantSubTab === 'register' && (
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Business Name</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Acme Corp"
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 pl-11 text-white focus:border-orange-500/50 focus:outline-none transition-colors"
                                        required
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
                                    placeholder={mainTab === 'admin' ? "demo@cadpay.xyz" : "founder@startup.com"}
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
                                    {mainTab === 'admin'
                                        ? "Login to Demo"
                                        : merchantSubTab === 'register'
                                            ? "Generate Wallet & Join"
                                            : "Access Dashboard"}
                                    <ArrowRightIcon size={18} weight="bold" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {mainTab === 'merchant' && merchantSubTab === 'register' && (
                    <p className="text-center text-xs text-zinc-500 mt-6">
                        By joining, a new Kaspa wallet will be automatically created <br /> for your business to receive payments.
                    </p>
                )}
            </div>
        </div>
    );
}
