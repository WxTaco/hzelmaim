/**
 * useScrollReveal
 *
 * Observes a DOM element and returns `visible: true` once it has
 * scrolled into the viewport.  By default the observation fires once
 * and then stops, so the reveal animation only plays on entry.
 *
 * @example
 * const { ref, visible } = useScrollReveal();
 * <div ref={ref} className={visible ? 'reveal-visible' : 'reveal-hidden'} />
 */

import { useEffect, useRef, useState } from 'react';

interface UseScrollRevealOptions {
  /** Fraction of the element that must be visible before triggering (0–1). */
  threshold?: number;
  /** When true the observer disconnects after the first intersection. */
  once?: boolean;
}

interface UseScrollRevealReturn {
  /** Attach this ref to the element you want to observe. */
  ref: React.RefObject<HTMLDivElement>;
  /** True once the element has entered the viewport. */
  visible: boolean;
}

export function useScrollReveal({
  threshold = 0.15,
  once = true,
}: UseScrollRevealOptions = {}): UseScrollRevealReturn {
  const ref = useRef<HTMLDivElement>(null!);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) observer.unobserve(el);
        } else if (!once) {
          setVisible(false);
        }
      },
      { threshold },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, once]);

  return { ref, visible };
}

