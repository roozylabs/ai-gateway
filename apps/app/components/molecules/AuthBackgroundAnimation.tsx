'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';

/**
 * AuthBackgroundAnimation - Anti-Slop High-End Designer Background
 *
 * Design Intent:
 * - Single focal point: Center authentication card
 * - Palette: Prism Violet (#8B5CF6) and Slate/Obsidian neutrals
 * - Dial: ENERGY 1 (Calm) / RHYTHM 1 (Unified) / MOTION 1 (Subtle ambient)
 * - Technique: Refractive ambient prism light + fine geometric grid
 * - Eliminates: Flying particle clutter, fake statistics, floating badges, and neon glow stacking
 */
export function AuthBackgroundAnimation() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const isDark = resolvedTheme === 'dark';
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Subtle ambient light beam variables
    let phase = 0;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      if (!prefersReducedMotion) {
        phase += 0.005;
      }

      // 1. Subtle top-center ambient prism refraction
      const centerX = width / 2;
      const topY = height * 0.15;
      const radius = Math.max(width, height) * 0.45;

      const radialGrad = ctx.createRadialGradient(
        centerX + Math.sin(phase) * 40,
        topY + Math.cos(phase * 0.8) * 20,
        0,
        centerX,
        topY,
        radius
      );

      if (isDark) {
        radialGrad.addColorStop(0, 'rgba(139, 92, 246, 0.12)'); // Prism Violet
        radialGrad.addColorStop(0.4, 'rgba(6, 182, 212, 0.04)'); // Subtle Cyan refraction
        radialGrad.addColorStop(1, 'rgba(8, 9, 10, 0)');
      } else {
        radialGrad.addColorStop(0, 'rgba(124, 58, 237, 0.08)');
        radialGrad.addColorStop(0.4, 'rgba(2, 132, 199, 0.03)');
        radialGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      }

      ctx.fillStyle = radialGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Ultra-fine subtle geometric grid lines with soft radial falloff
      const gridSize = 48;
      ctx.lineWidth = 1;
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.025)' : 'rgba(0, 0, 0, 0.035)';

      const startX = (width % gridSize) / 2;
      const startY = (height % gridSize) / 2;

      ctx.beginPath();
      for (let x = startX; x <= width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = startY; y <= height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [resolvedTheme]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* 1. Subtle Background Vignette / Mask */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_20%,transparent_40%,hsl(var(--background))_100%)]" />

      {/* 2. Soft Ambient Refraction Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
