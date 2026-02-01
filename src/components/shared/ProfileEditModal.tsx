'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XIcon, PencilIcon } from '@phosphor-icons/react';

interface ProfileEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentName: string;
    onSave: (name: string) => void;
}

export default function ProfileEditModal({ isOpen, onClose, currentName, onSave }: ProfileEditModalProps) {
    const [name, setName] = useState(currentName);

    // Sync internal state with prop changes
    useEffect(() => {
        setName(currentName);
    }, [currentName, isOpen]);

    const handleSave = () => {
        if (name.trim()) {
            onSave(name.trim());
            onClose();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    >
                        <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
                                        <PencilIcon size={20} className="text-orange-400" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-white">Edit Profile</h2>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="text-zinc-400 hover:text-white transition-colors"
                                >
                                    <XIcon size={24} />
                                </button>
                            </div>

                            {/* Form */}
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-2">
                                        Display Name
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Enter your name"
                                        className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500/50"
                                        autoFocus
                                        onKeyPress={(e) => e.key === 'Enter' && handleSave()}
                                    />
                                    <p className="text-xs text-zinc-500 mt-2">
                                        This name will be displayed throughout your dashboard
                                    </p>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={onClose}
                                        className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={!name.trim()}
                                        className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
