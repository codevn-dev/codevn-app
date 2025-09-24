'use client';

import { Variants, Transition } from 'framer-motion';

export const transitionSpringFast: Transition = {
  type: 'spring',
  stiffness: 520,
  damping: 34,
  mass: 0.8,
};

export const transitionSpringMedium: Transition = {
  type: 'spring',
  stiffness: 420,
  damping: 32,
  mass: 0.9,
};

export const listContainerStagger: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.02 },
  },
};

export const listItemFadeSlide: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.99 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: transitionSpringMedium,
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: -6,
    transition: { duration: 0.18, ease: 'easeInOut' },
  },
};

export const modalOverlay: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0, transition: { duration: 0.12 } },
};

export const modalContent: Variants = {
  initial: { opacity: 0, scale: 0.96, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0, transition: transitionSpringFast },
  exit: { opacity: 0, scale: 0.98, transition: { duration: 0.12 } },
};

export const bounceScaleTap: Transition = {
  type: 'spring',
  stiffness: 600,
  damping: 18,
  mass: 0.6,
};

export const typingDot: Variants = {
  initial: { y: 0, opacity: 0.6 },
  animate: (i: number) => ({
    y: [0, -4, 0],
    opacity: [0.6, 1, 0.6],
    transition: { duration: 0.9, repeat: Infinity, delay: i * 0.15 },
  }),
};


