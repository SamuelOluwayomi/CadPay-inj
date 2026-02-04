'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import Image from 'next/image';

import { ArrowUpRightIcon } from '@phosphor-icons/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

type Feature = {
    id: string;
    headline: string;
    description: string;
    fullDescription: string;
    image: string;
};

const cadpayFeatures: Feature[] = [
    {
        id: 'blockdag',
        headline: 'Revolutionary BlockDAG Architecture.',
        description: 'Unlike traditional blockchains, Kaspa uses a BlockDAG where blocks reference multiple parents, enabling parallel block creation.',
        fullDescription: 'Instead of a single chain where blocks reference one parent, Kaspa\'s BlockDAG allows blocks to reference multiple parents. This revolutionary approach enables parallel mining where multiple miners can produce blocks simultaneously, achieving higher throughput without sacrificing security. All valid blocks contribute to consensus—no wasted work.',
        image: '/features/blockdag-diagram.png'
    },
    {
        id: 'throughput',
        headline: '10 Blocks Per Second on Mainnet.',
        description: 'Currently processing 10 blocks per second with proven scalability of 158M+ transactions in stress tests.',
        fullDescription: 'Kaspa mainnet currently runs at 10 BPS (blocks per second) with near-instant finality. The network has been battle-tested at scale, successfully processing 158 million transactions during stress tests in October 2025. This high throughput is achieved while maintaining the security guarantees of proof-of-work consensus.',
        image: '/features/throughput.png'
    },
    {
        id: 'utxo',
        headline: 'Bitcoin-Inspired UTXO Model.',
        description: 'Kaspa uses the proven UTXO transaction model, providing clear ownership tracking and efficient validation.',
        fullDescription: 'Kaspa uses Bitcoin\'s UTXO (Unspent Transaction Output) model where transactions consume previous outputs and create new ones. This straightforward programming model offers well-understood security properties, clear state tracking, and efficient validation—making it familiar to Bitcoin developers while enabling new innovations.',
        image: '/features/utxo.png'
    },
    {
        id: 'tokens',
        headline: 'KRC-20 Token Standard.',
        description: 'An emerging token standard enabling smart contract functionality on Kaspa\'s fast, scalable network.',
        fullDescription: 'KRC-20 is Kaspa\'s token standard, similar to Ethereum\'s ERC-20 concept. Built using data insertion mechanisms and enabled by the Kasplex protocol, KRC-20 brings programmable tokens to Kaspa\'s high-throughput network. With open-source indexers and APIs, developers can build DeFi applications on proven infrastructure.',
        image: '/features/tokens.png'
    },
    {
        id: 'pow',
        headline: 'True Decentralization Through PoW.',
        description: 'Faithful to Satoshi\'s vision: proof-of-work mining, no premine, deflationary monetary policy, and no central governance.',
        fullDescription: 'Kaspa is based on the GhostDAG/PHANTOM protocol, a scalable generalization of Nakamoto Consensus. Its design preserves Bitcoin\'s core principles: proof-of-work mining ensures security, UTXO model maintains isolated state, deflationary monetary policy preserves value, zero premine ensures fairness, and no central governance keeps power distributed.',
        image: '/features/pow.png'
    }
];

export default function CoreFeatures() {




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

    return (
        <>
            <div className="w-full bg-[#fcfbf7] pt-40 pb-32 relative z-10 -mt-1">
                {/* Vertical Dash Pattern Background for Entire Section */}
                <DashPattern />

                <div className="w-full max-w-7xl mx-auto px-6 relative z-10">
                    {/* Title Section with Kaspa Branding */}
                    <motion.div
                        className="mb-16 text-center"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.1 }}
                        variants={containerVariants}>

                        <motion.h2 variants={itemVariants} className="text-4xl md:text-6xl font-black text-zinc-900 tracking-tighter mb-4">
                            Why <ScribbleUnderline className="text-zinc-900 italic" scribbleColor="text-orange-500">Kaspa?</ScribbleUnderline>
                        </motion.h2>
                        <motion.p variants={itemVariants} className="text-zinc-700 text-base md:text-lg max-w-2xl mx-auto">
                            The 5 Pillars of the Fastest PoW Blockchain
                        </motion.p>
                    </motion.div>

                    {/* Cards Section */}
                    <div className="relative w-full mb-12">
                        {/* Vertical Stack Layout */}
                        <motion.div
                            className="flex flex-col gap-12 relative z-10 w-full"
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, amount: 0.1 }}
                            variants={cardContainerVariants}
                        >
                            {cadpayFeatures.map((feature, index) => (
                                <Card
                                    key={feature.id}
                                    feature={feature}
                                    index={index}
                                />
                            ))}
                        </motion.div>
                    </div>
                    <KaspaSummaryCard />
                </div>

                {/* BOTTOM CURVED TRANSITION (Points DOWN at center - Dark Overlay with Shadow) */}
                <div className="absolute left-0 bottom-0 w-full h-20 md:h-32 z-20 pointer-events-none translate-y-px">
                    <svg
                        viewBox="0 0 1440 320"
                        className="w-full h-full drop-shadow-[0_-15px_15px_rgba(0,0,0,0.1)]"
                        preserveAspectRatio="none"
                    >
                        <path
                            fill="#1c1209"
                            d="M0,0 Q720,320 1440,0 L1440,320 L0,320 Z"
                        ></path>
                    </svg>
                </div>
            </div>

        </>
    );
}

