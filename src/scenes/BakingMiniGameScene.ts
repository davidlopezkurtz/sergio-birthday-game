import Phaser from 'phaser';
import {
  buildBakeRushOrder,
  buildBakeRushResult,
  type BakeRushOrder,
  type BakeRushStep,
  type BakeRushTicket
} from '../game/bakeRush';
import type { BakingIngredient, BakingStationDefinition, BakingStationResult } from '../types';

export interface BakingMiniGameSceneData {
  station: BakingStationDefinition;
  eventKey: string;
  stationNumber: number;
  actionScore?: number;
  levelTitle?: string;
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
  baseColor: number;
}

const BAKE_RUSH_TIME_LIMIT_MS = 42000;
const WRONG_TAP_TIME_PENALTY_MS = 2200;
const SERVE_METER_LEFT = 538;
const SERVE_METER_RIGHT = 742;
const SERVE_SWEET_LEFT = 613;
const SERVE_SWEET_RIGHT = 667;
const SERVE_METER_SPEED = 340;

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
  private actionScore = 0;
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
  private promptText?: Phaser.GameObjects.Text;
  private statusText?: Phaser.GameObjects.Text;
  private ticketTitleText?: Phaser.GameObjects.Text;
  private ticketRecipeText?: Phaser.GameObjects.Text;
  private ticketProgressText?: Phaser.GameObjects.Text;
  private timerText?: Phaser.GameObjects.Text;
  private timerFill?: Phaser.GameObjects.Rectangle;
  private multiplierText?: Phaser.GameObjects.Text;
  private serveMeterText?: Phaser.GameObjects.Text;
  private serveMeterTrack?: Phaser.GameObjects.Rectangle;
  private serveSweetZone?: Phaser.GameObjects.Rectangle;
  private serveMarker?: Phaser.GameObjects.Rectangle;
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
    this.eventKey = data.eventKey;
    this.actionScore = data.actionScore ?? 0;
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

  create(data: BakingMiniGameSceneData): void {
    this.createBackdrop(data.levelTitle ?? this.station.label);
    this.createTicketPanel();
    this.createBakeStage();
    this.createScorePanel();
    this.createStationButtons();
    this.renderCurrentTicket();
    this.updatePrompt();
    this.updateStatusText();
    this.refreshStationHighlights();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanupKeyboardHandlers());
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
    this.add.rectangle(640, 360, 1280, 720, 0x102033, 0.76);
    this.add.rectangle(640, 360, 1140, 642, 0xfffcf1, 1).setStrokeStyle(8, 0xffd23f);
    this.add.rectangle(640, 82, 1060, 76, 0x6b4a8c, 1).setStrokeStyle(4, 0x102033);

    this.add
      .text(640, 60, 'Judge Order Bake Rush', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '34px',
        color: '#ffffff',
        fontStyle: '900'
      })
      .setOrigin(0.5);

    this.add
      .text(640, 102, levelTitle, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '22px',
        color: '#ffec9f',
        fontStyle: '900',
        align: 'center',
        wordWrap: { width: 920 }
      })
      .setOrigin(0.5);

    this.feedbackText = this.add
      .text(640, 648, 'Match each judge ticket, then nail the serve timing for a better multiplier.', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        color: '#2f4056',
        fontStyle: '900',
        align: 'center',
        wordWrap: { width: 940 }
      })
      .setOrigin(0.5);

    this.statusText = this.add
      .text(640, 682, '', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '17px',
        color: '#6b4a8c',
        fontStyle: '900',
        align: 'center',
        wordWrap: { width: 940 }
      })
      .setOrigin(0.5);
  }

  private createTicketPanel(): void {
    this.add.rectangle(306, 290, 416, 306, 0xffffff, 1).setStrokeStyle(6, 0x102033);
    this.ticketTitleText = this.add
      .text(306, 164, '', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '25px',
        color: '#102033',
        fontStyle: '900',
        align: 'center'
      })
      .setOrigin(0.5);
    this.ticketProgressText = this.add
      .text(306, 199, '', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        color: '#6b4a8c',
        fontStyle: '900',
        align: 'center'
      })
      .setOrigin(0.5);
    this.ticketRecipeText = this.add
      .text(306, 382, '', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '17px',
        color: '#2f4056',
        fontStyle: '800',
        align: 'center',
        wordWrap: { width: 342 }
      })
      .setOrigin(0.5);
  }

  private createBakeStage(): void {
    this.add.rectangle(640, 308, 490, 300, 0xd56b6b, 0.97).setStrokeStyle(5, 0x102033);
    this.add.rectangle(640, 326, 560, 92, 0x8c5b2e, 1).setStrokeStyle(4, 0x102033, 0.55);
    this.add.rectangle(640, 314, 532, 54, 0xfff4c7, 0.22);

    for (let index = 0; index < 9; index += 1) {
      this.conveyorStripes.push(this.add.rectangle(410 + index * 62, 314, 28, 54, 0xfff4c7, 0.28));
    }

    this.add
      .text(640, 188, 'Judge Rack', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '17px',
        color: '#102033',
        fontStyle: '900'
      })
      .setOrigin(0.5);
    this.add.rectangle(640, 220, 290, 54, 0xffffff, 0.72).setStrokeStyle(3, 0x102033, 0.55);

    this.add.rectangle(640, 382, 362, 92, 0xfff4c7, 1).setStrokeStyle(5, 0x102033);
    this.add.ellipse(640, 383, 310, 58, 0xffffff, 0.55).setStrokeStyle(3, 0x8c5b2e, 0.45);
    this.add
      .text(640, 344, 'Prep Tray', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '17px',
        color: '#102033',
        fontStyle: '900'
      })
      .setOrigin(0.5);

    this.promptText = this.add
      .text(640, 470, '', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '23px',
        color: '#102033',
        fontStyle: '900',
        align: 'center',
        wordWrap: { width: 620 }
      })
      .setOrigin(0.5);

    this.serveMeterTrack = this.add.rectangle(640, 514, 240, 18, 0x102033, 0.24).setStrokeStyle(3, 0x102033, 0.45);
    this.serveSweetZone = this.add.rectangle(640, 514, SERVE_SWEET_RIGHT - SERVE_SWEET_LEFT, 26, 0x38a16d, 0.95);
    this.serveMarker = this.add.rectangle(this.serveMarkerX, 514, 14, 40, 0xffd23f, 1).setStrokeStyle(2, 0x102033);
    this.serveMeterText = this.add
      .text(640, 540, 'Serve when the bell hits green', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '15px',
        color: '#102033',
        fontStyle: '900'
      })
      .setOrigin(0.5);
    this.setServeMeterActive(false);
  }

  private createScorePanel(): void {
    this.add.rectangle(984, 290, 314, 306, 0x102033, 0.94).setStrokeStyle(5, 0xffd23f);
    this.add
      .text(984, 166, `Course score\n${this.actionScore.toLocaleString('en-US')}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '22px',
        color: '#ffffff',
        fontStyle: '900',
        align: 'center',
        lineSpacing: 5
      })
      .setOrigin(0.5);

    this.add.rectangle(984, 238, 230, 26, 0xffffff, 0.18).setStrokeStyle(3, 0xffffff, 0.6);
    this.timerFill = this.add.rectangle(871, 238, 226, 22, 0x27b6a5, 1).setOrigin(0, 0.5);
    this.timerText = this.add
      .text(984, 274, '', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '19px',
        color: '#ffec9f',
        fontStyle: '900'
      })
      .setOrigin(0.5);

    this.multiplierText = this.add
      .text(984, 354, 'Perfect tickets + green serves\nkeep the x2.0 multiplier.\nMisses step down to x1.5 or x1.2.', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: '800',
        align: 'center',
        lineSpacing: 5,
        wordWrap: { width: 250 }
      })
      .setOrigin(0.5);
    this.updateTimer();
  }

  private createStationButtons(): void {
    const positions = [
      { x: 180, y: 580 },
      { x: 360, y: 580 },
      { x: 540, y: 580 },
      { x: 720, y: 580 },
      { x: 900, y: 580 },
      { x: 1080, y: 580 }
    ];

    STATIONS.forEach((display, index) => {
      const container = this.add.container(positions[index].x, positions[index].y);
      const glow = this.add.rectangle(0, 0, 170, 92, 0xffd23f, 0.24).setStrokeStyle(5, 0xffd23f).setVisible(false);
      const background = this.add
        .rectangle(0, 0, 154, 78, display.color)
        .setStrokeStyle(5, 0x102033)
        .setInteractive({ useHandCursor: true });
      const numberText = this.add
        .text(-58, -25, `${index + 1}`, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '17px',
          color: display.textColor,
          fontStyle: '900'
        })
        .setOrigin(0.5);
      const icon = this.drawStationIcon(display.step);
      const label = this.add
        .text(24, 16, display.label, {
          fontFamily: 'Arial, sans-serif',
          fontSize: display.label.length > 8 ? '17px' : '20px',
          color: display.textColor,
          fontStyle: '900',
          align: 'center',
          wordWrap: { width: 96 }
        })
        .setOrigin(0.5);

      container.add([glow, background, numberText, icon, label]);
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
      this.stationButtonStates.push({ step: display.step, container, background, glow, baseColor: display.color });
    });
  }

  private drawStationIcon(step: BakeRushStep): Phaser.GameObjects.Container {
    const icon = this.add.container(-30, 5);

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
    this.completeStep(step);
    this.time.delayedCall(140, () => background.setFillStyle(originalColor));
  }

  private recordPrepMistake(
    background: Phaser.GameObjects.Rectangle,
    originalColor: number,
    expected: BakeRushStep
  ): void {
    this.recipeMistakes += 1;
    this.timeRemainingMs = Math.max(0, this.timeRemainingMs - WRONG_TAP_TIME_PENALTY_MS);
    background.setFillStyle(0xf05f73);
    this.feedbackText?.setText(`Wrong station. The ticket wants ${this.stepLabel(expected)} next.`);
    this.updateStatusText();
    this.cameras.main.shake(110, 0.003);
    this.spawnCorrectionPoof(640, 382);
    this.time.delayedCall(220, () => background.setFillStyle(originalColor));
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
      return;
    }

    const piece = step === 'candle'
      ? this.add.rectangle(x, y - 10, 17, 56, display.color, 1).setStrokeStyle(3, 0x102033).setDepth(7)
      : this.add.circle(x, y, 22, display.color, 1).setStrokeStyle(3, 0x8c5b2e).setDepth(7);
    this.trayPieces.push(piece);
    this.popIn(piece);
  }

  private addCompletedTreat(cleanServe: boolean): void {
    const x = 560 + this.currentTicketIndex * 80;
    const y = 224;
    const container = this.add.container(x, y).setDepth(8);
    const plate = this.add.ellipse(0, 22, 58, 16, 0xffffff, 0.9).setStrokeStyle(2, 0x102033, 0.55);
    const base = this.add.rectangle(0, 11, 46, 22, 0xd56b6b, 1).setStrokeStyle(2, 0x8c5b2e);
    const top = this.add.circle(0, -6, 22, cleanServe ? 0xffd23f : 0xff9ec7, 1).setStrokeStyle(2, 0x8c5b2e);
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
    this.ticketRecipeText?.setText(`${this.order.treatCount} treats x ${this.order.perTreat} topping moves each`);
    this.promptText?.setText(this.order.mathPrompt);
    this.feedbackText?.setText('Answer the batch math to lock in the score multiplier.');
    this.updateStatusText();
    this.createAnswerButtons();
  }

  private drawBatchMathVisual(): void {
    this.mathVisualObjects.forEach((object) => object.destroy());
    this.mathVisualObjects = [];

    const startX = 515;
    const gap = 62;
    for (let treat = 0; treat < this.order.treatCount; treat += 1) {
      const x = startX + treat * gap;
      const plate = this.add.ellipse(x, 382, 48, 18, 0xffffff, 0.9).setStrokeStyle(2, 0x102033, 0.45).setDepth(9);
      const base = this.add.rectangle(x, 368, 38, 22, 0xd56b6b, 1).setStrokeStyle(2, 0x8c5b2e).setDepth(9);
      this.mathVisualObjects.push(plate, base);

      for (let dot = 0; dot < this.order.perTreat; dot += 1) {
        const dotX = x - 17 + dot * 11;
        const topping = this.add.circle(dotX, 346, 5, this.stationDisplay(this.order.recipe[dot]).color, 1).setDepth(10);
        this.mathVisualObjects.push(topping);
      }
    }
  }

  private createAnswerButtons(): void {
    const positions = [
      { x: 310, y: 580 },
      { x: 530, y: 580 },
      { x: 750, y: 580 },
      { x: 970, y: 580 }
    ];

    Phaser.Utils.Array.Shuffle([...this.order.choices]).forEach((choice, index) => {
      const container = this.add.container(positions[index].x, positions[index].y);
      const background = this.add
        .rectangle(0, 0, 188, 86, 0xffd23f)
        .setStrokeStyle(5, 0x102033)
        .setInteractive({ useHandCursor: true });
      const numberText = this.add
        .text(-70, -30, `${index + 1}`, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '18px',
          color: '#102033',
          fontStyle: '900'
        })
        .setOrigin(0.5);
      const answerText = this.add
        .text(0, 4, choice.toString(), {
          fontFamily: 'Arial, sans-serif',
          fontSize: '36px',
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

      container.add([background, numberText, answerText, cardText]);
      background.on('pointerdown', () => this.chooseAnswer(choice, background));

      const keyCode = [
        Phaser.Input.Keyboard.KeyCodes.ONE,
        Phaser.Input.Keyboard.KeyCodes.TWO,
        Phaser.Input.Keyboard.KeyCodes.THREE,
        Phaser.Input.Keyboard.KeyCodes.FOUR
      ][index];
      const key = this.input.keyboard?.addKey(keyCode);
      if (key) {
        const handler = () => this.chooseAnswer(choice, background);
        key.on('down', handler);
        this.keyBindings.push({ key, handler });
      }

      this.answerButtons.push(container);
    });
  }

  private chooseAnswer(choice: number, background: Phaser.GameObjects.Rectangle): void {
    if (this.locked) {
      return;
    }

    this.mathCorrect = choice === this.order.answer;
    background.setFillStyle(this.mathCorrect ? 0x38a16d : 0xf05f73);
    this.feedbackText?.setText(this.mathCorrect ? 'Correct batch math.' : `Close. The total was ${this.order.answer}.`);
    this.finish();
  }

  private finish(): void {
    this.locked = true;
    const result = buildBakeRushResult(this.recipeMistakes, this.mathCorrect, this.timeExpired, this.serveMistakes);
    const bonus = Math.max(0, Math.round(this.actionScore * (result.multiplier - 1)));
    const badgeColor = result.perfect ? '#38a16d' : result.multiplier >= 1.5 ? '#ff9ec7' : '#f05f73';

    this.multiplierText?.setText(`Multiplier x${result.multiplier.toFixed(1)}\nBonus +${bonus.toLocaleString('en-US')}`);
    this.multiplierText?.setColor(badgeColor);
    this.updateStatusText(result);
    this.launchFinishAnimation(result);

    this.time.delayedCall(1100, () => {
      this.game.events.emit(this.eventKey, result);
      this.scene.stop();
    });
  }

  private launchFinishAnimation(result: BakingStationResult): void {
    if (result.perfect) {
      for (let index = 0; index < 20; index += 1) {
        const sparkle = this.add
          .star(532 + Phaser.Math.Between(0, 216), 320 + Phaser.Math.Between(0, 92), 5, 5, 13, 0xffd23f, 0.95)
          .setDepth(20);
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
    const startX = 306 - ((ticket.steps.length - 1) * gap) / 2;
    ticket.steps.forEach((step, index) => {
      const x = startX + index * gap;
      const isCurrent = index === this.currentStepIndex;
      const slot = this.add
        .rectangle(x, 281, 56, 56, isCurrent ? 0xffec9f : 0xfff4c7, 1)
        .setStrokeStyle(isCurrent ? 5 : 3, isCurrent ? 0xffd23f : 0x102033);
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
        .setOrigin(0.5);
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
      this.promptText?.setText('Serve: hit the bell station while the marker crosses green.');
      this.setServeMeterActive(true);
    } else {
      this.promptText?.setText(`Next station: ${this.stepLabel(expected)}.`);
      this.setServeMeterActive(false);
    }
  }

  private updateTimer(): void {
    const ratio = Phaser.Math.Clamp(this.timeRemainingMs / BAKE_RUSH_TIME_LIMIT_MS, 0, 1);
    if (this.timerFill) {
      this.timerFill.width = 226 * ratio;
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
    const timeCopy = this.timeExpired ? ' | time assist used' : '';
    this.statusText?.setText(
      `Tickets ${ticketsDone}/${this.order.tickets.length} | Prep misses ${this.recipeMistakes} | Serve misses ${this.serveMistakes}${timeCopy}`
    );
  }

  private refreshStationHighlights(): void {
    const expected = this.expectedStep();

    for (const state of this.stationButtonStates) {
      const isExpected = !this.answerPhase && state.step === expected;
      state.glow.setVisible(isExpected);
      state.background.setStrokeStyle(isExpected ? 6 : 5, isExpected ? 0xffd23f : 0x102033);

      if (isExpected) {
        this.tweens.add({
          targets: state.glow,
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

  private popIn(gameObject: Phaser.GameObjects.Shape): void {
    gameObject.setScale(0.35);
    this.tweens.add({
      targets: gameObject,
      scale: 1,
      duration: 180,
      ease: 'Back.easeOut'
    });
  }

  private spawnCorrectionPoof(x: number, y: number): void {
    const correction = this.add.circle(x, y, 74, 0xffffff, 0.72).setStrokeStyle(5, 0xf05f73).setDepth(20);
    this.tweens.add({
      targets: correction,
      scale: 1.35,
      alpha: 0,
      duration: 620,
      ease: 'Quad.easeOut',
      onComplete: () => correction.destroy()
    });
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
