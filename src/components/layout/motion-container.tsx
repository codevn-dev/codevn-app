'use client';

import { motion } from 'framer-motion';
import { transitionSpringMedium } from './motion-presets';

interface MotionContainerProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export function MotionContainer({ children, delay = 0, className }: MotionContainerProps) {
  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 16, scale: 0.99 }}
      whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
      viewport={prefersReducedMotion ? { once: true } : { once: true, margin: '0px 0px -80px 0px' }}
      transition={prefersReducedMotion ? undefined : { ...transitionSpringMedium, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function SectionReveal({ children, delay = 0, className }: MotionContainerProps) {
  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return (
    <motion.section
      initial={prefersReducedMotion ? false : { opacity: 0, y: 18, scale: 0.99 }}
      whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
      viewport={
        prefersReducedMotion ? { once: true } : { once: true, margin: '0px 0px -120px 0px' }
      }
      transition={prefersReducedMotion ? undefined : { ...transitionSpringMedium, delay }}
      className={className}
    >
      {children}
    </motion.section>
  );
}
