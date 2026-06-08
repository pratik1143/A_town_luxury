import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  opacity: number;
  pulseSpeed: number;
  pulseOffset: number;
}

export const GoldParticles: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const particles: Particle[] = [];
    const particleCount = 45;

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2.5 + 0.5,
        speedY: -(Math.random() * 0.4 + 0.1),
        speedX: Math.random() * 0.2 - 0.1,
        opacity: Math.random() * 0.4 + 0.1,
        pulseSpeed: Math.random() * 0.02 + 0.005,
        pulseOffset: Math.random() * Math.PI * 2,
      });
    }

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.targetX = e.clientX;
      mouseRef.current.targetY = e.clientY;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Interpolate mouse coordinates for fluid parallax transition
      const mouse = mouseRef.current;
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      const mouseDx = (mouse.x - width / 2) * 0.015;
      const mouseDy = (mouse.y - height / 2) * 0.015;

      particles.forEach((p) => {
        // Move particle upward
        p.y += p.speedY;
        p.x += p.speedX;

        // Reset particle if it floats off screen
        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10 || p.x > width + 10) {
          p.x = Math.random() * width;
        }

        // Apply mouse parallax drift
        const renderX = p.x + mouseDx * (p.size * 0.5);
        const renderY = p.y + mouseDy * (p.size * 0.5);

        // Sinusoidal opacity pulsing
        p.pulseOffset += p.pulseSpeed;
        const currentOpacity = p.opacity + Math.sin(p.pulseOffset) * 0.08;

        // Render luxury glowing gold particle
        ctx.beginPath();
        ctx.arc(renderX, renderY, p.size, 0, Math.PI * 2);
        
        // Custom golden gradient for particle glow
        ctx.fillStyle = `rgba(197, 168, 128, ${Math.max(0.05, Math.min(1, currentOpacity))})`;
        ctx.shadowColor = '#d4af37';
        ctx.shadowBlur = p.size > 1.5 ? 4 : 0;
        ctx.fill();
        ctx.shadowBlur = 0; // Reset shadow for performance
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 bg-transparent"
    />
  );
};
