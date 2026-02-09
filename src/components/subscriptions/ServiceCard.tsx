'use client';

import { motion } from 'framer-motion';
import { Service, convertUSDtoKAS } from '@/data/subscriptions';
import { useState, useEffect } from 'react';

interface ServiceCardProps {
    service: Service;
    onClick: () => void;
}

export default function ServiceCard({ service, onClick }: ServiceCardProps) {
    const [kasPrice, setKasPrice] = useState(0.15); // Default KAS price

    // Fetch real-time KAS price
    useEffect(() => {
        const fetchPrice = async () => {
            try {
                const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=kaspa&vs_currencies=usd');
                const data = await response.json();
                setKasPrice(data.kaspa.usd);
            } catch (error) {
                console.error('Failed to fetch KAS price:', error);
            }
        };
        fetchPrice();
    }, []);

    const minPriceUSD = Math.min(...service.plans.map(p => p.priceUSD));
    const minPriceKAS = convertUSDtoKAS(minPriceUSD, kasPrice);

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

                {/* Service icon */}
                <div
                    className="relative z-10 text-4xl mb-3 p-3 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${service.color}20`, color: service.color }}
                >
                    <service.icon size={32} />
                </div>

                {/* Service info */}
                <div className="relative z-10">
                    <h3 className="text-lg font-bold text-white mb-1 leading-tight">{service.name}</h3>
                    <p className="text-xs text-zinc-400 line-clamp-2 max-w-[140px] mx-auto mb-2 opacity-80 group-hover:opacity-100 transition-opacity">{service.description}</p>

                    {/* Price pill with KAS */}
                    <div
                        className="inline-block px-3 py-1 rounded-full text-xs font-bold"
                        style={{
                            backgroundColor: `${service.color}20`,
                            color: service.color
                        }}
                    >
                        {minPriceUSD === 0 ? 'Free' : `${minPriceKAS.toFixed(0)} KAS`}
                    </div>
                    {minPriceUSD > 0 && (
                        <p className="text-[10px] text-zinc-500 mt-1">≈ ${minPriceUSD} USD</p>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
