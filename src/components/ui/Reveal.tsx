"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

type RevealProps = {
  delay?: number;
  className?: string;
  children: ReactNode;
};

// El mismo árbol en servidor y cliente: con reduced-motion lo resuelve <MotionConfig reducedMotion="user"> (ver MotionProvider).
export function Reveal({ delay = 0, className, children }: RevealProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -40px 0px" }}
      transition={{ duration: 0.25, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
