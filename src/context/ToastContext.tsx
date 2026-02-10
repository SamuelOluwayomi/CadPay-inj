'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircleIcon, WarningIcon, XIcon, InfoIcon } from '@phosphor-icons/react';

type ToastType = 'success' | 'error' | 'warning' | 'pending';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = (message: string, type: ToastType = 'success') => {
        const id = Math.random().toString(36);
        setToasts((prev) => [...prev, { id, message, type }]);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            setToasts((prev) => prev.filter((toast) => toast.id !== id));
        }, 5000);
    };

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}

            {/* Toast Container */}
            <div className="fixed top-6 inset-x-0 flex flex-col items-center md:items-end md:right-6 md:inset-x-auto z-9999 space-y-3 pointer-events-none px-4 md:px-0">
                <AnimatePresence>
                    {toasts.map((toast) => (
                        <ToastItem
                            key={toast.id}
                            toast={toast}
                            onRemove={() => removeToast(toast.id)}
                        />
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
    const config = {
        success: {
            icon: <CheckCircleIcon size={20} weight="fill" />,
            bg: 'bg-[#10b981]/10',
            border: 'border-[#10b981]/30',
            text: 'text-[#10b981]',
        },
        error: {
            icon: <WarningIcon size={20} weight="fill" />,
            bg: 'bg-[#ef4444]/10',
            border: 'border-[#ef4444]/30',
            text: 'text-[#ef4444]',
        },
        warning: {
            icon: <WarningIcon size={20} weight="fill" />,
            bg: 'bg-[#ef4444]/10',
            border: 'border-[#ef4444]/30',
            text: 'text-[#ef4444]',
        },
        pending: {
            icon: <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}><InfoIcon size={20} weight="fill" /></motion.div>,
            bg: 'bg-[#f59e0b]/10',
            border: 'border-[#f59e0b]/30',
            text: 'text-[#f59e0b]',
        },
    };

    const { icon, bg, border, text } = config[toast.type];

    return (
        <motion.div
            initial={{ opacity: 0, x: 100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.8 }}
            className={`${bg} ${border} backdrop-blur-xl border rounded-2xl p-4 shadow-2xl min-w-[320px] max-w-md pointer-events-auto`}
        >
            <div className="flex items-start gap-3">
                <div className={text}>{icon}</div>
                <p className="text-sm text-white flex-1 leading-relaxed">{toast.message}</p>
                <button
                    onClick={onRemove}
                    className="text-zinc-400 hover:text-white transition-colors"
                >
                    <XIcon size={16} />
                </button>
            </div>
        </motion.div>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
}
