"use client";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import React, { useEffect, useState } from "react";

export const Meteors = ({
    number,
    className,
}: {
    number?: number;
    className?: string;
}) => {
    const [meteorStyles, setMeteorStyles] = useState<Array<{
        left: string;
        animationDelay: string;
        animationDuration: string;
    }>>([]);

    useEffect(() => {
        const meteorCount = number || 20;
        const styles = Array.from({ length: meteorCount }, (_, idx) => {
            const position = idx * (100 / meteorCount); // Percentage across width
            return {
                left: position + "%",
                animationDelay: Math.random() * 2 + "s", // Faster start
                animationDuration: Math.floor(Math.random() * 3 + 2) + "s", // Faster movement
            };
        });
        setMeteorStyles(styles);
    }, [number]);

    if (meteorStyles.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className={cn("absolute inset-0 overflow-hidden pointer-events-none z-30", className)}
        >
            {meteorStyles.map((style, idx) => (
                <span
                    key={"meteor" + idx}
                    className={cn(
                        "animate-meteor-effect absolute h-0.5 w-0.5 rounded-full bg-slate-500 rotate-215",
                        "before:content-[''] before:absolute before:top-1/2 before:transform before:-translate-y-[50%] before:w-[50px] before:h-px before:bg-linear-to-r before:from-slate-500 before:to-transparent",
                        "bg-orange-500 shadow-[0_0_10px_2px_rgba(249,115,22,0.6)]",
                        "before:w-[100px] before:h-px before:bg-linear-to-r before:from-orange-500 before:to-transparent"
                    )}
                    style={{
                        top: "0",
                        left: style.left,
                        animationDelay: style.animationDelay,
                        animationDuration: style.animationDuration,
                    }}
                ></span>
            ))}
        </motion.div>
    );
};
