/**
 * ParticleCanvas Component
 *
 * Ambient floating particle canvas for hero and spotlight sections.
 * Optimized with requestAnimationFrame, visibility pause, and mobile performance caps.
 */

import { useRef, useEffect } from 'react';

const ParticleCanvas = ({
  count = 20,
  color = 'rgba(255, 179, 173, 0.12)',
  speed = 0.35,
  className = '',
}) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let particles = [];
    const isMobile = window.innerWidth < 768;
    const activeCount = isMobile ? Math.min(count, 10) : count;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    const initParticles = () => {
      const rect = canvas.getBoundingClientRect();
      particles = Array.from({ length: activeCount }, () => ({
        x: Math.random() * rect.width,
        y: Math.random() * rect.height,
        radius: Math.random() * 2.2 + 1,
        speedY: Math.random() * speed + 0.15,
        speedX: (Math.random() - 0.5) * 0.2,
        opacity: Math.random() * 0.5 + 0.2,
        pulseSpeed: Math.random() * 0.02 + 0.005,
      }));
    };

    resizeCanvas();
    initParticles();

    let lastTime = performance.now();

    const render = (time) => {
      if (document.hidden) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      const delta = (time - lastTime) / 1000;
      lastTime = time;

      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      particles.forEach((p) => {
        p.y -= p.speedY * (delta * 60);
        p.x += p.speedX * (delta * 60);
        p.opacity += Math.sin(time * p.pulseSpeed) * 0.005;

        // Wrap around when particle floats off the top
        if (p.y < -10) {
          p.y = rect.height + 10;
          p.x = Math.random() * rect.width;
        }
        if (p.x < -10) p.x = rect.width + 10;
        if (p.x > rect.width + 10) p.x = -10;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = color.replace(/[\d.]+\)$/g, `${Math.max(0.05, Math.min(p.opacity, 0.45))})`);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    const handleResize = () => {
      resizeCanvas();
      initParticles();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [count, color, speed]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      aria-hidden="true"
    />
  );
};

export default ParticleCanvas;
