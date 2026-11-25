import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  alpha: number;
  alphaDir: number;
  hueColor: string;
}

const GOLD_PALETTE = [
  '212, 175, 55', // Imperial Gold
  '243, 213, 120', // Bright Champagne Gold
  '196, 152, 42', // Antique Brushed Gold
  '255, 232, 163', // Fine Gold Dust
];

export const GoldenParticlesCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    const count = width < 768 ? 55 : 95;
    const particles: Particle[] = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 1.9 + 0.5,
      vx: (Math.random() - 0.5) * 0.22,
      vy: -(Math.random() * 0.35 + 0.12),
      alpha: Math.random() * 0.6 + 0.15,
      alphaDir: Math.random() > 0.5 ? 0.004 : -0.004,
      hueColor: GOLD_PALETTE[Math.floor(Math.random() * GOLD_PALETTE.length)],
    }));

    const drawStatic = () => {
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.hueColor}, ${p.alpha})`;
        ctx.fill();
      }
    };

    if (prefersReducedMotion) {
      drawStatic();
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }

    let animId = 0;

    const tick = () => {
      ctx.clearRect(0, 0, width, height);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha += p.alphaDir;

        if (p.alpha >= 0.8 || p.alpha <= 0.12) {
          p.alphaDir *= -1;
        }

        if (p.y < -8) {
          p.y = height + 8;
          p.x = Math.random() * width;
        }
        if (p.x < -8) p.x = width + 8;
        if (p.x > width + 8) p.x = -8;

        // Soft golden powder halo
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 2.1, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.hueColor}, ${p.alpha * 0.16})`;
        ctx.fill();

        // Crisp golden dust speck
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.hueColor}, ${p.alpha})`;
        ctx.fill();
      }

      animId = window.requestAnimationFrame(tick);
    };

    animId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 h-full w-full"
    />
  );
};
