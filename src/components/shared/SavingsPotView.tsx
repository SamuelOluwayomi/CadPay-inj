'use client';

import { useState } from 'react';
import {
    ChartLineUpIcon, LockKeyOpenIcon, ArrowSquareOutIcon, LockIcon, InfoIcon, FingerprintIcon, WarningIcon
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Tooltip from '@radix-ui/react-tooltip';
import { useUser } from '@/context/UserContext';
import { useBiometricWallet } from '@/hooks/useBiometricWallet';
import { unstakeInj } from '@/lib/injective-wallet';

interface SavingsPotViewProps {
    pot: {
        id: string;
        name: string;
        amount: number;
        tx_hash: string;
        status: string;
        created_at: string;
        unlock_date: string;
    };
    onBreakPot: (potId: string, txHash?: string) => Promise<void>;
}

export default function SavingsPotView({ pot, onBreakPot }: SavingsPotViewProps) {
    const [showUnstakeModal, setShowUnstakeModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { profile } = useUser();
    const { unlockWallet, unlockWalletWithPassword } = useBiometricWallet();

    // If it's old legacy stuff, status 'locked' behaves same as 'staked' but with a time constraint.
    const isStaked = pot.status === 'staked' || pot.status === 'locked';

    let isLocked = false;
    let unlockDate = new Date();

    if (pot.unlock_date) {
        unlockDate = new Date(pot.unlock_date);
        isLocked = new Date() < unlockDate && pot.status === 'locked';
    }

    const calculateDaysRemaining = () => {
        if (!isLocked) return 0;
        const diffMillis = unlockDate.getTime() - new Date().getTime();
        return Math.ceil(diffMillis / (1000 * 60 * 60 * 24));
    };

    const daysLeft = calculateDaysRemaining();

    const handleBreakPotConfirm = async () => {
        setIsSubmitting(true);
        setError(null);
        try {
            if (profile?.encrypted_private_key) {
                // Custodial: Server handles transaction
                await onBreakPot(pot.id);
            } else {
                // Non-custodial: Client handles transaction
                if (!profile?.email) throw new Error("User email not found for authentication.");

                let mnemonic = '';

                if (profile?.auth_method === 'biometric') {
                    const unlockResult = await unlockWallet(profile.email);
                    if (!unlockResult.success || !unlockResult.mnemonic) {
                        throw new Error(unlockResult.error || "Biometric unlock failed. Please check your Passkey.");
                    }
                    mnemonic = unlockResult.mnemonic;
                } else if (profile?.auth_method === 'password') {
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

                // Execute local Injective Unstaking
                const txHash = await unstakeInj({ mnemonicOrKey: mnemonic, amount: Number(pot.amount) });

                // Save to database
                await onBreakPot(pot.id, txHash);
            }

            setShowUnstakeModal(false);
        } catch (err: any) {
            console.error("Break Pot Error:", err);
            setError(err.message || 'Failed to unstake pot.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex justify-center w-full">
            <div className={`bg-zinc-900/60 backdrop-blur-md border rounded-3xl w-full max-w-[400px] p-8 relative overflow-hidden group flex flex-col transition-all ${isStaked ? 'border-orange-500/20 shadow-[0_0_30px_rgba(249,115,22,0.05)]' : 'border-white/10'}`}>

                {/* Background Glow */}
                <div className={`absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl pointer-events-none transition-opacity ${isStaked ? 'bg-orange-500/10 opacity-100' : 'bg-transparent opacity-0'}`} />

                <div className="mb-8 relative z-10">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isLocked ? 'bg-amber-500/20 text-amber-500' : isStaked ? 'bg-orange-500/20 text-orange-500' : 'bg-zinc-800 text-zinc-500'}`}>
                                {isLocked ? <LockIcon size={20} weight="duotone" /> : <ChartLineUpIcon size={20} weight="duotone" />}
                            </div>
                            <h3 className="text-xl font-bold text-white">
                                {pot.name}
                            </h3>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 border ${isLocked ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : isStaked ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : 'bg-zinc-800 border-white/5 text-zinc-400'}`}>
                            {isLocked ? (
                                <>
                                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                                    Locked {daysLeft}d
                                </>
                            ) : isStaked ? (
                                <>
                                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
                                    Staked
                                </>
                            ) : (
                                <>
                                    <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full" />
                                    Unstaked
                                </>
                            )}
                        </div>
                    </div>

                    <div>
                        <p className="text-4xl font-black text-white tracking-tight">
                            {pot.amount.toFixed(2)} INJ
                        </p>
                        <p className="text-sm text-zinc-400 mt-1 font-medium flex items-center gap-1.5">
                            {isLocked ? `Locked in Yield Protocol until ${unlockDate.toLocaleDateString()}` : 'Generating protocol yield.'}
                        </p>
                        {isStaked && (
                            <div className="mt-3 flex items-center gap-2">
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-full">
                                    <ChartLineUpIcon size={14} className="text-orange-400" weight="bold" />
                                    <span className="text-xs font-black text-orange-400">+15–18% APR</span>
                                </div>
                                <span className="text-xs text-zinc-600 font-medium">Injective staking yield</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-3 relative z-10 mt-auto">
                    {/* View Stake Tx Button */}
                    <a
                        href={`https://testnet.explorer.injective.network/transaction/${pot.tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between w-full p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all group/btn"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-black/50 flex items-center justify-center text-zinc-400 group-hover/btn:text-white transition-colors">
                                <ArrowSquareOutIcon size={16} weight="bold" />
                            </div>
                            <div className="text-left w-full truncate">
                                <p className="text-sm font-bold text-white">View Stake Details</p>
                                <p className="text-xs text-zinc-500 font-mono truncate max-w-[150px]">{pot.tx_hash}</p>
                            </div>
                        </div>
                    </a>

                    {/* Unstake Button with Tooltip */}
                    <Tooltip.Provider delayDuration={100}>
                        <Tooltip.Root>
                            <Tooltip.Trigger asChild>
                                <div className="w-full">
                                    <button
                                        onClick={() => !isLocked && isStaked && setShowUnstakeModal(true)}
                                        disabled={!isStaked || isLocked}
                                        className={`w-full py-4 text-sm font-bold rounded-2xl transition-all flex items-center justify-center gap-2 ${(!isStaked || isLocked)
                                            ? 'bg-zinc-800/50 text-zinc-600 border border-white/5 cursor-not-allowed'
                                            : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20'
                                            }`}
                                    >
                                        {isLocked ? <LockIcon size={18} weight="bold" /> : <LockKeyOpenIcon size={18} weight="bold" />}
                                        {isLocked ? 'Pot is Locked' : 'Break Pot (Unstake)'}
                                    </button>
                                </div>
                            </Tooltip.Trigger>
                            {isLocked && (
                                <Tooltip.Portal>
                                    <Tooltip.Content
                                        className="bg-black text-white text-xs font-bold px-3 py-2 rounded-lg border border-white/10 shadow-xl z-50 pointer-events-none"
                                        sideOffset={10}
                                        side="bottom"
                                    >
                                        Unlocks on {unlockDate.toLocaleDateString()}
                                        <Tooltip.Arrow className="fill-white/10 border-white/10" width={11} height={5} />
                                    </Tooltip.Content>
                                </Tooltip.Portal>
                            )}
                        </Tooltip.Root>
                    </Tooltip.Provider>
                </div>

                {/* Unstake Modal */}
                <AnimatePresence>
                    {showUnstakeModal && (
                        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-black/80 backdrop-blur-md"
                                onClick={() => setShowUnstakeModal(false)}
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-zinc-900 border border-white/10 rounded-3xl p-8 max-w-sm w-full relative z-10 shadow-2xl"
                            >
                                <div className="w-16 h-16 bg-orange-500/20 rounded-2xl text-orange-500 flex items-center justify-center mx-auto mb-6">
                                    <LockKeyOpenIcon size={32} weight="duotone" />
                                </div>
                                <h4 className="text-xl font-black text-center text-white mb-2">Break Yield Pot?</h4>

                                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl mb-6 flex flex-col items-center">
                                    <InfoIcon size={24} className="text-red-400 mb-2" weight="duotone" />
                                    <p className="text-xs text-red-200/80 text-center leading-relaxed font-medium">
                                        Breaking this pot will initiate the blockchain unbonding process (<strong className="text-red-400">≈21 days</strong>) and stop generating yield instantly.
                                        Funds will be available in your main wallet when unbonding completes.
                                    </p>
                                </div>

                                {error && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2 mb-6">
                                        <WarningIcon size={16} className="text-red-400 shrink-0 mt-0.5" weight="bold" />
                                        <p className="text-[10px] text-red-300 font-medium">{error}</p>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    <button
                                        onClick={handleBreakPotConfirm}
                                        disabled={isSubmitting}
                                        className={`w-full py-4 text-white font-black rounded-xl transition-all flex items-center justify-center gap-2 ${isSubmitting
                                                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                                : 'bg-orange-500 hover:bg-orange-600 active:scale-[0.98]'
                                            }`}
                                    >
                                        {isSubmitting ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                <span>{profile?.encrypted_private_key ? 'Processing...' : 'Signing with Passkey...'}</span>
                                            </div>
                                        ) : (
                                            <>
                                                {!profile?.encrypted_private_key && profile?.auth_method === 'biometric' && <FingerprintIcon size={20} weight="bold" />}
                                                Initiate Unbonding
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => setShowUnstakeModal(false)}
                                        disabled={isSubmitting}
                                        className="w-full py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
