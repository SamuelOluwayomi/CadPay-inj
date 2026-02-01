import { useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useEffect, useState } from 'react';

export function useMouseParallax() {
    const [mounted, setMounted] = useState(false);
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const springConfig = { damping: 25, stiffness: 150 };
    const springX = useSpring(mouseX, springConfig);
    const springY = useSpring(mouseY, springConfig);

    useEffect(() => {
        setMounted(true);
        const handleMouseMove = (e: MouseEvent) => {
            const { clientX, clientY } = e;
            const screenWidth = window.innerWidth;
            const screenHeight = window.innerHeight;
            const normalizedX = (clientX / screenWidth) * 2 - 1;
            const normalizedY = (clientY / screenHeight) * 2 - 1;
            mouseX.set(normalizedX);
            mouseY.set(normalizedY);
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [mouseX, mouseY]);

    return { springX, springY, mounted };
}
