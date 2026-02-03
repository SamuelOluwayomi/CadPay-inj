'use client';

import { useState } from 'react';
import { WalletIcon, ShieldCheckIcon, LightningIcon, ArrowLeftIcon, FingerprintIcon, LockKeyIcon } from '@phosphor-icons/react';
import Link from 'next/link';
import { useBiometricWallet } from '@/hooks/useBiometricWallet';
import { generateKaspaWallet } from '@/utils/kaspaWallet';
import { downloadRecoveryKit } from '@/utils/recoveryKit';

export default function CreateAccount() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [useBiometrics, setUseBiometrics] = useState(true);
    const [status, setStatus] = useState<'idle' | 'checking' | 'generating' | 'creating' | 'success' | 'error'>('idle');
    const [walletAddress, setWalletAddress] = useState<string>('');

    const {
        createWallet,
        createWalletWithPassword,
        checkWalletExists,
        checkSupport,
        isLoading,
        error
    } = useBiometricWallet();

    const handleCreateWallet = async () => {
        if (!email) {
            alert('Please enter an email address');
            return;
        }

        if (!useBiometrics && password.length < 6) {
            alert('Please enter a password of at least 6 characters');
            return;
        }

        setStatus('checking');

        // Check if biometrics are required and supported
        if (useBiometrics) {
            const support = await checkSupport();
            if (!support.supported) {
                setStatus('error');
                alert(support.reason || 'Biometric authentication is not supported on this device');
                return;
            }
        }

        // Check if wallet already exists
        const exists = await checkWalletExists(email);
        if (exists) {
            setStatus('error');
            alert('A wallet already exists for this email. Please use a different email or unlock your existing wallet.');
            return;
        }

        setStatus('generating');

        try {
            // Generate Kaspa wallet
            const kaspaWallet = await generateKaspaWallet('mainnet');
            setWalletAddress(kaspaWallet.address);

            setStatus('creating');

            // Create wallet with chosen authentication method
            const result = useBiometrics
                ? await createWallet(email, kaspaWallet.mnemonic)
                : await createWalletWithPassword(email, kaspaWallet.mnemonic, password);

            if (result.success) {
                // Auto-download recovery kit
                downloadRecoveryKit(kaspaWallet.address, kaspaWallet.mnemonic);
                setStatus('success');
            } else {
                setStatus('error');
            }
        } catch (err: any) {
            console.error('Wallet creation error:', err);
            setStatus('error');
        }
    };

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
                        A Kaspa-based subscription payment platform that makes recurring crypto payments simple and secure.
                    </p>

                    <div className="space-y-4">
                        <FeatureRow
                            icon={<ShieldCheckIcon size={20} />}
                            title="Secure Transactions"
                            desc="Built on Kaspa for fast and secure payments."
                        />
                        <FeatureRow
                            icon={<LightningIcon size={20} />}
                            title="Automated Billing"
                            desc="Set it and forget it subscription management."
                        />
                        <FeatureRow
                            icon={<WalletIcon size={20} />}
                            title="Flexible Security"
                            desc="Choose biometric or password protection."
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
                            Secure your Kaspa wallet with {useBiometrics ? 'biometric authentication' : 'a password'}
                        </p>
                    </div>

                    {status === 'idle' || status === 'checking' || status === 'generating' || status === 'creating' ? (
                        <>
                            <div className="space-y-4 mb-6">
                                {/* Email Input */}
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-2">
                                        Email Address
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="your@email.com"
                                        className="w-full px-4 py-3 bg-zinc-900/50 border border-white/10 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
                                        disabled={isLoading}
                                    />
                                </div>

                                {/* Biometric Toggle */}
                                <div className="flex items-center justify-between bg-zinc-900/50 p-3 rounded-lg border border-white/10">
                                    <span className="text-sm font-medium text-zinc-300">Use Biometric Security?</span>
                                    <button
                                        onClick={() => setUseBiometrics(!useBiometrics)}
                                        disabled={isLoading}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${useBiometrics ? 'bg-orange-500' : 'bg-zinc-600'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${useBiometrics ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </div>

                                {/* Password Input (conditional) */}
                                {!useBiometrics && (
                                    <div className="animate-in fade-in slide-in-from-top-2">
                                        <label htmlFor="password" className="block text-sm font-medium text-zinc-300 mb-2">
                                            Backup Password
                                        </label>
                                        <input
                                            id="password"
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Enter a strong password (min 6 characters)"
                                            className="w-full px-4 py-3 bg-zinc-900/50 border border-white/10 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
                                            disabled={isLoading}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Info Box */}
                            <div className="text-xs text-zinc-400 bg-zinc-800/50 p-3 rounded border border-zinc-700 mb-6">
                                ℹ️ A recovery file containing your <strong>Secret Seed Phrase</strong> will be automatically downloaded. Keep it safe!
                            </div>

                            <button
                                onClick={handleCreateWallet}
                                disabled={isLoading || !email || (!useBiometrics && password.length < 6)}
                                className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        {status === 'checking' && 'Checking...'}
                                        {status === 'generating' && 'Generating Kaspa Wallet...'}
                                        {status === 'creating' && (useBiometrics ? 'Setting up biometrics...' : 'Encrypting wallet...')}
                                    </>
                                ) : (
                                    <>
                                        {useBiometrics ? <FingerprintIcon size={20} /> : <LockKeyIcon size={20} />}
                                        Create Wallet
                                    </>
                                )}
                            </button>

                            {error && (
                                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                                    <p className="text-sm text-red-400 text-center">{error}</p>
                                </div>
                            )}
                        </>
                    ) : status === 'success' ? (
                        <div className="text-center">
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
                            <Link
                                href="/dashboard"
                                className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-xl transition-all"
                            >
                                Go to Dashboard
                            </Link>
                        </div>
                    ) : (
                        <div className="text-center">
                            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
                                <span className="text-2xl">⚠️</span>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Error</h3>
                            <p className="text-sm text-zinc-400 mb-6">{error}</p>
                            <button
                                onClick={() => {
                                    setStatus('idle');
                                    setEmail('');
                                    setPassword('');
                                }}
                                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-xl transition-all"
                            >
                                Try Again
                            </button>
                        </div>
                    )}

                    <div className="mt-8 pt-6 border-t border-white/5 text-center">
                        <p className="text-xs text-zinc-500">
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
