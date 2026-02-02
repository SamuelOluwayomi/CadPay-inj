'use client';

import { useRef } from 'react';
import { useInView } from 'framer-motion';
import CoreFeatures from './CoreFeatures';
import LogoField from './LogoField';
// Removed unused imports

export default function About() {
    const containerRef = useRef(null);
    const isInView = useInView(containerRef, { once: true, amount: 0.2 });
    return (
        <section
            ref={containerRef}
            className="relative bg-[#1c1209] flex flex-col items-center -mt-24 z-20"
        >
            {/* Background Logos */}
            <LogoField count={25} className="absolute inset-0 z-0" />

            <div className="w-full relative z-50">
                <CoreFeatures />
            </div>
        </section>
    );
}
