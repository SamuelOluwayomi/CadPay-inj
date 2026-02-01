'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircleIcon, WarningIcon, XIcon, InfoIcon } from '@phosphor-icons/react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

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

    const showToast = (message: string, type: ToastType = 'info') => {
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
            <div className="fixed top-6 right-6 z-9999 space-y-3 pointer-events-none">
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
            bg: 'bg-green-500/20',
            border: 'border-green-500/50',
            text: 'text-green-400',
        },
        error: {
            icon: <WarningIcon size={20} weight="fill" />,
            bg: 'bg-red-500/20',
            border: 'border-red-500/50',
            text: 'text-red-400',
        },
        warning: {
            icon: <WarningIcon size={20} weight="fill" />,
            bg: 'bg-orange-500/20',
            border: 'border-orange-500/50',
            text: 'text-orange-400',
        },
        info: {
            icon: <InfoIcon size={20} weight="fill" />,
            bg: 'bg-blue-500/20',
            border: 'border-blue-500/50',
            text: 'text-blue-400',
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
