'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XIcon, CoinsIcon, ChartLineUpIcon } from '@phosphor-icons/react';

interface CreateSavingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (name: string, amount: number, lockupMonths: number) => Promise<void>;
    isLoading: boolean;
}

export default function CreateSavingsModal({ isOpen, onClose, onCreate, isLoading }: CreateSavingsModalProps) {
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [duration, setDuration] = useState(3);

    const handleCreate = async () => {
        if (!name || parseFloat(amount) <= 0) return;
        await onCreate(name, parseFloat(amount), duration);
        setName('');
        setAmount('');
        setDuration(3);
        onClose();
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
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    >
                        <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl overflow-hidden relative">
                            {/* Decorative background glow */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl pointer-events-none" />

                            <div className="flex items-center justify-between mb-6 relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-green-500/20 rounded-2xl flex items-center justify-center text-green-500">
                                        <ChartLineUpIcon size={26} weight="duotone" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-white">Yield Pot</h2>
                                        <p className="text-xs text-green-400 font-bold uppercase tracking-widest mt-1">Staked INJ</p>
                                    </div>
                                </div>
                                <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white rounded-full transition-colors">
                                    <XIcon size={20} weight="bold" />
                                </button>
                            </div>

                            <div className="space-y-6 relative z-10">
                                <div>
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1 mb-2 block">Pot Name</label>
                                    <input
                                        placeholder="e.g. Yield Generator"
                                        className="w-full bg-black/50 border border-white/10 px-5 py-4 rounded-xl text-white font-bold focus:outline-none focus:border-green-500 transition-colors"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        disabled={isLoading}
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1 mb-2 block">Stake Amount (INJ)</label>
                                    <div className="relative">
                                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500">
                                            <CoinsIcon size={22} weight="duotone" />
                                        </div>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            placeholder="0.00"
                                            className="w-full bg-black/50 border border-white/10 pl-14 pr-5 py-4 rounded-xl text-2xl font-black text-white focus:outline-none focus:border-green-500 transition-colors"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            disabled={isLoading}
                                        />
                                    </div>
                                    <p className="text-xs text-green-400/80 mt-3 font-medium flex items-center gap-1.5">
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
                                                className={`flex-1 py-3 rounded-xl font-bold transition-all ${duration === m
                                                    ? 'bg-green-500 text-white shadow-lg shadow-green-500/20'
                                                    : 'bg-black/50 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5'
                                                }`}
                                            >
                                                {m}M
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <button
                                        onClick={handleCreate}
                                        disabled={!name || !amount || parseFloat(amount) <= 0 || isLoading}
                                        className="w-full py-4 bg-linear-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-lg rounded-xl shadow-lg shadow-green-500/20 transition-all active:scale-[0.98] flex items-center justify-center"
                                    >
                                        {isLoading ? (
                                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            'Stake to Pot'
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
