/**
 * RevealOnScroll Component
 *
 * Viewport-triggered scroll reveal wrapper using IntersectionObserver.
 * Supports fade-rise, slide-left, slide-right, and scale variations with stagger delays.
 */

import { useRef, useEffect, useState } from 'react';

const isReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

const RevealOnScroll = ({
  children,
  variant = 'fade-rise', // 'fade-rise' | 'fade-slide-left' | 'fade-slide-right' | 'scale' | 'fade'
  delay = 0,
  threshold = 0.15,
  className = '',
  as = 'div',
  ...props
}) => {
  const elementRef = useRef(null);
  const [isVisible, setIsVisible] = useState(isReducedMotion);
  const Component = as;

  useEffect(() => {
    if (isReducedMotion()) return;

    const node = elementRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [threshold]);

  const variantClass = {
    'fade-rise': 'reveal-fade-rise',
    'fade-slide-left': 'reveal-fade-slide-left',
    'fade-slide-right': 'reveal-fade-slide-right',
    'scale': 'reveal-scale',
    'fade': '',
  }[variant] || 'reveal-fade-rise';

  return (
    <Component
      ref={elementRef}
      style={{ transitionDelay: `${delay}ms` }}
      className={`reveal-init ${variantClass} ${isVisible ? 'reveal-active' : ''} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
};

export default RevealOnScroll;
