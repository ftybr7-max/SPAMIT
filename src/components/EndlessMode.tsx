import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Volume2, VolumeX, RotateCcw, Flame, Zap, Trophy, Infinity as InfinityIcon } from 'lucide-react';
import { SoundSettings } from '../types';
import { sound } from '../utils/audio';

interface EndlessModeProps {
  highScore: number;
  onUpdateHighScore: (newScore: number) => void;
  onBackToMenu: () => void;
  soundSettings: SoundSettings;
  onToggleSound: () => void;
}

export const EndlessMode: React.FC<EndlessModeProps> = ({
  highScore,
  onUpdateHighScore,
  onBackToMenu,
  soundSettings,
  onToggleSound,
}) => {
  const [clicks, setClicks] = useState(0);
  const [timeLeft, setTimeLeft] = useState(4.5);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isGameOver, setIsGameOver] = useState(false);
  const [combo, setCombo] = useState(0);
  const [cps, setCps] = useState(0);
  const [btnPos, setBtnPos] = useState({ x: 50, y: 50 });
  const [modifier, setModifier] = useState<string>('Normal');

  const clickTimestamps = useRef<number[]>([]);
  const lastClickTimeRef = useRef<number>(Date.now());
  const lastMoveTimeRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);

  // Timer Countdown loop
  useEffect(() => {
    if (!isPlaying || isGameOver) return;

    const interval = 50; // ms
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - interval / 1000;
        if (next <= 0) {
          clearInterval(timer);
          setIsGameOver(true);
          setIsPlaying(false);
          sound.playGameOver();
          return 0;
        }
        return next;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isPlaying, isGameOver]);

  // CPS calculator
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      const now = Date.now();
      clickTimestamps.current = clickTimestamps.current.filter((t) => now - t <= 1000);
      setCps(clickTimestamps.current.length);
    }, 150);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Check and update high score
  useEffect(() => {
    if (clicks > highScore) {
      onUpdateHighScore(clicks);
    }
  }, [clicks, highScore, onUpdateHighScore]);

  // Click handler
  const handleClick = (e: React.MouseEvent) => {
    if (!isPlaying || isGameOver) return;
    e.stopPropagation();

    const now = Date.now();
    clickTimestamps.current.push(now);

    // Combo system
    if (now - lastClickTimeRef.current < 450) {
      setCombo((prev) => {
        const next = prev + 1;
        if (next % 10 === 0) sound.playComboMilestone();
        return next;
      });
    } else {
      setCombo(1);
    }
    lastClickTimeRef.current = now;

    sound.playClick(combo);

    // Add time bonus (diminishing return)
    const timeBonus = Math.max(0.04, 0.12 - clicks * 0.0008);
    setTimeLeft((prev) => Math.min(5.0, prev + timeBonus));

    setClicks((prev) => {
      const nextClicks = prev + 1;

      // Every 20 clicks, swap modifiers
      if (nextClicks % 20 === 0) {
        sound.playFakeout();
        const mods = ['Teleport', 'Roamer', 'Tiny', 'Chaos', 'Normal'];
        const chosen = mods[Math.floor(Math.random() * mods.length)];
        setModifier(chosen);
      }

      // Dynamically move button on clicks with fair >= 500ms intervals
      if ((modifier === 'Teleport' || modifier === 'Roamer' || nextClicks % 3 === 0) && now - lastMoveTimeRef.current >= 500) {
        lastMoveTimeRef.current = now;
        setBtnPos({
          x: Math.floor(Math.random() * 56 + 22),
          y: Math.floor(Math.random() * 46 + 27),
        });
      }

      return nextClicks;
    });
  };

  const restartEndless = () => {
    setClicks(0);
    setTimeLeft(4.5);
    setCombo(0);
    setIsGameOver(false);
    setIsPlaying(true);
    setModifier('Normal');
    setBtnPos({ x: 50, y: 50 });
  };

  return (
    <div className="relative flex flex-col h-full w-full items-center justify-between p-4 select-none bg-[#0f172a] min-h-screen">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute top-10 left-10 w-48 h-48 rounded-full bg-purple-500/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-10 right-10 w-64 h-64 rounded-full bg-pink-500/20 blur-[100px]" />

      {/* Top HUD */}
      <header className="w-full max-w-4xl flex items-center justify-between gap-4 p-4 bg-slate-900 rounded-3xl border-4 border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToMenu}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-all active:scale-95 border-2 border-slate-700 shadow-md"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-1.5 text-pink-400 font-black text-xs uppercase tracking-wider">
              <InfinityIcon className="h-4 w-4" />
              <span>ENDLESS MODE</span>
            </div>
            <h2 className="text-xl font-black italic text-white">Survive the Clock</h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleSound}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all border border-slate-700"
          >
            {soundSettings.soundEnabled ? (
              <Volume2 className="h-5 w-5 text-emerald-400" />
            ) : (
              <VolumeX className="h-5 w-5 text-slate-500" />
            )}
          </button>
          <button
            onClick={restartEndless}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all border border-slate-700"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="w-full max-w-4xl grid grid-cols-4 gap-2 sm:gap-4 my-3">
        <div className="rounded-2xl bg-slate-900 border-2 border-slate-800 p-3 text-center shadow-md">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">CLICKS</span>
          <div className="text-xl sm:text-3xl font-black text-white">{clicks}</div>
        </div>
        <div className="rounded-2xl bg-slate-900 border-2 border-slate-800 p-3 text-center shadow-md">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">TIME</span>
          <div className={`text-xl sm:text-3xl font-black ${timeLeft < 1.5 ? 'text-red-400 animate-pulse' : 'text-yellow-400'}`}>
            {timeLeft.toFixed(2)}s
          </div>
        </div>
        <div className="rounded-2xl bg-slate-900 border-2 border-slate-800 p-3 text-center shadow-md">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">CPS</span>
          <div className="text-xl sm:text-3xl font-black text-blue-400">{cps.toFixed(1)}</div>
        </div>
        <div className="rounded-2xl bg-slate-900 border-2 border-slate-800 p-3 text-center shadow-md">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">BEST</span>
          <div className="text-xl sm:text-3xl font-black text-pink-500">{Math.max(clicks, highScore)}</div>
        </div>
      </div>

      {/* Arena */}
      <div className={`relative flex flex-1 w-full max-w-4xl items-center justify-center overflow-hidden rounded-3xl border-4 border-slate-800 bg-[#0f172a] p-4 shadow-2xl backdrop-blur-sm min-h-[380px] sm:min-h-[440px] ${
        modifier === 'Chaos' ? 'animate-spin-slow' : ''
      }`}>
        <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-pink-500/20 px-4 py-1.5 text-xs font-black text-pink-300 border-2 border-pink-500/40 shadow-lg">
          MODIFIER: {modifier.toUpperCase()}
        </div>

        <motion.button
          onClick={handleClick}
          whileHover={{ scale: 1.05 }}
          className={`group relative z-20 flex cursor-pointer items-center justify-center rounded-full text-white font-black transition-all select-none active:translate-y-3 ${
            modifier === 'Tiny'
              ? 'w-24 h-24 text-base border-[6px] border-pink-400'
              : 'w-56 h-56 sm:w-68 sm:h-68 text-3xl sm:text-4xl border-[10px] sm:border-[12px] border-pink-400'
          }`}
          style={{
            position: 'absolute',
            left: `${btnPos.x}%`,
            top: `${btnPos.y}%`,
            transform: 'translate(-50%, -50%)',
            background: 'linear-gradient(135deg, #ec4899, #be185d)',
            boxShadow: '0 16px 0 0 rgba(157,23,77,1), 0 30px 45px rgba(0,0,0,0.6), inset 0 3px 6px rgba(255,255,255,0.4)',
          }}
        >
          <div className="pointer-events-none absolute inset-2 rounded-full border-t-4 border-white/40 bg-gradient-to-b from-white/20 to-transparent" />
          <div className="relative z-10 flex flex-col items-center">
            <span className="drop-shadow-[0_3px_10px_rgba(0,0,0,0.9)] tracking-tight">
              SPAM!
            </span>
            <span className="text-pink-200 text-[10px] uppercase font-bold tracking-widest mt-0.5">
              Keep Alive!
            </span>
          </div>
        </motion.button>
      </div>

      {/* Game Over Modal */}
      {isGameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border-4 border-purple-600 p-6 sm:p-8 text-center shadow-2xl">
            <h3 className="text-3xl font-black italic text-white">ENDLESS RUN OVER!</h3>
            <p className="text-xs text-slate-400 mt-1 font-bold">You ran out of time!</p>

            <div className="my-6 rounded-2xl bg-[#0f172a] p-4 border-2 border-slate-800 shadow-inner">
              <span className="text-xs font-black text-slate-400 uppercase tracking-wider">FINAL SCORE</span>
              <div className="text-4xl sm:text-5xl font-black text-white my-1">{clicks} CLICKS</div>
              {clicks >= highScore && clicks > 0 && (
                <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-yellow-400/20 px-3 py-1 text-xs font-black text-yellow-400 border border-yellow-400/40 animate-pulse">
                  🏆 NEW HIGH SCORE!
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={restartEndless}
                className="w-full rounded-2xl bg-pink-600 border-4 border-pink-400 py-4 text-lg font-black text-white shadow-[0_8px_0_0_rgba(157,23,77,1)] active:translate-y-2 transition-all"
              >
                PLAY AGAIN
              </button>
              <button
                onClick={onBackToMenu}
                className="w-full rounded-xl bg-slate-800 py-3 text-xs font-black text-slate-300 hover:bg-slate-700 border-2 border-slate-700 transition-all"
              >
                BACK TO CAMPAIGN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
