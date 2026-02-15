'use client';

import { useState, useEffect } from 'react';
import { WalletIcon, ShieldCheckIcon, LightningIcon, ArrowLeftIcon, FingerprintIcon, LockKeyIcon, CheckCircleIcon, WarningCircleIcon } from '@phosphor-icons/react';
import Link from 'next/link';
import { useBiometricWallet } from '@/hooks/useBiometricWallet';
import { generateKaspaWallet } from '@/utils/kaspaWallet';
import { downloadRecoveryKit } from '@/utils/recoveryKit';
import ConnectKasWare from '@/components/ConnectKasWare';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function CreateAccount() {
    const router = useRouter(); // Initialize router
    // Mode state: 'selection' (initial) or 'create' (form)
    const [mode, setMode] = useState<'selection' | 'create'>('selection');

    // ... (keep state vars)
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [useBiometrics, setUseBiometrics] = useState(true);
    const [status, setStatus] = useState<'idle' | 'checking' | 'generating' | 'creating' | 'success' | 'error'>('idle');
    const [walletAddress, setWalletAddress] = useState<string>('');
    const [walletMnemonic, setWalletMnemonic] = useState<string>('');
    const [errorMessage, setErrorMessage] = useState('');
    const [isBiometricsSupported, setIsBiometricsSupported] = useState(false);

    // ... (keep usage of useBiometricWallet)
    const {
        createWallet,
        createWalletWithPassword,
        checkWalletExists,
        checkSupport,
        isLoading
    } = useBiometricWallet();

    // Check biometric support on mount
    useEffect(() => {
        checkSupport().then((result) => {
            setIsBiometricsSupported(result.supported);
        });
    }, []);

    const handleCreateWallet = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage('');

        if (!email) {
            setErrorMessage('Please enter your email');
            return;
        }

        if (!useBiometrics && !password) {
            setErrorMessage('Please enter a password');
            return;
        }

        setStatus('checking');

        // Check if biometrics are required and supported
        if (useBiometrics && !isBiometricsSupported) {
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
            // 1. Generate Kaspa Wallet (Client Side)
            const wallet = await generateKaspaWallet();
            setWalletAddress(wallet.address);
            setWalletMnemonic(wallet.mnemonic);

            console.log('✅ Generated wallet:', wallet.address);

            // 2. Create Biometric/Password Access
            if (useBiometrics) {
                setStatus('creating'); // Update status for UI feedback
                console.log('🔐 Creating biometric passkey...');
                // Prompt user for biometrics
                const result = await createWallet(email, wallet.mnemonic);
                if (!result.success) {
                    throw new Error(result.error || 'Failed to create biometric passkey');
                }
            } else {
                console.log('🔐 Encrypting with password...');
                const result = await createWalletWithPassword(email, wallet.mnemonic, password);
                if (!result.success) {
                    throw new Error(result.error || 'Failed to create password-protected wallet');
                }
            }

            setStatus('creating');

            // 3. Create Supabase Auth Account
            const authPassword = useBiometrics
                ? crypto.randomUUID()
                : password;

            // Remove invisible characters and whitespace
            const cleanEmail = email.replace(/[\u200B-\u200D\uFEFF]/g, '').trim().toLowerCase();
            console.log('Attempting Supabase signup with email:', cleanEmail);

            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: cleanEmail,
                password: authPassword,
                options: {
                    data: {
                        wallet_address: wallet.address,
                        auth_method: useBiometrics ? 'biometric' : 'password'
                    }
                }
            });

            if (authError) {
                console.error('Supabase Auth signup failed:', authError);
                setStatus('error');
                setErrorMessage('Failed to create authentication account: ' + authError.message);
                return;
            }

            // 2. Store credentials in profiles (for compatibility)
            const { hashPassword } = await import('@/utils/passwordHash');
            const passwordHash = useBiometrics ? null : await hashPassword(password);

            if (authData.user) {
                const { error: credError } = await supabase
                    .from('profiles')
                    .insert([
                        {
                            id: authData.user.id, // REQUIRED: Link to Auth ID
                            email: cleanEmail,
                            wallet_address: wallet.address, // Frontend-generated wallet address
                            auth_method: useBiometrics ? 'biometric' : 'password',
                            password_hash: passwordHash,
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

            // 2. Set Active Session (Local Storage)
            localStorage.setItem('auth_email', cleanEmail);

            // 6. Auto-download recovery kit and Finish
            setStatus('success');

            // Trigger download immediately
            console.log('📥 Triggering auto-download of recovery kit...');
            try {
                downloadRecoveryKit(wallet.address, wallet.mnemonic);
            } catch (e) {
                console.error('Auto-download failed:', e);
            }

            // 7. Redirect to Dashboard
            setTimeout(() => {
                router.push('/dashboard');
            }, 2500);

            // REMOVED ORPHANED BLOCK
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
                        <p className="text-zinc-500 text-sm">Secure Biometric & Web3 Payments</p>
                    </div>

                    <div className="space-y-4">
                        {/* OPTION A: Connect Existing Wallet */}
                        <div className="space-y-2">
                            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest pl-1">Existing User</p>
                            <ConnectKasWare />
                        </div>

                        <div className="relative py-4">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-zinc-800"></span>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-black px-2 text-zinc-500">Or New Account</span>
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
                            <span className="text-zinc-300 group-hover:text-white font-medium">Create New Biometric Account</span>
                        </button>

                        <div className="text-center pt-4">
                            <Link href="/signin" className="text-sm text-zinc-500 hover:text-white transition-colors">
                                Already have a biometric account? <span className="text-orange-500">Sign In</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 2. CREATE FORM SCREEN (Biometric/Password)
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
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
            </div>

            <div className="w-full max-w-md relative z-10">
                <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-orange-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-orange-500/20">
                            <WalletIcon size={32} className="text-orange-500" />
                        </div>
                        <h1 className="text-2xl font-bold bg-linear-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                            Create Wallet
                        </h1>
                        <p className="text-sm text-zinc-400 mt-2">
                            {status === 'success' ? 'Wallet created successfully!' : 'Secure, fast, and biometric-ready.'}
                        </p>
                    </div>

                    {status === 'success' ? (
                        <div className="text-center animate-in fade-in zoom-in duration-300">
                            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/30">
                                <ShieldCheckIcon size={32} className="text-green-500" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Wallet Created!</h3>
                            <p className="text-sm text-zinc-400 mb-4">
                                Your Kaspa wallet has been created and secured with {useBiometrics ? 'biometric protection' : 'password protection'}.
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

                            {/* Authentication Method Selection */}
                            <div className="p-1 bg-zinc-800/50 rounded-xl flex">
                                <button
                                    type="button"
                                    onClick={() => setUseBiometrics(true)}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${useBiometrics
                                        ? 'bg-zinc-700 text-white shadow-lg'
                                        : 'text-zinc-400 hover:text-white'
                                        }`}
                                >
                                    <FingerprintIcon size={16} /> Biometrics
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setUseBiometrics(false)}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${!useBiometrics
                                        ? 'bg-zinc-700 text-white shadow-lg'
                                        : 'text-zinc-400 hover:text-white'
                                        }`}
                                >
                                    <LockKeyIcon size={16} /> Password
                                </button>
                            </div>

                            {/* Password Field (only if not using biometrics) */}
                            {!useBiometrics && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                    <label className="text-xs font-medium text-zinc-400 ml-1">Password</label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Min. 8 characters"
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all"
                                        required={!useBiometrics}
                                        minLength={8}
                                    />
                                </div>
                            )}

                            {/* Biometric Info */}
                            {useBiometrics && (
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                        <FingerprintIcon size={20} className="text-blue-400 shrink-0 mt-0.5" />
                                        <p className="text-xs text-blue-200/80 leading-relaxed">
                                            We'll use your device's secure element (FaceID, TouchID) to create a passkey. No password required.
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                                        <WarningCircleIcon size={20} className="text-orange-400 shrink-0 mt-0.5" />
                                        <div className="space-y-1">
                                            <p className="text-xs font-bold text-orange-300">Important: Local Storage</p>
                                            <p className="text-[10px] text-orange-200/70 leading-relaxed">
                                                Biometric keys are stored <span className="text-orange-300 font-semibold">locally in this browser</span>.
                                                If you use Incognito mode or clear your browser data, you will lose access and must use your Recovery Kit.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

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
                                    <>Create Wallet</>
                                ) : (
                                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...</>
                                )}
                            </button>
                        </form>
                    )}
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
