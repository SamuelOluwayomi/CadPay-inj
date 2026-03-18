'use client';

import Link from 'next/link';
import {
    FingerprintIcon,
    ListIcon,
    XIcon,
    House,
    Users,
    BookOpen,
    Phone,
    SignIn
} from '@phosphor-icons/react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function NavBar() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <nav className="fixed top-0 left-0 w-full z-60 py-4 transition-all duration-300 bg-black/20 backdrop-blur-md">

                <div className="relative max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

                    {/* LEFT SIDE: LOGO */}
                    <Link href="/" className="font-black italic tracking-tighter text-xl text-transparent bg-clip-text bg-linear-to-b from-white via-white to-zinc-400 z-10 flex items-center gap-2">
                        <div className="w-8 h-8 bg-orange-500 text-black flex items-center justify-center rounded-lg not-italic text-lg shadow-lg shadow-orange-500/20">C</div>
                        CADPAY
                        <div className="h-4 w-px bg-white/20 mx-1" />
                        <img src="/features/injective-logo.svg" alt="Injective" className="h-8 w-auto object-contain" />
                    </Link>

                    {/* CENTER: NAV LINKS (Hidden on Mobile) */}
                    <div className="hidden md:flex items-center gap-2 bg-black/40 backdrop-blur-xl border border-white/10 p-1.5 rounded-full z-10">
                        <NavLink href="/" active>
                            <House size={16} weight="fill" />
                            Home
                        </NavLink>
                        <NavLink href="/about">
                            <Users size={16} />
                            About Us
                        </NavLink>
                        <NavLink href="/resources">
                            <BookOpen size={16} />
                            Resources
                        </NavLink>
                        <NavLink href="/contact">
                            <Phone size={16} />
                            Contact Us
                        </NavLink>
                    </div>

                    {/* RIGHT SIDE: ACTIONS (Hidden on Mobile) */}
                    <div className="hidden md:flex items-center gap-6 z-10">
                        <Link href="/signin" className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors group">
                            <SignIn size={18} className="group-hover:translate-x-0.5 transition-transform" />
                            Log in
                        </Link>
                        <Link href="/create" className="group flex items-center gap-2 bg-orange-600 text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-orange-500 transition-all shadow-lg shadow-orange-600/20 hover:scale-105 active:scale-95">
                            <FingerprintIcon size={18} className="text-white/90" />
                            Create Account
                        </Link>
                    </div>

                    {/* MOBILE TOGGLE (Visible ONLY on Mobile) */}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="md:hidden text-white z-50 relative p-2"
                    >
                        {isOpen ? <XIcon size={28} /> : <ListIcon size={28} />}
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
                        className="fixed inset-0 z-55 bg-black/95 backdrop-blur-2xl pt-24 px-6 md:hidden"
                    >
                        <div className="flex flex-col gap-4 text-lg font-medium">
                            <MobileLink href="/" onClick={() => setIsOpen(false)} icon={<House size={20} />}>Home</MobileLink>
                            <MobileLink href="/about" onClick={() => setIsOpen(false)} icon={<Users size={20} />}>About Us</MobileLink>
                            <MobileLink href="/resources" onClick={() => setIsOpen(false)} icon={<BookOpen size={20} />}>Resources</MobileLink>
                            <MobileLink href="/contact" onClick={() => setIsOpen(false)} icon={<Phone size={20} />}>Contact Us</MobileLink>
                            <hr className="border-white/10 my-2" />
                            <MobileLink href="/signin" onClick={() => setIsOpen(false)} icon={<SignIn size={20} />}>Log In</MobileLink>
                            <Link
                                href="/create"
                                onClick={() => setIsOpen(false)}
                                className="flex items-center justify-center gap-3 bg-orange-600 text-white px-4 py-4 rounded-2xl font-bold shadow-xl shadow-orange-600/20 active:scale-95 transition-transform"
                            >
                                <FingerprintIcon size={24} />
                                Create Account
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
function NavLink({ href, children, active }: { href: string; children: React.ReactNode; active?: boolean }) {
    return (
        <Link
            href={href}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${active
                    ? 'bg-orange-500/10 text-white border border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.1)]'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
        >
            {children}
        </Link>
    );
}

function MobileLink({ href, children, onClick, icon }: { href: string; children: React.ReactNode; onClick: () => void; icon: React.ReactNode }) {
    return (
        <Link
            href={href}
            onClick={onClick}
            className="flex items-center gap-4 text-zinc-300 hover:text-white bg-white/5 p-4 rounded-xl border border-white/5 active:bg-white/10 transition-colors"
        >
            <div className="text-orange-500">{icon}</div>
            {children}
        </Link>
    );
}
