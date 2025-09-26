'use client';

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onScroll = () => setVisible(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      aria-label="Back to top"
      title="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="bg-brand ring-brand/30 hover:bg-brand-600 hover:ring-brand/40 supports-[backdrop-filter]:bg-brand/90 fixed bottom-6 left-4 z-[40] flex h-12 w-12 items-center justify-center rounded-full text-white shadow-xl ring-1 backdrop-blur transition-all duration-200 hover:scale-105 hover:shadow-2xl sm:bottom-6 sm:left-6"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}
