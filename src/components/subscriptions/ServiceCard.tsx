'use client';

import { motion } from 'framer-motion';
import { Service, convertUSDtoINJ } from '@/data/subscriptions';
import { useState, useEffect } from 'react';

interface ServiceCardProps {
    service: Service;
    onClick: () => void;
}

export default function ServiceCard({ service, onClick }: ServiceCardProps) {
    const [injPrice, setInjPrice] = useState(25.00); // Default INJ price

    // Fetch real-time KAS price
    useEffect(() => {
        const fetchPrice = async () => {
            try {
                const response = await fetch('/api/price/inj');
                const data = await response.json();
                if (data?.['injective-protocol']?.usd) {
                    setInjPrice(data['injective-protocol'].usd);
                }
            } catch (error) {
                console.error('Failed to fetch INJ price:', error);
            }
        };
        fetchPrice();
    }, []);

    const minPriceUSD = Math.min(...service.plans.map(p => p.priceUSD));
    const minPriceINJ = convertUSDtoINJ(minPriceUSD, injPrice);

    return (
        <div className="flex items-center justify-center w-full">
            <motion.div
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClick}
                className="relative bg-zinc-900/80 backdrop-blur-md rounded-2xl p-6 cursor-pointer group flex flex-col items-center justify-center text-center w-full transition-all duration-300 overflow-hidden min-h-[220px]"
                style={{
                    border: `2px solid ${service.color}40`,
                    boxShadow: `0 0 0px ${service.color}00`
                }}
            >
                {/* Color accent - Glow on hover */}
                <div
                    className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                        boxShadow: `0 0 30px ${service.color}30, inset 0 0 20px ${service.color}10`,
                        border: `2px solid ${service.color}`
                    }}
                />

                {/* Service icon/image */}
                <div
                    className="relative z-10 w-16 h-16 mb-3 rounded-2xl flex items-center justify-center overflow-hidden border border-white/10 shadow-inner"
                    style={{ backgroundColor: `${service.color}20`, color: service.color }}
                >
                    {service.imageUrl ? (
                        <img src={service.imageUrl} alt={service.name} className="w-full h-full object-cover" />
                    ) : service.icon ? (
                        <service.icon size={32} />
                    ) : (
                        <span className="text-xl font-black">{service.name.charAt(0)}</span>
                    )}
                </div>

                {/* Service info */}
                <div className="relative z-10 w-full">
                    <h3 className="text-xl font-bold text-white mb-1.5 leading-tight">{service.name}</h3>
                    <p className="text-[11px] text-zinc-400 line-clamp-2 max-w-[160px] mx-auto mb-4 opacity-70 group-hover:opacity-100 transition-opacity leading-relaxed font-medium">{service.description}</p>

                    <div
                        className="inline-block px-4 py-1.5 rounded-xl text-xs font-black tracking-wider uppercase mb-1 shadow-lg"
                        style={{
                            backgroundColor: `${service.color}20`,
                            color: service.color,
                            border: `1px solid ${service.color}30`
                        }}
                    >
                        {minPriceUSD === 0 ? 'Free' : `${minPriceINJ.toFixed(0)} INJ`}
                    </div>
                    {minPriceUSD > 0 && (
                        <p className="text-[10px] text-zinc-500 font-bold tracking-tight">≈ ${minPriceUSD} USD</p>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
