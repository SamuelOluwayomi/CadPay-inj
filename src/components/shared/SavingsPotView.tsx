'use client';

import { useState } from 'react';
// @ts-ignore
import QRCode from 'react-qr-code';
import { Transaction, SystemProgram, PublicKey, TransactionInstruction } from '@solana/web3.js';
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
        <div className="bg-zinc-900/60 backdrop-blur-md border border-white/10 rounded-3xl p-6 relative overflow-hidden group">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        {pot.name}
                        {isLocked ? (
                            <div className="px-2 py-0.5 bg-red-500/10 border border-red-500/20 rounded-full flex items-center gap-1">
                                <LockIcon size={12} className="text-red-400" />
                                <span className="text-[10px] font-bold text-red-400">LOCKED</span>
                            </div>
                        ) : (
                            <div className="px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded-full flex items-center gap-1">
                                <LockOpenIcon size={12} className="text-green-400" />
                                <span className="text-[10px] font-bold text-green-400">UNLOCKED</span>
                            </div>
                        )}
                    </h3>
                    <p className="text-sm text-zinc-400 mt-1">Balance: <span className="text-white font-bold">{pot.balance.toFixed(2)} USDC</span></p>
                </div>
                <button
                    onClick={() => setShowQR(true)}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-zinc-400 hover:text-white transition-all"
                >
                    <QrCodeIcon size={20} />
                </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={() => setShowQR(true)}
                    className="flex items-center justify-center gap-2 py-3 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded-xl text-sm font-bold transition-all"
                >
                    <ArrowDownIcon size={18} weight="bold" />
                    Receive
                </button>
                <button
                    onClick={() => setShowWithdrawModal(true)}
                    disabled={isLocked}
                    className={`flex items-center justify-center gap-2 py-3 border rounded-xl text-sm font-bold transition-all ${isLocked
                        ? 'bg-zinc-800/50 border-white/5 text-zinc-500 cursor-not-allowed'
                        : 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border-orange-500/20'
                        }`}
                >
                    <ArrowUpIcon size={18} weight="bold" />
                    Withdraw
                </button>
            </div>

            {isLocked && (
                <div className="mt-4 p-3 bg-zinc-800/50 rounded-xl flex items-start gap-3 border border-white/5">
                    <InfoIcon size={20} className="text-orange-400 shrink-0 mt-0.5" />
                    <p className="text-[10px] leading-relaxed text-zinc-400">
                        Funds are locked for security until <span className="text-white font-medium">{unlockDate.toLocaleDateString()} {unlockDate.toLocaleTimeString()}</span>.
                        You can still top up this pot anytime.
                    </p>
                </div>
            )}

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
    );
}
