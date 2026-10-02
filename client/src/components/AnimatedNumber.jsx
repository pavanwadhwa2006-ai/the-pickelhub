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
  const isInView = useRef(false);
  const currentValRef = useRef(isReducedMotion() ? target : 0);
  const rafIdRef = useRef(null);

  useEffect(() => {
    if (isReducedMotion()) {
      setDisplayValue(target);
      currentValRef.current = target;
      return;
    }

    const animateToTarget = (toValue) => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }

      const startVal = currentValRef.current;
      const startTime = performance.now();
      const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

      const updateCounter = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = duration > 0 ? Math.min(elapsed / duration, 1) : 1;
        const easedProgress = easeOutCubic(progress);

        const current = startVal + (toValue - startVal) * easedProgress;
        currentValRef.current = current;
        setDisplayValue(current);

        if (progress < 1) {
          rafIdRef.current = requestAnimationFrame(updateCounter);
        } else {
          currentValRef.current = toValue;
          setDisplayValue(toValue);
        }
      };

      rafIdRef.current = requestAnimationFrame(updateCounter);
    };

    const node = elementRef.current;
    if (!node) return;

    if (typeof IntersectionObserver === 'undefined') {
      isInView.current = true;
      animateToTarget(target);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          isInView.current = true;
          animateToTarget(target);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(node);

    // If already in view from a previous intersection, re-animate immediately on target update
    if (isInView.current) {
      animateToTarget(target);
    }

    return () => {
      observer.disconnect();
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
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
