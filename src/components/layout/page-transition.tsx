'use client';

import { motion, useAnimationControls } from 'framer-motion';
import { useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';

interface PageTransitionProps {
  children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const controls = useAnimationControls();
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const run = async () => {
      await controls.start({ opacity: 0, y: 14, scale: 0.985, transition: { duration: 0.04 } });
      await controls.start({
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { type: 'spring', stiffness: 420, damping: 32, mass: 0.9 },
      });
    };
    run();
  }, [pathname, controls, prefersReducedMotion]);

  return (
    <motion.div initial={false} animate={prefersReducedMotion ? undefined : controls}>
      {children}
    </motion.div>
  );
}
