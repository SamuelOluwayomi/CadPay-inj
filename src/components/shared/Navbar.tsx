'use client';

import Link from 'next/link';
import { CaretRightIcon, FingerprintIcon, ListIcon, XIcon } from '@phosphor-icons/react';
import { SiSolana } from "react-icons/si";
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function NavBar() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <nav className="absolute top-0 w-full z-50 transition-all duration-300">

                {/* Glass Background */}
                <div className="absolute inset-0 bg-black/60 backdrop-blur-xl border-b border-white/5" />

                <div className="relative max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

                    {/* LEFT SIDE: LOGO + NAV LINKS */}
                    <div className="flex items-center gap-12">
                        {/* LOGO */}
                        <Link href="/" className="font-black italic tracking-tighter text-xl text-orange-100 z-10 flex items-center gap-2">
                            <div className="w-6 h-6 bg-orange-500 text-black flex items-center justify-center rounded-sm not-italic">C</div>
                            CADPAY
                            <div className="h-4 w-px bg-white/20 mx-1" />
                            <SiSolana className="text-[#9945FF] opacity-80" size={16} />
                        </Link>

                        {/* DESKTOP LINKS (Hidden on Mobile) */}
                        <div className="hidden md:flex items-center gap-8">
                            <a href="https://github.com/lazor-kit/lazor-kit" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white transition-colors text-sm font-medium">
                                The Bridge
                            </a>
                            <NavLink href="/merchant-auth">Merchant Portal</NavLink>
                            <a href="https://docs.lazorkit.com/" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white transition-colors text-sm font-medium">
                                Lazorkit Engine
                            </a>
                        </div>
                    </div>

                    {/* DESKTOP ACTIONS (Hidden on Mobile) */}
                    <div className="hidden md:flex items-center gap-6 z-10">
                        <Link href="/signin" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                            Log in
                        </Link>
                        <Link href="/create" className="group flex items-center gap-2 bg-orange-500 text-white px-4 py-1.5 rounded-full text-sm font-bold hover:bg-orange-600 transition-all">
                            <FingerprintIcon size={14} className="text-white/90" />
                            Create Account
                        </Link>
                    </div>

                    {/* MOBILE TOGGLE (Visible ONLY on Mobile) */}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="md:hidden text-white z-50 relative"
                    >
                        {isOpen ? <XIcon size={24} /> : <ListIcon size={24} />}
                    </button>
                </div>
            </nav>

            {/* MOBILE MENU DRAWER */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed inset-0 z-40 bg-black pt-24 px-6 md:hidden"
                    >
                        <div className="flex flex-col gap-6 text-lg font-medium">
                            <MobileLink href="https://github.com/lazor-kit/lazor-kit" onClick={() => setIsOpen(false)}>The Bridge</MobileLink>
                            <MobileLink href="/merchant-auth" onClick={() => setIsOpen(false)}>Merchant Portal</MobileLink>
                            <MobileLink href="https://docs.lazorkit.com/" onClick={() => setIsOpen(false)}>Lazorkit Engine</MobileLink>
                            <hr className="border-white/10" />
                            <MobileLink href="/signin" onClick={() => setIsOpen(false)}>Log In</MobileLink>
                            <Link
                                href="/create"
                                onClick={() => setIsOpen(false)}
                                className="flex items-center justify-center gap-2 bg-orange-500 text-white px-4 py-3 rounded-full font-bold"
                            >
                                <FingerprintIcon size={18} className="bg-orange-500 text-white" />
                                Create Account
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
    return (
        <Link href={href} className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
            {children}
        </Link>
    );
}

function MobileLink({ href, children, onClick }: { href: string; children: React.ReactNode; onClick: () => void }) {
    return (
        <Link
            href={href}
            onClick={onClick}
            className="text-zinc-300 hover:text-white border-b border-white/5 pb-4"
        >
            {children}
        </Link>
    );
}