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
    onFund?: () => void;
}

export default function SavingsPotView({ pot, onWithdraw, onRefresh, onShowReceipts, onFund }: SavingsPotViewProps) {
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

    return (
        <div className="flex justify-center w-full">
            <div className="bg-zinc-900/60 backdrop-blur-md border border-white/10 rounded-2xl w-full max-w-[400px] p-6 relative overflow-hidden group flex flex-col">
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

                <div className="flex gap-3">
                    <button
                        onClick={() => setShowQR(true)}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded-xl transition-all"
                        title="Receive"
                    >
                        <ArrowDownIcon size={20} weight="bold" />
                        <span className="text-sm font-bold">Deposit</span>
                    </button>
                    <button
                        onClick={() => setShowWithdrawModal(true)}
                        disabled={isLocked}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 border rounded-xl transition-all ${isLocked
                            ? 'bg-zinc-800/50 border-white/5 text-zinc-500 cursor-not-allowed'
                            : 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border-orange-500/20'
                            }`}
                        title="Withdraw"
                    >
                        <ArrowUpIcon size={20} weight="bold" />
                        <span className="text-sm font-bold">Withdraw</span>
                    </button>
                    {onShowReceipts && (
                        <button
                            onClick={onShowReceipts}
                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-xl transition-all"
                            title="Receipts"
                        >
                            <ReceiptIcon size={20} weight="bold" />
                            <span className="text-sm font-bold">Receipts</span>
                        </button>
                    )}
                </div>

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
                            <div className="w-full flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10 mb-4">
                                <span className="text-[10px] font-mono text-zinc-400 truncate flex-1 text-left">{pot.address}</span>
                                <CopyButton text={pot.address} />
                            </div>

                            {onFund && (
                                <button
                                    onClick={() => {
                                        onFund();
                                        setShowQR(false);
                                    }}
                                    className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 mb-2"
                                >
                                    <LightningIcon size={18} weight="fill" />
                                    Fund with Faucet (Testnet)
                                </button>
                            )}

                            <p className="text-[10px] text-zinc-500">Scan to send KAS to this pot</p>
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
