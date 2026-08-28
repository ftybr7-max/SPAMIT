import React from 'react';
import { X, Award, Zap, Flame, Trophy, CheckCircle2, RotateCcw } from 'lucide-react';
import { Achievement, GameStats } from '../types';

interface AchievementsModalProps {
  stats: GameStats;
  achievements: Achievement[];
  onClose: () => void;
  onResetProgress: () => void;
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({
  stats,
  achievements,
  onClose,
  onResetProgress,
}) => {
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md animate-fade-in select-none">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl bg-slate-900 border-4 border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-slate-800 p-4 sm:p-5 bg-[#0f172a]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-yellow-400/20 text-yellow-400 border-2 border-yellow-400/40 shadow-md">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-black italic text-white tracking-tight">ACHIEVEMENTS & STATS</h2>
              <p className="text-xs font-bold text-slate-400">
                Unlocked <span className="text-yellow-400 font-black">{unlockedCount}</span> of {achievements.length} Badges
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-all active:scale-95 border border-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Global Lifetime Stats Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 sm:p-5 bg-[#0f172a] border-b-2 border-slate-800">
          <div className="rounded-2xl bg-slate-900 p-3 border-2 border-slate-800 text-center shadow-inner">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">TOTAL SPAMS</span>
            <div className="text-xl font-black text-white">{stats.totalClicksAllTime.toLocaleString()}</div>
          </div>
          <div className="rounded-2xl bg-slate-900 p-3 border-2 border-slate-800 text-center shadow-inner">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">HIGHEST CPS</span>
            <div className="text-xl font-black text-blue-400">{stats.highestCPS.toFixed(1)}</div>
          </div>
          <div className="rounded-2xl bg-slate-900 p-3 border-2 border-slate-800 text-center shadow-inner">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">LEVELS BEAT</span>
            <div className="text-xl font-black text-emerald-400">{stats.totalLevelsCompleted}</div>
          </div>
          <div className="rounded-2xl bg-slate-900 p-3 border-2 border-slate-800 text-center shadow-inner">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">ENDLESS BEST</span>
            <div className="text-xl font-black text-pink-400">{stats.endlessHighScore}</div>
          </div>
        </div>

        {/* Achievement Badges List */}
        <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5 custom-scrollbar bg-slate-900">
          {achievements.map((ach) => (
            <div
              key={ach.id}
              className={`flex items-center justify-between rounded-2xl p-4 border-2 transition-all ${
                ach.unlocked
                  ? 'bg-[#0f172a] border-yellow-400/50 text-white shadow-md shadow-yellow-500/10'
                  : 'bg-slate-950/40 border-slate-800/40 text-slate-500 opacity-50'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl border-2 ${
                    ach.unlocked
                      ? 'bg-yellow-400/20 border-yellow-400/60 shadow-[0_0_12px_#facc15]'
                      : 'bg-slate-800 border-slate-700'
                  }`}
                >
                  {ach.icon}
                </div>
                <div>
                  <h4 className={`text-sm font-black ${ach.unlocked ? 'text-white' : 'text-slate-400'}`}>
                    {ach.title}
                  </h4>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">{ach.description}</p>
                </div>
              </div>

              <div>
                {ach.unlocked ? (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-black text-emerald-400 border-2 border-emerald-500/40 shadow-sm">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>UNLOCKED</span>
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-[11px] font-black text-slate-500 border border-slate-700">
                    LOCKED
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Reset option */}
        <div className="flex items-center justify-between border-t-2 border-slate-800 p-4 bg-[#0f172a]">
          <button
            onClick={() => {
              if (window.confirm('Reset all stats and level progression?')) {
                onResetProgress();
              }
            }}
            className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 font-black transition-all"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Progress</span>
          </button>

          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-5 py-2.5 text-xs font-black text-slate-300 hover:bg-slate-700 hover:text-white transition-all border border-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
