'use client';

import { motion } from 'framer-motion';

interface LoaderProps {
    size?: 'sm' | 'md' | 'lg';
    color?: string;
    className?: string;
}

export default function Loader({ size = 'md', color = '#F97316', className = '' }: LoaderProps) {
    const sizeMap = {
        sm: 20,
        md: 40,
        lg: 60
    };

    const dotSize = sizeMap[size] / 5;

    return (
        <div className={`flex items-center justify-center gap-2 ${className}`}>
            {[0, 1, 2].map((index) => (
                <motion.div
                    key={index}
                    className="rounded-full"
                    style={{
                        width: dotSize,
                        height: dotSize,
                        backgroundColor: color
                    }}
                    animate={{
                        y: [0, -dotSize * 1.5, 0],
                        opacity: [0.4, 1, 0.4]
                    }}
                    transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: index * 0.1,
                        ease: 'easeInOut'
                    }}
                />
            ))}
        </div>
    );
}
