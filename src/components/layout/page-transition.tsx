'use client';

import { motion, useAnimationControls } from 'framer-motion';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface PageTransitionProps {
  children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const controls = useAnimationControls();

  useEffect(() => {
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
  }, [pathname, controls]);

  return (
    <motion.div initial={false} animate={controls}>
      {children}
    </motion.div>
  );
}
