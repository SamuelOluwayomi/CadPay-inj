'use client';

import { useState, useEffect } from 'react';
import {
    WalletIcon,
    ArrowLeftIcon,
    FingerprintIcon,
    LockKeyIcon,
    ShieldCheckIcon,
    FileArrowUpIcon,
    LifebuoyIcon,
    CheckCircleIcon,
    WarningCircleIcon
} from '@phosphor-icons/react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useBiometricWallet } from '@/hooks/useBiometricWallet';
import { restoreKaspaWallet } from '@/utils/kaspaWallet';
import { parseRecoveryKit } from '@/utils/recoveryKit';

import { Suspense } from 'react';

type RecoveryStep = 'identify' | 'verify' | 'protect' | 'success';

export default function RecoveryPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><span className="w-8 h-8 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" /></div>}>
            <RecoveryContent />
        </Suspense>
    );
}

function RecoveryContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Auth Hooks
    const { checkEmailExists, getWalletAddress, isLoading: authLoading } = useAuth();
    const {
        createWallet,
        createWalletWithPassword,
        deleteWallet,
        checkWalletExists,
        isLoading: walletLoading
    } = useBiometricWallet();

    // State
    const [step, setStep] = useState<RecoveryStep>('identify');
    const [email, setEmail] = useState(searchParams.get('email') || '');
    const [mnemonic, setMnemonic] = useState('');
    const [authMethod, setAuthMethod] = useState<'biometric' | 'password'>('biometric');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [targetAddress, setTargetAddress] = useState<string | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);

    // Get email from URL on mount
    useEffect(() => {
        const emailParam = searchParams.get('email');
        if (emailParam) setEmail(emailParam);
    }, [searchParams]);

    // --- STEP 1: IDENTIFY ---
    const handleIdentify = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const result = await checkEmailExists(email);
        if (!result.exists) {
            setError('No account found with this email');
            return;
        }

        const address = await getWalletAddress(email);
        if (!address) {
            setError('Could not retrieve wallet address for this account');
            return;
        }

        setTargetAddress(address);
        setStep('verify');
    };

    // --- STEP 2: VERIFY MNEMONIC ---
    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsVerifying(true);
        try {
            // Give UI a moment to show loader (WASM can be blocking)
            await new Promise(r => setTimeout(r, 500));
            const restored = await restoreKaspaWallet(mnemonic.trim());

            if (restored.address !== targetAddress) {
                setError('The provided seed phrase does not match the wallet registered to this account.');
                return;
            }

            setStep('protect');
        } catch (err: any) {
            setError(err.message || 'Invalid seed phrase');
        } finally {
            setIsVerifying(false);
        }
    };

    // --- STEP 3: PROTECT & SAVE ---
    const handleProtect = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (authMethod === 'password' && password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        // Delete any stale local data first
        await deleteWallet(email);

        const result = authMethod === 'biometric'
            ? await createWallet(email, mnemonic.trim())
            : await createWalletWithPassword(email, mnemonic.trim(), password);

        if (result.success) {
            // Set active session
            localStorage.setItem('active_wallet_address', targetAddress!);
            localStorage.setItem('auth_email', email);
            setStep('success');
        } else {
            setError(result.error || 'Failed to secure wallet');
        }
    };

    // --- HELPERS ---
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            const parsed = parseRecoveryKit(content);
            if (parsed && parsed.mnemonic) {
                setMnemonic(parsed.mnemonic);
            } else {
                setError('Could not parse legacy recovery kit. Please paste the mnemonic manually.');
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Back Button */}
            <div className="absolute top-8 left-8 z-20">
                <Link href="/signin" className="group flex items-center gap-2 text-zinc-500 hover:text-white transition-colors">
                    <div className="w-8 h-8 rounded-full border border-zinc-800 flex items-center justify-center bg-zinc-900/50 group-hover:border-orange-500/50 transition-colors">
                        <ArrowLeftIcon size={16} />
                    </div>
                    <span className="text-sm font-medium">Back to Sign In</span>
                </Link>
            </div>

            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-500/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 max-w-md w-full">
                <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl space-y-8">

                    {/* Header */}
                    <div className="text-center space-y-2">
                        <div className="w-16 h-16 bg-linear-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/20">
                            <LifebuoyIcon size={32} className="text-white" weight="fill" />
                        </div>
                        <h1 className="text-3xl font-bold bg-linear-to-br from-white to-zinc-500 bg-clip-text text-transparent">
                            Wallet Recovery
                        </h1>
                        <p className="text-zinc-500 text-sm">
                            Restore access to your CadPay account
                        </p>
                    </div>

                    {/* Progress Dots */}
                    <div className="flex justify-center gap-2">
                        {(['identify', 'verify', 'protect', 'success'] as RecoveryStep[]).map((s) => (
                            <div
                                key={s}
                                className={`h-1.5 rounded-full transition-all duration-300 ${step === s ? 'w-8 bg-orange-500' : 'w-2 bg-zinc-800'
                                    }`}
                            />
                        ))}
                    </div>

                    {/* Step Content */}
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {step === 'identify' && (
                            <form onSubmit={handleIdentify} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-zinc-400 ml-1">Account Email</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50 transition-all"
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={authLoading}
                                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50"
                                >
                                    {authLoading ? 'Checking...' : 'Continue'}
                                </button>
                            </form>
                        )}

                        {step === 'verify' && (
                            <form onSubmit={handleVerify} className="space-y-6">
                                <div className="space-y-4">
                                    <div className="p-4 bg-orange-500/5 border border-orange-500/10 rounded-xl">
                                        <p className="text-xs text-orange-200/60 leading-relaxed italic">
                                            "Enter the 12-word seed phrase from your Recovery Kit to verify your ownership of the wallet."
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center px-1">
                                            <label className="text-xs font-medium text-zinc-400">Seed Phrase</label>
                                            <label className="text-xs text-orange-500 hover:text-orange-400 cursor-pointer flex items-center gap-1 font-medium">
                                                <FileArrowUpIcon size={14} />
                                                Upload Kit
                                                <input type="file" className="hidden" accept=".txt" onChange={handleFileUpload} />
                                            </label>
                                        </div>
                                        <textarea
                                            value={mnemonic}
                                            onChange={(e) => setMnemonic(e.target.value)}
                                            placeholder="word1 word2 word3..."
                                            rows={3}
                                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50 transition-all resize-none font-mono text-sm"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setStep('identify')}
                                        className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-4 rounded-xl transition-all"
                                    >
                                        Back
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isVerifying || !mnemonic}
                                        className="flex-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
                                    >
                                        {isVerifying ? (
                                            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying...</>
                                        ) : (
                                            'Verify Phrase'
                                        )}
                                    </button>
                                </div>
                            </form>
                        )}

                        {step === 'protect' && (
                            <form onSubmit={handleProtect} className="space-y-6">
                                <div className="space-y-4">
                                    <div className="text-center">
                                        <p className="text-sm text-green-400 font-medium flex items-center justify-center gap-2">
                                            <CheckCircleIcon weight="fill" /> Phrase Verified
                                        </p>
                                        <p className="text-xs text-zinc-500 mt-1">Now, choose how to secure it on this device</p>
                                    </div>

                                    <div className="p-1 bg-zinc-800/50 rounded-xl flex">
                                        <button
                                            type="button"
                                            onClick={() => setAuthMethod('biometric')}
                                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${authMethod === 'biometric' ? 'bg-zinc-700 text-white shadow-lg' : 'text-zinc-400'
                                                }`}
                                        >
                                            <FingerprintIcon size={16} /> Biometrics
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setAuthMethod('password')}
                                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${authMethod === 'password' ? 'bg-zinc-700 text-white shadow-lg' : 'text-zinc-400'
                                                }`}
                                        >
                                            <LockKeyIcon size={16} /> Password
                                        </button>
                                    </div>

                                    {authMethod === 'password' && (
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-zinc-400 ml-1">New Local Password</label>
                                            <input
                                                type="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="At least 8 characters"
                                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50 transition-all"
                                                required
                                                minLength={8}
                                            />
                                        </div>
                                    )}

                                    {authMethod === 'biometric' && (
                                        <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                            <FingerprintIcon size={20} className="text-blue-400 shrink-0 mt-0.5" />
                                            <p className="text-xs text-blue-200/80 leading-relaxed">
                                                We'll use your device's biometrics to create a new secure key.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    disabled={walletLoading}
                                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-orange-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {walletLoading ? (
                                        <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Securing...</>
                                    ) : (
                                        'Restore Wallet'
                                    )}
                                </button>
                            </form>
                        )}

                        {step === 'success' && (
                            <div className="text-center space-y-6 animate-in zoom-in duration-500">
                                <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto border-2 border-green-500/30">
                                    <ShieldCheckIcon size={40} className="text-green-500" weight="fill" />
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-bold text-white">Access Restored</h2>
                                    <p className="text-zinc-500 text-sm">
                                        Your wallet has been successfully recovered and secured on this device.
                                    </p>
                                </div>
                                <Link
                                    href="/dashboard"
                                    className="block w-full bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-orange-900/40"
                                >
                                    Go to Dashboard
                                </Link>
                            </div>
                        )}

                        {error && (
                            <div className="mt-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                                <WarningCircleIcon size={20} className="text-red-400 shrink-0" />
                                <p className="text-xs text-red-400">{error}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Info Text */}
                {step !== 'success' && (
                    <p className="text-center text-xs text-zinc-600 mt-8 leading-relaxed">
                        Recovering your wallet only affects this device. Your CadPay account and balance remain safe on the blockchain.
                        Need help? <a href="#" className="text-zinc-500 underline decoration-zinc-700 hover:text-orange-500 transition-colors">Read our guide</a>
                    </p>
                )}
            </div>
        </div>
    );
}
