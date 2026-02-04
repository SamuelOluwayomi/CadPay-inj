'use client';

import { useRef } from 'react';
import { useInView } from 'framer-motion';
import CoreFeatures from './CoreFeatures';
import LogoField from './LogoField';
import { Meteors } from '../ui/meteors';

export default function About() {
    const containerRef = useRef(null);
    const isInView = useInView(containerRef, { once: true, amount: 0.2 });
    return (
        <section
            ref={containerRef}
            className="relative bg-[#1c1209] flex flex-col items-center -mt-13 md:-mt-24 z-20 w-full overflow-hidden"
        >
            {/* Meteors Effect */}
            <Meteors number={50} className=" z-40" />

            {/* Background Logos */}
            <LogoField count={25} className="absolute inset-0 z-10 opacity-20" />

            <div className="w-full relative z-20">
                <CoreFeatures />
            </div>
        </section>
    );
}
