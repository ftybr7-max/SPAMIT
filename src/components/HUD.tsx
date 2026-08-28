import React from 'react';
import { Volume2, VolumeX, RotateCcw, Menu, Award, Zap, Flame, ShieldAlert } from 'lucide-react';
import { LevelConfig, SoundSettings } from '../types';

interface HUDProps {
  level: LevelConfig;
  clicks: number;
  targetClicks: number;
  timeLeft: number;
  maxTime: number;
  cps: number;
  combo: number;
  soundSettings: SoundSettings;
  onToggleSound: () => void;
  onRestart: () => void;
  onOpenMenu: () => void;
  onOpenAchievements: () => void;
  isGrandmaWaiting?: boolean;
}

export const HUD: React.FC<HUDProps> = ({
  level,
  clicks,
  targetClicks,
  timeLeft,
  maxTime,
  cps,
  combo,
  soundSettings,
  onToggleSound,
  onRestart,
  onOpenMenu,
  onOpenAchievements,
  isGrandmaWaiting = false,
}) => {
  const progressRatio = Math.min(clicks / Math.max(1, targetClicks), 1);
  const isUrgentTime = timeLeft <= 2.5 && !isGrandmaWaiting && timeLeft > 0;
  const isFlameCPS = cps >= 8.0;

  return (
    <header className="relative z-30 w-full select-none">
      {/* Top Vibrant Header Bar */}
      <div className="w-full bg-slate-800 border-b-4 sm:border-b-8 border-pink-600 px-4 sm:px-8 py-3 shadow-2xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          {/* Level Info */}
          <div className="flex items-center gap-3">
            <button
              id="hud-menu-btn"
              onClick={onOpenMenu}
              aria-label="Level Select Menu"
              className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-slate-700/80 text-pink-400 hover:text-white hover:bg-pink-600 transition-all active:scale-95 border-2 border-pink-500/40 shadow-lg"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex flex-col">
              <span className="text-pink-500 font-black text-[10px] sm:text-xs tracking-widest uppercase">
                Current Level
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-lg sm:text-2xl font-black italic text-white drop-shadow">
                  LEVEL {level.id}: {level.title.replace(/^Level \d+\s*—\s*/, '').toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex items-center gap-4 sm:gap-8">
            {/* Time Remaining Metric */}
            <div className="flex flex-col items-center">
              <span className="text-blue-400 font-black text-[10px] sm:text-xs tracking-widest uppercase">
                Time Remaining
              </span>
              <span
                className={`text-lg sm:text-3xl font-mono font-black ${
                  isUrgentTime
                    ? 'text-red-400 animate-ping'
                    : 'text-yellow-400 animate-pulse'
                }`}
              >
                {isGrandmaWaiting ? 'PAUSED' : `${Math.max(0, timeLeft).toFixed(2)}s`}
              </span>
            </div>

            {/* Clicks / Target Metric */}
            <div className="flex flex-col items-end">
              <span className="text-purple-400 font-black text-[10px] sm:text-xs tracking-widest uppercase">
                Clicks / Target
              </span>
              <div className="text-lg sm:text-3xl font-black text-white">
                {clicks} / <span className="text-pink-500">{targetClicks}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                id="hud-sound-btn"
                onClick={onToggleSound}
                aria-label="Toggle Sound"
                className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl transition-all active:scale-95 border-2 shadow-md ${
                  soundSettings.soundEnabled
                    ? 'bg-slate-700/80 text-emerald-400 border-emerald-500/40 hover:bg-slate-600'
                    : 'bg-slate-700/80 text-slate-400 border-slate-600 hover:bg-slate-600'
                }`}
              >
                {soundSettings.soundEnabled ? (
                  <Volume2 className="h-4 w-4 sm:h-5 sm:w-5" />
                ) : (
                  <VolumeX className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
              </button>

              <button
                id="hud-achievements-btn"
                onClick={onOpenAchievements}
                aria-label="View Achievements"
                className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-slate-700/80 text-amber-400 border-2 border-amber-500/40 transition-all hover:bg-slate-600 active:scale-95 shadow-md"
              >
                <Award className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>

              <button
                id="hud-restart-btn"
                onClick={onRestart}
                aria-label="Restart Level"
                title="Restart Level (R)"
                className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-slate-700/80 text-cyan-300 border-2 border-cyan-500/40 transition-all hover:bg-slate-600 hover:text-white active:scale-95 shadow-md"
              >
                <RotateCcw className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Vibrant Neon Glow Progress Bar */}
      <div className="w-full h-3 sm:h-4 bg-slate-700">
        <div
          className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 shadow-[0_0_20px_rgba(236,72,153,0.8)] transition-all duration-75"
          style={{ width: `${progressRatio * 100}%` }}
        />
      </div>
    </header>
  );
};

