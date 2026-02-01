'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XIcon, PlusIcon, CoinsIcon, CalendarIcon } from '@phosphor-icons/react';

interface CreateSavingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (name: string, durationMonths: number) => void;
    isLoading: boolean;
}

export default function CreateSavingsModal({ isOpen, onClose, onCreate, isLoading }: CreateSavingsModalProps) {
    const [name, setName] = useState('');
    const [duration, setDuration] = useState('1');

    const handleCreate = () => {
        if (!name) return;
        onCreate(name, parseInt(duration));
        setName('');
        setDuration('1');
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
                        <div className="bg-[#1a1b1f] border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center text-orange-500">
                                        <CoinsIcon size={24} weight="bold" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-white">New Savings Pot 💰</h2>
                                </div>
                                <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
                                    <XIcon size={24} />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm text-zinc-400 mb-2">Goal Name</label>
                                    <input
                                        placeholder="e.g. New iPhone 16"
                                        className="w-full bg-zinc-900 border border-white/10 p-4 rounded-xl text-white focus:outline-none focus:border-orange-500/50"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-zinc-400 mb-2">Lock Duration</label>
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="relative">
                                            <select
                                                className="w-full bg-zinc-900 border border-white/10 p-4 rounded-xl text-white appearance-none focus:outline-none focus:border-orange-500/50"
                                                value={duration}
                                                onChange={(e) => setDuration(e.target.value)}
                                            >
                                                <option value="1">1 Month (Beginner)</option>
                                                <option value="3">3 Months (Committed)</option>
                                                <option value="6">6 Months (Strong Hands)</option>
                                                <option value="12">1 Year (Diamond Hands 💎)</option>
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                                                <CalendarIcon size={20} />
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-xs text-orange-400/60 mt-2">
                                        🔒 Funds will be locked until the duration is complete.
                                    </p>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={onClose}
                                        className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleCreate}
                                        disabled={!name || isLoading}
                                        className="flex-1 py-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 transition-all active:scale-95"
                                    >
                                        {isLoading ? 'Creating...' : 'Create Pot'}
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
