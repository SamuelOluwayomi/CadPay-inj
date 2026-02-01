'use client';

import { motion, useTransform, MotionValue } from 'framer-motion';

export default function FloatingLogo({
    x,
    y,
    depth,
    className,
    children
}: {
    x: MotionValue<number>;
    y: MotionValue<number>;
    depth: number;
    className: string;
    children: React.ReactNode;
}) {
    const moveX = useTransform(x, (v: number) => v * depth * -1);
    const moveY = useTransform(y, (v: number) => v * depth * -1);

    return (
        <motion.div
            className={`absolute pointer-events-none ${className}`}
            style={{ x: moveX, y: moveY }}
        >
            {children}
        </motion.div>
    );
}
