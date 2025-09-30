'use client';

interface MotionLiteProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

// Lightweight replacement for MotionContainer to avoid bundling framer-motion on homepage
export function MotionContainer({ children, className }: MotionLiteProps) {
  return <div className={className}>{children}</div>;
}

export function SectionReveal({ children, className }: MotionLiteProps) {
  return <section className={className}>{children}</section>;
}
