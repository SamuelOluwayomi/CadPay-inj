'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { SiSolana } from "react-icons/si";
import { XIcon, ArrowUpRightIcon } from '@phosphor-icons/react';

type Feature = {
    id: string;
    headline: string;
    description: string;
    fullDescription: string;
    image: string;
};

const cadpayFeatures: Feature[] = [
    {
        id: 'biometric',
        headline: 'Your Face or Fingerprint is Your Private Key.',
        description: 'Powered by Lazorkit, we map your device\'s biometric authenticator directly to a Solana keypair.',
        fullDescription: 'Powered by Lazorkit, we map your device\'s biometric authenticator directly to a Solana keypair. This eliminates the need for seed phrases, creating a non-custodial wallet that is as secure as a ledger but as easy to access as your phone.',
        image: '/features/identity.png'
    },
    {
        id: 'gasless',
        headline: 'Zero Transaction Fees for Users.',
        description: 'Lazorkit Paymaster sponsors all transaction fees, removing the friction of holding SOL for gas.',
        fullDescription: 'Lazorkit\'s built-in Paymaster service sponsors all network fees automatically. Unlike traditional wallets where users must hold native tokens for gas, Lazorkit eliminates this barrier entirely. All subscription charges, payments, and on-chain operations are executed gaslessly—you never need to think about transaction costs.',
        image: '/features/security.png'
    },
    {
        id: 'autosettlement',
        headline: 'True Recurring Crypto Payments.',
        description: 'Smart contracts typically require manual approval for every transaction.',
        fullDescription: 'Smart contracts typically require manual approval for every transaction. We utilize Lazorkit Session Keys to pre-approve specific subscription parameters, enabling Netflix-style automated billing on-chain without compromising user sovereignty.',
        image: '/features/autopilot.png'
    },
    {
        id: 'infrastructure',
        headline: 'Global Payments at 400ms Finality.',
        description: 'Built on Solana\'s parallelized architecture, CadPay handles thousands of transactions per second.',
        fullDescription: 'Built on Solana\'s parallelized architecture, CadPay handles thousands of transactions per second with near-zero latency. We provide a payment rail fast enough for real-time commerce and cheap enough for micro-transactions.',
        image: '/features/security.png'
    },
    {
        id: 'sdk',
        headline: 'A Composable Financial OS.',
        description: 'We are more than a wallet; we are an open protocol.',
        fullDescription: 'We are more than a wallet; we are an open protocol. Developers can build directly on our settlement layer to create custom subscription models, automated treasury flows, and loyalty rewards that inherit the security of the Solana network.',
        image: '/features/economy.png'
    }
];

// Portal Component to move modal to document.body
const ModalPortal = ({ children }: { children: React.ReactNode }) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!mounted) return null;

    return createPortal(children, document.body);
};

type Bird = {
    id: number;
    x: number;
    y: number;
    rotation: number;
    direction: 'open' | 'close';
};

// Bird Animation Component
function BirdAnimation({ bird, onComplete }: { bird: Bird; onComplete: () => void }) {
    const direction = bird.direction;
    const xDist = direction === 'open'
        ? (Math.random() - 0.5) * 500 - 100 // Fly wider
        : (Math.random() - 0.5) * 600 + (Math.random() > 0.5 ? 200 : -200);
    const yDist = direction === 'open'
        ? -150 - Math.random() * 200 // Fly higher
        : -250 - Math.random() * 300;

    return (
        <motion.div
            initial={{
                x: bird.x,
                y: bird.y,
                opacity: 0,
                scale: 0.3,
                rotate: bird.rotation
            }}
            animate={{
                x: bird.x + xDist,
                y: bird.y + yDist,
                opacity: [0, 1, 1, 0, 0], // Lengthen fade out
                scale: [0.3, 1, 1.5, 1.2, 0.5],
                rotate: bird.rotation + (xDist > 0 ? 45 : -45)
            }}
            transition={{
                duration: direction === 'open' ? 2.5 : 3,
                times: [0, 0.1, 0.5, 0.8, 1]
            }}
            onAnimationComplete={onComplete}
            className="absolute w-8 h-8 text-orange-500 pointer-events-none"
            style={{
                transform: 'translateZ(0)',
                willChange: 'transform, opacity',
                backfaceVisibility: 'hidden'
            }}
        >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full drop-shadow-lg">
                <path d="M2,12 C4,14 8,16 12,12 C16,8 20,8 22,10 C20,14 16,16 12,14 C8,12 4,12 2,12 Z" />
            </svg>
        </motion.div>
    );
}

