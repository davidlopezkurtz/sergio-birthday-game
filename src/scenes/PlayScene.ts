import Phaser from 'phaser';
import { assetsByKey, type AssetKey } from '../assets/assetManifest';
import { levels } from '../data/levels';
import { calculateBakingAward, isBakingStationResult } from '../game/baking';
import { generateProblemForLevel } from '../game/math';
import {
  FIRST_TRY_MATH_POINTS,
  OBSTACLE_CLEAR_POINTS,
  OBSTACLE_HIT_PENALTY_POINTS,
  RETRY_MATH_POINTS,
  buildScoreSummary,
  calculateAppliedPenalty,
  calculateScoreFromLedger,
  formatScore,
  formatTime
} from '../game/scoring';
import type {
  ActionType,
  BakingStationDefinition,
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
  valueText: Phaser.GameObjects.Text;
}

interface BakingStationObject {
  definition: BakingStationDefinition;
  base: Phaser.GameObjects.Rectangle;
  frosting: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
}

interface MathGateResult {
  wrongAttempts: number;
  hintUsed: boolean;
}

const GROUND_Y = 560;
const CAT_START_X = 160;
const CAT_BASE_SPEED = 230;
const CAT_BACK_SPEED = 170;
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

export class PlayScene extends Phaser.Scene {
  private level!: LevelDefinition;
  private cat!: Phaser.GameObjects.Sprite;
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
  private gatesSolved = new Set<number>();
  private bakingStationsSolved = new Set<string>();
  private obstacleResolvedIds = new Set<string>();
  private thrustersCollected = new Set<string>();
  private activeGate = false;
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
  private bakingStations: BakingStationObject[] = [];
  private verticalVelocity = 0;
  private onGround = true;
  private currentSurfaceY = GROUND_Y;
  private runStarted = false;
  private hasMoved = false;
  private countdownText?: Phaser.GameObjects.Text;
  private touchMoveDirection = 0;
  private lastJumpAt = Number.NEGATIVE_INFINITY;
  private lastSlideAt = Number.NEGATIVE_INFINITY;
  private lastPowerAt = Number.NEGATIVE_INFINITY;

  constructor() {
    super('PlayScene');
  }

  init(data: PlaySceneData): void {
    this.level = levels[data.levelIndex] ?? levels[0];
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
    this.gatesSolved.clear();
    this.bakingStationsSolved.clear();
    this.obstacleResolvedIds.clear();
    this.thrustersCollected.clear();
    this.activeGate = false;
    this.activeBakingStation = false;
    this.activePower = false;
    this.activePowerType = undefined;
    this.powerReady = true;
    this.powerUseCount = 0;
    this.sliding = false;
    this.completed = false;
    this.invincible = false;
    this.platforms = [];
    this.obstacles = [];
    this.thrusters = [];
    this.bakingStations = [];
    this.verticalVelocity = 0;
    this.onGround = true;
    this.currentSurfaceY = GROUND_Y;
    this.runStarted = false;
    this.hasMoved = false;
    this.touchMoveDirection = 0;
    this.lastJumpAt = Number.NEGATIVE_INFINITY;
    this.lastSlideAt = Number.NEGATIVE_INFINITY;
    this.lastPowerAt = Number.NEGATIVE_INFINITY;
  }

