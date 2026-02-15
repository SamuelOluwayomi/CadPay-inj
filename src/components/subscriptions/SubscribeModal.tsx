'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XIcon, LockKeyIcon, FingerprintIcon, CheckCircleIcon } from '@phosphor-icons/react';
import { Service, SubscriptionPlan, convertUSDtoKAS } from '@/data/subscriptions';
import { useKasWare } from '@/hooks/useKasWare';
import { useBiometricWallet } from '@/hooks/useBiometricWallet';
import { verifyPassword } from '@/utils/passwordHash';
import { supabase } from '@/lib/supabase';
import { useReceipts } from '@/hooks/useReceipts';
import { useUserProfile } from '@/hooks/useUserProfile';
import { CaretDownIcon, EnvelopeSimpleIcon, UserIcon } from '@phosphor-icons/react';

const MERCHANT_WALLET = 'kaspatest:qzrr3jngvdkh4pupuqn0y2rrwg5x9g2tlwshygsql4d8vekc0nnewcec5rjay';

interface SubscribeModalProps {
    isOpen: boolean;
    onClose: () => void;
    service: Service | null;
    onSubscribe: (serviceId: string, plan: SubscriptionPlan, email: string, price: number, txId: string) => void;
    balance: number;
    kasPrice: number | null;
    existingSubscriptions: any[];
}

