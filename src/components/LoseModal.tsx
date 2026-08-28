import React from 'react';
import { RotateCcw, Award, Zap, AlertCircle } from 'lucide-react';
import { LevelConfig } from '../types';

interface LoseModalProps {
  level: LevelConfig;
  clicksDone: number;
  targetClicks: number;
  onRetry: () => void;
  onOpenLevelSelect: () => void;
}

const LOSS_QUOTES = [
  'Did your index finger fall asleep?',
  'Grandma clicks faster than that!',
  'Almost had it! (Well, not really)',
  'Try using TWO fingers!',
  'The button was simply superior.',
  'Your mouse requested a union break.',
  'Don’t blink next time!',
];

export const LoseModal: React.FC<LoseModalProps> = ({
  level,
  clicksDone,
  targetClicks,
  onRetry,
  onOpenLevelSelect,
}) => {
  const quote = LOSS_QUOTES[level.id % LOSS_QUOTES.length];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 pt-16 sm:pt-20 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border-4 border-red-600 p-6 sm:p-8 text-center shadow-2xl overflow-hidden">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-red-600/30 blur-3xl" />

        <div className="mb-3 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/20 text-red-400 border-2 border-red-500/40 animate-bounce">
          <AlertCircle className="h-9 w-9" />
        </div>

        <h2 className="text-3xl sm:text-4xl font-black italic text-white drop-shadow-md tracking-tight">
          OUT OF TIME!
        </h2>

        <p className="mt-2 text-sm italic text-red-300 font-bold">
          “{quote}”
        </p>

        {/* Progress Card */}
        <div className="my-6 rounded-2xl bg-[#0f172a] border-2 border-slate-800 p-4 shadow-inner">
          <div className="flex items-center justify-between text-xs font-black text-slate-400 uppercase tracking-wider">
            <span>PROGRESS</span>
            <span className="text-yellow-400">{clicksDone} / {targetClicks} clicks</span>
          </div>
          <div className="mt-2.5 h-4 w-full overflow-hidden rounded-full bg-slate-950 border-2 border-slate-800 p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-red-600 to-pink-500 shadow-[0_0_10px_#ef4444]"
              style={{ width: `${Math.min(100, (clicksDone / targetClicks) * 100)}%` }}
            />
          </div>
          <div className="mt-2 text-xs font-black text-slate-400">
            Needed <span className="text-red-400 font-black">{Math.max(1, targetClicks - clicksDone)}</span> more clicks!
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            id="lose-retry-btn"
            onClick={onRetry}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 border-4 border-red-400 py-4 text-lg font-black text-white shadow-[0_8px_0_0_rgba(153,27,27,1)] transition-all hover:scale-105 active:translate-y-2 active:shadow-none"
          >
            <RotateCcw className="h-6 w-6" />
            <span>TRY AGAIN (Space / Click)</span>
          </button>

          <button
            id="lose-level-select-btn"
            onClick={onOpenLevelSelect}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-800 py-3 text-xs font-black text-slate-300 transition-all hover:bg-slate-700 hover:text-white active:scale-95 border-2 border-slate-700 shadow-md"
          >
            <Award className="h-4 w-4" />
            <span>LEVEL SELECT</span>
          </button>
        </div>
      </div>
    </div>
  );
};
