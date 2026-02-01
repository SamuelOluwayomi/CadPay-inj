'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { XIcon, CheckIcon, CopyIcon, ArrowSquareOutIcon, ClockIcon, CurrencyDollarIcon } from '@phosphor-icons/react';
import { useState } from 'react';

interface Transaction {
    signature: string;
    blockTime: number | null;
    slot: number;
    err: any;
    memo: string | null;
}

interface TransactionDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    transaction: Transaction | null;
}

export default function TransactionDetailsModal({ isOpen, onClose, transaction }: TransactionDetailsModalProps) {
    const [copied, setCopied] = useState(false);

    if (!transaction) return null;

    const copySignature = () => {
        navigator.clipboard.writeText(transaction.signature);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const openExplorer = () => {
        window.open(`https://explorer.solana.com/tx/${transaction.signature}?cluster=devnet`, '_blank');
    };

    const formatDate = (timestamp: number | null) => {
        if (!timestamp) return 'Pending';
        return new Date(timestamp * 1000).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
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
                        <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-white">Transaction Details</h2>
                                <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
                                    <XIcon size={24} />
                                </button>
                            </div>

                            {/* Status */}
                            <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${transaction.err
                                ? 'bg-red-500/10 border border-red-500/30'
                                : 'bg-green-500/10 border border-green-500/30'
                                }`}>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${transaction.err ? 'bg-red-500/20' : 'bg-green-500/20'
                                    }`}>
                                    {transaction.err ? (
                                        <XIcon size={20} weight="bold" className="text-red-400" />
                                    ) : (
                                        <CheckIcon size={20} weight="bold" className="text-green-400" />
                                    )}
                                </div>
                                <div>
                                    <p className={`font-bold ${transaction.err ? 'text-red-400' : 'text-green-400'}`}>
                                        {transaction.err ? 'Failed' : 'Success'}
                                    </p>
                                    <p className="text-xs text-zinc-500">
                                        {formatDate(transaction.blockTime)}
                                    </p>
                                </div>
                            </div>

                            {/* Gasless Badge */}
                            <div className="mb-6 p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl">
                                <div className="flex items-center gap-2 mb-1">
                                    <CurrencyDollarIcon size={16} className="text-orange-400" />
                                    <p className="text-sm font-bold text-orange-400">Gasless Transaction</p>
                                </div>
                                <p className="text-xs text-orange-200/60">Transaction fees sponsored by Lazorkit Paymaster</p>
                            </div>

                            {/* Details */}
                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="block text-xs text-zinc-500 mb-1">Signature</label>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 px-3 py-2 bg-zinc-800 rounded-lg">
                                            <p className="text-xs text-white font-mono truncate">{transaction.signature}</p>
                                        </div>
                                        <button
                                            onClick={copySignature}
                                            className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                                        >
                                            {copied ? (
                                                <CheckIcon size={16} className="text-green-400" />
                                            ) : (
                                                <CopyIcon size={16} className="text-zinc-400" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-zinc-500 mb-1">Block</label>
                                        <p className="text-sm text-white font-medium">{transaction.slot.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-zinc-500 mb-1">Confirmations</label>
                                        <p className="text-sm text-green-400 font-medium">Finalized</p>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <button
                                onClick={openExplorer}
                                className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                            >
                                View on Solana Explorer
                                <ArrowSquareOutIcon size={18} weight="bold" />
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
