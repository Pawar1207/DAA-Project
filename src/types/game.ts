export type LaneType = 'GRASS' | 'ROAD' | 'RIVER' | 'RAILROAD';

export type ObstacleType = 'CAR' | 'TRUCK' | 'LOG' | 'LILYPAD' | 'TRAIN' | 'TREE' | 'ROCK';

export interface Obstacle {
  id: string;
  type: ObstacleType;
  x: number;
  width: number;
  speed: number;
  color: string;
  subType: string;
  detailColor?: string;
}

export type CollectibleType = 'CORN' | 'GOLDEN_EGG' | 'SHIELD' | 'SLOWMO' | 'MAGNET';

export interface Collectible {
  id: string;
  x: number;
  y: number;
  type: CollectibleType;
  bobOffset: number;
}

export interface Decoration {
  x: number;
  type: 'TREE' | 'ROCK' | 'BUSH' | 'FLOWER' | 'STUMP';
  heightVariation?: number;
}

export interface TrainTrackState {
  approaching: boolean;
  warningTimer: number;
  isLightOn: boolean;
  trainActive: boolean;
  trainX: number;
  trainSpeed: number;
  trainLength: number;
  cooldownTimer: number;
}

export interface Lane {
  index: number;
  type: LaneType;
  obstacles: Obstacle[];
  collectibles: Collectible[];
  decorations: Decoration[];
  speed: number;
  direction: 1 | -1;
  trainState?: TrainTrackState;
  hasLilypads?: boolean;
}

export type SpecialEffect = 'SPARKLE' | 'SMOKE' | 'NEON' | 'MAGIC' | 'BUBBLE' | 'FEATHER';

export interface CharacterSkin {
  id: string;
  name: string;
  title: string;
  description: string;
  cost: number;
  unlocked: boolean;
  primaryColor: string;
  accentColor: string;
  combColor: string;
  beakColor: string;
  eyeColor: string;
  specialEffect?: SpecialEffect;
  iconEmoji: string;
  accessory?: 'HEADBAND' | 'CROWN' | 'GOGGLES' | 'WIZARD_HAT' | 'VISOR' | 'HELMET' | 'BOWTIE';
}

export interface ActivePowerUps {
  shield: boolean;
  slowMoDuration: number;
  magnetDuration: number;
  frenzyDuration: number;
}

export type GameState = 'START' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';

export type DeathCause = 'CAR' | 'TRAIN' | 'RIVER' | 'EAGLE';

export interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  type: 'DUST' | 'FEATHER' | 'WATER' | 'SPARK' | 'CONFETTI';
}

export interface Biome {
  id: string;
  name: string;
  grassColor: string;
  grassDarkColor: string;
  roadColor: string;
  roadMarkColor: string;
  waterColor: string;
  waterShineColor: string;
  railGravelColor: string;
  particleType?: 'LEAF' | 'SNOW' | 'CYBER' | 'FLOWER';
  minScore: number;
}

export interface GameSettings {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  controlMode: 'SWIPE_AND_TAP' | 'DPAD';
  cameraSmoothness: number;
}

export interface GameStats {
  highScore: number;
  totalCorn: number;
  gamesPlayed: number;
  highestNearMissStreak: number;
  unlockedSkinIds: string[];
  achievementsCompleted: string[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  rewardCorn: number;
  isUnlocked: boolean;
  progress: number;
  maxProgress: number;
}
