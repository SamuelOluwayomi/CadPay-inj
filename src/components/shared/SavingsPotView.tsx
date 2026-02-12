'use client';

import { useState } from 'react';
// @ts-ignore
import QRCode from 'react-qr-code';
import {
    ArrowUpIcon, ArrowDownIcon, LockIcon, LockOpenIcon,
    QrCodeIcon, XIcon, InfoIcon, PaperPlaneTiltIcon, ReceiptIcon, LightningIcon
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import CopyButton from './CopyButton';

interface SavingsPotViewProps {
    pot: {
        id: string;
        name: string;
        address: string;
        balance: number;
        unlock_time: number;
    };
    onWithdraw: (recipient: string, amount: number, note: string) => void;
    onRefresh: () => void;
    onShowReceipts?: () => void;
    onFund?: (amount?: number) => void;
}

export default function SavingsPotView({ pot, onWithdraw, onRefresh, onShowReceipts, onFund }: SavingsPotViewProps) {
    const [showFundModal, setShowFundModal] = useState(false);
    const [showQR, setShowQR] = useState(false);
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [recipient, setRecipient] = useState('');
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');

    const isLocked = (Date.now() / 1000) < pot.unlock_time;
    const unlockDate = new Date(pot.unlock_time * 1000);

    const handleWithdraw = () => {
        if (!recipient || !amount) return;
        onWithdraw(recipient, parseFloat(amount), note);
        setShowWithdrawModal(false);
        setRecipient('');
        setAmount('');
        setNote('');
    };

    const handleQuickFund = () => {
        if (!amount) return;
        if (onFund) onFund(parseFloat(amount));
        setShowFundModal(false);
        setAmount('');
    };

    return (
        <div className="flex justify-center w-full">
            <div className="bg-zinc-900/60 backdrop-blur-md border border-white/10 rounded-2xl w-full max-w-[400px] p-6 relative overflow-visible group flex flex-col">
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                            {pot.name}
                            {isLocked ? (
                                <LockIcon size={20} className="text-red-400" />
                            ) : (
                                <LockOpenIcon size={20} className="text-green-400" />
                            )}
                        </h3>
                        {/* QR Code Button moved to top right */}
                        <button
                            onClick={() => setShowQR(true)}
                            className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-zinc-500 hover:text-white transition-all"
                            title="Show QR Code"
                        >
                            <QrCodeIcon size={20} />
                        </button>
                    </div>
                    <p className="text-3xl font-black text-white">
                        {pot.balance.toFixed(2)} KAS
                    </p>
                    <p className="text-sm text-zinc-400 mt-1">Available Balance</p>
                </div>

                {isLocked && (
                    <div className="px-4 py-2 bg-zinc-800/30 rounded-xl border border-white/5 flex items-center gap-2 mb-4 w-fit">
                        <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Locked</span>
                        <div className="w-1 h-3 bg-zinc-700" />
                        <span className="text-xs text-zinc-400 font-medium">{unlockDate.toLocaleDateString()}</span>
                    </div>
                )}

                <div className="grid grid-cols-3 gap-3">
                    <button
                        onClick={() => setShowQR(true)}
                        className="flex flex-col items-center justify-center gap-2 py-3 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded-xl transition-all"
                        title="Deposit"
                    >
                        <ArrowDownIcon size={20} weight="bold" />
                        <span className="text-xs font-bold">Deposit</span>
                    </button>
                    <button
                        onClick={() => setShowWithdrawModal(true)}
                        disabled={isLocked}
                        className={`flex flex-col items-center justify-center gap-2 py-3 border rounded-xl transition-all ${isLocked
                            ? 'bg-zinc-800/50 border-white/5 text-zinc-500 cursor-not-allowed'
                            : 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border-orange-500/20'
                            }`}
                        title="Withdraw"
                    >
                        <ArrowUpIcon size={20} weight="bold" />
                        <span className="text-xs font-bold">Withdraw</span>
                    </button>
                    {onShowReceipts && (
                        <button
                            onClick={onShowReceipts}
                            className="flex flex-col items-center justify-center gap-2 py-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-xl transition-all"
                            title="Receipts"
                        >
                            <ReceiptIcon size={20} weight="bold" />
                            <span className="text-xs font-bold">Receipts</span>
                        </button>
                    )}
                </div>

                {/* QR Code / Deposit Modal - FIXED POSITIONING */}
                <AnimatePresence>
                    {showQR && (
                        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="bg-zinc-900 border border-white/10 rounded-3xl p-6 w-full max-w-md relative"
                            >
                                <button
                                    onClick={() => setShowQR(false)}
                                    className="absolute top-4 right-4 text-zinc-500 hover:text-white bg-white/5 p-2 rounded-full"
                                >
                                    <XIcon size={20} />
                                </button>

                                <h4 className="text-xl font-bold mb-6 text-center">Add Funds to {pot.name}</h4>

                                {/* Tab 1: Instant Transfer (User Request) */}
                                <div className="mb-6 p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl">
                                    <h5 className="font-bold text-orange-400 mb-2 flex items-center gap-2">
                                        <LightningIcon weight="fill" />
                                        Quick Transfer
                                    </h5>
                                    <p className="text-xs text-zinc-400 mb-4">
                                        Instantly transfer from your main balance to this savings pot.
                                    </p>
                                    <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                                        <input
                                            type="number"
                                            placeholder="Amount"
                                            className="w-full min-w-0 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                        />
                                        <button
                                            onClick={handleQuickFund}
                                            disabled={!amount}
                                            className="shrink-0 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold px-4 py-3 rounded-xl transition-colors whitespace-nowrap"
                                        >
                                            Transfer
                                        </button>
                                    </div>
                                </div>

                                <div className="relative flex py-2 items-center">
                                    <div className="grow border-t border-white/10"></div>
                                    <span className="shrink-0 mx-4 text-zinc-500 text-xs">OR DEPOSIT VIA ADDRESS</span>
                                    <div className="grow border-t border-white/10"></div>
                                </div>

                                <div className="flex flex-col items-center mt-6">
                                    <div className="bg-white p-4 rounded-2xl mb-4">
                                        <QRCode value={pot.address} size={160} level="H" />
                                    </div>
                                    <div className="w-full flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10 mb-2">
                                        <span className="text-xs font-mono text-zinc-400 truncate flex-1 text-left mr-2">{pot.address}</span>
                                        <CopyButton text={pot.address} />
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Withdraw Modal - FIXED POSITIONING */}
                <AnimatePresence>
                    {showWithdrawModal && (
                        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="bg-zinc-900 border border-white/10 rounded-3xl p-6 w-full max-w-md relative"
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <h4 className="text-xl font-bold">Withdraw Funds</h4>
                                    <button onClick={() => setShowWithdrawModal(false)} className="text-zinc-500 hover:text-white bg-white/5 p-2 rounded-full">
                                        <XIcon size={20} />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1">To Address</label>
                                        <input
                                            placeholder="Enter recipient address"
                                            className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500/50"
                                            value={recipient}
                                            onChange={(e) => setRecipient(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Amount (KAS)</label>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500/50"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Description</label>
                                        <input
                                            placeholder="e.g. Taking out some for coffee"
                                            className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500/50"
                                            value={note}
                                            onChange={(e) => setNote(e.target.value)}
                                        />
                                    </div>

                                    <button
                                        onClick={handleWithdraw}
                                        disabled={!recipient || !amount}
                                        className="w-full py-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2"
                                    >
                                        <PaperPlaneTiltIcon size={18} weight="bold" />
                                        Send Transaction
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
