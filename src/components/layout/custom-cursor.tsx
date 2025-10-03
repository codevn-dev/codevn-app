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
  const [mounted, setMounted] = useState(false);
  const modeRef = useRef<CursorMode>('default');
  const rafRef = useRef<number | null>(null);
  const currentPositionRef = useRef<{ x: number; y: number }>({ x: -100, y: -100 });
  const targetPositionRef = useRef<{ x: number; y: number }>({ x: -100, y: -100 });
  const smoothingRef = useRef<number>(0.18);
  const visibleRef = useRef<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    // Respect reduced motion: jump to target without smoothing
    try {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      smoothingRef.current = reduce ? 1 : 0.18;
    } catch {}

    const startLoop = () => {
      if (rafRef.current != null) return;
      const step = () => {
        const el = cursorRef.current;
        if (el) {
          const cur = currentPositionRef.current;
          const tgt = targetPositionRef.current;
          cur.x += (tgt.x - cur.x) * smoothingRef.current;
          cur.y += (tgt.y - cur.y) * smoothingRef.current;
          el.style.transform = `translate3d(${cur.x}px, ${cur.y}px, 0)`;
        }
        const dx = targetPositionRef.current.x - currentPositionRef.current.x;
        const dy = targetPositionRef.current.y - currentPositionRef.current.y;
        const dist2 = dx * dx + dy * dy;
        // Continue while approaching target, or while visible
        if (dist2 > 0.25 || visibleRef.current) {
          rafRef.current = requestAnimationFrame(step);
        } else {
          rafRef.current = null;
        }
      };
      rafRef.current = requestAnimationFrame(step);
    };

    const handleMove = (e: MouseEvent | PointerEvent) => {
      // Update target position; RAF loop will interpolate towards it
      targetPositionRef.current = { x: e.clientX, y: e.clientY };
      startLoop();

      // Ensure cursor becomes visible on first movement
      if (!visibleRef.current) {
        visibleRef.current = true;
        setVisible(true);
      }

      // Determine mode by target element
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const type = (target as HTMLInputElement | null)?.type?.toLowerCase?.() || '';

      // Consider certain input types as interactive (not text), hoặc override qua data-cursor
      const forcedInteractive = !!target?.closest('[data-cursor="interactive"]');
      const isNonTextInput =
        tag === 'input' &&
        (type === 'checkbox' ||
          type === 'radio' ||
          type === 'range' ||
          type === 'button' ||
          type === 'submit' ||
          type === 'reset');
      const isInteractive =
        forcedInteractive ||
        isNonTextInput ||
        !!target?.closest(
          'button, [role="button"], a, [role="link"], .cursor-pointer, [role="menu"], [data-state], [data-radix-collection-item]'
        );

      const isTextEditable =
        !isInteractive && (tag === 'input' || tag === 'textarea' || target?.isContentEditable);

      const nextMode: CursorMode = isInteractive
        ? 'interactive'
        : isTextEditable
          ? 'text'
          : 'default';
      if (nextMode !== modeRef.current) {
        modeRef.current = nextMode;
        setMode(nextMode);
      }
    };

    const handleEnter = () => {
      visibleRef.current = true;
      setVisible(true);
    };
    const handleLeave = () => {
      visibleRef.current = false;
      setVisible(false);
    };
    const handlePointerLeaveDoc = () => {
      visibleRef.current = false;
      setVisible(false);
    };
    const handleMouseOut = (e: MouseEvent) => {
      const to = e.relatedTarget as Node | null;
      if (!to || (to && !document.documentElement.contains(to))) {
        visibleRef.current = false;
        setVisible(false);
      }
    };
    const handleBlur = () => {
      visibleRef.current = false;
      setVisible(false);
    };
    const handleVisibility = () => {
      const v = !document.hidden;
      visibleRef.current = v;
      setVisible(v);
    };

    // Prefer pointer events when available
    window.addEventListener('pointermove', handleMove as any, { passive: true });
    // Fallback for environments without pointer events
    window.addEventListener('mousemove', handleMove as any, { passive: true });
    window.addEventListener('mouseenter', handleEnter, { passive: true });
    window.addEventListener('mouseleave', handleLeave, { passive: true });
    window.addEventListener('blur', handleBlur, { passive: true } as any);
    document.documentElement.addEventListener('pointerleave', handlePointerLeaveDoc, true);
    document.addEventListener('mouseout', handleMouseOut, true);
    document.addEventListener('visibilitychange', handleVisibility, { passive: true } as any);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('pointermove', handleMove as any);
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
  if (!mounted || isTouch) return null;

  const baseSize = mode === 'text' ? 18 : mode === 'interactive' ? 22 : 18;
  const sizeMultiplier = mode === 'default' ? 1.3 : 1.2; // default +30%, others +20%
  const size = baseSize * sizeMultiplier;
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
        willChange: 'transform',
        backfaceVisibility: 'hidden',
        contain: 'layout style paint',
      }}
    >
      <span
        style={{
          position: 'relative',
          display: 'inline-flex',
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
