'use client';

import { SiDiscord, SiGithub, SiX, SiLinkedin, SiYoutube, SiSolana } from 'react-icons/si';
import Link from 'next/link';
import { motion } from 'framer-motion';
import LogoField from './LogoField';
// Removed unused imports

export default function Footer() {

    return (
        <footer className="relative bg-[#1c1209] pt-24 pb-12 overflow-hidden">
            {/* Background Logos */}
            <LogoField count={20} className="absolute inset-0 z-0" />
            <div className="max-w-7xl mx-auto px-6 relative z-10">

                {/* THE "GIVE US A FOLLOW" CARD */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="w-full bg-orange-500 rounded-3xl p-12 md:p-16 text-center text-white shadow-2xl mb-24 relative overflow-hidden"
                >
                    {/* Background Pattern */}
                    {/* Background Pattern - Removed noise.png */}

                    <div className="relative z-10 space-y-8">
                        <div className="space-y-4">
                            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Give us a follow</h2>
                            <p className="text-orange-100 max-w-xl mx-auto text-lg">
                                Stay up to date with the latest features, releases, and ecosystem news—created just for you.
                            </p>
                        </div>

                        {/* SOCIAL ICONS */}
                        <motion.div
                            className="flex flex-wrap justify-center gap-4 md:gap-6"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.3, staggerChildren: 0.1 }}
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4, delay: 0.4 }}
                            >
                                <SocialIcon href="#" icon={<SiX size={24} />} label="X (Twitter)" />
                            </motion.div>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4, delay: 0.5 }}
                            >
                                <SocialIcon href="#" icon={<SiDiscord size={28} />} label="Discord" />
                            </motion.div>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4, delay: 0.6 }}
                            >
                                <SocialIcon href="#" icon={<SiGithub size={24} />} label="GitHub" />
                            </motion.div>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4, delay: 0.7 }}
                            >
                                <SocialIcon href="#" icon={<SiLinkedin size={24} />} label="LinkedIn" />
                            </motion.div>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4, delay: 0.8 }}
                            >
                                <SocialIcon href="#" icon={<SiYoutube size={24} />} label="YouTube" />
                            </motion.div>
                        </motion.div>
                    </div>
                </motion.div>

                {/* FOOTER LINKS */}
                <motion.div
                    className="grid grid-cols-2 md:grid-cols-5 gap-10 md:gap-8 border-t border-white/10 pt-16"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    style={{ transform: 'translateZ(0)' }}
                >
                    {/* BRAND COL */}
                    <motion.div
                        className="col-span-2 md:col-span-1 space-y-4"
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                    >
                        <Link href="/" className="font-black italic tracking-tighter text-2xl text-white flex items-center gap-2">
                            <div className="w-8 h-8 bg-orange-500 text-black flex items-center justify-center rounded-sm not-italic text-lg">C</div>
                            CADPAY
                        </Link>
                    </motion.div>

                    {/* COLS */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        <FooterColumn title="Product">
                            <FooterLink href="#">Features</FooterLink>
                            <FooterLink href="#">Integrations</FooterLink>
                            <FooterLink href="#">Documentation</FooterLink>
                            <FooterLink href="#">Pricing</FooterLink>
                        </FooterColumn>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                    >
                        <FooterColumn title="Resources">
                            <FooterLink href="#">Community</FooterLink>
                            <FooterLink href="#">Help Center</FooterLink>
                            <FooterLink href="#">Status</FooterLink>
                            <FooterLink href="#">Media Kit</FooterLink>
                        </FooterColumn>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                    >
                        <FooterColumn title="Company">
                            <FooterLink href="#">About</FooterLink>
                            <FooterLink href="#">Blog</FooterLink>
                            <FooterLink href="#">Careers</FooterLink>
                            <FooterLink href="#">Contact</FooterLink>
                        </FooterColumn>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.5 }}
                    >
                        <FooterColumn title="Legal">
                            <FooterLink href="#">Privacy</FooterLink>
                            <FooterLink href="#">Terms</FooterLink>
                            <FooterLink href="#">Security</FooterLink>
                        </FooterColumn>
                    </motion.div>
                </motion.div>

                <motion.div
                    className="mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-zinc-500"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                >
                    <p>© 2026 CadPay. All rights reserved.</p>
                    <div className="flex gap-6">
                        <span>Made with 🧡 on Solana</span>
                    </div>
                </motion.div>

            </div>
        </footer>
    );
}

function SocialIcon({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
    return (
        <a
            href={href}
            aria-label={label}
            className="w-14 h-14 md:w-16 md:h-16 bg-white text-orange-600 rounded-full flex items-center justify-center hover:scale-110 hover:shadow-lg transition-all duration-300"
        >
            {icon}
        </a>
    );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-4">
            <h3 className="font-bold text-white tracking-wide">{title}</h3>
            <div className="flex flex-col gap-3">
                {children}
            </div>
        </div>
    );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
    return (
        <Link href={href} className="text-zinc-400 hover:text-orange-400 transition-colors text-sm font-medium">
            {children}
        </Link>
    );
}
