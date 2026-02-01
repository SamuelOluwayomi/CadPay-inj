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
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-zinc-900/50 border border-white/10 rounded-xl p-5 relative group"
        >
            <div className="flex items-start gap-4">
                <div
                    className="text-3xl p-3 rounded-lg shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: `${subscription.color}20`, color: subscription.color }}
                >
                    {typeof subscription.icon === 'function' ? (
                        <subscription.icon size={32} />
                    ) : (
                        <StorefrontIcon size={32} />
                    )}
                </div>

                {/* Subscription Details */}
                <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-bold text-white mb-1">{subscription.serviceName}</h4>
                    <p className="text-sm text-zinc-400 mb-2">{subscription.plan} Plan</p>

                    <div className="flex items-center gap-4 text-xs text-zinc-500">
                        <div className="flex items-center gap-1">
                            <CalendarIcon size={14} />
                            <span>Next billing: {nextBillingDate}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="font-medium" style={{ color: subscription.color }}>
                                ${subscription.price}/mo
                            </span>
                        </div>
                    </div>

                    <p className="text-xs text-zinc-600 mt-2 truncate">{subscription.email}</p>

                    {/* Transaction ID (if available) */}
                    {subscription.transactionSignature && (
                        <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-zinc-600">TX:</span>
                            <code className="text-xs text-zinc-500 font-mono truncate max-w-[200px]">
                                {subscription.transactionSignature.slice(0, 8)}...{subscription.transactionSignature.slice(-8)}
                            </code>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation(); // Prevent card interactions
                                    navigator.clipboard.writeText(subscription.transactionSignature!);
                                    // Show visual feedback
                                    const btn = e.currentTarget;
                                    btn.classList.add('text-green-400');
                                    setTimeout(() => btn.classList.remove('text-green-400'), 1000);
                                }}
                                className="p-1.5 hover:bg-white/5 rounded text-zinc-500 hover:text-orange-400 transition-colors"
                                title="Copy Transaction ID"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            </button>
                        </div>
                    )}

                    {/* Gasless indicator */}
                    <div className="flex items-center gap-1 mt-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                        <span className="text-xs text-orange-400">$0 transaction fees</span>
                    </div>
                </div>

                {/* Unsubscribe Button */}
                <button
                    onClick={() => onUnsubscribe(subscription.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-500/10 rounded-lg text-red-400 hover:text-red-300"
                    title="Unsubscribe"
                >
                    <TrashIcon size={18} weight="bold" />
                </button>
            </div>

            {/* Color Accent Line */}
            <div
                className="absolute bottom-0 left-0 right-0 h-0.5 opacity-50"
                style={{ backgroundColor: subscription.color }}
            />
        </motion.div>
    );
}
