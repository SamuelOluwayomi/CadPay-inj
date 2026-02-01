'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XIcon, UserIcon, LockKeyIcon, GenderMaleIcon, GenderFemaleIcon, CheckIcon, WalletIcon } from '@phosphor-icons/react';

interface OnboardingModalProps {
    isOpen: boolean;
    isSubmitting?: boolean;
    walletAddress?: string;
    onComplete: (data: { username: string; pin: string; gender: string; avatar: string }) => void;
}

const AVATAR_OPTIONS = [
    '👤', '👨', '👩', '🧑', '👨‍💼', '👩‍💼', '👨‍🎓', '👩‍🎓',
    '👨‍💻', '👩‍💻', '🧙‍♂️', '🧙‍♀️', '🦸‍♂️', '🦸‍♀️', '🧑‍🚀', '👨‍🚀'
];

export default function OnboardingModal({ isOpen, isSubmitting, walletAddress, onComplete }: OnboardingModalProps) {
    const [step, setStep] = useState(1);
    const [username, setUsername] = useState('');
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [gender, setGender] = useState('');
    const [avatar, setAvatar] = useState(AVATAR_OPTIONS[0]);

    const handleComplete = () => {
        if (username && pin && pin === confirmPin && gender && avatar) {
            onComplete({ username, pin, gender, avatar });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-100 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-zinc-900 border border-white/10 rounded-3xl p-6 md:p-8 max-w-md w-full relative overflow-hidden"
            >
                {/* Submit Loader Overlay */}
                <AnimatePresence>
                    {isSubmitting && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center"
                        >
                            <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin mb-4" />
                            <p className="text-white font-bold">Creating your profile...</p>
                            <p className="text-xs text-zinc-400 mt-2">Waiting for blockchain confirmation</p>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="mb-6">
                    <h2 className="text-3xl font-bold text-white mb-2">Welcome to CadPay! 👋</h2>
                    <p className="text-zinc-400">Let's set up your profile</p>

                    {/* Progress Bar */}
                    <div className="flex gap-2 mt-4">
                        {[1, 2, 3, 4].map((s) => (
                            <div
                                key={s}
                                className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${s <= step ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]' : 'bg-zinc-800'}`}
                            />
                        ))}
                    </div>

                    {/* Wallet Address Display */}
                    {walletAddress && (
                        <div className="mt-4 p-3 bg-zinc-800/50 rounded-xl border border-white/5 flex items-center gap-2">
                            <WalletIcon size={16} className="text-orange-500" />
                            <span className="text-[10px] md:text-xs font-mono text-zinc-400 truncate flex-1">{walletAddress}</span>
                        </div>
                    )}
                </div>

                {/* Step 1: Username */}
                {step === 1 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                        <div>
                            <label className="block text-sm text-zinc-400 mb-2 font-medium">Choose a username</label>
                            <div className="relative">
                                <UserIcon size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="johndoe"
                                    className="w-full pl-12 pr-4 py-4 bg-zinc-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all font-medium"
                                    autoFocus
                                />
                            </div>
                        </div>
                        <button
                            onClick={() => username && setStep(2)}
                            disabled={!username}
                            className="w-full py-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-orange-500/20 active:scale-[0.98]"
                        >
                            Continue
                        </button>
                    </motion.div>
                )}

                {/* Step 2: PIN */}
                {step === 2 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                        <div>
                            <label className="block text-sm text-zinc-400 mb-2 font-medium">Create a 4-digit PIN</label>
                            <div className="relative">
                                <LockKeyIcon size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                                <input
                                    type="password"
                                    value={pin}
                                    onChange={(e) => e.target.value.length <= 4 && setPin(e.target.value)}
                                    placeholder="••••"
                                    maxLength={4}
                                    className="w-full pl-12 pr-4 py-4 bg-zinc-800 border border-white/10 rounded-xl text-white text-center text-2xl tracking-[1em] focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all font-black"
                                    autoFocus
                                />
                            </div>
                            <p className="text-[11px] text-zinc-500 mt-2 text-center">This PIN will be required for all payments</p>
                        </div>
                        <div>
                            <label className="block text-sm text-zinc-400 mb-2 font-medium">Confirm PIN</label>
                            <div className="relative">
                                <LockKeyIcon size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                                <input
                                    type="password"
                                    value={confirmPin}
                                    onChange={(e) => e.target.value.length <= 4 && setConfirmPin(e.target.value)}
                                    placeholder="••••"
                                    maxLength={4}
                                    className="w-full pl-12 pr-4 py-4 bg-zinc-800 border border-white/10 rounded-xl text-white text-center text-2xl tracking-[1em] focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all font-black"
                                />
                            </div>
                            {confirmPin && pin !== confirmPin && (
                                <p className="text-xs text-red-400 mt-2 text-center">PINs don't match</p>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setStep(1)}
                                className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-all active:scale-[0.98]"
                            >
                                Back
                            </button>
                            <button
                                onClick={() => pin.length === 4 && pin === confirmPin && setStep(3)}
                                disabled={pin.length !== 4 || pin !== confirmPin}
                                className="flex-1 py-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-orange-500/20 active:scale-[0.98]"
                            >
                                Continue
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* Step 3: Gender */}
                {step === 3 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                        <div>
                            <label className="block text-sm text-zinc-400 mb-4 font-medium">Select your gender</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setGender('male')}
                                    className={`p-5 rounded-2xl border-2 transition-all ${gender === 'male'
                                        ? 'border-orange-500 bg-orange-500/10 shadow-lg shadow-orange-500/10'
                                        : 'border-white/5 bg-white/5 hover:border-white/10'
                                        }`}
                                >
                                    <GenderMaleIcon size={40} className={`mx-auto mb-2 ${gender === 'male' ? 'text-orange-500' : 'text-zinc-500'}`} />
                                    <p className="text-white font-bold text-sm">Male</p>
                                </button>
                                <button
                                    onClick={() => setGender('female')}
                                    className={`p-5 rounded-2xl border-2 transition-all ${gender === 'female'
                                        ? 'border-orange-500 bg-orange-500/10 shadow-lg shadow-orange-500/10'
                                        : 'border-white/5 bg-white/5 hover:border-white/10'
                                        }`}
                                >
                                    <GenderFemaleIcon size={40} className={`mx-auto mb-2 ${gender === 'female' ? 'text-orange-500' : 'text-zinc-500'}`} />
                                    <p className="text-white font-bold text-sm">Female</p>
                                </button>
                                <button
                                    onClick={() => setGender('other')}
                                    className={`col-span-2 p-4 rounded-xl border-2 transition-all ${gender === 'other'
                                        ? 'border-orange-500 bg-orange-500/10 shadow-lg shadow-orange-500/10'
                                        : 'border-white/5 bg-white/5 hover:border-white/10'
                                        }`}
                                >
                                    <p className="text-white font-bold text-sm">Prefer not to say</p>
                                </button>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setStep(2)}
                                className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-all active:scale-[0.98]"
                            >
                                Back
                            </button>
                            <button
                                onClick={() => gender && setStep(4)}
                                disabled={!gender}
                                className="flex-1 py-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-orange-500/20 active:scale-[0.98]"
                            >
                                Continue
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* Step 4: Avatar */}
                {step === 4 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                        <div>
                            <label className="block text-sm text-zinc-400 mb-4 font-medium">Choose your avatar</label>
                            <div className="grid grid-cols-4 gap-3 max-h-75 overflow-y-auto p-1 custom-scrollbar">
                                {AVATAR_OPTIONS.map((av) => (
                                    <button
                                        key={av}
                                        onClick={() => setAvatar(av)}
                                        className={`aspect-square rounded-2xl border-2 flex items-center justify-center text-3xl transition-all ${avatar === av
                                            ? 'border-orange-500 bg-orange-500/10 scale-105 shadow-lg shadow-orange-500/20'
                                            : 'border-white/5 bg-white/5 hover:border-white/10 hover:scale-[1.02]'
                                            }`}
                                    >
                                        <span className="leading-none select-none">{av}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setStep(3)}
                                className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-all active:scale-[0.98]"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleComplete}
                                disabled={isSubmitting}
                                className="flex-1 py-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 active:scale-[0.98]"
                            >
                                {isSubmitting ? (
                                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <CheckIcon size={20} weight="bold" />
                                        <span>Complete Setup</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                )}
            </motion.div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(249, 115, 22, 0.3);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(249, 115, 22, 0.5);
                }
            `}</style>
        </div>
    );
}
