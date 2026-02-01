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
            className="relative min-h-[60vh] bg-[#1c1209] flex flex-col items-center pt-30 -mt-1 overflow-hidden z-30"
        >
            {/* Background Logos */}
            <LogoField count={25} className="absolute inset-0 z-0" />

            <div className="w-full mt-0 relative z-50">
                <CoreFeatures />
            </div>

            <div className="absolute bottom-0 left-0 w-full overflow-hidden z-10 pointer-events-none">
                <svg
                    viewBox="0 0 1200 120"
                    preserveAspectRatio="none"
                    className="w-full h-[120px] md:h-[150px]"
                    style={{ fill: '#1c1209' }}
                >
                    <path d="M0,0 L1200,120 L1200,0 Z" />
                    <line x1="0" y1="0" x2="1200" y2="120" stroke="#f97316" strokeWidth="1" />
                </svg>
            </div>

        </section>
    );
}
