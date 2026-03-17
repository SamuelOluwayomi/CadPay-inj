'use client';

import { useState, useEffect } from 'react';
import { WalletIcon, ShieldCheckIcon, LightningIcon, ArrowLeftIcon, FingerprintIcon, LockKeyIcon, CheckCircleIcon, WarningCircleIcon } from '@phosphor-icons/react';
import Link from 'next/link';
import { useBiometricWallet } from '@/hooks/useBiometricWallet';
import { generateInjectiveWallet } from '@/utils/injectiveWallet';
import { downloadRecoveryKit } from '@/utils/recoveryKit';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function CreateAccount() {
    const router = useRouter();
    const { signInWithGoogle } = useAuth();
    
    // Mode state: 'selection' (initial) or 'create' (form)
    const [mode, setMode] = useState<'selection' | 'create'>('selection');

    const [email, setEmail] = useState('');
    const [useBiometrics, setUseBiometrics] = useState(true);
    const [status, setStatus] = useState<'idle' | 'checking' | 'generating' | 'creating' | 'success' | 'error'>('idle');
    const [walletAddress, setWalletAddress] = useState<string>('');
    const [walletMnemonic, setWalletMnemonic] = useState<string>('');
    const [errorMessage, setErrorMessage] = useState('');
    const [isBiometricsSupported, setIsBiometricsSupported] = useState(false);

    const {
        createWallet,
        checkWalletExists,
        checkSupport,
        isLoading
    } = useBiometricWallet();

    // Check biometric support on mount
    useEffect(() => {
        checkSupport().then((result) => {
            setIsBiometricsSupported(result.supported);
        });
    }, [checkSupport]);

    const handleCreateWallet = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage('');

        if (!email) {
            setErrorMessage('Please enter your email');
            return;
        }

        setStatus('checking');

        // Check if biometrics are required and supported
        if (!isBiometricsSupported) {
            setStatus('error');
            setErrorMessage('Biometric authentication is not supported on this device');
            return;
        }

        // Check if wallet already exists
        const exists = await checkWalletExists(email);
        if (exists) {
            setStatus('error');
            setErrorMessage('A wallet with this email already exists');
            return;
        }

        setStatus('generating');

        try {
            // 1. Generate Injective Wallet (Client Side)
            const wallet = await generateInjectiveWallet();
            setWalletAddress(wallet.address);
            setWalletMnemonic(wallet.mnemonic);

            console.log('✅ Generated wallet:', wallet.address);

            // 2. Create Biometric Access
            setStatus('creating'); 
            console.log('🔐 Creating biometric passkey...');
            const result = await createWallet(email, wallet.mnemonic);
            if (!result.success) {
                throw new Error(result.error || 'Failed to create biometric passkey');
            }

            // 3. Create Supabase Auth Account
            const authPassword = wallet.address.replace(/[^a-zA-Z0-9]/g, '').slice(0, 32);
            const cleanEmail = email.replace(/[\u200B-\u200D\uFEFF]/g, '').trim().toLowerCase();

            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: cleanEmail,
                password: authPassword,
                options: {
                    data: {
                        wallet_address: wallet.address,
                        auth_method: 'biometric'
                    }
                }
            });

            if (authError) {
                console.error('Supabase Auth signup failed:', authError);
                setStatus('error');
                setErrorMessage('Failed to create authentication account: ' + authError.message);
                return;
            }

            if (authData.user) {
                const { error: credError } = await supabase
                    .from('profiles')
                    .insert([
                        {
                            id: authData.user.id,
                            email: cleanEmail,
                            wallet_address: wallet.address,
                            auth_method: 'biometric',
                            updated_at: new Date().toISOString()
                        }
                    ]);

                if (credError) {
                    console.error('Failed to store credentials:', credError);
                    setStatus('error');
                    setErrorMessage('Failed to save account credentials');
                    return;
                }
            }

            // 4. Set Active Session (Local Storage)
            localStorage.setItem('auth_email', cleanEmail);

            // 5. Success State
            setStatus('success');

            // Trigger download
            console.log('📥 Triggering auto-download of recovery kit...');
            try {
                downloadRecoveryKit(wallet.address, wallet.mnemonic);
            } catch (e) {
                console.error('Auto-download failed:', e);
            }

            // 6. Redirect to Dashboard
            setTimeout(() => {
                router.push('/dashboard');
            }, 2500);

        } catch (error: any) {
            console.error('Wallet creation failed:', error);
            setStatus('error');
            setErrorMessage(error.message || 'Failed to generate wallet');
        }
    };

    // 1. SELECTION SCREEN
    if (mode === 'selection') {
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
                            CadPay
                        </h1>
                        <p className="text-zinc-500 text-sm">Secure Biometric & Google Payments</p>
                    </div>

                    <div className="space-y-4">
                        {/* OPTION A: Google Signup (Recommended) */}
                        <div className="space-y-2">
                            <button 
                                onClick={() => signInWithGoogle()}
                                className="group relative w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-white text-black font-bold rounded-xl transition-all hover:bg-zinc-200 active:scale-[0.98]"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                Continue with Google
                            </button>
                        </div>

                        <div className="relative py-4">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-zinc-800"></span>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-black px-2 text-zinc-500">Or Biometric Signup</span>
                            </div>
                        </div>

                        {/* OPTION B: Create New Biometric Wallet */}
                        <button
                            onClick={() => setMode('create')}
                            className="w-full p-4 rounded-xl border border-dashed border-zinc-700 hover:border-orange-500/50 hover:bg-orange-900/10 transition-all flex items-center justify-center gap-2 group h-[72px]"
                        >
                            <span className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-orange-500 group-hover:text-white transition-colors">
                                <FingerprintIcon size={20} weight="bold" />
                            </span>
                            <span className="text-zinc-300 group-hover:text-white font-medium">Create Device Passkey</span>
                        </button>

                        <div className="text-center pt-4">
                            <Link href="/signin" className="text-sm text-zinc-500 hover:text-white transition-colors">
                                Already have an account? <span className="text-orange-500">Sign In</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 2. CREATE FORM SCREEN
    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 relative overflow-hidden">
            {/* Back Button */}
            <button
                onClick={() => setMode('selection')}
                className="absolute top-8 left-8 text-zinc-500 hover:text-white flex items-center gap-2 transition-colors z-20"
            >
                <ArrowLeftIcon /> Back
            </button>

            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-500/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-900/10 rounded-full blur-[120px]" />
            </div>

            <div className="w-full max-w-md relative z-10">
                <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-orange-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-orange-500/20">
                            <WalletIcon size={32} className="text-orange-500" />
                        </div>
                        <h1 className="text-2xl font-bold bg-linear-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                            Create Biometric Account
                        </h1>
                        <p className="text-sm text-zinc-400 mt-2">
                            {status === 'success' ? 'Account created successfully!' : 'Secure, fast, and biometric-ready.'}
                        </p>
                    </div>

                    {status === 'success' ? (
                        <div className="text-center animate-in fade-in zoom-in duration-300">
                            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/30">
                                <ShieldCheckIcon size={32} className="text-green-500" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Account Ready!</h3>
                            <p className="text-sm text-zinc-400 mb-4">
                                Your CadPay account is secured with biometric protection.
                            </p>
                            {walletAddress && (
                                <div className="bg-zinc-900/50 p-3 rounded-lg border border-white/10 mb-6">
                                    <p className="text-xs text-zinc-500 mb-1">Your Wallet Address:</p>
                                    <p className="text-xs text-orange-500 font-mono break-all">{walletAddress}</p>
                                </div>
                            )}
                            <p className="text-xs text-zinc-500 mb-6">
                                📥 Your recovery kit has been downloaded. Keep it safe!
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => downloadRecoveryKit(walletAddress, walletMnemonic)}
                                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-3 px-6 rounded-xl transition-all border border-zinc-700"
                                >
                                    Download Again
                                </button>
                                <Link
                                    href="/dashboard"
                                    className="flex-1 text-center bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-xl transition-all"
                                >
                                    Go to Dashboard
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleCreateWallet} className="space-y-6">
                            {/* Email Field */}
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-zinc-400 ml-1">Email Address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all"
                                    required
                                />
                            </div>

                            {/* Biometric Info (Mandatory) */}
                            <div className="space-y-3">
                                <div className="flex items-start gap-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                                    <FingerprintIcon size={20} className="text-orange-400 shrink-0 mt-0.5" />
                                    <p className="text-xs text-orange-200/80 leading-relaxed">
                                        We'll use your device's secure element (FaceID, TouchID) to create a passkey. No password required.
                                    </p>
                                </div>
                                <div className="flex items-start gap-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                                    <WarningCircleIcon size={20} className="text-orange-400 shrink-0 mt-0.5" />
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-orange-300">Important: Local Storage</p>
                                        <p className="text-[10px] text-orange-200/70 leading-relaxed">
                                            Biometric keys are stored <span className="text-orange-300 font-semibold">locally in this browser</span>.
                                            If you clear browser data, you must use your Recovery Kit.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {errorMessage && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
                                    <p className="text-xs text-red-400">{errorMessage}</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={status !== 'idle' && status !== 'error'}
                                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-orange-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                            >
                                {status === 'idle' || status === 'error' ? (
                                    <>Verify Biometrics</>
                                ) : (
                                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating Account...</>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
