export type MathCategory = 'addSub' | 'multiplyDivide' | 'compareFraction';

export type PowerupType = 'rook' | 'knight' | 'bishop' | 'queen';

export type ObstacleKind = 'hurdle' | 'lowBarrier' | 'swing' | 'frostingPit' | 'cakeWall';

export type ActionType = 'jump' | 'slide' | 'power';

export type PointThrusterKind = 'small' | 'medium' | 'risky' | 'multiplier';

export type BakingIngredient = 'frosting' | 'sprinkles' | 'candle' | 'berry';

export interface GameProfile {
  playerName: string;
  birthdayAge: number;
  difficulty: 'challenge';
  targetDevice: string;
  deadline: string;
}

export interface LevelPalette {
  skyTop: number;
  skyBottom: number;
  ground: number;
  accent: number;
  secondary: number;
}

export interface ObstacleDefinition {
  id: string;
  kind: ObstacleKind;
  x: number;
  y?: number;
  label: string;
}

export interface CoursePlatformDefinition {
  id: string;
  x: number;
  y: number;
  width: number;
  label: string;
}

export interface CourseLadderDefinition {
  id: string;
  x: number;
  yTop: number;
  yBottom: number;
  label: string;
}

export interface PointThrusterDefinition {
  id: string;
  x: number;
  y: number;
  value: number;
  requiredAction?: ActionType;
  kind?: PointThrusterKind;
  label?: string;
}

export interface PowerBadgeDefinition {
  id: string;
  x: number;
  y: number;
  powerup: PowerupType;
  label?: string;
}

export interface BakingStationDefinition {
  id: string;
  x: number;
  y?: number;
  label: string;
  recipe: BakingIngredient[];
  value: number;
  perfectBonus: number;
}

export interface BakingStationResult {
  mistakes: number;
  perfect: boolean;
  multiplier: number;
  mathCorrect: number;
  mathAttempts: number;
}

export interface LevelDefinition {
  id: string;
  index: number;
  title: string;
  subtitle: string;
  theme: string;
  mathCategories: MathCategory[];
  powerup: PowerupType;
  bonusPowerup?: PowerupType;
  targetTimeMs: number;
  targetScore: number;
  trackLength: number;
  worldWidth?: number;
  worldHeight?: number;
  startX?: number;
  groundY?: number;
  finish?: {
    x: number;
    y: number;
    width: number;
    label: string;
  };
  platforms: CoursePlatformDefinition[];
  ladders?: CourseLadderDefinition[];
  obstacles: ObstacleDefinition[];
  pointThrusters: PointThrusterDefinition[];
  powerBadges: PowerBadgeDefinition[];
  bakingStations: BakingStationDefinition[];
  palette: LevelPalette;
}

export interface MathProblem {
  id: string;
  prompt: string;
  category: MathCategory;
  choices: number[];
  correctAnswer: number;
  hint: string;
  displayChoices?: string[];
}

export interface ScoreSummary {
  levelId: string;
  levelTitle: string;
  completed: boolean;
  score: number;
  targetScore: number;
  elapsedMs: number;
  penaltyMs: number;
  mathCorrect: number;
  mathAttempts: number;
  hintsUsed: number;
  obstacleHits: number;
  obstacleClears: number;
  thrustersCollected: number;
  totalThrusters: number;
  maxCombo: number;
  obstaclePoints: number;
  thrusterPoints: number;
  mathPoints: number;
  bakingPoints: number;
  bakingPerfect: number;
  bakingStationsCompleted: number;
  totalBakingStations: number;
  comboBonus: number;
  finishBonus: number;
  noHitBonus: number;
  mathStreakBonus: number;
  timeBonus: number;
  penaltyPoints: number;
  stars: number;
}
