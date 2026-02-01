'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    XIcon, PaperPlaneTiltIcon, WalletIcon, PiggyBankIcon,
    CaretRightIcon, WarningIcon, CheckCircleIcon
} from '@phosphor-icons/react';
import { PublicKey } from '@solana/web3.js';

interface UnifiedSendModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSend: (recipient: string, amount: number, isSavings: boolean, memo?: string) => Promise<void>;
    pots: any[];
    balance: number;
    usdcBalance?: number; // Add USDC balance prop
}

export default function UnifiedSendModal({ isOpen, onClose, onSend, pots, balance, usdcBalance }: UnifiedSendModalProps) {
    const [mode, setMode] = useState<'external' | 'savings'>('external');
    const [recipient, setRecipient] = useState('');
    const [selectedPot, setSelectedPot] = useState<any>(null);
    const [amount, setAmount] = useState('');
    const [memo, setMemo] = useState(''); // Add memo state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Use USDC balance for validation (not SOL balance)
    const availableBalance = usdcBalance !== undefined ? usdcBalance : balance;

    const handleSend = async () => {
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
            setError(`Insufficient balance. You have ${availableBalance.toFixed(2)} USDC but need ${numAmount.toFixed(2)} USDC.`);
            return;
        }

        setIsSubmitting(true);
        try {
            // Pass memo only for savings deposits, trim to 20 chars
            const trimmedMemo = mode === 'savings' && memo ? memo.trim().slice(0, 20) : undefined;
            await onSend(targetRecipient, numAmount, mode === 'savings', trimmedMemo);
            onClose();
            // Reset state
            setRecipient('');
            setAmount('');
            setMemo('');
            setSelectedPot(null);
        } catch (e: any) {
            setError(e.message || 'Transaction failed');
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
                        onClick={(e) => {
                            if (e.target === e.currentTarget) onClose();
                        }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    >
                        <div className="bg-[#1a1b1f] border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-2xl font-bold text-white">Send Funds</h2>
                                <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
                                    <XIcon size={24} />
                                </button>
                            </div>

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
                                                placeholder="Enter Solana address"
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
                                                            <p className="text-[10px] text-zinc-500">{pot.balance.toFixed(2)} USDC</p>
                                                        </div>
                                                    </div>
                                                    {selectedPot?.name === pot.name && <CheckCircleIcon size={20} className="text-orange-500" weight="fill" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Amount (USDC)</label>
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
                                        Balance: <span className="text-zinc-300 font-bold">{availableBalance.toFixed(2)} USDC</span>
                                    </p>
                                </div>

                                {/* Memo Input - Only for Savings Mode */}
                                {mode === 'savings' && (
                                    <div>
                                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">
                                            Memo (Optional)
                                            <span className="text-[10px] ml-2 text-zinc-600">Max 20 chars to minimize tx size</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="e.g., Vacation fund"
                                                maxLength={20}
                                                className="w-full bg-zinc-900/60 border border-white/10 p-4 rounded-2xl text-white text-sm focus:outline-none focus:border-orange-500/50 transition-all"
                                                value={memo}
                                                onChange={(e) => setMemo(e.target.value)}
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-zinc-600 font-mono">
                                                {memo.length}/20
                                            </span>
                                        </div>
                                    </div>
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

                                <button
                                    onClick={handleSend}
                                    disabled={isSubmitting}
                                    className="w-full py-5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl shadow-xl shadow-orange-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Processing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <PaperPlaneTiltIcon size={20} weight="bold" />
                                            <span>{mode === 'savings' ? 'Confirm Transfer' : 'Send Transaction'}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

