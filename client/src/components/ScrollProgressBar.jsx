/**
 * ScrollProgressBar Component
 *
 * A 2px high-performance GPU-accelerated progress bar fixed at the top of the viewport.
 * Dynamically tracks document scroll progress.
 */

import { useState, useEffect } from 'react';

const ScrollProgressBar = () => {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
          if (totalHeight > 0) {
            const currentProgress = window.scrollY / totalHeight;
            setScrollProgress(Math.min(Math.max(currentProgress, 0), 1));
          } else {
            setScrollProgress(0);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 h-[2.5px] z-[9999] pointer-events-none"
    >
      <div
        className="h-full bg-gradient-to-r from-[#ff3b3f] to-[#ffb3ad] shadow-[0_0_8px_rgba(255,59,63,0.8)] transition-transform duration-75 ease-out"
        style={{
          transform: `scaleX(${scrollProgress})`,
          transformOrigin: 'left',
        }}
      />
    </div>
  );
};

export default ScrollProgressBar;
