import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { Play, Trophy, Infinity as InfinityIcon, Award, Volume2, VolumeX, RotateCcw, Sparkles, Zap, Flame, Compass } from 'lucide-react';
import { LevelConfig, GameStats, FloatingText, ParticleItem, SoundSettings, GameScreen, ArcadeGameType } from './types';
import { LEVELS } from './data/levels';
import { INITIAL_ACHIEVEMENTS } from './data/achievements';
import { sound } from './utils/audio';
import { HUD } from './components/HUD';
import { LevelMechanicWrapper } from './components/LevelMechanicWrapper';
import { ParticleCanvas } from './components/ParticleCanvas';
import { WinModal } from './components/WinModal';
import { LoseModal } from './components/LoseModal';
import { LevelSelectModal } from './components/LevelSelectModal';
import { AchievementsModal } from './components/AchievementsModal';
import { EndlessMode } from './components/EndlessMode';
import { GameSwitcherNav } from './components/GameSwitcherNav';
import { ArcadeLandingHub } from './components/ArcadeLandingHub';
import { ElementCraftGame } from './components/games/ElementCraftGame';
import { ChainReactorGame } from './components/games/ChainReactorGame';
import { ChromaMemoryGame } from './components/games/ChromaMemoryGame';
import { HaroldOverlay } from './components/HaroldOverlay';

const STORAGE_KEY = 'SPAM_GAME_SAVE_V1';

