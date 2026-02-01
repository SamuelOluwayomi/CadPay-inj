'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XIcon, UserIcon, LockKeyIcon, GenderMaleIcon, GenderFemaleIcon, CheckIcon } from '@phosphor-icons/react';

interface FullProfileEditModalProps {
    isOpen: boolean;
    isLoading?: boolean;
    onClose: () => void;
    currentProfile: {
        username: string;
        gender: string;
        avatar: string;
    };
    onSave: (profile: { username: string; pin?: string; gender: string; avatar: string }) => void;
}

const AVATAR_OPTIONS = [
    '👤', '👨', '👩', '🧑', '👨‍💼', '👩‍💼', '👨‍🎓', '👩‍🎓',
    '👨‍💻', '👩‍💻', '🧙‍♂️', '🧙‍♀️', '🦸‍♂️', '🦸‍♀️', '🧑‍🚀', '👨‍🚀'
];

export default function FullProfileEditModal({ isOpen, isLoading, onClose, currentProfile, onSave }: FullProfileEditModalProps) {
    const [activeTab, setActiveTab] = useState<'basic' | 'security' | 'avatar'>('basic');
    const [username, setUsername] = useState(currentProfile.username);
    const [gender, setGender] = useState(currentProfile.gender);
    const [avatar, setAvatar] = useState(currentProfile.avatar);
    const [changePIN, setChangePIN] = useState(false);
    const [currentPIN, setCurrentPIN] = useState('');
    const [newPIN, setNewPIN] = useState('');
    const [confirmPIN, setConfirmPIN] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setUsername(currentProfile.username);
            setGender(currentProfile.gender);
            setAvatar(currentProfile.avatar);
            setChangePIN(false);
            setCurrentPIN('');
            setNewPIN('');
            setConfirmPIN('');
            setError('');
        }
    }, [isOpen, currentProfile]);

    const handleSave = () => {
        // Validate username
        if (!username.trim()) {
            setError('Username cannot be empty');
            return;
        }

        // Validate PIN change if requested
        if (changePIN) {
            // Check for new PIN validity
            if (newPIN.length !== 4) {
                setError('New PIN must be 4 digits');
                return;
            }
            if (newPIN !== confirmPIN) {
                setError('PINs do not match');
                return;
            }
        }

        // Save profile
        onSave({
            username: username.trim(),
            gender,
            avatar,
            ...(changePIN && { pin: newPIN })
        });
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-100 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-zinc-900 border border-white/10 rounded-3xl p-6 md:p-8 max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col relative"
                >
                    {/* Submit Loader Overlay */}
                    <AnimatePresence>
                        {isLoading && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center"
                            >
                                <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin mb-4" />
                                <p className="text-white font-bold text-center">Saving changes...</p>
                                <p className="text-xs text-zinc-400 mt-2">Waiting for blockchain confirmation</p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-white">Edit Profile</h2>
                        <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg">
                            <XIcon size={24} />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 mb-6 bg-zinc-800/50 p-1.5 rounded-xl border border-white/5">
                        {['basic', 'security', 'avatar'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all capitalize ${activeTab === tab
                                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                {tab === 'basic' ? 'Info' : tab}
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2">
                        {error && (
                            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                                <p className="text-xs text-red-400 text-center font-medium">{error}</p>
                            </div>
                        )}

                        {/* Basic Info Tab */}
                        {activeTab === 'basic' && (
                            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                                <div>
                                    <label className="block text-sm text-zinc-400 mb-2 font-medium px-1">Username</label>
                                    <div className="relative">
                                        <UserIcon size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={(e) => {
                                                setUsername(e.target.value);
                                                setError('');
                                            }}
                                            className="w-full pl-12 pr-4 py-4 bg-zinc-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all font-medium"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm text-zinc-400 mb-2 font-medium px-1">Gender</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { id: 'male', label: 'Male', icon: GenderMaleIcon },
                                            { id: 'female', label: 'Female', icon: GenderFemaleIcon },
                                            { id: 'other', label: 'Other', icon: UserIcon }
                                        ].map((g) => (
                                            <button
                                                key={g.id}
                                                onClick={() => setGender(g.id)}
                                                className={`p-4 rounded-xl border-2 transition-all group ${gender === g.id
                                                    ? 'border-orange-500 bg-orange-500/10'
                                                    : 'border-white/5 bg-white/5 hover:border-white/10'
                                                    }`}
                                            >
                                                <g.icon size={32} className={`mx-auto transition-colors ${gender === g.id ? 'text-orange-500' : 'text-zinc-500 group-hover:text-zinc-400'}`} />
                                                <p className="text-[10px] font-bold text-white mt-2 uppercase tracking-wider">{g.label}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Security Tab */}
                        {activeTab === 'security' && (
                            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-zinc-800/50 border border-white/5 rounded-2xl">
                                    <div>
                                        <p className="text-sm font-bold text-white tracking-tight">Security PIN</p>
                                        <p className="text-[11px] text-zinc-500 font-medium">Controls payment authorization</p>
                                    </div>
                                    <button
                                        onClick={() => setChangePIN(!changePIN)}
                                        className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${changePIN
                                            ? 'bg-orange-500 text-white shadow-lg'
                                            : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                                            }`}
                                    >
                                        {changePIN ? 'Cancel' : 'Update PIN'}
                                    </button>
                                </div>

                                {changePIN && (
                                    <div className="space-y-4 pt-2">
                                        <div>
                                            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1">New 4-Digit PIN</label>
                                            <div className="relative">
                                                <LockKeyIcon size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                                                <input
                                                    type="password"
                                                    value={newPIN}
                                                    onChange={(e) => e.target.value.length <= 4 && setNewPIN(e.target.value)}
                                                    maxLength={4}
                                                    placeholder="••••"
                                                    className="w-full pl-12 pr-4 py-4 bg-zinc-800 border border-white/10 rounded-xl text-white text-center text-3xl tracking-[0.8em] focus:outline-none focus:border-orange-500/50 transition-all font-black"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1">Confirm PIN</label>
                                            <div className="relative">
                                                <LockKeyIcon size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                                                <input
                                                    type="password"
                                                    value={confirmPIN}
                                                    onChange={(e) => e.target.value.length <= 4 && setConfirmPIN(e.target.value)}
                                                    maxLength={4}
                                                    placeholder="••••"
                                                    className="w-full pl-12 pr-4 py-4 bg-zinc-800 border border-white/10 rounded-xl text-white text-center text-3xl tracking-[0.8em] focus:outline-none focus:border-orange-500/50 transition-all font-black"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* Avatar Tab */}
                        {activeTab === 'avatar' && (
                            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                                <div className="grid grid-cols-4 gap-3 p-1">
                                    {AVATAR_OPTIONS.map((av) => (
                                        <button
                                            key={av}
                                            onClick={() => setAvatar(av)}
                                            className={`aspect-square rounded-2xl border-2 flex items-center justify-center text-4xl transition-all ${avatar === av
                                                ? 'border-orange-500 bg-orange-500/10 scale-105 shadow-lg shadow-orange-500/20'
                                                : 'border-white/5 bg-white/5 hover:border-white/10 hover:scale-[1.02]'
                                                }`}
                                        >
                                            <span className="leading-none select-none">{av}</span>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="flex gap-3 mt-8 pt-6 border-t border-white/5">
                        <button
                            onClick={onClose}
                            className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-all active:scale-[0.98]"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isLoading}
                            className="flex-1 py-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 active:scale-[0.98]"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <CheckIcon size={20} weight="bold" />
                                    <span>Save Changes</span>
                                </>
                            )}
                        </button>
                    </div>

                    <style jsx>{`
                        .custom-scrollbar::-webkit-scrollbar {
                            width: 5px;
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
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