function KaspaSummaryCard() {
    const cardRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: cardRef,
        offset: ["start start", "end start"]
    });

    const y = useTransform(scrollYProgress, [0, 1], [0, -100]);
    const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

    return (
        <motion.div
            ref={cardRef}
            style={{ y, opacity }}
            className="relative z-50 mt-12 mb-12"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, delay: 0.2 }}
        >
            <div className="max-w-4xl mx-auto">
                <motion.div
                    className="text-center mb-6"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}>
                    <h3 className="text-3xl md:text-5xl font-black text-zinc-900 tracking-tighter mb-4 flex items-center justify-center gap-2 md:gap-3">
                        <div className="relative w-12 h-12 md:w-20 md:h-20">
                            <Image
                                src="/kaspa-icon.png"
                                alt="Kaspa"
                                fill
                                sizes="(max-width: 768px) 48px, 96px"
                                className="object-contain"
                            />
                        </div>
                        <span className="relative z-10">Built on <ScribbleUnderline className="text-zinc-900 italic" scribbleColor="text-orange-500">Kaspa</ScribbleUnderline></span>
                    </h3>
                </motion.div>
                <motion.div
                    className="bg-white/40 border border-white/50 rounded-3xl p-6 md:p-10 backdrop-blur-md shadow-xl"
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    style={{ transform: 'translateZ(0)' }}>
                    <motion.p
                        className="text-zinc-800 text-lg md:text-xl leading-relaxed text-center font-medium"
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.4 }}>
                        Kaspa is one of the fastest and most scalable instant confirmation transaction layer ever built on a proof-of-work engine. Based on the GhostDAG/PHANTOM protocol, it's a scalable generalization of Bitcoin's Nakamoto Consensus.
                    </motion.p>
                    <motion.p
                        className="text-zinc-600 text-base md:text-lg leading-relaxed text-center mt-4"
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.5 }}>
                        Its revolutionary <span className="text-orange-600 font-bold">BlockDAG architecture</span> allows <span className="text-orange-600 font-bold">10 blocks per second</span> on mainnet with near-instant finality. Kaspa has processed <span className="text-orange-600 font-bold">158 million+ transactions</span> in stress tests, proving its ability to scale while maintaining the security of proof-of-work. With minimal fees, the UTXO model, and a growing DeFi ecosystem through KRC-20 tokens, Kaspa represents the future of decentralized payments.
                    </motion.p>
                </motion.div>
            </div>
        </motion.div>
    );
}


function ScribbleUnderline({
    children,
    className,
    scribbleColor = "text-orange-500",
    variant = "curve"
}: {
    children: React.ReactNode;
    className?: string;
    scribbleColor?: string;
    variant?: "curve" | "straight";
}) {
    const pathVariants = {
        curve: "M2.00025 6.99997C2.00025 6.99997 101.5 0.49997 197.5 5.49997",
        straight: "M2 7C40 6 160 5 198 6" // Slightly imperfect straight line
    };

    return (
        <span className={cn("relative inline-block", className)}>
            <span className="relative z-10">{children}</span>
            <motion.svg
                viewBox="0 0 200 9"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={cn("absolute -bottom-2 left-0 w-full h-3 z-0", scribbleColor)}
                preserveAspectRatio="none"
                initial={{ pathLength: 0, opacity: 0 }}
                whileInView={{ pathLength: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: "easeInOut", delay: 0.2 }}
            >
                <motion.path
                    d={pathVariants[variant]}
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                />
            </motion.svg>
        </span>
    );
}

