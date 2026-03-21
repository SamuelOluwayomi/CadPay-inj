'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    XIcon, UserIcon, LockKeyIcon, GenderMaleIcon, GenderFemaleIcon,
    CheckIcon, CameraIcon, CaretDownIcon, ShieldCheckIcon
} from '@phosphor-icons/react';

interface FullProfileEditModalProps {
    isOpen: boolean;
    isLoading?: boolean;
    onClose: () => void;
    currentProfile: {
        username: string;
        gender: string;
        avatar: string;
        avatar_url?: string;
    };
    onSave: (profile: { username: string; pin?: string; gender: string; avatar: string; avatar_url?: string }) => void;
}

const AVATAR_OPTIONS = [
    '👤', '👨', '👩', '🧑', '👨‍💼', '👩‍💼', '👨‍🎓', '👩‍🎓',
    '👨‍💻', '👩‍💻', '🧙‍♂️', '🧙‍♀️', '🦸‍♂️', '🦸‍♀️', '🧑‍🚀', '👨‍🚀',
    '🦊', '🐱', '🐼', '🦁', '🚀', '🌟', '⚡', '🔥'
];

export default function FullProfileEditModal({ isOpen, isLoading, onClose, currentProfile, onSave }: FullProfileEditModalProps) {
    const [username, setUsername] = useState(currentProfile.username);
    const [gender, setGender] = useState(currentProfile.gender);
    const [avatar, setAvatar] = useState(currentProfile.avatar);
    const [avatarUrl, setAvatarUrl] = useState(currentProfile.avatar_url || '');
    const [useImageAvatar, setUseImageAvatar] = useState(!!currentProfile.avatar_url);

    // Security Accordion
    const [isSecurityOpen, setIsSecurityOpen] = useState(false);
    const [newPIN, setNewPIN] = useState('');
    const [confirmPIN, setConfirmPIN] = useState('');

    // Avatar Drawer
    const [isAvatarDrawerOpen, setIsAvatarDrawerOpen] = useState(false);

    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setUsername(currentProfile.username);
            setGender(currentProfile.gender);
            setAvatar(currentProfile.avatar);
            setAvatarUrl(currentProfile.avatar_url || '');
            setUseImageAvatar(!!currentProfile.avatar_url);
            setIsSecurityOpen(false);
            setNewPIN('');
            setConfirmPIN('');
            setIsAvatarDrawerOpen(false);
            setError('');
        }
    }, [isOpen, currentProfile]);

    const handleSave = () => {
        if (!username.trim()) {
            setError('Username cannot be empty');
            return;
        }

        if (isSecurityOpen) {
            if (newPIN.length !== 4) {
                setError('New PIN must be 4 digits');
                return;
            }
            if (newPIN !== confirmPIN) {
                setError('PINs do not match');
                return;
            }
        }

        onSave({
            username: username.trim(),
            gender,
            avatar,
            avatar_url: useImageAvatar ? avatarUrl : '',
            ...(isSecurityOpen && { pin: newPIN })
        });
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-9999 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-zinc-900 border border-white/10 rounded-[32px] w-full max-w-lg flex flex-col relative shadow-2xl overflow-hidden"
                    style={{ maxHeight: '90vh' }}
                >
                    {/* Submit Loader Overlay */}
                    <AnimatePresence>
                        {isLoading && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex flex-col items-center justify-center"
                            >
                                <div className="w-14 h-14 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(249,115,22,0.5)]" />
                                <p className="text-white font-black text-lg">Saving Profile...</p>
                                <p className="text-sm text-zinc-400 mt-2 font-medium">Securing changes on-chain</p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Header Pinned */}
                    <div className="flex items-center justify-between p-6 border-b border-white/5 bg-zinc-900/80 backdrop-blur-xl sticky top-0 z-20">
                        <h2 className="text-2xl font-black text-white tracking-tight">Profile Settings</h2>
                        <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white rounded-full transition-colors">
                            <XIcon size={20} weight="bold" />
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8 relative">

                        {/* Error Banner */}
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl mb-6">
                                        <p className="text-sm text-red-400 font-bold text-center">{error}</p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Interactive Avatar Hero */}
                        <div className="flex flex-col items-center justify-center -mt-2">
                            <div className="relative group cursor-pointer" onClick={() => setIsAvatarDrawerOpen(!isAvatarDrawerOpen)}>
                                <div className="absolute -inset-4 bg-orange-500/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="relative w-32 h-32 rounded-[2rem] border-[3px] border-orange-500/50 bg-zinc-800 flex items-center justify-center text-6xl shadow-xl overflow-hidden group-hover:scale-105 group-active:scale-95 transition-all duration-300">
                                    {useImageAvatar && avatarUrl ? (
                                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <span>{avatar}</span>
                                    )}
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                        <CameraIcon size={32} className="text-white drop-shadow-lg" weight="duotone" />
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsAvatarDrawerOpen(!isAvatarDrawerOpen)}
                                className="mt-4 text-sm font-bold text-orange-400 hover:text-orange-300 transition-colors flex items-center gap-1"
                            >
                                Change Avatar <CaretDownIcon size={16} className={`transition-transform duration-300 ${isAvatarDrawerOpen ? 'rotate-180' : ''}`} weight="bold" />
                            </button>

                            {/* Expandable Avatar Grid */}
                            <AnimatePresence>
                                {isAvatarDrawerOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                        animate={{ opacity: 1, height: 'auto', marginTop: 24 }}
                                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                        className="w-full overflow-hidden"
                                    >
                                        <div className="p-4 bg-black/30 border border-white/5 rounded-3xl space-y-4">
                                            {avatarUrl && (
                                                <button
                                                    onClick={() => setUseImageAvatar(true)}
                                                    className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all ${useImageAvatar ? 'border-orange-500 bg-orange-500/10' : 'border-white/5 hover:bg-white/5'}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <img src={avatarUrl} className="w-8 h-8 rounded-lg" />
                                                        <span className="text-sm font-bold text-white">Use Source Photo</span>
                                                    </div>
                                                    {useImageAvatar && <CheckIcon size={18} className="text-orange-500" weight="bold" />}
                                                </button>
                                            )}

                                            <div className="grid grid-cols-6 gap-2 max-h-40 overflow-y-auto custom-scrollbar p-1">
                                                {AVATAR_OPTIONS.map((av) => (
                                                    <button
                                                        key={av}
                                                        onClick={() => {
                                                            setAvatar(av);
                                                            setUseImageAvatar(false);
                                                        }}
                                                        className={`aspect-square rounded-xl text-2xl flex items-center justify-center transition-all ${!useImageAvatar && avatar === av ? 'bg-orange-500/20 border-2 border-orange-500 scale-110 shadow-lg z-10' : 'bg-white/5 border border-transparent hover:bg-white/10 hover:scale-105'}`}
                                                    >
                                                        {av}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Elegant Form Fields */}
                        <div className="space-y-6">
                            {/* Username */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">Username</label>
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-linear-to-r from-orange-500/20 to-orange-600/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                                    <div className="relative flex items-center bg-zinc-800/80 border border-white/10 rounded-2xl overflow-hidden focus-within:border-orange-500/50 transition-colors">
                                        <div className="pl-5 text-zinc-500 group-focus-within:text-orange-500 transition-colors">
                                            <UserIcon size={22} weight="duotone" />
                                        </div>
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={(e) => { setUsername(e.target.value); setError(''); }}
                                            className="w-full bg-transparent text-white font-bold p-5 focus:outline-none"
                                            placeholder="Enter username"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Gender Radio Cards */}
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">Gender</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { id: 'male', label: 'Male', icon: GenderMaleIcon },
                                        { id: 'female', label: 'Female', icon: GenderFemaleIcon },
                                        { id: 'other', label: 'Other', icon: UserIcon }
                                    ].map((g) => (
                                        <button
                                            key={g.id}
                                            onClick={() => setGender(g.id)}
                                            className={`relative flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all ${gender === g.id
                                                    ? 'border-orange-500 bg-orange-500/10 shadow-[0_4px_20px_rgba(249,115,22,0.15)]'
                                                    : 'border-white/5 bg-white/5 hover:border-white/10 hover:bg-white/10'
                                                }`}
                                        >
                                            <g.icon size={28} weight={gender === g.id ? 'fill' : 'duotone'} className={gender === g.id ? 'text-orange-500' : 'text-zinc-500'} />
                                            <span className={`text-xs font-bold mt-2 ${gender === g.id ? 'text-white' : 'text-zinc-400'}`}>
                                                {g.label}
                                            </span>
                                            {gender === g.id && (
                                                <div className="absolute top-2 right-2 flex min-h-[12px] min-w-[12px]">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Elaborate Security Accordion */}
                        <div className="pt-2">
                            <button
                                onClick={() => setIsSecurityOpen(!isSecurityOpen)}
                                className={`w-full flex items-center justify-between p-5 rounded-2xl border transition-all ${isSecurityOpen
                                        ? 'bg-orange-500/10 border-orange-500/50'
                                        : 'bg-zinc-800/80 border-white/5 hover:bg-zinc-800'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`p-2.5 rounded-xl ${isSecurityOpen ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'bg-white/5 text-zinc-400'}`}>
                                        <ShieldCheckIcon size={22} weight="duotone" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-bold text-white mb-0.5">Change Security PIN</p>
                                        <p className="text-[11px] text-zinc-500 font-medium">Update your 4-digit transaction pass</p>
                                    </div>
                                </div>
                                <CaretDownIcon size={20} className={`text-zinc-500 transition-transform duration-300 ${isSecurityOpen ? 'rotate-180' : ''}`} weight="bold" />
                            </button>

                            <AnimatePresence>
                                {isSecurityOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="p-5 mt-3 bg-black/40 border border-white/5 rounded-2xl space-y-4">
                                            <div>
                                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1 mb-2 block">New PIN</label>
                                                <div className="relative">
                                                    <LockKeyIcon size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500" />
                                                    <input
                                                        type="password"
                                                        value={newPIN}
                                                        onChange={(e) => { e.target.value.length <= 4 && setNewPIN(e.target.value); setError(''); }}
                                                        maxLength={4}
                                                        placeholder="••••"
                                                        className="w-full bg-zinc-900 border border-white/10 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 rounded-xl py-4 pl-14 pr-4 text-center text-3xl font-black tracking-[0.5em] text-white transition-all outline-none"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1 mb-2 block">Confirm PIN</label>
                                                <div className="relative">
                                                    <LockKeyIcon size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500" />
                                                    <input
                                                        type="password"
                                                        value={confirmPIN}
                                                        onChange={(e) => { e.target.value.length <= 4 && setConfirmPIN(e.target.value); setError(''); }}
                                                        maxLength={4}
                                                        placeholder="••••"
                                                        className="w-full bg-zinc-900 border border-white/10 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 rounded-xl py-4 pl-14 pr-4 text-center text-3xl font-black tracking-[0.5em] text-white transition-all outline-none"
                                                    />
                                                </div>
                                            </div>
                                            {newPIN && confirmPIN && newPIN !== confirmPIN && (
                                                <p className="text-xs text-red-500 text-center font-bold animate-pulse">PINs do not match</p>
                                            )}
                                            {newPIN && confirmPIN && newPIN === confirmPIN && newPIN.length === 4 && (
                                                <p className="text-xs text-green-500 text-center font-bold">PINs match successfully</p>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Sticky Footer */}
                    <div className="p-6 border-t border-white/5 bg-zinc-900/80 backdrop-blur-xl z-20">
                        <button
                            onClick={handleSave}
                            disabled={isLoading}
                            className="w-full relative overflow-hidden group py-4 rounded-xl flex items-center justify-center bg-orange-500 disabled:opacity-70 transition-all active:scale-[0.98] shadow-lg shadow-orange-500/20"
                        >
                            <div className="absolute inset-0 bg-linear-to-r from-orange-400 to-orange-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="relative z-10 flex items-center gap-2">
                                <CheckIcon size={22} weight="bold" className="text-white" />
                                <span className="text-white font-black text-lg">Save Changes</span>
                            </div>
                        </button>
                    </div>

                    <style jsx>{`
                        .custom-scrollbar::-webkit-scrollbar {
                            width: 6px;
                        }
                        .custom-scrollbar::-webkit-scrollbar-track {
                            background: transparent;
                        }
                        .custom-scrollbar::-webkit-scrollbar-thumb {
                            background: rgba(255, 255, 255, 0.1);
                            border-radius: 10px;
                        }
                        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                            background: rgba(249, 115, 22, 0.4);
                        }
                    `}</style>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
