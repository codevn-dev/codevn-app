'use client';

import { motion } from 'framer-motion';
import { transitionSpringMedium } from './motion-presets';

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
      transition={{ ...transitionSpringMedium, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function SectionReveal({ children, delay = 0, className }: MotionContainerProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18, scale: 0.99 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '0px 0px -120px 0px' }}
      transition={{ ...transitionSpringMedium, delay }}
      className={className}
    >
      {children}
    </motion.section>
  );
}
