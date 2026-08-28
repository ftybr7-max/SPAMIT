import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Music,
  RotateCcw,
  Volume2,
  VolumeX,
  Trophy,
  Play,
  ArrowRight,
  Sparkles,
  Zap
} from 'lucide-react';
import { ChromaNotePad, ChromaStageConfig, SoundSettings } from '../../types';
import { sound } from '../../utils/audio';

const PADS: ChromaNotePad[] = [
  { id: 0, label: 'RED', pitchName: 'C4', freq: 261.63, color: '#ef4444', glowColor: 'rgba(239, 68, 68, 0.8)' },
  { id: 1, label: 'BLUE', pitchName: 'D4', freq: 293.66, color: '#3b82f6', glowColor: 'rgba(59, 130, 246, 0.8)' },
  { id: 2, label: 'GREEN', pitchName: 'E4', freq: 329.63, color: '#10b981', glowColor: 'rgba(16, 185, 129, 0.8)' },
  { id: 3, label: 'YELLOW', pitchName: 'G4', freq: 392.00, color: '#eab308', glowColor: 'rgba(234, 179, 8, 0.8)' },
  { id: 4, label: 'PURPLE', pitchName: 'A4', freq: 440.00, color: '#a855f7', glowColor: 'rgba(168, 85, 247, 0.8)' },
  { id: 5, label: 'PINK', pitchName: 'C5', freq: 523.25, color: '#ec4899', glowColor: 'rgba(236, 72, 153, 0.8)' },
];

const CHROMA_STAGES: ChromaStageConfig[] = [
  { id: 1, title: 'Stage 1 — Echo Dawn', sequenceLength: 3, tempoMs: 650, notesCount: 4, timeLimitSec: 15 },
  { id: 2, title: 'Stage 2 — Pentatonic Flow', sequenceLength: 4, tempoMs: 600, notesCount: 4, timeLimitSec: 15 },
  { id: 3, title: 'Stage 3 — Neon Rhapsody', sequenceLength: 5, tempoMs: 550, notesCount: 5, timeLimitSec: 18 },
  { id: 4, title: 'Stage 4 — Synth Cascade', sequenceLength: 6, tempoMs: 500, notesCount: 5, timeLimitSec: 20 },
  { id: 5, title: 'Stage 5 — Melodic Tempest', sequenceLength: 7, tempoMs: 450, notesCount: 6, timeLimitSec: 22 },
  { id: 6, title: 'Stage 6 — Cosmic Symphony', sequenceLength: 8, tempoMs: 400, notesCount: 6, timeLimitSec: 25 },
];

interface ChromaMemoryGameProps {
  soundSettings: SoundSettings;
  onToggleSound: () => void;
}