// Alternating Vertical Dash Line Pattern
function DashPattern() {
    return (
        <div className="absolute inset-0 z-0 opacity-15 pointer-events-none">
            <svg className="w-full h-full" width="100%" height="100%">
                <defs>
                    <pattern id="dash-pattern-vertical" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                        {/* Vertical Orange Dash */}
                        <line x1="10" y1="0" x2="10" y2="10" stroke="#ff6600" strokeWidth="4" strokeLinecap="round" />

                        {/* Vertical Black Dash (Below it with gap) */}
                        <line x1="10" y1="20" x2="10" y2="30" stroke="#000000" strokeWidth="4" strokeLinecap="round" />

                        {/* Second Column Staggered/Inverted */}
                        <line x1="30" y1="0" x2="30" y2="10" stroke="#000000" strokeWidth="4" strokeLinecap="round" />
                        <line x1="30" y1="20" x2="30" y2="30" stroke="#ff6600" strokeWidth="4" strokeLinecap="round" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#dash-pattern-vertical)" />
            </svg>
        </div>
    );
}

function Card({
    feature,
    index,
}: {
    feature: Feature;
    index: number;
}) {
    const [isExpanded, setIsExpanded] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);
    const isTextRight = index % 2 === 0;

    const { scrollYProgress } = useScroll({
        target: cardRef,
        offset: ["start start", "end start"]
    });

    const y = useTransform(scrollYProgress, [0, 1], [0, -100]);
    const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

    return (
        <motion.div
            ref={cardRef}
            style={{ y, opacity }}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            className={`relative w-full flex flex-col md:flex-row items-center gap-8 ${isTextRight ? '' : 'md:flex-row-reverse'}`}
        >
            <div className="flex flex-1 justify-center items-center p-4 md:p-8">
                <motion.div
                    className="relative w-full max-w-lg aspect-4/3 min-h-[200px]"
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.05 }}
                    viewport={{ once: true }}
                    transition={{
                        duration: 0.6,
                        delay: index * 0.1,
                        ease: "easeOut"
                    }}
                >
                    <Image
                        src={feature.image}
                        alt={feature.headline}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-contain drop-shadow-2xl"
                    />
                </motion.div>
            </div>

            {/* Content Side - The "Card" */}
            <div className={`relative min-h-[280px] rounded-4xl overflow-hidden bg-white/60 backdrop-blur-md border border-orange-100 group shadow-lg hover:shadow-xl transition-all duration-500 flex flex-col justify-center ${feature.image ? 'w-full md:w-3/5' : 'w-full md:w-3/5 mx-auto'}`}>

                {/* Inner Content Container */}
                <div className={`relative z-10 w-full h-full p-6 md:p-10 flex flex-col justify-center ${isTextRight ? 'items-end text-right' : 'items-start text-left'}`}>

                    {/* Badge */}
                    <span className="inline-block px-3 py-1 bg-zinc-900/5 border border-zinc-900/10 rounded-full text-xs font-bold text-orange-600 mb-6 tracking-widest uppercase">
                        {feature.id === 'blockdag' ? 'Architecture' :
                            feature.id === 'throughput' ? 'Performance' :
                                feature.id === 'utxo' ? 'Security' :
                                    feature.id === 'tokens' ? 'Ecosystem' : 'Philosophy'}
                    </span>

                    <h3 className="text-2xl md:text-4xl font-bold text-zinc-900 mb-4 leading-tight tracking-tight max-w-xl">
                        <ScribbleUnderline variant="straight" scribbleColor="text-orange-200" className="text-zinc-900">
                            {feature.headline}
                        </ScribbleUnderline>
                    </h3>

                    <p className="text-zinc-600 text-sm md:text-base leading-relaxed max-w-lg">
                        {isExpanded ? feature.fullDescription : feature.description}
                    </p>

                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={`mt-6 flex items-center gap-2 text-zinc-900 font-semibold hover:text-orange-600 transition-colors text-sm ${isTextRight ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                        <span>{isExpanded ? 'Show less' : 'Learn more'}</span>
                        <ArrowUpRightIcon weight="bold" className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
