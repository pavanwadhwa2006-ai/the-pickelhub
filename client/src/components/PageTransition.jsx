/**
 * PageTransition Component
 *
 * Cinematic scene transition wrapper for all page routes.
 * Uses CSS opacity / translateY transitions triggered cleanly on route changes.
 */

import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const PageTransition = ({ children, className = '' }) => {
  const location = useLocation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      setMounted(true);
    });

    return () => {
      cancelAnimationFrame(frameId);
      setMounted(false);
    };
  }, [location.pathname]);

  return (
    <div
      key={location.pathname}
      className={`transition-all duration-500 ease-out ${
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      } ${className}`}
    >
      {children}
    </div>
  );
};

export default PageTransition;
