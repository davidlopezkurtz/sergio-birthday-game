import Phaser from 'phaser';
import { assetsByKey, resolveAssetUrl, type AssetKey } from '../assets/assetManifest';
import { levels } from '../data/levels';
import { isBakingStationResult } from '../game/baking';
import {
  OBSTACLE_CLEAR_POINTS,
  OBSTACLE_HIT_PENALTY_POINTS,
  buildScoreSummary,
  calculateAppliedPenalty,
  calculateScoreFromLedger,
  formatScore,
  formatTime,
  replaceScoreSummary
} from '../game/scoring';
import type {
  ActionType,
  BakingStationDefinition,
  BakingStationResult,
  CourseLadderDefinition,
  CoursePlatformDefinition,
  LevelDefinition,
  ObstacleDefinition,
  PointThrusterDefinition,
  PowerupType,
  ScoreSummary
} from '../types';

interface PlaySceneData {
  levelIndex: number;
}

interface ObstacleObject {
  definition: ObstacleDefinition;
  sprite: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  baseY: number;
  phase: number;
}

interface PlatformObject {
  definition: CoursePlatformDefinition;
  body: Phaser.GameObjects.Rectangle | Phaser.GameObjects.TileSprite;
  label: Phaser.GameObjects.Text;
}

interface ThrusterObject {
  definition: PointThrusterDefinition;
  ring: Phaser.GameObjects.Arc;
  core: Phaser.GameObjects.Arc;
  sprinkles: Phaser.GameObjects.Arc[];
  valueText: Phaser.GameObjects.Text;
}