export default function App() {
  // Multi-game selection state (Defaults to the Arcade Landing Hub)
  const [activeGame, setActiveGame] = useState<ArcadeGameType>('hub');

  // Load initial saved stats from localStorage
  const [stats, setStats] = useState<GameStats>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return {
      totalClicksAllTime: 0,
      totalLevelsCompleted: 0,
      highestCPS: 0,
      fastestLevelWinMs: 999999,
      levelStars: {},
      levelBestTimes: {},
      unlockedLevelMax: 1,
      endlessHighScore: 0,
      achievementsUnlocked: [],
    };
  });

  const [soundSettings, setSoundSettings] = useState<SoundSettings>({
    soundEnabled: true,
    screenShakeEnabled: true,
    particlesEnabled: true,
  });

  // Game flow states for SPAM
  const [screen, setScreen] = useState<GameScreen>('title');
  const [currentLevelIndex, setCurrentLevelIndex] = useState<number>(0);
  const [clicks, setClicks] = useState<number>(0);
  const [targetClicks, setTargetClicks] = useState<number>(10);
  const [timeLeft, setTimeLeft] = useState<number>(10.0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isGrandmaWaiting, setIsGrandmaWaiting] = useState<boolean>(false);
  const [isScreenShaking, setIsScreenShaking] = useState<boolean>(false);
  const [showHarold, setShowHarold] = useState<boolean>(false);

  // Modals
  const [showLevelSelect, setShowLevelSelect] = useState<boolean>(false);
  const [showAchievements, setShowAchievements] = useState<boolean>(false);

  // Live metrics
  const [cps, setCps] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [maxComboThisLevel, setMaxComboThisLevel] = useState<number>(0);

  // Win stats storage
  const [winStats, setWinStats] = useState<{ stars: number; timeTaken: number; avgCPS: number }>({
    stars: 3,
    timeTaken: 0,
    avgCPS: 0,
  });

  // Particle & text animation refs
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const particlesRef = useRef<ParticleItem[]>([]);
  const clickTimestampsRef = useRef<number[]>([]);
  const lastClickTimeRef = useRef<number>(0);
  const levelStartTimeRef = useRef<number>(0);
  const timerIntervalRef = useRef<number | null>(null);
  const haroldTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clicksRef = useRef<number>(0);
  const targetClicksRef = useRef<number>(10);
  const arenaRef = useRef<HTMLDivElement | null>(null);

  clicksRef.current = clicks;
  targetClicksRef.current = targetClicks;

  const currentLevel = LEVELS[currentLevelIndex] || LEVELS[0];

  const [saveError, setSaveError] = useState<string | null>(null);

  // Save stats to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
      if (saveError) setSaveError(null);
    } catch (err) {
      setSaveError('Could not save progress to browser storage (storage full or disabled).');
    }
  }, [stats, saveError]);

  // Sync sound settings with audio engine
  useEffect(() => {
    sound.enabled = soundSettings.soundEnabled;
  }, [soundSettings.soundEnabled]);

  const toggleSound = () => {
    setSoundSettings((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled }));
  };

  // Achievements list with unlocked flag mapped from stats
  const achievements = INITIAL_ACHIEVEMENTS.map((a) => ({
    ...a,
    unlocked: stats.achievementsUnlocked.includes(a.id),
  }));

  // Unlock achievement helper
  const unlockAchievement = useCallback((achId: string) => {
    setStats((prev) => {
      if (prev.achievementsUnlocked.includes(achId)) return prev;
      sound.playComboMilestone();
      return {
        ...prev,
        achievementsUnlocked: [...prev.achievementsUnlocked, achId],
      };
    });
  }, []);

  // Check achievements against current stats
  const checkAchievements = useCallback(
    (newClicksAllTime: number, currentCPS: number, levelIdCompleted?: number) => {
      if (newClicksAllTime >= 1) unlockAchievement('first_click');
      if (newClicksAllTime >= 1000) unlockAchievement('total_1000');
      if (currentCPS >= 6.0) unlockAchievement('cps_bronze');
      if (currentCPS >= 8.5) unlockAchievement('cps_silver');
      if (currentCPS >= 11.0) unlockAchievement('speed_demon');
      if (currentCPS >= 14.0) unlockAchievement('godlike_cps');
      if (currentCPS >= 9.5) unlockAchievement('daily_champion');
      if (levelIdCompleted === 5) unlockAchievement('warm_up_complete');
      if (levelIdCompleted === 10) unlockAchievement('halfway_there');
      if (levelIdCompleted === 12) unlockAchievement('grandma_speed');
      if (levelIdCompleted === 16) unlockAchievement('troll_survivor');
      if (levelIdCompleted === 17) unlockAchievement('rhythm_master');
      if (levelIdCompleted === 20) unlockAchievement('spam_god_slayer');
    },
    [unlockAchievement],
  );

  // Reset all arcade progress data
  const handleResetAllData = useCallback(() => {
    const freshStats: GameStats = {
      totalClicksAllTime: 0,
      totalLevelsCompleted: 0,
      highestCPS: 0,
      fastestLevelWinMs: 999999,
      levelStars: {},
      levelBestTimes: {},
      unlockedLevelMax: 1,
      endlessHighScore: 0,
      achievementsUnlocked: [],
    };
    setStats(freshStats);
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('ELEMENT_CRAFT_SAVE_V1');
      localStorage.removeItem('CHAIN_REACTOR_SAVE_V1');
      localStorage.removeItem('CHROMA_SYNTH_SAVE_V1');
    } catch {}
    sound.playComboMilestone();
    if (haroldTimeoutRef.current) {
      clearTimeout(haroldTimeoutRef.current);
      haroldTimeoutRef.current = null;
    }
    setShowHarold(false);
    setScreen('title');
    setCurrentLevelIndex(0);
  }, []);

  // Initialize a level
  const startLevel = useCallback(
    (levelIndex: number) => {
      const lvl = LEVELS[levelIndex];
      if (!lvl) return;

      if (haroldTimeoutRef.current) {
        clearTimeout(haroldTimeoutRef.current);
        haroldTimeoutRef.current = null;
      }
      setShowHarold(false);

      setCurrentLevelIndex(levelIndex);
      setClicks(0);
      setTargetClicks(lvl.targetClicks);
      setTimeLeft(lvl.timeLimit);
      setCombo(0);
      setMaxComboThisLevel(0);
      clickTimestampsRef.current = [];
      levelStartTimeRef.current = performance.now();
      setIsGrandmaWaiting(lvl.mechanic === 'grandma_mode');
      setIsPlaying(lvl.mechanic !== 'grandma_mode');
      setScreen('playing');
      setFloatingTexts([]);
    },
    [],
  );

  // Restart current level
  const restartLevel = useCallback(() => {
    startLevel(currentLevelIndex);
  }, [currentLevelIndex, startLevel]);

  // Next level
  const handleNextLevel = useCallback(() => {
    if (currentLevelIndex < LEVELS.length - 1) {
      startLevel(currentLevelIndex + 1);
    } else {
      setScreen('all_won');
    }
  }, [currentLevelIndex, startLevel]);

  // Penalty handler
  const handlePenalty = useCallback((secondsDeduct: number, message: string) => {
    setTimeLeft((prev) => Math.max(0.1, prev - secondsDeduct));

    const id = Math.random().toString();
    setFloatingTexts((prev) => [
      ...prev.slice(-12),
      {
        id,
        text: `-${secondsDeduct}s ${message}`,
        x: window.innerWidth / 2,
        y: window.innerHeight / 2 - 40,
        color: '#ef4444',
        scale: 1.2,
      },
    ]);
    setTimeout(() => {
      setFloatingTexts((prev) => prev.filter((t) => t.id !== id));
    }, 700);
  }, []);

  // Grandma Ready callback
  const handleGrandmaReady = useCallback(() => {
    setIsGrandmaWaiting(false);
    setIsPlaying(true);
    levelStartTimeRef.current = performance.now();
  }, []);

  // Clean up Harold timeout on component unmount
  useEffect(() => {
    return () => {
      if (haroldTimeoutRef.current) {
        clearTimeout(haroldTimeoutRef.current);
        haroldTimeoutRef.current = null;
      }
    };
  }, []);

  // Timer Tick Loop
  useEffect(() => {
    if (activeGame !== 'spam' || !isPlaying || screen !== 'playing' || isGrandmaWaiting) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      return;
    }

    const intervalMs = 40;
    timerIntervalRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        const nextTime = prev - intervalMs / 1000;

        if (nextTime <= 3.0 && nextTime > 0 && Math.floor(nextTime * 10) % 5 === 0) {
          sound.playTick(nextTime <= 1.5);
        }

        if (nextTime <= 0) {
          clearInterval(timerIntervalRef.current!);
          setIsPlaying(false);
          // Check if exactly 1 click short of goal (e.g. 26/27)
          if (clicksRef.current === targetClicksRef.current - 1) {
            setShowHarold(true);
            if (haroldTimeoutRef.current) {
              clearTimeout(haroldTimeoutRef.current);
            }
            haroldTimeoutRef.current = setTimeout(() => {
              setShowHarold(false);
              setScreen('game_over');
              sound.playGameOver();
            }, 1500);
          } else {
            setShowHarold(false);
            setScreen('game_over');
            sound.playGameOver();
          }
          return 0;
        }
        return nextTime;
      });
    }, intervalMs);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [activeGame, isPlaying, screen, isGrandmaWaiting]);

  // Live CPS calculator loop
  useEffect(() => {
    if (activeGame !== 'spam' || !isPlaying) return;
    const interval = setInterval(() => {
      const now = performance.now();
      clickTimestampsRef.current = clickTimestampsRef.current.filter((t) => now - t <= 1000);
      const curCPS = clickTimestampsRef.current.length;
      setCps(curCPS);

      if (curCPS > stats.highestCPS) {
        setStats((prev) => ({ ...prev, highestCPS: curCPS }));
      }
    }, 100);

    return () => clearInterval(interval);
  }, [activeGame, isPlaying, stats.highestCPS]);

  // Click burst & sound juice
  const triggerJuice = (e: React.MouseEvent | React.TouchEvent, isCrit: boolean = false) => {
    if (soundSettings.screenShakeEnabled) {
      setIsScreenShaking(true);
      setTimeout(() => setIsScreenShaking(false), 120);
    }

    let clientX = window.innerWidth / 2;
    let clientY = window.innerHeight / 2;
    if ('clientX' in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else if (e.touches && e.touches[0]) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    }

    if (soundSettings.particlesEnabled) {
      const colors = ['#60a5fa', '#38bdf8', '#f43f5e', '#fbbf24', '#34d399', '#c084fc'];
      const numSparks = isCrit ? 24 : 12;
      for (let i = 0; i < numSparks; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 7 + 3;
        particlesRef.current.push({
          x: clientX,
          y: clientY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          size: Math.random() * 4 + 2,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: 1,
          life: 0,
          maxLife: Math.floor(Math.random() * 20 + 20),
          shape: Math.random() > 0.6 ? 'spark' : 'circle',
        });
      }
    }

    const textOptions = isCrit
      ? ['+2 CRIT! ⚡', 'PERFECT! 🎯', 'SUPER! 🔥']
      : ['+1', '+1!', 'TAP!', 'SPAM!'];
    const chosenText = textOptions[Math.floor(Math.random() * textOptions.length)];
    const textId = Math.random().toString();

    setFloatingTexts((prev) => [
      ...prev.slice(-15),
      {
        id: textId,
        text: chosenText,
        x: clientX + (Math.random() * 40 - 20),
        y: clientY - 20,
        color: isCrit ? '#34d399' : '#38bdf8',
        scale: isCrit ? 1.3 : 1.0,
        rotation: Math.random() * 20 - 10,
      },
    ]);

    setTimeout(() => {
      setFloatingTexts((prev) => prev.filter((t) => t.id !== textId));
    }, 650);
  };

  // Main button click handler
  const handleButtonClick = (
    e: React.MouseEvent | React.TouchEvent,
    countIncrement: number = 1,
    isCrit: boolean = false,
  ) => {
    if (!isPlaying || screen !== 'playing') return;

    const now = performance.now();
    clickTimestampsRef.current.push(now);

    let newCombo = combo + 1;
    if (now - lastClickTimeRef.current > 450) {
      newCombo = 1;
    }
    lastClickTimeRef.current = now;
    setCombo(newCombo);
    if (newCombo > maxComboThisLevel) setMaxComboThisLevel(newCombo);

    if (newCombo % 10 === 0 && newCombo > 0) {
      sound.playComboMilestone();
    } else {
      sound.playClick(newCombo, isCrit);
    }

    triggerJuice(e, isCrit);

    const newClicks = clicks + countIncrement;
    const newTotalClicks = stats.totalClicksAllTime + countIncrement;
    setClicks(newClicks);

    setStats((prev) => ({
      ...prev,
      totalClicksAllTime: newTotalClicks,
    }));

    checkAchievements(newTotalClicks, cps);

    // Special Level 16 Betrayal bonus
    if (currentLevel.mechanic === 'betrayal_2' && newClicks === 4 && targetClicks === 5) {
      setTargetClicks(22);
      setTimeLeft((prev) => prev + 6.0);
      return;
    }

    // Check WIN condition
    if (newClicks >= targetClicks) {
      setIsPlaying(false);
      const timeTaken = Math.max(0.1, (performance.now() - levelStartTimeRef.current) / 1000);
      const avgCPS = (newClicks / timeTaken);

      let stars = 1;
      if (timeTaken <= currentLevel.timeLimit * 0.6 || avgCPS >= 6.5) stars = 3;
      else if (timeTaken <= currentLevel.timeLimit * 0.85 || avgCPS >= 4.0) stars = 2;

      setWinStats({ stars, timeTaken, avgCPS });
      setScreen('level_won');

      sound.playWin();
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#3b82f6', '#06b6d4', '#ec4899', '#f59e0b', '#10b981'],
        });
      } catch {}

      setStats((prev) => {
        const nextUnlocked = Math.max(prev.unlockedLevelMax, currentLevel.id + 1);
        const bestStars = Math.max(prev.levelStars[currentLevel.id] || 0, stars);
        const bestTime = Math.min(prev.levelBestTimes[currentLevel.id] || 999, timeTaken);

        return {
          ...prev,
          totalLevelsCompleted: Math.max(prev.totalLevelsCompleted, currentLevel.id),
          unlockedLevelMax: Math.min(LEVELS.length, nextUnlocked),
          levelStars: { ...prev.levelStars, [currentLevel.id]: bestStars },
          levelBestTimes: { ...prev.levelBestTimes, [currentLevel.id]: bestTime },
          fastestLevelWinMs: Math.min(prev.fastestLevelWinMs, Math.round(timeTaken * 1000)),
        };
      });

      checkAchievements(newTotalClicks, avgCPS, currentLevel.id);
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeGame !== 'spam') return;
      if (e.repeat && e.code === 'Space') return;

      if (e.code === 'Space') {
        if (screen === 'level_won') {
          handleNextLevel();
        } else if (screen === 'game_over') {
          restartLevel();
        } else if (screen === 'playing') {
          const fakeEvent = {
            clientX: window.innerWidth / 2,
            clientY: window.innerHeight / 2,
            stopPropagation: () => {},
          } as unknown as React.MouseEvent;
          handleButtonClick(fakeEvent);
        }
      } else if (e.key === 'r' || e.key === 'R') {
        if (screen === 'playing' || screen === 'game_over' || screen === 'level_won') {
          restartLevel();
        }
      } else if (e.key === 'm' || e.key === 'M') {
        toggleSound();
      } else if (e.key === 'Escape') {
        setShowLevelSelect((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeGame, screen, currentLevelIndex, clicks, isPlaying, handleNextLevel, restartLevel]);

  return (
    <div
      className={`relative flex min-h-screen w-full flex-col items-center justify-start bg-[#0f172a] text-white font-sans overflow-x-hidden p-2 sm:p-4 ${
        isScreenShaking ? 'animate-shake' : ''
      }`}
    >
      {/* Top Multi-Game Switcher Nav */}
      <GameSwitcherNav
        activeGame={activeGame}
        onSelectGame={(game) => {
          setActiveGame(game);
          if (game === 'spam' && screen !== 'playing' && screen !== 'level_won') {
            setScreen('title');
          }
        }}
        onResetData={handleResetAllData}
      />

      {saveError && (
        <div className="my-2 flex items-center gap-2 rounded-xl bg-amber-950/80 px-4 py-2 text-xs font-bold text-amber-200 border border-amber-500/50 shadow-lg">
          <span>⚠️ {saveError}</span>
        </div>
      )}

      {/* RENDER ACTIVE GAME */}

      {/* LOBBY / LANDING: ARCADE HUB */}
      {activeGame === 'hub' && (
        <ArcadeLandingHub
          stats={stats}
          onSelectGame={(game) => {
            setActiveGame(game);
            if (game === 'spam' && screen !== 'playing' && screen !== 'level_won') {
              setScreen('title');
            }
          }}
          onOpenAchievements={() => setShowAchievements(true)}
          soundSettings={soundSettings}
          onToggleSound={toggleSound}
        />
      )}

      {/* GAME 2: ELEMENT CRAFT */}
      {activeGame === 'craft' && (
        <ElementCraftGame
          soundSettings={soundSettings}
          onToggleSound={toggleSound}
        />
      )}

      {/* GAME 3: CHAIN REACTOR */}
      {activeGame === 'reactor' && (
        <ChainReactorGame
          soundSettings={soundSettings}
          onToggleSound={toggleSound}
        />
      )}

      {/* GAME 4: CHROMA SYMPHONY */}
      {activeGame === 'chroma' && (
        <ChromaMemoryGame
          soundSettings={soundSettings}
          onToggleSound={toggleSound}
        />
      )}

      {/* GAME 1: SPAM (Ultra Speed Clicker) */}
      {activeGame === 'spam' && (
        <div className="relative flex flex-1 w-full flex-col items-center justify-between">
          <ParticleCanvas floatingTexts={floatingTexts} particlesRef={particlesRef} />

          {/* 1. TITLE SCREEN */}
          {screen === 'title' && (
            <main className="relative z-10 flex flex-1 w-full flex-col items-center justify-center p-4 text-center select-none overflow-hidden min-h-[500px]">
              <div className="pointer-events-none absolute top-10 left-10 w-48 h-48 rounded-full bg-purple-500/20 blur-3xl" />
              <div className="pointer-events-none absolute bottom-10 right-10 w-72 h-72 rounded-full bg-pink-500/20 blur-[100px]" />
              <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-blue-600/10 blur-[120px]" />

              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-pink-500/20 px-5 py-2 text-xs sm:text-sm font-black text-pink-400 border-2 border-pink-500/40 shadow-lg shadow-pink-500/20">
                <Flame className="h-4 w-4 text-yellow-400" />
                <span className="tracking-widest uppercase">THE ULTRA-CHAOTIC SPEED CLICKER</span>
              </div>

              <h1 className="text-6xl sm:text-8xl font-black italic tracking-tighter text-white drop-shadow-[0_10px_30px_rgba(236,72,153,0.5)]">
                SPAM
              </h1>

              <p className="mt-3 max-w-md text-xs sm:text-sm text-slate-300 font-bold">
                One simple rule: <span className="text-yellow-400 font-black">CLICK AS FAST AS POSSIBLE.</span> 20 progressive levels, Mario blocks, color shades, active roamers, and Boss showdown!
              </p>

              <div className="mt-6 flex w-full max-w-xs flex-col gap-3">
                <button
                  id="title-start-btn"
                  onClick={() => startLevel(0)}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl bg-pink-600 border-4 border-pink-400 py-3.5 text-lg font-black text-white shadow-[0_10px_0_0_rgba(157,23,77,1),0_20px_35px_rgba(0,0,0,0.5)] transition-all hover:scale-105 active:translate-y-2 active:shadow-[0_4px_0_0_rgba(157,23,77,1)] cursor-pointer"
                >
                  <Play className="h-5 w-5 fill-white" />
                  <span>START SPAMMING</span>
                </button>

                <div className="flex gap-2">
                  <button
                    id="title-level-select-btn"
                    onClick={() => setShowLevelSelect(true)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-800 py-2.5 text-xs font-black text-blue-400 transition-all hover:bg-slate-700 hover:text-white active:scale-95 border-2 border-blue-500/40 shadow-md cursor-pointer"
                  >
                    <Compass className="h-4 w-4" />
                    <span>LEVELS</span>
                  </button>

                  <button
                    id="title-endless-btn"
                    onClick={() => setScreen('endless')}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-800 py-2.5 text-xs font-black text-purple-400 transition-all hover:bg-slate-700 hover:text-purple-300 active:scale-95 border-2 border-purple-500/40 shadow-md cursor-pointer"
                  >
                    <InfinityIcon className="h-4 w-4" />
                    <span>ENDLESS</span>
                  </button>

                  <button
                    id="title-stats-btn"
                    onClick={() => setShowAchievements(true)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-amber-400 transition-all hover:bg-slate-700 active:scale-95 border-2 border-amber-500/40 shadow-md cursor-pointer"
                  >
                    <Award className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-8 flex items-center gap-4 text-xs font-bold text-slate-400 font-mono">
                <span className="text-pink-400">TOTAL SPAMS: {stats.totalClicksAllTime.toLocaleString()}</span>
                <span>•</span>
                <span className="text-blue-400">BEST CPS: {stats.highestCPS.toFixed(1)}</span>
              </div>
            </main>
          )}

          {/* 2. ACTIVE PLAYING GAMEPLAY SCREEN */}
          {(screen === 'playing' || screen === 'level_won' || screen === 'game_over') && (
            <div className="relative flex flex-1 h-full w-full flex-col items-center justify-between">
              <HUD
                level={currentLevel}
                clicks={clicks}
                targetClicks={targetClicks}
                timeLeft={timeLeft}
                maxTime={currentLevel.timeLimit}
                cps={cps}
                combo={combo}
                soundSettings={soundSettings}
                onToggleSound={toggleSound}
                onRestart={restartLevel}
                onOpenMenu={() => setShowLevelSelect(true)}
                onOpenAchievements={() => setShowAchievements(true)}
                isGrandmaWaiting={isGrandmaWaiting}
              />

              <main className="flex flex-1 w-full items-center justify-center px-2 sm:px-4 my-2">
                <LevelMechanicWrapper
                  level={currentLevel}
                  clicks={clicks}
                  targetClicks={targetClicks}
                  onButtonClick={handleButtonClick}
                  onPenalty={handlePenalty}
                  arenaRef={arenaRef}
                  isGrandmaWaiting={isGrandmaWaiting}
                  onGrandmaReady={handleGrandmaReady}
                />
              </main>

              {/* Bottom Stats Bar */}
              <div className="relative w-full h-18 sm:h-22 bg-slate-900 border-t-4 border-slate-800 flex items-center justify-around px-4 sm:px-12 select-none shadow-2xl rounded-2xl mb-2">
                <div className="text-center">
                  <span className="block text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest">
                    Current Speed
                  </span>
                  <span className="text-lg sm:text-2xl font-black text-blue-400">
                    {cps.toFixed(1)} CPS
                  </span>
                </div>

                <div className="text-center border-x-2 border-slate-800 px-4 sm:px-14">
                  <span className="block text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest">
                    Combo Streak
                  </span>
                  <span className="text-lg sm:text-2xl font-black text-yellow-400">
                    {maxComboThisLevel > 0 ? `x${maxComboThisLevel}` : '—'}
                  </span>
                </div>

                <div className="text-center">
                  <span className="block text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest">
                    Total Clicks
                  </span>
                  <span className="text-lg sm:text-2xl font-black text-pink-500">
                    {stats.totalClicksAllTime.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 3. ENDLESS MODE SCREEN */}
          {screen === 'endless' && (
            <EndlessMode
              highScore={stats.endlessHighScore}
              onUpdateHighScore={(score) =>
                setStats((prev) => ({ ...prev, endlessHighScore: score }))
              }
              onBackToMenu={() => setScreen('title')}
              soundSettings={soundSettings}
              onToggleSound={toggleSound}
            />
          )}

          {/* 4. ALL LEVELS CONQUERED VICTORY SCREEN */}
          {screen === 'all_won' && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 p-4 pt-16 sm:pt-20 backdrop-blur-md text-center select-none">
              <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border-2 border-amber-500/80 p-8 shadow-2xl overflow-hidden">
                <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-amber-500/30 blur-3xl" />

                <div className="mb-3 inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-500/20 text-4xl text-amber-400 border border-amber-500/40 animate-bounce">
                  👑
                </div>

                <h2 className="text-3xl sm:text-4xl font-black text-white drop-shadow">
                  YOU ARE THE SPAM GOD!
                </h2>

                <p className="mt-2 text-sm text-amber-200">
                  You conquered all 20 levels including the Mario ? Blocks, Odd One Out shades, Dial-Up loading, and Boss Meltdown!
                </p>

                <div className="my-6 grid grid-cols-2 gap-3 rounded-2xl bg-slate-950 p-4 border border-slate-800 text-left">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500">TOTAL CLICKS</span>
                    <div className="text-xl font-black text-white">{stats.totalClicksAllTime.toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500">BEST SPEED (CPS)</span>
                    <div className="text-xl font-black text-cyan-400">{stats.highestCPS.toFixed(1)}</div>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5">
                  <button
                    onClick={() => setScreen('endless')}
                    className="w-full rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 py-3.5 text-base font-black text-white shadow-lg active:scale-95 transition-all cursor-pointer"
                  >
                    TRY ENDLESS MODE
                  </button>
                  <button
                    onClick={() => setShowLevelSelect(true)}
                    className="w-full rounded-xl bg-slate-800 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-700 cursor-pointer"
                  >
                    LEVEL SELECT
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modals */}
          {screen === 'level_won' && (
            <WinModal
              level={currentLevel}
              stars={winStats.stars}
              timeTaken={winStats.timeTaken}
              avgCPS={winStats.avgCPS}
              maxCombo={maxComboThisLevel}
              onNextLevel={handleNextLevel}
              onReplay={restartLevel}
              isLastLevel={currentLevelIndex >= LEVELS.length - 1}
              onOpenLevelSelect={() => setShowLevelSelect(true)}
            />
          )}

          {screen === 'game_over' && (
            <LoseModal
              level={currentLevel}
              clicksDone={clicks}
              targetClicks={targetClicks}
              onRetry={restartLevel}
              onOpenLevelSelect={() => setShowLevelSelect(true)}
            />
          )}

          {showLevelSelect && (
            <LevelSelectModal
              stats={stats}
              currentLevelId={currentLevel.id}
              onSelectLevel={(levelId) => {
                const idx = LEVELS.findIndex((l) => l.id === levelId);
                if (idx !== -1) startLevel(idx);
              }}
              onClose={() => setShowLevelSelect(false)}
              onStartEndless={() => {
                setShowLevelSelect(false);
                setScreen('endless');
              }}
            />
          )}

          {showAchievements && (
            <AchievementsModal
              stats={stats}
              achievements={achievements}
              onClose={() => setShowAchievements(false)}
              onResetProgress={() => {
                const freshStats: GameStats = {
                  totalClicksAllTime: 0,
                  totalLevelsCompleted: 0,
                  highestCPS: 0,
                  fastestLevelWinMs: 999999,
                  levelStars: {},
                  levelBestTimes: {},
                  unlockedLevelMax: 1,
                  endlessHighScore: 0,
                  achievementsUnlocked: [],
                };
                setStats(freshStats);
                localStorage.removeItem(STORAGE_KEY);
                setShowAchievements(false);
                startLevel(0);
              }}
            />
          )}

          {/* Harold 1-away Meme Overlay for SPAM */}
          <AnimatePresence>
            {showHarold && (
              <HaroldOverlay
                currentCount={clicks}
                targetCount={targetClicks}
                unitLabel="clicks"
              />
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
