import Phaser from 'phaser';
import {
  assetsByKey,
  audioByKey,
  bakeoffAssetKeys,
  bakeoffAudioKeys,
  resolveAssetUrl,
  resolveAudioUrl,
  type BakeoffAssetKey,
  type BakeoffAudioKey
} from '../assets/assetManifest';
import trayPieceAnchorGuideJson from '../assets/tray-piece-anchor-guide.json?raw';
import {
  buildBakeRushOrder,
  buildBakeRushResult,
  type BakeRushOrder,
  type BakeRushStep,
  type BakeRushTicket
} from '../game/bakeRush';
import { BAKEOFF_READY_EVENT } from '../game/bakeOffTransition';
import {
  buildLevelCompletionSummary,
  fallbackBakeOffResult,
  type LevelCompletionSnapshot,
  upsertLevelCompletionSummary
} from '../game/levelCompletion';
import type { BakingIngredient, BakingStationDefinition, BakingStationResult, ScoreSummary } from '../types';

export interface BakingMiniGameSceneData {
  station: BakingStationDefinition;
  eventKey?: string;
  stationNumber: number;
  actionScore?: number;
  levelTitle?: string;
  completion?: LevelCompletionSnapshot;
  transitionId?: string;
}

interface StationDisplay {
  step: BakeRushStep;
  label: string;
  shortLabel: string;
  color: number;
  textColor: string;
}

interface StationButtonState {
  step: BakeRushStep;
  container: Phaser.GameObjects.Container;
  background: Phaser.GameObjects.Rectangle;
  glow: Phaser.GameObjects.Rectangle;
  glowImage?: Phaser.GameObjects.Image;
  icon?: Phaser.GameObjects.Image;
  ring?: Phaser.GameObjects.Image;
  baseColor: number;
}

interface RackAnchorGuide {
  rackSlots: Record<string, { x: number; y: number }[]>;
}

const BAKE_RUSH_TIME_LIMIT_MS = 42000;
const WRONG_TAP_TIME_PENALTY_MS = 2200;
const TICKET_PANEL_CENTER_X = 300;
const TICKET_PANEL_CENTER_Y = 236;
const TICKET_SLOT_CENTER_X = TICKET_PANEL_CENTER_X;
const PROMPT_CENTER_X = 640;
const PROMPT_NORMAL_Y = 500;
const PROMPT_MATH_Y = 506;
const SERVE_METER_Y = 548;
const SERVE_METER_LEFT = 538;
const SERVE_METER_RIGHT = 742;
const SERVE_SWEET_LEFT = 613;
const SERVE_SWEET_RIGHT = 667;
const SERVE_METER_WIDTH = SERVE_METER_RIGHT - SERVE_METER_LEFT;
const SERVE_SWEET_WIDTH = SERVE_SWEET_RIGHT - SERVE_SWEET_LEFT;
const SERVE_METER_CENTER_X = (SERVE_METER_LEFT + SERVE_METER_RIGHT) / 2;
const SERVE_SWEET_CENTER_X = (SERVE_SWEET_LEFT + SERVE_SWEET_RIGHT) / 2;
const SERVE_METER_SPEED = 340;
const BAKEOFF_WATCHDOG_MS = 68000;
const INGREDIENT_BUTTON_WIDTH = 132;
const INGREDIENT_BUTTON_HEIGHT = 62;
const SERVE_BUTTON_WIDTH = 166;
const SERVE_BUTTON_HEIGHT = 82;
const rackAnchorGuide = JSON.parse(trayPieceAnchorGuideJson) as RackAnchorGuide;

const STATIONS: StationDisplay[] = [
  { step: 'base', label: 'Base', shortLabel: 'Base', color: 0xd56b6b, textColor: '#ffffff' },
  { step: 'frosting', label: 'Frost', shortLabel: 'Frost', color: 0xff9ec7, textColor: '#102033' },
  { step: 'sprinkles', label: 'Sprinkles', shortLabel: 'Spr', color: 0xffd23f, textColor: '#102033' },
  { step: 'berry', label: 'Berry', shortLabel: 'Berry', color: 0xf05f73, textColor: '#ffffff' },
  { step: 'candle', label: 'Candle', shortLabel: 'Candle', color: 0x27b6a5, textColor: '#ffffff' },
  { step: 'serve', label: 'Serve', shortLabel: 'Serve', color: 0x6b4a8c, textColor: '#ffffff' }
];

const INGREDIENT_LABELS: Record<BakingIngredient, string> = {
  frosting: 'Frosting',
  sprinkles: 'Sprinkles',
  candle: 'Candle',
  berry: 'Berry'
};

export class BakingMiniGameScene extends Phaser.Scene {
  private station!: BakingStationDefinition;
  private order!: BakeRushOrder;
  private eventKey = '';
  private transitionId = '';
  private levelTitle = '';
  private actionScore = 0;
  private completion?: LevelCompletionSnapshot;
  private playWatchdogTimer?: number;
  private resultTimer?: number;
  private finished = false;
  private currentTicketIndex = 0;
  private currentStepIndex = 0;
  private recipeMistakes = 0;
  private serveMistakes = 0;
  private mathCorrect = false;
  private locked = false;
  private inputBlocked = false;
  private answerPhase = false;
  private timeExpired = false;
  private timeRemainingMs = BAKE_RUSH_TIME_LIMIT_MS;
  private serveMarkerX = SERVE_METER_LEFT;
  private serveMarkerDirection: -1 | 1 = 1;
  private feedbackText?: Phaser.GameObjects.Text;
  private promptBack?: Phaser.GameObjects.Rectangle;
  private promptText?: Phaser.GameObjects.Text;
  private statusText?: Phaser.GameObjects.Text;
  private ticketTitleText?: Phaser.GameObjects.Text;
  private ticketRecipeText?: Phaser.GameObjects.Text;
  private ticketProgressText?: Phaser.GameObjects.Text;
  private timerText?: Phaser.GameObjects.Text;
  private timerFill?: Phaser.GameObjects.Rectangle;
  private multiplierText?: Phaser.GameObjects.Text;
  private serveMeterText?: Phaser.GameObjects.Text;
  private serveMeterTrack?: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
  private serveSweetZoneBack?: Phaser.GameObjects.Rectangle;
  private serveSweetZone?: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
  private serveMarker?: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
  private stationButtons: Phaser.GameObjects.Container[] = [];
  private stationButtonStates: StationButtonState[] = [];
  private answerButtons: Phaser.GameObjects.Container[] = [];
  private ticketSlots: Phaser.GameObjects.Rectangle[] = [];
  private ticketTexts: Phaser.GameObjects.Text[] = [];
  private trayPieces: Phaser.GameObjects.GameObject[] = [];
  private mathVisualObjects: Phaser.GameObjects.GameObject[] = [];
  private completedTreats: Phaser.GameObjects.GameObject[] = [];
  private conveyorStripes: Phaser.GameObjects.Rectangle[] = [];
  private keyBindings: { key: Phaser.Input.Keyboard.Key; handler: () => void }[] = [];

  constructor() {
    super('BakingMiniGameScene');
  }

