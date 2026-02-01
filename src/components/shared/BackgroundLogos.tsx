'use client';

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { SiSolana } from "react-icons/si";

import LogoField from './LogoField';

export default function BackgroundLogos() {
    return (
        <LogoField count={35} className="fixed z-0" />
    );
}

function FloatingLogo({
    x,
    y,
    depth,
    className,
    children
}: {
    x: any,
    y: any,
    depth: number,
    className: string,
    children: React.ReactNode
}) {
    const moveX = useTransform(x, (v: number) => v * depth * -1);
    const moveY = useTransform(y, (v: number) => v * depth * -1);

    return (
        <motion.div
            className={`absolute ${className}`}
            style={{ x: moveX, y: moveY }}
        >
            {children}
        </motion.div>
    );
}
