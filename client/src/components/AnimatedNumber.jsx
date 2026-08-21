/**
 * AnimatedNumber Component
 *
 * Smooth count-up animation that activates when entering the viewport.
 * Uses requestAnimationFrame with cubic-bezier ease-out timing.
 */

import { useState, useEffect, useRef } from 'react';

const isReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

const AnimatedNumber = ({
  value = 0,
  duration = 900,
  prefix = '',
  suffix = '',
  decimals = 0,
  className = '',
}) => {
  const target = Number(value) || 0;
  const [displayValue, setDisplayValue] = useState(() => (isReducedMotion() ? target : 0));
  const elementRef = useRef(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (isReducedMotion()) return;

    const node = elementRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          observer.disconnect();

          const startTime = performance.now();
          const startVal = 0;

          const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

          const updateCounter = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeOutCubic(progress);

            const current = startVal + (target - startVal) * easedProgress;
            setDisplayValue(current);

            if (progress < 1) {
              requestAnimationFrame(updateCounter);
            } else {
              setDisplayValue(target);
            }
          };

          requestAnimationFrame(updateCounter);
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [target, duration]);

  const formatted = decimals > 0
    ? displayValue.toFixed(decimals)
    : Math.round(displayValue).toLocaleString();

  return (
    <span ref={elementRef} className={`inline-block tabular-nums ${className}`}>
      {prefix}{formatted}{suffix}
    </span>
  );
};

export default AnimatedNumber;
