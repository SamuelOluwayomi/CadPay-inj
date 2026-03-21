'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
    StorefrontIcon, UserCircleIcon, ArrowRightIcon, SpinnerIcon, 
    LockKeyIcon, ArrowLeftIcon, InfoIcon, FingerprintIcon 
} from '@phosphor-icons/react';
import { useMerchant } from '@/context/MerchantContext';
import { useAuth } from '@/hooks/useAuth';
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
    const { signInWithGoogle, signInWithBiometric, signInWithPassword } = useAuth();

    // Pre-fill demo credentials on mount
    useEffect(() => {
        if (mainTab === 'admin') {
            setEmail('demo@cadpay.xyz');
            setPassword('demo123');
        } else {
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
                const success = await loginMerchant(email, password);
                if (!success) throw new Error("Invalid credentials.");
            } else {
                if (merchantSubTab === 'register') {
                    // This will now create the Supabase Auth account AND the Merchant profile + Wallet
                    await createMerchant(name, email, password);
                } else {
                    const result = await signInWithPassword(email, password);
                    if (!result.success) throw new Error(result.error || "Login failed");
                }
            }
            router.push('/merchant');
        } catch (err: any) {
            setError(err.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        try {
            await signInWithGoogle();
        } catch (err: any) {
            setError(err.message || 'Google login failed');
            setLoading(false);
        }
    };

    const handleBiometricLogin = async () => {
        if (!email) {
            setError("Please enter your business email first");
            return;
        }
        setLoading(true);
        try {
            const result = await signInWithBiometric(email);
            if (result.success) router.push('/merchant');
            else throw new Error(result.error);
        } catch (err: any) {
            setError(err.message || 'Biometric login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
            {/* Background Decoration */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-orange-500/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[10%] right-[10%] w-[40%] h-[40%] bg-orange-900/10 rounded-full blur-[100px]" />
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
                    <p className="text-zinc-400 text-sm">
                        {mainTab === 'admin'
                            ? "Manage your subscriptions and revenue."
                            : merchantSubTab === 'register'
                                ? "Expand your reach and accept Injective globally."
                                : "Access your business dashboard."}
                    </p>
                </div>

                <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-2xl md:rounded-3xl shadow-xl">
                    {/* MAIN TABS */}
                    <div className="flex bg-black/40 p-1 rounded-xl mb-6">
                        <button
                            onClick={() => setMainTab('admin')}
                            className={`flex-1 py-2 px-3 rounded-lg text-xs md:text-sm font-bold transition-all ${mainTab === 'admin' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            ADMIN DEMO
                        </button>
                        <button
                            onClick={() => setMainTab('merchant')}
                            className={`flex-1 py-2 px-3 rounded-lg text-xs md:text-sm font-bold transition-all ${mainTab === 'merchant' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            REAL MERCHANT
                        </button>
                    </div>

                    {mainTab === 'merchant' && (
                        <div className="space-y-4 mb-6">
                            <button 
                                onClick={handleGoogleLogin}
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-3 bg-white text-black font-bold py-3 rounded-xl hover:bg-zinc-200 transition-all active:scale-[0.98] disabled:opacity-50"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                Continue with Google
                            </button>
                            
                            <div className="relative py-2">
                                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/5"></span></div>
                                <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest"><span className="bg-zinc-900 px-2 text-zinc-500">Or Business Profile</span></div>
                            </div>
                        </div>
                    )}

                    {/* SUB-TABS for Merchant */}
                    {mainTab === 'merchant' && (
                        <div className="flex bg-black/40 p-1 rounded-xl mb-6">
                            <button
                                onClick={() => setMerchantSubTab('signin')}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${merchantSubTab === 'signin' ? 'bg-zinc-800 text-white px-4' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                Sign In
                            </button>
                            <button
                                onClick={() => setMerchantSubTab('register')}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${merchantSubTab === 'register' ? 'bg-zinc-800 text-white px-4' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                New Business
                            </button>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {mainTab === 'merchant' && merchantSubTab === 'register' && (
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Business Name</label>
                                <div className="relative">
                                    <input
                                        type="text" value={name} onChange={(e) => setName(e.target.value)}
                                        placeholder="Acme Corp" required
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 pl-11 text-white focus:border-orange-500/50 focus:outline-none transition-colors"
                                    />
                                    <StorefrontIcon size={20} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Email Address</label>
                            <div className="relative">
                                <input
                                    type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                    placeholder={mainTab === 'admin' ? "demo@cadpay.xyz" : "founder@startup.com"} required
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 pl-11 text-white focus:border-orange-500/50 focus:outline-none transition-colors"
                                />
                                <UserCircleIcon size={20} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                            </div>
                        </div>

                        {merchantSubTab === 'signin' && (
                            <div className="flex justify-end pt-1">
                                <button 
                                    type="button" onClick={handleBiometricLogin}
                                    className="text-[10px] font-bold text-orange-500 hover:underline flex items-center gap-1"
                                >
                                    <FingerprintIcon size={14} /> Use Biometrics
                                </button>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">{merchantSubTab === 'register' ? 'Create Password' : 'Password'}</label>
                            <div className="relative">
                                <input
                                    type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••" required
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 pl-11 text-white focus:border-orange-500/50 focus:outline-none transition-colors"
                                />
                                <LockKeyIcon size={20} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-medium text-center">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit" disabled={loading}
                            className="w-full bg-orange-600 text-white font-bold py-3.5 rounded-xl hover:bg-orange-500 transition-all flex items-center justify-center gap-2 mt-2 shadow-lg shadow-orange-600/20 active:scale-[0.98] disabled:opacity-50"
                        >
                            {loading ? <SpinnerIcon size={20} className="animate-spin" /> : (
                                <>
                                    {mainTab === 'admin' ? "Login to Demo" : merchantSubTab === 'register' ? "Get Business Wallet" : "Access Dashboard"}
                                    <ArrowRightIcon size={18} weight="bold" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {mainTab === 'merchant' && merchantSubTab === 'register' && (
                    <p className="text-center text-[10px] text-zinc-500 mt-6 leading-relaxed">
                        By joining, a new Injective wallet will be automatically created <br /> 
                        for your business to receive payments via the Injective SDK.
                    </p>
                )}
            </div>
        </div>
    );
}
