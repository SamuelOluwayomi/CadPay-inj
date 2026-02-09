'use client';

import { motion } from 'framer-motion';
import { TrashIcon, CalendarIcon, StorefrontIcon } from '@phosphor-icons/react';
import { ActiveSubscription } from '@/hooks/useSubscriptions';

interface ActiveSubscriptionCardProps {
    subscription: ActiveSubscription;
    onUnsubscribe: (id: string) => void;
}

export default function ActiveSubscriptionCard({ subscription, onUnsubscribe }: ActiveSubscriptionCardProps) {
    const nextBillingDate = new Date(subscription.nextBilling).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    return (
        <div className="flex justify-center w-full">
            <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative bg-zinc-900/50 border border-white/10 rounded-2xl w-full p-6 flex flex-col items-center justify-center text-center group overflow-hidden min-h-[180px]"
                style={{ borderTop: `4px solid ${subscription.color}` }}
            >
                <div
                    className="text-2xl p-3 rounded-full mb-3 flex items-center justify-center"
                    style={{ backgroundColor: `${subscription.color}20`, color: subscription.color }}
                >
                    {typeof subscription.icon === 'function' ? (
                        <subscription.icon size={28} />
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

                {/* Status/Gas Info */}
                <div className="mt-4 flex flex-col items-center">
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-orange-500/10 rounded-full border border-orange-500/20">
                        <div className="w-1 h-1 rounded-full bg-orange-400 animate-pulse" />
                        <span className="text-[8px] text-orange-400 font-bold uppercase">Gasless</span>
                    </div>
                </div>

                {/* Unsubscribe Overlay */}
                <button
                    onClick={() => onUnsubscribe(subscription.id)}
                    className="absolute inset-0 bg-red-500/0 group-hover:bg-red-500/10 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 z-20"
                    title="Unsubscribe"
                >
                    <div className="bg-red-500 p-2 rounded-full shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform">
                        <TrashIcon size={20} className="text-white" weight="bold" />
                    </div>
                </button>
            </motion.div>
        </div>
    );
}
