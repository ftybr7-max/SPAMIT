import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Zap,
  Sparkles,
  Activity,
  Music,
  Trophy,
  Play,
  Share2,
  Calendar,
  HelpCircle,
  Volume2,
  VolumeX,
  Award,
  Flame,
  CheckCircle2,
  Copy,
  Check,
  X,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { ArcadeGameType, GameStats, SoundSettings } from '../types';
import { sound } from '../utils/audio';

interface ArcadeLandingHubProps {
  stats: GameStats;
  onSelectGame: (game: ArcadeGameType) => void;
  onOpenAchievements: () => void;
  soundSettings: SoundSettings;
  onToggleSound: () => void;
}

export const ArcadeLandingHub: React.FC<ArcadeLandingHubProps> = ({
  stats,
  onSelectGame,
  onOpenAchievements,
  soundSettings,
  onToggleSound,
}) => {
  const [hoveredGame, setHoveredGame] = useState<ArcadeGameType | null>(null);
  const [mascotPokeCount, setMascotPokeCount] = useState(0);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [hasCopiedShare, setHasCopiedShare] = useState(false);

  // Read secondary game stats from localStorage if available
  const [craftUnlockedCount, setCraftUnlockedCount] = useState<number>(4);
  const [reactorHighScore, setReactorHighScore] = useState<number>(0);
  const [chromaHighScore, setChromaHighScore] = useState<number>(0);

  useEffect(() => {
    try {
      const craftSaved = localStorage.getItem('ELEMENT_CRAFT_SAVE_V1');
      if (craftSaved) {
        const parsed = JSON.parse(craftSaved);
        if (Array.isArray(parsed)) setCraftUnlockedCount(parsed.length);
      }
    } catch {}

    try {
      const reactorSaved = localStorage.getItem('CHAIN_REACTOR_SAVE_V1');
      if (reactorSaved) {
        const parsed = JSON.parse(reactorSaved);
        if (parsed?.highScore) setReactorHighScore(parsed.highScore);
      }
    } catch {}

    try {
      const chromaSaved = localStorage.getItem('CHROMA_SYNTH_SAVE_V1');
      if (chromaSaved) {
        const parsed = JSON.parse(chromaSaved);
        if (parsed?.highScore) setChromaHighScore(parsed.highScore);
      }
    } catch {}
  }, []);

  // Today's date for daily challenge
  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const dailySeed = new Date().toISOString().slice(0, 10);
  const dailyTargetCPS = 9.5;
  const isDailyCompleted = stats.highestCPS >= dailyTargetCPS;

  // Mascot dynamic quotes
  const getMascotSpeech = () => {
    if (mascotPokeCount > 8) return "OWW! Stop spam-clicking me! Go click the big buttons below! 🥫💥";
    if (mascotPokeCount > 4) return "Hey! I'm Spammy, not a punchbag! 🤖⚡";
    if (hoveredGame === 'spam') return "SPAM: 20 grueling levels! Watch out for Grandma's 56k dial-up on Level 12! 🚀";
    if (hoveredGame === 'craft') return "ELEMENT CRAFT: 120+ recipes! Mix Fire + Earth to make Lava, then craft the Universe! 🧪";
    if (hoveredGame === 'reactor') return "CHAIN REACTOR: One precision click triggers an 80-particle neon fireworks cascade! 💥";
    if (hoveredGame === 'chroma') return "CHROMA SYNTH: Melodic synth memory! Can your ears keep up with 160 BPM? 🎵";
    return "WELCOME TO SPAM ARCADE! Pick any of the 4 games below to unleash chaos!";
  };

  const handleCopyShare = () => {
    const shareText = `🕹️ SPAM ARCADE (spamit.fun) STATS:\n⚡ Max CPS: ${stats.highestCPS.toFixed(1)}\n👆 Total Clicks: ${stats.totalClicksAllTime.toLocaleString()}\n🏆 Levels Cleared: ${Math.min(20, stats.unlockedLevelMax - 1)}/20\n🧪 Elements Discovered: ${craftUnlockedCount}/128\nCan you beat my speed?`;
    navigator.clipboard.writeText(shareText);
    setHasCopiedShare(true);
    sound.playComboMilestone();
    setTimeout(() => setHasCopiedShare(false), 2500);
  };

  const gamesList = [
    {
      id: 'spam' as ArcadeGameType,
      title: 'SPAM',
      tagline: 'The 20-Level Speed-Clicking Gauntlet',
      description: 'Tiny targets, Mario ? coin blocks, odd-shade spotting, inverted cursors, and the 3-phase Spam God.',
      badge: '20 Levels • Boss Fight',
      accentColor: '#ec4899',
      glowColor: 'rgba(236, 72, 153, 0.4)',
      bgGradient: 'from-pink-950/60 via-slate-900 to-black',
      icon: Zap,
      statsLabel: 'Best CPS',
      statsValue: `${stats.highestCPS.toFixed(1)} CPS`,
      secondaryLabel: 'Levels Cleared',
      secondaryValue: `${Math.min(20, Math.max(0, stats.unlockedLevelMax - 1))} / 20`,
    },
    {
      id: 'craft' as ArcadeGameType,
      title: 'ELEMENT CRAFT',
      tagline: '120+ Combos of Infinite Alchemy',
      description: 'Start with 4 primal elements. Drag, drop, and discover everything from Steam to Black Holes.',
      badge: '128 Elements • Sandbox',
      accentColor: '#a855f7',
      glowColor: 'rgba(168, 85, 247, 0.4)',
      bgGradient: 'from-purple-950/60 via-slate-900 to-black',
      icon: Sparkles,
      statsLabel: 'Discovered',
      statsValue: `${craftUnlockedCount} / 128`,
      secondaryLabel: 'Codex Progress',
      secondaryValue: `${Math.round((craftUnlockedCount / 128) * 100)}%`,
    },
    {
      id: 'reactor' as ArcadeGameType,
      title: 'CHAIN REACTOR',
      tagline: 'Kinetic Physics Cascade Puzzler',
      description: 'One single tap triggers neon nuclear chain reactions across 8 progressively chaotic sectors.',
      badge: '8 Sectors • Physics',
      accentColor: '#06b6d4',
      glowColor: 'rgba(6, 182, 212, 0.4)',
      bgGradient: 'from-cyan-950/60 via-slate-900 to-black',
      icon: Activity,
      statsLabel: 'High Score',
      statsValue: reactorHighScore > 0 ? `${reactorHighScore.toLocaleString()} pts` : 'Ready to Play',
      secondaryLabel: 'Cascade Mode',
      secondaryValue: '8 Sectors',
    },
    {
      id: 'chroma' as ArcadeGameType,
      title: 'CHROMA SYNTH',
      tagline: 'Melodic Memory Synthesizer',
      description: 'Synthesizer pads and rhythmic memory. Memorize evolving synth riffs and play them back on beat.',
      badge: '6 Stages • Synth Engine',
      accentColor: '#f43f5e',
      glowColor: 'rgba(244, 63, 94, 0.4)',
      bgGradient: 'from-rose-950/60 via-slate-900 to-black',
      icon: Music,
      statsLabel: 'Best Score',
      statsValue: chromaHighScore > 0 ? `${chromaHighScore.toLocaleString()} pts` : 'Ready to Play',
      secondaryLabel: 'Tempo Curve',
      secondaryValue: '6 Stages',
    },
  ];

  return (
    <div className="relative flex flex-col items-center w-full max-w-5xl mx-auto px-3 sm:px-4 py-2 sm:py-4 select-none">
      {/* RETRO 2000s POPUP TICKER MARQUEE */}
      <div className="w-full overflow-hidden rounded-xl bg-amber-500/10 border-2 border-amber-500/40 py-1.5 px-3 mb-3 shadow-md backdrop-blur-sm">
        <div className="flex items-center gap-3 text-xs font-black text-amber-300 animate-marquee whitespace-nowrap">
          <span>🔥 WIN 1,000,000 FREE CLICKS (CLICK TO CLAIM)</span>
          <span>•</span>
          <span>⚡ OVERCLOCK YOUR MOUSE TO 9000 CPS WITH THIS ONE WEIRD TRICK</span>
          <span>•</span>
          <span>🥫 100% ORGANIC CERTIFIED CANNED SPAM — 4 FULL GAMES LIVE</span>
          <span>•</span>
          <span>💾 DOWNLOAD MORE RAM: FREE 128MB 56K DIAL-UP BOOSTER</span>
          <span>•</span>
          <span>🏆 DAILY SPEEDRUN CHALLENGE IS LIVE NOW — TEST YOUR FINGERS</span>
        </div>
      </div>

      {/* TOP VANITY COUNTER & HEADER BAR */}
      <header className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-3xl bg-slate-900/90 border-2 border-slate-800 shadow-2xl backdrop-blur-md mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 text-2xl shadow-lg border-2 border-pink-300/50 animate-pulse">
            🥫
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black italic tracking-tighter text-white">
                SPAM ARCADE
              </h1>
              <span className="rounded-full bg-pink-500/20 px-2 py-0.5 text-[10px] font-black uppercase text-pink-400 border border-pink-500/40">
                4 GAMES LIVE
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              The high-velocity browser arcade platform
            </p>
          </div>
        </div>

        {/* SHARED TOTAL CLICKS VANITY COUNTER */}
        <div className="flex items-center gap-4">
          <div className="text-center sm:text-right px-4 py-1.5 rounded-2xl bg-slate-950 border border-slate-800 shadow-inner">
            <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400">
              GLOBAL LIFETIME CLICKS
            </span>
            <span className="text-lg sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-300 to-pink-400">
              {stats.totalClicksAllTime.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onOpenAchievements}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 transition-all cursor-pointer"
              title="View Achievements"
            >
              <Trophy className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowShareModal(true)}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 transition-all cursor-pointer"
              title="Share Stats"
            >
              <Share2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowHowToPlay(true)}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-pink-400 border border-slate-700 transition-all cursor-pointer"
              title="How to Play"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
            <button
              onClick={onToggleSound}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
              title="Toggle Audio"
            >
              {soundSettings.soundEnabled ? (
                <Volume2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <VolumeX className="h-4 w-4 text-rose-400" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* INTERACTIVE MASCOT "SPAMMY" DIALOGUE BOOTH */}
      <section className="w-full flex flex-col sm:flex-row items-center gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 border-2 border-purple-500/30 shadow-xl mb-4">
        <motion.div
          whileHover={{ scale: 1.1, rotate: 6 }}
          whileTap={{ scale: 0.9, rotate: -6 }}
          onClick={() => {
            setMascotPokeCount((prev) => prev + 1);
            sound.playFakeout();
          }}
          className="flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-600 text-3xl shadow-lg border-2 border-white/40 select-none active:scale-95"
          title="Click Spammy for sassy dialogue!"
        >
          🤖
        </motion.div>

        <div className="flex-1 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-pink-400">
              SPAMMY THE ARCADE BOT
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              (POKES: {mascotPokeCount})
            </span>
          </div>
          <p className="mt-0.5 text-xs sm:text-sm font-bold text-slate-200 leading-snug">
            "{getMascotSpeech()}"
          </p>
        </div>

        {/* DAILY CHALLENGE CHIP */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-950 border border-amber-500/40 shrink-0">
          <Calendar className="h-4 w-4 text-yellow-400" />
          <div className="text-left">
            <div className="text-[9px] font-black uppercase text-slate-400">{todayStr}</div>
            <div className="text-xs font-black text-amber-300">
              {isDailyCompleted ? '✅ Daily Goal Met!' : `Goal: ${dailyTargetCPS} CPS`}
            </div>
          </div>
        </div>
      </section>

      {/* 4 HERO GAME CABINET CARDS */}
      <section className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
        {gamesList.map((game) => {
          const Icon = game.icon;
          const isHovered = hoveredGame === game.id;

          return (
            <motion.div
              key={game.id}
              onMouseEnter={() => setHoveredGame(game.id)}
              onMouseLeave={() => setHoveredGame(null)}
              whileHover={{ y: -4, scale: 1.01 }}
              className={`relative flex flex-col justify-between rounded-3xl border-3 bg-gradient-to-b ${game.bgGradient} p-5 sm:p-6 shadow-2xl transition-all overflow-hidden cursor-pointer`}
              style={{
                borderColor: game.accentColor,
                boxShadow: isHovered
                  ? `0 0 35px -5px ${game.glowColor}`
                  : `0 10px 30px -10px rgba(0,0,0,0.8)`,
              }}
              onClick={() => {
                sound.playClick(2);
                onSelectGame(game.id);
              }}
            >
              {/* Subtle Ambient Radial Glow */}
              <div
                className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full opacity-30 blur-3xl transition-opacity duration-300"
                style={{ backgroundColor: game.accentColor }}
              />

              <div>
                {/* Top Badge & Icon */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-2xl border-2 text-white shadow-md"
                      style={{
                        backgroundColor: `${game.accentColor}33`,
                        borderColor: game.accentColor,
                      }}
                    >
                      <Icon className="h-5 w-5" style={{ color: game.accentColor }} />
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-black italic tracking-tight text-white">
                        {game.title}
                      </h2>
                    </div>
                  </div>

                  <span
                    className="rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white border"
                    style={{
                      backgroundColor: `${game.accentColor}44`,
                      borderColor: `${game.accentColor}88`,
                    }}
                  >
                    {game.badge}
                  </span>
                </div>

                {/* Subtitle & Tagline */}
                <div className="text-xs sm:text-sm font-black text-slate-200 mb-1">
                  {game.tagline}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                  {game.description}
                </p>
              </div>

              {/* LIVE STATS REFLECTION BANNER */}
              <div className="mt-2 pt-3 border-t border-slate-800/80">
                <div className="grid grid-cols-2 gap-2 mb-3 bg-slate-950/70 p-2.5 rounded-2xl border border-slate-800">
                  <div>
                    <span className="block text-[9px] font-bold uppercase text-slate-400">
                      {game.statsLabel}
                    </span>
                    <span
                      className="text-sm sm:text-base font-black"
                      style={{ color: game.accentColor }}
                    >
                      {game.statsValue}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold uppercase text-slate-400">
                      {game.secondaryLabel}
                    </span>
                    <span className="text-sm sm:text-base font-black text-slate-200">
                      {game.secondaryValue}
                    </span>
                  </div>
                </div>

                {/* PLAY BUTTON */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-black text-white shadow-xl cursor-pointer transition-all border-2 border-white/20"
                  style={{
                    backgroundColor: game.accentColor,
                    boxShadow: `0 6px 0 0 rgba(0,0,0,0.5)`,
                  }}
                >
                  <Play className="h-4 w-4 fill-white" />
                  <span>LAUNCH {game.title}</span>
                  <ChevronRight className="h-4 w-4" />
                </motion.button>
              </div>
            </motion.div>
          );
        })}
      </section>

      {/* SHARE CARD GENERATOR MODAL */}
      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md rounded-3xl bg-slate-900 border-2 border-cyan-500/80 p-6 shadow-2xl text-center"
            >
              <button
                onClick={() => setShowShareModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/20 text-3xl mb-3 border border-cyan-500/40">
                🏆
              </div>

              <h3 className="text-2xl font-black text-white italic tracking-tight">
                ARCADE SCORECARD
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Show off your clicking velocity and alchemy mastery!
              </p>

              {/* CARD PREVIEW */}
              <div className="my-5 p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left font-mono">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                  <span className="text-xs font-black text-pink-400">SPAMIT.FUN</span>
                  <span className="text-[10px] text-slate-400">{todayStr}</span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-200">
                  <div className="flex justify-between">
                    <span className="text-slate-400">⚡ PEAK CPS:</span>
                    <span className="font-bold text-cyan-400">{stats.highestCPS.toFixed(1)} CPS</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">👆 LIFETIME CLICKS:</span>
                    <span className="font-bold text-yellow-400">{stats.totalClicksAllTime.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">👑 LEVELS CONQUERED:</span>
                    <span className="font-bold text-pink-400">{Math.min(20, Math.max(0, stats.unlockedLevelMax - 1))}/20</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">🧪 ELEMENTS CRAFTED:</span>
                    <span className="font-bold text-purple-400">{craftUnlockedCount}/128</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCopyShare}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-sm font-black text-white shadow-lg active:scale-95 transition-all cursor-pointer"
                >
                  {hasCopiedShare ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  <span>{hasCopiedShare ? 'COPIED TO CLIPBOARD!' : 'COPY SCORECARD'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* THEMED RETRO ONBOARDING POPUP */}
      <AnimatePresence>
        {showHowToPlay && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-lg rounded-3xl bg-slate-900 border-4 border-pink-500 p-6 shadow-2xl text-left"
            >
              <div className="flex items-center justify-between border-b-2 border-pink-500/40 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🚨</span>
                  <h3 className="text-xl font-black text-white italic uppercase tracking-wider">
                    HOW TO PLAY THE ARCADE
                  </h3>
                </div>
                <button
                  onClick={() => setShowHowToPlay(false)}
                  className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-slate-300">
                <div className="p-3 rounded-xl bg-pink-950/40 border border-pink-500/40">
                  <span className="font-black text-pink-400 uppercase block mb-1">
                    1. SPAM (20 Levels Campaign)
                  </span>
                  Click the moving, morphing targets as fast as humanly possible before the clock expires. Watch for decoy buttons, ? blocks, odd shade tiles, and boss shields!
                </div>

                <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/40">
                  <span className="font-black text-purple-400 uppercase block mb-1">
                    2. ELEMENT CRAFT (120+ Recipes)
                  </span>
                  Drag elements onto the workbench and collide them together. Discover all 128 elements from Stone to Galaxies!
                </div>

                <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/40">
                  <span className="font-black text-cyan-400 uppercase block mb-1">
                    3. CHAIN REACTOR & CHROMA SYNTH
                  </span>
                  Ignite physics chain reactions with a single precision tap, or train your rhythmic ear by memorizing neon synthesizer sequences.
                </div>
              </div>

              <button
                onClick={() => setShowHowToPlay(false)}
                className="mt-5 w-full rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 py-3 text-center text-sm font-black text-white shadow-xl active:scale-95 transition-all cursor-pointer"
              >
                GOT IT, LET ME SPAM!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
