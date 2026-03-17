"use client";

import { motion } from "framer-motion";

interface AnimateOnScrollProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export function AnimateOnScroll({
  children,
  delay = 0,
  className = "",
}: AnimateOnScrollProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{
        duration: 0.8,
        delay,
        ease: [0.2, 0, 0, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