  create(): void {
    this.physics.world.setBounds(0, 0, this.level.trackLength + 800, 720);
    this.createBackdrop();
    this.createGround();
    this.createPlatforms();
    this.createObstacles();
    this.createPointThrusters();
    this.createBakingStations();
    this.createMathGates();
    this.createCat();
    this.createHud();
    this.createControls();
    this.startCountdown();

    this.cameras.main.startFollow(this.cat, true, 0.12, 0.12, -360, 120);
    this.cameras.main.setBounds(0, 0, this.level.trackLength + 700, 720);
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

    if (this.getMoveDirection() !== 0) {
      this.hasMoved = true;
    }

    if (this.hasMoved) {
      this.elapsedMs += delta;
    }

    this.applyHorizontalMovement(delta);
    this.applyManualGravity(delta);

    this.checkObstacleOverlaps();
    this.checkThrusterOverlaps();
    this.checkBakingStationTriggers();
    this.checkGateTriggers();
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
    sky.fillRect(0, 0, this.level.trackLength + 900, 720);

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
        const y = 120 + (index % 4) * 42;
        this.add.circle(x, y, 34, 0xffffff, 0.3);
        this.add.circle(x + 42, y + 8, 26, 0xffffff, 0.25);
        this.add.circle(x - 38, y + 12, 22, 0xffffff, 0.22);
      }
    }

    this.add
      .text(90, 130, this.level.title, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '34px',
        color: '#102033',
        fontStyle: '900'
      })
      .setDepth(2);
  }

  private createGround(): void {
    this.add.rectangle(
      this.level.trackLength / 2 + 400,
      GROUND_Y + 70,
      this.level.trackLength + 900,
      180,
      this.level.palette.ground,
      0.46
    );
    this.add.rectangle(this.level.trackLength / 2 + 400, GROUND_Y + 8, this.level.trackLength + 900, 18, 0xffffff, 0.55);
  }

  private createCat(): void {
    this.cat = this.add.sprite(CAT_START_X, GROUND_Y - 90, 'cat');
    this.setAssetDisplaySize(this.cat, 'cat');
    this.cat.setDepth(5);
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
      const y = this.getObstacleY(obstacle.kind);
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
      const core = this.add.circle(thruster.x, thruster.y, radius * 0.58, 0xffffff, 0.92).setDepth(7);
      const valueText = this.add
        .text(thruster.x, thruster.y - 5, `+${thruster.value}`, {
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

      this.thrusters.push({ definition: thruster, ring, core, valueText });
    }
  }

  private createBakingStations(): void {
    this.bakingStations = [];

    for (const station of this.level.bakingStations) {
      const totalValue = station.value + station.perfectBonus;
      this.add
        .circle(station.x, GROUND_Y - 108, 70, 0xffd23f, 0.15)
        .setStrokeStyle(5, 0xffd23f, 0.95)
        .setDepth(3);
      const base = this.add
        .rectangle(station.x, GROUND_Y - 80, 168, 116, 0xfff4c7, 0.96)
        .setStrokeStyle(5, 0x102033)
        .setDepth(4);
      const frosting = this.add.circle(station.x, GROUND_Y - 108, 48, 0xff9ec7, 0.94).setDepth(5);
      this.add.circle(station.x - 26, GROUND_Y - 118, 7, 0xffd23f, 1).setDepth(6);
      this.add.circle(station.x + 7, GROUND_Y - 128, 7, 0x27b6a5, 1).setDepth(6);
      this.add.circle(station.x + 30, GROUND_Y - 109, 7, 0xf05f73, 1).setDepth(6);
      this.add
        .rectangle(station.x, GROUND_Y - 39, 136, 44, 0xd56b6b, 1)
        .setStrokeStyle(3, 0x102033)
        .setDepth(5);
      this.add
        .text(station.x, GROUND_Y - 47, `Base +${station.value}`, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '16px',
          color: '#ffffff',
          fontStyle: '900'
        })
        .setOrigin(0.5)
        .setDepth(6);
      this.add
        .text(station.x, GROUND_Y - 26, `Perfect +${station.perfectBonus}`, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '15px',
          color: '#ffec9f',
          fontStyle: '900'
        })
        .setOrigin(0.5)
        .setDepth(6);
      const label = this.add
        .text(station.x, GROUND_Y - 176, `Bake: ${station.label} +${totalValue}`, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '18px',
          color: '#102033',
          fontStyle: '900',
          backgroundColor: 'rgba(255,255,255,0.78)',
          padding: { x: 8, y: 4 }
        })
        .setOrigin(0.5)
        .setDepth(5);

      this.tweens.add({
        targets: frosting,
        y: frosting.y - 8,
        duration: 720,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      this.bakingStations.push({ definition: station, base, frosting, label });
    }
  }

  private createMathGates(): void {
    this.level.gatePositions.forEach((x, index) => {
      const gate = this.add.image(x, GROUND_Y - 108, 'gate').setDepth(3);
      this.setAssetDisplaySize(gate, 'gate');
      this.add
        .rectangle(x, GROUND_Y - 108, 118, 48, 0xfffcec)
        .setStrokeStyle(4, 0x2a1a0e)
        .setDepth(4);
      this.add
        .text(x, GROUND_Y - 108, `Gate ${index + 1}`, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '24px',
          color: '#102033',
          fontStyle: '900'
        })
        .setOrigin(0.5)
        .setDepth(4);
      this.add
        .rectangle(x, GROUND_Y - 57, 70, 35, 0x38a16d)
        .setStrokeStyle(4, 0x2a1a0e)
        .setDepth(4);
      this.add
        .text(x, GROUND_Y - 57, 'Math', {
          fontFamily: 'Arial, sans-serif',
          fontSize: '17px',
          color: '#ffffff',
          fontStyle: '900'
        })
        .setOrigin(0.5)
        .setDepth(5);
    });
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
      .text(800, 18, 'Math 0/0 | Bake 0/0 | Hits 0', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: '800'
      })
      .setScrollFactor(0)
      .setDepth(21);

    this.instructionText = this.add
      .text(640, 96, `${this.level.subtitle} Collect Point Thrusters and build the biggest score.`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '21px',
        color: '#102033',
        fontStyle: '800',
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
    this.createTouchButton(840, 642, 108, 'Slide', 0xf05f73, () => this.startSlide());
    this.createTouchButton(980, 642, 108, 'Jump', 0x27b6a5, () => this.jump());
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

    const toggleMove = () => {
      this.touchMoveDirection = this.touchMoveDirection === direction ? 0 : direction;
      circle.setAlpha(this.touchMoveDirection === direction ? 1 : 0.92);
    };

    container.add([circle, text, hitZone]);
    hitZone.on('pointerdown', toggleMove);
  }

  private handleKeyboardInput(): void {
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

    this.startRunClock();
    this.lastJumpAt = this.elapsedMs;
    this.resolveNearbyObstaclesForAction('jump');
    this.collectNearbyThrustersForAction('jump');

    if (this.onGround) {
      this.verticalVelocity = -920;
      this.onGround = false;
      this.currentSurfaceY = GROUND_Y;
      this.setCatPose('catJump');
      this.showActionFeedback('Jump!', 0x27b6a5);
    }
  }

  private startSlide(): void {
    if (!this.runStarted) {
      return;
    }

    this.startRunClock();
    this.lastSlideAt = this.elapsedMs;
    this.resolveNearbyObstaclesForAction('slide');
    this.collectNearbyThrustersForAction('slide');
    this.showActionFeedback('Slide!', 0xf05f73);

    if (this.sliding) {
      this.cat.x = Phaser.Math.Clamp(this.cat.x + 12, CAT_START_X, this.level.trackLength + 120);
      return;
    }

    this.sliding = true;
    this.cat.x = Phaser.Math.Clamp(this.cat.x + 22, CAT_START_X, this.level.trackLength + 120);
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
        this.cat.x = Phaser.Math.Clamp(this.cat.x + 180, CAT_START_X, this.level.trackLength + 120);
        this.flashCat(0xffd23f);
        break;
      case 'knight':
        this.verticalVelocity = -850;
        this.onGround = false;
        this.currentSurfaceY = GROUND_Y;
        this.flashCat(0x27b6a5);
        break;
      case 'bishop':
        this.verticalVelocity = -650;
        this.onGround = false;
        this.currentSurfaceY = GROUND_Y;
        this.cat.x += 90;
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

  private checkBakingStationTriggers(): void {
    if (this.activeGate || this.activeBakingStation) {
      return;
    }

    for (const stationObject of this.bakingStations) {
      const station = stationObject.definition;
      if (this.bakingStationsSolved.has(station.id) || this.cat.x < station.x - 44) {
        continue;
      }

      this.activeBakingStation = true;
      const eventKey = `baking-station-${this.level.id}-${station.id}-${Date.now()}`;
      const bakingScene = this.scene.get('BakingMiniGameScene');
      let settled = false;
      let onResult: (result: unknown) => void;

      const recoverWithoutResult = () => {
        if (settled) {
          return;
        }

        settled = true;
        this.game.events.off(eventKey, onResult);
        this.activeBakingStation = false;
        this.scene.resume();
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
        this.bakingStationsSolved.add(station.id);
        const awardedPoints = calculateBakingAward(station, result);
        this.bakingStationsCompleted += 1;
        this.bakingPerfect += result.perfect ? 1 : 0;

        if (result.mistakes > 0) {
          this.breakCombo();
        }

        this.awardSkillPoints(
          awardedPoints,
          'baking',
          station.x,
          GROUND_Y - 188,
          result.perfect ? 'Perfect bake!' : 'Bake bonus'
        );
        this.finishBakingStationVisual(stationObject);
        this.activeBakingStation = false;
        this.scene.resume();
      };

      this.game.events.once(eventKey, onResult);
      bakingScene.events.once(Phaser.Scenes.Events.SHUTDOWN, recoverWithoutResult);

      try {
        this.scene.pause();
        this.scene.launch('BakingMiniGameScene', {
          station,
          eventKey,
          stationNumber: this.bakingStationsCompleted + 1
        });
      } catch {
        recoverWithoutResult();
      }

      return;
    }
  }

  private checkGateTriggers(): void {
    if (this.activeGate || this.activeBakingStation) {
      return;
    }

    for (let index = 0; index < this.level.gatePositions.length; index += 1) {
      const gateX = this.level.gatePositions[index];
      if (this.gatesSolved.has(index) || this.cat.x < gateX - 44) {
        continue;
      }

      this.activeGate = true;
      this.gatesSolved.add(index);
      const problem = generateProblemForLevel(this.level.mathCategories);
      const eventKey = `math-gate-${this.level.id}-${index}-${Date.now()}`;

      this.game.events.once(eventKey, (result: MathGateResult) => {
        this.mathCorrect += 1;
        this.mathAttempts += 1 + result.wrongAttempts;
        this.hintsUsed += result.hintUsed ? 1 : 0;
        this.awardMathGatePoints(result.wrongAttempts);
        this.activeGate = false;
        this.scene.resume();
      });

      this.scene.pause();
      this.scene.launch('MathGateScene', {
        problem,
        eventKey,
        gateNumber: index + 1
      });

      return;
    }
  }

  private checkLevelComplete(): void {
    if (this.cat.x < this.level.trackLength) {
      return;
    }

    this.completed = true;
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
      totalBakingStations: this.level.bakingStations.length,
      comboBonus: this.comboBonus,
      penaltyPoints: this.penaltyPoints,
      completed: true
    });

    const summaries = (this.registry.get('scoreSummaries') ?? []) as ScoreSummary[];
    this.registry.set('scoreSummaries', [...summaries, summary]);
    this.scene.start('ResultsScene', { levelIndex: this.level.index, summary });
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
    this.setCatPose('catHurt');
    this.cat.setTint(0xf05f73);
    this.cameras.main.shake(150, 0.006);
    this.time.delayedCall(260, () => {
      this.cat.clearTint();
      this.restoreMovementCatPose();
    });
  }

  private applyHorizontalMovement(delta: number): void {
    const direction = this.getMoveDirection();
    if (direction === 0) {
      return;
    }

    const baseSpeed = direction > 0 ? CAT_BASE_SPEED : CAT_BACK_SPEED;
    const speed = this.activePower && this.activePowerType === 'rook' && direction > 0 ? 520 : baseSpeed;
    this.cat.x = Phaser.Math.Clamp(this.cat.x + (direction * speed * delta) / 1000, CAT_START_X, this.level.trackLength + 120);
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

  private startRunClock(): void {
    this.hasMoved = true;
  }

  private isObstacleClearedByAction(kind: ObstacleDefinition['kind']): boolean {
    const jumpIsFresh =
      this.actionIsFresh(this.lastJumpAt, JUMP_ACTION_GRACE_MS) || this.cat.y < GROUND_Y - 78 || this.activePower;
    const slideIsFresh = this.sliding || this.actionIsFresh(this.lastSlideAt, SLIDE_ACTION_GRACE_MS);
    const powerIsFresh = this.activePower || this.actionIsFresh(this.lastPowerAt, POWER_ACTION_GRACE_MS);

    switch (kind) {
      case 'lowBarrier':
      case 'swing':
        return slideIsFresh || powerIsFresh;
      case 'cakeWall':
        return powerIsFresh;
      case 'hurdle':
      case 'frostingPit':
        return jumpIsFresh || powerIsFresh;
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

      if (this.actionMatchesObstacle(action, obstacle.definition.kind)) {
        this.obstacleResolvedIds.add(obstacle.definition.id);
        this.awardObstacleClear(obstacle.definition);
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

  private awardObstacleClear(obstacle: ObstacleDefinition, label = 'Clear!'): void {
    this.obstacleClears += 1;
    this.awardSkillPoints(OBSTACLE_CLEAR_POINTS, 'obstacle', obstacle.x, this.cat.y - 90, label);
  }

  private awardMathGatePoints(wrongAttempts: number): void {
    const points = wrongAttempts === 0 ? FIRST_TRY_MATH_POINTS : RETRY_MATH_POINTS;
    const label = wrongAttempts === 0 ? 'First try!' : 'Math points';

    if (wrongAttempts > 0) {
      this.breakCombo();
    }

    this.addPoints(points, 'math');
    this.showScorePopup(this.cat.x, this.cat.y - 130, `+${points} ${label}`, 0xffd23f);
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

  private finishBakingStationVisual(station: BakingStationObject): void {
    station.base.setFillStyle(0x38a16d, 0.82);
    station.frosting.setFillStyle(0xffffff, 0.82);
    station.label.setText('Bake complete');
    station.label.setColor('#ffffff');
    station.label.setBackgroundColor('rgba(56, 161, 109, 0.92)');
    this.tweens.killTweensOf(station.frosting);
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
        return this.actionIsFresh(this.lastJumpAt, JUMP_ACTION_GRACE_MS) || this.cat.y < GROUND_Y - 78;
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
      'Thruster!'
    );

    this.tweens.killTweensOf(thruster.ring);
    this.tweens.add({
      targets: [thruster.ring, thruster.core, thruster.valueText],
      alpha: 0,
      scale: 1.45,
      duration: 260,
      ease: 'Quad.easeOut',
      onComplete: () => {
        thruster.ring.destroy();
        thruster.core.destroy();
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

  private applyManualGravity(delta: number): void {
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

  private getLandingSurfaceY(previousY: number): number | undefined {
    if (this.verticalVelocity < 0) {
      return undefined;
    }

    const candidates = [
      ...this.level.platforms
        .filter((platform) => this.cat.x >= platform.x - platform.width / 2 && this.cat.x <= platform.x + platform.width / 2)
        .map((platform) => platform.y),
      GROUND_Y
    ];

    const crossedSurfaces = candidates
      .map((surfaceY) => ({ surfaceY, catY: surfaceY - 90 }))
      .filter(({ catY }) => previousY <= catY && this.cat.y >= catY)
      .sort((a, b) => a.catY - b.catY);

    return crossedSurfaces[0]?.surfaceY;
  }

  private hasSurfaceSupport(surfaceY: number): boolean {
    if (surfaceY === GROUND_Y) {
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
      `Math ${this.mathCorrect}/${this.mathAttempts} | Bake ${this.bakingStationsCompleted}/${this.level.bakingStations.length} | Hits ${this.obstacleHits}`
    );
  }

  private getObstacleY(kind: ObstacleDefinition['kind']): number {
    switch (kind) {
      case 'lowBarrier':
        return GROUND_Y - 142;
      case 'swing':
        return GROUND_Y - 164;
      case 'frostingPit':
        return GROUND_Y - 34;
      case 'cakeWall':
        return GROUND_Y - 86;
      case 'hurdle':
        return GROUND_Y - 64;
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
      .text(640, 350, 'Tap Run', {
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

    this.time.delayedCall(900, () => this.countdownText?.setText('You control the pace'));
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

  private setCatPose(assetKey: 'cat' | 'catSlide' | 'catJump' | 'catHurt' | 'catVictory'): void {
    this.cat.setTexture(assetKey);
    this.setAssetDisplaySize(this.cat, assetKey);
  }

  private restoreMovementCatPose(): void {
    if (this.sliding) {
      this.setCatPose('catSlide');
      return;
    }

    this.setCatPose(this.onGround ? 'cat' : 'catJump');
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
