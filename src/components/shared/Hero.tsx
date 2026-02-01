'use client';

import { motion, Variants } from 'framer-motion';
import { FingerprintIcon } from '@phosphor-icons/react';
import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
// @ts-ignore
import NET from 'vanta/dist/vanta.net.min';

export default function Hero({ startAnimation = true }: { startAnimation?: boolean }) {
  const [vantaEffect, setVantaEffect] = useState<any>(null);
  const vantaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!vantaEffect && vantaRef.current) {
      setVantaEffect(
        NET({
          el: vantaRef.current,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200.00,
          minWidth: 200.00,
          scale: 1.00,
          scaleMobile: 1.00,
          color: 0xff6600,       // Orange connections
          backgroundColor: 0x000000, // Black background
          pointsColor: 0xff8800, // Orange points
          maxDistance: 22.00,
          spacing: 16.00,
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
    <section className="relative z-20 min-h-[90vh] w-full overflow-hidden text-white pt-24 md:pt-36 pb-0 perspective-[2000px]">

      {/* VANTA BACKGROUND */}
      <div ref={vantaRef} className="absolute inset-0 z-0 h-full w-full" />

      {/* GRADIENT OVERLAY FOR TEXT READABILITY */}
      <div className="absolute inset-0 z-10 bg-linear-to-t from-black via-transparent to-black/40 pointer-events-none" />

      {/* CONTENT CONTAINER - CENTERED */}
      <div className="relative z-30 max-w-7xl mx-auto px-6 flex flex-col items-center justify-center h-full text-center mt-20 md:mt-32">

        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate={startAnimation ? "visible" : "hidden"}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/60 border border-orange-500/30 w-fit backdrop-blur-md mb-8"
        >
        </motion.div>

        <motion.h1
          variants={fadeInUp}
          initial="hidden"
          animate={startAnimation ? "visible" : "hidden"}
          transition={{ delay: 0.3 }}
          className="text-5xl md:text-8xl font-black tracking-tighter leading-[1.1] text-white max-w-4xl"
        >
          Built on <span className="text-orange-500">Kaspa.</span>
        </motion.h1>

        <motion.p
          variants={fadeInUp}
          initial="hidden"
          animate={startAnimation ? "visible" : "hidden"}
          transition={{ delay: 0.2 }}
          className="mt-8 text-lg md:text-2xl text-zinc-300 max-w-2xl leading-relaxed font-light"
        >
          The fastest and most scalable instant-confirmation transaction layer ever built on proof-of-work. <br className="hidden md:block" />
          CadPay leverages Kaspa's revolutionary <span className="text-white font-medium">BlockDAG</span> to deliver subscription payments at unprecedented speed.
        </motion.p>

        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate={startAnimation ? "visible" : "hidden"}
          transition={{ delay: 0.4 }}
          className="flex items-center justify-center gap-6 mt-12 mb-20"
        >
          <a href="/signin" className="group px-8 py-4 bg-orange-500 text-black rounded-full font-bold text-lg hover:bg-orange-400 transition-all flex items-center gap-3 shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_30px_rgba(249,115,22,0.5)] transform hover:-translate-y-1">
            <FingerprintIcon size={24} weight="bold" /> Start Demo
          </a>
        </motion.div>

      </div>
    </section>
  );
}