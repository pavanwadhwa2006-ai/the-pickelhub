/**
 * MagneticButton Component
 *
 * Subtle magnetic attraction effect on hover for primary CTAs.
 * Features spring-like return on mouse leave and tactile click feedback.
 */

import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';

const MagneticButton = ({
  children,
  to,
  onClick,
  type = 'button',
  disabled = false,
  className = '',
  pullStrength = 0.28,
  glow = true,
  ...props
}) => {
  const btnRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPressed, setIsPressed] = useState(false);

  const handleMouseMove = (e) => {
    if (disabled) return;
    const btn = btnRef.current;
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = (e.clientX - centerX) * pullStrength;
    const deltaY = (e.clientY - centerY) * pullStrength;

    setPosition({ x: deltaX, y: deltaY });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
    setIsPressed(false);
  };

  const dynamicStyle = {
    transform: `translate(${position.x.toFixed(1)}px, ${position.y.toFixed(1)}px) scale(${isPressed ? 0.97 : 1})`,
    transition: position.x === 0 && position.y === 0
      ? 'transform 0.4s var(--ease-spring)'
      : 'transform 0.1s var(--ease-interactive)',
  };

  const baseClasses = `inline-flex items-center justify-center font-bold tracking-[0.2em] uppercase cursor-pointer select-none ${
    glow ? 'hover:shadow-[0_0_24px_rgba(255,59,63,0.45)]' : ''
  } ${className}`;

  if (to) {
    return (
      <Link
        ref={btnRef}
        to={to}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        style={dynamicStyle}
        className={baseClasses}
        {...props}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      ref={btnRef}
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      style={dynamicStyle}
      className={baseClasses}
      {...props}
    >
      {children}
    </button>
  );
};

export default MagneticButton;
