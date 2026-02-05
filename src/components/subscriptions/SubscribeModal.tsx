'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XIcon, CheckIcon, EnvelopeSimpleIcon, WarningIcon, LockKeyIcon } from '@phosphor-icons/react';
import { Service, SubscriptionPlan } from '@/data/subscriptions';
import Loader from '@/components/shared/Loader';

interface SubscribeModalProps {
    isOpen: boolean;
    onClose: () => void;
    service: Service | null;
    onSubscribe: (serviceId: string, plan: SubscriptionPlan, email: string, price: number) => Promise<void>;
    balance: number;
    kasPrice: number | null;
    existingSubscriptions?: Array<{ serviceId: string; email: string }>;
}

export default function SubscribeModal({ isOpen, onClose, service, onSubscribe, balance, kasPrice, existingSubscriptions = [] }: SubscribeModalProps) {
    const [step, setStep] = useState<'plans' | 'email' | 'pin' | 'confirm' | 'loading' | 'success'>('plans');
    const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setStep('plans');
            setSelectedPlan(null);
            setEmail('');
            setError('');
        }
    }, [isOpen, service]);

    if (!service) return null;

    // Use Native Balance for checks (since we paying in KAS equivalent or just checking solvency)
    // For this hackathon stub, we assume payment is in KAS if we display KAS
    const sufficientFunds = selectedPlan ? balance * (kasPrice || 0) >= selectedPlan.price : true;
    // Note: This check is approximate. Ideally we check KAS vs KAS cost. 
    // Plan price is USD. KAS needed = plan.price / kasPrice. 
    // Balance (KAS) >= plan.price / kasPrice  => Balance * kasPrice >= plan.price.

    const handleConfirm = async () => {
        if (!selectedPlan) return;

        if (!sufficientFunds) {
            setError(`Insufficient KAS! Need $${selectedPlan.price} worth but only have ${(balance * (kasPrice || 0)).toFixed(2)} USD worth`);
            return;
        }

        setStep('loading');
        setError('');

        try {
            await onSubscribe(service.id, selectedPlan, email, selectedPlan.price);
            setStep('success');
            setTimeout(() => {
                onClose();
            }, 2000);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Subscription transfer failed');
            setStep('confirm');
            // Bypass removed as per user request
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
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    >
                        <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div
                                        className="text-4xl p-3 rounded-xl flex items-center justify-center"
                                        style={{ backgroundColor: `${service.color}20`, color: service.color }}
                                    >
                                        <service.icon size={40} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-white">{service.name}</h2>
                                        <p className="text-zinc-400 text-sm">{service.description}</p>
                                    </div>
                                </div>
                                <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
                                    <XIcon size={24} />
                                </button>
                            </div>

                            {error && (
                                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
                                    <WarningIcon size={20} className="text-red-400 shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-400">{error}</p>
                                </div>
                            )}

                            {/* Plan Selection */}
                            {step === 'plans' && (
                                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                                    <h3 className="text-lg font-bold text-white mb-4">Choose a Plan</h3>
                                    <div className="grid gap-4">
                                        {service.plans.map((plan, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => setSelectedPlan(plan)}
                                                className={`p-5 rounded-xl border-2 cursor-pointer transition-all ${selectedPlan?.name === plan.name
                                                    ? 'border-white/30 bg-white/5'
                                                    : 'border-white/10 hover:border-white/20'
                                                    }`}
                                            >
                                                <div className="flex items-start justify-between mb-3">
                                                    <div>
                                                        <h4 className="text-lg font-bold text-white">{plan.name}</h4>
                                                        <p className="text-2xl font-bold mt-1" style={{ color: service.color }}>
                                                            ${plan.price}<span className="text-sm text-zinc-500">/month</span>
                                                        </p>
                                                        {kasPrice && (
                                                            <p className="text-xs text-zinc-500 mt-1">
                                                                ≈ {(plan.price / kasPrice).toFixed(2)} KAS
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedPlan?.name === plan.name
                                                        ? 'border-white bg-white'
                                                        : 'border-zinc-600'
                                                        }`}>
                                                        {selectedPlan?.name === plan.name && (
                                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: service.color }} />
                                                        )}
                                                    </div>
                                                </div>
                                                <ul className="space-y-2">
                                                    {plan.features.map((feature, i) => (
                                                        <li key={i} className="flex items-center gap-2 text-sm text-zinc-400">
                                                            <CheckIcon size={16} weight="bold" className="text-green-400 shrink-0" />
                                                            {feature}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => selectedPlan && setStep('email')}
                                        disabled={!selectedPlan}
                                        className="w-full mt-6 py-4 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        style={{
                                            backgroundColor: service.color,
                                            color: 'white'
                                        }}
                                    >
                                        Continue
                                    </button>
                                </motion.div>
                            )}

                            {/* Email Input */}
                            {step === 'email' && selectedPlan && (
                                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                                    <h3 className="text-lg font-bold text-white mb-4">Link Your Account</h3>
                                    <p className="text-sm text-zinc-400 mb-6">
                                        Enter the email associated with your {service.name} account
                                    </p>
                                    <div className="mb-6">
                                        <label className="block text-sm text-zinc-400 mb-2">Email Address</label>
                                        <div className="relative">
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => {
                                                    setEmail(e.target.value);
                                                    setError('');
                                                }}
                                                placeholder="you@gmail.com"
                                                className="w-full px-4 py-3 pl-12 bg-zinc-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-white/30"
                                                autoFocus
                                            />
                                            <EnvelopeSimpleIcon size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setStep('plans')}
                                            className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-colors"
                                        >
                                            Back
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (!/\S+@\S+\.\S+/.test(email)) {
                                                    setError('Please enter a valid email address');
                                                    return;
                                                }
                                                // Check for duplicate
                                                const isDuplicate = existingSubscriptions.some(
                                                    sub => sub.serviceId === service.id && sub.email.toLowerCase() === email.toLowerCase()
                                                );
                                                if (isDuplicate) {
                                                    setError(`This email already has an active ${service.name} subscription!`);
                                                    return;
                                                }
                                                setStep('pin');
                                            }}
                                            disabled={!email}
                                            className="flex-1 py-3 font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            style={{ backgroundColor: service.color, color: 'white' }}
                                        >
                                            Continue
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {/* PIN Input */}
                            {step === 'pin' && (
                                <></>
                            )}

                            {/* Confirmation */}
                            {(step === 'confirm' || step === 'pin') && selectedPlan && (
                                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                                    <h3 className="text-lg font-bold text-white mb-4">Confirm Subscription</h3>

                                    <div className="bg-zinc-800/50 rounded-xl p-5 mb-6 space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-zinc-400">Service</span>
                                            <span className="text-white font-medium">{service.name}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-zinc-400">Plan</span>
                                            <span className="text-white font-medium">{selectedPlan.name}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-zinc-400">Email</span>
                                            <span className="text-white font-medium">{email}</span>
                                        </div>
                                        <div className="border-t border-white/10 pt-3 mt-3">
                                            <div className="flex justify-between items-end">
                                                <span className="text-zinc-400">Monthly Cost</span>
                                                <div className="text-right">
                                                    <p className="text-2xl font-bold text-white">${selectedPlan.price}</p>
                                                    <p className="text-xs text-orange-400">Paid in KAS</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex justify-between pt-3 border-t border-white/10">
                                            <span className="text-zinc-400">Your KAS Balance</span>
                                            <span className={`font-medium ${!sufficientFunds ? 'text-red-400' : 'text-green-400'}`}>
                                                {balance.toFixed(2)} KAS
                                            </span>
                                        </div>
                                    </div>

                                    {!sufficientFunds && (
                                        <div className="mb-4 p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl flex items-start gap-3">
                                            <WarningIcon size={20} className="text-orange-400 shrink-0 mt-0.5" />
                                            <div className="text-sm">
                                                <p className="text-orange-400 font-medium mb-1">Insufficient Funds</p>
                                                <p className="text-orange-200/60">Please add funds to your wallet using the 'Fund Wallet' button in overview.</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setStep('email')}
                                            className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-colors"
                                        >
                                            Back
                                        </button>
                                        <button
                                            onClick={handleConfirm}
                                            disabled={!sufficientFunds}
                                            className="flex-1 py-3 font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            style={{ backgroundColor: service.color, color: 'white' }}
                                        >
                                            Confirm & Subscribe
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {/* Loading */}
                            {step === 'loading' && (
                                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12">
                                    <Loader size="lg" className="mx-auto mb-6" />
                                    <h3 className="text-xl font-bold text-white mb-2">Processing Transaction...</h3>
                                    <p className="text-zinc-400">Please sign the request in your wallet.</p>
                                </motion.div>
                            )}

                            {/* Success */}
                            {step === 'success' && (
                                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
                                    <div
                                        className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
                                        style={{ backgroundColor: `${service.color}20`, color: service.color }}
                                    >
                                        <CheckIcon size={40} weight="bold" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">Subscription Activated!</h3>
                                    <p className="text-zinc-400">Welcome to {service.name} {selectedPlan?.name}</p>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