export default function CoreFeatures() {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);
    const [isDesktop, setIsDesktop] = useState(false);
    const [birds, setBirds] = useState<Bird[]>([]);

    useEffect(() => {
        setMounted(true);
        const checkDesktop = () => {
            setIsDesktop(window.innerWidth >= 768);
        };
        checkDesktop();
        window.addEventListener('resize', checkDesktop);
        return () => window.removeEventListener('resize', checkDesktop);
    }, []);

    const spawnBirds = (x: number, y: number, direction: 'open' | 'close') => {
        const birdCount = 5;
        const newBirds: Bird[] = [];
        for (let i = 0; i < birdCount; i++) {
            newBirds.push({
                id: Date.now() + Math.random() + i,
                x: x + (Math.random() - 0.5) * 100,
                y: y + (Math.random() - 0.5) * 100,
                rotation: Math.random() * 60 - 30,
                direction
            });
        }
        setBirds(prev => [...prev, ...newBirds]);
    };

    const removeBird = (id: number) => {
        setBirds(prev => prev.filter(bird => bird.id !== id));
    };

    useEffect(() => {
        if (selectedId) {
            document.body.style.overflow = 'hidden';
            // Spawn birds on open
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            spawnBirds(centerX, centerY, 'open');
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [selectedId]);

    const handleClose = () => {
        // Spawn birds on close
        if (selectedId) {
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            spawnBirds(centerX, centerY, 'close');
        }
        setSelectedId(null);
    };

    if (!mounted) {
        return (
            <div className="w-full max-w-7xl mx-auto px-6 py-12 -mt-32 relative z-50 min-h-[600px]">
                <div className="mb-20 text-center">
                    <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter mb-4">
                        The CadPay Ecosystem
                    </h2>
                    <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto">
                        The 4 Core Pillars
                    </p>
                </div>
            </div>
        );
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 30 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.8 }
        }
    };

    const cardContainerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const cardVariants = {
        hidden: { opacity: 0, x: 100, scale: 0.9 },
        visible: {
            opacity: 1,
            x: 0,
            scale: 1,
            transition: { duration: 0.8 }
        }
    };

    return (
        <div className="w-full max-w-7xl mx-auto px-6 py-12 -mt-32 relative z-50">
            <motion.div
                className="mb-20 text-center"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                variants={containerVariants}
            >
                <motion.div variants={itemVariants} className="flex items-center justify-center gap-2 mb-4">
                    <span className="bg-zinc-800/80 backdrop-blur-md rounded-full px-4 py-1.5 text-xs font-bold text-white border border-white/10 flex items-center gap-2">
                        <SiSolana className="text-[#9945FF]" /> Built on Solana
                    </span>
                </motion.div>
                <motion.h2 variants={itemVariants} className="text-4xl md:text-6xl font-black text-white tracking-tighter mb-4">
                    The CadPay Ecosystem
                </motion.h2>
                <motion.p variants={itemVariants} className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto">
                    The 5 Core Pillars
                </motion.p>
            </motion.div>

            {/* Cards Section - Horizontal Layout with Staggered Positioning */}
            <div className="relative w-full max-w-7xl mx-auto mb-12 min-h-[500px]">
                {/* Desktop: Cards in horizontal row, staggered vertically */}
                {mounted && isDesktop && (
                    <motion.div
                        className="flex flex-row items-start justify-center gap-6 md:gap-8 relative z-50 w-full"
                        style={{ minHeight: '550px' }}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.2 }}
                        variants={cardContainerVariants}
                    >
                        {cadpayFeatures.map((feature, index) => {
                            // Staggered positions for 5 cards: [450px, 400px, 350px, 400px, 450px]
                            // Offsets: [0px, 40px, 80px, 40px, 0px]
                            const cardHeights = [450, 400, 350, 400, 450];
                            const staggerOffsets = [0, 40, 80, 40, 0];
                            return (
                                <motion.div
                                    key={feature.id}
                                    className="relative flex-1 max-w-[280px] hover:z-60"
                                    style={{
                                        zIndex: 50 + index,
                                        marginTop: `${staggerOffsets[index]}px`,
                                        willChange: 'transform',
                                        transform: 'translateZ(0)'
                                    }}
                                    variants={cardVariants}
                                >
                                    <Card
                                        feature={feature}
                                        onClick={() => setSelectedId(feature.id)}
                                        isSelected={selectedId === feature.id}
                                        cardHeight={cardHeights[index]}
                                    />
                                </motion.div>
                            );
                        })}
                    </motion.div>
                )}

                {/* Mobile: Grid Layout - Smaller cards */}
                {mounted && !isDesktop && (
                    <motion.div
                        className="grid grid-cols-1 gap-4 relative z-50 w-full max-w-md mx-auto"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.2 }}
                        variants={cardContainerVariants}
                    >
                        {cadpayFeatures.map((feature, index) => (
                            <motion.div
                                key={feature.id}
                                variants={cardVariants}
                                style={{
                                    willChange: 'transform',
                                    transform: 'translateZ(0)'
                                }}
                            >
                                <Card
                                    feature={feature}
                                    onClick={() => setSelectedId(feature.id)}
                                    isSelected={selectedId === feature.id}
                                    isMobile={true}
                                />
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </div>

            {/* Lazorkit Section */}
            <motion.div
                className="relative z-50 mt-12 mb-20"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                style={{ transform: 'translateZ(0)' }}
            >
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        className="text-center mb-12"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <h3 className="text-3xl md:text-5xl font-black text-white tracking-tighter mb-4 flex items-center justify-center gap-3">
                            <div className="relative w-10 h-10 md:w-16 md:h-16">
                                <Image
                                    src="/lazorkit-logo.png"
                                    alt="Lazorkit"
                                    fill
                                    sizes="(max-width: 768px) 40px, 64px"
                                    className="object-contain"
                                />
                            </div>
                            Powered by Lazorkit
                        </h3>
                    </motion.div>
                    <motion.div
                        className="bg-zinc-900/50 border border-white/10 rounded-3xl p-8 md:p-12 backdrop-blur-sm"
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        style={{ transform: 'translateZ(0)' }}
                    >
                        <motion.p
                            className="text-zinc-300 text-lg md:text-xl leading-relaxed text-center"
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.4 }}
                        >
                            Lazorkit is the advanced Account Abstraction (AA) SDK for the Solana blockchain. It serves as the hidden engine inside CadPay, replacing complex crypto standards with familiar Web2 experiences.
                        </motion.p>
                        <motion.p
                            className="text-zinc-400 text-base md:text-lg leading-relaxed text-center mt-6"
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.5 }}
                        >
                            It powers our <span className="text-orange-400 font-semibold">Paymaster service for gasless transactions</span> (users never need SOL for fees), our Passkey integration (allowing users to log in with biometrics instead of passwords), and manages our Session Keys (allowing decentralized apps to perform automated tasks like recurring payments securely). Lazorkit bridges the gap between the raw power of Solana and the smooth user experience of modern fintech.
                        </motion.p>
                    </motion.div>
                </div>
            </motion.div>

            {/* Birds Animation */}
            <div className="fixed inset-0 pointer-events-none z-100001 overflow-hidden">
                <AnimatePresence>
                    {birds.map(bird => (
                        <BirdAnimation
                            key={bird.id}
                            bird={bird}
                            onComplete={() => removeBird(bird.id)}
                        />
                    ))}
                </AnimatePresence>
            </div>

            {/* Global Modal via Portal */}
            <ModalPortal>
                <AnimatePresence>
                    {selectedId && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="fixed inset-0 z-100000 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 md:p-8"
                            onClick={handleClose}
                            style={{ willChange: 'opacity', transform: 'translateZ(0)' }}
                        >
                            <motion.div
                                layoutId={selectedId}
                                className="bg-[#1c1209] w-full max-w-sm md:max-w-2xl max-h-[90vh] md:max-h-[85vh] rounded-3xl overflow-hidden shadow-2xl relative border border-white/10 flex flex-col"
                                onClick={(e) => e.stopPropagation()}
                                initial={{ scale: 0.8, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.8, opacity: 0, y: 20 }}
                                transition={{
                                    layout: {
                                        type: "spring",
                                        bounce: 0.2,
                                        duration: 0.5
                                    },
                                    scale: {
                                        type: "spring",
                                        bounce: 0.3,
                                        duration: 0.4
                                    },
                                    opacity: { duration: 0.2 },
                                    y: {
                                        type: "spring",
                                        bounce: 0.2,
                                        duration: 0.4
                                    }
                                }}
                                style={{
                                    willChange: 'transform, opacity',
                                    transform: 'translateZ(0)',
                                    backfaceVisibility: 'hidden'
                                }}
                            >
                                <button
                                    onClick={handleClose}
                                    className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white hover:bg-orange-500 hover:text-black transition-colors z-30"
                                    aria-label="Close"
                                >
                                    <XIcon size={20} />
                                </button>

                                <motion.div
                                    className="relative h-48 md:h-64 w-full shrink-0 overflow-hidden"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.3, delay: 0.15 }}
                                    style={{ transform: 'translateZ(0)' }}
                                >
                                    <Image
                                        src={cadpayFeatures.find(f => f.id === selectedId)?.image || ''}
                                        alt="Feature"
                                        fill
                                        className="object-cover object-center"
                                        sizes="(max-width: 768px) 100vw, 672px"
                                        priority
                                    />
                                    <div className="absolute inset-0 bg-linear-to-t from-[#1c1209] via-[#1c1209]/80 to-transparent" />
                                </motion.div>

                                <div className="p-5 md:p-10 overflow-y-auto custom-scrollbar flex-1">
                                    <motion.h3
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3, delay: 0.2 }}
                                        className="text-xl md:text-3xl font-bold text-white mb-4"
                                        style={{ transform: 'translateZ(0)' }}
                                    >
                                        {cadpayFeatures.find(f => f.id === selectedId)?.headline}
                                    </motion.h3>
                                    <motion.p
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3, delay: 0.25 }}
                                        className="text-zinc-300 text-sm md:text-lg leading-relaxed"
                                        style={{ transform: 'translateZ(0)' }}
                                    >
                                        {cadpayFeatures.find(f => f.id === selectedId)?.fullDescription}
                                    </motion.p>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </ModalPortal>
        </div>
    );
}

