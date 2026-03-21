'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
    TrashIcon, CalendarIcon, StorefrontIcon, ClockIcon,
    WarningCircle as WarningCircleIcon, ShieldCheck as ShieldCheckIcon,
    DotsThreeVertical as MenuIcon, X as XIcon, CheckCircle as CheckCircleIcon
} from '@phosphor-icons/react';
import { useState } from 'react';
import { ActiveSubscription } from '@/hooks/useSubscriptions';
import { SERVICES } from '@/data/subscriptions';

interface ActiveSubscriptionCardProps {
    subscription: ActiveSubscription;
    onUnsubscribe: (id: string) => void;
    onToggleAutoRenew?: (id: string, enabled: boolean) => void;
}

export default function ActiveSubscriptionCard({ subscription, onUnsubscribe, onToggleAutoRenew }: ActiveSubscriptionCardProps) {
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [isCancelling, setIsCancelling] = useState(false);

    const reasons = [
        "Too expensive",
        "Found a better alternative",
        "Service is buggy",
        "No longer need it",
        "Other"
    ];

    const handleCancel = async () => {
        setIsCancelling(true);
        // Simulate survey submission delay
        await new Promise(r => setTimeout(r, 800));
        onUnsubscribe(subscription.id);
        setIsCancelModalOpen(false);
        setIsCancelling(false);
    };

    const ServiceIcon = SERVICES.find(s => s.id === subscription.serviceId)?.icon;

    const nextBillingDate = new Date(subscription.nextBilling).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    const isExpired = subscription.status === 'expired';
    const isCanceled = subscription.status === 'canceled';
    const isActive = subscription.status === 'active';

    return (
        <div className="flex justify-center w-full">
            <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`relative bg-zinc-900/50 border border-white/10 rounded-2xl w-full p-6 flex flex-col items-center justify-center text-center group overflow-hidden min-h-[220px] transition-all duration-500 ${isExpired ? 'grayscale opacity-70 border-red-500/30' : ''}`}
                style={{ borderTop: `4px solid ${isExpired ? '#71717a' : subscription.color}` }}
            >
                {/* Status Badges */}
                <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
                    {isExpired && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 rounded-lg border border-red-500/20 shadow-lg shadow-red-500/5">
                            <ClockIcon size={12} className="text-red-400" weight="bold" />
                            <span className="text-[10px] text-red-100 font-black uppercase tracking-widest">Expired</span>
                        </div>
                    )}
                    {isCanceled && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-800/80 rounded-lg border border-white/5 shadow-xl">
                            <WarningCircleIcon size={12} className="text-zinc-400" weight="bold" />
                            <span className="text-[10px] text-zinc-100 font-black uppercase tracking-widest">Canceled</span>
                        </div>
                    )}
                    {isActive && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 rounded-lg border border-green-500/20 shadow-lg shadow-green-500/5">
                            <ShieldCheckIcon size={12} className="text-green-400" weight="bold" />
                            <span className="text-[10px] text-green-100 font-black uppercase tracking-widest">Active</span>
                        </div>
                    )}
                </div>

                <div className="absolute top-3 right-3 z-10">
                    <button className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 text-zinc-500 hover:text-white">
                        <MenuIcon size={18} />
                    </button>
                </div>
                <div
                    className="text-2xl p-3 rounded-full mb-3 flex items-center justify-center"
                    style={{ backgroundColor: `${subscription.color}20`, color: subscription.color }}
                >
                    {ServiceIcon ? (
                        <ServiceIcon size={28} />
                    ) : (
                        <StorefrontIcon size={28} />
                    )}
                </div>

                <div className="space-y-1">
                    <h4 className="text-base font-bold text-white truncate max-w-[180px]">{subscription.serviceName}</h4>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tight">{subscription.plan} Plan</p>

                    <div className="flex flex-col items-center gap-1 mt-2">
                        <span className="text-sm font-black text-orange-500">
                            ${subscription.priceUSD}/mo
                        </span>
                        <div className="flex items-center gap-1 text-[9px] text-zinc-600">
                            <CalendarIcon size={10} />
                            <span>{nextBillingDate}</span>
                        </div>
                    </div>
                </div>

                {/* Auto-renew Toggle Mock UI */}
                <div className="mt-6 flex items-center justify-between w-full px-2 pt-4 border-t border-white/5">
                    <div className="flex flex-col items-start gap-0.5">
                        <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider">Auto-renew</span>
                        <span className={`text-[10px] font-bold ${subscription.autoRenew ? 'text-green-400' : 'text-zinc-500'}`}>
                            {subscription.autoRenew ? 'Enabled' : 'Disabled'}
                        </span>
                    </div>
                    <button
                        onClick={() => onToggleAutoRenew?.(subscription.id, !subscription.autoRenew)}
                        className={`w-9 h-5 rounded-full relative transition-all duration-300 ${subscription.autoRenew ? 'bg-orange-500' : 'bg-zinc-700'}`}
                    >
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300 ${subscription.autoRenew ? 'left-5' : 'left-1'}`} />
                    </button>
                </div>

                <div className="mt-4 flex flex-col items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-orange-500/10 rounded-full border border-orange-500/20">
                        <div className="w-1 h-1 rounded-full bg-orange-400 animate-pulse" />
                        <span className="text-[8px] text-orange-400 font-bold uppercase tracking-tight">Real-time Check</span>
                    </div>
                </div>

                {/* Unsubscribe Overlay */}
                {!isCanceled && !isExpired && (
                    <button
                        onClick={() => setIsCancelModalOpen(true)}
                        className="absolute inset-0 bg-red-500/0 group-hover:bg-red-500/10 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 z-20"
                        title="Unsubscribe"
                    >
                        <div className="bg-red-500 p-2 rounded-full shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform">
                            <TrashIcon size={20} className="text-white" weight="bold" />
                        </div>
                    </button>
                )}

                {/* Cancellation Modal */}
                <AnimatePresence>
                    {isCancelModalOpen && (
                        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-black/80 backdrop-blur-md"
                                onClick={() => !isCancelling && setIsCancelModalOpen(false)}
                            />
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                className="bg-zinc-900 border border-white/10 rounded-3xl w-full max-w-sm p-8 relative z-10 shadow-2xl text-left"
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-bold text-white">Cancel Subscription?</h3>
                                    <button
                                        onClick={() => setIsCancelModalOpen(false)}
                                        className="p-2 hover:bg-white/5 rounded-full transition-colors"
                                    >
                                        <XIcon size={20} className="text-zinc-500" />
                                    </button>
                                </div>

                                <p className="text-sm text-zinc-400 mb-6">We're sorry to see you go. Help us improve by telling us why you're canceling:</p>

                                <div className="space-y-2 mb-8">
                                    {reasons.map(reason => (
                                        <button
                                            key={reason}
                                            onClick={() => setCancelReason(reason)}
                                            className={`w-full p-4 rounded-xl border transition-all text-xs font-bold text-left flex items-center justify-between ${cancelReason === reason ? 'bg-orange-500/10 border-orange-500 text-white' : 'bg-white/5 border-white/5 text-zinc-500 hover:border-white/10'}`}
                                        >
                                            {reason}
                                            {cancelReason === reason && <CheckCircleIcon size={16} className="text-orange-500" />}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setIsCancelModalOpen(false)}
                                        disabled={isCancelling}
                                        className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-black rounded-2xl transition-all disabled:opacity-50"
                                    >
                                        Keep It
                                    </button>
                                    <button
                                        onClick={handleCancel}
                                        disabled={!cancelReason || isCancelling}
                                        className="flex-1 py-4 bg-red-500 hover:bg-red-600 text-white font-black rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isCancelling ? 'Processing...' : 'End Access'}
                                    </button>
                                </div>
                                <p className="text-[10px] text-center text-zinc-600 mt-4 leading-tight italic font-medium">Your access will remain until the end of the current billing cycle.</p>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
