import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  Zap,
  RotateCcw,
  Volume2,
  VolumeX,
  Trophy,
  ArrowRight,
  Flame,
  Layers,
  ChevronRight,
  Crosshair,
  Sparkles
} from 'lucide-react';
import { ReactorLevelConfig, ReactorParticle, ReactorExplosion, SoundSettings } from '../../types';
import { sound } from '../../utils/audio';
import { HaroldOverlay } from '../HaroldOverlay';

const REACTOR_LEVELS: ReactorLevelConfig[] = [
  { id: 1, title: 'Sector 1 — Spark Ignition', totalParticles: 16, targetCount: 4, description: 'Click any orb or empty space to trigger a cascade.', color: '#38bdf8' },
  { id: 2, title: 'Sector 2 — Expanding Waves', totalParticles: 22, targetCount: 8, description: 'Particles bounce across the grid. Time your spark where paths intersect.', color: '#3b82f6' },
  { id: 3, title: 'Sector 3 — Golden Multipliers', totalParticles: 26, targetCount: 12, description: 'Golden nodes create extra-wide blast rings!', color: '#eab308' },
  { id: 4, title: 'Sector 4 — Kinetic Surge', totalParticles: 32, targetCount: 16, description: 'High density field. Target dense crossing zones.', color: '#f97316' },
  { id: 5, title: 'Sector 5 — Supernova Core', totalParticles: 38, targetCount: 21, description: 'Purple supernova nodes trigger massive shockwaves.', color: '#d946ef' },
  { id: 6, title: 'Sector 6 — Dense Nebula', totalParticles: 45, targetCount: 27, description: 'Chains multiply rapidly across clustered paths.', color: '#ec4899' },
  { id: 7, title: 'Sector 7 — Cosmic Tempest', totalParticles: 54, targetCount: 35, description: 'High cascade coordination required to pass.', color: '#8b5cf6' },
  { id: 8, title: 'Sector 8 — Singularity Surge', totalParticles: 65, targetCount: 44, description: 'Mastery of cascade physics. Trigger a total cosmic overload.', color: '#ef4444' },
];

interface Shard {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  radius: number;
  alpha: number;
  decay: number;
}

interface FloatText {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
  alpha: number;
  vy: number;
}

interface ChainReactorGameProps {
  soundSettings: SoundSettings;
  onToggleSound: () => void;
}

