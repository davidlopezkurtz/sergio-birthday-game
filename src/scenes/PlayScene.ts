import Phaser from 'phaser';
import { assetsByKey, resolveAssetUrl, type AssetKey } from '../assets/assetManifest';
import { levels } from '../data/levels';
import { BAKEOFF_READY_EVENT, BAKEOFF_STARTUP_TIMEOUT_MS, type BakeOffReadyPayload } from '../game/bakeOffTransition';
import {
  buildFallbackLevelCompletionSummary,
  type LevelCompletionSnapshot,
  upsertLevelCompletionSummary
} from '../game/levelCompletion';
import {
  OBSTACLE_CLEAR_POINTS,
  OBSTACLE_HIT_PENALTY_POINTS,
  calculateAppliedPenalty,
  calculateScoreFromLedger,
  formatScore,
  formatTime
} from '../game/scoring';
import type {
  ActionType,
  BakingStationDefinition,
  CourseLadderDefinition,
  CoursePlatformDefinition,
  LevelDefinition,
  ObstacleDefinition,
  PointThrusterDefinition,
  PowerBadgeDefinition,
  PowerupType,
  ScoreSummary
} from '../types';

interface PlaySceneData {
  levelIndex: number;
}

interface ObstacleObject {
  definition: ObstacleDefinition;
  sprite: Phaser.GameObjects.Image;
  baseY: number;
  phase: number;
}

interface PlatformObject {
  definition: CoursePlatformDefinition;
  body: Phaser.GameObjects.Rectangle | Phaser.GameObjects.TileSprite;
  edge?: Phaser.GameObjects.TileSprite;
}

interface ThrusterObject {
  definition: PointThrusterDefinition;
  ring: Phaser.GameObjects.Arc;
  core: Phaser.GameObjects.Arc | Phaser.GameObjects.Image;
  sprinkles: Array<Phaser.GameObjects.Arc | Phaser.GameObjects.Image>;
}

interface PowerBadgeObject {
  definition: PowerBadgeDefinition;
  power: PowerupType;
  sprite: Phaser.GameObjects.Image;
  ring: Phaser.GameObjects.Arc;
  collected: boolean;
}

const DEFAULT_GROUND_Y = 560;
const DEFAULT_CAT_START_X = 160;
const DEFAULT_WORLD_HEIGHT = 720;
const CAT_BASE_SPEED = 230;
const CAT_BACK_SPEED = 170;
const CLIMB_SPEED = 260;
const CAT_JUMP_VELOCITY = -920;
const CAT_POWER_JUMP_VELOCITY = -850;
const CAT_BISHOP_JUMP_VELOCITY = -650;
const GRAVITY = 1650;
const LADDER_GRAB_X_TOLERANCE = 36;
const LADDER_GRAB_Y_TOLERANCE = 28;
const LADDER_EXIT_LOCKOUT_MS = 520;
const COUNTDOWN_MS = 1400;
const JUMP_ACTION_GRACE_MS = 1150;
const SLIDE_ACTION_GRACE_MS = 950;
const POWER_ACTION_GRACE_MS = 1100;
const ACTION_CLEAR_AHEAD = 100;
const ACTION_CLEAR_BEHIND = 180;
const HUD_HEIGHT = 62;
const HUD_DEPTH = 20;
const CONTROL_Y = 666;
const CONTROL_ALPHA_TOUCH = 0.5;
const CONTROL_ALPHA_DESKTOP = 0.16;
const CONTROL_ALPHA_PRESSED = 0.88;
const COURSE_BAND_ALPHA = 0.16;
const POWER_BADGE_PICKUP_RADIUS = 92;
const KNIGHT_PLATFORM_X_OFFSET = 145;
const KNIGHT_TRAVEL_MS = 420;
const ROOK_POWER_DASH_DISTANCE = 420;
const BISHOP_POWER_DASH_DISTANCE = 320;
const QUEEN_POWER_CHARGE_DISTANCE = 520;
const QUEEN_POWER_CHARGE_MS = 560;
const POWER_SWEEP_X_PADDING = 110;
const POWER_SWEEP_Y_PADDING = 220;
const PICKUP_ASSET_BY_ACTION: Record<ActionType, AssetKey> = {
  jump: 'treat-cupcake-base',
  slide: 'treat-donut-base',
  power: 'treat-star-topper'
};

interface HitboxProfile {
  widthRatio: number;
  heightRatio: number;
  offsetX?: number;
  offsetY?: number;
}

const CAT_HITBOX: HitboxProfile = { widthRatio: 0.42, heightRatio: 0.5, offsetY: 8 };
const CAT_SLIDE_HITBOX: HitboxProfile = { widthRatio: 0.54, heightRatio: 0.36, offsetY: 16 };
const OBSTACLE_HITBOXES: Record<ObstacleDefinition['kind'], HitboxProfile> = {
  hurdle: { widthRatio: 0.48, heightRatio: 0.4, offsetY: 24 },
  lowBarrier: { widthRatio: 0.52, heightRatio: 0.42, offsetY: 20 },
  swing: { widthRatio: 0.38, heightRatio: 0.58, offsetY: 18 },
  frostingPit: { widthRatio: 0.56, heightRatio: 0.2, offsetY: 36 },
  cakeWall: { widthRatio: 0.52, heightRatio: 0.62, offsetY: 20 }
};

const CAT_RUN_FRAMES = ['catRun1', 'catRun2', 'catRun4', 'catRun5'] as const;
const CAT_SLIDE_FRAMES = ['catSlideFrame1', 'catSlideFrame2', 'catSlideFrame3'] as const;
const CAT_BUMP_FRAMES = ['catBump1', 'catBump2', 'catBump3'] as const;
const CAT_ANIMATION_ASSETS = [
  ...CAT_RUN_FRAMES,
  ...CAT_SLIDE_FRAMES,
  'catJumpFrame1',
  'catJumpFrame2',
  'catJumpFrame3',
  'catJumpFrame4',
  ...CAT_BUMP_FRAMES
] as const;

type CatPoseKey =
  | 'cat'
  | 'catSlide'
  | 'catJump'
  | 'catHurt'
  | 'catVictory'
  | (typeof CAT_ANIMATION_ASSETS)[number];

const CAT_VISIBLE_BOTTOM_PADDING: Partial<Record<CatPoseKey, number>> = {
  cat: 14,
  catSlide: 8,
  catJump: 13,
  catHurt: 12,
  catVictory: 10,
  catRun1: 12,
  catRun2: 12,
  catRun4: 13,
  catRun5: 12,
  catSlideFrame1: 8,
  catSlideFrame2: 8,
  catSlideFrame3: 8,
  catJumpFrame1: 13,
  catJumpFrame2: 13,
  catJumpFrame3: 13,
  catJumpFrame4: 13,
  catBump1: 12,
  catBump2: 12,
  catBump3: 12
};

export class PlayScene extends Phaser.Scene {
  private level!: LevelDefinition;
  private cat!: Phaser.GameObjects.Sprite;
  private currentCatPose?: CatPoseKey;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyMoveLeftA?: Phaser.Input.Keyboard.Key;
  private keyMoveRightD?: Phaser.Input.Keyboard.Key;
  private keyJumpW?: Phaser.Input.Keyboard.Key;
  private keyPower?: Phaser.Input.Keyboard.Key;
  private keySlide?: Phaser.Input.Keyboard.Key;
  private elapsedMs = 0;
  private hintsUsed = 0;
  private obstacleHits = 0;
  private obstacleClears = 0;
  private combo = 0;
  private maxCombo = 0;
  private obstaclePoints = 0;
  private thrusterPoints = 0;
  private mathPoints = 0;
  private bakingPoints = 0;
  private comboBonus = 0;
  private penaltyPoints = 0;
  private obstacleResolvedIds = new Set<string>();
  private thrustersCollected = new Set<string>();
  private activeBakingStation = false;
  private activePower = false;
  private activePowerType?: PowerupType;
  private heldPower?: PowerupType;
  private powerReady = false;
  private sliding = false;
  private completed = false;
  private invincible = false;
  private timerText?: Phaser.GameObjects.Text;
  private scoreText?: Phaser.GameObjects.Text;
  private comboText?: Phaser.GameObjects.Text;
  private progressText?: Phaser.GameObjects.Text;
  private powerText?: Phaser.GameObjects.Text;
  private powerIcon?: Phaser.GameObjects.Image;
  private powerButtonCircle?: Phaser.GameObjects.Arc;
  private powerButtonGlow?: Phaser.GameObjects.Arc;
  private controlDebugText?: Phaser.GameObjects.Text;
  private bakeOffLoadingText?: Phaser.GameObjects.Text;
  private bakeOffStartupTimer?: Phaser.Time.TimerEvent;
  private bakeOffReadyHandler?: (payload: BakeOffReadyPayload) => void;
  private bakeOffTransitionId?: string;
  private platforms: PlatformObject[] = [];
  private obstacles: ObstacleObject[] = [];
  private thrusters: ThrusterObject[] = [];
  private powerBadges: PowerBadgeObject[] = [];
  private verticalVelocity = 0;
  private onGround = true;
  private currentSurfaceY = DEFAULT_GROUND_Y;
  private groundY = DEFAULT_GROUND_Y;
  private startX = DEFAULT_CAT_START_X;
  private worldWidth = 1280;
  private worldHeight = DEFAULT_WORLD_HEIGHT;
  private runStarted = false;
  private hasMoved = false;
  private countdownText?: Phaser.GameObjects.Text;
  private touchMoveDirection = 0;
  private touchClimbDirection = 0;
  private facingDirection: -1 | 1 = 1;
  private climbing = false;
  private lastJumpAt = Number.NEGATIVE_INFINITY;
  private lastSlideAt = Number.NEGATIVE_INFINITY;
  private lastPowerAt = Number.NEGATIVE_INFINITY;
  private ladderGrabLockedUntil = Number.NEGATIVE_INFINITY;
  private bumpFeedbackStartedAt = Number.NEGATIVE_INFINITY;
  private bumpFeedbackUntil = Number.NEGATIVE_INFINITY;
  private powerTraveling = false;

  constructor() {
    super('PlayScene');
  }

