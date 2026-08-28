import React from 'react';
import { Star, RotateCcw, ArrowRight, Zap, Trophy, Award } from 'lucide-react';
import { LevelConfig } from '../types';

interface WinModalProps {
  level: LevelConfig;
  stars: number;
  timeTaken: number;
  avgCPS: number;
  maxCombo: number;
  onNextLevel: () => void;
  onReplay: () => void;
  isLastLevel: boolean;
  onOpenLevelSelect: () => void;
}

export const WinModal: React.FC<WinModalProps> = ({
  level,
  stars,
  timeTaken,
  avgCPS,
  maxCombo,
  onNextLevel,
  onReplay,
  isLastLevel,
  onOpenLevelSelect,
}) => {
  const getPraise = () => {
    if (stars === 3) return '🔥 ABSOLUTE FINGER GOD!';
    if (stars === 2) return '⚡ LIGHTNING SPEED!';
    return '👍 COMPLETED! (barely)';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 pt-16 sm:pt-20 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border-4 border-pink-500/80 p-6 sm:p-8 text-center shadow-2xl overflow-hidden">
        {/* Glow accent */}
        <div className="pointer-events-none absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-pink-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-blue-500/20 blur-3xl" />

        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-pink-500/20 px-4 py-1 text-xs font-black text-pink-400 border border-pink-500/40 uppercase tracking-widest">
          <span>LEVEL {level.id} CLEARED</span>
        </div>

        <h2 className="text-2xl sm:text-4xl font-black italic tracking-tight text-white drop-shadow-md">
          {getPraise()}
        </h2>

        {/* Stars */}
        <div className="my-6 flex items-center justify-center gap-4">
          {[1, 2, 3].map((starNum) => (
            <div
              key={starNum}
              className={`flex h-14 w-14 items-center justify-center rounded-2xl border-4 transition-all duration-300 ${
                starNum <= stars
                  ? 'bg-yellow-400/20 border-yellow-400 text-yellow-400 scale-110 shadow-[0_0_20px_#facc15]'
                  : 'bg-slate-950 border-slate-800 text-slate-700'
              }`}
            >
              <Star className={`h-8 w-8 ${starNum <= stars ? 'fill-yellow-400' : ''}`} />
            </div>
          ))}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 rounded-2xl bg-[#0f172a] border-2 border-slate-800 p-3.5 mb-6 shadow-inner">
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">TIME</span>
            <span className="text-lg font-black text-white">{timeTaken.toFixed(2)}s</span>
          </div>
          <div className="flex flex-col items-center border-x-2 border-slate-800">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">AVG CPS</span>
            <span className="text-lg font-black text-blue-400">{avgCPS.toFixed(1)}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">MAX COMBO</span>
            <span className="text-lg font-black text-pink-400">x{maxCombo}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          {!isLastLevel ? (
            <button
              id="win-next-level-btn"
              onClick={onNextLevel}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-pink-600 border-4 border-pink-400 py-4 text-lg font-black text-white shadow-[0_8px_0_0_rgba(157,23,77,1)] transition-all hover:scale-105 active:translate-y-2 active:shadow-none"
            >
              <span>NEXT LEVEL</span>
              <ArrowRight className="h-6 w-6" />
            </button>
          ) : (
            <button
              id="win-victory-btn"
              onClick={onOpenLevelSelect}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-yellow-400 border-4 border-black py-4 text-lg font-black text-black shadow-[0_8px_0_0_#000] transition-all hover:scale-105 active:translate-y-2 active:shadow-none"
            >
              <Trophy className="h-6 w-6" />
              <span>YOU BEAT THE GAME!</span>
            </button>
          )}

          <div className="flex gap-2.5">
            <button
              id="win-replay-btn"
              onClick={onReplay}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-800 py-3 text-xs font-black text-slate-300 transition-all hover:bg-slate-700 hover:text-white active:scale-95 border-2 border-slate-700 shadow-md"
            >
              <RotateCcw className="h-4 w-4" />
              <span>REPLAY (R)</span>
            </button>
            <button
              id="win-levels-btn"
              onClick={onOpenLevelSelect}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-800 py-3 text-xs font-black text-slate-300 transition-all hover:bg-slate-700 hover:text-white active:scale-95 border-2 border-slate-700 shadow-md"
            >
              <Award className="h-4 w-4" />
              <span>LEVEL SELECT</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