export const ChainReactorGame: React.FC<ChainReactorGameProps> = ({
  soundSettings,
  onToggleSound,
}) => {
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [poppedCountUI, setPoppedCountUI] = useState(0);
  const [comboUI, setComboUI] = useState(0);
  const [gameStateUI, setGameStateUI] = useState<'ready' | 'active' | 'won' | 'lost'>('ready');
  const [isAllCapturedUI, setIsAllCapturedUI] = useState(false);
  const [showHarold, setShowHarold] = useState(false);
  const [showLevelSelect, setShowLevelSelect] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const fireworksTimerRef = useRef<NodeJS.Timeout | null>(null);
  const haroldTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const level = REACTOR_LEVELS[currentLevelIdx] || REACTOR_LEVELS[0];

  // Self-contained physics simulation state ref to avoid React render-loop & async desync
  const simRef = useRef({
    particles: [] as ReactorParticle[],
    explosions: [] as ReactorExplosion[],
    shards: [] as Shard[],
    floatTexts: [] as FloatText[],
    hasSparked: false,
    hasTriggeredTargetSound: false,
    poppedCount: 0,
    combo: 0,
    gameState: 'ready' as 'ready' | 'active' | 'won' | 'lost',
    targetCount: level.targetCount,
    levelId: level.id,
    mousePos: { x: -100, y: -100, isHovering: false, hoveredParticleId: null as number | null },
    width: 800,
    height: 500,
  });

  // Spawn and initialize particles for level
  const resetSimulation = useCallback((lvlIndex: number) => {
    const lvl = REACTOR_LEVELS[lvlIndex] || REACTOR_LEVELS[0];
    const width = 800;
    const height = 500;

    const newParticles: ReactorParticle[] = [];
    for (let i = 0; i < lvl.totalParticles; i++) {
      const isSupernova = Math.random() < 0.14 && lvl.id >= 4;
      const isMultiplier = !isSupernova && Math.random() < 0.22 && lvl.id >= 3;

      let type: 'normal' | 'multiplier' | 'supernova' = 'normal';
      let color = '#38bdf8';
      let radius = 7.5;

      if (isSupernova) {
        type = 'supernova';
        color = '#d946ef';
        radius = 10.5;
      } else if (isMultiplier) {
        type = 'multiplier';
        color = '#facc15';
        radius = 9.0;
      }

      // Safe spawn coordinates away from edges
      const x = 30 + Math.random() * (width - 60);
      const y = 30 + Math.random() * (height - 60);

      // Balanced middle-ground speed (smooth & responsive)
      const speed = 1.15 + Math.random() * 0.65 + (lvl.id * 0.055);
      const angle = Math.random() * Math.PI * 2;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      newParticles.push({
        id: i,
        x,
        y,
        vx,
        vy,
        radius,
        type,
        color,
        popped: false,
      });
    }

    if (fireworksTimerRef.current) {
      clearInterval(fireworksTimerRef.current);
      fireworksTimerRef.current = null;
    }
    if (haroldTimeoutRef.current) {
      clearTimeout(haroldTimeoutRef.current);
      haroldTimeoutRef.current = null;
    }
    setIsAllCapturedUI(false);
    setShowHarold(false);

    simRef.current = {
      particles: newParticles,
      explosions: [],
      shards: [],
      floatTexts: [],
      hasSparked: false,
      hasTriggeredTargetSound: false,
      poppedCount: 0,
      combo: 0,
      gameState: 'ready',
      targetCount: lvl.targetCount,
      levelId: lvl.id,
      mousePos: simRef.current.mousePos,
      width,
      height,
    };

    setPoppedCountUI(0);
    setComboUI(0);
    setGameStateUI('ready');
  }, []);

  // Launch celebratory multi-burst fireworks sequence when all orbs are captured
  const launchSpecialFireworksSequence = useCallback(() => {
    if (fireworksTimerRef.current) {
      clearInterval(fireworksTimerRef.current);
    }
    sound.playWin();

    // Instant initial explosion of confetti
    try {
      confetti({
        particleCount: 80,
        spread: 100,
        startVelocity: 45,
        origin: { y: 0.5, x: 0.5 },
        colors: ['#38bdf8', '#facc15', '#ec4899', '#4ade80', '#a855f7', '#fb923c', '#ffffff'],
      });
    } catch {}

    const duration = 4500;
    const animationEnd = Date.now() + duration;

    const interval: NodeJS.Timeout = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) {
        clearInterval(interval);
        fireworksTimerRef.current = null;
        return;
      }

      sound.playFirework();

      const particleCount = 42 + Math.floor(Math.random() * 24);
      const xPos = 0.12 + Math.random() * 0.76;
      const yPos = 0.14 + Math.random() * 0.44;

      try {
        confetti({
          particleCount,
          startVelocity: 35 + Math.random() * 10,
          spread: 360,
          ticks: 75,
          origin: { x: xPos, y: yPos },
          colors: ['#38bdf8', '#facc15', '#ec4899', '#4ade80', '#a855f7', '#fb923c', '#ffffff'],
          shapes: ['circle', 'square'],
        });
      } catch {}
    }, 340);

    fireworksTimerRef.current = interval;
  }, []);

  // Initialize level on index change
  useEffect(() => {
    resetSimulation(currentLevelIdx);
  }, [currentLevelIdx, resetSimulation]);

  // Main Canvas Render & Physics Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;

    const renderLoop = () => {
      if (!isRunning) return;
      const sim = simRef.current;
      const width = sim.width;
      const height = sim.height;

      // 1. Clear background
      ctx.fillStyle = '#070b14';
      ctx.fillRect(0, 0, width, height);

      // 2. Draw Blueprint Grid
      ctx.strokeStyle = '#1e293b33';
      ctx.lineWidth = 1;
      const gridStep = 40;
      for (let x = 0; x < width; x += gridStep) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridStep) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 3. Update & Render Explosions (Balanced middle-ground size & ~2.0s duration)
      const remainingExplosions: ReactorExplosion[] = [];
      sim.explosions.forEach((exp) => {
        exp.life += 1;
        const progress = exp.life / exp.maxLife;

        let radius = exp.maxRadius;
        let alpha = 0.42;

        if (progress < 0.22) {
          // Smooth progressive expansion
          const t = progress / 0.22;
          radius = 8 + (exp.maxRadius - 8) * Math.sin((t * Math.PI) / 2);
          alpha = 0.52 * Math.sin((t * Math.PI) / 2);
        } else if (progress < 0.65) {
          // Active shockwave ring
          radius = exp.maxRadius;
          alpha = 0.42;
        } else {
          // Clean fade and slight contraction
          const t = (progress - 0.65) / 0.35;
          radius = exp.maxRadius * (1 - t * 0.28);
          alpha = Math.max(0, 0.42 * (1 - t));
        }

        exp.radius = radius;

        if (exp.life < exp.maxLife) {
          remainingExplosions.push(exp);

          // Draw Outer Blast Ring
          ctx.save();
          ctx.beginPath();
          ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
          ctx.fillStyle = `${exp.color}${Math.floor(alpha * 255)
            .toString(16)
            .padStart(2, '0')}`;
          ctx.fill();

          ctx.strokeStyle = exp.color;
          ctx.lineWidth = 2.2;
          ctx.shadowColor = exp.color;
          ctx.shadowBlur = 14;
          ctx.stroke();

          // Inner shockwave core pulse
          if (progress < 0.38) {
            ctx.beginPath();
            ctx.arc(exp.x, exp.y, exp.radius * 0.48, 0, Math.PI * 2);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.8;
            ctx.stroke();
          }
          ctx.restore();
        }
      });
      sim.explosions = remainingExplosions;

      // 4. Update & Render Particles
      let newlyPoppedInFrame = 0;
      let closestHoveredId: number | null = null;
      let minHoverDist = 28;

      sim.particles.forEach((p) => {
        if (p.popped) return;

        // Move particle
        p.x += p.vx;
        p.y += p.vy;

        // Boundary Bounce
        if (p.x <= p.radius) {
          p.x = p.radius;
          p.vx = Math.abs(p.vx);
        } else if (p.x >= width - p.radius) {
          p.x = width - p.radius;
          p.vx = -Math.abs(p.vx);
        }

        if (p.y <= p.radius) {
          p.y = p.radius;
          p.vy = Math.abs(p.vy);
        } else if (p.y >= height - p.radius) {
          p.y = height - p.radius;
          p.vy = -Math.abs(p.vy);
        }

        // Hover Detection
        if (sim.mousePos.isHovering && !sim.hasSparked) {
          const mdx = p.x - sim.mousePos.x;
          const mdy = p.y - sim.mousePos.y;
          const mDist = Math.hypot(mdx, mdy);
          if (mDist < minHoverDist) {
            minHoverDist = mDist;
            closestHoveredId = p.id;
          }
        }

        // Check Collision with Active Explosions
        for (const exp of sim.explosions) {
          const dx = p.x - exp.x;
          const dy = p.y - exp.y;
          const dist = Math.hypot(dx, dy);

          if (dist < p.radius + exp.radius) {
            p.popped = true;
            newlyPoppedInFrame += 1;
            sim.poppedCount += 1;
            sim.combo += 1;

            sound.playReactorPop(sim.combo);

            // Trigger target reached chime if quota is met for the first time
            if (sim.poppedCount >= sim.targetCount && !sim.hasTriggeredTargetSound) {
              sim.hasTriggeredTargetSound = true;
              sound.playTargetReached();
              sim.floatTexts.push({
                id: Date.now() + 0.1,
                text: '🎯 TARGET REACHED!',
                x: width / 2,
                y: 60,
                color: '#4ade80',
                alpha: 1,
                vy: -0.8,
              });
            }

            // Trigger floating text
            const bonus = p.type === 'supernova' ? '+3x' : p.type === 'multiplier' ? '+2x' : `+1`;
            sim.floatTexts.push({
              id: Date.now() + Math.random(),
              text: `${bonus} (#${sim.poppedCount})`,
              x: p.x,
              y: p.y - 11,
              color: p.color,
              alpha: 1,
              vy: -1.1,
            });

            // Create Shards
            for (let s = 0; s < 7; s++) {
              const shardAngle = Math.random() * Math.PI * 2;
              const shardSpeed = 1.4 + Math.random() * 2.2;
              sim.shards.push({
                x: p.x,
                y: p.y,
                vx: Math.cos(shardAngle) * shardSpeed,
                vy: Math.sin(shardAngle) * shardSpeed,
                color: p.color,
                radius: 2.0 + Math.random() * 1.6,
                alpha: 1,
                decay: 0.025 + Math.random() * 0.02,
              });
            }

            // Create Child Explosion with balanced middle ground radius & duration
            const maxRadius = p.type === 'supernova' ? 80 : p.type === 'multiplier' ? 65 : 50;
            const maxLife = p.type === 'supernova' ? 150 : p.type === 'multiplier' ? 135 : 120;

            sim.explosions.push({
              id: Date.now() + Math.random(),
              x: p.x,
              y: p.y,
              radius: 8,
              maxRadius,
              color: p.color,
              type: p.type,
              life: 0,
              maxLife,
            });

            break;
          }
        }

        if (!p.popped) {
          // Draw Particle Orb with Neon Core
          ctx.save();

          // Particle Aura Glow
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 1.7, 0, Math.PI * 2);
          ctx.fillStyle = `${p.color}25`;
          ctx.fill();

          // Particle Solid Core
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 12;
          ctx.fill();

          // Shiny Center Dot
          ctx.beginPath();
          ctx.arc(p.x - p.radius * 0.3, p.y - p.radius * 0.3, p.radius * 0.35, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();

          // Target Lock Bracket if hovered
          if (closestHoveredId === p.id && !sim.hasSparked) {
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 1.8;
            ctx.shadowColor = '#facc15';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius + 7, 0, Math.PI * 2);
            ctx.stroke();

            // Targeting crosshairs
            ctx.beginPath();
            ctx.moveTo(p.x - p.radius - 11, p.y);
            ctx.lineTo(p.x - p.radius - 3, p.y);
            ctx.moveTo(p.x + p.radius + 3, p.y);
            ctx.lineTo(p.x + p.radius + 11, p.y);
            ctx.moveTo(p.x, p.y - p.radius - 11);
            ctx.lineTo(p.x, p.y - p.radius - 3);
            ctx.moveTo(p.x, p.y + p.radius + 3);
            ctx.lineTo(p.x, p.y + p.radius + 11);
            ctx.stroke();
          }

          ctx.restore();
        }
      });

      sim.mousePos.hoveredParticleId = closestHoveredId;

      // 5. Update & Render Shards
      const activeShards: Shard[] = [];
      sim.shards.forEach((s) => {
        s.x += s.vx;
        s.y += s.vy;
        s.alpha -= s.decay;
        s.vx *= 0.975;
        s.vy *= 0.975;

        if (s.alpha > 0.05) {
          activeShards.push(s);
          ctx.save();
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
          ctx.fillStyle = s.color;
          ctx.globalAlpha = s.alpha;
          ctx.shadowColor = s.color;
          ctx.shadowBlur = 5;
          ctx.fill();
          ctx.restore();
        }
      });
      sim.shards = activeShards;

      // 6. Update & Render Floating Score / Pop Texts
      const activeTexts: FloatText[] = [];
      sim.floatTexts.forEach((t) => {
        t.y += t.vy;
        t.alpha -= 0.022;

        if (t.alpha > 0.05) {
          activeTexts.push(t);
          ctx.save();
          ctx.font = 'bold 11px monospace';
          ctx.fillStyle = t.color;
          ctx.globalAlpha = t.alpha;
          ctx.shadowColor = t.color;
          ctx.shadowBlur = 5;
          ctx.fillText(t.text, t.x - 13, t.y);
          ctx.restore();
        }
      });
      sim.floatTexts = activeTexts;

      // 7. Render Mouse Hover Crosshair Preview when ready to spark (balanced 52px blast radius preview)
      if (sim.mousePos.isHovering && !sim.hasSparked && sim.gameState === 'ready') {
        const mx = sim.mousePos.x;
        const my = sim.mousePos.y;

        ctx.save();
        const previewRadius = 52;
        ctx.beginPath();
        ctx.arc(mx, my, previewRadius, 0, Math.PI * 2);
        ctx.strokeStyle = '#ec489988';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.stroke();

        // Crosshair Center
        ctx.beginPath();
        ctx.arc(mx, my, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ec4899';
        ctx.fill();

        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(mx - 9, my);
        ctx.lineTo(mx + 9, my);
        ctx.moveTo(mx, my - 9);
        ctx.lineTo(mx, my + 9);
        ctx.stroke();
        ctx.restore();
      }

      // 8. Check Game Lifecycle State (Trigger Win / Loss ONLY when all explosions have completely dissipated)
      if (sim.hasSparked && sim.gameState === 'active') {
        if (sim.explosions.length === 0) {
          if (sim.poppedCount >= sim.targetCount) {
            const allCaptured = sim.poppedCount >= sim.particles.length;
            sim.gameState = 'won';
            setGameStateUI('won');
            setIsAllCapturedUI(allCaptured);

            if (allCaptured) {
              launchSpecialFireworksSequence();
            } else {
              sound.playWin();
              try {
                confetti({
                  particleCount: 60,
                  spread: 70,
                  origin: { y: 0.6 },
                });
              } catch {}
            }
          } else {
            sim.gameState = 'lost';
            if (sim.poppedCount === sim.targetCount - 1) {
              setShowHarold(true);
              if (haroldTimeoutRef.current) {
                clearTimeout(haroldTimeoutRef.current);
              }
              haroldTimeoutRef.current = setTimeout(() => {
                setShowHarold(false);
                setGameStateUI('lost');
                sound.playGameOver();
              }, 1500);
            } else {
              setGameStateUI('lost');
              sound.playGameOver();
            }
          }
        }
      }

      // Sync state to UI if popped count changed
      if (newlyPoppedInFrame > 0) {
        setPoppedCountUI(sim.poppedCount);
        setComboUI(sim.combo);
      }

      animFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      isRunning = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (fireworksTimerRef.current) {
        clearInterval(fireworksTimerRef.current);
        fireworksTimerRef.current = null;
      }
      if (haroldTimeoutRef.current) {
        clearTimeout(haroldTimeoutRef.current);
        haroldTimeoutRef.current = null;
      }
    };
  }, [launchSpecialFireworksSequence]);

  // Trigger ignition spark at (x, y)
  const triggerSparkAt = useCallback((targetX: number, targetY: number) => {
    const sim = simRef.current;
    if (sim.hasSparked || sim.gameState !== 'ready') return;

    sim.hasSparked = true;
    sim.gameState = 'active';
    setGameStateUI('active');

    // Check if user clicked directly on or near a live particle
    let clickedParticle: ReactorParticle | null = null;
    let minD = 26;

    for (const p of sim.particles) {
      if (!p.popped) {
        const d = Math.hypot(p.x - targetX, p.y - targetY);
        if (d < minD) {
          minD = d;
          clickedParticle = p;
        }
      }
    }

    let sparkX = targetX;
    let sparkY = targetY;
    let sparkColor = '#ec4899';
    let maxRadius = 52;
    let maxLife = 120;

    if (clickedParticle) {
      // Direct Orb Hit! Pop it immediately & trigger its native explosion
      clickedParticle.popped = true;
      sim.poppedCount += 1;
      sim.combo += 1;
      sparkX = clickedParticle.x;
      sparkY = clickedParticle.y;
      sparkColor = clickedParticle.color;
      maxRadius = clickedParticle.type === 'supernova' ? 80 : clickedParticle.type === 'multiplier' ? 65 : 50;
      maxLife = clickedParticle.type === 'supernova' ? 150 : clickedParticle.type === 'multiplier' ? 135 : 120;

      setPoppedCountUI(sim.poppedCount);
      setComboUI(sim.combo);
      sound.playReactorPop(1);

      if (sim.poppedCount >= sim.targetCount && !sim.hasTriggeredTargetSound) {
        sim.hasTriggeredTargetSound = true;
        sound.playTargetReached();
      }

      // Spawn Shards
      for (let s = 0; s < 8; s++) {
        const shardAngle = Math.random() * Math.PI * 2;
        const shardSpeed = 1.6 + Math.random() * 2.4;
        sim.shards.push({
          x: sparkX,
          y: sparkY,
          vx: Math.cos(shardAngle) * shardSpeed,
          vy: Math.sin(shardAngle) * shardSpeed,
          color: sparkColor,
          radius: 2.2 + Math.random() * 1.6,
          alpha: 1,
          decay: 0.022,
        });
      }
    } else {
      // Free grid spark
      sound.playClick(5, true);
    }

    // Spawn Initial Ignition Wave with balanced ~2.0s duration
    sim.explosions.push({
      id: Date.now(),
      x: sparkX,
      y: sparkY,
      radius: 8,
      maxRadius,
      color: sparkColor,
      type: 'normal',
      life: 0,
      maxLife,
    });
  }, []);

  // Mouse & Pointer handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * simRef.current.width;
    const y = ((e.clientY - rect.top) / rect.height) * simRef.current.height;

    triggerSparkAt(x, y);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * simRef.current.width;
    const y = ((e.clientY - rect.top) / rect.height) * simRef.current.height;

    simRef.current.mousePos = {
      x,
      y,
      isHovering: true,
      hoveredParticleId: simRef.current.mousePos.hoveredParticleId,
    };
  };

  const handlePointerLeave = () => {
    simRef.current.mousePos.isHovering = false;
  };

  const handleNextLevel = () => {
    if (currentLevelIdx < REACTOR_LEVELS.length - 1) {
      setCurrentLevelIdx((prev) => prev + 1);
    } else {
      setCurrentLevelIdx(0);
    }
  };

  const progressPercent = Math.min(100, Math.round((poppedCountUI / level.targetCount) * 100));

  return (
    <div className="relative flex flex-col h-full w-full select-none bg-[#090e1c] text-white p-3 sm:p-5 min-h-screen">
      {/* Top Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-slate-900/90 border-2 border-slate-800 p-3.5 sm:p-4 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 shadow-lg shadow-cyan-500/25 text-2xl">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-cyan-400">
                CASCADE SIMULATOR
              </span>
              <button
                onClick={() => setShowLevelSelect(true)}
                className="flex items-center gap-1 rounded-full bg-slate-800 hover:bg-slate-700 px-2.5 py-0.5 text-[10px] font-black text-slate-300 border border-slate-700 cursor-pointer transition-all"
              >
                <span>{level.title}</span>
                <ChevronRight className="h-3 w-3 text-cyan-400" />
              </button>
            </div>
            <h1 className="text-lg sm:text-2xl font-black italic tracking-tight text-white">
              CHAIN REACTOR
            </h1>
          </div>
        </div>

        {/* Quota Progress Tracker */}
        <div className="flex items-center gap-3 bg-slate-950/90 px-4 py-2 rounded-2xl border border-slate-800 shadow-inner">
          <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400 shrink-0" />
          <div>
            <div className="flex items-center justify-between gap-3 text-[10px] sm:text-xs font-bold text-slate-300">
              <span>TARGET QUOTA</span>
              <span className="text-yellow-400 font-black">
                {poppedCountUI} / {level.targetCount}
              </span>
            </div>
            <div className="mt-1 h-2 w-28 sm:w-44 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-200 ${
                  poppedCountUI >= level.targetCount
                    ? 'bg-emerald-400 shadow-emerald-400/50'
                    : 'bg-gradient-to-r from-cyan-400 to-pink-500'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => resetSimulation(currentLevelIdx)}
            className="flex items-center gap-1.5 rounded-2xl bg-slate-800 hover:bg-slate-700 px-3 py-2 text-xs font-black text-slate-200 border border-slate-700 transition-all active:scale-95 cursor-pointer shadow-md"
            title="Restart Sector"
          >
            <RotateCcw className="h-4 w-4 text-cyan-400" />
            <span className="hidden sm:inline">RESTART</span>
          </button>
          <button
            onClick={onToggleSound}
            className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-2xl bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer"
            title="Toggle Sound"
          >
            {soundSettings.soundEnabled ? (
              <Volume2 className="h-4 w-4 text-emerald-400" />
            ) : (
              <VolumeX className="h-4 w-4 text-slate-500" />
            )}
          </button>
        </div>
      </header>

      {/* Main Physics Arena Container */}
      <div
        ref={containerRef}
        className="relative mt-3 flex flex-1 flex-col items-center justify-center rounded-3xl border-2 border-slate-800 bg-[#070b14] p-2 sm:p-4 shadow-2xl overflow-hidden min-h-[460px]"
      >
        {/* Floating Sector Guidance / Call to action */}
        {gameStateUI === 'ready' && (
          <div className="pointer-events-none absolute top-4 z-20 flex items-center gap-2 rounded-full bg-cyan-950/80 px-4 sm:px-6 py-1.5 sm:py-2 border border-cyan-400/50 shadow-xl backdrop-blur-md animate-bounce">
            <Crosshair className="h-4 w-4 text-cyan-300 animate-spin" />
            <span className="text-xs sm:text-sm font-black text-cyan-200 tracking-wide">
              Click any floating orb or empty grid space to ignite chain reaction!
            </span>
          </div>
        )}

        {/* Live Active Cascade Stats HUD Bar */}
        {gameStateUI === 'active' && (
          <div className="pointer-events-none absolute top-4 z-20 flex items-center gap-4 rounded-2xl bg-slate-900/90 px-4 py-2 border border-slate-700 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-1.5 text-xs font-black text-pink-400">
              <Flame className="h-4 w-4 animate-pulse" />
              <span>CHAIN COMBO: {comboUI}</span>
            </div>
            <div className="h-3 w-px bg-slate-700" />
            <div className="text-xs font-bold text-slate-300">
              POPPED: <span className="font-black text-yellow-400">{poppedCountUI}</span> / {level.targetCount}
            </div>
          </div>
        )}

        {/* The Interactive Simulation Canvas */}
        <canvas
          ref={canvasRef}
          width={800}
          height={500}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          className="w-full max-w-4xl h-[420px] sm:h-[480px] rounded-2xl cursor-crosshair touch-none shadow-2xl bg-slate-950/50"
        />

        {/* Sector Clear / Win Modal */}
        <AnimatePresence>
          {gameStateUI === 'won' && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md"
            >
              <div
                className={`w-full max-w-md rounded-3xl border-2 p-6 sm:p-8 text-center shadow-2xl transition-all ${
                  isAllCapturedUI
                    ? 'border-amber-400 bg-gradient-to-b from-slate-900 via-[#1e1708] to-slate-900 shadow-[0_0_50px_rgba(251,191,36,0.35)]'
                    : 'border-emerald-500 bg-slate-900'
                }`}
              >
                {isAllCapturedUI ? (
                  <>
                    <div className="mb-3 inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-500/20 text-4xl text-amber-400 border-2 border-amber-400/50 shadow-[0_0_25px_rgba(251,191,36,0.45)] animate-bounce">
                      🎆
                    </div>

                    <div className="flex items-center justify-center gap-1.5 mb-1.5">
                      <Sparkles className="h-4 w-4 text-amber-400 animate-spin" />
                      <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-amber-300">
                        100% TOTAL CAPTURE (0 ORBS REMAINING)
                      </span>
                      <Sparkles className="h-4 w-4 text-amber-400 animate-spin" />
                    </div>

                    <h3 className="text-3xl sm:text-4xl font-black italic tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-100 drop-shadow-[0_2px_12px_rgba(234,179,8,0.65)]">
                      YOU DID OK
                    </h3>

                    <p className="text-xs sm:text-sm text-amber-200/90 mt-2 font-bold leading-snug">
                      Every single orb was captured in a flawless total cascade. Zero escaped!
                    </p>

                    <div className="my-4 flex justify-center gap-2 text-2xl text-amber-400 animate-pulse">
                      ★ ★ ★ ★ ★
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mb-3 inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500/20 text-4xl text-emerald-400 border-2 border-emerald-500/40 animate-bounce">
                      ⚡
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-black italic text-white">
                      SECTOR CLEARED!
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 mt-1.5 font-bold">
                      Popped <span className="text-emerald-400 font-black">{poppedCountUI}</span> particles! Target was {level.targetCount}.
                    </p>

                    <div className="my-5 flex justify-center gap-2 text-2xl text-yellow-400">
                      ★ ★ ★
                    </div>
                  </>
                )}

                <div className="flex flex-col gap-2.5">
                  <button
                    onClick={handleNextLevel}
                    className={`flex items-center justify-center gap-2 w-full rounded-2xl py-3.5 text-sm sm:text-base font-black text-white shadow-lg active:scale-95 transition-all cursor-pointer ${
                      isAllCapturedUI
                        ? 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 border-2 border-amber-300 shadow-amber-500/30'
                        : 'bg-emerald-600 hover:bg-emerald-500 border-2 border-emerald-400'
                    }`}
                  >
                    <span>NEXT SECTOR</span>
                    <ArrowRight className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => resetSimulation(currentLevelIdx)}
                    className="w-full rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-xs font-black text-slate-300 border border-slate-700 transition-all cursor-pointer"
                  >
                    REPLAY SECTOR
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Sector Failed Modal */}
          {gameStateUI === 'lost' && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md"
            >
              <div className="w-full max-w-md rounded-3xl bg-slate-900 border-2 border-red-500 p-6 sm:p-8 text-center shadow-2xl">
                <div className="mb-3 inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-red-500/20 text-4xl text-red-400 border-2 border-red-500/40">
                  💥
                </div>
                <h3 className="text-2xl sm:text-3xl font-black italic text-white">
                  CHAIN DISSIPATED
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-1.5 font-bold">
                  Popped <span className="text-red-400 font-black">{poppedCountUI}</span> / {level.targetCount} required.
                </p>

                <p className="text-xs text-slate-400 mt-2 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                  💡 Tip: Time your spark when particles converge in dense clusters to trigger a self-sustaining cascade!
                </p>

                <div className="mt-5">
                  <button
                    onClick={() => resetSimulation(currentLevelIdx)}
                    className="flex items-center justify-center gap-2 w-full rounded-2xl bg-red-600 hover:bg-red-500 border-2 border-red-400 py-3.5 text-sm sm:text-base font-black text-white shadow-lg active:scale-95 transition-all cursor-pointer"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>TRY AGAIN</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Harold 1-away Meme Overlay */}
          {showHarold && (
            <HaroldOverlay
              currentCount={poppedCountUI}
              targetCount={level.targetCount}
              unitLabel="orbs"
            />
          )}
        </AnimatePresence>
      </div>

      {/* Sector Selection Drawer */}
      {showLevelSelect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md">
          <div className="w-full max-w-xl rounded-3xl bg-slate-900 border-2 border-cyan-500 p-5 sm:p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-cyan-400" />
                <h2 className="text-lg font-black text-white">SELECT SECTOR</h2>
              </div>
              <button
                onClick={() => setShowLevelSelect(false)}
                className="h-8 w-8 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-black cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[60vh] overflow-y-auto pr-1">
              {REACTOR_LEVELS.map((lvl, idx) => (
                <button
                  key={lvl.id}
                  onClick={() => {
                    setCurrentLevelIdx(idx);
                    setShowLevelSelect(false);
                  }}
                  className={`flex flex-col p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                    currentLevelIdx === idx
                      ? 'bg-cyan-950/80 border-cyan-400 text-white shadow-lg'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-cyan-400">SECTOR {lvl.id}</span>
                    <span className="text-[10px] font-bold text-slate-400">
                      Goal: {lvl.targetCount}
                    </span>
                  </div>
                  <div className="text-sm font-black text-white mt-0.5">{lvl.title}</div>
                  <div className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                    {lvl.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
