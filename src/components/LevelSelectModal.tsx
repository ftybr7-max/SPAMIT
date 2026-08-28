import React from 'react';
import { X, Star, Lock, Play, Flame, Trophy, Infinity as InfinityIcon } from 'lucide-react';
import { LevelConfig, GameStats } from '../types';
import { LEVELS } from '../data/levels';

interface LevelSelectModalProps {
  stats: GameStats;
  currentLevelId: number;
  onSelectLevel: (levelId: number) => void;
  onClose: () => void;
  onStartEndless: () => void;
}

export const LevelSelectModal: React.FC<LevelSelectModalProps> = ({
  stats,
  currentLevelId,
  onSelectLevel,
  onClose,
  onStartEndless,
}) => {
  const totalStars = Object.values(stats.levelStars).reduce((a: number, b: number) => a + b, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md animate-fade-in select-none">
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-3xl bg-slate-900 border-4 border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-slate-800 p-4 sm:p-5 bg-[#0f172a]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-400 border-2 border-blue-500/40 shadow-md">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-black italic text-white tracking-tight">SELECT LEVEL</h2>
              <div className="flex items-center gap-2 text-xs text-slate-400 font-bold">
                <span className="flex items-center gap-1 text-yellow-400 font-black">
                  <Star className="h-3.5 w-3.5 fill-yellow-400" />
                  {totalStars} / 60 Stars
                </span>
                <span>•</span>
                <span>Max: Level {stats.unlockedLevelMax}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onStartEndless}
              className="flex items-center gap-1.5 rounded-xl bg-purple-600 border-2 border-purple-400 px-3.5 py-2 text-xs font-black text-white shadow-md transition-all hover:scale-105 active:scale-95"
            >
              <InfinityIcon className="h-4 w-4" />
              <span className="hidden sm:inline">ENDLESS MODE</span>
            </button>

            <button
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-all active:scale-95 border border-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Level Grid */}
        <div className="grid flex-1 grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3.5 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-slate-900">
          {LEVELS.map((lvl) => {
            const isUnlocked = lvl.id <= stats.unlockedLevelMax;
            const stars = stats.levelStars[lvl.id] || 0;
            const isCurrent = lvl.id === currentLevelId;

            return (
              <button
                key={lvl.id}
                disabled={!isUnlocked}
                onClick={() => {
                  onSelectLevel(lvl.id);
                  onClose();
                }}
                className={`relative flex flex-col items-center justify-between rounded-2xl p-3 text-center transition-all border-2 ${
                  !isUnlocked
                    ? 'cursor-not-allowed bg-slate-950/40 border-slate-800/40 opacity-35'
                    : isCurrent
                    ? 'bg-blue-600/20 border-blue-400 text-white shadow-[0_0_20px_rgba(59,130,246,0.5)] hover:scale-105 active:scale-95'
                    : 'bg-[#0f172a] border-slate-800 text-slate-300 hover:border-pink-500/60 hover:scale-105 active:scale-95'
                }`}
              >
                {/* Level Tag */}
                <div className="flex w-full items-center justify-between text-[11px] font-black">
                  <span className="text-slate-400">#{lvl.id}</span>
                  {!isUnlocked ? (
                    <Lock className="h-3.5 w-3.5 text-slate-500" />
                  ) : (
                    <div className="flex items-center gap-0.5 text-yellow-400">
                      {[1, 2, 3].map((s) => (
                        <Star
                          key={s}
                          className={`h-3 w-3 ${s <= stars ? 'fill-yellow-400' : 'text-slate-700'}`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Level Title */}
                <div className="my-2 flex flex-col items-center">
                  <span className="text-xs font-black line-clamp-1 text-white">
                    {lvl.title.replace(/^Level \d+\s*—\s*/, '')}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold mt-0.5">
                    {lvl.targetClicks} clicks / {lvl.timeLimit}s
                  </span>
                </div>

                {/* Mechanic badge */}
                <div
                  className="w-full rounded-lg py-1 text-[9px] font-black uppercase tracking-wider truncate border border-white/10"
                  style={{
                    backgroundColor: isUnlocked ? `${lvl.accentColor}25` : '#1e293b',
                    color: isUnlocked ? lvl.accentColor : '#64748b',
                  }}
                >
                  {lvl.mechanic.replace('_', ' ')}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