  init(data: BakingMiniGameSceneData): void {
    this.station = data.station;
    this.order = buildBakeRushOrder(data.station, data.stationNumber);
    this.eventKey = data.eventKey ?? '';
    this.transitionId = data.transitionId ?? '';
    this.levelTitle = data.levelTitle ?? data.station.label;
    this.actionScore = data.actionScore ?? 0;
    this.completion = data.completion;
    this.finished = false;
    this.clearSceneTimers();
    this.currentTicketIndex = 0;
    this.currentStepIndex = 0;
    this.recipeMistakes = 0;
    this.serveMistakes = 0;
    this.mathCorrect = false;
    this.locked = false;
    this.inputBlocked = false;
    this.answerPhase = false;
    this.timeExpired = false;
    this.timeRemainingMs = BAKE_RUSH_TIME_LIMIT_MS;
    this.serveMarkerX = SERVE_METER_LEFT;
    this.serveMarkerDirection = 1;
    this.stationButtons = [];
    this.stationButtonStates = [];
    this.answerButtons = [];
    this.ticketSlots = [];
    this.ticketTexts = [];
    this.trayPieces = [];
    this.mathVisualObjects = [];
    this.completedTreats = [];
    this.conveyorStripes = [];
    this.keyBindings = [];
  }

  preload(): void {
    const progressBack = this.add.rectangle(640, 654, 420, 18, 0x102033, 0.28).setStrokeStyle(2, 0xffffff, 0.45);
    const progressFill = this.add.rectangle(431, 654, 0, 16, 0xffd23f, 1).setOrigin(0, 0.5);
    const loadingText = this.add
      .text(640, 622, 'Setting the bake-off stage...', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: '900'
      })
      .setOrigin(0.5)
      .setDepth(5);

    const updateProgress = (value: number) => {
      progressFill.width = 418 * value;
    };

    this.load.on('progress', updateProgress);
    this.load.once('complete', () => {
      this.load.off('progress', updateProgress);
      progressBack.destroy();
      progressFill.destroy();
      loadingText.destroy();
    });

    for (const key of bakeoffAssetKeys) {
      if (this.textures.exists(key)) {
        continue;
      }

      const asset = assetsByKey[key];
      const assetUrl = resolveAssetUrl(asset, 1);
      if (assetUrl) {
        this.load.image(key, assetUrl);
      }
    }

