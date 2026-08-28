import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { LevelConfig } from '../types';
import { sound } from '../utils/audio';
import { Shield, Skull, AlertTriangle, Sparkles, Coins, Zap, Bomb, Crown, Flame, Hammer } from 'lucide-react';

interface MoleData {
  id: number;
  type: 'bot' | 'golden' | 'bomb';
  isActive: boolean;
  isHit: boolean;
  spawnTime: number;
  duration: number;
}

interface FloatingHit {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
}

interface LevelMechanicWrapperProps {
  level: LevelConfig;
  clicks: number;
  targetClicks: number;
  onButtonClick: (e: React.MouseEvent | React.TouchEvent, customCount?: number, isCrit?: boolean) => void;
  onPenalty: (seconds: number, msg: string) => void;
  arenaRef: React.RefObject<HTMLDivElement | null>;
  isGrandmaWaiting: boolean;
  onGrandmaReady: () => void;
}

interface BouncyCoin {
  id: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  vx: number;
  vy: number;
  rot: number;
  rotSpeed: number;
  scale: number;
}

interface OddPuzzle {
  baseColor: string;
  oddColor: string;
  oddIndex: number;
  totalTiles: number;
}

export const LevelMechanicWrapper: React.FC<LevelMechanicWrapperProps> = ({
  level,
  clicks,
  targetClicks,
  onButtonClick,
  onPenalty,
  arenaRef,
  isGrandmaWaiting,
  onGrandmaReady,
}) => {
  // Common button coordinates (percentage of arena)
  const [btnPos, setBtnPos] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [isDodging, setIsDodging] = useState(false);
  const [dodgeMessage, setDodgeMessage] = useState('DODGE!');
  const [activeSpamGridIndex, setActiveSpamGridIndex] = useState<number>(0);
  const [armyTargetIndex, setArmyTargetIndex] = useState<number>(12);
  const [grandmaProgress, setGrandmaProgress] = useState(0);
  const [popups, setPopups] = useState<Array<{ id: number; title: string; text: string; x: number; y: number; vx: number; vy: number }>>([]);
  const [rhythmBeatPhase, setRhythmBeatPhase] = useState<number>(0);
  const [gravityPos, setGravityPos] = useState({ x: 50, y: 30 });
  const [gravityVel, setGravityVel] = useState({ vx: 0.28, vy: 0 });
  const [bossPhase, setBossPhase] = useState<1 | 2 | 3>(1);
  const [fakeoutTriggered, setFakeoutTriggered] = useState(false);

  // Level 5: Decoy buttons with identical shape & randomized placement
  const [level5Buttons, setLevel5Buttons] = useState<
    Array<{
      id: number;
      label: string;
      subLabel: string;
      isReal: boolean;
      x: number;
      y: number;
      bgGradient: string;
      borderColor: string;
      shadowColor: string;
    }>
  >([]);

  // Level 17: Harmonic Chaos expanding spiral vortex
  const [spiralPos, setSpiralPos] = useState({ x: 50, y: 50 });
  const spiralAngleRef = useRef(0);

  // Smooth Roamer state (Level 14 & Level 8) - Calibrated to cross arena in 3-5 seconds (approx 0.24% per frame at 60fps)
  const [roamerPos, setRoamerPos] = useState({ x: 50, y: 50 });
  const [roamerVel, setRoamerVel] = useState({ vx: 0.25, vy: 0.2 });

  const onGrandmaReadyRef = useRef(onGrandmaReady);
  useEffect(() => {
    onGrandmaReadyRef.current = onGrandmaReady;
  }, [onGrandmaReady]);

  // Mario ? Block state (Level 7)
  const [isBlockBumping, setIsBlockBumping] = useState(false);
  const [coins, setCoins] = useState<BouncyCoin[]>([]);
  const coinIdCounter = useRef(0);

  // Odd One Out state (Level 10)
  const [oddPuzzle, setOddPuzzle] = useState<OddPuzzle>({
    baseColor: 'rgb(59, 130, 246)',
    oddColor: 'rgb(96, 165, 250)',
    oddIndex: 4,
    totalTiles: 9,
  });
  const [oddScore, setOddScore] = useState(0);
  const [isOddLocked, setIsOddLocked] = useState(false);

  // Inverted cursor tracker (Legacy)
  const [invertedPos, setInvertedPos] = useState<{ x: number; y: number }>({ x: 50, y: 50 });

  // Whack-A-Mole state (Level 9)
  const [moles, setMoles] = useState<MoleData[]>(() =>
    Array.from({ length: 9 }, (_, i) => ({
      id: i,
      type: 'bot',
      isActive: false,
      isHit: false,
      spawnTime: 0,
      duration: 1400,
    }))
  );
  const [floatingHits, setFloatingHits] = useState<FloatingHit[]>([]);
  const floatingHitIdCounter = useRef(0);

  // Rate limiter ref to strictly enforce: "No random changes in target shorter than 0.5 second"
  const lastTargetChangeTimeRef = useRef<number>(0);
  const lastDodgeTimeRef = useRef<number>(0);

  // Helper to generate Odd One Out color puzzles
  const generateOddPuzzle = (round: number) => {
    const totalTiles = round < 4 ? 9 : 16;
    const hue = Math.floor(Math.random() * 360);
    const sat = Math.floor(Math.random() * 20 + 70); // 70% - 90%
    const light = Math.floor(Math.random() * 15 + 42); // 42% - 57%

    // Delta is guaranteed visible on all screens: minimum 15% lightness delta
    const delta = Math.max(15, 22 - round * 0.7);
    const oddLight = light + (Math.random() > 0.5 ? delta : -delta);

    const baseColor = `hsl(${hue}, ${sat}%, ${light}%)`;
    const oddColor = `hsl(${hue}, ${sat}%, ${oddLight}%)`;
    const oddIndex = Math.floor(Math.random() * totalTiles);

    setOddPuzzle({
      baseColor,
      oddColor,
      oddIndex,
      totalTiles,
    });

    // 200ms input lockout after spawn so rapid taps or transitions cannot trigger accidental penalties
    setIsOddLocked(true);
    setTimeout(() => {
      setIsOddLocked(false);
    }, 200);
  };

  // Reset positions and state on level change
  useEffect(() => {
    setBossPhase(1);
    setFakeoutTriggered(false);
    setGravityPos({ x: 50, y: 30 });
    // Velocity calibrated so crossing the arena width (~60%) takes 3.5 to 4.5 seconds at 60 FPS
    setGravityVel({ vx: 0.26, vy: 0 });
    setRoamerPos({ x: 50, y: 50 });
    setRoamerVel({
      vx: (Math.random() > 0.5 ? 1 : -1) * 0.24,
      vy: (Math.random() > 0.5 ? 1 : -1) * 0.20,
    });
    setActiveSpamGridIndex(0);
    setArmyTargetIndex(12);
    setCoins([]);
    setOddScore(0);
    setBtnPos({ x: 50, y: 50 });
    lastTargetChangeTimeRef.current = performance.now();
    lastDodgeTimeRef.current = performance.now();

    if (level.mechanic === 'odd_one_out') {
      generateOddPuzzle(0);
    }

    // Whack-A-Mole initialization (Level 9)
    if (level.mechanic === 'whack_a_mole') {
      setMoles(
        Array.from({ length: 9 }, (_, i) => ({
          id: i,
          type: 'bot',
          isActive: false,
          isHit: false,
          spawnTime: 0,
          duration: 1400,
        }))
      );
      setFloatingHits([]);
    }

    // Grandma dial-up loading simulation
    if (level.mechanic === 'grandma_mode') {
      setGrandmaProgress(0);
      const interval = setInterval(() => {
        setGrandmaProgress((prev) => {
          if (prev >= 98) {
            clearInterval(interval);
            setTimeout(() => {
              onGrandmaReadyRef.current?.();
              sound.playFakeout();
            }, 500);
            return 100;
          }
          return prev + Math.floor(Math.random() * 16 + 12);
        });
      }, 350);
      return () => clearInterval(interval);
    }

    // Level 5: Fake Buttons initialization (5 positions randomized, real button not fixed in center)
    if (level.mechanic === 'fake_buttons') {
      const positions = [
        { x: 25, y: 28 },
        { x: 75, y: 28 },
        { x: 50, y: 50 },
        { x: 25, y: 72 },
        { x: 75, y: 72 },
      ];
      // Shuffle positions using Fisher-Yates
      for (let i = positions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = positions[i];
        positions[i] = positions[j];
        positions[j] = temp;
      }

      const buttonsData = [
        {
          id: 1,
          label: 'REAL ONE',
          subLabel: 'CLICK HERE',
          isReal: true,
          x: positions[0].x,
          y: positions[0].y,
          bgGradient: 'linear-gradient(135deg, #ec4899, #be185d)',
          borderColor: '#f472b6',
          shadowColor: 'rgba(157,23,77,1)',
        },
        {
          id: 2,
          label: 'WRONG TARGET',
          subLabel: 'DECOY TRAP',
          isReal: false,
          x: positions[1].x,
          y: positions[1].y,
          bgGradient: 'linear-gradient(135deg, #64748b, #334155)',
          borderColor: '#94a3b8',
          shadowColor: 'rgba(30,41,59,1)',
        },
        {
          id: 3,
          label: 'PENALTY',
          subLabel: 'DO NOT CLICK',
          isReal: false,
          x: positions[2].x,
          y: positions[2].y,
          bgGradient: 'linear-gradient(135deg, #ef4444, #991b1b)',
          borderColor: '#f87171',
          shadowColor: 'rgba(127,29,29,1)',
        },
        {
          id: 4,
          label: 'NOT THIS ONE',
          subLabel: 'FAKEOUT',
          isReal: false,
          x: positions[3].x,
          y: positions[3].y,
          bgGradient: 'linear-gradient(135deg, #8b5cf6, #5b21b6)',
          borderColor: '#c084fc',
          shadowColor: 'rgba(76,29,149,1)',
        },
        {
          id: 5,
          label: 'DECOY',
          subLabel: 'WRONG BUTTON',
          isReal: false,
          x: positions[4].x,
          y: positions[4].y,
          bgGradient: 'linear-gradient(135deg, #0d9488, #115e59)',
          borderColor: '#2dd4bf',
          shadowColor: 'rgba(19,78,74,1)',
        },
      ];
      setLevel5Buttons(buttonsData);
    }

    // Popup warnings for Level 13 (4 bouncing warnings)
    if (level.mechanic === 'dont_panic') {
      const msgs = [
        { id: 1, title: '⚠️ SYSTEM OVERLOAD', text: 'HIGH SPEED BUFFER ENGAGED', x: 38, y: 42, vx: 0.34, vy: 0.28 },
        { id: 2, title: '🚨 OVERSPAM ALERT', text: 'IGNORE ALL BUTTONS THREAT', x: 62, y: 44, vx: -0.30, vy: 0.33 },
        { id: 3, title: '💾 CACHE STATUS', text: 'RAPID CLICKS DETECTED', x: 44, y: 60, vx: 0.35, vy: -0.28 },
        { id: 4, title: '🛑 COOLDOWN READY', text: 'KEEP TAPPING IGNORE ALL', x: 56, y: 56, vx: -0.32, vy: -0.31 },
      ];
      setPopups(msgs);
    }
  }, [level.id, level.mechanic]);

  // Level 13: Bouncing warning popups physics loop (criss-crossing and overlapping the center button)
  useEffect(() => {
    if (level.mechanic !== 'dont_panic') return;
    let animId: number;

    const popupLoop = () => {
      setPopups((prev) =>
        prev.map((p) => {
          let nextX = p.x + p.vx;
          let nextY = p.y + p.vy;
          let nextVx = p.vx;
          let nextVy = p.vy;

          if (nextX <= 18) {
            nextX = 18;
            nextVx = Math.abs(nextVx);
          } else if (nextX >= 82) {
            nextX = 82;
            nextVx = -Math.abs(nextVx);
          }

          if (nextY <= 18) {
            nextY = 18;
            nextVy = Math.abs(nextVy);
          } else if (nextY >= 82) {
            nextY = 82;
            nextVy = -Math.abs(nextVy);
          }

          return { ...p, x: nextX, y: nextY, vx: nextVx, vy: nextVy };
        })
      );
      animId = requestAnimationFrame(popupLoop);
    };

    animId = requestAnimationFrame(popupLoop);
    return () => cancelAnimationFrame(animId);
  }, [level.mechanic]);

  // Level 17: Harmonic Chaos expanding spiral physics loop
  useEffect(() => {
    if (level.mechanic !== 'chaos') return;
    let animId: number;

    const spiralLoop = () => {
      spiralAngleRef.current += 0.035;
      const a = spiralAngleRef.current;
      // Spiral radius expands outwards from 8% up to 36% and contracts smoothly
      const radius = 22 + 15 * Math.sin(a * 0.45);
      const x = 50 + radius * Math.cos(a);
      const y = 50 + radius * 0.72 * Math.sin(a);
      setSpiralPos({ x, y });
      animId = requestAnimationFrame(spiralLoop);
    };

    animId = requestAnimationFrame(spiralLoop);
    return () => cancelAnimationFrame(animId);
  }, [level.mechanic]);

  // Smooth Roamer real-time flight loop (Level 14 & Level 8)
  // Calibrated: travels 60% distance in ~3.8 seconds (0.26% per frame at 60Hz)
  useEffect(() => {
    if (level.mechanic !== 'active_roamer' && level.mechanic !== 'betrayal') return;
    let animId: number;

    const roamerLoop = () => {
      setRoamerPos((prev) => {
        let newX = prev.x + roamerVel.vx;
        let newY = prev.y + roamerVel.vy;
        let newVx = roamerVel.vx;
        let newVy = roamerVel.vy;

        // Smoothly bounce off arena boundaries
        if (newX <= 20) {
          newX = 20;
          newVx = Math.abs(newVx);
        } else if (newX >= 80) {
          newX = 80;
          newVx = -Math.abs(newVx);
        }

        if (newY <= 24) {
          newY = 24;
          newVy = Math.abs(newVy);
        } else if (newY >= 76) {
          newY = 76;
          newVy = -Math.abs(newVy);
        }

        setRoamerVel({ vx: newVx, vy: newVy });
        return { x: newX, y: newY };
      });

      animId = requestAnimationFrame(roamerLoop);
    };

    animId = requestAnimationFrame(roamerLoop);
    return () => cancelAnimationFrame(animId);
  }, [level.mechanic, roamerVel]);

  // Mario Coins Bouncing & Physics Loop (Level 7)
  useEffect(() => {
    if (level.mechanic !== 'mario_block') return;
    if (coins.length === 0) return;

    let animId: number;
    const coinsPhysicsLoop = () => {
      setCoins((prevCoins) =>
        prevCoins.map((coin) => {
          let nextX = coin.x + coin.vx * 0.28;
          let nextY = coin.y + coin.vy * 0.28;
          let nextVx = coin.vx * 0.99;
          let nextVy = coin.vy + 0.12; // gentle gravity

          // Bounce floor
          if (nextY >= 82) {
            nextY = 82;
            nextVy = -Math.abs(nextVy) * 0.7;
          }
          // Bounce walls
          if (nextX <= 12) {
            nextX = 12;
            nextVx = Math.abs(nextVx) * 0.8;
          } else if (nextX >= 88) {
            nextX = 88;
            nextVx = -Math.abs(nextVx) * 0.8;
          }

          return {
            ...coin,
            x: nextX,
            y: nextY,
            vx: nextVx,
            vy: nextVy,
            rot: (coin.rot + coin.rotSpeed) % 360,
          };
        })
      );

      animId = requestAnimationFrame(coinsPhysicsLoop);
    };

    animId = requestAnimationFrame(coinsPhysicsLoop);
    return () => cancelAnimationFrame(animId);
  }, [level.mechanic, coins.length]);

  // Rhythm loop for Level 17
  useEffect(() => {
    if (level.mechanic !== 'rhythm') return;
    let animId: number;
    let start = performance.now();
    const bpm = 100;
    const beatInterval = 60000 / bpm;

    const loop = (now: number) => {
      const elapsed = now - start;
      const phase = (elapsed % beatInterval) / beatInterval;
      setRhythmBeatPhase(phase);
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [level.mechanic]);

  // Smooth Gravity bounce physics loop for Level 19 (takes 3.5s per cross)
  useEffect(() => {
    if (level.mechanic !== 'gravity') return;
    let animId: number;

    const physicsLoop = () => {
      setGravityPos((prev) => {
        let newX = prev.x + gravityVel.vx;
        let newY = prev.y + gravityVel.vy;
        let newVx = gravityVel.vx;
        let newVy = gravityVel.vy + 0.08; // smooth parabolic curve

        if (newX <= 18) {
          newX = 18;
          newVx = Math.abs(newVx);
        } else if (newX >= 82) {
          newX = 82;
          newVx = -Math.abs(newVx);
        }

        if (newY >= 80) {
          newY = 80;
          newVy = -3.2; // graceful bounce
        } else if (newY <= 18) {
          newY = 18;
          newVy = Math.abs(newVy);
        }

        setGravityVel({ vx: newVx, vy: newVy });
        return { x: newX, y: newY };
      });

      animId = requestAnimationFrame(physicsLoop);
    };

    animId = requestAnimationFrame(physicsLoop);
    return () => cancelAnimationFrame(animId);
  }, [level.mechanic, gravityVel]);

  // Betrayal 2.0 trap trigger
  useEffect(() => {
    if (level.mechanic === 'betrayal_2' && clicks === 4 && !fakeoutTriggered) {
      setFakeoutTriggered(true);
      sound.playFakeout();
    }
  }, [level.mechanic, clicks, fakeoutTriggered]);

  // Boss phase transitions
  useEffect(() => {
    if (level.mechanic === 'boss') {
      if (clicks >= 30) {
        if (bossPhase !== 3) {
          setBossPhase(3);
          sound.playFakeout();
        }
      } else if (clicks >= 15) {
        if (bossPhase !== 2) {
          setBossPhase(2);
          sound.playComboMilestone();
        }
      }
    }
  }, [level.mechanic, clicks, bossPhase]);

  // Whack-A-Mole spawn and expiry loop (Level 9)
  useEffect(() => {
    if (level.mechanic !== 'whack_a_mole') return;

    const interval = setInterval(() => {
      const now = performance.now();

      setMoles((prevMoles) => {
        // Expire timed-out or already hit moles
        const updated = prevMoles.map((mole) => {
          if (mole.isActive) {
            if (mole.isHit && now - mole.spawnTime > 240) {
              return { ...mole, isActive: false, isHit: false };
            }
            if (!mole.isHit && now - mole.spawnTime > mole.duration) {
              return { ...mole, isActive: false, isHit: false };
            }
          }
          return mole;
        });

        // Count active unhit moles
        const activeCount = updated.filter((m) => m.isActive && !m.isHit).length;

        // Maintain 2 to 3 active moles
        if (activeCount < 3) {
          const inactiveIndices = updated
            .map((m, idx) => (!m.isActive ? idx : -1))
            .filter((idx) => idx !== -1);

          if (inactiveIndices.length > 0) {
            const spawnCount = Math.min(inactiveIndices.length, 3 - activeCount);
            const shuffled = [...inactiveIndices].sort(() => Math.random() - 0.5);
            for (let i = 0; i < spawnCount; i++) {
              const targetIdx = shuffled[i];
              const roll = Math.random();
              let moleType: 'bot' | 'golden' | 'bomb' = 'bot';
              let duration = 1400 + Math.random() * 400;

              if (roll < 0.16) {
                moleType = 'golden';
                duration = 1150 + Math.random() * 300;
              } else if (roll < 0.32) {
                moleType = 'bomb';
                duration = 1500 + Math.random() * 400;
              }

              updated[targetIdx] = {
                id: targetIdx,
                type: moleType,
                isActive: true,
                isHit: false,
                spawnTime: now,
                duration,
              };
            }
          }
        }

        return updated;
      });
    }, 150);

    return () => clearInterval(interval);
  }, [level.mechanic]);

  // Floating Hit particle helper
  const triggerFloatingHit = (x: number, y: number, text: string, color: string) => {
    floatingHitIdCounter.current += 1;
    const id = floatingHitIdCounter.current;
    setFloatingHits((prev) => [...prev, { id, x, y, text, color }]);
    setTimeout(() => {
      setFloatingHits((prev) => prev.filter((item) => item.id !== id));
    }, 800);
  };

  // Whack-A-Mole Click Handler
  const handleMoleClick = (e: React.MouseEvent | React.TouchEvent, holeIdx: number) => {
    e.stopPropagation();
    const mole = moles[holeIdx];
    if (!mole || !mole.isActive || mole.isHit) {
      sound.playClick(0.6);
      return;
    }

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const hitX = 'clientX' in e ? (e as React.MouseEvent).clientX : rect.left + rect.width / 2;
    const hitY = 'clientY' in e ? (e as React.MouseEvent).clientY : rect.top + rect.height / 2;

    if (mole.type === 'bot') {
      onButtonClick(e, 1);
      sound.playPop();
      triggerFloatingHit(hitX, hitY, 'WHACK! +1', '#d946ef');
    } else if (mole.type === 'golden') {
      onButtonClick(e, 2, true);
      sound.playComboMilestone();
      triggerFloatingHit(hitX, hitY, '👑 +2 GOLDEN!', '#f59e0b');
    } else if (mole.type === 'bomb') {
      sound.playError();
      onPenalty(0.5, 'BOOM! Hazard Bomb! -0.5s');
      triggerFloatingHit(hitX, hitY, '💣 -0.5s BOOM!', '#ef4444');
    }

    // Mark as hit immediately
    setMoles((prev) =>
      prev.map((m, idx) => (idx === holeIdx ? { ...m, isHit: true, spawnTime: performance.now() } : m))
    );
  };
  const spawnMarioCoins = (count: number = 2) => {
    sound.playBlockBump();
    sound.playCoin();
    setIsBlockBumping(true);
    setTimeout(() => setIsBlockBumping(false), 140);

    const newCoins: BouncyCoin[] = [];
    for (let i = 0; i < count; i++) {
      coinIdCounter.current += 1;
      newCoins.push({
        id: `coin-${coinIdCounter.current}-${Date.now()}-${i}`,
        x: 50 + (Math.random() * 14 - 7),
        y: 40,
        vx: (Math.random() - 0.5) * 3.5,
        vy: -(Math.random() * 2.5 + 2.5),
        rot: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 12,
        scale: 1,
      });
    }

    setCoins((prev) => [...prev.slice(-10), ...newCoins]);
  };

  // Collect a coin from the arena
  const handleCoinClick = (e: React.MouseEvent, coinId: string) => {
    e.stopPropagation();
    sound.playCoin();
    setCoins((prev) => prev.filter((c) => c.id !== coinId));
    onButtonClick(e, 1, true);
  };

  // Handle Odd One Out Tile Click
  const handleOddTileClick = (e: React.MouseEvent | React.TouchEvent, idx: number) => {
    e.stopPropagation();
    if (isOddLocked) return; // Prevent miss clicks during puzzle generation

    if (idx === oddPuzzle.oddIndex) {
      sound.playOddCorrect();
      const nextScore = oddScore + 1;
      setOddScore(nextScore);
      onButtonClick(e, 1, true);
      generateOddPuzzle(nextScore);
    } else {
      sound.playError();
      onPenalty(0.3, 'WRONG SHADE! -0.3s');
    }
  };

  // Primary button click wrapper with strict rate limit
  const handlePrimaryClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    const now = performance.now();

    // Mario block logic
    if (level.mechanic === 'mario_block') {
      spawnMarioCoins(Math.random() > 0.4 ? 2 : 1);
      onButtonClick(e);
      return;
    }

    // Roulette & dynamic movement — moves every 3 clicks
    if (level.mechanic === 'roulette') {
      if ((clicks + 1) % 3 === 0) {
        lastTargetChangeTimeRef.current = now;
        const nextX = Math.floor(Math.random() * 56 + 22);
        const nextY = Math.floor(Math.random() * 50 + 25);
        setBtnPos({ x: nextX, y: nextY });
        sound.playWhoosh();
      }
    } else if (level.mechanic === 'faster') {
      // Shift smoothly max once per 500ms on clicks
      if (clicks % 3 === 0 && now - lastTargetChangeTimeRef.current >= 500) {
        lastTargetChangeTimeRef.current = now;
        const nextX = Math.floor(Math.random() * 54 + 23);
        const nextY = Math.floor(Math.random() * 46 + 27);
        setBtnPos({ x: nextX, y: nextY });
      }
    } else if (level.mechanic === 'active_roamer') {
      // Smoothly nudge velocity without sudden jumping
      sound.playWhoosh();
    } else if (level.mechanic === 'spam_grid') {
      if (now - lastTargetChangeTimeRef.current >= 600) {
        lastTargetChangeTimeRef.current = now;
        setActiveSpamGridIndex((prev) => (prev + 1) % 4);
      }
    } else if (level.mechanic === 'button_army') {
      // 1100ms dwell time for 25-button grid so humans can see, aim, and tap
      if (now - lastTargetChangeTimeRef.current >= 1100) {
        lastTargetChangeTimeRef.current = now;
        setArmyTargetIndex(Math.floor(Math.random() * 25));
        sound.playWhoosh();
      }
    } else if (level.mechanic === 'rhythm') {
      const isPerfect = rhythmBeatPhase < 0.22 || rhythmBeatPhase > 0.78;
      if (isPerfect) {
        sound.playRhythmHit(true);
        onButtonClick(e, 2, true);
        return;
      } else {
        sound.playRhythmHit(false);
        onPenalty(0.3, 'OFF BEAT! -0.3s');
        onButtonClick(e, 1, false);
        return;
      }
    }

    onButtonClick(e);
  };

  // Mouse hover avoidance for Level 8 (Smoothly glides, throttled to >=500ms)
  const handleBetrayalHover = () => {
    if (level.mechanic !== 'betrayal') return;
    const now = performance.now();
    if (isDodging || now - lastDodgeTimeRef.current < 500) return;

    lastDodgeTimeRef.current = now;
    setIsDodging(true);
    sound.playWhoosh();
    const trolls = ['DODGE!', 'SWERVE!', 'SMOOTH!', 'NICE TRY'];
    setDodgeMessage(trolls[Math.floor(Math.random() * trolls.length)]);

    // Smoothly redirect roamer velocity to the opposite quadrant
    setRoamerVel((prev) => ({
      vx: prev.vx > 0 ? -0.26 : 0.26,
      vy: prev.vy > 0 ? -0.22 : 0.22,
    }));

    setTimeout(() => {
      setIsDodging(false);
    }, 500);
  };

  // Reverse cursor tracker for Level 9
  const handleArenaMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!arenaRef.current) return;
    const rect = arenaRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * 100;
    const relY = ((e.clientY - rect.top) / rect.height) * 100;
    setInvertedPos({ x: 100 - relX, y: 100 - relY });
  };

  const getButtonText = () => {
    if (typeof level.buttonLabel === 'function') {
      return level.buttonLabel(clicks, targetClicks);
    }
    return level.buttonLabel || 'CLICK ME';
  };

  const getButtonSizeStyle = () => {
    if (level.mechanic === 'tiny') {
      return 'w-28 h-28 sm:w-32 sm:h-32 text-lg font-black border-[6px] sm:border-[8px]';
    }
    if (level.mechanic === 'faster') {
      return 'w-48 h-48 sm:w-56 sm:h-56 text-2xl sm:text-3xl font-black border-[8px] sm:border-[10px]';
    }
    if (level.mechanic === 'active_roamer' || level.mechanic === 'betrayal') {
      return 'w-44 h-44 sm:w-52 sm:h-52 text-2xl sm:text-3xl font-black border-[8px] sm:border-[10px]';
    }
    if (level.mechanic === 'rage_mode') {
      const scaleFactor = 1 + (clicks / Math.max(1, targetClicks)) * 0.9;
      return `w-52 h-52 sm:w-64 sm:h-64 text-2xl sm:text-3xl font-black border-[8px] sm:border-[10px] transform scale-[${scaleFactor}]`;
    }
    return 'w-56 h-56 sm:w-68 sm:h-68 text-3xl sm:text-4xl font-black border-[10px] sm:border-[12px]';
  };

  return (
    <div
      ref={arenaRef}
      onMouseMove={handleArenaMouseMove}
      className={`relative flex flex-1 w-full max-w-5xl items-center justify-center overflow-hidden rounded-3xl border-4 border-slate-800 bg-[#0f172a] p-4 sm:p-8 shadow-2xl backdrop-blur-sm select-none transition-all duration-300 min-h-[420px] sm:min-h-[500px] ${
        level.mechanic === 'chaos' ? 'animate-spin-slow' : ''
      }`}
      style={{
        boxShadow: `0 0 60px -10px ${level.accentColor || '#ec4899'}44`,
      }}
    >
      {/* Ambient Neon Glow Orbs */}
      <div className="pointer-events-none absolute top-10 left-10 w-36 h-36 bg-purple-500 rounded-full opacity-20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-10 right-10 w-64 h-64 bg-pink-500 rounded-full opacity-15 blur-[100px]" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600 rounded-full opacity-10 blur-[120px]" />

      {/* Grid Pattern */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#33415520_1px,transparent_1px),linear-gradient(to_bottom,#33415520_1px,transparent_1px)] bg-[size:3.5rem_3.5rem]" />

      {/* LEVEL 7: MARIO ? BLOCK & BOUNCING COIN RUSH */}
      {level.mechanic === 'mario_block' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-4">
          {/* Top Coin Counter Banner */}
          <div className="absolute top-4 z-30 flex items-center gap-2 rounded-2xl bg-amber-950/80 px-6 py-2 border-4 border-yellow-400 shadow-2xl backdrop-blur-md animate-bounce">
            <Coins className="h-6 w-6 text-yellow-300 fill-yellow-400 animate-spin" />
            <span className="text-sm sm:text-lg font-black tracking-widest text-yellow-300 uppercase">
              COINS: {clicks} / {targetClicks}
            </span>
          </div>

          {/* Flying & Bouncy Coins (Smooth physics) */}
          {coins.map((coin) => (
            <motion.div
              key={coin.id}
              onClick={(e) => handleCoinClick(e, coin.id)}
              whileHover={{ scale: 1.25 }}
              whileTap={{ scale: 0.8 }}
              className="absolute z-30 flex cursor-pointer items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 via-yellow-300 to-yellow-100 p-2 text-xl font-black text-amber-950 border-2 border-yellow-200 shadow-[0_0_18px_#facc15] hover:ring-4 hover:ring-white active:scale-90"
              style={{
                left: `${coin.x}%`,
                top: `${coin.y}%`,
                transform: `translate(-50%, -50%) rotate(${coin.rot}deg)`,
                width: '46px',
                height: '46px',
              }}
            >
              <div className="flex h-full w-full items-center justify-center rounded-full border border-amber-600/60 bg-yellow-400 font-mono text-base font-black shadow-inner">
                ★
              </div>
            </motion.div>
          ))}

          {/* Golden 3D Mario ? Mystery Block */}
          <div className="relative">
            <motion.button
              id="mario-question-block"
              onClick={handlePrimaryClick}
              animate={{
                y: isBlockBumping ? -24 : 0,
                scale: isBlockBumping ? 1.08 : 1,
              }}
              transition={{ type: 'spring', stiffness: 500, damping: 18 }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.95 }}
              className="relative flex h-52 w-52 sm:h-64 sm:w-64 cursor-pointer flex-col items-center justify-center rounded-3xl bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 p-4 text-white shadow-[0_18px_0_0_#b45309,0_35px_50px_rgba(0,0,0,0.7)] border-[10px] border-amber-300 active:translate-y-2 active:shadow-[0_8px_0_0_#b45309]"
            >
              {/* Corner Rivets */}
              <div className="absolute top-2.5 left-2.5 h-3.5 w-3.5 rounded-full bg-amber-900 shadow-inner border border-amber-300/60" />
              <div className="absolute top-2.5 right-2.5 h-3.5 w-3.5 rounded-full bg-amber-900 shadow-inner border border-amber-300/60" />
              <div className="absolute bottom-2.5 left-2.5 h-3.5 w-3.5 rounded-full bg-amber-900 shadow-inner border border-amber-300/60" />
              <div className="absolute bottom-2.5 right-2.5 h-3.5 w-3.5 rounded-full bg-amber-900 shadow-inner border border-amber-300/60" />

              <div className="relative z-10 flex flex-col items-center">
                <span className="font-mono text-7xl sm:text-8xl font-black text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] animate-pulse">
                  ?
                </span>
                <span className="mt-1 rounded-full bg-amber-950/80 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-yellow-300 border border-yellow-400/50">
                  SMASH FOR COINS!
                </span>
              </div>
            </motion.button>
          </div>
        </div>
      )}

      {/* LEVEL 10: SPOT & SPAM THE ODD ONE OUT COLOR SHADES */}
      {level.mechanic === 'odd_one_out' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-3 sm:p-4">
          <div className="mb-3 sm:mb-4 flex items-center gap-2 rounded-2xl bg-slate-900 px-5 sm:px-6 py-2 border-4 border-slate-700 text-center shadow-2xl">
            <Sparkles className="h-5 w-5 text-yellow-400 animate-spin" />
            <div>
              <div className="text-xs font-black uppercase tracking-widest text-pink-400">
                SPOT THE ODD SHADE TILE ({clicks}/{targetClicks})
              </div>
              <div className="text-xs sm:text-sm font-bold text-slate-300">
                One square is visibly different. Tap it!
              </div>
            </div>
          </div>

          <div
            className={`grid gap-2.5 sm:gap-4 ${
              oddPuzzle.totalTiles === 9 ? 'grid-cols-3' : 'grid-cols-4'
            }`}
          >
            {Array.from({ length: oddPuzzle.totalTiles }).map((_, idx) => {
              const isOdd = idx === oddPuzzle.oddIndex;
              const tileColor = isOdd ? oddPuzzle.oddColor : oddPuzzle.baseColor;
              return (
                <motion.button
                  key={idx}
                  onClick={(e) => handleOddTileClick(e, idx)}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    handleOddTileClick(e, idx);
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.93 }}
                  className={`rounded-2xl transition-all shadow-xl cursor-pointer border-4 border-white/30 active:border-white select-none touch-manipulation ${
                    oddPuzzle.totalTiles === 9
                      ? 'min-h-[58px] min-w-[58px] h-20 w-20 sm:h-28 sm:w-28'
                      : 'min-h-[50px] min-w-[50px] h-16 w-16 sm:h-22 sm:w-22'
                  }`}
                  style={{
                    backgroundColor: tileColor,
                    boxShadow: '0 8px 0 0 rgba(0,0,0,0.4)',
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* LEVEL 12: Grandma Dial-Up Pre-loader */}
      {level.mechanic === 'grandma_mode' && isGrandmaWaiting && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-md p-6">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border-4 border-amber-500/60 p-6 sm:p-8 text-center shadow-2xl">
            <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-500/20 text-4xl text-amber-400 border-2 border-amber-500/40 animate-bounce">
              👵
            </div>
            <h2 className="text-2xl font-black text-white italic tracking-tight">GRANDMA'S 56k DIAL-UP</h2>
            <p className="mt-1 text-xs text-slate-300 font-medium">
              Downloading high-speed clickable buttons... (14.4 kbps)
            </p>

            <div className="mt-5 h-7 w-full overflow-hidden rounded-xl bg-slate-950 border-2 border-slate-700 p-1">
              <div
                className="h-full rounded-lg bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 transition-all duration-300 shadow-[0_0_12px_rgba(245,158,11,0.6)]"
                style={{ width: `${grandmaProgress}%` }}
              />
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-slate-400 font-mono font-bold">
              <span>BUFF-ERR-ING...</span>
              <span className="text-amber-400 font-black">{grandmaProgress}%</span>
            </div>
          </div>
        </div>
      )}

      {/* LEVEL 9: CYBER WHACK-A-MOLE ARCADE GRID */}
      {level.mechanic === 'whack_a_mole' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-3 sm:p-4">
          {/* Header Banner */}
          <div className="mb-3 sm:mb-4 flex items-center gap-2.5 rounded-2xl bg-slate-900/90 px-5 sm:px-6 py-2 border-2 border-fuchsia-500/60 shadow-2xl backdrop-blur-md">
            <span className="text-xl animate-bounce">🔨</span>
            <div className="text-center sm:text-left">
              <div className="text-xs sm:text-sm font-black uppercase tracking-wider text-fuchsia-400">
                CYBER WHACK-A-MOLE ({clicks} / {targetClicks})
              </div>
              <div className="text-[11px] sm:text-xs font-bold text-slate-300">
                Whack Cyber Bots (+1) & Golden Moles (+2)! Avoid Hazard Bombs (💣)!
              </div>
            </div>
          </div>

          {/* 3x3 Cyber Pod Grid */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4 max-w-xs sm:max-w-md w-full justify-items-center">
            {moles.map((mole, idx) => {
              return (
                <div
                  key={idx}
                  onClick={(e) => handleMoleClick(e, idx)}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    handleMoleClick(e, idx);
                  }}
                  className="relative h-22 w-22 sm:h-28 sm:w-28 rounded-3xl bg-gradient-to-b from-slate-950 to-slate-900 border-4 border-slate-800 shadow-[inset_0_4px_12px_rgba(0,0,0,0.8),0_10px_20px_rgba(0,0,0,0.5)] overflow-hidden flex items-end justify-center cursor-pointer select-none touch-manipulation hover:border-fuchsia-500/50 active:scale-95 transition-all"
                >
                  {/* Cyber pod glowing hole rim */}
                  <div className="absolute bottom-1 w-18 sm:w-22 h-6 sm:h-7 rounded-full bg-slate-950/90 border-2 border-fuchsia-500/30 shadow-[inset_0_4px_8px_rgba(0,0,0,0.9)] z-10" />

                  {/* Hole Floor Shadows */}
                  <div className="pointer-events-none absolute bottom-0 w-full h-8 bg-gradient-to-t from-slate-950 to-transparent z-20" />

                  {/* Hole Indicator Lights */}
                  <div className="absolute top-2 left-2.5 h-1.5 w-1.5 rounded-full bg-fuchsia-400/40" />
                  <div className="absolute top-2 right-2.5 h-1.5 w-1.5 rounded-full bg-fuchsia-400/40" />

                  {/* Emerging Mole Character */}
                  <motion.div
                    initial={{ y: 70, scale: 0.8 }}
                    animate={{
                      y: mole.isActive ? (mole.isHit ? 45 : 0) : 70,
                      scale: mole.isHit ? 0.35 : mole.isActive ? 1 : 0.8,
                      opacity: mole.isActive ? (mole.isHit ? 0.4 : 1) : 0,
                    }}
                    transition={{
                      type: 'spring',
                      stiffness: 450,
                      damping: 22,
                    }}
                    className={`relative z-15 flex flex-col items-center justify-center mb-2.5 rounded-2xl p-2 transition-transform ${
                      mole.type === 'golden'
                        ? 'bg-gradient-to-t from-amber-600 via-amber-400 to-yellow-200 border-2 border-yellow-100 shadow-[0_0_20px_rgba(245,158,11,0.7)]'
                        : mole.type === 'bomb'
                        ? 'bg-gradient-to-t from-red-700 via-rose-600 to-red-500 border-2 border-red-300 shadow-[0_0_20px_rgba(239,68,68,0.8)] animate-pulse'
                        : 'bg-gradient-to-t from-purple-700 via-fuchsia-600 to-pink-400 border-2 border-pink-200 shadow-[0_0_16px_rgba(217,70,239,0.5)]'
                    } w-15 h-17 sm:w-18 sm:h-20`}
                  >
                    {/* Character Face / Emblems */}
                    {mole.type === 'golden' ? (
                      <>
                        <Crown className="h-4 w-4 sm:h-5 sm:w-5 text-amber-900 fill-yellow-300 drop-shadow-md animate-bounce" />
                        <span className="text-lg sm:text-2xl mt-0.5">🐹</span>
                        <span className="rounded-md bg-amber-950/80 px-1 py-0.5 text-[8px] font-black text-yellow-300 border border-yellow-400/60 mt-0.5 uppercase tracking-tight">
                          +2 GOLD!
                        </span>
                      </>
                    ) : mole.type === 'bomb' ? (
                      <>
                        <div className="flex items-center gap-0.5">
                          <Flame className="h-3.5 w-3.5 text-yellow-300 animate-pulse" />
                          <Bomb className="h-4 w-4 sm:h-5 sm:w-5 text-white drop-shadow-md" />
                        </div>
                        <span className="text-lg sm:text-2xl mt-0.5">💣</span>
                        <span className="rounded-md bg-red-950 px-1 py-0.5 text-[8px] font-black text-red-200 border border-red-400 mt-0.5 uppercase tracking-tight">
                          AVOID!
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-1">
                          <div className="h-1.5 w-1.5 rounded-full bg-cyan-300 animate-ping" />
                          <Zap className="h-3 w-3 text-cyan-200" />
                          <div className="h-1.5 w-1.5 rounded-full bg-cyan-300 animate-ping" />
                        </div>
                        <span className="text-lg sm:text-2xl mt-0.5">🤖</span>
                        <span className="rounded-md bg-purple-950/80 px-1.5 py-0.5 text-[8px] font-black text-pink-200 border border-pink-400/50 mt-0.5 uppercase tracking-tight">
                          +1 BOT
                        </span>
                      </>
                    )}
                  </motion.div>
                </div>
              );
            })}
          </div>

          {/* Floating Hits */}
          {floatingHits.map((hit) => (
            <div
              key={hit.id}
              className="pointer-events-none fixed z-50 animate-float-up text-xs sm:text-sm font-black px-2.5 py-1 rounded-xl bg-slate-900/90 border-2 shadow-2xl"
              style={{
                left: `${hit.x}px`,
                top: `${hit.y - 30}px`,
                borderColor: hit.color,
                color: hit.color,
                boxShadow: `0 0 16px ${hit.color}88`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {hit.text}
            </div>
          ))}
        </div>
      )}

      {/* LEVEL 13: System Warning Popups (Bouncing dynamically across center) */}
      {level.mechanic === 'dont_panic' && (
        <>
          {popups.map((popup) => (
            <div
              key={popup.id}
              className="absolute z-30 w-64 sm:w-72 rounded-3xl bg-red-950/95 border-4 border-red-500 p-4 shadow-[0_0_30px_rgba(239,68,68,0.6)] text-left backdrop-blur-md animate-bounce select-none pointer-events-auto"
              style={{
                left: `${popup.x}%`,
                top: `${popup.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div className="flex items-center gap-1.5 text-xs sm:text-sm font-black text-yellow-300">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-400 animate-pulse" />
                <span>{popup.title}</span>
              </div>
              <p className="mt-1.5 text-[11px] sm:text-xs font-bold text-white leading-snug">{popup.text}</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  sound.playError();
                  onPenalty(0.4, 'FAKE ALERT CLICKED! -0.4s');
                }}
                className="mt-3 w-full rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 py-1.5 text-xs font-black text-white hover:from-red-500 hover:to-rose-600 active:scale-95 border-2 border-white/40 shadow-lg cursor-pointer"
              >
                DISMISS WARNING
              </button>
            </div>
          ))}
        </>
      )}

      {/* LEVEL 16: Betrayal 2.0 Trap Banner */}
      {level.mechanic === 'betrayal_2' && fakeoutTriggered && (
        <div className="absolute top-6 z-30 animate-bounce rounded-full bg-red-600 px-8 py-3 text-center text-white shadow-2xl border-4 border-white">
          <span className="text-xl sm:text-2xl font-black tracking-widest uppercase">
            🚨 Bonus Challenge: +18 Clicks Added! 🚨
          </span>
        </div>
      )}

      {/* LEVEL 5: Shuffled 5 Buttons (Identical round shape & randomized positions) */}
      {level.mechanic === 'fake_buttons' && (
        <>
          {level5Buttons.map((btn) => (
            <div
              key={btn.id}
              className="absolute transition-all duration-300 select-none"
              style={{
                left: `${btn.x}%`,
                top: `${btn.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <motion.button
                onClick={(e) => {
                  if (btn.isReal) {
                    handlePrimaryClick(e);
                  } else {
                    e.stopPropagation();
                    sound.playError();
                    onPenalty(0.8, 'DECOY BUTTON! -0.8s');
                  }
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  if (btn.isReal) {
                    handlePrimaryClick(e);
                  } else {
                    e.stopPropagation();
                    sound.playError();
                    onPenalty(0.8, 'DECOY BUTTON! -0.8s');
                  }
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.94 }}
                className="group relative z-10 flex h-28 w-28 sm:h-36 sm:w-36 cursor-pointer flex-col items-center justify-center rounded-full text-white shadow-2xl active:translate-y-2 select-none touch-manipulation focus:outline-none"
                style={{
                  background: btn.bgGradient,
                  borderWidth: '6px',
                  borderColor: btn.borderColor,
                  boxShadow: `0 12px 0 0 ${btn.shadowColor}, 0 20px 30px rgba(0,0,0,0.5), inset 0 3px 6px rgba(255,255,255,0.4)`,
                }}
              >
                {/* 3D Highlight Arch */}
                <div className="pointer-events-none absolute inset-2.5 rounded-full border-t-2 border-white/40 bg-gradient-to-b from-white/20 to-transparent" />

                <span className="relative z-10 text-center text-xs sm:text-sm font-black tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] px-2">
                  {btn.label}
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold text-white/80 uppercase tracking-widest mt-0.5">
                  {btn.subLabel}
                </span>
              </motion.button>
            </div>
          ))}
        </>
      )}

      {/* LEVEL 15: Button Army (25 Grid) */}
      {level.mechanic === 'button_army' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-3 sm:p-4">
          <div className="mb-3 flex items-center gap-2 rounded-2xl bg-amber-950/80 px-5 py-1.5 border-2 border-yellow-400 text-xs font-black uppercase tracking-wider text-yellow-300 shadow-xl">
            <span>FOLLOW THE GOLD TARGET (1.1s Dwell)</span>
          </div>
          <div className="grid grid-cols-5 gap-2 sm:gap-3">
            {Array.from({ length: 25 }).map((_, idx) => {
              const isTarget = idx === armyTargetIndex;
              return (
                <button
                  key={idx}
                  onClick={(e) => {
                    if (isTarget) {
                      handlePrimaryClick(e);
                    } else {
                      sound.playError();
                      onPenalty(0.3, 'WRONG TARGET! -0.3s');
                    }
                  }}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    if (isTarget) {
                      handlePrimaryClick(e);
                    } else {
                      sound.playError();
                      onPenalty(0.3, 'WRONG TARGET! -0.3s');
                    }
                  }}
                  className={`min-h-[48px] min-w-[48px] h-12 w-12 sm:h-14 sm:w-14 rounded-2xl flex items-center justify-center text-sm font-black transition-all active:scale-90 select-none touch-manipulation border-2 ${
                    isTarget
                      ? 'bg-yellow-400 text-black border-4 border-black ring-4 ring-yellow-300 shadow-[0_0_25px_#facc15] scale-110'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {isTarget ? '🎯' : idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* LEVEL 17: Rhythm Beat Rings */}
      {level.mechanic === 'rhythm' && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div
            className="absolute rounded-full border-8 transition-all duration-75"
            style={{
              width: `${260 + rhythmBeatPhase * 160}px`,
              height: `${260 + rhythmBeatPhase * 160}px`,
              borderColor:
                rhythmBeatPhase < 0.22 || rhythmBeatPhase > 0.78
                  ? 'rgba(52, 211, 153, 1)'
                  : 'rgba(239, 68, 68, 0.4)',
              transform: 'scale(1)',
              boxShadow:
                rhythmBeatPhase < 0.22 || rhythmBeatPhase > 0.78
                  ? '0 0 40px rgba(52, 211, 153, 0.8)'
                  : 'none',
            }}
          />
          <div className="absolute -top-10 text-center">
            <span
              className={`rounded-full px-5 py-1.5 text-xs font-black tracking-widest border-2 shadow-xl ${
                rhythmBeatPhase < 0.22 || rhythmBeatPhase > 0.78
                  ? 'bg-emerald-500 text-slate-950 border-white animate-bounce'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {rhythmBeatPhase < 0.22 || rhythmBeatPhase > 0.78
                ? '⚡ PERFECT BEAT (+2) ⚡'
                : 'WAIT FOR PULSE...'}
            </span>
          </div>
        </div>
      )}

      {/* LEVEL 20: Final Boss Presentation */}
      {level.mechanic === 'boss' && (
        <div className="absolute top-4 left-0 right-0 z-20 flex flex-col items-center">
          <div className="flex items-center gap-2 rounded-2xl bg-red-950 px-5 py-2 border-4 border-red-500 shadow-2xl backdrop-blur-md">
            <Skull className="h-6 w-6 text-yellow-400 animate-spin" />
            <span className="text-xs sm:text-base font-black tracking-widest text-white uppercase">
              {bossPhase === 1
                ? 'PHASE 1: ENERGY SHIELD'
                : bossPhase === 2
                ? 'PHASE 2: CORE OVERLOAD'
                : 'PHASE 3: FINAL MELTDOWN'}
            </span>
          </div>

          <div className="mt-2.5 h-4 w-72 sm:w-96 rounded-full bg-slate-950 border-2 border-red-600 p-0.5 overflow-hidden shadow-lg">
            <div
              className="h-full rounded-full bg-gradient-to-r from-red-600 via-yellow-400 to-pink-500 transition-all duration-100 shadow-[0_0_15px_#ef4444]"
              style={{ width: `${((targetClicks - clicks) / targetClicks) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* THE PRIMARY BUTTON (SMOOTH ROAMING & FLOATING) */}
      {level.mechanic !== 'mario_block' &&
        level.mechanic !== 'odd_one_out' &&
        level.mechanic !== 'button_army' &&
        level.mechanic !== 'fake_buttons' &&
        level.mechanic !== 'whack_a_mole' && (
          <div
            className="transition-all duration-200 ease-out"
            style={{
              position: 'absolute',
              left:
                level.mechanic === 'gravity'
                  ? `${gravityPos.x}%`
                  : level.mechanic === 'active_roamer' || level.mechanic === 'betrayal'
                  ? `${roamerPos.x}%`
                  : level.mechanic === 'chaos'
                  ? `${spiralPos.x}%`
                  : `${btnPos.x}%`,
              top:
                level.mechanic === 'gravity'
                  ? `${gravityPos.y}%`
                  : level.mechanic === 'active_roamer' || level.mechanic === 'betrayal'
                  ? `${roamerPos.y}%`
                  : level.mechanic === 'chaos'
                  ? `${spiralPos.y}%`
                  : `${btnPos.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {/* Tilted Accent Badges */}
            <div className="pointer-events-none absolute -top-7 -right-7 sm:-top-9 sm:-right-9 z-30 bg-yellow-400 text-black font-black px-3 sm:px-4 py-1 rounded-xl text-xs sm:text-base rotate-12 shadow-2xl border-4 border-black animate-pulse">
              +1 CLICK!
            </div>

            <motion.button
              id="main-spam-button"
              onClick={handlePrimaryClick}
              onMouseEnter={handleBetrayalHover}
              whileHover={{ scale: 1.04 }}
              className={`group relative z-20 flex cursor-pointer items-center justify-center rounded-full text-white select-none focus:outline-none transition-all active:translate-y-3 ${getButtonSizeStyle()}`}
              style={{
                background:
                  level.mechanic === 'rage_mode'
                    ? `linear-gradient(135deg, #ef4444, #dc2626, #991b1b)`
                    : level.mechanic === 'boss'
                    ? bossPhase === 1
                      ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)'
                      : bossPhase === 2
                      ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                      : 'linear-gradient(135deg, #ef4444, #991b1b)'
                    : level.accentColor
                    ? `linear-gradient(135deg, ${level.accentColor}, #be185d)`
                    : 'linear-gradient(135deg, #db2777, #be185d)',
                borderColor:
                  level.mechanic === 'rage_mode'
                    ? '#fca5a5'
                    : level.mechanic === 'boss'
                    ? bossPhase === 1
                      ? '#93c5fd'
                      : bossPhase === 2
                      ? '#fde047'
                      : '#fca5a5'
                    : '#f472b6',
                boxShadow:
                  '0 16px 0 0 rgba(157,23,77,1), 0 30px 45px rgba(0,0,0,0.6), inset 0 3px 6px rgba(255,255,255,0.4)',
              }}
            >
              {/* Inner 3D Highlight Arch */}
              <div className="pointer-events-none absolute inset-3 rounded-full border-t-4 border-white/40 bg-gradient-to-b from-white/20 to-transparent" />

              {/* Boss Orbiting Shields in Phase 1 */}
              {level.mechanic === 'boss' && bossPhase === 1 && (
                <div className="pointer-events-none absolute inset-0 animate-spin">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-blue-400 p-2 shadow-lg shadow-blue-400/80 border-2 border-white">
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-blue-400 p-2 shadow-lg shadow-blue-400/80 border-2 border-white">
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                </div>
              )}

              {/* Button Content */}
              <div className="relative z-10 flex flex-col items-center justify-center px-4">
                <span className="text-center font-black tracking-tighter drop-shadow-[0_3px_10px_rgba(0,0,0,0.9)]">
                  {isDodging ? dodgeMessage : getButtonText()}
                </span>
                <span className="text-pink-200 font-bold uppercase tracking-widest text-[10px] sm:text-xs mt-1 drop-shadow">
                  {level.mechanic === 'active_roamer' ? 'SMOOTH GLIDE' : 'SPAM!'}
                </span>
              </div>
            </motion.button>
          </div>
        )}
    </div>
  );
};
