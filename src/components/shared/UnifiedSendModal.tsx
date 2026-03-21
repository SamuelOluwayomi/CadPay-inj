'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    XIcon, PaperPlaneTiltIcon, WalletIcon, PiggyBankIcon,
    CaretRightIcon, WarningIcon, CheckCircleIcon, LockKeyIcon, FingerprintIcon
} from '@phosphor-icons/react';
import { useInjective } from '@/hooks/useInjective';
import { useBiometricWallet } from '@/hooks/useBiometricWallet';
import { transferInj } from '@/lib/injective-wallet';
import { supabase } from '@/lib/supabase';
import { useReceipts } from '@/hooks/useReceipts';
import { LinkIcon, DownloadIcon } from '@phosphor-icons/react';
import { useUser } from '@/context/UserContext';


interface UnifiedSendModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSend: (recipient: string, amount: number, isSavings: boolean) => Promise<void>;
    pots: any[];
    balance: number;
}

export default function UnifiedSendModal({ isOpen, onClose, onSend, pots, balance }: UnifiedSendModalProps) {
    const { address: userAddress, connect, isConnected, balance: injBalance } = useInjective();
    const [mode, setMode] = useState<'external' | 'savings'>('external');
    const [step, setStep] = useState<'details' | 'password' | 'signing' | 'success'>('details');
    const [lastTxHash, setLastTxHash] = useState<string | null>(null);
    const [recipient, setRecipient] = useState('');
    const [selectedPot, setSelectedPot] = useState<any>(null);
    const [amount, setAmount] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);

    const { unlockWalletWithPassword, unlockWallet, checkSupport, hasBiometricWallet, checkWalletExists, createWalletWithPassword } = useBiometricWallet();
    const { profile, session } = useUser();
    const { createReceipt } = useReceipts(userAddress);

    // Get user email from Supabase session and check biometric support
    useEffect(() => {
        async function initialize() {
            const { data: { user } } = await supabase.auth.getUser();
            setUserEmail(user?.email || null);

            // Check if this user has biometric auth enabled in database
            if (user?.email) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('auth_method')
                    .eq('id', user.id)
                    .single();

                // Show biometric button only if auth_method is 'biometric' AND device supports it
                const supportResult = await checkSupport();
                setIsBiometricAvailable(
                    supportResult.supported && profile?.auth_method === 'biometric'
                );
            }
        }
        if (isOpen) {
            initialize();
        }
    }, [isOpen, checkSupport]);

    // Use KAS balance for validation
    const availableBalance = balance;

    const handleContinue = () => {
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
            setError(`Insufficient balance. You have ${availableBalance.toFixed(2)} INJ but need ${numAmount.toFixed(2)} INJ.`);
            return;
        }

        // Move to password step
        setStep('password');
    };

    const handleBiometricUnlockAndSign = async () => {
        setError(null);
        setStep('signing');
        setIsSubmitting(true);

        try {
            const targetRecipient = mode === 'savings' ? selectedPot?.address : recipient;
            const numAmount = parseFloat(amount);

            if (!userEmail) {
                throw new Error('User not authenticated');
            }

            // 2. Unlock with biometrics using Supabase auth email
            const unlockResult = await unlockWallet(userEmail);

            if (!unlockResult.success || !unlockResult.mnemonic) {
                throw new Error(unlockResult.error || 'Failed to unlock wallet with biometrics');
            }

            // 3. For Injective, we use the transferInj utility with the derived mnemonic
            const txId = await transferInj({
                mnemonicOrKey: unlockResult.mnemonic,
                recipient: targetRecipient!,
                amount: numAmount
            });

            // Create receipt
            await createReceipt({
                wallet_address: userAddress!,
                service_name: mode === 'savings' ? 'Savings Deposit' : 'External Transfer',
                plan_name: mode === 'savings' ? (selectedPot?.name || 'Pot') : 'Direct Transfer',
                amount_inj: numAmount,
                amount_usd: numAmount * 25, // Fallback price or use a prop if available
                tx_signature: txId,
                status: 'completed',
                sender_address: userAddress!,
                receiver_address: targetRecipient!
            });

            console.log('🚀 Injective Transaction complete! TxHash:', txId);

            // Success! Call the original onSend callback for UI updates
            await onSend(targetRecipient!, numAmount, mode === 'savings');

            // Success step
            setLastTxHash(txId);
            setStep('success');
        } catch (err: any) {
            console.error('Biometric unlock error:', err);
            setError(err.message || 'Biometric authentication failed');
            setStep('password');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSignAndSend = async () => {
        setError(null);
        setStep('signing');
        setIsSubmitting(true);

        try {
            const targetRecipient = mode === 'savings' ? selectedPot?.address : recipient;
            const numAmount = parseFloat(amount);

            if (!userEmail) {
                throw new Error('User not authenticated');
            }

            // 1. PIN Verification
            if (profile?.pin && password !== profile.pin) {
                throw new Error('Incorrect Security PIN. Please try again.');
            }

            // 2. Decide: Server-Side (Custodial) vs Local (Biometric) signing
            let txId = '';

            // If it's a custodial wallet (has encrypted key on server), use the new secure send API
            if (profile?.encrypted_private_key) {
                const { data: { session } } = await supabase.auth.getSession();
                const response = await fetch('/api/wallet/send', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session?.access_token}`
                    },
                    body: JSON.stringify({
                        recipient: targetRecipient,
                        amount: numAmount,
                        pin: password, // The user's PIN is verified on the server
                        service_name: mode === 'savings' ? 'Savings Deposit' : 'External Transfer',
                        plan_name: mode === 'savings' ? (selectedPot?.name || 'Pot') : 'Direct Transfer'
                    })
                });

                const result = await response.json();
                if (!result.success) {
                    throw new Error(result.error || 'Server-side transaction failed');
                }
                txId = result.txHash;
            } else {
                // 3. Local signing for Non-Custodial / Biometric wallets
                // Unlock with biometric/local key
                const unlockResult = await unlockWallet(userEmail); // Try biometric first

                if (!unlockResult.success) {
                    // Fallback to password (if they have one)
                    const pwUnlock = await unlockWalletWithPassword(userEmail, password);
                    if (!pwUnlock.success || !pwUnlock.mnemonic) {
                        throw new Error(pwUnlock.error || 'Failed to unlock wallet for signing');
                    }
                    unlockResult.mnemonic = pwUnlock.mnemonic;
                }

                if (!unlockResult.mnemonic) {
                    throw new Error('Could not retrieve signing key');
                }

                // Sign and broadcast directly
                txId = await transferInj({
                    mnemonicOrKey: unlockResult.mnemonic,
                    recipient: targetRecipient!,
                    amount: numAmount,
                });
            }

            if (!profile?.encrypted_private_key) {
                // 3. Create receipt only for Biometric/Local signing.
                // Custodial transfers are now handled by the backend atomically.
                await createReceipt({
                    wallet_address: userAddress!,
                    service_name: mode === 'savings' ? 'Yield Pot Deposit' : 'External Transfer',
                    plan_name: mode === 'savings' ? (selectedPot?.name || 'Pot') : 'Direct Transfer',
                    amount_inj: numAmount,
                    amount_usd: numAmount * 25,
                    tx_signature: txId,
                    status: 'completed',
                    sender_address: userAddress!,
                    receiver_address: targetRecipient!
                });
            }

            console.log('🚀 Injective Transaction complete! TxHash:', txId);

            // Success! Call the original onSend callback for UI updates
            await onSend(targetRecipient!, numAmount, mode === 'savings');

            // Success step
            setLastTxHash(txId);
            setStep('success');
            setAmount('');
            setPassword('');
            setSelectedPot(null);
            setRecipient('');

        } catch (e: any) {
            console.error('Transaction error:', e);
            setError(e.message || 'Transaction failed');
            setStep('password'); // Go back to password step on error
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBack = () => {
        if (step === 'password') {
            setStep('details');
            setPassword('');
            setError(null);
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
                                <h2 className="text-2xl font-bold text-white tracking-tight">
                                    {step === 'password' ? (profile?.auth_method === 'biometric' ? 'Approve Signature' : 'Security Check') : step === 'signing' ? 'Signing Transaction' : 'Send Funds'}
                                </h2>
                                <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
                                    <XIcon size={24} />
                                </button>
                            </div>

                            {step === 'details' && (
                                <>
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
                                                <PiggyBankIcon weight="bold" /> Yield Pot
                                            </button>
                                        )}
                                    </div>

                                    <div className="space-y-6">
                                        {mode === 'external' ? (
                                            <div>
                                                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Recipient Address</label>
                                                <div className="relative">
                                                    <input
                                                        placeholder="inj1..."
                                                        className="w-full bg-zinc-900/60 border border-white/10 p-4 rounded-2xl text-white text-sm focus:outline-none focus:border-orange-500/50 transition-all font-mono"
                                                        value={recipient}
                                                        onChange={(e) => setRecipient(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Select Yield Pot</label>
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
                                                                    <p className="text-[10px] text-zinc-500">{(pot.amount ?? 0).toFixed(2)} INJ staked</p>
                                                                </div>
                                                            </div>
                                                            {selectedPot?.name === pot.name && <CheckCircleIcon size={20} className="text-orange-500" weight="fill" />}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Amount (INJ)</label>
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
                                                Balance: <span className="text-zinc-300 font-bold">{availableBalance.toFixed(2)} INJ</span>
                                            </p>
                                        </div>

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
                                            onClick={handleContinue}
                                            disabled={isSubmitting}
                                            className="w-full py-5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl shadow-xl shadow-orange-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                                        >
                                            <CaretRightIcon size={20} weight="bold" />
                                            <span>Continue</span>
                                        </button>
                                    </div>
                                </>
                            )}

                            {step === 'password' && (
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="space-y-6"
                                >
                                    {/* Transaction Summary Card */}
                                    <div className="relative overflow-hidden rounded-2xl p-6 border border-white/10 bg-linear-to-br from-zinc-900/80 to-black backdrop-blur-xl shadow-lg group">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl -mr-10 -mt-10 transition-opacity duration-500 opacity-50 group-hover:opacity-100" />

                                        <div className="space-y-4 relative z-10">
                                            <div className="flex justify-between items-center border-b border-white/5 pb-4">
                                                <span className="text-xs font-medium uppercase tracking-widest text-zinc-500">To Recipient</span>
                                                <span className="text-white font-mono text-[11px] md:text-xs bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 shadow-sm truncate max-w-[180px] md:max-w-none">
                                                    {mode === 'savings' ? selectedPot?.name : `${recipient.substring(0, 16)}...`}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center pt-1">
                                                <span className="text-xs font-medium uppercase tracking-widest text-zinc-500">Amount</span>
                                                <span className="text-transparent bg-clip-text bg-linear-to-r from-orange-400 to-orange-500 font-black text-2xl tracking-tight drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]">
                                                    {amount} <span className="text-lg">INJ</span>
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Authentication UI */}
                                    {profile?.auth_method === 'biometric' ? (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <div className="text-center space-y-2 mb-2">
                                                <div className="w-16 h-16 mx-auto bg-orange-500/10 border border-orange-500/20 rounded-full flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(249,115,22,0.15)]">
                                                    <FingerprintIcon size={32} className="text-orange-500 drop-shadow-md" />
                                                </div>
                                                <h3 className="text-white font-bold text-lg">Biometric Verification</h3>
                                                <p className="text-xs text-zinc-400 leading-relaxed max-w-[280px] mx-auto">
                                                    Use your device's secure enclave to cryptographically sign this transaction.
                                                </p>
                                            </div>
                                            <button
                                                onClick={handleBiometricUnlockAndSign}
                                                disabled={isSubmitting}
                                                className="w-full flex items-center justify-center gap-2 p-5 bg-linear-to-r from-orange-500 to-orange-600 border border-orange-400/50 rounded-2xl font-bold shadow-[0_0_30px_rgba(249,115,22,0.2)] hover:shadow-[0_0_40px_rgba(249,115,22,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-white"
                                            >
                                                {isSubmitting ? (
                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                ) : (
                                                    <FingerprintIcon size={24} weight="bold" />
                                                )}
                                                <span>{isSubmitting ? 'Signing...' : 'Approve with Passkey'}</span>
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <div>
                                                <label className="flex items-center gap-2 text-[10px] md:text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">
                                                    <LockKeyIcon size={16} className="text-orange-500" />
                                                    Security PIN
                                                </label>
                                                <div className="relative group">
                                                    <div className="absolute inset-0 bg-linear-to-r from-orange-500/20 to-transparent opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 rounded-2xl transition-opacity duration-500" />
                                                    <input
                                                        type="password"
                                                        placeholder="••••"
                                                        maxLength={4}
                                                        className="w-full bg-zinc-900/80 backdrop-blur-sm border border-white/10 focus:border-orange-500 p-4 rounded-2xl text-white text-center text-3xl tracking-[1em] font-black focus:outline-none focus:ring-4 focus:ring-orange-500/10 transition-all shadow-inner relative z-10"
                                                        value={password}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            if (val.length <= 4 && /^\d*$/.test(val)) {
                                                                setPassword(val);
                                                            }
                                                        }}
                                                        autoFocus
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' && password.length === 4) {
                                                                handleSignAndSend();
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            <button
                                                onClick={handleSignAndSend}
                                                disabled={password.length !== 4 || isSubmitting}
                                                className="w-full mt-2 py-5 bg-linear-to-r from-orange-500 to-orange-600 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-500 text-white font-bold rounded-2xl shadow-[0_0_20px_rgba(249,115,22,0.2)] hover:shadow-[0_0_30px_rgba(249,115,22,0.4)] disabled:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-3 border border-orange-400/30 disabled:border-transparent"
                                            >
                                                {isSubmitting ? (
                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                ) : (
                                                    <LockKeyIcon size={20} weight="bold" />
                                                )}
                                                <span>{isSubmitting ? 'Authenticating...' : 'Sign & Transact'}</span>
                                            </button>
                                        </div>
                                    )}

                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="p-4 bg-red-500/10 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)] rounded-2xl flex items-start gap-3 relative overflow-hidden"
                                        >
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500/80" />
                                            <WarningIcon size={20} className="text-red-400 shrink-0 mt-0.5" weight="bold" />
                                            <p className="text-xs text-red-200 font-medium leading-relaxed">{error}</p>
                                        </motion.div>
                                    )}

                                    <div className="pt-2">
                                        <button
                                            onClick={handleBack}
                                            disabled={isSubmitting}
                                            className="w-full py-4 bg-transparent hover:bg-white/5 border border-white/10 disabled:opacity-50 text-zinc-400 hover:text-white font-medium rounded-2xl transition-all"
                                        >
                                            Cancel & Go Back
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {step === 'signing' && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="text-center py-8"
                                >
                                    <div className="w-20 h-20 mx-auto mb-6 bg-orange-500/20 rounded-full flex items-center justify-center">
                                        <div className="w-12 h-12 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">Processing Transaction</h3>
                                    <p className="text-zinc-400 mb-2">
                                        Securely transmitting to Injective Network...
                                    </p>
                                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest animate-pulse">
                                        Please do not close this window
                                    </p>
                                </motion.div>
                            )}

                            {step === 'success' && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="text-center py-8"
                                >
                                    <div className="w-20 h-20 mx-auto mb-6 bg-green-500/10 rounded-full flex items-center justify-center border-2 border-green-500/30">
                                        <CheckCircleIcon size={48} className="text-green-500" weight="fill" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-2">Transaction Successful!</h3>
                                    <p className="text-zinc-400 mb-6 px-4">
                                        Your {mode === 'savings' ? 'savings deposit' : 'transfer'} of <span className="text-white font-bold">{amount} INJ</span> has been processed on the Injective Network.
                                    </p>

                                    {lastTxHash && (
                                        <div className="bg-black/30 p-4 border border-white/5 rounded-2xl mb-8 mx-4">
                                            <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-2">Network Receipt</p>
                                            <div className="flex items-center justify-between gap-4">
                                                <p className="text-xs font-mono text-zinc-300 truncate opacity-70">
                                                    tx: {lastTxHash.substring(0, 8)}...{lastTxHash.substring(lastTxHash.length - 8)}
                                                </p>
                                                <a
                                                    href={`https://testnet.explorer.injective.network/transaction/${lastTxHash.startsWith('0x') ? lastTxHash : '0x' + lastTxHash}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-orange-500 hover:text-orange-400 transition-colors shrink-0 bg-orange-500/10 hover:bg-orange-500/20 px-2 py-1 rounded"
                                                >
                                                    <LinkIcon weight="bold" /> Explorer
                                                </a>
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        onClick={() => {
                                            setStep('details');
                                            setAmount('');
                                            setRecipient('');
                                            setLastTxHash(null);
                                            onClose();
                                        }}
                                        className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-2xl transition-all shadow-lg active:scale-[0.98]"
                                    >
                                        Done
                                    </button>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