const DEFAULT_GROUND_Y = 560;
const DEFAULT_CAT_START_X = 160;
const DEFAULT_WORLD_HEIGHT = 720;
const CAT_BASE_SPEED = 230;
const CAT_BACK_SPEED = 170;
const CLIMB_SPEED = 260;
const COUNTDOWN_MS = 1400;
const JUMP_ACTION_GRACE_MS = 1150;
const SLIDE_ACTION_GRACE_MS = 950;
const POWER_ACTION_GRACE_MS = 1100;
const ACTION_CLEAR_AHEAD = 100;
const ACTION_CLEAR_BEHIND = 180;

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
  private mathCorrect = 0;
  private mathAttempts = 0;
  private hintsUsed = 0;
  private obstacleHits = 0;
  private obstacleClears = 0;
  private combo = 0;
  private maxCombo = 0;
  private obstaclePoints = 0;
  private thrusterPoints = 0;
  private mathPoints = 0;
  private bakingPoints = 0;
  private bakingPerfect = 0;
  private bakingStationsCompleted = 0;
  private comboBonus = 0;
  private penaltyPoints = 0;
  private obstacleResolvedIds = new Set<string>();
  private thrustersCollected = new Set<string>();
  private activeBakingStation = false;
  private activePower = false;
  private activePowerType?: PowerupType;
  private powerReady = true;
  private powerUseCount = 0;
  private sliding = false;
  private completed = false;
  private invincible = false;
  private timerText?: Phaser.GameObjects.Text;
  private scoreText?: Phaser.GameObjects.Text;
  private comboText?: Phaser.GameObjects.Text;
  private progressText?: Phaser.GameObjects.Text;
  private powerText?: Phaser.GameObjects.Text;
  private powerIcon?: Phaser.GameObjects.Image;
  private instructionText?: Phaser.GameObjects.Text;
  private platforms: PlatformObject[] = [];
  private obstacles: ObstacleObject[] = [];
  private thrusters: ThrusterObject[] = [];
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
  private climbing = false;
  private lastJumpAt = Number.NEGATIVE_INFINITY;
  private lastSlideAt = Number.NEGATIVE_INFINITY;
  private lastPowerAt = Number.NEGATIVE_INFINITY;
  private bumpFeedbackStartedAt = Number.NEGATIVE_INFINITY;
  private bumpFeedbackUntil = Number.NEGATIVE_INFINITY;

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
    this.mathCorrect = 0;
    this.mathAttempts = 0;
    this.hintsUsed = 0;
    this.obstacleHits = 0;
    this.obstacleClears = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.obstaclePoints = 0;
    this.thrusterPoints = 0;
    this.mathPoints = 0;
    this.bakingPoints = 0;
    this.bakingPerfect = 0;
    this.bakingStationsCompleted = 0;
    this.comboBonus = 0;
    this.penaltyPoints = 0;
    this.obstacleResolvedIds.clear();
    this.thrustersCollected.clear();
    this.activeBakingStation = false;
    this.activePower = false;
    this.activePowerType = undefined;
    this.powerReady = true;
    this.powerUseCount = 0;
    this.sliding = false;
    this.completed = false;
    this.invincible = false;
    this.currentCatPose = undefined;
    this.platforms = [];
    this.obstacles = [];
    this.thrusters = [];
    this.verticalVelocity = 0;
    this.onGround = true;
    this.currentSurfaceY = this.groundY;
    this.runStarted = false;
    this.hasMoved = false;
    this.touchMoveDirection = 0;
    this.touchClimbDirection = 0;
    this.climbing = false;
    this.lastJumpAt = Number.NEGATIVE_INFINITY;
    this.lastSlideAt = Number.NEGATIVE_INFINITY;
    this.lastPowerAt = Number.NEGATIVE_INFINITY;
    this.bumpFeedbackStartedAt = Number.NEGATIVE_INFINITY;
    this.bumpFeedbackUntil = Number.NEGATIVE_INFINITY;
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
    this.createCat();
    this.createHud();
    this.createControls();
    this.startCountdown();

    this.cameras.main.startFollow(this.cat, true, 0.14, 0.14, 0, 70);
    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
  }

  update(time: number, delta: number): void {
    if (this.completed) {
      return;
    }

    this.animateObstacles(time);
    this.handleKeyboardInput();

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
      this.add
        .image(640, 360, backgroundKey)
        .setScrollFactor(0)
        .setDisplaySize(1280, 720)
        .setDepth(0);
    } else {
      for (let index = 0; index < 16; index += 1) {
        const x = 240 + index * 380;
        const y = 120 + (index % 8) * 90;
        this.add.circle(x, y, 34, 0xffffff, 0.3);
        this.add.circle(x + 42, y + 8, 26, 0xffffff, 0.25);
        this.add.circle(x - 38, y + 12, 22, 0xffffff, 0.22);
      }
    }

    this.add
      .text(90, Math.max(120, this.groundY - 480), this.level.title, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '34px',
        color: '#102033',
        fontStyle: '900'
      })
      .setDepth(2);
  }

  private createGround(): void {
    this.add.rectangle(
      this.worldWidth / 2,
      this.groundY + 70,
      this.worldWidth + 200,
      180,
      this.level.palette.ground,
      0.46
    );
    this.add.rectangle(this.worldWidth / 2, this.groundY + 8, this.worldWidth + 200, 18, 0xffffff, 0.55);
  }

  private createCat(): void {
    this.cat = this.add.sprite(this.startX, this.groundY - 90, 'cat');
    this.setAssetDisplaySize(this.cat, 'cat');
    this.cat.setDepth(5);
  }

  private createLadders(): void {
    for (const ladder of this.level.ladders ?? []) {
      const top = Math.min(ladder.yTop, ladder.yBottom);
      const bottom = Math.max(ladder.yTop, ladder.yBottom);
      const y = (top + bottom) / 2;
      const height = bottom - top + 20;

      this.add.rectangle(ladder.x - 25, y, 8, height, 0x8c5b2e, 0.94).setDepth(2);
      this.add.rectangle(ladder.x + 25, y, 8, height, 0x8c5b2e, 0.94).setDepth(2);

      for (let rungY = top + 18; rungY <= bottom - 16; rungY += 34) {
        this.add.rectangle(ladder.x, rungY, 66, 7, 0xffd23f, 0.92).setDepth(2);
      }

      this.add
        .text(ladder.x, top - 24, ladder.label, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '16px',
          color: '#102033',
          fontStyle: '900',
          backgroundColor: 'rgba(255,255,255,0.72)',
          padding: { x: 7, y: 3 }
        })
        .setOrigin(0.5)
        .setDepth(4);
    }
  }

  private createPlatforms(): void {
    this.platforms = [];
    const platformKey = this.platformAssetKey();

    for (const platform of this.level.platforms) {
      const body = this.add
        .tileSprite(platform.x, platform.y + 26, platform.width, assetsByKey[platformKey].height, platformKey)
        .setDepth(3);
      const label = this.add
        .text(platform.x, platform.y + 68, platform.label, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '17px',
          color: '#102033',
          fontStyle: '900',
          backgroundColor: 'rgba(255,255,255,0.72)',
          padding: { x: 8, y: 4 }
        })
        .setOrigin(0.5)
        .setDepth(4);

      this.platforms.push({ definition: platform, body, label });
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

      const label = this.add
        .text(obstacle.x, y - sprite.displayHeight / 2 - 54, `${this.actionCueForObstacle(obstacle.kind)}: ${obstacle.label}`, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '18px',
          color: '#102033',
          fontStyle: '800',
          backgroundColor: 'rgba(255,255,255,0.72)',
          padding: { x: 8, y: 4 }
        })
        .setOrigin(0.5)
        .setDepth(3);

      this.obstacles.push({ definition: obstacle, sprite, label, baseY: y, phase: obstacle.x / 180 });
    }
  }

  private createPointThrusters(): void {
    this.thrusters = [];

    for (const thruster of this.level.pointThrusters) {
      const color = this.thrusterColor(thruster);
      const radius = this.thrusterRadius(thruster);
      const ring = this.add
        .circle(thruster.x, thruster.y, radius, color, 0.22)
        .setStrokeStyle(6, color, 1)
        .setDepth(6);
      const core = this.add
        .circle(thruster.x, thruster.y + 4, radius * 0.68, 0xfff4c7, 0.96)
        .setStrokeStyle(4, 0x8c5b2e, 0.84)
        .setDepth(7);
      const sprinkles = [
        this.add.circle(thruster.x - radius * 0.2, thruster.y - radius * 0.08, radius * 0.12, color, 1).setDepth(8),
        this.add.circle(thruster.x + radius * 0.16, thruster.y - radius * 0.14, radius * 0.1, 0xf05f73, 1).setDepth(8),
        this.add.circle(thruster.x + radius * 0.02, thruster.y + radius * 0.1, radius * 0.09, 0x27b6a5, 1).setDepth(8)
      ];
      const valueText = this.add
        .text(thruster.x, thruster.y + 2, `+${thruster.value}`, {
          fontFamily: 'Arial, sans-serif',
          fontSize: thruster.value >= 500 ? '23px' : '21px',
          color: '#102033',
          fontStyle: '900'
        })
        .setOrigin(0.5)
        .setDepth(8);

      this.tweens.add({
        targets: ring,
        scale: 1.14,
        alpha: 0.44,
        duration: 640,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      this.thrusters.push({ definition: thruster, ring, core, sprinkles, valueText });
    }
  }

  private createHud(): void {
    this.add
      .rectangle(640, 42, 1280, 84, 0x102033, 0.82)
      .setScrollFactor(0)
      .setDepth(20);

    this.timerText = this.add
      .text(1110, 17, 'Time 0:00', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        color: '#d8f7ff',
        fontStyle: '800'
      })
      .setScrollFactor(0)
      .setDepth(21);

    this.scoreText = this.add
      .text(28, 12, 'Score 0', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '36px',
        color: '#ffec9f',
        fontStyle: '900'
      })
      .setScrollFactor(0)
      .setDepth(21);

    this.comboText = this.add
      .text(288, 19, 'Combo x0', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '26px',
        color: '#ffffff',
        fontStyle: '900'
      })
      .setScrollFactor(0)
      .setDepth(21);

    this.powerIcon = this.add
      .image(520, 42, this.currentPowerup())
      .setScrollFactor(0)
      .setDepth(21);
    this.setAssetDisplaySize(this.powerIcon, this.currentPowerup(), 0.38);

    this.powerText = this.add
      .text(565, 24, `${this.powerLabel(this.currentPowerup())} ready`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '22px',
        color: '#ffec9f',
        fontStyle: '900'
      })
      .setScrollFactor(0)
      .setDepth(21);

    this.progressText = this.add
      .text(785, 18, 'Pastries 0/0 | Hits 0', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '17px',
        color: '#ffffff',
        fontStyle: '800'
      })
      .setScrollFactor(0)
      .setDepth(21);

    this.instructionText = this.add
      .text(640, 96, 'Climb, jump, crawl, collect pastries. Bake at the top for a multiplier.', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '21px',
        color: '#102033',
        fontStyle: '800',
        align: 'center',
        wordWrap: { width: 1040 },
        backgroundColor: 'rgba(255,255,255,0.75)',
        padding: { x: 14, y: 8 }
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(21);

    this.time.delayedCall(5200, () => this.instructionText?.setVisible(false));
  }

  private createControls(): void {
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.keyMoveLeftA = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyMoveRightD = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyJumpW = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyPower = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keySlide = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.S);

    this.createMoveButton(110, 642, 104, 'Back', 0x2f4056, -1);
    this.createMoveButton(250, 642, 128, 'Run', 0x38a16d, 1);
    this.createVerticalActionButton(840, 642, 108, 'Down', 0xf05f73, 1);
    this.createVerticalActionButton(980, 642, 108, 'Jump', 0x27b6a5, -1);
    this.createTouchButton(1130, 642, 108, 'Power', 0xffd23f, () => this.usePower(), '#102033');
  }

  private createTouchButton(
    x: number,
    y: number,
    size: number,
    label: string,
    color: number,
    onPress: () => void,
    textColor = '#ffffff'
  ): void {
    const container = this.add.container(x, y).setScrollFactor(0).setDepth(30);
    const circle = this.add
      .circle(0, 0, size / 2, color, 0.92)
      .setStrokeStyle(5, 0xffffff);
    const text = this.add
      .text(0, 0, label, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '22px',
        color: textColor,
        fontStyle: '900'
      })
      .setOrigin(0.5);
    const hitZone = this.add.zone(0, 0, size, size).setInteractive({ useHandCursor: true });

    container.add([circle, text, hitZone]);
    hitZone.on('pointerdown', onPress);
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
    const circle = this.add
      .circle(0, 0, size / 2, color, 0.92)
      .setStrokeStyle(5, 0xffffff);
    const text = this.add
      .text(0, 0, label, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '22px',
        color: '#ffffff',
        fontStyle: '900'
      })
      .setOrigin(0.5);
    const hitZone = this.add.zone(0, 0, size, size).setInteractive({ useHandCursor: true });

    const beginAction = () => {
      if (this.canUseLadder()) {
        this.touchClimbDirection = direction;
        this.startClimb(direction);
        circle.setScale(1.07);
        return;
      }

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
    const circle = this.add
      .circle(0, 0, size / 2, color, 0.92)
      .setStrokeStyle(5, 0xffffff);
    const text = this.add
      .text(0, 0, label, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '22px',
        color: '#ffffff',
        fontStyle: '900'
      })
      .setOrigin(0.5);
    const hitZone = this.add.zone(0, 0, size, size).setInteractive({ useHandCursor: true });

    const beginMove = () => {
      this.touchMoveDirection = direction;
      circle.setAlpha(1);
      circle.setScale(1.07);
    };
    const endMove = () => {
      if (this.touchMoveDirection === direction) {
        this.touchMoveDirection = 0;
      }
      circle.setAlpha(0.92);
      circle.setScale(1);
    };

    container.add([circle, text, hitZone]);
    hitZone.on('pointerdown', beginMove);
    hitZone.on('pointerup', endMove);
    hitZone.on('pointerout', endMove);
    hitZone.on('pointerupoutside', endMove);
  }

  private handleKeyboardInput(): void {
    const wantsUp = this.isDown(this.cursors?.up) || this.isDown(this.keyJumpW);
    const wantsDown = this.isDown(this.cursors?.down) || this.isDown(this.keySlide);

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
      return;
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
      this.verticalVelocity = -920;
      this.onGround = false;
      this.currentSurfaceY = jumpSurfaceY;
      this.setCatPose('catJump');
      this.showActionFeedback('Jump!', 0x27b6a5);
    }
  }

  private startSlide(): void {
    if (!this.runStarted) {
      return;
    }

    if (this.canUseLadder()) {
      this.startClimb(1);
      return;
    }

    this.startRunClock();
    this.lastSlideAt = this.elapsedMs;
    this.resolveNearbyObstaclesForAction('slide');
    this.collectNearbyThrustersForAction('slide');
    this.showActionFeedback('Slide!', 0xf05f73);

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
      return;
    }

    this.startRunClock();
    if (!this.powerReady) {
      this.showActionFeedback('Charging', 0xffd23f);
      return;
    }

    const power = this.currentPowerup();
    this.lastPowerAt = this.elapsedMs;
    this.resolveNearbyObstaclesForAction('power');
    this.collectNearbyThrustersForAction('power');
    this.powerReady = false;
    this.activePower = true;
    this.activePowerType = power;
    this.invincible = true;
    this.powerIcon?.setTexture(power);
    this.setPowerIconSize();
    this.powerText?.setText(`${this.powerLabel(power)} active`);

    switch (power) {
      case 'rook':
        this.cat.x = Phaser.Math.Clamp(this.cat.x + 180, this.startX, this.worldWidth - 40);
        this.flashCat(0xffd23f);
        break;
      case 'knight':
        this.currentSurfaceY = this.catSurfaceY();
        this.verticalVelocity = -850;
        this.onGround = false;
        this.climbing = false;
        this.flashCat(0x27b6a5);
        break;
      case 'bishop':
        this.currentSurfaceY = this.catSurfaceY();
        this.verticalVelocity = -650;
        this.onGround = false;
        this.climbing = false;
        this.cat.x = Phaser.Math.Clamp(this.cat.x + 90, this.startX, this.worldWidth - 40);
        this.flashCat(0x6f64d9);
        break;
      case 'queen':
        this.flashCat(0xf05f73);
        break;
    }

    this.collectNearbyThrustersForAction('power');
    this.powerUseCount += 1;

    this.time.delayedCall(power === 'queen' ? 1800 : 950, () => {
      this.activePower = false;
      this.activePowerType = undefined;
      this.invincible = false;
      this.powerIcon?.setTexture(this.currentPowerup());
      this.setPowerIconSize();
      this.powerText?.setText(`${this.powerLabel(this.currentPowerup())} charging`);
    });

    this.time.delayedCall(4300, () => {
      this.powerReady = true;
      this.powerIcon?.setTexture(this.currentPowerup());
      this.setPowerIconSize();
      this.powerText?.setText(`${this.powerLabel(this.currentPowerup())} ready`);
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
    this.launchEndBakeOff();
  }

  private launchEndBakeOff(): void {
    this.activeBakingStation = true;
    const actionScore = this.currentScore();
    const station = this.buildEndBakeOffStation();
    const eventKey = `end-bake-off-${this.level.id}-${Date.now()}`;
    const bakingScene = this.scene.get('BakingMiniGameScene');
    let settled = false;
    let onResult: (result: unknown) => void;

    const fallbackResult = (): void => {
      this.finishLevelWithBakeOff({
        mistakes: 1,
        perfect: false,
        multiplier: 1,
        mathCorrect: 0,
        mathAttempts: 1
      });
    };

    const recoverWithoutResult = () => {
      if (settled) {
        return;
      }

      settled = true;
      this.game.events.off(eventKey, onResult);
      this.activeBakingStation = false;
      fallbackResult();
    };

    onResult = (result: unknown) => {
      if (settled) {
        return;
      }

      if (!isBakingStationResult(result)) {
        recoverWithoutResult();
        return;
      }

      settled = true;
      bakingScene.events.off(Phaser.Scenes.Events.SHUTDOWN, recoverWithoutResult);
      this.activeBakingStation = false;
      this.finishLevelWithBakeOff(result);
    };

    this.game.events.once(eventKey, onResult);
    bakingScene.events.once(Phaser.Scenes.Events.SHUTDOWN, recoverWithoutResult);

    try {
      this.scene.pause();
      this.scene.launch('BakingMiniGameScene', {
        station,
        eventKey,
        stationNumber: this.level.index + 1,
        actionScore,
        levelTitle: this.level.title
      });
    } catch {
      recoverWithoutResult();
    }
  }

  private finishLevelWithBakeOff(result: BakingStationResult): void {
    this.mathCorrect = result.mathCorrect;
    this.mathAttempts = result.mathAttempts;
    this.bakingStationsCompleted = 1;
    this.bakingPerfect = result.perfect ? 1 : 0;
    this.bakingPoints = Math.max(0, Math.round(this.currentScore() * (result.multiplier - 1)));

    if (result.mistakes > 0) {
      this.breakCombo();
    }

    const summary = buildScoreSummary({
      level: this.level,
      activeElapsedMs: this.elapsedMs,
      mathCorrect: this.mathCorrect,
      mathAttempts: this.mathAttempts,
      hintsUsed: this.hintsUsed,
      obstacleHits: this.obstacleHits,
      obstacleClears: this.obstacleClears,
      thrustersCollected: this.thrustersCollected.size,
      totalThrusters: this.level.pointThrusters.length,
      maxCombo: this.maxCombo,
      obstaclePoints: this.obstaclePoints,
      thrusterPoints: this.thrusterPoints,
      mathPoints: this.mathPoints,
      bakingPoints: this.bakingPoints,
      bakingPerfect: this.bakingPerfect,
      bakingStationsCompleted: this.bakingStationsCompleted,
      totalBakingStations: 1,
      comboBonus: this.comboBonus,
      penaltyPoints: this.penaltyPoints,
      completed: true
    });

    const summaries = (this.registry.get('scoreSummaries') ?? []) as ScoreSummary[];
    this.registry.set('scoreSummaries', replaceScoreSummary(summaries, summary));
    this.scene.resume();
    this.scene.start('ResultsScene', { levelIndex: this.level.index, summary });
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
    if (this.climbing) {
      return;
    }

    const direction = this.getMoveDirection();
    if (direction === 0) {
      return;
    }

    const baseSpeed = direction > 0 ? CAT_BASE_SPEED : CAT_BACK_SPEED;
    const speed = this.activePower && this.activePowerType === 'rook' && direction > 0 ? 520 : baseSpeed;
    this.cat.x = Phaser.Math.Clamp(this.cat.x + (direction * speed * delta) / 1000, 48, this.worldWidth - 48);
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
        this.obstacleResolvedIds.add(obstacle.definition.id);
        this.awardObstacleClear(obstacle.definition);
        return;
      }
    }
  }

  private actionMatchesObstacle(action: ActionType, kind: ObstacleDefinition['kind']): boolean {
    if (action === 'power') {
      return kind === 'cakeWall';
    }

    if (action === 'slide') {
      return kind === 'lowBarrier' || kind === 'swing';
    }

    return kind === 'hurdle' || kind === 'frostingPit';
  }

  private awardObstacleClear(obstacle: ObstacleDefinition, label = 'Clear!'): void {
    this.obstacleClears += 1;
    this.awardSkillPoints(OBSTACLE_CLEAR_POINTS, 'obstacle', obstacle.x, this.cat.y - 90, label);
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
    return !thruster.requiredAction || thruster.requiredAction === action;
  }

  private thrusterActionIsActive(thruster: PointThrusterDefinition): boolean {
    switch (thruster.requiredAction) {
      case undefined:
        return true;
      case 'jump':
        return this.actionIsFresh(this.lastJumpAt, JUMP_ACTION_GRACE_MS) || this.cat.y < this.currentSurfaceY - 78;
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

    this.tweens.killTweensOf(thruster.ring);
    this.tweens.add({
      targets: [thruster.ring, thruster.core, ...thruster.sprinkles, thruster.valueText],
      alpha: 0,
      scale: 1.45,
      duration: 260,
      ease: 'Quad.easeOut',
      onComplete: () => {
        thruster.ring.destroy();
        thruster.core.destroy();
        thruster.sprinkles.forEach((sprinkle) => sprinkle.destroy());
        thruster.valueText.destroy();
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
        return 52;
      case 'multiplier':
        return 56;
      case 'medium':
        return 46;
      case 'small':
      case undefined:
        return 40;
    }
  }

  private actionCueForObstacle(kind: ObstacleDefinition['kind']): string {
    switch (kind) {
      case 'lowBarrier':
      case 'swing':
        return 'Slide';
      case 'cakeWall':
        return 'Power';
      case 'hurdle':
      case 'frostingPit':
        return 'Jump';
    }
  }

  private showActionFeedback(message: string, color: number): void {
    this.showScorePopup(this.cat.x, this.cat.y - 110, message, color);
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
    const direction = this.getClimbDirection();

    if (!this.climbing && direction !== 0 && this.canUseLadder()) {
      this.startClimb(direction);
    }

    if (!this.climbing) {
      return;
    }

    const ladder = this.nearestLadder();
    if (!ladder) {
      this.climbing = false;
      return;
    }

    if (direction === 0) {
      this.verticalVelocity = 0;
      return;
    }

    const topCatY = ladder.yTop - 90;
    const bottomCatY = ladder.yBottom - 90;
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
      this.restoreMovementCatPose();
    } else if (this.cat.y >= bottomCatY - 2) {
      this.cat.y = bottomCatY;
      this.currentSurfaceY = ladder.yBottom;
      this.climbing = false;
      this.onGround = true;
      this.restoreMovementCatPose();
    } else {
      this.setCatPose('catJump');
    }
  }

  private canUseLadder(): boolean {
    return Boolean(this.nearestLadder());
  }

  private startClimb(direction: -1 | 1): void {
    const ladder = this.nearestLadder();
    if (!ladder || !this.runStarted) {
      return;
    }

    this.climbing = true;
    this.sliding = false;
    this.onGround = false;
    this.verticalVelocity = 0;
    this.cat.x = Phaser.Math.Linear(this.cat.x, ladder.x, 0.45);
    this.setCatPose('catJump');
    this.showActionFeedback(direction < 0 ? 'Climb!' : 'Down!', 0xffd23f);
  }

  private nearestLadder(): CourseLadderDefinition | undefined {
    const catSurfaceY = this.catSurfaceY();

    return (this.level.ladders ?? []).find(
      (ladder) =>
        Math.abs(this.cat.x - ladder.x) <= 74 &&
        catSurfaceY >= Math.min(ladder.yTop, ladder.yBottom) - 42 &&
        catSurfaceY <= Math.max(ladder.yTop, ladder.yBottom) + 42
    );
  }

  private catSurfaceY(): number {
    return this.cat.y + 90;
  }

  private applyManualGravity(delta: number): void {
    if (this.climbing) {
      return;
    }

    if (this.onGround && !this.hasSurfaceSupport(this.currentSurfaceY)) {
      this.onGround = false;
      this.verticalVelocity = 0;
    }

    const previousY = this.cat.y;

    if (!this.onGround) {
      this.verticalVelocity += (1650 * delta) / 1000;
      this.cat.y += (this.verticalVelocity * delta) / 1000;
    }

    const landingSurfaceY = this.getLandingSurfaceY(previousY);
    if (landingSurfaceY !== undefined) {
      this.currentSurfaceY = landingSurfaceY;
      this.cat.y = landingSurfaceY - 90;
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
      .map((surfaceY) => ({ surfaceY, catY: surfaceY - 90 }))
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
      `Pastries ${this.thrustersCollected.size}/${this.level.pointThrusters.length} | Hits ${this.obstacleHits}`
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

  private currentPowerup(): PowerupType {
    const powerups = this.level.bonusPowerup ? [this.level.powerup, this.level.bonusPowerup] : [this.level.powerup];

    return powerups[this.powerUseCount % powerups.length];
  }

  private flashCat(color: number): void {
    this.cat.setTint(color);
    this.time.delayedCall(180, () => this.cat.clearTint());
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
      this.countdownText?.destroy();
      this.countdownText = undefined;
      this.runStarted = true;
    });
  }

  private animateObstacles(time: number): void {
    for (const obstacle of this.obstacles) {
      if (obstacle.definition.kind !== 'swing') {
        continue;
      }

      obstacle.sprite.y = obstacle.baseY + Math.sin(time / 380 + obstacle.phase) * 16;
      obstacle.sprite.angle = Math.sin(time / 430 + obstacle.phase) * 7;
      obstacle.label.y = obstacle.baseY - obstacle.sprite.displayHeight / 2 - 60;
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
      this.platformAssetKey()
    ]);

    this.level.obstacles.forEach((obstacle) => keys.add(this.obstacleAssetKey(obstacle.kind)));

    return [...keys];
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

  private obstacleAssetKey(kind: ObstacleDefinition['kind']): AssetKey {
    const theme = this.levelThemeKey();

    switch (kind) {
      case 'hurdle':
        return theme === 'bakery' ? 'hurdle-bakery' : theme === 'tower' ? 'hurdle-tower' : 'hurdle-yarn';
      case 'lowBarrier':
        return theme === 'bakery' ? 'lowBarrier-bakery' : theme === 'tower' ? 'lowBarrier-tower' : 'lowBarrier-yarn';
      case 'swing':
        return theme === 'bakery' ? 'swing-bakery' : theme === 'tower' ? 'swing-tower' : 'swing-yarn';
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

    this.currentCatPose = assetKey;
    this.cat.setTexture(assetKey);
    this.setAssetDisplaySize(this.cat, assetKey);
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
