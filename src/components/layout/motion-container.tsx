'use client';

import { motion } from 'framer-motion';

interface MotionContainerProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export function MotionContainer({ children, delay = 0, className }: MotionContainerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.99 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '0px 0px -80px 0px' }}
      transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.9, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
