import Phaser from 'phaser';
import {
  buildBakeRushOrder,
  buildBakeRushResult,
  expectedBakeRushStep,
  isCorrectBakeRushStep,
  type BakeRushOrder,
  type BakeRushStep
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

const BAKE_RUSH_TIME_LIMIT_MS = 45000;

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
  private stepIndex = 0;
  private recipeMistakes = 0;
  private mathCorrect = false;
  private locked = false;
  private answerPhase = false;
  private timeExpired = false;
  private timeRemainingMs = BAKE_RUSH_TIME_LIMIT_MS;
  private feedbackText?: Phaser.GameObjects.Text;
  private promptText?: Phaser.GameObjects.Text;
  private mistakeText?: Phaser.GameObjects.Text;
  private timerText?: Phaser.GameObjects.Text;
  private timerFill?: Phaser.GameObjects.Rectangle;
  private multiplierText?: Phaser.GameObjects.Text;
  private ticketSlots: Phaser.GameObjects.Rectangle[] = [];
  private ticketTexts: Phaser.GameObjects.Text[] = [];
  private stationButtons: Phaser.GameObjects.Container[] = [];
  private answerButtons: Phaser.GameObjects.Container[] = [];
  private trayPieces: Phaser.GameObjects.GameObject[] = [];
  private keyBindings: { key: Phaser.Input.Keyboard.Key; handler: () => void }[] = [];

  constructor() {
    super('BakingMiniGameScene');
  }

  init(data: BakingMiniGameSceneData): void {
    this.station = data.station;
    this.order = buildBakeRushOrder(data.station, data.stationNumber);
    this.eventKey = data.eventKey;
    this.actionScore = data.actionScore ?? 0;
    this.stepIndex = 0;
    this.recipeMistakes = 0;
    this.mathCorrect = false;
    this.locked = false;
    this.answerPhase = false;
    this.timeExpired = false;
    this.timeRemainingMs = BAKE_RUSH_TIME_LIMIT_MS;
    this.ticketSlots = [];
    this.ticketTexts = [];
    this.stationButtons = [];
    this.answerButtons = [];
    this.trayPieces = [];
    this.keyBindings = [];
  }

  create(data: BakingMiniGameSceneData): void {
    this.createBackdrop(data.levelTitle ?? this.station.label);
    this.createTicket();
    this.createScorePanel();
    this.createTray();
    this.createStationButtons();
    this.updatePrompt();
    this.updateStatusText();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanupKeyboardHandlers());
  }

  update(_time: number, delta: number): void {
    if (this.locked || this.timeExpired) {
      return;
    }

    this.timeRemainingMs = Math.max(0, this.timeRemainingMs - delta);
    this.updateTimer();

    if (this.timeRemainingMs <= 0) {
      this.handleTimeExpired();
    }
  }

  private createBackdrop(levelTitle: string): void {
    this.cameras.main.setBackgroundColor('rgba(16, 32, 51, 0.74)');
    this.add.rectangle(640, 360, 1280, 720, 0x102033, 0.76);
    this.add.rectangle(640, 360, 1120, 640, 0xfffcf1, 1).setStrokeStyle(8, 0xffd23f);
    this.add.rectangle(640, 88, 1050, 82, 0x6b4a8c, 1).setStrokeStyle(4, 0x102033);

    this.add
      .text(640, 66, 'Judge Order Bake Rush', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '34px',
        color: '#ffffff',
        fontStyle: '900'
      })
      .setOrigin(0.5);

    this.add
      .text(640, 108, levelTitle, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        color: '#ffec9f',
        fontStyle: '900',
        align: 'center',
        wordWrap: { width: 900 }
      })
      .setOrigin(0.5);

    this.add.rectangle(640, 372, 604, 178, 0xd56b6b, 0.95).setStrokeStyle(5, 0x102033, 0.75);
    this.add.rectangle(640, 344, 720, 46, 0x8c5b2e, 0.95).setStrokeStyle(4, 0x102033, 0.5);

    this.promptText = this.add
      .text(640, 452, '', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        color: '#102033',
        fontStyle: '900',
        align: 'center',
        wordWrap: { width: 760 }
      })
      .setOrigin(0.5);

    this.feedbackText = this.add
      .text(640, 632, 'Build the judge ticket on the tray. Fast, clean orders earn the biggest multiplier.', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        color: '#2f4056',
        fontStyle: '800',
        align: 'center',
        wordWrap: { width: 880 }
      })
      .setOrigin(0.5);

    this.mistakeText = this.add
      .text(640, 666, '', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        color: '#6b4a8c',
        fontStyle: '900',
        align: 'center',
        wordWrap: { width: 900 }
      })
      .setOrigin(0.5);
  }

  private createTicket(): void {
    this.add.rectangle(308, 268, 410, 236, 0xffffff, 1).setStrokeStyle(6, 0x102033);
    this.add
      .text(308, 172, 'Judge Ticket', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '26px',
        color: '#102033',
        fontStyle: '900'
      })
      .setOrigin(0.5);
    this.add
      .text(308, 210, `${this.order.treatCount} treats | ${this.order.perTreat} toppings each`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        color: '#2f4056',
        fontStyle: '800'
      })
      .setOrigin(0.5);

    const gap = 68;
    const startX = 308 - ((this.order.steps.length - 1) * gap) / 2;
    this.order.steps.forEach((step, index) => {
      const x = startX + index * gap;
      const slot = this.add.rectangle(x, 276, 58, 58, 0xfff4c7, 1).setStrokeStyle(3, 0x102033);
      const text = this.add
        .text(x, 276, `${index + 1}\n${this.stepShortLabel(step)}`, {
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

    this.add
      .text(308, 364, this.order.mathPrompt, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '17px',
        color: '#2f4056',
        fontStyle: '800',
        align: 'center',
        wordWrap: { width: 340 }
      })
      .setOrigin(0.5);
  }

  private createScorePanel(): void {
    this.add.rectangle(984, 268, 314, 236, 0x102033, 0.94).setStrokeStyle(5, 0xffd23f);
    this.add
      .text(984, 180, `Course score\n${this.actionScore.toLocaleString('en-US')}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '22px',
        color: '#ffffff',
        fontStyle: '900',
        align: 'center',
        lineSpacing: 4
      })
      .setOrigin(0.5);

    this.add.rectangle(984, 250, 230, 26, 0xffffff, 0.18).setStrokeStyle(3, 0xffffff, 0.6);
    this.timerFill = this.add.rectangle(871, 250, 226, 22, 0x27b6a5, 1).setOrigin(0, 0.5);
    this.timerText = this.add
      .text(984, 286, '', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '19px',
        color: '#ffec9f',
        fontStyle: '900'
      })
      .setOrigin(0.5);

    this.multiplierText = this.add
      .text(984, 346, 'Perfect = x2.0\nOne miss = x1.5\nRetry = x1.2', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '19px',
        color: '#ffffff',
        fontStyle: '800',
        align: 'center',
        lineSpacing: 4
      })
      .setOrigin(0.5);
    this.updateTimer();
  }

  private createTray(): void {
    this.add.rectangle(640, 360, 420, 108, 0xfff4c7, 1).setStrokeStyle(5, 0x102033);
    this.add.ellipse(640, 360, 360, 72, 0xffffff, 0.5).setStrokeStyle(3, 0x8c5b2e, 0.5);
    this.add
      .text(640, 318, 'Build Tray', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        color: '#102033',
        fontStyle: '900'
      })
      .setOrigin(0.5);
  }

  private createStationButtons(): void {
    const positions = [
      { x: 180, y: 548 },
      { x: 360, y: 548 },
      { x: 540, y: 548 },
      { x: 720, y: 548 },
      { x: 900, y: 548 },
      { x: 1080, y: 548 }
    ];

    STATIONS.forEach((display, index) => {
      const container = this.add.container(positions[index].x, positions[index].y);
      const background = this.add
        .rectangle(0, 0, 154, 82, display.color)
        .setStrokeStyle(5, 0x102033)
        .setInteractive({ useHandCursor: true });
      const numberText = this.add
        .text(-58, -27, `${index + 1}`, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '17px',
          color: display.textColor,
          fontStyle: '900'
        })
        .setOrigin(0.5);
      const icon = this.drawStationIcon(display.step);
      const label = this.add
        .text(24, 18, display.label, {
          fontFamily: 'Arial, sans-serif',
          fontSize: display.label.length > 8 ? '18px' : '20px',
          color: display.textColor,
          fontStyle: '900',
          align: 'center',
          wordWrap: { width: 96 }
        })
        .setOrigin(0.5);

      container.add([background, numberText, icon, label]);
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
    });
  }

  private drawStationIcon(step: BakeRushStep): Phaser.GameObjects.Container {
    const icon = this.add.container(-30, 6);

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
    if (this.locked || this.answerPhase) {
      return;
    }

    const expected = expectedBakeRushStep(this.order, this.stepIndex);
    if (!expected) {
      return;
    }

    if (isCorrectBakeRushStep(this.order, this.stepIndex, step)) {
      background.setFillStyle(0x38a16d);
      this.completeStep(step);
      this.stepIndex += 1;

      if (step === 'serve') {
        this.showMathQuestion();
        return;
      }

      this.feedbackText?.setText('Order building. Keep matching the judge ticket.');
      this.updatePrompt();
      this.updateStatusText();
      this.time.delayedCall(180, () => background.setFillStyle(originalColor));
      return;
    }

    this.recipeMistakes += 1;
    background.setFillStyle(0xf05f73);
    this.feedbackText?.setText(`Check the ticket. Next station is ${this.stepLabel(expected)}.`);
    this.updateStatusText();
    this.cameras.main.shake(110, 0.003);
    this.time.delayedCall(240, () => background.setFillStyle(originalColor));
  }

  private completeStep(step: BakeRushStep): void {
    const slot = this.ticketSlots[this.stepIndex];
    const text = this.ticketTexts[this.stepIndex];
    const display = this.stationDisplay(step);
    slot?.setFillStyle(display.color, 0.96);
    text?.setText(`${this.stepIndex + 1}\n${display.shortLabel}`);
    text?.setColor(display.textColor);

    if (step !== 'serve') {
      this.addTrayPiece(step, this.stepIndex);
    }
  }

  private addTrayPiece(step: BakeRushStep, index: number): void {
    const x = 560 + index * 40;
    const y = 370 - Math.min(index, 4) * 10;
    const display = this.stationDisplay(step);

    if (step === 'base') {
      const base = this.add.rectangle(640, 386, 190, 46, display.color, 1).setStrokeStyle(4, 0x8c5b2e).setDepth(4);
      this.trayPieces.push(base);
      this.popIn(base);
      return;
    }

    if (step === 'frosting') {
      const frosting = this.add.circle(640, 344, 58, display.color, 1).setStrokeStyle(4, 0x8c5b2e).setDepth(5);
      this.trayPieces.push(frosting);
      this.popIn(frosting);
      return;
    }

    if (step === 'sprinkles') {
      const sprinkles = [
        this.add.circle(602, 337, 7, 0xffd23f, 1).setDepth(6),
        this.add.circle(628, 320, 7, 0x27b6a5, 1).setDepth(6),
        this.add.circle(666, 330, 7, 0xf05f73, 1).setDepth(6),
        this.add.circle(684, 356, 7, 0x6b4a8c, 1).setDepth(6)
      ];
      this.trayPieces.push(...sprinkles);
      sprinkles.forEach((sprinkle) => this.popIn(sprinkle));
      return;
    }

    const piece = step === 'candle'
      ? this.add.rectangle(x, y, 18, 58, display.color, 1).setStrokeStyle(3, 0x102033).setDepth(7)
      : this.add.circle(x, y, 21, display.color, 1).setStrokeStyle(3, 0x8c5b2e).setDepth(7);
    this.trayPieces.push(piece);
    this.popIn(piece);
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

  private showMathQuestion(): void {
    this.answerPhase = true;
    this.cleanupKeyboardHandlers();
    this.stationButtons.forEach((button) => button.destroy());
    this.stationButtons = [];
    this.promptText?.setText(this.order.mathPrompt);
    this.feedbackText?.setText('Ingredient math sets the final multiplier. Choose the total count.');
    this.updateStatusText();
    this.createAnswerButtons();
  }

  private createAnswerButtons(): void {
    const positions = [
      { x: 310, y: 548 },
      { x: 530, y: 548 },
      { x: 750, y: 548 },
      { x: 970, y: 548 }
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
        .text(0, 5, choice.toString(), {
          fontFamily: 'Arial, sans-serif',
          fontSize: '36px',
          color: '#102033',
          fontStyle: '900'
        })
        .setOrigin(0.5);
      const cardText = this.add
        .text(0, 31, 'total', {
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
    this.feedbackText?.setText(this.mathCorrect ? 'Correct ingredient math.' : `Close. The total was ${this.order.answer}.`);
    this.finish();
  }

  private handleTimeExpired(): void {
    if (this.locked || this.timeExpired) {
      return;
    }

    this.timeExpired = true;
    this.updateStatusText();

    if (this.answerPhase) {
      this.mathCorrect = false;
      this.feedbackText?.setText(`Time. The ingredient total was ${this.order.answer}.`);
      this.finish();
      return;
    }

    for (let index = this.stepIndex; index < this.order.steps.length; index += 1) {
      const step = this.order.steps[index];
      const display = this.stationDisplay(step);
      this.ticketSlots[index]?.setFillStyle(display.color, 0.45);
      this.ticketTexts[index]?.setText(`${index + 1}\nHelp`);
    }

    this.feedbackText?.setText('Time. The chef helped finish the tray, but the multiplier drops one tier.');
    this.showMathQuestion();
  }

  private finish(): void {
    this.locked = true;
    const result = buildBakeRushResult(this.recipeMistakes, this.mathCorrect, this.timeExpired);
    const bonus = Math.max(0, Math.round(this.actionScore * (result.multiplier - 1)));
    const badgeColor = result.perfect ? '#38a16d' : result.multiplier >= 1.5 ? '#ff9ec7' : '#f05f73';

    this.multiplierText?.setText(`Multiplier x${result.multiplier.toFixed(1)}\nBonus +${bonus.toLocaleString('en-US')}`);
    this.multiplierText?.setColor(badgeColor);
    this.updateStatusText(result);
    this.launchFinishAnimation(result);

    this.time.delayedCall(1050, () => {
      this.game.events.emit(this.eventKey, result);
      this.scene.stop();
    });
  }

  private launchFinishAnimation(result: BakingStationResult): void {
    if (result.perfect) {
      for (let index = 0; index < 18; index += 1) {
        const sparkle = this.add
          .star(540 + Phaser.Math.Between(0, 200), 315 + Phaser.Math.Between(0, 90), 5, 5, 13, 0xffd23f, 0.95)
          .setDepth(20);
        this.tweens.add({
          targets: sparkle,
          y: sparkle.y - Phaser.Math.Between(30, 80),
          alpha: 0,
          duration: 720,
          ease: 'Quad.easeOut',
          onComplete: () => sparkle.destroy()
        });
      }
      return;
    }

    const correction = this.add.circle(640, 350, 74, 0xffffff, 0.72).setStrokeStyle(5, 0xf05f73).setDepth(20);
    this.tweens.add({
      targets: correction,
      scale: 1.35,
      alpha: 0,
      duration: 620,
      ease: 'Quad.easeOut',
      onComplete: () => correction.destroy()
    });
  }

  private updatePrompt(): void {
    const expected = expectedBakeRushStep(this.order, this.stepIndex);
    if (!expected) {
      return;
    }

    this.promptText?.setText(`Next: tap ${this.stepLabel(expected)}.`);
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
      this.mistakeText?.setText(
        finalResult.perfect
          ? 'Perfect bake. Full x2.0 multiplier.'
          : `Misses: ${finalResult.mistakes}. Final multiplier x${finalResult.multiplier.toFixed(1)}.`
      );
      return;
    }

    const timeCopy = this.timeExpired ? ' | time assist used' : '';
    this.mistakeText?.setText(`Prep misses: ${this.recipeMistakes}${timeCopy} | Perfect keeps x2.0`);
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

  private cleanupKeyboardHandlers(): void {
    for (const binding of this.keyBindings) {
      binding.key.off('down', binding.handler);
    }

    this.keyBindings = [];
  }
}