    for (const key of bakeoffAudioKeys) {
      if (this.cache.audio.exists(key)) {
        continue;
      }

      const assetUrl = resolveAudioUrl(audioByKey[key]);
      if (assetUrl) {
        this.load.audio(key, assetUrl);
      }
    }
  }

  create(data: BakingMiniGameSceneData): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.clearSceneTimers();
      this.cleanupKeyboardHandlers();
    });

    try {
      this.createBackdrop(data.levelTitle ?? this.levelTitle);
      this.createTicketPanel();
      this.createBakeStage();
      this.createScorePanel();
      this.createStationButtons();
      this.renderCurrentTicket();
      this.updatePrompt();
      this.updateStatusText();
      this.refreshStationHighlights();
      this.markBakeOffReady();
    } catch (error) {
      console.error('Bake-off scene failed during startup.', error);
      this.finishWithResult(fallbackBakeOffResult());
    }
  }

  update(_time: number, delta: number): void {
    if (!this.locked && !this.timeExpired) {
      this.timeRemainingMs = Math.max(0, this.timeRemainingMs - delta);
      this.updateTimer();

      if (this.timeRemainingMs <= 0) {
        this.handleTimeExpired();
      }
    }

    this.animateConveyor(delta);
    this.animateServeMeter(delta);
  }

  private createBackdrop(levelTitle: string): void {
    this.cameras.main.setBackgroundColor('rgba(16, 32, 51, 0.74)');
    const background = this.addBakeoffImage(this.bakeoffBackgroundKey(), 640, 360, 0);
    if (background) {
      background.setDisplaySize(1280, 720).setAlpha(0.45);
    } else {
      this.add.rectangle(640, 360, 1280, 720, 0x102033, 0.76);
    }

    this.add.rectangle(640, 360, 1280, 720, 0x102033, 0.42);
    this.addBakeoffImage('audience-silhouette', 640, 664, 1)?.setDisplaySize(680, 142).setAlpha(0.18);
    this.addBakeoffImage('bakeoff-spotlight', 164, 136, 1)?.setDisplaySize(122, 122).setAlpha(0.2);
    this.addBakeoffImage('bakeoff-spotlight', 1116, 136, 1)?.setDisplaySize(122, 122).setAlpha(0.2).setFlipX(true);

    this.add.rectangle(640, 374, 1160, 610, 0xfffcf1, 0.9).setStrokeStyle(6, 0xffd23f);
    this.add.rectangle(640, 54, 1080, 58, 0x6b4a8c, 0.96).setStrokeStyle(4, 0x102033);
    this.add.rectangle(640, 621, 1080, 122, 0x102033, 0.09).setStrokeStyle(3, 0x102033, 0.16);

    this.add
      .text(640, 39, 'Judge Order Bake Rush', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '29px',
        color: '#ffffff',
        fontStyle: '900'
      })
      .setOrigin(0.5);

    this.add
      .text(640, 72, levelTitle, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '17px',
        color: '#ffec9f',
        fontStyle: '900',
        align: 'center',
        wordWrap: { width: 920 }
      })
      .setOrigin(0.5);

    this.feedbackText = this.add
      .text(640, 102, 'Match the ticket, then serve on green.', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '17px',
        color: '#2f4056',
        fontStyle: '900',
        align: 'center',
        wordWrap: { width: 430 }
      })
      .setOrigin(0.5)
      .setDepth(22);

    this.statusText = this.add
      .text(640, 126, '', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '15px',
        color: '#6b4a8c',
        fontStyle: '900',
        align: 'center',
        wordWrap: { width: 430 }
      })
      .setOrigin(0.5)
      .setDepth(22);
  }

  private createTicketPanel(): void {
    this.addBakeoffImage('ticket-stack', 206, 208, 2)?.setDisplaySize(134, 92).setAlpha(0.8);
    const ticket = this.addBakeoffImage('judge-ticket', TICKET_PANEL_CENTER_X, TICKET_PANEL_CENTER_Y, 2);
    if (ticket) {
      ticket.setDisplaySize(364, 182);
    } else {
      this.add.rectangle(TICKET_PANEL_CENTER_X, TICKET_PANEL_CENTER_Y, 364, 182, 0xffffff, 1).setStrokeStyle(6, 0x102033);
    }
    this.addBakeoffImage('ticket-next-tab', 458, 154, 3)?.setDisplaySize(78, 46);
    this.addBakeoffImage('ticket-priority-star', 152, 137, 3)?.setDisplaySize(44, 44);
    this.ticketTitleText = this.add
      .text(TICKET_PANEL_CENTER_X, 137, '', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '22px',
        color: '#102033',
        fontStyle: '900',
        align: 'center'
      })
      .setOrigin(0.5)
      .setDepth(5);
    this.ticketProgressText = this.add
      .text(TICKET_PANEL_CENTER_X, 166, '', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        color: '#6b4a8c',
        fontStyle: '900',
        align: 'center'
      })
      .setOrigin(0.5)
      .setDepth(5);
    this.ticketRecipeText = this.add
      .text(TICKET_PANEL_CENTER_X, 312, '', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '15px',
        color: '#2f4056',
        fontStyle: '800',
        align: 'center',
        wordWrap: { width: 304 }
      })
      .setOrigin(0.5)
      .setDepth(5);
  }

  private createBakeStage(): void {
    this.add.rectangle(640, 330, 506, 278, 0xd56b6b, 0.32).setStrokeStyle(4, 0x102033, 0.72);
    this.addBakeoffImage('bakeoff-conveyor', 640, 318, 2)?.setDisplaySize(528, 110);

    for (let index = 0; index < 9; index += 1) {
      this.conveyorStripes.push(this.add.rectangle(410 + index * 62, 308, 24, 46, 0xfff4c7, 0.16).setDepth(3));
    }

    this.addBakeoffImage('judge-rack', 640, 218, 4)?.setDisplaySize(274, 166);
    this.add
      .text(640, 180, 'Judge Rack', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '15px',
        color: '#102033',
        fontStyle: '900'
      })
      .setOrigin(0.5);

    this.addBakeoffImage('bakeoff-counter', 640, 390, 2)?.setDisplaySize(560, 120);
    this.addBakeoffImage('bakeoff-tray-empty', 640, 378, 4)?.setDisplaySize(318, 158);
    this.add
      .text(640, 335, 'Prep Tray', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '15px',
        color: '#102033',
        fontStyle: '900'
      })
      .setOrigin(0.5);

    this.promptBack = this.add
      .rectangle(PROMPT_CENTER_X, PROMPT_NORMAL_Y, 720, 64, 0xfffcf1, 0.96)
      .setStrokeStyle(3, 0xffd23f, 0.78)
      .setDepth(20);
    this.promptText = this.add
      .text(PROMPT_CENTER_X, PROMPT_NORMAL_Y, '', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '21px',
        color: '#102033',
        fontStyle: '900',
        align: 'center',
        wordWrap: { width: 650 }
      })
      .setOrigin(0.5)
      .setDepth(21);

    this.serveMeterTrack = this.addBakeoffImage('serve-meter-track', SERVE_METER_CENTER_X, SERVE_METER_Y, 5) ??
      this.add.rectangle(SERVE_METER_CENTER_X, SERVE_METER_Y, SERVE_METER_WIDTH, 18, 0x102033, 0.24).setStrokeStyle(3, 0x102033, 0.45);
    this.serveMeterTrack.setDisplaySize(SERVE_METER_WIDTH + 32, 46);
    this.serveSweetZoneBack = this.add
      .rectangle(SERVE_SWEET_CENTER_X, SERVE_METER_Y, SERVE_SWEET_WIDTH + 12, 42, 0x1fbf63, 0.98)
      .setStrokeStyle(4, 0xffffff, 0.92)
      .setDepth(6);
    this.serveSweetZone = this.addBakeoffImage('serve-meter-sweet-zone', SERVE_SWEET_CENTER_X, SERVE_METER_Y, 6) ??
      this.add.rectangle(SERVE_SWEET_CENTER_X, SERVE_METER_Y, SERVE_SWEET_WIDTH, 26, 0x38a16d, 0.95);
    if (this.serveSweetZone instanceof Phaser.GameObjects.Image) {
      this.serveSweetZone.setTint(0x1fbf63);
    }
    this.serveSweetZone.setAlpha(0.88);
    this.serveSweetZone.setDisplaySize(SERVE_SWEET_WIDTH, 46);
    this.serveMarker = this.addBakeoffImage('serve-meter-marker', this.serveMarkerX, SERVE_METER_Y, 7) ??
      this.add.rectangle(this.serveMarkerX, SERVE_METER_Y, 14, 40, 0xffd23f, 1).setStrokeStyle(2, 0x102033);
    this.serveMarker.setDisplaySize(26, 58);
    this.serveMeterText = this.add
      .text(SERVE_METER_CENTER_X, SERVE_METER_Y + 28, 'Serve on green', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '15px',
        color: '#102033',
        fontStyle: '900'
      })
      .setOrigin(0.5);
    this.setServeMeterActive(false);
  }

  private createScorePanel(): void {
    this.add.rectangle(988, 238, 292, 224, 0x102033, 0.82).setStrokeStyle(4, 0xffd23f);
    this.addBakeoffImage('bakeoff-score-badge', 988, 154, 3)?.setDisplaySize(190, 92);
    this.add
      .text(988, 151, `Course\n${this.actionScore.toLocaleString('en-US')}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        color: '#ffffff',
        fontStyle: '900',
        align: 'center',
        lineSpacing: 5
      })
      .setOrigin(0.5);

    this.addBakeoffImage('bakeoff-timer-badge', 988, 217, 3)?.setDisplaySize(222, 60);
    this.add.rectangle(988, 217, 204, 22, 0xffffff, 0.18).setStrokeStyle(2, 0xffffff, 0.6);
    this.timerFill = this.add.rectangle(888, 217, 200, 18, 0x27b6a5, 1).setOrigin(0, 0.5).setDepth(5);
    this.timerText = this.add
      .text(988, 250, '', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '17px',
        color: '#ffec9f',
        fontStyle: '900'
      })
      .setOrigin(0.5)
      .setDepth(5);

    this.addBakeoffImage('multiplier-badge-base', 988, 320, 3)?.setDisplaySize(176, 112);
    this.multiplierText = this.add
      .text(988, 321, 'x2.0\nClean tickets\nGreen serves', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        color: '#102033',
        fontStyle: '900',
        align: 'center',
        lineSpacing: 2,
        wordWrap: { width: 150 }
      })
      .setOrigin(0.5)
      .setDepth(5);
    this.multiplierText.setStroke('#fff4c7', 4);
    this.updateTimer();
  }

  private createStationButtons(): void {
    const positions = [
      { x: 166, y: 634 },
      { x: 356, y: 634 },
      { x: 546, y: 634 },
      { x: 736, y: 634 },
      { x: 926, y: 634 },
      { x: 1110, y: 626 }
    ];

    STATIONS.forEach((display, index) => {
      const isServe = display.step === 'serve';
      const buttonWidth = isServe ? SERVE_BUTTON_WIDTH : INGREDIENT_BUTTON_WIDTH;
      const buttonHeight = isServe ? SERVE_BUTTON_HEIGHT : INGREDIENT_BUTTON_HEIGHT;
      const frameWidth = isServe ? 184 : 150;
      const frameHeight = isServe ? 112 : 92;
      const iconSize = isServe ? 58 : 48;
      const labelX = isServe ? 26 : 20;
      const labelY = isServe ? 16 : 13;
      const numberX = -buttonWidth / 2 + 16;
      const numberY = -buttonHeight / 2 + 13;
      const labelColor = display.textColor;
      const labelStrokeColor = labelColor === '#ffffff' ? '#102033' : '#fff4c7';
      const container = this.add.container(positions[index].x, positions[index].y);
      const glow = this.add.rectangle(0, 0, buttonWidth + 16, buttonHeight + 16, 0xffd23f, 0.18).setStrokeStyle(4, 0xffd23f).setVisible(false);
      const glowImage = this.addBakeoffImage('station-current-glow', 0, 0, 0)?.setDisplaySize(frameHeight + 46, frameHeight + 46).setVisible(false);
      const ring = this.addBakeoffImage('station-next-ring', 0, 0, 0)?.setDisplaySize(frameHeight + 40, frameHeight + 40).setVisible(false);
      const frame = this.addBakeoffImage('station-button-frame', 0, 0, 0)?.setDisplaySize(frameWidth, frameHeight);
      const background = this.add
        .rectangle(0, 0, buttonWidth, buttonHeight, display.color, frame ? 0.08 : 1)
        .setStrokeStyle(frame ? 0 : 4, 0x102033)
        .setInteractive({ useHandCursor: true });
      const numberText = this.add
        .text(numberX, numberY, `${index + 1}`, {
          fontFamily: 'Arial, sans-serif',
          fontSize: isServe ? '17px' : '15px',
          color: labelColor,
          fontStyle: '900'
        })
        .setOrigin(0.5);
      numberText.setStroke(labelStrokeColor, labelColor === '#ffffff' ? 4 : 3);
      const icon = this.drawStationIcon(display.step);
      icon.setPosition(isServe ? -38 : -27, isServe ? 5 : 4);
      const stationImage = this.stationIconImage(icon);
      stationImage?.setDisplaySize(iconSize, iconSize);
      const label = this.add
        .text(labelX, labelY, display.label, {
          fontFamily: 'Arial, sans-serif',
          fontSize: isServe ? '20px' : '18px',
          color: labelColor,
          fontStyle: '900',
          align: 'center',
          wordWrap: { width: isServe ? 96 : 82 }
        })
        .setOrigin(0.5);
      label.setStroke(labelStrokeColor, labelColor === '#ffffff' ? 4 : 3);

      container.add([glow, ...(glowImage ? [glowImage] : []), ...(ring ? [ring] : []), ...(frame ? [frame] : []), background, numberText, icon, label]);
      background.on('pointerdown', () => this.chooseStation(display.step, background, display.color));

      const keyCode = [
        Phaser.Input.Keyboard.KeyCodes.ONE,
        Phaser.Input.Keyboard.KeyCodes.TWO,
        Phaser.Input.Keyboard.KeyCodes.THREE,
        Phaser.Input.Keyboard.KeyCodes.FOUR,
        Phaser.Input.Keyboard.KeyCodes.FIVE,
        Phaser.Input.Keyboard.KeyCodes.SIX
      ][index];
      const key = this.input.keyboard?.addKey(keyCode);
      if (key) {
        const handler = () => this.chooseStation(display.step, background, display.color);
        key.on('down', handler);
        this.keyBindings.push({ key, handler });
      }

      this.stationButtons.push(container);
      this.stationButtonStates.push({
        step: display.step,
        container,
        background,
        glow,
        glowImage,
        icon: this.stationIconImage(icon),
        ring,
        baseColor: display.color
      });
    });
  }

  private drawStationIcon(step: BakeRushStep): Phaser.GameObjects.Container {
    const icon = this.add.container(-27, 4);
    const assetKey = this.stationAssetKey(step);
    const sprite = this.addBakeoffImage(assetKey, 0, 0, 1);
    if (sprite) {
      sprite.setDisplaySize(48, 48);
      icon.add(sprite);
      return icon;
    }

    switch (step) {
      case 'base':
        icon.add(this.add.rectangle(0, 8, 46, 28, 0xfff4c7, 1).setStrokeStyle(3, 0x8c5b2e));
        icon.add(this.add.circle(0, -8, 22, 0xd56b6b, 1).setStrokeStyle(3, 0x8c5b2e));
        break;
      case 'frosting':
        icon.add(this.add.circle(0, 4, 28, 0xfff4c7, 1).setStrokeStyle(3, 0x8c5b2e));
        icon.add(this.add.circle(0, -9, 21, 0xff9ec7, 1).setStrokeStyle(3, 0x8c5b2e));
        break;
      case 'sprinkles':
        icon.add(this.add.circle(0, 0, 26, 0xfff4c7, 1).setStrokeStyle(3, 0x8c5b2e));
        icon.add(this.add.circle(-10, -5, 4, 0xf05f73, 1));
        icon.add(this.add.circle(7, -9, 4, 0x27b6a5, 1));
        icon.add(this.add.circle(6, 9, 4, 0x6b4a8c, 1));
        break;
      case 'berry':
        icon.add(this.add.circle(0, 0, 24, 0xf05f73, 1).setStrokeStyle(3, 0x8c5b2e));
        icon.add(this.add.circle(10, -10, 7, 0x38a16d, 1));
        break;
      case 'candle':
        icon.add(this.add.rectangle(0, 6, 18, 44, 0x27b6a5, 1).setStrokeStyle(3, 0x102033));
        icon.add(this.add.triangle(0, -26, -10, -10, 10, -10, 0, -30, 0xffd23f, 1));
        break;
      case 'serve':
        icon.add(this.add.rectangle(0, 11, 48, 12, 0xffffff, 1).setStrokeStyle(3, 0x102033));
        icon.add(this.add.circle(0, -8, 22, 0xffd23f, 1).setStrokeStyle(3, 0x102033));
        break;
    }

    return icon;
  }

  private chooseStation(step: BakeRushStep, background: Phaser.GameObjects.Rectangle, originalColor: number): void {
    if (this.locked || this.inputBlocked || this.answerPhase) {
      return;
    }

    const expected = this.expectedStep();
    if (!expected) {
      return;
    }

    if (step !== expected) {
      this.recordPrepMistake(background, originalColor, expected);
      return;
    }

    background.setFillStyle(0x38a16d);
    this.setStationVisualState(step, 'correct');
    this.playBakeoffSound('sfx-station-correct');
    this.completeStep(step);
    this.time.delayedCall(180, () => {
      background.setFillStyle(originalColor);
      this.setStationVisualState(step, 'normal');
    });
  }

  private recordPrepMistake(
    background: Phaser.GameObjects.Rectangle,
    originalColor: number,
    expected: BakeRushStep
  ): void {
    this.recipeMistakes += 1;
    this.timeRemainingMs = Math.max(0, this.timeRemainingMs - WRONG_TAP_TIME_PENALTY_MS);
    background.setFillStyle(0xf05f73);
    const buttonState = this.stationDisplayByBackground(background);
    this.setStationVisualState(buttonState?.step ?? expected, 'wrong');
    this.playBakeoffSound('sfx-station-wrong');
    this.feedbackText?.setText(`Wrong station. The ticket wants ${this.stepLabel(expected)} next.`);
    this.updateStatusText();
    this.cameras.main.shake(110, 0.003);
    this.spawnCorrectionPoof(640, 382);
    this.time.delayedCall(260, () => {
      background.setFillStyle(originalColor);
      this.setStationVisualState(buttonState?.step ?? expected, 'normal');
    });
  }

  private completeStep(step: BakeRushStep): void {
    const ticket = this.currentTicket();
    if (!ticket) {
      return;
    }

    if (step === 'serve') {
      const cleanServe = this.isServeInSweetSpot();
      if (!cleanServe) {
        this.serveMistakes += 1;
      }
      this.playBakeoffSound(cleanServe ? 'sfx-serve-green' : 'sfx-serve-miss');
      this.completeTicket(cleanServe);
      return;
    }

    this.markTicketStepComplete(step);
    this.addTrayPiece(step, this.currentStepIndex);
    this.currentStepIndex += 1;
    this.feedbackText?.setText('Good station. Keep building the ticket.');
    this.updatePrompt();
    this.updateStatusText();
    this.refreshStationHighlights();
  }

  private completeTicket(cleanServe: boolean): void {
    const ticket = this.currentTicket();
    if (!ticket) {
      return;
    }

    this.inputBlocked = true;
    this.setServeMeterActive(false);
    this.markTicketStepComplete('serve');
    this.addCompletedTreat(cleanServe);
    this.feedbackText?.setText(cleanServe ? 'Green serve. Judge loved the timing.' : 'Served, but outside the green zone.');
    this.spawnServeFeedback(cleanServe);
    this.playBakeoffSound('sfx-tray-slide');

    this.tweens.add({
      targets: this.trayPieces,
      x: '+=110',
      alpha: 0,
      duration: 260,
      ease: 'Quad.easeIn',
      onComplete: () => this.clearTrayPieces()
    });

    this.time.delayedCall(360, () => {
      this.currentTicketIndex += 1;
      this.currentStepIndex = 0;
      this.inputBlocked = false;

      if (this.currentTicketIndex >= this.order.tickets.length) {
        this.showMathQuestion();
        return;
      }

      this.renderCurrentTicket();
      this.updatePrompt();
      this.updateStatusText();
      this.refreshStationHighlights();
    });
  }

  private markTicketStepComplete(step: BakeRushStep): void {
    const slot = this.ticketSlots[this.currentStepIndex];
    const text = this.ticketTexts[this.currentStepIndex];
    const display = this.stationDisplay(step);
    slot?.setFillStyle(display.color, 0.98);
    text?.setText(`${this.currentStepIndex + 1}\n${display.shortLabel}`);
    text?.setColor(display.textColor);
  }

  private addTrayPiece(step: BakeRushStep, stepIndex: number): void {
    const display = this.stationDisplay(step);
    const x = 640 + (stepIndex - 1.5) * 28;
    const y = 384 - Math.min(stepIndex, 5) * 9;
    if (step === 'berry') {
      const berries = this.addBerryCluster(stepIndex);
      this.trayPieces.push(berries);
      this.playIngredientAnimation(step);
      return;
    }

    const treatKey = this.treatAssetKey(step);
    const treat = this.addTreatPieceImage(treatKey, step, stepIndex);
    if (treat) {
      this.trayPieces.push(treat);
      this.popIn(treat);
      this.playIngredientAnimation(step);
      return;
    }

    if (step === 'base') {
      const base = this.add.rectangle(640, 394, 184, 42, display.color, 1).setStrokeStyle(4, 0x8c5b2e).setDepth(4);
      this.trayPieces.push(base);
      this.popIn(base);
      return;
    }

    if (step === 'frosting') {
      const frosting = this.add.circle(640, 358, 54, display.color, 1).setStrokeStyle(4, 0x8c5b2e).setDepth(5);
      this.trayPieces.push(frosting);
      this.popIn(frosting);
      return;
    }

    if (step === 'sprinkles') {
      const sprinkles = [
        this.add.circle(603, 352, 7, 0xffd23f, 1).setDepth(6),
        this.add.circle(628, 336, 7, 0x27b6a5, 1).setDepth(6),
        this.add.circle(668, 344, 7, 0xf05f73, 1).setDepth(6),
        this.add.circle(684, 368, 7, 0x6b4a8c, 1).setDepth(6)
      ];
      this.trayPieces.push(...sprinkles);
      sprinkles.forEach((sprinkle) => this.popIn(sprinkle));
      this.playIngredientAnimation(step);
      return;
    }

    const piece = step === 'candle'
      ? this.add.rectangle(x, y - 10, 17, 56, display.color, 1).setStrokeStyle(3, 0x102033).setDepth(7)
      : this.add.circle(x, y, 22, display.color, 1).setStrokeStyle(3, 0x8c5b2e).setDepth(7);
    this.trayPieces.push(piece);
    this.popIn(piece);
  }

  private addBerryCluster(stepIndex: number): Phaser.GameObjects.Container {
    const layout = this.trayPieceLayout('berry', stepIndex);
    const container = this.add.container(layout.x, layout.y).setDepth(layout.depth);
    const shadow = this.add.ellipse(0, 15, 58, 18, 0x102033, 0.16);
    const berries = [
      this.add.circle(-18, 2, 14, 0xd9365f, 1),
      this.add.circle(0, -8, 15, 0xf05f73, 1),
      this.add.circle(18, 2, 14, 0xc91f4f, 1),
      this.add.circle(-4, 14, 13, 0xb61843, 1)
    ];
    const shines: Phaser.GameObjects.Arc[] = [];
    let leaf: Phaser.GameObjects.Ellipse | undefined;
    berries.forEach((berry, index) => {
      berry.setStrokeStyle(3, 0x7d1733, 0.75);
      shines.push(this.add.circle(berry.x - 4, berry.y - 5, 3, 0xffffff, 0.72));
      if (index === 1) {
        leaf = this.add.ellipse(10, -26, 22, 10, 0x38a16d, 0.94).setRotation(-0.45);
      }
    });
    container.add([shadow, ...berries, ...shines, ...(leaf ? [leaf] : [])]);
    container.setScale(0.35);
    this.tweens.add({
      targets: container,
      scaleX: 1,
      scaleY: 1,
      duration: 180,
      ease: 'Back.easeOut'
    });
    return container;
  }

  private addCompletedTreat(cleanServe: boolean): void {
    const rackSlot = rackAnchorGuide.rackSlots['judge-rack']?.[this.currentTicketIndex];
    const x = rackSlot ? 470 + rackSlot.x * 340 : 560 + this.currentTicketIndex * 80;
    const y = rackSlot ? 128 + rackSlot.y * 208 : 224;
    const container = this.add.container(x, y).setDepth(8);
    const plate = this.addBakeoffImage('serve-plate', 0, 20, 8)?.setDisplaySize(66, 66) ??
      this.add.ellipse(0, 22, 58, 16, 0xffffff, 0.9).setStrokeStyle(2, 0x102033, 0.55);
    const base = this.addBakeoffImage('treat-cupcake-base', 0, 18, 9)?.setDisplaySize(58, 42) ??
      this.add.rectangle(0, 11, 46, 22, 0xd56b6b, 1).setStrokeStyle(2, 0x8c5b2e);
    const top = this.addBakeoffImage(cleanServe ? 'treat-star-topper' : 'treat-frosting', 0, -12, 10)?.setDisplaySize(42, 42) ??
      this.add.circle(0, -6, 22, cleanServe ? 0xffd23f : 0xff9ec7, 1).setStrokeStyle(2, 0x8c5b2e);
    const badge = this.add.text(0, -7, cleanServe ? '!' : '~', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      color: '#102033',
      fontStyle: '900'
    }).setOrigin(0.5);
    container.add([plate, base, top, badge]);
    this.completedTreats.push(container);
    this.popIn(base);
    this.popIn(top);
  }

  private showMathQuestion(): void {
    this.answerPhase = true;
    this.inputBlocked = false;
    this.cleanupKeyboardHandlers();
    this.stationButtons.forEach((button) => button.destroy());
    this.stationButtons = [];
    this.stationButtonStates = [];
    this.setServeMeterActive(false);
    this.clearTicketSlots();
    this.clearTrayPieces();
    this.drawBatchMathVisual();

    this.ticketTitleText?.setText('Multiplier Math');
    this.ticketProgressText?.setText('Final judge question');
    this.ticketRecipeText?.setText(`Batch goal:\n${this.order.treatCount} treats x ${this.order.perTreat} toppings`);
    this.promptBack?.setPosition(PROMPT_CENTER_X, PROMPT_MATH_Y).setDisplaySize(760, 76).setDepth(23);
    this.promptText?.setPosition(PROMPT_CENTER_X, PROMPT_MATH_Y).setDepth(24);
    this.promptText?.setText(this.order.mathPrompt);
    this.feedbackText?.setText('Answer the batch math to lock in the score multiplier.');
    this.updateStatusText();
    this.createAnswerButtons();
  }

  private drawBatchMathVisual(): void {
    this.mathVisualObjects.forEach((object) => object.destroy());
    this.mathVisualObjects = [];

    const startX = 518;
    const gap = 60;
    const batchCard = this.addBakeoffImage('math-batch-card', 640, 360, 8)?.setDisplaySize(402, 160);
    if (batchCard) {
      this.mathVisualObjects.push(batchCard);
    }

    for (let treat = 0; treat < this.order.treatCount; treat += 1) {
      const x = startX + treat * gap;
      const card = this.addBakeoffImage('math-treat-count-card', x, 362, 9)?.setDisplaySize(54, 40);
      const base = this.addBakeoffImage('treat-cupcake-base', x, 360, 10)?.setDisplaySize(40, 30) ??
        this.add.rectangle(x, 356, 36, 20, 0xd56b6b, 1).setStrokeStyle(2, 0x8c5b2e).setDepth(9);
      if (card) {
        this.mathVisualObjects.push(card);
      }
      this.mathVisualObjects.push(base);

      for (let dot = 0; dot < this.order.perTreat; dot += 1) {
        const dotX = x - 17 + dot * 11;
        const topping = this.addBakeoffImage('math-topping-chip', dotX, 336, 11)?.setDisplaySize(15, 15) ??
          this.add.circle(dotX, 336, 5, this.stationDisplay(this.order.recipe[dot]).color, 1).setDepth(10);
        this.mathVisualObjects.push(topping);
      }
    }
  }

  private createAnswerButtons(): void {
    const positions = [
      { x: 310, y: 632 },
      { x: 530, y: 632 },
      { x: 750, y: 632 },
      { x: 970, y: 632 }
    ];

    Phaser.Utils.Array.Shuffle([...this.order.choices]).forEach((choice, index) => {
      const container = this.add.container(positions[index].x, positions[index].y);
      const card = this.addBakeoffImage('answer-card', 0, 0, 0)?.setDisplaySize(178, 102);
      const background = this.add
        .rectangle(0, 0, 178, 78, 0xffd23f)
        .setStrokeStyle(card ? 0 : 5, 0x102033)
        .setInteractive({ useHandCursor: true });
      if (card) {
        background.setAlpha(0.02);
      }
      const numberText = this.add
        .text(-65, -28, `${index + 1}`, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '16px',
          color: '#102033',
          fontStyle: '900'
        })
        .setOrigin(0.5);
      const answerText = this.add
        .text(0, 4, choice.toString(), {
          fontFamily: 'Arial, sans-serif',
          fontSize: '34px',
          color: '#102033',
          fontStyle: '900'
        })
        .setOrigin(0.5);
      const cardText = this.add
        .text(0, 32, 'moves', {
          fontFamily: 'Arial, sans-serif',
          fontSize: '15px',
          color: '#2f4056',
          fontStyle: '800'
        })
        .setOrigin(0.5);

      container.add([...(card ? [card] : []), background, numberText, answerText, cardText]);
      background.on('pointerdown', () => this.chooseAnswer(choice, background, card));

      const keyCode = [
        Phaser.Input.Keyboard.KeyCodes.ONE,
        Phaser.Input.Keyboard.KeyCodes.TWO,
        Phaser.Input.Keyboard.KeyCodes.THREE,
        Phaser.Input.Keyboard.KeyCodes.FOUR
      ][index];
      const key = this.input.keyboard?.addKey(keyCode);
      if (key) {
        const handler = () => this.chooseAnswer(choice, background, card);
        key.on('down', handler);
        this.keyBindings.push({ key, handler });
      }

      this.answerButtons.push(container);
    });
  }

  private chooseAnswer(
    choice: number,
    background: Phaser.GameObjects.Rectangle,
    card?: Phaser.GameObjects.Image
  ): void {
    if (this.locked) {
      return;
    }

    this.mathCorrect = choice === this.order.answer;
    background.setFillStyle(this.mathCorrect ? 0x38a16d : 0xf05f73);
    card?.setTexture(this.mathCorrect ? 'answer-card-correct' : 'answer-card-wrong');
    this.feedbackText?.setText(this.mathCorrect ? 'Correct batch math.' : `Close. The total was ${this.order.answer}.`);
    this.finish();
  }

  private finish(): void {
    this.locked = true;
    const result = buildBakeRushResult(this.recipeMistakes, this.mathCorrect, this.timeExpired, this.serveMistakes);
    const bonus = Math.max(0, Math.round(this.actionScore * (result.multiplier - 1)));
    const badgeKey = this.multiplierBadgeKey(result.multiplier);
    const badge = this.addBakeoffImage(badgeKey, 988, 320, 12);
    badge?.setDisplaySize(176, 112);
    this.playBakeoffSound('sfx-multiplier-reveal');

    this.multiplierText?.setText(`Multiplier x${result.multiplier.toFixed(1)}\nBonus +${bonus.toLocaleString('en-US')}`);
    this.multiplierText?.setColor('#102033');
    this.multiplierText?.setStroke('#fff4c7', 4);
    this.multiplierText?.setDepth(13);
    this.updateStatusText(result);
    this.launchFinishAnimation(result);

    this.resultTimer = window.setTimeout(() => {
      this.finishWithResult(result);
    }, 1100);
  }

  private finishWithResult(result: BakingStationResult): void {
    if (this.finished) {
      return;
    }

    this.finished = true;

    if (this.completion) {
      this.clearSceneTimers();
      const summary = buildLevelCompletionSummary(this.completion, result);
      const summaries = (this.registry.get('scoreSummaries') ?? []) as ScoreSummary[];
      this.registry.set('scoreSummaries', upsertLevelCompletionSummary(summaries, summary));
      this.scene.stop('PlayScene');
      this.scene.start('ResultsScene', { levelIndex: this.completion.level.index, summary });
      return;
    }

    if (this.eventKey) {
      this.game.events.emit(this.eventKey, result);
    }
    this.clearSceneTimers();
    this.scene.stop();
  }

  private markBakeOffReady(): void {
    if (this.transitionId) {
      this.game.events.emit(BAKEOFF_READY_EVENT, { transitionId: this.transitionId });
    }

    if (this.completion) {
      this.playWatchdogTimer = window.setTimeout(() => {
        this.finishWithResult(fallbackBakeOffResult());
      }, BAKEOFF_WATCHDOG_MS);
    }
  }

  private clearSceneTimers(): void {
    if (this.playWatchdogTimer !== undefined) {
      window.clearTimeout(this.playWatchdogTimer);
      this.playWatchdogTimer = undefined;
    }

    if (this.resultTimer !== undefined) {
      window.clearTimeout(this.resultTimer);
      this.resultTimer = undefined;
    }
  }

  private launchFinishAnimation(result: BakingStationResult): void {
    if (result.perfect) {
      this.addBakeoffImage('perfect-bake-badge', 640, 238, 20)?.setDisplaySize(210, 122);
      this.addBakeoffImage('bakeoff-confetti-1', 520, 300, 19)?.setDisplaySize(230, 230);
      this.addBakeoffImage('bakeoff-confetti-2', 760, 300, 19)?.setDisplaySize(230, 230);
      for (let index = 0; index < 16; index += 1) {
        const sparkleKey = index % 2 === 0 ? 'perfect-sparkle-1' : 'perfect-sparkle-2';
        const sparkle = this.addBakeoffImage(
          sparkleKey,
          532 + Phaser.Math.Between(0, 216),
          320 + Phaser.Math.Between(0, 92),
          20
        ) ?? this.add.star(532 + Phaser.Math.Between(0, 216), 320 + Phaser.Math.Between(0, 92), 5, 5, 13, 0xffd23f, 0.95).setDepth(20);
        sparkle.setDisplaySize(72, 72);
        this.tweens.add({
          targets: sparkle,
          y: sparkle.y - Phaser.Math.Between(30, 90),
          alpha: 0,
          duration: 760,
          ease: 'Quad.easeOut',
          onComplete: () => sparkle.destroy()
        });
      }
      return;
    }

    this.spawnCorrectionPoof(640, 356);
  }

  private handleTimeExpired(): void {
    if (this.locked || this.timeExpired) {
      return;
    }

    this.timeExpired = true;
    this.setServeMeterActive(false);

    if (this.answerPhase) {
      this.mathCorrect = false;
      this.feedbackText?.setText(`Time. The ingredient total was ${this.order.answer}.`);
      this.finish();
      return;
    }

    this.feedbackText?.setText('Time. The chef rushes the remaining tickets, but the multiplier drops.');
    this.showMathQuestion();
  }

  private renderCurrentTicket(): void {
    const ticket = this.currentTicket();
    if (!ticket) {
      return;
    }

    this.clearTicketSlots();
    this.ticketTitleText?.setText(ticket.label);
    this.ticketProgressText?.setText(`Ticket ${this.currentTicketIndex + 1}/${this.order.tickets.length}`);
    this.ticketRecipeText?.setText(`Recipe: ${ticket.ingredientSteps.map((step) => this.stepLabel(step)).join(' + ')}`);

    const gap = Math.min(64, 322 / Math.max(1, ticket.steps.length - 1));
    const startX = TICKET_SLOT_CENTER_X - ((ticket.steps.length - 1) * gap) / 2;
    ticket.steps.forEach((step, index) => {
      const x = startX + index * gap;
      const isCurrent = index === this.currentStepIndex;
      const slot = this.add
        .rectangle(x, 281, 56, 56, isCurrent ? 0xffec9f : 0xfff4c7, 1)
        .setStrokeStyle(isCurrent ? 5 : 3, isCurrent ? 0xffd23f : 0x102033)
        .setDepth(6);
      const text = this.add
        .text(x, 281, `${index + 1}\n${this.stepShortLabel(step)}`, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '13px',
          color: '#102033',
          fontStyle: '900',
          align: 'center',
          lineSpacing: 0,
          wordWrap: { width: 52 }
        })
        .setOrigin(0.5)
        .setDepth(7);
      this.ticketSlots.push(slot);
      this.ticketTexts.push(text);
    });
  }

  private updatePrompt(): void {
    const expected = this.expectedStep();
    if (!expected) {
      return;
    }

    if (expected === 'serve') {
      this.promptText?.setText('Serve: tap Bell on green.');
      this.setServeMeterActive(true);
    } else {
      this.promptText?.setText(`Tap ${this.stepLabel(expected)}.`);
      this.setServeMeterActive(false);
    }
  }

  private updateTimer(): void {
    const ratio = Phaser.Math.Clamp(this.timeRemainingMs / BAKE_RUSH_TIME_LIMIT_MS, 0, 1);
    if (this.timerFill) {
      this.timerFill.width = 200 * ratio;
      this.timerFill.setFillStyle(ratio > 0.35 ? 0x27b6a5 : 0xf05f73);
    }

    this.timerText?.setText(`Rush timer ${Math.ceil(this.timeRemainingMs / 1000)}s`);
  }

  private updateStatusText(finalResult?: BakingStationResult): void {
    if (finalResult) {
      this.statusText?.setText(
        finalResult.perfect
          ? 'Perfect bake-off. Full x2.0 multiplier.'
          : `Misses: ${finalResult.mistakes}. Final multiplier x${finalResult.multiplier.toFixed(1)}.`
      );
      return;
    }

    const ticketsDone = Math.min(this.currentTicketIndex, this.order.tickets.length);
    const timeCopy = this.timeExpired ? ' | time assist' : '';
    this.statusText?.setText(
      `Tickets ${ticketsDone}/${this.order.tickets.length} | Misses ${this.recipeMistakes + this.serveMistakes}${timeCopy}`
    );
  }

  private refreshStationHighlights(): void {
    const expected = this.expectedStep();

    for (const state of this.stationButtonStates) {
      const isExpected = !this.answerPhase && state.step === expected;
      state.glow.setVisible(isExpected);
      state.glowImage?.setVisible(isExpected);
      state.ring?.setVisible(isExpected);
      state.background.setStrokeStyle(isExpected ? 6 : 5, isExpected ? 0xffd23f : 0x102033);

      if (isExpected) {
        this.tweens.add({
          targets: [state.glow, state.glowImage, state.ring].filter(Boolean),
          alpha: { from: 0.18, to: 0.34 },
          duration: 360,
          yoyo: true,
          repeat: 1
        });
      }
    }
  }

  private animateConveyor(delta: number): void {
    const amount = (delta / 1000) * 34;
    for (const stripe of this.conveyorStripes) {
      stripe.x += amount;
      if (stripe.x > 888) {
        stripe.x = 392;
      }
    }
  }

  private animateServeMeter(delta: number): void {
    if (!this.serveMarker?.visible) {
      return;
    }

    this.serveMarkerX += this.serveMarkerDirection * SERVE_METER_SPEED * (delta / 1000);
    if (this.serveMarkerX >= SERVE_METER_RIGHT) {
      this.serveMarkerX = SERVE_METER_RIGHT;
      this.serveMarkerDirection = -1;
    } else if (this.serveMarkerX <= SERVE_METER_LEFT) {
      this.serveMarkerX = SERVE_METER_LEFT;
      this.serveMarkerDirection = 1;
    }

    this.serveMarker.setX(this.serveMarkerX);
  }

  private setServeMeterActive(active: boolean): void {
    this.serveMeterTrack?.setVisible(active);
    this.serveSweetZoneBack?.setVisible(active);
    this.serveSweetZone?.setVisible(active);
    this.serveMarker?.setVisible(active);
    this.serveMeterText?.setVisible(active);

    if (active && this.serveMarker) {
      this.serveMarkerX = Phaser.Math.Clamp(this.serveMarkerX, SERVE_METER_LEFT, SERVE_METER_RIGHT);
      this.serveMarker.setX(this.serveMarkerX);
    }
  }

  private isServeInSweetSpot(): boolean {
    return this.serveMarkerX >= SERVE_SWEET_LEFT && this.serveMarkerX <= SERVE_SWEET_RIGHT;
  }

  private currentTicket(): BakeRushTicket | undefined {
    return this.order.tickets[this.currentTicketIndex];
  }

  private expectedStep(): BakeRushStep | undefined {
    return this.currentTicket()?.steps[this.currentStepIndex];
  }

  private stationDisplay(step: BakeRushStep): StationDisplay {
    return STATIONS.find((display) => display.step === step) ?? STATIONS[0];
  }

  private stepLabel(step: BakeRushStep): string {
    if (step === 'base') {
      return 'Base';
    }

    if (step === 'serve') {
      return 'Serve';
    }

    return INGREDIENT_LABELS[step];
  }

  private stepShortLabel(step: BakeRushStep): string {
    return this.stationDisplay(step).shortLabel;
  }

  private popIn(gameObject: Phaser.GameObjects.Shape | Phaser.GameObjects.Image): void {
    const targetScaleX = gameObject.scaleX;
    const targetScaleY = gameObject.scaleY;
    gameObject.setScale(targetScaleX * 0.35, targetScaleY * 0.35);
    this.tweens.add({
      targets: gameObject,
      scaleX: targetScaleX,
      scaleY: targetScaleY,
      duration: 180,
      ease: 'Back.easeOut'
    });
  }

  private spawnCorrectionPoof(x: number, y: number): void {
    const correction = this.addBakeoffImage('correction-poof-1', x, y, 20) ??
      this.add.circle(x, y, 74, 0xffffff, 0.72).setStrokeStyle(5, 0xf05f73).setDepth(20);
    correction.setDisplaySize(150, 150);
    if (correction instanceof Phaser.GameObjects.Image && this.textures.exists('correction-poof-2')) {
      this.time.delayedCall(120, () => correction.setTexture('correction-poof-2'));
    }
    this.tweens.add({
      targets: correction,
      scale: 1.35,
      alpha: 0,
      duration: 620,
      ease: 'Quad.easeOut',
      onComplete: () => correction.destroy()
    });
  }

  private spawnServeFeedback(cleanServe: boolean): void {
    const key = cleanServe ? 'serve-hit-burst' : 'serve-miss-wobble';
    const effect = this.addBakeoffImage(key, 640, 382, 21);
    if (effect) {
      effect.setDisplaySize(150, 150);
      this.tweens.add({
        targets: effect,
        scale: cleanServe ? 1.25 : 1.1,
        angle: cleanServe ? 0 : { from: -5, to: 5 },
        alpha: 0,
        duration: cleanServe ? 560 : 680,
        yoyo: !cleanServe,
        ease: 'Quad.easeOut',
        onComplete: () => effect.destroy()
      });
    }

    if (!cleanServe) {
      this.cameras.main.shake(120, 0.003);
    }
  }

  private playIngredientAnimation(step: BakeRushStep): void {
    const animationKeys = this.ingredientAnimationKeys(step);
    if (!animationKeys) {
      return;
    }

    const effect = this.addBakeoffImage(animationKeys[0], 640, 354, 18);
    if (!effect) {
      return;
    }

    effect.setDisplaySize(118, 118);
    this.time.delayedCall(110, () => {
      if (this.textures.exists(animationKeys[1])) {
        effect.setTexture(animationKeys[1]);
      }
    });
    this.tweens.add({
      targets: effect,
      scale: 1.12,
      alpha: 0,
      duration: 430,
      ease: 'Quad.easeOut',
      onComplete: () => effect.destroy()
    });
  }

  private ingredientAnimationKeys(step: BakeRushStep): [BakeoffAssetKey, BakeoffAssetKey] | undefined {
    switch (step) {
      case 'base':
        return ['mixing-bowl-1', 'mixing-bowl-2'];
      case 'frosting':
        return ['frosting-apply-1', 'frosting-apply-2'];
      case 'sprinkles':
        return ['sprinkle-burst-1', 'sprinkle-burst-2'];
      default:
        return undefined;
    }
  }

  private addTreatPieceImage(
    key: BakeoffAssetKey,
    step: BakeRushStep,
    stepIndex: number
  ): Phaser.GameObjects.Image | undefined {
    const layout = this.trayPieceLayout(step, stepIndex);
    const image = this.addBakeoffImage(key, layout.x, layout.y, layout.depth);
    if (!image) {
      return undefined;
    }

    image.setOrigin(0.5);
    image.setDisplaySize(layout.width, layout.height);
    return image;
  }

  private trayPieceLayout(
    step: BakeRushStep,
    stepIndex: number
  ): { x: number; y: number; width: number; height: number; depth: number } {
    switch (step) {
      case 'base':
        return { x: 640, y: 405, width: 136, height: 98, depth: 8 };
      case 'frosting':
        return { x: 640, y: 356, width: 118, height: 88, depth: 9 };
      case 'sprinkles':
        return { x: 640, y: 326, width: 92, height: 58, depth: 11 };
      case 'berry':
        return { x: 672 - Math.min(stepIndex, 2) * 10, y: 332, width: 72, height: 58, depth: 12 };
      case 'candle':
        return { x: 655, y: 288, width: 44, height: 78, depth: 13 };
      case 'serve':
        return { x: 640, y: 407, width: 86, height: 62, depth: 7 };
    }
  }

  private treatAssetKey(step: BakeRushStep): BakeoffAssetKey {
    switch (step) {
      case 'base':
        return 'treat-cupcake-base';
      case 'frosting':
        return 'treat-frosting';
      case 'sprinkles':
        return 'treat-sprinkles';
      case 'berry':
        return 'treat-berry';
      case 'candle':
        return 'treat-candle';
      case 'serve':
        return 'serve-plate';
    }
  }

  private stationAssetKey(step: BakeRushStep, state: 'normal' | 'correct' | 'wrong' | 'pressed' | 'disabled' = 'normal'): BakeoffAssetKey {
    const baseKey = `station-${step}`;
    return (state === 'normal' ? baseKey : `${baseKey}-${state}`) as BakeoffAssetKey;
  }

  private setStationVisualState(step: BakeRushStep, state: 'normal' | 'correct' | 'wrong' | 'pressed' | 'disabled'): void {
    const stationState = this.stationButtonStates.find((button) => button.step === step);
    const iconKey = this.stationAssetKey(step, state);
    if (stationState?.icon && this.textures.exists(iconKey)) {
      stationState.icon.setTexture(iconKey);
    }
  }

  private stationDisplayByBackground(background: Phaser.GameObjects.Rectangle): StationButtonState | undefined {
    return this.stationButtonStates.find((state) => state.background === background);
  }

  private stationIconImage(iconContainer: Phaser.GameObjects.Container): Phaser.GameObjects.Image | undefined {
    return iconContainer.list.find((item): item is Phaser.GameObjects.Image => item instanceof Phaser.GameObjects.Image);
  }

  private multiplierBadgeKey(multiplier: number): BakeoffAssetKey {
    if (multiplier >= 2) {
      return 'multiplier-badge-20';
    }

    if (multiplier >= 1.5) {
      return 'multiplier-badge-15';
    }

    return 'multiplier-badge-12';
  }

  private bakeoffBackgroundKey(): BakeoffAssetKey {
    if (this.station.id.includes('yarn')) {
      return 'bakeoff-bg-yarn';
    }

    if (this.station.id.includes('tower') || this.station.id.includes('birthday')) {
      return 'bakeoff-bg-tower';
    }

    if (this.station.id.includes('frosting') || this.station.id.includes('factory')) {
      return 'bakeoff-bg-bakery';
    }

    return 'bakeoff-bg';
  }

  private addBakeoffImage(key: BakeoffAssetKey, x: number, y: number, depth: number): Phaser.GameObjects.Image | undefined {
    if (!this.textures.exists(key)) {
      return undefined;
    }

    return this.add.image(x, y, key).setDepth(depth);
  }

  private playBakeoffSound(key: BakeoffAudioKey): void {
    if (!this.cache.audio.exists(key)) {
      return;
    }

    try {
      this.sound.play(key, { volume: 0.35 });
    } catch {
      // Some browsers delay audio context unlock until a direct player gesture.
    }
  }

  private clearTicketSlots(): void {
    this.ticketSlots.forEach((slot) => slot.destroy());
    this.ticketTexts.forEach((text) => text.destroy());
    this.ticketSlots = [];
    this.ticketTexts = [];
  }

  private clearTrayPieces(): void {
    this.trayPieces.forEach((piece) => piece.destroy());
    this.trayPieces = [];
  }

  private cleanupKeyboardHandlers(): void {
    for (const binding of this.keyBindings) {
      binding.key.off('down', binding.handler);
    }

    this.keyBindings = [];
  }
}