  init(data: PlaySceneData): void {
    this.level = levels[data.levelIndex] ?? levels[0];
    this.groundY = this.level.groundY ?? DEFAULT_GROUND_Y;
    this.startX = this.level.startX ?? DEFAULT_CAT_START_X;
    this.worldWidth = this.level.worldWidth ?? this.level.trackLength + 800;
    this.worldHeight = this.level.worldHeight ?? DEFAULT_WORLD_HEIGHT;
    this.elapsedMs = 0;
    this.hintsUsed = 0;
    this.obstacleHits = 0;
    this.obstacleClears = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.obstaclePoints = 0;
    this.thrusterPoints = 0;
    this.mathPoints = 0;
    this.bakingPoints = 0;
    this.comboBonus = 0;
    this.penaltyPoints = 0;
    this.obstacleResolvedIds.clear();
    this.thrustersCollected.clear();
    this.activeBakingStation = false;
    this.activePower = false;
    this.activePowerType = undefined;
    this.heldPower = undefined;
    this.powerReady = false;
    this.sliding = false;
    this.completed = false;
    this.invincible = false;
    this.currentCatPose = undefined;
    this.controlDebugText = undefined;
    this.bakeOffLoadingText = undefined;
    this.bakeOffStartupTimer = undefined;
    this.bakeOffReadyHandler = undefined;
    this.bakeOffTransitionId = undefined;
    this.platforms = [];
    this.obstacles = [];
    this.thrusters = [];
    this.powerBadges = [];
    this.verticalVelocity = 0;
    this.onGround = true;
    this.currentSurfaceY = this.groundY;
    this.runStarted = false;
    this.hasMoved = false;
    this.touchMoveDirection = 0;
    this.touchClimbDirection = 0;
    this.facingDirection = 1;
    this.climbing = false;
    this.lastJumpAt = Number.NEGATIVE_INFINITY;
    this.lastSlideAt = Number.NEGATIVE_INFINITY;
    this.lastPowerAt = Number.NEGATIVE_INFINITY;
    this.ladderGrabLockedUntil = Number.NEGATIVE_INFINITY;
    this.bumpFeedbackStartedAt = Number.NEGATIVE_INFINITY;
    this.bumpFeedbackUntil = Number.NEGATIVE_INFINITY;
    this.powerTraveling = false;
  }

