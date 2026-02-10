'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XIcon, ReceiptIcon, ArrowDownIcon, ArrowUpIcon, CalendarBlankIcon } from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase';
import { SavingsPot, SavingsTransaction } from '@/hooks/useSavings';

interface SavingsReceiptsModalProps {
    isOpen: boolean;
    onClose: () => void;
    pot: SavingsPot | null;
}

export default function SavingsReceiptsModal({ isOpen, onClose, pot }: SavingsReceiptsModalProps) {
    const [transactions, setTransactions] = useState<SavingsTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && pot) {
            fetchTransactions();
        }
    }, [isOpen, pot]);

    const fetchTransactions = async () => {
        if (!pot) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('savings_transactions')
                .select('*')
                .eq('pot_id', pot.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTransactions(data || []);
        } catch (e) {
            console.error("Failed to fetch receipts:", e);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && pot && (
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
                        <div className="bg-[#1a1b1f] border border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                            <div className="flex items-center justify-between mb-6 shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-500">
                                        <ReceiptIcon size={24} weight="bold" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-white">Pot Receipts</h2>
                                        <p className="text-xs text-zinc-400">{pot.name}</p>
                                    </div>
                                </div>
                                <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
                                    <XIcon size={24} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                                {isLoading ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
                                        <p className="text-sm">Loading receipts...</p>
                                    </div>
                                ) : transactions.length === 0 ? (
                                    <div className="text-center py-12 text-zinc-500">
                                        <ReceiptIcon size={48} className="mx-auto mb-3 opacity-20" />
                                        <p>No transactions yet</p>
                                    </div>
                                ) : (
                                    transactions.map((tx) => (
                                        <div key={tx.id} className="bg-zinc-900/50 border border-white/5 p-4 rounded-2xl flex items-center justify-between group hover:bg-white/5 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'deposit' ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'
                                                    }`}>
                                                    {tx.type === 'deposit' ? (
                                                        <ArrowDownIcon size={20} weight="bold" />
                                                    ) : (
                                                        <ArrowUpIcon size={20} weight="bold" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-white capitalize">{tx.type}</p>
                                                    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                                                        <CalendarBlankIcon size={12} />
                                                        <span>{new Date(tx.created_at).toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`font-bold ${tx.type === 'deposit' ? 'text-green-400' : 'text-orange-400'
                                                    }`}>
                                                    {tx.type === 'deposit' ? '+' : '-'}{tx.amount} {tx.currency}
                                                </p>
                                                <p className="text-[10px] text-zinc-600 font-mono truncate max-w-[80px]">
                                                    {tx.tx_hash}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
