/**
 * TiltCard Component
 *
 * Provides smooth 3D perspective tilt and radial cursor reflection overlay on hover.
 * Automatically disabled on touch screens and prefers-reduced-motion.
 */

import { useRef, useState } from 'react';

const TiltCard = ({
  children,
  className = '',
  maxTilt = 4.5,
  scale = 1.015,
  glowColor = 'rgba(255, 179, 173, 0.08)',
  ...props
}) => {
  const cardRef = useRef(null);
  const [style, setStyle] = useState({
    transform: 'perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)',
    transition: 'transform 0.4s var(--ease-reveal)',
  });
  const [glarePosition, setGlarePosition] = useState({ x: 50, y: 50, opacity: 0 });

  const handleMouseMove = (e) => {
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = -((y - centerY) / centerY) * maxTilt;
    const rotateY = ((x - centerX) / centerX) * maxTilt;

    setStyle({
      transform: `perspective(900px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale(${scale})`,
      transition: 'transform 0.12s var(--ease-interactive)',
    });

    setGlarePosition({
      x: ((x / rect.width) * 100).toFixed(1),
      y: ((y / rect.height) * 100).toFixed(1),
      opacity: 1,
    });
  };

  const handleMouseLeave = () => {
    setStyle({
      transform: 'perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)',
      transition: 'transform 0.5s var(--ease-reveal)',
    });
    setGlarePosition((prev) => ({ ...prev, opacity: 0 }));
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={style}
      className={`relative overflow-hidden ${className}`}
      {...props}
    >
      {/* Radial glare highlight following the cursor */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300 ease-out"
        style={{
          background: `radial-gradient(circle 220px at ${glarePosition.x}% ${glarePosition.y}%, ${glowColor}, transparent 70%)`,
          opacity: glarePosition.opacity,
        }}
        aria-hidden="true"
      />
      {children}
    </div>
  );
};

export default TiltCard;
