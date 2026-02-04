'use client';

import { motion, Variants } from 'framer-motion';
import { FingerprintIcon } from '@phosphor-icons/react';
import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
// @ts-ignore
import GLOBE from 'vanta/dist/vanta.globe.min';

export default function Hero({ startAnimation = true }: { startAnimation?: boolean }) {
  const [vantaEffect, setVantaEffect] = useState<any>(null);
  const vantaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!vantaEffect && vantaRef.current) {
      setVantaEffect(
        GLOBE({
          el: vantaRef.current,
          mouseControls: true,
          touchControls: true,
          gyroControls: true,
          minHeight: 200.00,
          minWidth: 200.00,
          scale: 1.1,
          scaleMobile: 0.6,
          color: 0xf97316,
          color2: 0xdece9b,
          backgroundColor: 0x0,
          THREE: THREE
        })
      );
    }
    return () => {
      if (vantaEffect) vantaEffect.destroy();
    };
  }, [vantaEffect]);

  const fadeInUp: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8 } }
  };

  return (
    <section className="relative z-50 min-h-[75vh] w-full text-white pt-8 md:pt-4 pb-0 bg-black shadow-2xl">

      {/* VANTA BACKGROUND */}
      <div ref={vantaRef} className="absolute inset-0 z-0 h-full w-full overflow-hidden translate-y-20 md:translate-y-0" />


      {/* CONTENT CONTAINER */}
      <div className="relative z-30 max-w-7xl mx-auto px-6 flex flex-col items-center justify-center h-full text-center mt-20 md:mt-32 drop-shadow-2xl">
        <motion.h1
          variants={fadeInUp}
          initial="hidden"
          animate={startAnimation ? "visible" : "hidden"}
          transition={{ delay: 0.3 }}
          className="text-4xl md:text-8xl font-black tracking-tighter leading-[1.1] text-transparent bg-clip-text bg-linear-to-b from-white via-white to-zinc-400 max-w-4xl drop-shadow-xl"
        >
          Built on Kaspa.
        </motion.h1>

        <div className="relative mt-8 max-w-2xl mx-auto">
          <motion.p
            variants={fadeInUp}
            initial="hidden"
            animate={startAnimation ? "visible" : "hidden"}
            transition={{ delay: 0.2 }}
            className="text-base md:text-2xl text-zinc-100 leading-loose md:leading-relaxed font-medium"
          >
            The fastest and most scalable instant-confirmation transaction layer ever built on proof-of-work. <br className="hidden md:block" />
            CadPay leverages Kaspa's revolutionary
            <span className="relative inline-block mx-2 text-white font-bold z-10">
              BlockDAG
              <svg className="absolute -bottom-2 -left-2 w-[120%] h-[140%] -z-10" viewBox="0 0 100 40" preserveAspectRatio="none">
                <motion.path
                  d="M0,30 Q50,40 100,30"
                  fill="none"
                  stroke="#ff9955"
                  strokeWidth="8"
                  strokeLinecap="round"
                  className="opacity-80"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.8 }}
                  transition={{ duration: 1.5, delay: 0.8, ease: "easeOut" }}
                />
              </svg>
            </span>
            to deliver subscription payments at unprecedented speed.
          </motion.p>
        </div>

        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate={startAnimation ? "visible" : "hidden"}
          transition={{ delay: 0.4 }}
          className="mt-10 flex flex-col md:flex-row gap-4 items-center justify-center"
        >
          <button className="group relative flex items-center justify-center gap-3 bg-zinc-900 hover:bg-zinc-800 text-white px-8 py-4 rounded-full text-lg font-bold border border-white/10 hover:border-orange-500/50 transition-all duration-300 shadow-[0_0_20px_rgba(0,0,0,0.5)] hover:shadow-[0_0_30px_rgba(255,102,0,0.2)]">
            <FingerprintIcon size={24} className="text-orange-500 group-hover:scale-110 transition-transform" />
            <span>Start Demo</span>
            <div className="absolute inset-x-0 -bottom-px h-px bg-linear-to-r from-transparent via-orange-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </motion.div>
      </div>

      {/* CURVED BOTTOM EDGE (Minimal Deep Arch - Outside) */}
      <div className="absolute -bottom-28 md:-bottom-16 left-0 w-full h-16 md:h-16 z-20 pointer-events-none drop-shadow-2xl">
        <svg
          viewBox="0 0 1440 320"
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          <path
            fill="#000000"
            fillOpacity="1"
            d="M0,0 L1440,0 L1440,320 Q720,0 0,320 Z"
          ></path>
        </svg>
      </div>
    </section >
  );
}