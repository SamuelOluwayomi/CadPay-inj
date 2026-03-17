'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CaretUpIcon } from '@phosphor-icons/react';

export default function BackToTop() {
    const [isVisible, setIsVisible] = useState(false);

    // Show button when page is scrolled down
    const toggleVisibility = () => {
        if (window.scrollY > 400) {
            setIsVisible(true);
        } else {
            setIsVisible(false);
        }
    };

    // Set the top scroll position
    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    };

    useEffect(() => {
        window.addEventListener('scroll', toggleVisibility);
        return () => window.removeEventListener('scroll', toggleVisibility);
    }, []);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.button
                    initial={{ opacity: 0, scale: 0.5, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.5, y: 20 }}
                    onClick={scrollToTop}
                    className="fixed bottom-8 right-8 z-50 p-4 bg-orange-600/20 backdrop-blur-xl border border-orange-500/30 text-white rounded-2xl shadow-2xl shadow-orange-500/20 hover:bg-orange-600 hover:scale-110 active:scale-90 transition-all group"
                    aria-label="Back to top"
                >
                    <CaretUpIcon 
                        size={24} 
                        weight="bold" 
                        className="group-hover:-translate-y-1 transition-transform duration-300" 
                    />
                    
                    {/* Ring animation */}
                    <div className="absolute inset-0 rounded-2xl border border-orange-500/50 scale-100 group-hover:scale-125 opacity-0 group-hover:opacity-100 transition-all duration-500" />
                </motion.button>
            )}
        </AnimatePresence>
    );
}
