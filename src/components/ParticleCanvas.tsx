import React, { useEffect, useRef } from 'react';
import { ParticleItem, FloatingText } from '../types';

interface ParticleCanvasProps {
  floatingTexts: FloatingText[];
  particlesRef: React.MutableRefObject<ParticleItem[]>;
}

export const ParticleCanvas: React.FC<ParticleCanvasProps> = ({ floatingTexts, particlesRef }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const handleResize = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const list = particlesRef.current;
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15; // gravity
        p.life++;
        p.alpha = 1 - p.life / p.maxLife;

        if (p.life >= p.maxLife || p.alpha <= 0) {
          list.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);

        if (p.shape === 'ring') {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1 + p.life * 0.1), 0, Math.PI * 2);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 2.5;
          ctx.stroke();
        } else if (p.shape === 'spark') {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
    };
  }, [particlesRef]);

  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      {floatingTexts.map((ft) => (
        <div
          key={ft.id}
          className="animate-float-fade absolute font-black tracking-wider drop-shadow-md select-none"
          style={{
            left: `${ft.x}px`,
            top: `${ft.y}px`,
            color: ft.color,
            transform: `translate(-50%, -50%) rotate(${ft.rotation || 0}deg) scale(${ft.scale || 1})`,
            fontSize: `${(ft.scale || 1) * 20}px`,
            textShadow: '0 0 12px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.9)',
          }}
        >
          {ft.text}
        </div>
      ))}
    </div>
  );
};
