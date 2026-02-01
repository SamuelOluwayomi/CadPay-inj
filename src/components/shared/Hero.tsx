'use client';

import { motion, AnimatePresence, Variants } from 'framer-motion';
import { ScanFace } from 'lucide-react';
import { FingerprintIcon, QrCodeIcon, CopyIcon, CheckIcon, PlusIcon, ArrowRightIcon, CreditCardIcon, LockIcon } from '@phosphor-icons/react';
import { SiNetflix, SiSpotify, SiSolana } from "react-icons/si";
import { useState, useEffect } from 'react';

type Phase = 'intro' | 'auth-choice' | 'scanning' | 'dash-empty' | 'fund-action' | 'dash-funded' | 'connecting' | 'dash-final';

export default function Hero({ startAnimation = true }: { startAnimation?: boolean }) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!startAnimation) return;

    let mounted = true;
    const runSequence = async () => {
      while (mounted) {
        setPhase('intro'); await wait(2500);
        if (!mounted) return; setPhase('auth-choice'); await wait(2000);
        if (!mounted) return; setPhase('scanning'); await wait(3000);
        if (!mounted) return; setPhase('dash-empty'); await wait(2500);
        if (!mounted) return; setPhase('fund-action'); await wait(3000);
        if (!mounted) return; setPhase('dash-funded'); await wait(2500);
        if (!mounted) return; setPhase('connecting'); await wait(3500);
        if (!mounted) return; setPhase('dash-final'); await wait(6000);
      }
    };
    runSequence();
    return () => { mounted = false; };
  }, [startAnimation]);

  const fadeInUp: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8 } }
  };

  const laptopEntrance: Variants = {
    hidden: { opacity: 0, y: 60, rotateX: 10 },
    visible: { opacity: 1, y: 0, rotateX: 0, transition: { duration: 1, delay: 0.2 } }
  };

  return (
    // INCREASED padding-bottom (pb-32) to make space
    <section
      className="relative z-20 min-h-[110dvh] w-full overflow-hidden text-white pt-24 md:pt-36 pb-0 perspective-[2000px]"
    >

      {/* BACKGROUND VIDEO */}
      <div
        className="absolute inset-0 z-0 bg-black"
      >
        <video
          autoPlay loop muted playsInline
          className="w-full h-full object-cover opacity-70 md:opacity-80"
        >
          <source src="/hero-bg.webm" type="video/webm" />
          <source src="/hero-bg.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-linear-to-t from-black to-transparent" />
      </div>

      {/* WHITE SLANT OVERLAY (Fixes pixelation) */}
      <div className="absolute bottom-0 left-0 w-full z-10 pointer-events-none translate-y-px">
        <svg
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          className="w-full h-[150px] md:h-[200px] fill-[#1a120b]"
        >
          <path d="M0,120 L1200,0 L1200,120 Z" />
          <line x1="0" y1="120" x2="1200" y2="0" stroke="#f97316" strokeWidth="1" />
        </svg>
      </div>

      {/* CONTENT CONTAINER - CHANGED z-10 to z-30 to sit ON TOP of the slant */}
      <div className="relative z-30 max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center h-full">

        {/* LEFT COLUMN */}
        <div className="flex flex-col gap-6 md:gap-8 text-center lg:text-left pt-10 lg:pt-0">

          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate={startAnimation ? "visible" : "hidden"}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/80 border border-zinc-800 w-fit backdrop-blur-md mx-auto lg:mx-0"
          >
          </motion.div>

          <motion.h1
            variants={fadeInUp}
            initial="hidden"
            animate={startAnimation ? "visible" : "hidden"}
            transition={{ delay: 0.3 }}
            className="text-4xl md:text-7xl font-bold tracking-tight leading-[1.1] text-white"
          >
            Your face is your <br />
            <span className="text-orange-500">Password.</span>
          </motion.h1>

          <motion.p
            variants={fadeInUp}
            initial="hidden"
            animate={startAnimation ? "visible" : "hidden"}
            transition={{ delay: 0.2 }}
            className="text-base md:text-lg text-zinc-400 max-w-lg leading-relaxed mx-auto lg:mx-0"
          >
            CadPay is the modern operating system for your money.
            Connect your identity to our automated settlement engine and manage recurring subscriptions without cards.
          </motion.p>

          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate={startAnimation ? "visible" : "hidden"}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-center lg:justify-start gap-4 pt-2"
          >
            <a href="/signin" className="px-8 py-3.5 bg-orange-400 text-black rounded-full font-semibold text-sm hover:bg-orange-300 transition-all flex items-center gap-2">
              <FingerprintIcon size={16} /> Start Demo
            </a>
          </motion.div>
        </div>

        {/* RIGHT COLUMN (Laptop) */}
        <div className="relative w-full flex justify-center perspective-[1000px]">
          <motion.div
            variants={laptopEntrance}
            initial="hidden"
            animate={startAnimation ? "visible" : "hidden"} // Laptop waits too!
            className="relative w-[120%] -mx-6 sm:w-full sm:mx-0 max-w-[650px] origin-top transform scale-[0.9] sm:scale-100 md:scale-100 lg:scale-110"
          >
            <div className="relative bg-[#111] rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden aspect-3/4 md:aspect-16/10 ring-1 ring-white/10">

              <div className="absolute inset-0 bg-[#09090b] flex flex-col font-sans overflow-hidden">

                {/* Header */}
                <div className="h-8 border-b border-white/5 flex items-center justify-between px-4 bg-zinc-900/50 z-20">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                  </div>
                  <div className="text-[10px] text-zinc-600 font-mono flex items-center gap-1">
                    <LockIcon size={10} /> SECURE CONNECTION
                  </div>
                </div>

                <div className="flex-1 relative flex items-center justify-center p-8">
                  <AnimatePresence mode='wait'>
                    {/* INTRO */}
                    {phase === 'intro' && (
                      <motion.div
                        key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="text-center space-y-4"
                      >
                        <div className="w-16 h-16 bg-white rounded-xl mx-auto flex items-center justify-center shadow-lg"><span className="font-black italic text-3xl text-black">C</span></div>
                        <h2 className="text-2xl font-bold">Welcome to CadPay</h2>
                        <p className="text-zinc-500 text-sm">Secure. Seamless. Simple.</p>
                      </motion.div>
                    )}

                    {/* AUTH CHOICE */}
                    {phase === 'auth-choice' && (
                      <motion.div
                        key="auth" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="text-center space-y-6 w-full max-w-xs"
                      >
                        <h3 className="text-lg font-bold">Create Secure Account</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-zinc-900 border border-white/10 rounded-xl flex flex-col items-center gap-2">
                            <ScanFace size={32} className="text-orange-500" />
                            <span className="text-xs font-medium">Face ID</span>
                          </div>
                          <div className="p-4 bg-zinc-900 border border-white/10 rounded-xl flex flex-col items-center gap-2">
                            <FingerprintIcon size={32} className="text-emerald-400" />
                            <span className="text-xs font-medium">Touch ID</span>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* SCANNING */}
                    {phase === 'scanning' && (
                      <motion.div
                        key="scan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="flex flex-col items-center gap-6"
                      >
                        <div className="relative">
                          <ScanFace size={64} className="text-white" />
                          <motion.div animate={{ height: ["0%", "100%", "0%"] }} transition={{ duration: 1.5, repeat: Infinity }} className="absolute inset-0 w-full bg-orange-500/30 blur-sm border-b-2 border-orange-500" />
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-sm font-bold">Verifying Biometrics</span>
                          <span className="text-xs text-zinc-500 font-mono">Encrypting Identity...</span>
                        </div>
                      </motion.div>
                    )}

                    {/* DASHBOARD EMPTY */}
                    {phase === 'dash-empty' && (
                      <DashboardFrame balance="0.00" status="Active">
                        <div className="mt-8 flex flex-col items-center justify-center h-32 border-2 border-dashed border-zinc-800 rounded-xl text-zinc-600 gap-2">
                          <CreditCardIcon size={24} />
                          <span className="text-xs">No funds available</span>
                        </div>
                        <div className="mt-4 w-full py-3 bg-orange-600 rounded-lg text-sm font-bold flex items-center justify-center gap-2">
                          <PlusIcon size={16} /> Add Funds
                        </div>
                      </DashboardFrame>
                    )}

                    {phase === 'fund-action' && (
                      <motion.div
                        key="fund-action" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                        className="w-full max-w-xs bg-zinc-900 border border-white/10 rounded-xl p-6 text-center shadow-2xl"
                      >
                        <div className="text-sm font-bold mb-4">Add Funds</div>
                        <div className="w-32 h-32 bg-white rounded-lg mx-auto mb-4 p-2">
                          <QrCodeIcon className="w-full h-full text-black" />
                        </div>
                        <div className="text-xs text-zinc-500 mb-2">Scan with your banking app or transfer to:</div>
                        <div className="flex items-center justify-between bg-black/50 p-2 rounded-lg border border-white/5">
                          <span className="text-[10px] font-mono text-zinc-400">cadpay.eth/user</span>
                          <CopyIcon size={12} className="text-zinc-500" />
                        </div>
                        <div className="mt-4 text-xs text-emerald-400 animate-pulse">Incoming Transfer Detected...</div>
                      </motion.div>
                    )}

                    {phase === 'dash-funded' && (
                      <DashboardFrame balance="500.00" status="Funded">
                        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <ArrowRightIcon size={16} className="text-emerald-500 rotate-45" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white">Transfer Received</div>
                            <div className="text-[10px] text-zinc-500">Just now</div>
                          </div>
                          <div className="ml-auto font-mono text-emerald-400 text-sm">+$500.00</div>
                        </motion.div>
                      </DashboardFrame>
                    )}

                    {/* CONNECTING */}
                    {phase === 'connecting' && (
                      <motion.div
                        key="connecting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="w-full max-w-xs space-y-4"
                      >
                        <h3 className="text-center text-sm font-bold text-zinc-400 mb-2">Connecting Subscriptions</h3>
                        <div className="p-3 bg-zinc-900 border border-white/10 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <SiNetflix size={20} className="text-[#E50914]" />
                            <span className="text-sm font-bold">Netflix</span>
                          </div>
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5 }}>
                            <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center"><CheckIcon size={12} className="text-black" /></div>
                          </motion.div>
                        </div>
                        <div className="p-3 bg-zinc-900 border border-white/10 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <SiSpotify size={20} className="text-[#1DB954]" />
                            <span className="text-sm font-bold">Spotify</span>
                          </div>
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.8 }}>
                            <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center"><CheckIcon size={12} className="text-black" /></div>
                          </motion.div>
                        </div>
                      </motion.div>
                    )}

                    {/* FINAL DASHBOARD */}
                    {phase === 'dash-final' && (
                      <DashboardFrame balance="467.01" status="Active">
                        <div className="mt-4 space-y-2">
                          <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Active Plans</div>
                          <div className="p-3 bg-zinc-800/50 rounded-lg flex items-center justify-between border border-white/5">
                            <div className="flex items-center gap-3">
                              <SiNetflix size={16} className="text-[#E50914]" />
                              <div>
                                <div className="text-xs font-bold">Netflix</div>
                                <div className="text-[10px] text-zinc-500">Next: Aug 24</div>
                              </div>
                            </div>
                            <div className="text-xs font-mono">-$19.99</div>
                          </div>
                          <div className="p-3 bg-zinc-800/50 rounded-lg flex items-center justify-between border border-white/5">
                            <div className="flex items-center gap-3">
                              <SiSpotify size={16} className="text-[#1DB954]" />
                              <div>
                                <div className="text-xs font-bold">Spotify</div>
                                <div className="text-[10px] text-zinc-500">Next: Aug 28</div>
                              </div>
                            </div>
                            <div className="text-xs font-mono">-$12.99</div>
                          </div>
                          <div className="mt-4 pt-2 border-t border-white/5 flex gap-2">
                            <div className="flex-1 py-2 bg-orange-600 rounded-lg text-[10px] font-bold text-center text-white hover:bg-orange-900 transition-colors cursor-pointer">Add New</div>
                            <div className="flex-1 py-2 bg-zinc-800 rounded-lg text-[10px] font-bold text-center text-zinc-400">History</div>
                          </div>
                        </div>
                      </DashboardFrame>
                    )}

                  </AnimatePresence>
                </div>
              </div>

            </div>
          </motion.div>
        </div>

      </div>



    </section>
  );
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function DashboardFrame({ children, balance, status }: { children: React.ReactNode, balance: string, status: string }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm">
      <div className="bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="bg-zinc-800/50 p-6 border-b border-white/5">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs text-zinc-400 font-medium">Available Balance</span>
            <div className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[10px] text-emerald-400 flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> {status}
            </div>
          </div>
          <div className="text-4xl font-bold text-white tracking-tight">${balance}</div>
        </div>x
        <div className="p-4 bg-black/20">{children}</div>
      </div>
    </motion.div>
  )
}