'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XIcon, CoinsIcon, ChartLineUpIcon, WarningIcon, FingerprintIcon } from '@phosphor-icons/react';
import { useUser } from '@/context/UserContext';
import { useBiometricWallet } from '@/hooks/useBiometricWallet';
import { stakeInj } from '@/lib/injective-wallet';

interface CreateSavingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (name: string, amount: number, lockupMonths: number, txHash?: string) => Promise<void>;
    balance?: number;
}

export default function CreateSavingsModal({ isOpen, onClose, onCreate, balance = 0 }: CreateSavingsModalProps) {
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [duration, setDuration] = useState(3);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { profile } = useUser();
    const { unlockWallet, unlockWalletWithPassword } = useBiometricWallet();

    const handleCreate = async () => {
        if (!name || parseFloat(amount) <= 0) return;
        setIsSubmitting(true);
        setError(null);

        try {
            const numAmount = parseFloat(amount);

            if (profile?.encrypted_private_key) {
                // Custodial: Server handles the transaction
                await onCreate(name, numAmount, duration);
            } else {
                // Non-Custodial: Client handles the transaction with Biometrics
                if (!profile?.email) throw new Error("User email not found for authentication.");

                let mnemonic = '';

                // Try Biometric first
                if (profile?.auth_method === 'biometric') {
                    const unlockResult = await unlockWallet(profile.email);
                    if (!unlockResult.success || !unlockResult.mnemonic) {
                        throw new Error(unlockResult.error || "Biometric unlock failed. Please check your Passkey.");
                    }
                    mnemonic = unlockResult.mnemonic;
                } else if (profile?.auth_method === 'password') {
                    // Quick fallback: prompt user for password
                    const pw = prompt("Enter your CadPay Password to sign this transaction:");
                    if (!pw) throw new Error("Password is required to sign transaction.");
                    const pwUnlock = await unlockWalletWithPassword(profile.email, pw);
                    if (!pwUnlock.success || !pwUnlock.mnemonic) {
                        throw new Error(pwUnlock.error || "Incorrect password.");
                    }
                    mnemonic = pwUnlock.mnemonic;
                } else {
                    throw new Error("No authentication method found.");
                }

                // Execute local Injective Staking
                const txHash = await stakeInj({ mnemonicOrKey: mnemonic, amount: numAmount });

                // Save to database
                await onCreate(name, numAmount, duration, txHash);
            }

            setName('');
            setAmount('');
            setDuration(3);
            onClose();
        } catch (err: any) {
            console.error("Create Pot Error:", err);
            setError(err.message || 'Failed to create and stake pot.');
        } finally {
            setIsSubmitting(false);
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
                        className="fixed inset-0 z-60 flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div className="bg-[#1a1b1f] border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl pointer-events-auto relative overflow-hidden">
                            {/* Glow Effect */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />

                            <div className="flex items-center justify-between mb-8 relative z-10">
                                <div>
                                    <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                                        Yield Pot <ChartLineUpIcon className="text-orange-500" weight="bold" />
                                    </h2>
                                    <p className="text-sm text-zinc-400 mt-1">Natively stake INJ to earn yield.</p>
                                </div>
                                <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-full">
                                    <XIcon size={20} weight="bold" />
                                </button>
                            </div>

                            <div className="space-y-6 relative z-10">
                                <div>
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1 mb-2 block">Pot Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g., Vacation Fund, New Car..."
                                        className="w-full bg-zinc-900/60 border border-white/10 p-4 rounded-2xl text-white text-sm focus:outline-none focus:border-orange-500/50 transition-all font-medium"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        disabled={isSubmitting}
                                    />
                                </div>

                        <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">Amount to Stake (INJ)</label>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs text-zinc-500 font-medium">Available:</span>
                                            <button
                                                onClick={() => setAmount(balance.toFixed(4))}
                                                className="text-xs font-bold text-orange-400 hover:text-orange-300 transition-colors px-2 py-0.5 bg-orange-500/10 rounded-md"
                                            >
                                                {balance.toFixed(4)} INJ
                                            </button>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-orange-500/10 rounded-lg flex items-center justify-center">
                                            <CoinsIcon size={18} className="text-orange-500" weight="duotone" />
                                        </div>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            className="w-full bg-zinc-900/60 border border-white/10 p-4 pl-16 rounded-2xl text-white text-xl font-bold focus:outline-none focus:border-orange-500/50 transition-all"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                    <p className="text-xs text-orange-400/80 mt-3 font-medium flex items-center gap-1.5">
                                        <ChartLineUpIcon weight="bold" />
                                        Funds will be natively staked on-chain to earn yield.
                                    </p>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1 mb-2 block">Lock-up Duration (Months)</label>
                                    <div className="flex gap-2">
                                        {[1, 3, 6, 12].map((m) => (
                                            <button
                                                key={m}
                                                onClick={() => setDuration(m)}
                                                disabled={isSubmitting}
                                                className={`flex-1 py-3 rounded-xl font-bold transition-all ${duration === m
                                                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                                                    : 'bg-black/50 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5'
                                                    }`}
                                            >
                                                {m}M
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3"
                                    >
                                        <WarningIcon size={20} className="text-red-400 shrink-0 mt-0.5" weight="bold" />
                                        <p className="text-xs text-red-300 font-medium leading-relaxed">{error}</p>
                                    </motion.div>
                                )}

                                <div className="pt-2">
                                    <button
                                        onClick={handleCreate}
                                        disabled={!name || !amount || isSubmitting}
                                        className={`w-full py-4 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 ${!name || !amount || isSubmitting
                                            ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                            : 'bg-linear-to-r from-orange-500 to-orange-600 shadow-lg shadow-orange-500/20 active:scale-[0.98]'
                                            }`}
                                    >
                                        {isSubmitting ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                <span>{profile?.encrypted_private_key ? 'Creating Pot...' : 'Signing with Passkey...'}</span>
                                            </div>
                                        ) : (
                                            <>
                                                {!profile?.encrypted_private_key && profile?.auth_method === 'biometric' && <FingerprintIcon size={20} weight="bold" />}
                                                Create Yield Pot
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
