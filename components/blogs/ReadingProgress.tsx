"use client";

import { motion, useScroll, useSpring } from "framer-motion";

export function ReadingProgress() {
  const { scrollYProgress } = useScroll();
  const scale = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    mass: 0.35,
  });
  return (
    <motion.div
      aria-hidden
      className="fixed top-0 left-0 right-0 h-[2px] z-[60] origin-left pointer-events-none bg-gradient-to-r from-cyan via-cyan/80 to-mint shadow-[0_0_12px_#00E5FF]"
      style={{ scaleX: scale }}
    />
  );
}