  preload(): void {
    const assetsToLoad = this.levelAssetKeys()
      .map((key) => assetsByKey[key])
      .filter((asset) => !this.textures.exists(asset.key));

    if (assetsToLoad.length === 0) {
      return;
    }

    this.cameras.main.setBackgroundColor(this.level.palette.skyTop);
    const loadingBackdrop = this.add.rectangle(640, 360, 1280, 720, this.level.palette.skyTop, 1);
    const loadingPanel = this.add.rectangle(640, 360, 720, 210, 0xffffff, 0.92).setStrokeStyle(6, 0xffd23f);
    const loadingText = this.add
      .text(640, 314, `Loading ${this.level.title}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '32px',
        color: '#102033',
        fontStyle: '900',
        align: 'center'
      })
      .setOrigin(0.5);
    const progressFill = this.add.rectangle(392, 388, 0, 22, 0x27b6a5, 1).setOrigin(0, 0.5);
    const progressTrack = this.add.rectangle(640, 388, 500, 22, 0x102033, 0.12).setStrokeStyle(3, 0x102033, 0.55);

    const updateProgress = (value: number) => {
      progressFill.width = 496 * value;
      loadingText.setText(`Loading ${this.level.title} ${Math.round(value * 100)}%`);
    };

    this.load.on('progress', updateProgress);
    this.load.once('complete', () => {
      this.load.off('progress', updateProgress);
      loadingBackdrop.destroy();
      loadingPanel.destroy();
      loadingText.destroy();
      progressFill.destroy();
      progressTrack.destroy();
    });

    for (const asset of assetsToLoad) {
      const devicePixelRatio = asset.kind === 'Background' ? 1 : window.devicePixelRatio;
      const assetUrl = resolveAssetUrl(asset, devicePixelRatio);
      if (assetUrl) {
        this.load.image(asset.key, assetUrl);
      }
    }
  }

  create(): void {
    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
    this.createBackdrop();
    this.createGround();
    this.createLadders();
    this.createPlatforms();
    this.createObstacles();
    this.createPointThrusters();
    this.createPowerBadges();
    this.createCat();
    this.createHud();
    this.createControls();
    this.createControlDebugOverlay();
    this.updatePowerAvailabilityVisual();
    this.startCountdown();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.clearBakeOffStartupGuard());

    this.cameras.main.startFollow(this.cat, true, 0.14, 0.14, 0, 30);
    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
  }

  update(time: number, delta: number): void {
    if (this.completed) {
      return;
    }

    this.animateObstacles(time);
    this.handleKeyboardInput();
    this.updateControlDebugOverlay();

    if (!this.runStarted) {
      return;
    }

    if (this.getMoveDirection() !== 0 || this.getClimbDirection() !== 0 || this.climbing) {
      this.hasMoved = true;
    }

    if (this.hasMoved) {
      this.elapsedMs += delta;
    }

    this.applyClimbMovement(delta);
    this.applyHorizontalMovement(delta);
    this.applyManualGravity(delta);
    this.animateCatMotion(time);

    this.checkObstacleOverlaps();
    this.checkThrusterOverlaps();
    this.checkPowerBadgeOverlaps();
    this.checkLevelComplete();
    this.updateHud();
  }

  private createBackdrop(): void {
    this.cameras.main.setBackgroundColor(this.level.palette.skyTop);

    const sky = this.add.graphics();
    sky.fillGradientStyle(
      this.level.palette.skyTop,
      this.level.palette.skyTop,
      this.level.palette.skyBottom,
      this.level.palette.skyBottom,
      1
    );
    sky.fillRect(0, 0, this.worldWidth, this.worldHeight);

    const backgroundKey = this.levelBackgroundAssetKey();
    if (this.textures.exists(backgroundKey)) {
      for (let y = 360; y < this.worldHeight + 360; y += 720) {
        this.add.image(this.worldWidth / 2, y, backgroundKey).setDisplaySize(this.worldWidth, 720).setDepth(0.05).setAlpha(0.48);
      }
    }

    const bandStops = [0, ...this.level.platforms.map((platform) => platform.y).sort((a, b) => a - b), this.groundY + 180];
    for (let index = 0; index < bandStops.length - 1; index += 1) {
      const top = bandStops[index];
      const bottom = bandStops[index + 1];
      const y = (top + bottom) / 2;
      const height = bottom - top;
      const color = index % 2 === 0 ? 0xffffff : this.level.palette.accent;
      this.add.rectangle(640, y, this.worldWidth, height, color, index % 2 === 0 ? 0.05 : COURSE_BAND_ALPHA * 0.62).setDepth(0);
      this.add.rectangle(640, bottom - 6, this.worldWidth, 10, 0xffffff, 0.18).setDepth(0);
    }

    for (let index = 0; index < 12; index += 1) {
      const x = 160 + (index % 4) * 330;
      const y = 170 + Math.floor(index / 4) * 620;
      this.add.circle(x, y, 34, 0xffffff, 0.1).setDepth(0);
      this.add.circle(x + 42, y + 8, 26, 0xffffff, 0.08).setDepth(0);
      this.add.circle(x - 38, y + 12, 22, 0xffffff, 0.07).setDepth(0);
    }

  }

  private createGround(): void {
    const floorEdgeKey = this.floorEdgeAssetKey();
    const isTower = this.levelThemeKey() === 'tower';
    const edgeHeight = this.textures.exists(floorEdgeKey) ? Math.min(52, assetsByKey[floorEdgeKey].height) : 18;

    this.add.rectangle(
      this.worldWidth / 2,
      this.groundY + 82,
      this.worldWidth + 200,
      166,
      isTower ? 0x5a287a : this.level.palette.ground,
      isTower ? 0.9 : 0.74
    ).setDepth(2);
    this.add.rectangle(this.worldWidth / 2, this.groundY + 132, this.worldWidth + 200, 34, 0x102033, isTower ? 0.34 : 0.2).setDepth(2.5);
    if (isTower) {
      this.add
        .rectangle(this.worldWidth / 2, this.groundY + 34, this.worldWidth + 200, 68, 0x7e3fa5, 0.78)
        .setDepth(3.2);
      this.add
        .rectangle(this.worldWidth / 2, this.groundY + 74, this.worldWidth + 200, 28, 0x3a1856, 0.62)
        .setDepth(3.4);
    }
    if (this.textures.exists(floorEdgeKey)) {
      this.add
        .tileSprite(this.worldWidth / 2, this.groundY + 8, this.worldWidth + 200, edgeHeight, floorEdgeKey)
        .setDepth(4)
        .setAlpha(0.98);
    } else {
      this.add.rectangle(this.worldWidth / 2, this.groundY + 4, this.worldWidth + 200, edgeHeight, 0xffffff, 0.55).setDepth(4);
    }
    this.add
      .rectangle(
        this.worldWidth / 2,
        this.groundY + 1,
        this.worldWidth + 200,
        isTower ? 6 : 4,
        isTower ? 0xffd23f : 0x102033,
        isTower ? 0.78 : 0.25
      )
      .setDepth(6);
  }

  private createCat(): void {
    this.currentCatPose = 'cat';
    this.cat = this.add.sprite(this.startX, this.groundY, 'cat');
    this.setAssetDisplaySize(this.cat, 'cat');
    this.cat.y = this.groundY - this.catFootOffset();
    this.cat.setDepth(9);
  }

  private createLadders(): void {
    const ladderKey = this.ladderAssetKey();
    for (const ladder of this.level.ladders ?? []) {
      const top = Math.min(ladder.yTop, ladder.yBottom);
      const bottom = Math.max(ladder.yTop, ladder.yBottom);
      this.renderLadder(ladder, ladderKey, top, bottom);
    }
  }

  private renderLadder(
    ladder: CourseLadderDefinition,
    ladderKey: AssetKey,
    top: number,
    bottom: number
  ): void {
    const y = (top + bottom) / 2;
    const height = bottom - top + 28;

    if (this.textures.exists(ladderKey)) {
      this.add.image(ladder.x, y, ladderKey).setDisplaySize(136, height + 42).setDepth(4.2).setAlpha(0.72);
    }

    this.add.rectangle(ladder.x - 43, y, 9, height, 0x8c5b2e, 0.96).setDepth(4.8);
    this.add.rectangle(ladder.x + 43, y, 9, height, 0x8c5b2e, 0.96).setDepth(4.8);

    for (let rungY = top + 20; rungY <= bottom - 20; rungY += 34) {
      this.add.rectangle(ladder.x, rungY, 82, 7, 0xffd23f, 0.94).setDepth(4.9);
    }
  }

  private createPlatforms(): void {
    this.platforms = [];
    const platformKey = this.platformAssetKey();
    const floorEdgeKey = this.floorEdgeAssetKey();
    const isTower = this.levelThemeKey() === 'tower';

    for (const platform of this.level.platforms) {
      const platformHeight = assetsByKey[platformKey].height;
      const edgeHeight = this.textures.exists(floorEdgeKey) ? Math.min(52, assetsByKey[floorEdgeKey].height) : 12;
      this.add.rectangle(platform.x, platform.y + platformHeight + 14, platform.width + 36, 28, 0x102033, 0.2).setDepth(2);
      if (isTower) {
        this.add.rectangle(platform.x, platform.y + 34, platform.width + 34, 70, 0x7e3fa5, 0.78).setDepth(2.8);
        this.add.rectangle(platform.x, platform.y + 76, platform.width + 34, 30, 0x3a1856, 0.58).setDepth(2.9);
      }
      const body = this.add
        .tileSprite(
          platform.x,
          platform.y + platformHeight / 2,
          platform.width,
          platformHeight,
          platformKey
        )
        .setDepth(3);
      const edge = this.textures.exists(floorEdgeKey)
        ? this.add
            .tileSprite(platform.x, platform.y + 8, platform.width + 26, edgeHeight, floorEdgeKey)
            .setDepth(5)
        : undefined;
      this.add
        .rectangle(
          platform.x,
          platform.y + 1,
          platform.width + 12,
          isTower ? 8 : 4,
          isTower ? 0xffd23f : 0x102033,
          isTower ? 0.88 : 0.25
        )
        .setDepth(6);
      if (isTower) {
        this.add.rectangle(platform.x, platform.y + 10, platform.width + 6, 4, 0xffffff, 0.36).setDepth(6.1);
      }
      if (!edge) {
        this.add.rectangle(platform.x, platform.y + 4, platform.width, edgeHeight, 0xffffff, 0.7).setDepth(4);
      }

      this.platforms.push({ definition: platform, body, edge });
    }
  }

  private createObstacles(): void {
    this.obstacles = [];

    for (const obstacle of this.level.obstacles) {
      const y = this.getObstacleY(obstacle);
      const assetKey = this.obstacleAssetKey(obstacle.kind);
      const sprite = this.add.image(obstacle.x, y, assetKey);
      sprite.setDepth(4);
      this.setAssetDisplaySize(sprite, assetKey, this.getObstacleScale(obstacle.kind));

      this.obstacles.push({ definition: obstacle, sprite, baseY: y, phase: obstacle.x / 180 });
    }
  }

  private createPointThrusters(): void {
    this.thrusters = [];

    for (const thruster of this.level.pointThrusters) {
      const color = this.thrusterColor(thruster);
      const radius = this.thrusterRadius(thruster);
      const ring = this.add
        .circle(thruster.x, thruster.y + radius * 0.28, radius * 0.56, 0x102033, 0.12)
        .setDepth(6);
      const pickupAssetKey = this.pickupAssetKey(thruster.requiredAction);
      const core = this.textures.exists(pickupAssetKey)
        ? this.add.image(thruster.x, thruster.y, pickupAssetKey).setDepth(7).setDisplaySize(radius * 1.14, radius * 0.98)
        : this.add.circle(thruster.x, thruster.y, radius * 0.62, 0xfff4c7, 0.98).setStrokeStyle(4, 0x8c5b2e, 0.84).setDepth(7);
      const sprinkles: Array<Phaser.GameObjects.Arc | Phaser.GameObjects.Image> = [
        this.add.circle(thruster.x - radius * 0.36, thruster.y - radius * 0.22, radius * 0.08, color, 1).setDepth(8),
        this.add.circle(thruster.x + radius * 0.38, thruster.y - radius * 0.18, radius * 0.07, 0xf05f73, 1).setDepth(8)
      ];

      this.tweens.add({
        targets: [core, ...sprinkles],
        y: '-=5',
        duration: 720,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      this.thrusters.push({ definition: thruster, ring, core, sprinkles });
    }
  }

  private createPowerBadges(): void {
    this.powerBadges = [];
    const badges =
      this.level.powerBadges.length > 0
        ? this.level.powerBadges
        : [{ id: `${this.level.id}-default-power`, x: 760, y: this.groundY - 118, powerup: this.level.powerup }];

    badges.forEach((badgeDefinition) => {
      const { x, y, powerup: power } = badgeDefinition;
      const ring = this.add.circle(x, y, 48, 0xffd23f, 0.2).setStrokeStyle(5, 0xffd23f, 0.9).setDepth(6);
      const sprite = this.add.image(x, y, power).setDepth(7);
      this.setAssetDisplaySize(sprite, power, 0.62);

      this.tweens.add({
        targets: [ring, sprite],
        y: '-=7',
        duration: 760,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      this.powerBadges.push({ definition: badgeDefinition, power, sprite, ring, collected: false });
    });
  }

  private createHud(): void {
    this.add
      .rectangle(640, HUD_HEIGHT / 2, 1280, HUD_HEIGHT, 0x102033, 0.82)
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH);

    this.timerText = this.add
      .text(1120, 20, 'Time 0:00', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        color: '#d8f7ff',
        fontStyle: '800'
      })
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH + 1);

    this.scoreText = this.add
      .text(28, 13, 'Score 0', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '30px',
        color: '#ffec9f',
        fontStyle: '900'
      })
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH + 1);

    this.comboText = this.add
      .text(268, 19, 'Combo x0', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '22px',
        color: '#ffffff',
        fontStyle: '900'
      })
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH + 1);

    this.powerIcon = this.add
      .image(496, 31, this.currentPowerup())
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH + 1);
    this.setAssetDisplaySize(this.powerIcon, this.currentPowerup(), 0.3);

    this.powerText = this.add
      .text(532, 18, this.powerStatusText('empty'), {
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        color: '#ffec9f',
        fontStyle: '900',
        wordWrap: { width: 230 }
      })
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH + 1);

    this.progressText = this.add
      .text(790, 20, 'Treats 0/0  Hits 0', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '17px',
        color: '#ffffff',
        fontStyle: '800'
      })
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH + 1);

  }

  private createControls(): void {
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.keyMoveLeftA = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyMoveRightD = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyJumpW = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyPower = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keySlide = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.S);

    this.add.rectangle(640, 672, 1280, 96, 0x102033, 0.12).setScrollFactor(0).setDepth(29);
    this.powerButtonGlow = this.add
      .circle(1120, CONTROL_Y, 42, 0xffd23f, 0.16)
      .setScrollFactor(0)
      .setDepth(29)
      .setVisible(false);
    this.tweens.add({
      targets: this.powerButtonGlow,
      alpha: { from: 0.12, to: 0.34 },
      scale: { from: 0.95, to: 1.04 },
      duration: 520,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.createMoveButton(86, CONTROL_Y, 88, 'Back', 0x2f4056, -1);
    this.createMoveButton(196, CONTROL_Y, 96, 'Run', 0x38a16d, 1);
    this.createVerticalActionButton(888, CONTROL_Y, 92, 'Duck', 0xf05f73, 1);
    this.createVerticalActionButton(998, CONTROL_Y, 96, 'Jump', 0x27b6a5, -1);
    this.createTouchButton(1120, CONTROL_Y, 96, 'Power', 0xffd23f, () => this.usePower(), '#102033', 66);
  }

  private createTouchButton(
    x: number,
    y: number,
    size: number,
    label: string,
    color: number,
    onPress: () => void,
    textColor = '#ffffff',
    visibleSize = Math.max(58, size - 14)
  ): void {
    const container = this.add.container(x, y).setScrollFactor(0).setDepth(30);
    const baseAlpha = this.touchControlAlpha();
    const circle = this.add
      .circle(0, 0, visibleSize / 2, color, baseAlpha)
      .setStrokeStyle(3, 0xffffff, 0.62);
    const text = this.add
      .text(0, 0, label, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '17px',
        color: textColor,
        fontStyle: '900'
      })
      .setOrigin(0.5);
    const hitZone = this.add.zone(0, 0, size, size).setInteractive({ useHandCursor: true });

    container.add([circle, text, hitZone]);
    if (label === 'Power') {
      this.powerButtonCircle = circle;
    }
    hitZone.on('pointerdown', () => {
      circle.setAlpha(CONTROL_ALPHA_PRESSED);
      circle.setScale(1.04);
      onPress();
    });
    hitZone.on('pointerup', () => {
      circle.setAlpha(baseAlpha);
      circle.setScale(1);
      this.updatePowerAvailabilityVisual();
    });
    hitZone.on('pointerout', () => {
      circle.setAlpha(baseAlpha);
      circle.setScale(1);
      this.updatePowerAvailabilityVisual();
    });
    hitZone.on('pointerupoutside', () => {
      circle.setAlpha(baseAlpha);
      circle.setScale(1);
      this.updatePowerAvailabilityVisual();
    });
  }

  private createVerticalActionButton(
    x: number,
    y: number,
    size: number,
    label: string,
    color: number,
    direction: -1 | 1
  ): void {
    const container = this.add.container(x, y).setScrollFactor(0).setDepth(30);
    const baseAlpha = this.touchControlAlpha();
    const visibleSize = Math.max(62, size - 14);
    const circle = this.add
      .circle(0, 0, visibleSize / 2, color, baseAlpha)
      .setStrokeStyle(3, 0xffffff, 0.62);
    const text = this.add
      .text(0, 0, label, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '17px',
        color: '#ffffff',
        fontStyle: '900'
      })
      .setOrigin(0.5);
    const hitZone = this.add.zone(0, 0, size, size).setInteractive({ useHandCursor: true });

    const beginAction = () => {
      this.startRunFromInput();
      if (this.canUseLadder()) {
        this.touchClimbDirection = direction;
        this.startClimb(direction);
        circle.setAlpha(CONTROL_ALPHA_PRESSED);
        circle.setScale(1.04);
        return;
      }

      circle.setAlpha(CONTROL_ALPHA_PRESSED);
      circle.setScale(1.04);
      if (direction < 0) {
        this.jump();
      } else {
        this.startSlide();
      }
    };
    const endAction = () => {
      if (this.touchClimbDirection === direction) {
        this.touchClimbDirection = 0;
      }
      circle.setAlpha(baseAlpha);
      circle.setScale(1);
    };

    container.add([circle, text, hitZone]);
    hitZone.on('pointerdown', beginAction);
    hitZone.on('pointerup', endAction);
    hitZone.on('pointerout', endAction);
    hitZone.on('pointerupoutside', endAction);
  }

  private createMoveButton(
    x: number,
    y: number,
    size: number,
    label: string,
    color: number,
    direction: -1 | 1
  ): void {
    const container = this.add.container(x, y).setScrollFactor(0).setDepth(30);
    const baseAlpha = this.touchControlAlpha();
    const visibleSize = Math.max(60, size - 14);
    const circle = this.add
      .circle(0, 0, visibleSize / 2, color, baseAlpha)
      .setStrokeStyle(3, 0xffffff, 0.62);
    const text = this.add
      .text(0, 0, label, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '17px',
        color: '#ffffff',
        fontStyle: '900'
      })
      .setOrigin(0.5);
    const hitZone = this.add.zone(0, 0, size, size).setInteractive({ useHandCursor: true });

    const beginMove = () => {
      this.startRunFromInput();
      this.touchMoveDirection = direction;
      circle.setAlpha(CONTROL_ALPHA_PRESSED);
      circle.setScale(1.04);
    };
    const endMove = () => {
      if (this.touchMoveDirection === direction) {
        this.touchMoveDirection = 0;
      }
      circle.setAlpha(baseAlpha);
      circle.setScale(1);
    };

    container.add([circle, text, hitZone]);
    hitZone.on('pointerdown', beginMove);
    hitZone.on('pointerup', endMove);
    hitZone.on('pointerout', endMove);
    hitZone.on('pointerupoutside', endMove);
  }

  private createControlDebugOverlay(): void {
    const params = new URLSearchParams(window.location.search);
    if (!import.meta.env.DEV && !params.has('debugControls')) {
      return;
    }

    this.controlDebugText = this.add
      .text(16, 92, '', {
        fontFamily: 'Consolas, monospace',
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: 'rgba(16,32,51,0.72)',
        padding: { x: 8, y: 6 }
      })
      .setScrollFactor(0)
      .setDepth(80);
    this.updateControlDebugOverlay();
  }

  private updateControlDebugOverlay(): void {
    if (!this.controlDebugText) {
      return;
    }

    this.controlDebugText.setText([
      `run=${this.runStarted} moved=${this.hasMoved}`,
      `move=${this.touchMoveDirection} climb=${this.touchClimbDirection}`,
      `slide=${this.sliding} climbState=${this.climbing}`,
      `vy=${Math.round(this.verticalVelocity)} held=${this.heldPower ?? 'none'} ready=${this.powerReady}`
    ]);
  }

  private handleKeyboardInput(): void {
    const wantsUp = this.isDown(this.cursors?.up) || this.isDown(this.keyJumpW);
    const wantsDown = this.isDown(this.cursors?.down) || this.isDown(this.keySlide);
    const wantsHorizontal =
      this.isDown(this.cursors?.left) ||
      this.isDown(this.cursors?.right) ||
      this.isDown(this.keyMoveLeftA) ||
      this.isDown(this.keyMoveRightD);

    if (!this.runStarted && (wantsUp || wantsDown || wantsHorizontal || this.isDown(this.keyPower))) {
      this.startRunFromInput();
    }

    if ((wantsUp || wantsDown) && this.canUseLadder()) {
      this.startClimb(wantsUp ? -1 : 1);
      return;
    }

    if (this.justDown(this.cursors?.up) || this.justDown(this.keyJumpW)) {
      this.jump();
    }

    if (this.justDown(this.cursors?.down) || this.justDown(this.keySlide)) {
      this.startSlide();
    }

    if (this.justDown(this.keyPower)) {
      this.usePower();
    }
  }

  private justDown(key?: Phaser.Input.Keyboard.Key): boolean {
    return Boolean(key && Phaser.Input.Keyboard.JustDown(key));
  }

  private jump(): void {
    if (!this.runStarted) {
      this.startRunFromInput();
    }

    if (this.canUseLadder()) {
      this.startClimb(-1);
      return;
    }

    this.startRunClock();
    this.lastJumpAt = this.elapsedMs;
    this.resolveNearbyObstaclesForAction('jump');
    this.collectNearbyThrustersForAction('jump');

    if (this.onGround) {
      const jumpSurfaceY = this.catSurfaceY();
      this.verticalVelocity = CAT_JUMP_VELOCITY;
      this.onGround = false;
      this.currentSurfaceY = jumpSurfaceY;
      this.setCatPose('catJump');
    }
  }

  private startSlide(): void {
    if (!this.runStarted) {
      this.startRunFromInput();
    }

    if (this.canUseLadder()) {
      this.startClimb(1);
      return;
    }

    this.startRunClock();
    this.lastSlideAt = this.elapsedMs;
    this.resolveNearbyObstaclesForAction('slide');
    this.collectNearbyThrustersForAction('slide');

    if (this.sliding) {
      this.cat.x = Phaser.Math.Clamp(this.cat.x + 12, this.startX, this.worldWidth - 40);
      return;
    }

    this.sliding = true;
    this.cat.x = Phaser.Math.Clamp(this.cat.x + 22, this.startX, this.worldWidth - 40);
    this.setCatPose('catSlide');

    this.time.delayedCall(680, () => {
      this.sliding = false;
      this.restoreMovementCatPose();
    });
  }

  private usePower(): void {
    if (!this.runStarted) {
      this.startRunFromInput();
    }

    this.startRunClock();
    if (!this.powerReady || !this.heldPower) {
      this.pulsePowerHud();
      return;
    }

    const power = this.heldPower;
    const powerDirection = this.facingDirection;
    const powerStartX = this.cat.x;
    const powerStartY = this.cat.y;
    this.lastPowerAt = this.elapsedMs;
    this.resolveNearbyObstaclesForAction('power');
    this.collectNearbyThrustersForAction('power');
    this.powerReady = false;
    this.activePower = true;
    this.activePowerType = power;
    this.invincible = true;
    this.powerIcon?.setTexture(power);
    this.setPowerIconSize();
    this.powerText?.setText(this.powerStatusText('active', power));
    this.updatePowerAvailabilityVisual();

    switch (power) {
      case 'rook': {
        const targetX = Phaser.Math.Clamp(
          powerStartX + ROOK_POWER_DASH_DISTANCE * powerDirection,
          this.startX,
          this.worldWidth - 40
        );
        this.cat.x = targetX;
        this.cat.setFlipX(powerDirection < 0);
        this.clearPowerCorridor(powerStartX, targetX, powerStartY, this.cat.y);
        this.flashCat(0xffd23f);
        break;
      }
      case 'knight':
        if (!this.launchKnightToNextPlatform(powerDirection)) {
          this.currentSurfaceY = this.catSurfaceY();
          this.verticalVelocity = CAT_POWER_JUMP_VELOCITY;
          this.onGround = false;
          this.climbing = false;
          this.clearPowerCorridor(powerStartX, this.cat.x, powerStartY, this.cat.y - 240);
        }
        this.flashCat(0x27b6a5);
        break;
      case 'bishop': {
        const targetX = Phaser.Math.Clamp(
          powerStartX + BISHOP_POWER_DASH_DISTANCE * powerDirection,
          this.startX,
          this.worldWidth - 40
        );
        this.currentSurfaceY = this.catSurfaceY();
        this.verticalVelocity = CAT_BISHOP_JUMP_VELOCITY;
        this.onGround = false;
        this.climbing = false;
        this.cat.x = targetX;
        this.cat.setFlipX(powerDirection < 0);
        this.clearPowerCorridor(powerStartX, targetX, powerStartY, this.cat.y - 260);
        this.flashCat(0x6f64d9);
        break;
      }
      case 'queen':
        this.launchQueenCharge(powerDirection, powerStartX, powerStartY);
        this.flashCat(0xf05f73);
        break;
    }

    this.collectNearbyThrustersForAction('power');

    this.time.delayedCall(power === 'queen' ? 1800 : 950, () => {
      this.activePower = false;
      this.activePowerType = undefined;
      this.invincible = false;
      this.heldPower = undefined;
      this.powerIcon?.setTexture(this.currentPowerup());
      this.setPowerIconSize();
      this.powerText?.setText(this.powerStatusText('empty'));
      this.updatePowerAvailabilityVisual();
    });
  }

  private launchKnightToNextPlatform(direction: -1 | 1): boolean {
    const catSurfaceY = this.catSurfaceY();
    const startX = this.cat.x;
    const startY = this.cat.y;
    const targetPlatform = this.level.platforms
      .filter((platform) => platform.y < catSurfaceY - 90)
      .sort((a, b) => b.y - a.y)[0];

    if (!targetPlatform) {
      return false;
    }

    const minX = targetPlatform.x - targetPlatform.width / 2 + 76;
    const maxX = targetPlatform.x + targetPlatform.width / 2 - 76;
    const targetX = Phaser.Math.Clamp(this.cat.x + KNIGHT_PLATFORM_X_OFFSET * direction, minX, maxX);
    const targetY = targetPlatform.y - this.catFootOffset();

    this.powerTraveling = true;
    this.climbing = false;
    this.sliding = false;
    this.onGround = false;
    this.verticalVelocity = 0;
    this.setCatPose('catJumpFrame1');
    this.cat.setFlipX(direction < 0);

    this.tweens.killTweensOf(this.cat);
    this.tweens.add({
      targets: this.cat,
      x: targetX,
      y: targetY,
      duration: KNIGHT_TRAVEL_MS,
      ease: 'Cubic.easeOut',
      onUpdate: () => this.clearPowerCorridor(startX, this.cat.x, startY, this.cat.y),
      onComplete: () => {
        this.currentSurfaceY = targetPlatform.y;
        this.cat.y = targetY;
        this.onGround = true;
        this.verticalVelocity = 0;
        this.powerTraveling = false;
        this.restoreMovementCatPose();
        this.clearPowerCorridor(startX, targetX, startY, targetY);
        this.collectNearbyThrustersForAction('power');
      }
    });

    return true;
  }

  private launchQueenCharge(direction: -1 | 1, startX: number, startY: number): void {
    const targetX = Phaser.Math.Clamp(startX + QUEEN_POWER_CHARGE_DISTANCE * direction, this.startX, this.worldWidth - 40);

    this.powerTraveling = true;
    this.climbing = false;
    this.sliding = false;
    this.verticalVelocity = 0;
    this.setCatPose('catJumpFrame4');
    this.cat.setFlipX(direction < 0);

    this.tweens.killTweensOf(this.cat);
    this.tweens.add({
      targets: this.cat,
      x: targetX,
      duration: QUEEN_POWER_CHARGE_MS,
      ease: 'Cubic.easeOut',
      onUpdate: () => this.clearPowerCorridor(startX, this.cat.x, startY, this.cat.y),
      onComplete: () => {
        this.powerTraveling = false;
        this.clearPowerCorridor(startX, targetX, startY, this.cat.y);
        this.restoreMovementCatPose();
      }
    });
  }

  private checkPowerBadgeOverlaps(): void {
    for (const badge of this.powerBadges) {
      if (badge.collected) {
        continue;
      }

      const distance = Phaser.Math.Distance.Between(this.cat.x, this.cat.y, badge.sprite.x, badge.sprite.y);
      if (distance > POWER_BADGE_PICKUP_RADIUS) {
        continue;
      }

      this.collectPowerBadge(badge);
      return;
    }
  }

  private collectPowerBadge(badge: PowerBadgeObject): void {
    const swapped = Boolean(this.heldPower && this.heldPower !== badge.power);
    badge.collected = true;
    this.heldPower = badge.power;
    this.powerReady = true;
    this.powerIcon?.setTexture(badge.power);
    this.setPowerIconSize();
    this.powerText?.setText(this.powerStatusText('ready', badge.power));
    this.updatePowerAvailabilityVisual();
    this.pulsePowerHud();
    this.showScorePopup(
      badge.sprite.x,
      badge.sprite.y - 70,
      swapped ? `${this.powerLabel(badge.power)} swapped` : `${this.powerLabel(badge.power)} ready`,
      0xffd23f
    );

    this.tweens.killTweensOf([badge.sprite, badge.ring]);
    this.tweens.add({
      targets: [badge.sprite, badge.ring],
      alpha: 0,
      scale: 1.35,
      duration: 260,
      ease: 'Quad.easeOut',
      onComplete: () => {
        badge.sprite.destroy();
        badge.ring.destroy();
      }
    });
  }

  private checkLevelComplete(): void {
    if (this.activeBakingStation) {
      return;
    }

    const finish = this.level.finish;
    if (finish) {
      const atFinish =
        Math.abs(this.cat.x - finish.x) <= finish.width / 2 && Math.abs(this.catSurfaceY() - finish.y) <= 95;
      if (!atFinish) {
        return;
      }
    } else if (this.cat.x < this.level.trackLength) {
      return;
    }

    this.completed = true;
    this.launchLevelClearSequence();
  }

  private launchLevelClearSequence(): void {
    this.touchMoveDirection = 0;
    this.touchClimbDirection = 0;
    this.climbing = false;
    this.sliding = false;
    this.verticalVelocity = 0;
    this.onGround = true;
    this.setCatPose('catVictory');
    this.flashCat(0xffd23f);

    const finishX = this.level.finish?.x ?? this.cat.x;
    const finishY = this.level.finish?.y ?? this.currentSurfaceY;
    const banner = this.add
      .text(finishX, finishY - 170, 'Level Clear!', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '42px',
        color: '#102033',
        fontStyle: '900',
        backgroundColor: 'rgba(255, 236, 159, 0.94)',
        padding: { x: 22, y: 10 }
      })
      .setOrigin(0.5)
      .setDepth(30);
    banner.setStroke('#ffffff', 6);

    const sparkleTargets: Phaser.GameObjects.GameObject[] = [banner];
    for (let index = 0; index < 12; index += 1) {
      const sparkle = this.add
        .star(
          finishX + Phaser.Math.Between(-150, 150),
          finishY - Phaser.Math.Between(80, 230),
          5,
          5,
          16,
          index % 2 === 0 ? 0xffd23f : 0x27b6a5,
          0.96
        )
        .setDepth(29);
      sparkleTargets.push(sparkle);
      this.tweens.add({
        targets: sparkle,
        y: sparkle.y - Phaser.Math.Between(35, 95),
        alpha: 0,
        duration: 980,
        ease: 'Quad.easeOut',
        onComplete: () => sparkle.destroy()
      });
    }

    this.tweens.add({
      targets: this.cat,
      y: this.cat.y - 34,
      duration: 360,
      yoyo: true,
      repeat: 1,
      ease: 'Sine.easeInOut'
    });

    this.time.delayedCall(1250, () => {
      sparkleTargets.forEach((target) => {
        if ('destroy' in target) {
          target.destroy();
        }
      });
      this.showBakeOffLoading('Loading Bake-Off...');
      this.launchEndBakeOff();
    });
  }

  private launchEndBakeOff(): void {
    this.activeBakingStation = true;
    const actionScore = this.currentScore();
    const station = this.buildEndBakeOffStation();
    const completion = this.buildLevelCompletionSnapshot(actionScore);
    const transitionId = `${this.level.id}-bakeoff-${Date.now()}-${Phaser.Math.Between(1000, 9999)}`;
    this.bakeOffTransitionId = transitionId;

    this.bakeOffReadyHandler = (payload: BakeOffReadyPayload) => {
      if (payload.transitionId !== transitionId) {
        return;
      }

      this.clearBakeOffStartupGuard();
    };
    this.game.events.on(BAKEOFF_READY_EVENT, this.bakeOffReadyHandler);
    this.bakeOffStartupTimer = this.time.delayedCall(BAKEOFF_STARTUP_TIMEOUT_MS, () => {
      this.recoverFromBakeOffStartupFailure(transitionId, completion);
    });

    this.time.delayedCall(120, () => {
      if (this.bakeOffTransitionId !== transitionId) {
        return;
      }

      try {
        this.scene.stop('BakingMiniGameScene');
        this.scene.launch('BakingMiniGameScene', {
          station,
          stationNumber: this.level.index + 1,
          actionScore,
          levelTitle: this.level.title,
          completion,
          transitionId
        });
        this.scene.bringToTop('BakingMiniGameScene');
      } catch (error) {
        console.error('Bake-off scene failed to launch.', error);
        this.recoverFromBakeOffStartupFailure(transitionId, completion);
      }
    });
  }

  private clearBakeOffStartupGuard(): void {
    if (this.bakeOffStartupTimer) {
      this.bakeOffStartupTimer.remove(false);
      this.bakeOffStartupTimer = undefined;
    }

    if (this.bakeOffReadyHandler) {
      this.game.events.off(BAKEOFF_READY_EVENT, this.bakeOffReadyHandler);
      this.bakeOffReadyHandler = undefined;
    }

    this.bakeOffTransitionId = undefined;
  }

  private recoverFromBakeOffStartupFailure(transitionId: string, completion: LevelCompletionSnapshot): void {
    if (this.bakeOffTransitionId !== transitionId) {
      return;
    }

    this.clearBakeOffStartupGuard();
    this.showBakeOffLoading('Bake-Off had trouble loading.\nSaving Sergio\'s score...');
    this.scene.stop('BakingMiniGameScene');

    const summary = buildFallbackLevelCompletionSummary(completion);
    const summaries = (this.registry.get('scoreSummaries') ?? []) as ScoreSummary[];
    this.registry.set('scoreSummaries', upsertLevelCompletionSummary(summaries, summary));

    this.time.delayedCall(500, () => {
      this.scene.start('ResultsScene', { levelIndex: this.level.index, summary });
    });
  }

  private buildLevelCompletionSnapshot(actionScore: number): LevelCompletionSnapshot {
    return {
      level: this.level,
      activeElapsedMs: this.elapsedMs,
      hintsUsed: this.hintsUsed,
      obstacleHits: this.obstacleHits,
      obstacleClears: this.obstacleClears,
      thrustersCollected: this.thrustersCollected.size,
      totalThrusters: this.level.pointThrusters.length,
      maxCombo: this.maxCombo,
      obstaclePoints: this.obstaclePoints,
      thrusterPoints: this.thrusterPoints,
      mathPoints: this.mathPoints,
      comboBonus: this.comboBonus,
      penaltyPoints: this.penaltyPoints,
      actionScore
    };
  }

  private showBakeOffLoading(message: string): void {
    if (!this.bakeOffLoadingText) {
      this.add
        .rectangle(640, 360, 620, 170, 0xfffcf1, 0.96)
        .setStrokeStyle(6, 0xffd23f, 0.96)
        .setScrollFactor(0)
        .setDepth(70);
      this.add.rectangle(646, 370, 620, 170, 0x102033, 0.18).setScrollFactor(0).setDepth(69);
      this.bakeOffLoadingText = this.add
        .text(640, 360, message, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '30px',
          color: '#102033',
          fontStyle: '900',
          align: 'center',
          wordWrap: { width: 520 }
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(71);
      return;
    }

    this.bakeOffLoadingText.setText(message);
  }

  private buildEndBakeOffStation(): BakingStationDefinition {
    const recipes: BakingStationDefinition['recipe'][] = [
      ['frosting', 'sprinkles', 'berry'],
      ['frosting', 'berry', 'sprinkles', 'candle'],
      ['berry', 'frosting', 'candle', 'sprinkles']
    ];

    return {
      id: `${this.level.id}-final-bake-off`,
      x: this.level.finish?.x ?? this.level.trackLength,
      y: this.level.finish?.y ?? this.groundY,
      label: `${this.level.title} Bake-Off`,
      recipe: recipes[this.level.index] ?? recipes[0],
      value: 0,
      perfectBonus: 0
    };
  }

  private handleObstacleOverlap(obstacle: ObstacleDefinition): void {
    if (this.invincible || this.obstacleResolvedIds.has(obstacle.id)) {
      if (this.invincible) {
        this.clearObstacleWithPower(obstacle);
      }
      return;
    }

    if (this.isObstacleClearedByAction(obstacle.kind)) {
      this.obstacleResolvedIds.add(obstacle.id);
      this.awardObstacleClear(obstacle);
      return;
    }

    this.obstacleResolvedIds.add(obstacle.id);
    this.obstacleHits += 1;
    this.breakCombo();
    this.applyPointPenalty(OBSTACLE_HIT_PENALTY_POINTS, 'Bump');
    this.cat.x -= 24;
    this.bumpFeedbackStartedAt = this.elapsedMs;
    this.bumpFeedbackUntil = this.elapsedMs + 430;
    this.setCatPose('catBump1');
    this.cat.setTint(0xf05f73);
    this.cameras.main.shake(150, 0.006);
    this.time.delayedCall(430, () => {
      this.cat.clearTint();
      this.restoreMovementCatPose();
    });
  }

  private applyHorizontalMovement(delta: number): void {
    if (this.powerTraveling) {
      return;
    }

    if (this.climbing) {
      return;
    }

    const direction = this.getMoveDirection();
    if (direction === 0) {
      return;
    }

    const baseSpeed = direction > 0 ? CAT_BASE_SPEED : CAT_BACK_SPEED;
    const speed = this.activePower && this.activePowerType === 'rook' ? 520 : baseSpeed;
    this.cat.x = Phaser.Math.Clamp(this.cat.x + (direction * speed * delta) / 1000, 48, this.worldWidth - 48);
    this.facingDirection = direction;
    this.cat.setFlipX(direction < 0);
  }

  private getMoveDirection(): -1 | 0 | 1 {
    if (this.touchMoveDirection !== 0) {
      return this.touchMoveDirection as -1 | 1;
    }

    if (this.isDown(this.cursors?.right) || this.isDown(this.keyMoveRightD)) {
      return 1;
    }

    if (this.isDown(this.cursors?.left) || this.isDown(this.keyMoveLeftA)) {
      return -1;
    }

    return 0;
  }

  private isDown(key?: Phaser.Input.Keyboard.Key): boolean {
    return Boolean(key?.isDown);
  }

  private getClimbDirection(): -1 | 0 | 1 {
    if (this.touchClimbDirection !== 0) {
      return this.touchClimbDirection as -1 | 1;
    }

    if (this.isDown(this.cursors?.up) || this.isDown(this.keyJumpW)) {
      return -1;
    }

    if (this.isDown(this.cursors?.down) || this.isDown(this.keySlide)) {
      return 1;
    }

    return 0;
  }

  private startRunClock(): void {
    this.hasMoved = true;
  }

  private isObstacleClearedByAction(kind: ObstacleDefinition['kind']): boolean {
    const jumpIsActive =
      (!this.onGround && this.catSurfaceY() < this.currentSurfaceY - 38) ||
      this.actionIsFresh(this.lastJumpAt, JUMP_ACTION_GRACE_MS / 2);
    const slideIsFresh = this.sliding || this.actionIsFresh(this.lastSlideAt, SLIDE_ACTION_GRACE_MS);
    const powerIsFresh = this.activePower || this.actionIsFresh(this.lastPowerAt, POWER_ACTION_GRACE_MS);

    switch (kind) {
      case 'lowBarrier':
      case 'swing':
        return slideIsFresh;
      case 'cakeWall':
        return powerIsFresh;
      case 'hurdle':
      case 'frostingPit':
        return jumpIsActive;
    }
  }

  private actionIsFresh(actionTime: number, graceMs: number): boolean {
    return this.elapsedMs - actionTime <= graceMs;
  }

  private resolveNearbyObstaclesForAction(action: ActionType): void {
    for (const obstacle of this.obstacles) {
      const distance = obstacle.definition.x - this.cat.x;
      if (distance < -ACTION_CLEAR_BEHIND || distance > ACTION_CLEAR_AHEAD) {
        continue;
      }

      if (this.obstacleResolvedIds.has(obstacle.definition.id)) {
        continue;
      }

      if (Math.abs(obstacle.sprite.y - this.cat.y) > 170) {
        continue;
      }

      if (this.actionMatchesObstacle(action, obstacle.definition.kind)) {
        if (action === 'power') {
          this.clearObstacleWithPower(obstacle.definition);
        } else {
          this.obstacleResolvedIds.add(obstacle.definition.id);
          this.awardObstacleClear(obstacle.definition);
        }
        return;
      }
    }
  }

  private actionMatchesObstacle(action: ActionType, kind: ObstacleDefinition['kind']): boolean {
    if (action === 'power') {
      return true;
    }

    if (action === 'slide') {
      return kind === 'lowBarrier' || kind === 'swing';
    }

    return kind === 'hurdle' || kind === 'frostingPit';
  }

  private clearPowerCorridor(startX: number, endX: number, startY: number, endY: number): void {
    const minX = Math.min(startX, endX) - POWER_SWEEP_X_PADDING;
    const maxX = Math.max(startX, endX) + POWER_SWEEP_X_PADDING;
    const minY = Math.min(startY, endY) - POWER_SWEEP_Y_PADDING;
    const maxY = Math.max(startY, endY) + POWER_SWEEP_Y_PADDING;

    for (const obstacle of this.obstacles) {
      if (
        obstacle.sprite.x >= minX &&
        obstacle.sprite.x <= maxX &&
        obstacle.sprite.y >= minY &&
        obstacle.sprite.y <= maxY
      ) {
        this.clearObstacleWithPower(obstacle.definition);
      }
    }

    for (const thruster of this.thrusters) {
      if (
        thruster.definition.x >= minX &&
        thruster.definition.x <= maxX &&
        thruster.definition.y >= minY &&
        thruster.definition.y <= maxY
      ) {
        this.collectThruster(thruster);
      }
    }
  }

  private clearObstacleWithPower(obstacle: ObstacleDefinition): void {
    if (this.obstacleResolvedIds.has(obstacle.id)) {
      return;
    }

    this.obstacleResolvedIds.add(obstacle.id);
    this.awardObstacleClear(obstacle, 'Power smash!');
  }

  private awardObstacleClear(obstacle: ObstacleDefinition, label = 'Clear!'): void {
    this.obstacleClears += 1;
    this.awardSkillPoints(OBSTACLE_CLEAR_POINTS, 'obstacle', obstacle.x, this.cat.y - 80, label);
  }

  private awardSkillPoints(
    basePoints: number,
    bucket: 'obstacle' | 'thruster' | 'baking',
    x: number,
    y: number,
    label: string
  ): void {
    this.combo += 1;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    const comboPoints = Math.max(0, this.combo - 1) * 50;
    this.addPoints(basePoints, bucket);

    if (comboPoints > 0) {
      this.addPoints(comboPoints, 'combo');
    }

    const total = basePoints + comboPoints;
    const comboLabel = comboPoints > 0 ? ` Combo x${this.combo}` : '';
    const color = bucket === 'thruster' ? 0xffd23f : bucket === 'baking' ? 0xff9ec7 : 0x38a16d;
    this.showScorePopup(x, y, `+${total} ${label}${comboLabel}`, color);
  }

  private addPoints(amount: number, bucket: 'obstacle' | 'thruster' | 'math' | 'baking' | 'combo'): void {
    switch (bucket) {
      case 'obstacle':
        this.obstaclePoints += amount;
        break;
      case 'thruster':
        this.thrusterPoints += amount;
        break;
      case 'math':
        this.mathPoints += amount;
        break;
      case 'baking':
        this.bakingPoints += amount;
        break;
      case 'combo':
        this.comboBonus += amount;
        break;
    }
  }

  private applyPointPenalty(points: number, label: string): void {
    const appliedPoints = calculateAppliedPenalty(this.currentScore(), points);
    this.penaltyPoints += appliedPoints;
    this.showScorePopup(this.cat.x, this.cat.y - 130, `${label} -${appliedPoints}`, 0xf05f73);
  }

  private breakCombo(): void {
    this.combo = 0;
  }

  private actionMatchesThruster(action: ActionType, thruster: PointThrusterDefinition): boolean {
    if (action === 'power') {
      return true;
    }

    return !thruster.requiredAction || thruster.requiredAction === action;
  }

  private thrusterActionIsActive(thruster: PointThrusterDefinition): boolean {
    if (this.activePower) {
      return true;
    }

    switch (thruster.requiredAction) {
      case undefined:
        return true;
      case 'jump':
        return this.actionIsFresh(this.lastJumpAt, JUMP_ACTION_GRACE_MS) || this.catSurfaceY() < this.currentSurfaceY - 45;
      case 'slide':
        return this.sliding || this.actionIsFresh(this.lastSlideAt, SLIDE_ACTION_GRACE_MS);
      case 'power':
        return this.activePower || this.actionIsFresh(this.lastPowerAt, POWER_ACTION_GRACE_MS);
    }
  }

  private collectNearbyThrustersForAction(action: ActionType): void {
    for (const thruster of this.thrusters) {
      if (this.thrustersCollected.has(thruster.definition.id) || !this.actionMatchesThruster(action, thruster.definition)) {
        continue;
      }

      const distance = Phaser.Math.Distance.Between(this.cat.x, this.cat.y, thruster.definition.x, thruster.definition.y);
      if (distance <= this.thrusterRadius(thruster.definition) + 90) {
        this.collectThruster(thruster);
      }
    }
  }

  private collectThruster(thruster: ThrusterObject): void {
    if (this.thrustersCollected.has(thruster.definition.id)) {
      return;
    }

    this.thrustersCollected.add(thruster.definition.id);
    this.awardSkillPoints(
      thruster.definition.value,
      'thruster',
      thruster.definition.x,
      thruster.definition.y - 56,
      'Pastry!'
    );

    const fadeTargets = [thruster.ring, thruster.core, ...thruster.sprinkles];
    this.tweens.killTweensOf(fadeTargets);
    this.tweens.add({
      targets: fadeTargets,
      alpha: 0,
      scale: 1.45,
      duration: 260,
      ease: 'Quad.easeOut',
      onComplete: () => {
        thruster.ring.destroy();
        thruster.core.destroy();
        thruster.sprinkles.forEach((sprinkle) => sprinkle.destroy());
      }
    });
  }

  private thrusterColor(thruster: PointThrusterDefinition): number {
    switch (thruster.kind) {
      case 'risky':
        return 0xf05f73;
      case 'multiplier':
        return 0x6f64d9;
      case 'medium':
        return 0xffd23f;
      case 'small':
      case undefined:
        return 0x27b6a5;
    }
  }

  private thrusterRadius(thruster: PointThrusterDefinition): number {
    switch (thruster.kind) {
      case 'risky':
        return 34;
      case 'multiplier':
        return 38;
      case 'medium':
        return 30;
      case 'small':
      case undefined:
        return 28;
    }
  }

  private pickupAssetKey(action: ActionType = 'jump'): AssetKey {
    return PICKUP_ASSET_BY_ACTION[action] ?? 'treat-cupcake-base';
  }

  private touchControlAlpha(): number {
    return this.sys.game.device.input.touch ? CONTROL_ALPHA_TOUCH : CONTROL_ALPHA_DESKTOP;
  }

  private updatePowerAvailabilityVisual(): void {
    const hasReadyPower = this.powerReady && Boolean(this.heldPower);
    this.powerButtonGlow?.setVisible(hasReadyPower);
    this.powerButtonGlow?.setScale(1);
    this.powerButtonCircle?.setScale(1);
    this.powerButtonCircle?.setAlpha(hasReadyPower ? 0.82 : Math.max(0.18, this.touchControlAlpha() * 0.74));
    this.powerButtonCircle?.setStrokeStyle(hasReadyPower ? 4 : 3, hasReadyPower ? 0xffd23f : 0xffffff, hasReadyPower ? 0.92 : 0.32);
    this.powerIcon?.setAlpha(hasReadyPower || Boolean(this.heldPower) ? 1 : 0.5);
  }

  private pulsePowerHud(): void {
    this.powerButtonGlow?.setVisible(true);
    this.powerButtonGlow?.setAlpha(this.powerReady ? 0.3 : 0.16);
    const targets = [this.powerIcon, this.powerButtonGlow].filter(Boolean);
    this.tweens.add({
      targets,
      scale: { from: 1, to: 1.1 },
      duration: 150,
      yoyo: true,
      repeat: 1,
      ease: 'Sine.easeInOut',
      onComplete: () => this.updatePowerAvailabilityVisual()
    });
  }

  private showScorePopup(x: number, y: number, message: string, color: number): void {
    const feedback = this.add
      .text(x, y, message, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: '900',
        backgroundColor: Phaser.Display.Color.IntegerToColor(color).rgba,
        padding: { x: 10, y: 5 }
      })
      .setOrigin(0.5)
      .setDepth(25);

    this.tweens.add({
      targets: feedback,
      y: feedback.y - 36,
      alpha: 0,
      duration: 520,
      ease: 'Quad.easeOut',
      onComplete: () => feedback.destroy()
    });
  }

  private applyClimbMovement(delta: number): void {
    if (this.powerTraveling) {
      return;
    }

    const direction = this.getClimbDirection();

    if (!this.climbing && direction !== 0 && this.canUseLadder()) {
      this.startClimb(direction);
    }

    if (!this.climbing) {
      return;
    }

    const ladder = this.nearestLadder({ ignoreLockout: true });
    if (!ladder) {
      this.climbing = false;
      return;
    }

    if (direction === 0) {
      this.verticalVelocity = 0;
      return;
    }

    const footOffset = this.catFootOffset();
    const topCatY = ladder.yTop - footOffset;
    const bottomCatY = ladder.yBottom - footOffset;
    this.cat.x = Phaser.Math.Linear(this.cat.x, ladder.x, 0.28);
    this.cat.y = Phaser.Math.Clamp(this.cat.y + (direction * CLIMB_SPEED * delta) / 1000, topCatY, bottomCatY);
    this.verticalVelocity = 0;
    this.onGround = false;
    this.startRunClock();
    this.collectNearbyThrustersForAction('jump');

    if (this.cat.y <= topCatY + 2) {
      this.cat.y = topCatY;
      this.currentSurfaceY = ladder.yTop;
      this.climbing = false;
      this.onGround = true;
      this.lockLadderGrab();
      this.restoreMovementCatPose();
    } else if (this.cat.y >= bottomCatY - 2) {
      this.cat.y = bottomCatY;
      this.currentSurfaceY = ladder.yBottom;
      this.climbing = false;
      this.onGround = true;
      this.lockLadderGrab();
      this.restoreMovementCatPose();
    } else {
      this.setCatPose('catJump');
    }
  }

  private canUseLadder(): boolean {
    return Boolean(this.nearestLadder());
  }

  private startClimb(_direction: -1 | 1): void {
    const ladder = this.nearestLadder();
    if (!ladder) {
      return;
    }

    this.startRunFromInput();
    this.climbing = true;
    this.sliding = false;
    this.onGround = false;
    this.verticalVelocity = 0;
    this.cat.x = Phaser.Math.Linear(this.cat.x, ladder.x, 0.45);
    this.setCatPose('catJump');
  }

  private lockLadderGrab(): void {
    this.ladderGrabLockedUntil = this.elapsedMs + LADDER_EXIT_LOCKOUT_MS;
  }

  private nearestLadder(options: { ignoreLockout?: boolean } = {}): CourseLadderDefinition | undefined {
    if (!this.climbing && !options.ignoreLockout && this.elapsedMs < this.ladderGrabLockedUntil) {
      return undefined;
    }

    const catSurfaceY = this.catSurfaceY();

    return (this.level.ladders ?? []).find(
      (ladder) =>
        Math.abs(this.cat.x - ladder.x) <= LADDER_GRAB_X_TOLERANCE &&
        catSurfaceY >= Math.min(ladder.yTop, ladder.yBottom) - LADDER_GRAB_Y_TOLERANCE &&
        catSurfaceY <= Math.max(ladder.yTop, ladder.yBottom) + LADDER_GRAB_Y_TOLERANCE
    );
  }

  private catSurfaceY(): number {
    return this.cat.y + this.catFootOffset();
  }

  private catFootOffset(): number {
    return Math.max(34, this.cat.displayHeight / 2 - this.catVisibleBottomPadding());
  }

  private catVisibleBottomPadding(): number {
    return CAT_VISIBLE_BOTTOM_PADDING[this.currentCatPose ?? 'cat'] ?? 12;
  }

  private applyManualGravity(delta: number): void {
    if (this.powerTraveling) {
      return;
    }

    if (this.climbing) {
      return;
    }

    if (this.onGround && !this.hasSurfaceSupport(this.currentSurfaceY)) {
      this.onGround = false;
      this.verticalVelocity = 0;
    }

    const previousY = this.cat.y;

    if (!this.onGround) {
      this.verticalVelocity += (GRAVITY * delta) / 1000;
      this.cat.y += (this.verticalVelocity * delta) / 1000;
    }

    const landingSurfaceY = this.getLandingSurfaceY(previousY);
    if (landingSurfaceY !== undefined) {
      this.currentSurfaceY = landingSurfaceY;
      this.cat.y = landingSurfaceY - this.catFootOffset();
      this.verticalVelocity = 0;
      this.onGround = true;
      if (!this.sliding) {
        this.setCatPose('cat');
      }
    }
  }

  private animateCatMotion(time: number): void {
    if (!this.cat) {
      return;
    }

    if (this.elapsedMs <= this.bumpFeedbackUntil) {
      const frameIndex = Math.floor((this.elapsedMs - this.bumpFeedbackStartedAt) / 140) % CAT_BUMP_FRAMES.length;
      this.setCatPose(CAT_BUMP_FRAMES[Math.max(0, frameIndex)]);
      this.cat.setAngle(Math.sin(time / 60) * 8);
      return;
    }

    if (this.sliding) {
      const frame = CAT_SLIDE_FRAMES[Math.floor(time / 110) % CAT_SLIDE_FRAMES.length];
      this.setCatPose(frame);
      this.cat.setAngle(0);
      return;
    }

    if (this.climbing) {
      this.setCatPose(Math.floor(time / 140) % 2 === 0 ? 'catJumpFrame2' : 'catJumpFrame3');
      this.cat.setAngle(Math.sin(time / 85) * 5);
      return;
    }

    if (!this.onGround) {
      this.setCatPose(this.jumpFrameForVelocity());
      this.cat.setAngle(this.verticalVelocity < 0 ? -8 : 8);
      return;
    }

    if (this.getMoveDirection() !== 0) {
      const frame = CAT_RUN_FRAMES[Math.floor(time / 95) % CAT_RUN_FRAMES.length];
      this.setCatPose(frame);
      this.cat.setAngle(Math.sin(time / 85) * 4);
      return;
    }

    this.setCatPose('cat');
    this.cat.setAngle(0);
  }

  private jumpFrameForVelocity(): CatPoseKey {
    if (this.verticalVelocity < -520) {
      return 'catJumpFrame1';
    }

    if (this.verticalVelocity < -120) {
      return 'catJumpFrame2';
    }

    if (this.verticalVelocity < 260) {
      return 'catJumpFrame3';
    }

    return 'catJumpFrame4';
  }

  private getLandingSurfaceY(previousY: number): number | undefined {
    if (this.verticalVelocity < 0) {
      return undefined;
    }

    const candidates = [
      ...this.level.platforms
        .filter((platform) => this.cat.x >= platform.x - platform.width / 2 && this.cat.x <= platform.x + platform.width / 2)
        .map((platform) => platform.y),
      this.groundY
    ];

    const crossedSurfaces = candidates
      .map((surfaceY) => ({ surfaceY, catY: surfaceY - this.catFootOffset() }))
      .filter(({ catY }) => previousY <= catY && this.cat.y >= catY)
      .sort((a, b) => a.catY - b.catY);

    return crossedSurfaces[0]?.surfaceY;
  }

  private hasSurfaceSupport(surfaceY: number): boolean {
    if (surfaceY === this.groundY) {
      return true;
    }

    return this.level.platforms.some(
      (platform) =>
        platform.y === surfaceY && this.cat.x >= platform.x - platform.width / 2 && this.cat.x <= platform.x + platform.width / 2
    );
  }

  private checkObstacleOverlaps(): void {
    const catBounds = this.getTunedHitbox(this.cat, this.sliding ? CAT_SLIDE_HITBOX : CAT_HITBOX);

    for (const obstacle of this.obstacles) {
      if (this.obstacleResolvedIds.has(obstacle.definition.id)) {
        continue;
      }

      const obstacleBounds = this.getTunedHitbox(obstacle.sprite, OBSTACLE_HITBOXES[obstacle.definition.kind]);

      if (Phaser.Geom.Intersects.RectangleToRectangle(catBounds, obstacleBounds)) {
        this.handleObstacleOverlap(obstacle.definition);
      }
    }
  }

  private checkThrusterOverlaps(): void {
    const catBounds = this.getTunedHitbox(this.cat, this.sliding ? CAT_SLIDE_HITBOX : CAT_HITBOX);

    for (const thruster of this.thrusters) {
      if (this.thrustersCollected.has(thruster.definition.id)) {
        continue;
      }

      const radius = this.thrusterRadius(thruster.definition);
      const thrusterBounds = new Phaser.Geom.Rectangle(
        thruster.definition.x - radius,
        thruster.definition.y - radius,
        radius * 2,
        radius * 2
      );

      if (
        Phaser.Geom.Intersects.RectangleToRectangle(catBounds, thrusterBounds) &&
        this.thrusterActionIsActive(thruster.definition)
      ) {
        this.collectThruster(thruster);
      }
    }
  }

  private currentScore(): number {
    return calculateScoreFromLedger({
      obstaclePoints: this.obstaclePoints,
      thrusterPoints: this.thrusterPoints,
      mathPoints: this.mathPoints,
      bakingPoints: this.bakingPoints,
      comboBonus: this.comboBonus,
      penaltyPoints: this.penaltyPoints
    });
  }

  private updateHud(): void {
    this.timerText?.setText(`Time ${formatTime(this.elapsedMs)}`);
    this.scoreText?.setText(`Score ${formatScore(this.currentScore())}`);
    this.comboText?.setText(`Combo x${this.combo}`);
    this.progressText?.setText(
      `Treats ${this.thrustersCollected.size}/${this.level.pointThrusters.length}  Hits ${this.obstacleHits}`
    );
  }

  private getObstacleY(obstacle: ObstacleDefinition): number {
    if (obstacle.y !== undefined) {
      return obstacle.y;
    }

    switch (obstacle.kind) {
      case 'lowBarrier':
        return this.groundY - 142;
      case 'swing':
        return this.groundY - 164;
      case 'frostingPit':
        return this.groundY - 34;
      case 'cakeWall':
        return this.groundY - 86;
      case 'hurdle':
        return this.groundY - 64;
    }
  }

  private getObstacleScale(kind: ObstacleDefinition['kind']): number {
    switch (kind) {
      case 'lowBarrier':
        return 1.45;
      case 'swing':
        return 1.15;
      case 'frostingPit':
        return 1.35;
      case 'cakeWall':
        return 1.25;
      case 'hurdle':
        return 1;
    }
  }

  private powerLabel(power: PowerupType): string {
    switch (power) {
      case 'rook':
        return 'Rook Dash';
      case 'knight':
        return 'Knight Jump';
      case 'bishop':
        return 'Bishop Leap';
      case 'queen':
        return 'Queen Shield';
    }
  }

  private powerStatusText(state: 'ready' | 'active' | 'empty', power = this.currentPowerup()): string {
    switch (state) {
      case 'active':
        return `${this.powerLabel(power)} active`;
      case 'ready':
        return `${this.powerLabel(power)} ready | Space`;
      case 'empty':
        return 'Find a skill badge';
    }
  }

  private currentPowerup(): PowerupType {
    return this.heldPower ?? this.level.powerup;
  }

  private flashCat(color: number): void {
    this.cat.setTint(color);
    this.time.delayedCall(180, () => this.cat.clearTint());
  }

  private startRunFromInput(markMoved = true): void {
    if (this.runStarted) {
      return;
    }

    this.runStarted = true;
    this.hasMoved = markMoved;
    this.countdownText?.destroy();
    this.countdownText = undefined;
  }

  private startCountdown(): void {
    this.countdownText = this.add
      .text(640, 350, 'Hold Run', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '58px',
        color: '#102033',
        fontStyle: '900',
        backgroundColor: 'rgba(255, 252, 236, 0.92)',
        padding: { x: 26, y: 14 }
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(35);

    this.time.delayedCall(900, () => this.countdownText?.setText('Hold Run'));
    this.time.delayedCall(COUNTDOWN_MS, () => {
      this.startRunFromInput(false);
    });
  }

  private animateObstacles(time: number): void {
    for (const obstacle of this.obstacles) {
      if (obstacle.definition.kind !== 'swing') {
        continue;
      }

      obstacle.sprite.y = obstacle.baseY + Math.sin(time / 380 + obstacle.phase) * 16;
      obstacle.sprite.angle = Math.sin(time / 430 + obstacle.phase) * 7;
    }
  }

  private getTunedHitbox(
    gameObject: Phaser.GameObjects.Components.GetBounds,
    profile: HitboxProfile
  ): Phaser.Geom.Rectangle {
    const bounds = gameObject.getBounds();
    const width = bounds.width * profile.widthRatio;
    const height = bounds.height * profile.heightRatio;
    const x = bounds.centerX - width / 2 + (profile.offsetX ?? 0);
    const y = bounds.centerY - height / 2 + (profile.offsetY ?? 0);

    return new Phaser.Geom.Rectangle(x, y, width, height);
  }

  private levelThemeKey(): 'yarn' | 'bakery' | 'tower' {
    switch (this.level.id) {
      case 'frosting-factory':
        return 'bakery';
      case 'birthday-beast-tower':
        return 'tower';
      case 'yarn-yard':
      default:
        return 'yarn';
    }
  }

  private levelAssetKeys(): AssetKey[] {
    const keys = new Set<AssetKey>([
      'cat',
      'catSlide',
      'catJump',
      'catHurt',
      'catVictory',
      ...CAT_ANIMATION_ASSETS,
      'rook',
      'knight',
      'bishop',
      'queen',
      'star',
      this.levelBackgroundAssetKey(),
      this.platformAssetKey(),
      this.floorEdgeAssetKey(),
      this.ladderAssetKey(),
      'treat-cupcake-base',
      'treat-donut-base',
      'treat-star-topper'
    ]);

    this.level.obstacles.forEach((obstacle) => keys.add(this.obstacleAssetKey(obstacle.kind)));

    return [...keys];
  }

  private platformAssetKey(): AssetKey {
    switch (this.levelThemeKey()) {
      case 'bakery':
        return 'platform-bakery';
      case 'tower':
        return 'platform-tower';
      case 'yarn':
        return 'platform-yarn';
    }
  }

  private levelBackgroundAssetKey(): AssetKey {
    switch (this.levelThemeKey()) {
      case 'bakery':
        return 'level-frosting-factory-bg';
      case 'tower':
        return 'level-birthday-beast-tower-bg';
      case 'yarn':
        return 'level-yarn-yard-bg';
    }
  }

  private floorEdgeAssetKey(): AssetKey {
    switch (this.levelThemeKey()) {
      case 'bakery':
        return 'floor-edge-bakery';
      case 'tower':
        return 'floor-edge-tower';
      case 'yarn':
        return 'floor-edge-yarn';
    }
  }

  private ladderAssetKey(): AssetKey {
    switch (this.levelThemeKey()) {
      case 'bakery':
        return 'ladder-bakery';
      case 'tower':
        return 'ladder-tower';
      case 'yarn':
        return 'ladder-yarn';
    }
  }

  private obstacleAssetKey(kind: ObstacleDefinition['kind']): AssetKey {
    const theme = this.levelThemeKey();

    switch (kind) {
      case 'hurdle':
        return theme === 'bakery' ? 'hurdle-bakery' : theme === 'tower' ? 'hurdle-tower' : 'hurdle-yarn';
      case 'lowBarrier':
        return theme === 'bakery' ? 'crawlGate-bakery' : theme === 'tower' ? 'crawlGate-tower' : 'crawlGate-yarn';
      case 'swing':
        return theme === 'bakery' ? 'roller-bakery' : theme === 'tower' ? 'roller-tower' : 'roller-yarn';
      case 'frostingPit':
        return 'frostingPit';
      case 'cakeWall':
        return 'cakeWall';
    }
  }

  private setCatPose(assetKey: CatPoseKey): void {
    if (this.currentCatPose === assetKey) {
      return;
    }

    const surfaceY = this.cat ? this.catSurfaceY() : undefined;
    this.currentCatPose = assetKey;
    this.cat.setTexture(assetKey);
    this.setAssetDisplaySize(this.cat, assetKey);

    if (surfaceY !== undefined && (this.onGround || this.sliding || this.climbing)) {
      this.cat.y = surfaceY - this.catFootOffset();
    }
  }

  private restoreMovementCatPose(): void {
    if (this.sliding) {
      this.setCatPose(CAT_SLIDE_FRAMES[0]);
      return;
    }

    this.setCatPose(this.onGround ? 'cat' : this.jumpFrameForVelocity());
  }

  private setAssetDisplaySize(
    gameObject: Phaser.GameObjects.Components.Size,
    assetKey: AssetKey,
    multiplier = 1
  ): void {
    const asset = assetsByKey[assetKey];
    gameObject.setDisplaySize(asset.width * multiplier, asset.height * multiplier);
  }

  private setPowerIconSize(): void {
    if (this.powerIcon) {
      this.setAssetDisplaySize(this.powerIcon, this.currentPowerup(), 0.38);
    }
  }
}