export const ChromaMemoryGame: React.FC<ChromaMemoryGameProps> = ({
  soundSettings,
  onToggleSound,
}) => {
  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [sequence, setSequence] = useState<number[]>([]);
  const [playerInputIdx, setPlayerInputIdx] = useState(0);
  const [isPlayingSequence, setIsPlayingSequence] = useState(false);
  const [activePadLight, setActivePadLight] = useState<number | null>(null);
  const [gameState, setGameState] = useState<'idle' | 'showing' | 'player_turn' | 'won' | 'lost'>('idle');
  const [score, setScore] = useState(0);

  const stage = CHROMA_STAGES[currentStageIdx] || CHROMA_STAGES[0];
  const activePads = PADS.slice(0, stage.notesCount);

  // Generate sequence for current stage
  const startStage = (stageIdx: number) => {
    const stg = CHROMA_STAGES[stageIdx];
    const newSeq: number[] = [];
    for (let i = 0; i < stg.sequenceLength; i++) {
      newSeq.push(Math.floor(Math.random() * stg.notesCount));
    }
    setSequence(newSeq);
    setPlayerInputIdx(0);
    setGameState('showing');
    playSequence(newSeq, stg.tempoMs);
  };

  useEffect(() => {
    startStage(currentStageIdx);
  }, [currentStageIdx]);

  // Play Sequence animation & synth audio
  const playSequence = async (seq: number[], tempo: number) => {
    setIsPlayingSequence(true);
    setGameState('showing');

    for (let i = 0; i < seq.length; i++) {
      await new Promise((res) => setTimeout(res, tempo * 0.35));
      const padIdx = seq[i];
      const pad = PADS[padIdx];
      if (pad) {
        sound.playSynthNote(pad.freq, 0.35, 'triangle');
        setActivePadLight(padIdx);
      }
      await new Promise((res) => setTimeout(res, tempo * 0.65));
      setActivePadLight(null);
    }

    setIsPlayingSequence(false);
    setGameState('player_turn');
  };

  // Handle Player Pad Tap
  const handlePadTap = (padIdx: number) => {
    if (gameState !== 'player_turn' || isPlayingSequence) return;

    const pad = PADS[padIdx];
    if (pad) {
      sound.playSynthNote(pad.freq, 0.25, 'triangle');
    }
    setActivePadLight(padIdx);
    setTimeout(() => setActivePadLight(null), 180);

    // Verify correct input
    if (padIdx === sequence[playerInputIdx]) {
      const nextIdx = playerInputIdx + 1;
      setPlayerInputIdx(nextIdx);

      if (nextIdx === sequence.length) {
        // Stage completed!
        setGameState('won');
        setScore((prev) => prev + stage.sequenceLength * 100);
        sound.playWin();
      }
    } else {
      // Wrong note
      sound.playError();
      setGameState('lost');
    }
  };

  const handleNextStage = () => {
    if (currentStageIdx < CHROMA_STAGES.length - 1) {
      setCurrentStageIdx((prev) => prev + 1);
    } else {
      setCurrentStageIdx(0);
    }
  };

  return (
    <div className="relative flex flex-col h-full w-full select-none bg-[#0f172a] text-white p-3 sm:p-5 min-h-screen">
      {/* Top Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-slate-900 border-4 border-slate-800 p-4 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 shadow-lg shadow-pink-500/30 text-2xl">
            🎵
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-widest text-pink-400">
                MELODIC SYNTH
              </span>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-black text-slate-400 border border-slate-700">
                {stage.title}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black italic tracking-tight text-white">
              CHROMA SYMPHONY
            </h1>
          </div>
        </div>

        {/* Status Tracker */}
        <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-2xl border-2 border-slate-800 shadow-inner">
          <Trophy className="h-5 w-5 text-yellow-400" />
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">NOTES MATCHED</span>
            <div className="text-base font-black text-white">
              {playerInputIdx} / <span className="text-pink-400">{sequence.length}</span> (Score: {score})
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => startStage(currentStageIdx)}
            className="flex items-center gap-1.5 rounded-2xl bg-slate-800 hover:bg-slate-700 px-3.5 py-2 text-xs font-black text-slate-200 border border-slate-700 transition-all active:scale-95 cursor-pointer shadow-md"
          >
            <RotateCcw className="h-4 w-4" />
            <span>REPLAY</span>
          </button>
          <button
            onClick={onToggleSound}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer"
          >
            {soundSettings.soundEnabled ? (
              <Volume2 className="h-4 w-4 text-emerald-400" />
            ) : (
              <VolumeX className="h-4 w-4 text-slate-500" />
            )}
          </button>
        </div>
      </header>

      {/* Main Synthesizer Stage */}
      <div className="relative mt-3 flex flex-1 flex-col items-center justify-center rounded-3xl border-4 border-slate-800 bg-[#080d1a] p-6 shadow-2xl overflow-hidden min-h-[440px]">
        {/* Status Banner */}
        <div className="mb-6">
          <span
            className={`rounded-full px-6 py-2 text-xs font-black tracking-widest uppercase border-2 shadow-xl ${
              gameState === 'showing'
                ? 'bg-purple-950/80 text-purple-300 border-purple-500 animate-pulse'
                : gameState === 'player_turn'
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500'
                : 'bg-slate-900 text-slate-400 border-slate-700'
            }`}
          >
            {gameState === 'showing' ? '🎧 LISTEN & MEMORIZE MELODY...' : '👉 YOUR TURN! REPEAT THE SEQUENCE'}
          </span>
        </div>

        {/* Synthesizer Pads Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6 max-w-xl w-full">
          {activePads.map((pad) => {
            const isLit = activePadLight === pad.id;
            return (
              <motion.button
                key={pad.id}
                onClick={() => handlePadTap(pad.id)}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.94 }}
                className={`relative flex h-28 sm:h-36 flex-col items-center justify-center rounded-3xl border-4 text-white font-black transition-all cursor-pointer shadow-xl select-none ${
                  isLit ? 'ring-8 ring-white scale-105' : 'hover:brightness-110'
                }`}
                style={{
                  backgroundColor: pad.color,
                  borderColor: isLit ? '#ffffff' : `${pad.color}bb`,
                  boxShadow: isLit
                    ? `0 0 45px ${pad.glowColor}, inset 0 0 20px rgba(255,255,255,0.6)`
                    : `0 10px 0 0 rgba(0,0,0,0.4)`,
                }}
              >
                <span className="text-2xl sm:text-3xl font-black drop-shadow-md">{pad.pitchName}</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-white/80 mt-1">
                  {pad.label}
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* Stage Success / Failure Overlays */}
        <AnimatePresence>
          {gameState === 'won' && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md"
            >
              <div className="w-full max-w-md rounded-3xl bg-slate-900 border-4 border-purple-500 p-6 sm:p-8 text-center shadow-2xl">
                <div className="mb-3 inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-purple-500/20 text-4xl text-purple-400 border-2 border-purple-500/40 animate-bounce">
                  ✨
                </div>
                <h3 className="text-3xl font-black italic text-white">MELODY MASTERED!</h3>
                <p className="text-xs text-slate-400 mt-1 font-bold">
                  Sequence of {stage.sequenceLength} notes completed with perfection!
                </p>

                <div className="my-5 flex justify-center gap-2 text-2xl text-yellow-400">
                  ★ ★ ★
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleNextStage}
                    className="flex items-center justify-center gap-2 w-full rounded-2xl bg-pink-600 border-4 border-pink-400 py-3.5 text-base font-black text-white shadow-lg active:translate-y-1 transition-all cursor-pointer"
                  >
                    <span>NEXT STAGE</span>
                    <ArrowRight className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => startStage(currentStageIdx)}
                    className="w-full rounded-xl bg-slate-800 py-2.5 text-xs font-black text-slate-300 hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer"
                  >
                    REPLAY STAGE
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {gameState === 'lost' && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md"
            >
              <div className="w-full max-w-md rounded-3xl bg-slate-900 border-4 border-red-600 p-6 sm:p-8 text-center shadow-2xl">
                <div className="mb-3 inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-red-500/20 text-4xl text-red-400 border-2 border-red-500/40">
                  ❌
                </div>
                <h3 className="text-3xl font-black italic text-white">DISCORDANT NOTE</h3>
                <p className="text-xs text-slate-400 mt-1 font-bold">
                  The melody was broken. Listen and try again!
                </p>

                <div className="mt-6">
                  <button
                    onClick={() => startStage(currentStageIdx)}
                    className="w-full rounded-2xl bg-red-600 border-4 border-red-400 py-3.5 text-base font-black text-white shadow-lg active:translate-y-1 transition-all cursor-pointer"
                  >
                    RETRY STAGE
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
