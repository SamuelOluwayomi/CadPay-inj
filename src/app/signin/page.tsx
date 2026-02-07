'use client';

import { useState, useEffect } from 'react';
import { LockKeyIcon, FingerprintIcon, ArrowLeftIcon, WalletIcon } from '@phosphor-icons/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import ConnectKasWare from '@/components/ConnectKasWare';

export default function SignIn() {
    const router = useRouter();
    const { signInWithPassword, signInWithBiometric, checkEmailExists, isLoading, error } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [authMethod, setAuthMethod] = useState<'password' | 'biometric' | null>(null);
    const [checkingEmail, setCheckingEmail] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // Check email when user enters it
    const handleEmailCheck = async () => {
        if (!email) return;

        setCheckingEmail(true);
        setErrorMessage('');

        const result = await checkEmailExists(email);
        if (result.exists && result.authMethod) {
            setAuthMethod(result.authMethod);
        } else {
            setErrorMessage('No account found with this email');
            setAuthMethod(null);
        }

        setCheckingEmail(false);
    };

    // Handle sign in
    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage('');

        if (!authMethod) {
            setErrorMessage('Please enter your email first');
            return;
        }

        let result;
        if (authMethod === 'password') {
            if (!password) {
                setErrorMessage('Please enter your password');
                return;
            }
            result = await signInWithPassword(email, password);
        } else {
            result = await signInWithBiometric(email);
        }

        if (result.success) {
            // Redirect to dashboard
            router.push('/dashboard');
        } else {
            setErrorMessage(result.error || 'Sign in failed');
        }
    };

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Back to Home Button */}
            <div className="absolute top-8 left-8 z-20">
                <Link href="/" className="group flex items-center gap-2 text-zinc-500 hover:text-white transition-colors">
                    <div className="w-8 h-8 rounded-full border border-zinc-800 flex items-center justify-center bg-zinc-900/50 group-hover:border-orange-500/50 transition-colors">
                        <ArrowLeftIcon size={16} />
                    </div>
                    <span className="text-sm font-medium">Home</span>
                </Link>
            </div>

            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-900/10 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 max-w-md w-full space-y-8 animate-in fade-in zoom-in duration-500">
                <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-linear-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-orange-500/20">
                        <WalletIcon size={32} className="text-white" weight="fill" />
                    </div>
                    <h1 className="text-4xl font-bold bg-linear-to-br from-white to-zinc-500 bg-clip-text text-transparent">
                        Welcome Back
                    </h1>
                    <p className="text-zinc-500 text-sm">Sign in to your CadPay account</p>
                </div>

                <div className="space-y-4">
                    {/* OPTION A: Connect KasWare Wallet */}
                    <div className="space-y-2">
                        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest pl-1">Wallet Login</p>
                        <ConnectKasWare />
                    </div>

                    <div className="relative py-4">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-zinc-800"></span>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-black px-2 text-zinc-500">Or Email Login</span>
                        </div>
                    </div>

                    {/* OPTION B: Email + Password/Biometric */}
                    <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                        <form onSubmit={handleSignIn} className="space-y-4">
                            {/* Email Field */}
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-zinc-400 ml-1">Email Address</label>
                                <div className="flex gap-2">
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => {
                                            setEmail(e.target.value);
                                            setAuthMethod(null);
                                        }}
                                        onBlur={handleEmailCheck}
                                        placeholder="you@example.com"
                                        className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all"
                                        required
                                    />
                                    {checkingEmail && (
                                        <div className="flex items-center px-3">
                                            <span className="w-4 h-4 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Auth Method Display */}
                            {authMethod && (
                                <div className="flex items-center gap-3 p-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl">
                                    {authMethod === 'password' ? (
                                        <LockKeyIcon size={20} className="text-orange-500" />
                                    ) : (
                                        <FingerprintIcon size={20} className="text-blue-500" />
                                    )}
                                    <p className="text-sm text-zinc-300">
                                        This account uses <span className="font-semibold">{authMethod}</span> authentication
                                    </p>
                                </div>
                            )}

                            {/* Password Field (only if password auth) */}
                            {authMethod === 'password' && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                    <label className="text-xs font-medium text-zinc-400 ml-1">Password</label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter your password"
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all"
                                        required
                                    />
                                </div>
                            )}

                            {/* Biometric Info */}
                            {authMethod === 'biometric' && (
                                <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                    <FingerprintIcon size={20} className="text-blue-400 shrink-0 mt-0.5" />
                                    <p className="text-xs text-blue-200/80 leading-relaxed">
                                        Click "Sign In" to authenticate with your device biometrics (FaceID, TouchID, etc.)
                                    </p>
                                </div>
                            )}

                            {(errorMessage || error) && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
                                    <p className="text-xs text-red-400">{errorMessage || error}</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={!authMethod || isLoading}
                                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-orange-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                            >
                                {isLoading ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Signing in...
                                    </>
                                ) : (
                                    'Sign In'
                                )}
                            </button>
                        </form>
                    </div>

                    <div className="text-center pt-4">
                        <Link href="/create" className="text-sm text-zinc-500 hover:text-white transition-colors">
                            Don't have an account? <span className="text-orange-500">Create Account</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