function Card({
    feature,
    onClick,
    isSelected,
    isMobile = false,
    cardHeight = 450
}: {
    feature: Feature;
    onClick: () => void;
    isSelected?: boolean;
    isMobile?: boolean;
    cardHeight?: number;
}) {
    return (
        <motion.div
            layoutId={feature.id}
            onClick={onClick}
            whileHover={{ scale: 1.05, y: -8 }}
            initial={false}
            animate={{ opacity: 1 }}
            className="relative cursor-pointer group w-full"
            style={{
                height: isMobile ? '320px' : `${cardHeight}px`,
                willChange: isSelected ? 'transform' : 'auto',
                transform: 'translateZ(0)',
                backfaceVisibility: 'hidden'
            }}
            transition={{
                layout: { duration: 0.5 },
                scale: { type: "spring", stiffness: 400, damping: 25 },
                y: { type: "spring", stiffness: 400, damping: 25 }
            }}
        >
            {/* Arrow Icon - Top Right Corner */}
            <div className="absolute top-4 right-4 z-30 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center group-hover:bg-orange-500 group-hover:border-orange-500 transition-all duration-300">
                <ArrowUpRightIcon size={18} className="text-white group-hover:text-black" />
            </div>

            {/* Card Content */}
            <div className="relative w-full h-full rounded-3xl overflow-hidden border border-white/10 bg-zinc-900 shadow-xl group-hover:shadow-orange-500/30 group-hover:border-orange-500/50 transition-all duration-300">
                {/* Background Image */}
                <div className="absolute inset-0 z-0">
                    <Image
                        src={feature.image}
                        alt={feature.headline}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                        sizes="(max-width: 768px) 100vw, 280px"
                        priority
                    />
                    <div className="absolute inset-0 bg-linear-to-b from-black/40 via-black/60 to-black/90" />
                </div>

                {/* Content Overlay */}
                <div className="relative z-10 h-full flex flex-col justify-end p-4 md:p-6">
                    {/* Title Badge */}
                    <div className="mb-2 md:mb-3">
                        <span className="inline-block px-2 md:px-3 py-1 bg-zinc-800/80 backdrop-blur-sm rounded-full text-[10px] md:text-xs font-semibold text-orange-500 uppercase tracking-wide">
                            {feature.id === 'biometric' ? 'Biometric Account Abstraction' :
                                feature.id === 'gasless' ? 'Zero-Fee Transactions' :
                                    feature.id === 'autosettlement' ? 'Auto-Settlement Engine' :
                                        feature.id === 'infrastructure' ? 'Hyper-Scale Infrastructure' :
                                            'Programmable Commerce SDK'}
                        </span>
                    </div>

                    {/* Headline */}
                    <h3 className="text-white text-lg md:text-2xl font-bold mb-2 md:mb-3 leading-tight line-clamp-2">
                        {feature.headline}
                    </h3>

                    {/* Preview Description */}
                    <p className="text-zinc-300 text-xs md:text-base leading-relaxed line-clamp-3 mb-3 md:mb-4">
                        {feature.description}
                    </p>

                    {/* Read More Indicator */}
                    <div className="flex items-center gap-2 text-orange-500 text-xs md:text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <span>Read more</span>
                        <ArrowUpRightIcon size={14} className="md:w-4 md:h-4" />
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
