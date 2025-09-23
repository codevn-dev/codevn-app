'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { HandIcon, MousePointer2, TextCursorInput } from 'lucide-react';

type CursorMode = 'default' | 'interactive' | 'text';

function usePrimaryColor(): string {
  const defaultColor = '#ffffff';
  const [color, setColor] = useState<string>(defaultColor); // fallback brand
  useEffect(() => {
    const root = document.documentElement;
    const getColor = () => {
      // Priority: brand-600 → explicit override → primary → brand
      const brand = getComputedStyle(root).getPropertyValue('--color-brand').trim();
      const override = getComputedStyle(root).getPropertyValue('--cursor-color').trim();
      // Convert space-separated HSL tokens to hsl(), keep hex/rgb as-is
      const toCssColor = (val: string) => {
        const v = val.trim();
        if (!v) return v;
        if (v.startsWith('#') || v.startsWith('rgb') || v.startsWith('hsl(')) return v;
        if (/^\d+(?:\.\d+)?\s+\d+%\s+\d+%$/.test(v)) return `hsl(${v})`;
        return v;
      };
      if (brand) return toCssColor(brand);
      if (override) return toCssColor(override);
      return defaultColor;
    };
    setColor(getColor());
    const observer = new MutationObserver(() => setColor(getColor()));
    observer.observe(root, { attributes: true, attributeFilter: ['style', 'class'] });
    return () => observer.disconnect();
  }, []);
  return color;
}

export function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState<boolean>(false);
  const [mode, setMode] = useState<CursorMode>('default');
  const color = usePrimaryColor();

  const Icon = useMemo(() => {
    switch (mode) {
      case 'interactive':
        return HandIcon;
      case 'text':
        return TextCursorInput;
      default:
        return MousePointer2;
    }
  }, [mode]);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      setVisible(true);
      const el = cursorRef.current;
      if (!el) return;
      // Use transform for 60fps positioning
      el.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;

      // Determine mode by target element
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTextEditable = tag === 'input' || tag === 'textarea' || target?.isContentEditable;
      if (isTextEditable) {
        setMode('text');
        return;
      }
      const isInteractive = !!target?.closest(
        'button, [role="button"], a, [role="link"], [data-cursor="interactive"], .cursor-pointer, [role="menu"], [data-state], [data-radix-collection-item]'
      );
      setMode(isInteractive ? 'interactive' : 'default');
    };

    const handleEnter = () => setVisible(true);
    const handleLeave = () => setVisible(false);
    const handlePointerLeaveDoc = () => setVisible(false);
    const handleMouseOut = (e: MouseEvent) => {
      const to = e.relatedTarget as Node | null;
      if (!to || (to && !document.documentElement.contains(to))) {
        setVisible(false);
      }
    };
    const handleBlur = () => setVisible(false);
    const handleVisibility = () => setVisible(!document.hidden);

    window.addEventListener('mousemove', handleMove, { passive: true });
    window.addEventListener('mouseenter', handleEnter, { passive: true });
    window.addEventListener('mouseleave', handleLeave, { passive: true });
    window.addEventListener('blur', handleBlur, { passive: true } as any);
    document.documentElement.addEventListener('pointerleave', handlePointerLeaveDoc, true);
    document.addEventListener('mouseout', handleMouseOut, true);
    document.addEventListener('visibilitychange', handleVisibility, { passive: true } as any);

    return () => {
      window.removeEventListener('mousemove', handleMove as any);
      window.removeEventListener('mouseenter', handleEnter as any);
      window.removeEventListener('mouseleave', handleLeave as any);
      window.removeEventListener('blur', handleBlur as any);
      document.documentElement.removeEventListener(
        'pointerleave',
        handlePointerLeaveDoc as any,
        true
      );
      document.removeEventListener('mouseout', handleMouseOut as any, true);
      document.removeEventListener('visibilitychange', handleVisibility as any);
    };
  }, []);

  // Hide on touch devices to avoid conflicts
  const isTouch = typeof window !== 'undefined' && matchMedia('(pointer: coarse)').matches;
  if (isTouch) return null;

  const baseSize = mode === 'text' ? 18 : mode === 'interactive' ? 22 : 18;
  const size = baseSize * 1.2; // increase by 20%
  const opacity = visible ? 1 : 0;

  return (
    <div
      ref={cursorRef}
      aria-hidden
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        pointerEvents: 'none',
        zIndex: 99999,
        transform: 'translate3d(-100px, -100px, 0)',
        transition: 'opacity 120ms ease',
        opacity,
        mixBlendMode: 'normal',
        color,
      }}
    >
      <span
        style={{
          position: 'relative',
          display: 'inline-flex',
          filter: 'drop-shadow(0 0 1px rgba(0,0,0,.35)) drop-shadow(0 0 4px rgba(0,0,0,.35))',
        }}
      >
        {/* Outline layer for contrast over same-color backgrounds */}
        <Icon
          width={size}
          height={size}
          strokeWidth={3.6}
          stroke="#ffffff"
          color="#ffffff"
          style={{ opacity: 0.95, position: 'absolute', inset: 0 }}
        />
        {/* Foreground brand-colored cursor */}
        <Icon
          width={size}
          height={size}
          strokeWidth={2.2}
          stroke={color}
          color={color}
          style={{ position: 'relative' }}
        />
      </span>
    </div>
  );
}
