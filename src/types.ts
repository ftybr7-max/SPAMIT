export type ArcadeGameType = 'hub' | 'spam' | 'craft' | 'reactor' | 'chroma';

export interface DailyChallenge {
  dateKey: string; // e.g. "2026-08-27"
  title: string;
  description: string;
  game: ArcadeGameType;
  targetMetric: string;
  targetValue: number;
  rewardBadge: string;
}

export type LevelMechanicType =
  | 'standard'
  | 'faster'
  | 'tiny'
  | 'roulette'
  | 'fake_buttons'
  | 'rage_mode'
  | 'shrinking'
  | 'betrayal'
  | 'reverse_cursor'
  | 'whack_a_mole'
  | 'spam_grid'
  | 'sprint_3s'
  | 'grandma_mode'
  | 'dont_panic'
  | 'invisible'
  | 'button_army'
  | 'betrayal_2'
  | 'rhythm'
  | 'chaos'
  | 'gravity'
  | 'boss'
  | 'mario_block'
  | 'odd_one_out'
  | 'active_roamer';

export interface LevelConfig {
  id: number;
  title: string;
  subtitle: string;
  targetClicks: number;
  timeLimit: number; // in seconds
  mechanic: LevelMechanicType;
  instructions: string;
  accentColor: string;
  buttonLabel?: string | ((clicks: number, target: number) => string);
  bgGradient: string;
  buttonBaseStyle?: string;
  customData?: Record<string, any>;
}

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  scale?: number;
  rotation?: number;
}

export interface ParticleItem {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  shape?: 'circle' | 'square' | 'spark' | 'ring';
}

export interface GameStats {
  totalClicksAllTime: number;
  totalLevelsCompleted: number;
  highestCPS: number;
  fastestLevelWinMs: number;
  levelStars: Record<number, number>; // levelId -> 1, 2, 3 stars
  levelBestTimes: Record<number, number>; // levelId -> best time in seconds
  unlockedLevelMax: number;
  endlessHighScore: number;
  achievementsUnlocked: string[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress?: { current: number; max: number };
}

export type GameScreen =
  | 'title'
  | 'playing'
  | 'level_won'
  | 'game_over'
  | 'all_won'
  | 'level_select'
  | 'stats'
  | 'endless'
  | 'speedrun';

export interface SoundSettings {
  soundEnabled: boolean;
  screenShakeEnabled: boolean;
  particlesEnabled: boolean;
}

// -------------------------------------------------------------
// ELEMENT CRAFT (Alchemy Discovery Game) Types
// -------------------------------------------------------------
export type ElementTier = 1 | 2 | 3 | 4 | 5 | 6;

export interface CraftElement {
  id: string;
  name: string;
  emoji: string;
  tier: ElementTier;
  category: 'primal' | 'nature' | 'materials' | 'civilization' | 'cosmos' | 'mythic';
  description: string;
  color: string;
}

export interface CraftRecipe {
  first: string;
  second: string;
  result: string;
}

export interface PlacedElement {
  instanceId: string;
  elementId: string;
  x: number;
  y: number;
}

// -------------------------------------------------------------
// CHAIN REACTOR (Cascade Physics Game) Types
// -------------------------------------------------------------
export type ReactorParticleType = 'normal' | 'multiplier' | 'freeze' | 'supernova';

export interface ReactorParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  type: ReactorParticleType;
  color: string;
  popped: boolean;
}

export interface ReactorExplosion {
  id: number;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  type: ReactorParticleType;
  life: number;
  maxLife: number;
}

export interface ReactorLevelConfig {
  id: number;
  title: string;
  totalParticles: number;
  targetCount: number;
  description: string;
  color: string;
}

// -------------------------------------------------------------
// CHROMA SYMPHONY (Melodic Memory Synth Game) Types
// -------------------------------------------------------------
export interface ChromaNotePad {
  id: number;
  label: string;
  pitchName: string;
  freq: number;
  color: string;
  glowColor: string;
}

export interface ChromaStageConfig {
  id: number;
  title: string;
  sequenceLength: number;
  tempoMs: number;
  notesCount: number; // 4 to 8 pads active
  timeLimitSec: number;
}