export default function SubscribeModal({
    isOpen,
    onClose,
    service,
    onSubscribe,
    balance,
    kasPrice,
    existingSubscriptions
}: SubscribeModalProps) {
    const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
    const [email, setEmail] = useState('');
    const [step, setStep] = useState<'select' | 'verify' | 'processing' | 'success'>('select');
    const [verificationMethod, setVerificationMethod] = useState<'password' | 'biometric' | null>(null);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [txSignature, setTxSignature] = useState('');

    const { address } = useKasWare();
    const { profile } = useUserProfile();
    const { unlockWallet, unlockWalletWithPassword } = useBiometricWallet();
    const { createReceipt } = useReceipts(address);

    const [emailType, setEmailType] = useState<'profile' | 'custom'>(profile?.email ? 'profile' : 'custom');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && service) {
            // Reset state when modal opens
            setSelectedPlan(service.plans[0] || null);
            setEmail('');
            setStep('select');
            setEmailType(profile?.email ? 'profile' : 'custom');
            setEmail(profile?.email || '');
            setVerificationMethod(null);
            setPassword('');
            setError('');
            setTxSignature('');
        }
    }, [isOpen, service]);

    if (!service || !isOpen) return null;

    const priceKAS = selectedPlan ? convertUSDtoKAS(selectedPlan.priceUSD, kasPrice || 0.15) : 0;
    const hasEnoughBalance = balance >= priceKAS;

    // Check if user already has this subscription
    const alreadySubscribed = existingSubscriptions.some(sub => sub.serviceId === service.id);

    const handleProceedToVerification = () => {
        if (!selectedPlan) {
            setError('Please select a plan');
            return;
        }
        if (!email) {
            setError('Please enter your email');
            return;
        }
        if (!hasEnoughBalance) {
            setError(`Insufficient balance. You need ${priceKAS.toFixed(2)} KAS`);
            return;
        }
        setError('');
        setStep('verify');
    };

    const handleVerification = async () => {
        if (!verificationMethod) {
            setError('Please select a verification method');
            return;
        }

        setError('');
        setStep('processing');

        try {
            // Initialize WASM
            const { initKaspaWasm, signTransaction } = await import('@/lib/kaspa-wallet');
            await initKaspaWasm();

            // Step 1: Verify and unlock wallet
            let unlockResult;
            if (verificationMethod === 'password') {
                if (!password) {
                    setError('Please enter your password');
                    setStep('verify');
                    return;
                }

                // Verify password against stored hash
                const { data: credData } = await supabase
                    .from('profiles')
                    .select('password_hash')
                    .eq('wallet_address', address)
                    .single();

                if (!credData || !credData.password_hash) {
                    throw new Error('No password found for this account');
                }

                const isValid = await verifyPassword(password, credData.password_hash);
                if (!isValid) {
                    throw new Error('Invalid password');
                }

                // Use profile email for wallet unlock, not subscription email
                unlockResult = await unlockWalletWithPassword(profile?.email || address!, password);
            } else {
                // Biometric verification - use profile email for wallet unlock
                unlockResult = await unlockWallet(profile?.email || address!);
            }

            if (!unlockResult.success || !unlockResult.mnemonic) {
                throw new Error(unlockResult.error || 'Failed to unlock wallet');
            }

            // Step 2: Send KAS payment
            let txId = '';
            if (typeof window !== 'undefined' && window.kasware && typeof window.kasware.sendKaspa === 'function') {
                const amountSompi = Math.floor(priceKAS * 100_000_000); // Convert KAS to sompi
                // @ts-ignore
                txId = await window.kasware.sendKaspa(MERCHANT_WALLET, amountSompi);
                if (!txId) throw new Error('Transaction failed or was rejected');
            } else {
                // Use built-in wallet for signing
                console.log("KasWare not found, using Secure Cloud Wallet");

                txId = await signTransaction({
                    recipient: MERCHANT_WALLET,
                    amount: priceKAS,
                    seedPhrase: unlockResult.mnemonic,
                    networkType: 'testnet-10'
                });

                if (!txId) throw new Error("Transaction broadcast failed");
            }

            setTxSignature(txId);

            // Step 3: Create receipt
            await createReceipt({
                wallet_address: address!,
                service_name: service.name,
                plan_name: selectedPlan!.name,
                amount_kas: priceKAS,
                amount_usd: selectedPlan!.priceUSD,
                tx_signature: txId,
                status: 'completed',
                merchant_wallet: MERCHANT_WALLET
            });

            // Step 4: Add to local subscriptions
            onSubscribe(service.id, selectedPlan!, email, priceKAS, txId);

            setStep('success');
        } catch (err: any) {
            console.error('Subscription payment failed:', err);
            setError(err.message || 'Payment failed. Please try again.');
            setStep('verify');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        onClick={e => e.stopPropagation()}
                        className="w-full max-w-2xl bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-3xl p-8 max-h-[90vh] overflow-y-auto"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div
                                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                                    style={{ backgroundColor: service.color + '20', color: service.color }}
                                >
                                    {service.icon && <service.icon />}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-white">{service.name}</h2>
                                    <p className="text-sm text-zinc-400">{service.description}</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                            >
                                <XIcon size={20} />
                            </button>
                        </div>

                        {step === 'select' && (
                            <>
                                {/* Plan Selection */}
                                <div className="space-y-4 mb-6">
                                    <h3 className="text-lg font-bold text-white">Select Plan</h3>
                                    <div className="grid gap-4">
                                        {service.plans.map(plan => {
                                            const planPriceKAS = convertUSDtoKAS(plan.priceUSD, kasPrice || 0.15);
                                            return (
                                                <button
                                                    key={plan.name}
                                                    onClick={() => setSelectedPlan(plan)}
                                                    className={`p-4 rounded-xl border-2 transition-all text-left ${selectedPlan?.name === plan.name
                                                        ? 'border-orange-500 bg-orange-500/10'
                                                        : '                                                            border-white/10 bg-white/5 hover:border-white/20'
                                                        }`}
                                                >
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div>
                                                            <h4 className="text-lg font-bold text-white">{plan.name}</h4>
                                                            <div className="flex items-baseline gap-2 mt-1">
                                                                <span className="text-2xl font-bold text-[#70C7BA]">
                                                                    {planPriceKAS.toFixed(2)} KAS
                                                                </span>
                                                                <span className="text-sm text-zinc-400">
                                                                    ≈ ${plan.priceUSD.toFixed(2)} USD
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {selectedPlan?.name === plan.name && (
                                                            <CheckCircleIcon size={24} className="text-orange-500" />
                                                        )}
                                                    </div>
                                                    <ul className="space-y-1">
                                                        {plan.features.map(feature => (
                                                            <li key={feature} className="text-sm text-zinc-400 flex items-center gap-2">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                                                {feature}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Email Selection */}
                                <div className="mb-6 space-y-4">
                                    <label className="block text-sm font-medium text-zinc-400">Subscription Email</label>

                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => {
                                                setEmailType('profile');
                                                setEmail(profile?.email || '');
                                            }}
                                            className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${emailType === 'profile'
                                                ? 'bg-orange-500/10 border-orange-500 text-white'
                                                : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10'
                                                }`}
                                        >
                                            <UserIcon size={18} weight={emailType === 'profile' ? "fill" : "regular"} />
                                            <span className="text-xs font-bold">Profile Email</span>
                                        </button>
                                        <button
                                            onClick={() => setEmailType('custom')}
                                            className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${emailType === 'custom'
                                                ? 'bg-orange-500/10 border-orange-500 text-white'
                                                : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10'
                                                }`}
                                        >
                                            <EnvelopeSimpleIcon size={18} weight={emailType === 'custom' ? "fill" : "regular"} />
                                            <span className="text-xs font-bold">Custom Email</span>
                                        </button>
                                    </div>

                                    {emailType === 'custom' ? (
                                        <div className="relative">
                                            <EnvelopeSimpleIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={e => setEmail(e.target.value)}
                                                placeholder="Enter custom email"
                                                className="w-full pl-12 pr-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-all"
                                            />
                                        </div>
                                    ) : (
                                        <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between">
                                            <span className="text-sm text-zinc-300">{profile?.email || 'No email in profile'}</span>
                                            {!profile?.email && (
                                                <button
                                                    onClick={() => setEmailType('custom')}
                                                    className="text-xs text-orange-400 hover:underline"
                                                >
                                                    Set custom
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Balance Warning */}
                                {!hasEnoughBalance && (
                                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl mb-6">
                                        <p className="text-sm text-red-400">
                                            Insufficient balance. You have {balance.toFixed(2)} KAS but need {priceKAS.toFixed(2)} KAS
                                        </p>
                                    </div>
                                )}

                                {/* Already Subscribed Warning */}
                                {alreadySubscribed && (
                                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl mb-6">
                                        <p className="text-sm text-yellow-400">
                                            You are already subscribed to {service.name}
                                        </p>
                                    </div>
                                )}

                                {error && (
                                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl mb-6">
                                        <p className="text-sm text-red-400">{error}</p>
                                    </div>
                                )}

                                <button
                                    onClick={handleProceedToVerification}
                                    disabled={!hasEnoughBalance || alreadySubscribed || (emailType === 'custom' && !email)}
                                    className="w-full py-4 bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    Continue to Payment
                                </button>
                            </>
                        )}

                        {step === 'verify' && (
                            <>
                                <div className="mb-6">
                                    <h3 className="text-lg font-bold text-white mb-4">Verify Payment</h3>
                                    <div className="p-4 bg-white/5 rounded-xl mb-6">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-zinc-400">Amount</span>
                                            <div className="text-right">
                                                <p className="text-xl font-bold text-[#70C7BA]">{priceKAS.toFixed(2)} KAS</p>
                                                <p className="text-sm text-zinc-500">≈ ${selectedPlan?.priceUSD.toFixed(2)} USD</p>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-zinc-400">To</span>
                                            <span className="text-zinc-300 font-mono text-xs">{MERCHANT_WALLET.slice(0, 20)}...</span>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <button
                                            onClick={() => setVerificationMethod('password')}
                                            className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${verificationMethod === 'password'
                                                ? 'border-orange-500 bg-orange-500/10'
                                                : 'border-white/10 bg-white/5 hover:border-white/20'
                                                }`}
                                        >
                                            <LockKeyIcon size={24} />
                                            <div className="text-left flex-1">
                                                <p className="font-bold">Password</p>
                                                <p className="text-sm text-zinc-400">Use your account password</p>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => setVerificationMethod('biometric')}
                                            className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${verificationMethod === 'biometric'
                                                ? 'border-orange-500 bg-orange-500/10'
                                                : 'border-white/10 bg-white/5 hover:border-white/20'
                                                }`}
                                        >
                                            <FingerprintIcon size={24} />
                                            <div className="text-left flex-1">
                                                <p className="font-bold">Biometric</p>
                                                <p className="text-sm text-zinc-400">Use fingerprint or face ID</p>
                                            </div>
                                        </button>
                                    </div>

                                    {verificationMethod === 'password' && (
                                        <div className="mt-4">
                                            <input
                                                type="password"
                                                value={password}
                                                onChange={e => setPassword(e.target.value)}
                                                placeholder="Enter your password"
                                                className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                                            />
                                        </div>
                                    )}

                                    {verificationMethod === 'biometric' && (
                                        <div className="mt-4 p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl">
                                            <div className="flex gap-3">
                                                <FingerprintIcon size={20} className="text-orange-500 shrink-0 mt-0.5" />
                                                <div className="text-sm">
                                                    <p className="text-orange-200 font-medium mb-1">Browser Passkey Prompt</p>
                                                    <p className="text-zinc-400">
                                                        Your browser will ask you to <span className="text-white font-mono bg-white/10 px-1 rounded">Sign in</span> with your passkey to authorize this transaction. This secures your funds.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {error && (
                                        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl mt-4">
                                            <p className="text-sm text-red-400">{error}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setStep('select')}
                                        className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-colors"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={handleVerification}
                                        disabled={!verificationMethod || (verificationMethod === 'password' && !password)}
                                        className="flex-1 py-4 bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold rounded-xl transition-colors"
                                    >
                                        {verificationMethod === 'biometric' ? 'Authenticate & Pay' : 'Confirm & Pay'}
                                    </button>
                                </div>
                            </>
                        )}

                        {step === 'processing' && (
                            <div className="py-12 text-center">
                                <div className="w-16 h-16 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-white mb-2">Processing Payment...</h3>
                                <p className="text-zinc-400">Please wait while we process your subscription</p>
                            </div>
                        )}

                        {step === 'success' && (
                            <div className="py-8 text-center">
                                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircleIcon size={48} className="text-green-500" />
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2">Subscription Successful!</h3>
                                <p className="text-zinc-400 mb-6">You're now subscribed to {service.name}</p>
                                <div className="p-4 bg-white/5 rounded-xl mb-6 text-left">
                                    <div className="flex justify-between mb-2">
                                        <span className="text-zinc-400">Amount Paid</span>
                                        <span className="text-white font-bold">{priceKAS.toFixed(2)} KAS</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-zinc-400">Transaction</span>
                                        <span className="text-zinc-300 font-mono text-xs">{txSignature.slice(0, 20)}...</span>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-colors"
                                >
                                    Done
                                </button>
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
