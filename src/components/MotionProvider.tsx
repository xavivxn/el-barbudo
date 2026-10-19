"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/** Con prefers-reduced-motion, motion omite los desplazamientos y deja solo el fundido. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
