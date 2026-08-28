import React from 'react';
import { motion } from 'motion/react';

interface HaroldOverlayProps {
  currentCount: number;
  targetCount: number;
  unitLabel?: string;
}

export const HaroldOverlay: React.FC<HaroldOverlayProps> = ({
  currentCount,
  targetCount,
  unitLabel = 'orbs',
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.5, ease: 'easeOut' }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md pointer-events-none select-none"
    >
      <div className="relative flex flex-col items-center overflow-hidden rounded-3xl border-4 border-amber-500/70 bg-slate-900 p-4 sm:p-5 shadow-[0_0_60px_rgba(245,158,11,0.45)] max-w-xs sm:max-w-sm text-center">
        {/* Glow effect */}
        <div className="pointer-events-none absolute -top-16 left-1/2 h-36 w-36 -translate-x-1/2 rounded-full bg-amber-500/20 blur-2xl" />

        <div className="relative overflow-hidden rounded-2xl border-2 border-slate-700 shadow-2xl w-full bg-slate-950 flex items-center justify-center">
          <img
            src="/harold.jpeg"
            alt="Hide the Pain Harold"
            referrerPolicy="no-referrer"
            className="w-full h-auto object-cover max-h-[280px]"
          />
          <div className="absolute top-2.5 right-2.5 rounded-full bg-red-600/95 border border-white/50 px-3 py-1 text-[11px] font-black text-white uppercase tracking-widest shadow-lg">
            1 AWAY!
          </div>
        </div>

        <div className="mt-3">
          <h4 className="text-xl sm:text-2xl font-black italic text-amber-300 drop-shadow">
            {currentCount} / {targetCount} {unitLabel.toUpperCase()}
          </h4>
          <p className="text-xs font-bold text-slate-300 mt-0.5">
            So close...
          </p>
        </div>
      </div>
    </motion.div>
  );
};
