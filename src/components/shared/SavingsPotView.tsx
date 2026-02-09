'use client';

import { useState } from 'react';
// @ts-ignore
import QRCode from 'react-qr-code';
import { Transaction, SystemProgram, PublicKey, TransactionInstruction } from '@/lib/solana-stubs';
import {
    ArrowUpIcon, ArrowDownIcon, LockIcon, LockOpenIcon,
    QrCodeIcon, XIcon, InfoIcon, PaperPlaneTiltIcon
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import CopyButton from './CopyButton';

interface SavingsPotViewProps {
    pot: {
        name: string;
        address: string;
        balance: number;
        unlockTime: number;
    };
    onWithdraw: (recipient: string, amount: number, note: string) => void;
    onRefresh: () => void;
}

export default function SavingsPotView({ pot, onWithdraw, onRefresh }: SavingsPotViewProps) {
    const [showQR, setShowQR] = useState(false);
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [recipient, setRecipient] = useState('');
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');

    const isLocked = (Date.now() / 1000) < pot.unlockTime;
    const unlockDate = new Date(pot.unlockTime * 1000);

    const handleWithdraw = () => {
        if (!recipient || !amount) return;
        onWithdraw(recipient, parseFloat(amount), note);
        setShowWithdrawModal(false);
        setRecipient('');
        setAmount('');
        setNote('');
    };

    return (
        <div className="flex justify-center w-full">
            <div className="bg-zinc-900/60 backdrop-blur-md border border-white/10 rounded-full aspect-square w-full max-w-[320px] p-8 relative overflow-hidden group flex flex-col items-center justify-center text-center">
                <div className="mb-4">
                    <h3 className="text-xl font-bold text-white flex items-center justify-center gap-2">
                        {pot.name}
                        {isLocked ? (
                            <LockIcon size={16} className="text-red-400" />
                        ) : (
                            <LockOpenIcon size={16} className="text-green-400" />
                        )}
                    </h3>
                    <p className="text-sm text-zinc-400 mt-1">
                        <span className="text-white font-bold">{pot.balance.toFixed(0)} USDC</span>
                    </p>
                </div>

                <div className="flex gap-3 mb-6">
                    <button
                        onClick={() => setShowQR(true)}
                        className="w-12 h-12 flex items-center justify-center bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded-full transition-all"
                        title="Receive"
                    >
                        <ArrowDownIcon size={20} weight="bold" />
                    </button>
                    <button
                        onClick={() => setShowWithdrawModal(true)}
                        disabled={isLocked}
                        className={`w-12 h-12 flex items-center justify-center border rounded-full transition-all ${isLocked
                            ? 'bg-zinc-800/50 border-white/5 text-zinc-500 cursor-not-allowed'
                            : 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border-orange-500/20'
                            }`}
                        title="Withdraw"
                    >
                        <ArrowUpIcon size={20} weight="bold" />
                    </button>
                </div>

                {isLocked && (
                    <div className="px-4 py-2 bg-zinc-800/30 rounded-full border border-white/5 flex items-center gap-2">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-tight">Locked</span>
                        <div className="w-1 h-3 bg-zinc-700" />
                        <span className="text-[9px] text-zinc-500 font-medium">{unlockDate.toLocaleDateString()}</span>
                    </div>
                )}

                {/* QR Code Action (Floating) */}
                <button
                    onClick={() => setShowQR(true)}
                    className="absolute top-8 right-8 p-2 bg-white/5 hover:bg-white/10 rounded-full text-zinc-500 hover:text-white transition-all z-10"
                >
                    <QrCodeIcon size={16} />
                </button>

                {/* QR Code Modal Overlay */}
                <AnimatePresence>
                    {showQR && (
                        <div className="absolute inset-0 z-20 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
                            <button
                                onClick={() => setShowQR(false)}
                                className="absolute top-4 right-4 text-zinc-500 hover:text-white"
                            >
                                <XIcon size={24} />
                            </button>
                            <h4 className="text-lg font-bold mb-4">Deposit to {pot.name}</h4>
                            <div className="bg-white p-4 rounded-2xl mb-4">
                                <QRCode value={pot.address} size={160} level="H" />
                            </div>
                            <div className="w-full flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10 mb-2">
                                <span className="text-[10px] font-mono text-zinc-400 truncate flex-1 text-left">{pot.address}</span>
                                <CopyButton text={pot.address} />
                            </div>
                            <p className="text-[10px] text-zinc-500">Scan to send SOL or USDC to this pot</p>
                        </div>
                    )}
                </AnimatePresence>

                {/* Withdraw Modal Overlay */}
                <AnimatePresence>
                    {showWithdrawModal && (
                        <div className="absolute inset-0 z-20 bg-black/95 backdrop-blur-md flex flex-col p-6 animate-in fade-in duration-200">
                            <div className="flex items-center justify-between mb-6">
                                <h4 className="text-lg font-bold">Withdraw Funds</h4>
                                <button onClick={() => setShowWithdrawModal(false)} className="text-zinc-500 hover:text-white">
                                    <XIcon size={20} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1">To Address</label>
                                    <input
                                        placeholder="Enter Solana address"
                                        className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500/50"
                                        value={recipient}
                                        onChange={(e) => setRecipient(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Amount (USDC)</label>
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500/50"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Description (On-Chain Memo)</label>
                                    <input
                                        placeholder="e.g. Taking out some for coffee"
                                        className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500/50"
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
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
