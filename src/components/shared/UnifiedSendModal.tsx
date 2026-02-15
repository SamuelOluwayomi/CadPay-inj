'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    XIcon, PaperPlaneTiltIcon, WalletIcon, PiggyBankIcon,
    CaretRightIcon, WarningIcon, CheckCircleIcon, LockKeyIcon, FingerprintIcon
} from '@phosphor-icons/react';
import { initKaspaWasm, signTransaction } from '@/lib/kaspa-wallet';
import { useBiometricWallet } from '@/hooks/useBiometricWallet';
import { supabase } from '@/lib/supabase';


interface UnifiedSendModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSend: (recipient: string, amount: number, isSavings: boolean) => Promise<void>;
    pots: any[];
    balance: number;
}

export default function UnifiedSendModal({ isOpen, onClose, onSend, pots, balance }: UnifiedSendModalProps) {
    const [mode, setMode] = useState<'external' | 'savings'>('external');
    const [step, setStep] = useState<'details' | 'password' | 'signing'>('details');
    const [recipient, setRecipient] = useState('');
    const [selectedPot, setSelectedPot] = useState<any>(null);
    const [amount, setAmount] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);

    const { unlockWalletWithPassword, unlockWallet, checkSupport, hasBiometricWallet } = useBiometricWallet();

    // Get user email from Supabase session and check biometric support
    useEffect(() => {
        async function initialize() {
            const { data: { user } } = await supabase.auth.getUser();
            setUserEmail(user?.email || null);

            // Check if this user has biometric auth enabled in database
            if (user?.email) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('auth_method')
                    .eq('auth_user_id', user.id)
                    .single();

                // Show biometric button only if auth_method is 'biometric' AND device supports it
                const supportResult = await checkSupport();
                setIsBiometricAvailable(
                    supportResult.supported && profile?.auth_method === 'biometric'
                );
            }
        }
        if (isOpen) {
            initialize();
        }
    }, [isOpen, checkSupport]);

    // Use KAS balance for validation
    const availableBalance = balance;

    const handleContinue = () => {
        setError(null);
        const targetRecipient = mode === 'savings' ? selectedPot?.address : recipient;
        const numAmount = parseFloat(amount);

        if (!targetRecipient) {
            setError(mode === 'savings' ? 'Please select a savings pot' : 'Please enter a recipient address');
            return;
        }
        if (isNaN(numAmount) || numAmount <= 0) {
            setError('Please enter a valid amount');
            return;
        }
        if (numAmount > availableBalance) {
            setError(`Insufficient balance. You have ${availableBalance.toFixed(2)} KAS but need ${numAmount.toFixed(2)} KAS.`);
            return;
        }

        // Move to password step
        setStep('password');
    };

    const handleBiometricUnlockAndSign = async () => {
        setError(null);
        setStep('signing');
        setIsSubmitting(true);

        try {
            const targetRecipient = mode === 'savings' ? selectedPot?.address : recipient;
            const numAmount = parseFloat(amount);

            if (!userEmail) {
                throw new Error('User not authenticated');
            }

            // 1. Initialize WASM SDK
            await initKaspaWasm();

            // 2. Unlock with biometrics using Supabase auth email
            const unlockResult = await unlockWallet(userEmail);

            if (!unlockResult.success || !unlockResult.mnemonic) {
                throw new Error(unlockResult.error || 'Failed to unlock wallet with biometrics');
            }

            // 3. Sign and broadcast transaction directly to Kaspa network
            const txId = await signTransaction({
                seedPhrase: unlockResult.mnemonic,
                recipient: targetRecipient!,
                amount: numAmount,
                networkType: 'testnet-10'
            });

            console.log('🚀 Transaction complete! TxID:', txId);

            // Success! Call the original onSend callback for UI updates
            await onSend(targetRecipient!, numAmount, mode === 'savings');

            // Close modal
            onClose();
        } catch (err: any) {
            console.error('Biometric unlock error:', err);
            setError(err.message || 'Biometric authentication failed');
            setStep('password');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSignAndSend = async () => {
        setError(null);
        setStep('signing');
        setIsSubmitting(true);

        try {
            const targetRecipient = mode === 'savings' ? selectedPot?.address : recipient;
            const numAmount = parseFloat(amount);

            if (!userEmail) {
                throw new Error('User not authenticated');
            }

            // 1. Initialize WASM SDK
            await initKaspaWasm();

            // 2. Unlock wallet with password to get seed phrase
            const unlockResult = await unlockWalletWithPassword(userEmail, password);

            if (!unlockResult.success || !unlockResult.mnemonic) {
                throw new Error(unlockResult.error || 'Failed to unlock wallet. Check your password.');
            }

            // 3. Sign and broadcast transaction directly to Kaspa network
            const txId = await signTransaction({
                seedPhrase: unlockResult.mnemonic,
                recipient: targetRecipient!,
                amount: numAmount,
                networkType: 'testnet-10'
            });

            console.log('🚀 Transaction complete! TxID:', txId);

            // Success! Call the original onSend callback for UI updates
            await onSend(targetRecipient!, numAmount, mode === 'savings');

            // Reset and close
            setStep('details');
            setAmount('');
            setPassword('');
            setSelectedPot(null);
            setRecipient('');
            onClose();

        } catch (e: any) {
            console.error('Transaction error:', e);
            setError(e.message || 'Transaction failed');
            setStep('password'); // Go back to password step on error
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBack = () => {
        if (step === 'password') {
            setStep('details');
            setPassword('');
            setError(null);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        onClick={(e) => {
                            if (e.target === e.currentTarget) onClose();
                        }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    >
                        <div className="bg-[#1a1b1f] border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-2xl font-bold text-white">
                                    {step === 'password' ? 'Confirm with Password' : step === 'signing' ? 'Signing Transaction' : 'Send Funds'}
                                </h2>
                                <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
                                    <XIcon size={24} />
                                </button>
                            </div>

                            {step === 'details' && (
                                <>
                                    {/* Mode Toggle */}
                                    <div className="flex p-1 bg-black/40 rounded-2xl mb-8 border border-white/5">
                                        <button
                                            onClick={() => setMode('external')}
                                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${mode === 'external'
                                                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                                                : 'text-zinc-500 hover:text-zinc-300'
                                                }`}
                                        >
                                            <WalletIcon weight="bold" /> External
                                        </button>
                                        {pots.length > 0 && (
                                            <button
                                                onClick={() => setMode('savings')}
                                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${mode === 'savings'
                                                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                                                    : 'text-zinc-500 hover:text-zinc-300'
                                                    }`}
                                            >
                                                <PiggyBankIcon weight="bold" /> Savings Pot
                                            </button>
                                        )}
                                    </div>

                                    <div className="space-y-6">
                                        {mode === 'external' ? (
                                            <div>
                                                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Recipient Address</label>
                                                <div className="relative">
                                                    <input
                                                        placeholder="kaspatest:qzsv8nxe2qpe2qwproh...."
                                                        className="w-full bg-zinc-900/60 border border-white/10 p-4 rounded-2xl text-white text-sm focus:outline-none focus:border-orange-500/50 transition-all font-mono"
                                                        value={recipient}
                                                        onChange={(e) => setRecipient(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Select Savings Pot</label>
                                                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                                    {pots.map((pot) => (
                                                        <button
                                                            key={pot.name}
                                                            onClick={() => setSelectedPot(pot)}
                                                            className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${selectedPot?.name === pot.name
                                                                ? 'bg-orange-500/10 border-orange-500/40'
                                                                : 'bg-white/5 border-white/5 hover:border-white/10'
                                                                }`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center text-orange-400">
                                                                    <PiggyBankIcon size={18} />
                                                                </div>
                                                                <div className="text-left">
                                                                    <p className="text-sm font-bold text-white">{pot.name}</p>
                                                                    <p className="text-[10px] text-zinc-500">{pot.balance.toFixed(2)} KAS</p>
                                                                </div>
                                                            </div>
                                                            {selectedPot?.name === pot.name && <CheckCircleIcon size={20} className="text-orange-500" weight="fill" />}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Amount (KAS)</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    placeholder="0.00"
                                                    className="w-full bg-zinc-900/60 border border-white/10 p-4 rounded-2xl text-white text-3xl font-bold focus:outline-none focus:border-orange-500/50 transition-all text-center"
                                                    value={amount}
                                                    onChange={(e) => setAmount(e.target.value)}
                                                />
                                                <button
                                                    onClick={() => setAmount(availableBalance.toString())}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-bold text-zinc-400 uppercase tracking-wider transition-all"
                                                >
                                                    Max
                                                </button>
                                            </div>
                                            <p className="text-[10px] text-zinc-500 mt-2 text-right uppercase tracking-widest">
                                                Balance: <span className="text-zinc-300 font-bold">{availableBalance.toFixed(2)} KAS</span>
                                            </p>
                                        </div>

                                        {error && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3"
                                            >
                                                <WarningIcon size={20} className="text-red-400 shrink-0" weight="bold" />
                                                <p className="text-xs text-red-400 font-medium">{error}</p>
                                            </motion.div>
                                        )}

                                        <button
                                            onClick={handleContinue}
                                            disabled={isSubmitting}
                                            className="w-full py-5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl shadow-xl shadow-orange-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                                        >
                                            <CaretRightIcon size={20} weight="bold" />
                                            <span>Continue</span>
                                        </button>
                                    </div>
                                </>
                            )}

                            {step === 'password' && (
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="space-y-6"
                                >
                                    {/* Transaction Summary */}
                                    <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-6 space-y-4">
                                        <div className="flex justify-between">
                                            <span className="text-zinc-500 text-sm">To:</span>
                                            <span className="text-white font-mono text-sm">
                                                {mode === 'savings' ? selectedPot?.name : `${recipient.substring(0, 12)}...`}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-zinc-500 text-sm">Amount:</span>
                                            <span className="text-orange-400 font-bold text-lg">{amount} KAS</span>
                                        </div>
                                    </div>

                                    {/* Password Input */}
                                    <div>
                                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">
                                            <LockKeyIcon size={14} className="inline mr-1" />
                                            Wallet Password
                                        </label>
                                        <input
                                            type="password"
                                            placeholder="Enter your wallet password"
                                            className="w-full bg-zinc-900/60 border border-white/10 p-4 rounded-2xl text-white focus:outline-none focus:border-orange-500/50 transition-all"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && password) {
                                                    handleSignAndSend();
                                                }
                                            }}
                                        />
                                        <p className="text-[10px] text-zinc-500 mt-2">
                                            Your password unlocks your wallet to sign this transaction locally. It never leaves your device.
                                        </p>
                                    </div>

                                    {/* Biometric Unlock Option */}
                                    {isBiometricAvailable && (
                                        <div className="relative">
                                            <div className="absolute inset-0 flex items-center">
                                                <div className="w-full border-t border-white/10"></div>
                                            </div>
                                            <div className="relative flex justify-center text-xs uppercase">
                                                <span className="bg-zinc-950 px-2 text-zinc-600">Or</span>
                                            </div>
                                        </div>
                                    )}

                                    {isBiometricAvailable && (
                                        <button
                                            onClick={handleBiometricUnlockAndSign}
                                            disabled={isSubmitting}
                                            className="w-full flex items-center justify-center gap-2 p-4 bg-linear-to-r from-orange-500 to-orange-400 rounded-2xl font-bold hover:from-orange-300 hover:to-orange-200 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <FingerprintIcon size={20} weight="bold" />
                                            Unlock with Biometrics
                                        </button>
                                    )}

                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3"
                                        >
                                            <WarningIcon size={20} className="text-red-400 shrink-0" weight="bold" />
                                            <p className="text-xs text-red-400 font-medium">{error}</p>
                                        </motion.div>
                                    )}

                                    <div className="flex gap-3">
                                        <button
                                            onClick={handleBack}
                                            disabled={isSubmitting}
                                            className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white font-medium rounded-2xl transition-all"
                                        >
                                            Back
                                        </button>
                                        <button
                                            onClick={handleSignAndSend}
                                            disabled={!password || isSubmitting}
                                            className="flex-1 py-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl shadow-xl shadow-orange-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                                        >
                                            <LockKeyIcon size={20} weight="bold" />
                                            <span>Sign & Send</span>
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {step === 'signing' && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="text-center py-8"
                                >
                                    <div className="w-20 h-20 mx-auto mb-6 bg-orange-500/20 rounded-full flex items-center justify-center">
                                        <div className="w-12 h-12 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">Signing Transaction</h3>
                                    <p className="text-zinc-400 mb-6">
                                        Securely signing your transaction locally...
                                    </p>
                                    <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: '100%' }}
                                            transition={{ duration: 3, repeat: Infinity }}
                                            className="h-full bg-linear-to-r from-orange-500 to-orange-600"
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
