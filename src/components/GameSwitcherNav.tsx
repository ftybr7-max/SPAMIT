import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home, Zap, Sparkles, Activity, Music, RotateCcw, AlertTriangle } from 'lucide-react';
import { ArcadeGameType } from '../types';
import { sound } from '../utils/audio';

interface GameSwitcherNavProps {
  activeGame: ArcadeGameType;
  onSelectGame: (game: ArcadeGameType) => void;
  onResetData: () => void;
}

export const GameSwitcherNav: React.FC<GameSwitcherNavProps> = ({
  activeGame,
  onSelectGame,
  onResetData,
}) => {
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  const games: Array<{ id: ArcadeGameType; label: string; icon: any; color: string; badge?: string }> = [
    { id: 'hub', label: 'HUB', icon: Home, color: '#f59e0b', badge: 'Lobby' },
    { id: 'spam', label: 'SPAM', icon: Zap, color: '#ec4899', badge: '20 Levels' },
    { id: 'craft', label: 'ELEMENT CRAFT', icon: Sparkles, color: '#a855f7', badge: '120+ Combos' },
    { id: 'reactor', label: 'CHAIN REACTOR', icon: Activity, color: '#06b6d4', badge: '8 Sectors' },
    { id: 'chroma', label: 'CHROMA SYNTH', icon: Music, color: '#f43f5e', badge: '6 Stages' },
  ];

  return (
    <nav className="relative z-[60] w-full max-w-5xl flex items-center justify-between p-1.5 mb-2 rounded-2xl bg-slate-900/95 border-2 border-slate-800 shadow-2xl backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 flex-1">
        {games.map((game) => {
          const isActive = activeGame === game.id;
          const Icon = game.icon;
          return (
            <motion.button
              key={game.id}
              onClick={() => {
                onSelectGame(game.id);
                sound.playClick(1);
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-black transition-all cursor-pointer select-none ${
                isActive
                  ? 'bg-slate-950 text-white border-2 shadow-md'
                  : 'bg-slate-900/50 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border-2 border-transparent'
              }`}
              style={{
                borderColor: isActive ? game.color : 'transparent',
                boxShadow: isActive ? `0 0 16px -2px ${game.color}66` : 'none',
              }}
            >
              <Icon className="h-4 w-4 shrink-0" style={{ color: game.color }} />
              <span className="tracking-tight">{game.label}</span>
              {game.badge && (
                <span className="hidden lg:inline rounded-md bg-slate-800 px-1.5 py-0.5 text-[9px] font-bold text-slate-300">
                  {game.badge}
                </span>
              )}
            </motion.button>
          );
        })}

        {/* Reset Data Button on Top Level Menu */}
        <motion.button
          onClick={() => {
            sound.playClick(1);
            setShowConfirmReset(true);
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-black text-rose-400 hover:text-rose-200 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 transition-all cursor-pointer select-none ml-auto"
          title="Reset all saved arcade progress"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span className="tracking-tight">RESET DATA</span>
        </motion.button>
      </div>

      {/* Confirmation Modal for Reset Data */}
      <AnimatePresence>
        {showConfirmReset && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md select-none">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm rounded-3xl bg-slate-900 border-2 border-rose-500 p-6 text-center shadow-2xl overflow-hidden"
            >
              <div className="pointer-events-none absolute -top-20 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-rose-500/20 blur-3xl" />

              <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40">
                <AlertTriangle className="h-7 w-7" />
              </div>

              <h3 className="text-xl font-black italic text-white">
                RESET ALL PROGRESS?
              </h3>

              <p className="text-xs text-slate-300 mt-2 font-medium leading-relaxed">
                This will reset all SPAM levels, Element Craft recipes, high scores, and achievement stars back to the beginning.
              </p>

              <div className="mt-6 flex flex-col gap-2">
                <button
                  onClick={() => {
                    setShowConfirmReset(false);
                    onResetData();
                  }}
                  className="w-full rounded-2xl bg-rose-600 hover:bg-rose-500 border border-rose-400 py-3 text-sm font-black text-white shadow-lg active:scale-95 transition-all cursor-pointer"
                >
                  YES, RESET EVERYTHING
                </button>
                <button
                  onClick={() => setShowConfirmReset(false)}
                  className="w-full rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-xs font-bold text-slate-300 border border-slate-700 transition-all cursor-pointer"
                >
                  CANCEL
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </nav>
  );
};
