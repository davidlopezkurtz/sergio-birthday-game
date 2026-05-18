import Phaser from 'phaser';
import { calculateBakeMultiplier } from '../game/baking';
import type { BakingIngredient, BakingStationDefinition, BakingStationResult } from '../types';

export interface BakingMiniGameSceneData {
  station: BakingStationDefinition;
  eventKey: string;
  stationNumber: number;
  actionScore?: number;
  levelTitle?: string;
}

interface IngredientDisplay {
  ingredient: BakingIngredient;
  label: string;
  shortLabel: string;
  pluralLabel: string;
  color: number;
}

interface MathChallenge {
  prompt: string;
  answer: number;
  choices: number[];
}

const INGREDIENTS: IngredientDisplay[] = [
  { ingredient: 'frosting', label: 'Frosting', shortLabel: 'Frost', pluralLabel: 'frosting swirls', color: 0xff9ec7 },
  { ingredient: 'sprinkles', label: 'Sprinkles', shortLabel: 'Spr', pluralLabel: 'sprinkle scoops', color: 0xffd23f },
  { ingredient: 'candle', label: 'Candle', shortLabel: 'Candle', pluralLabel: 'candles', color: 0x27b6a5 },
  { ingredient: 'berry', label: 'Berry', shortLabel: 'Berry', pluralLabel: 'berries', color: 0xf05f73 }
];

export class BakingMiniGameScene extends Phaser.Scene {
  private station!: BakingStationDefinition;
  private eventKey = '';
  private stationNumber = 1;
  private actionScore = 0;
  private step = 0;
  private mistakes = 0;
  private locked = false;
  private mathCorrect = false;
  private challenge!: MathChallenge;
  private feedbackText?: Phaser.GameObjects.Text;
  private promptText?: Phaser.GameObjects.Text;
  private mistakeText?: Phaser.GameObjects.Text;
  private recipeSlots: Phaser.GameObjects.Rectangle[] = [];
  private recipeTexts: Phaser.GameObjects.Text[] = [];
  private ingredientButtons: Phaser.GameObjects.Container[] = [];
  private answerButtons: Phaser.GameObjects.Container[] = [];
  private keyBindings: { key: Phaser.Input.Keyboard.Key; handler: () => void }[] = [];

  constructor() {
    super('BakingMiniGameScene');
  }

  init(data: BakingMiniGameSceneData): void {
    this.station = data.station;
    this.eventKey = data.eventKey;
    this.stationNumber = data.stationNumber;
    this.actionScore = data.actionScore ?? 0;
    this.step = 0;
    this.mistakes = 0;
    this.locked = false;
    this.mathCorrect = false;
    this.recipeSlots = [];
    this.recipeTexts = [];
    this.ingredientButtons = [];
    this.answerButtons = [];
    this.keyBindings = [];
    this.challenge = this.buildMathChallenge();
  }

  create(data: BakingMiniGameSceneData): void {
    this.cameras.main.setBackgroundColor('rgba(16, 32, 51, 0.72)');
    this.add.rectangle(640, 360, 1280, 720, 0x102033, 0.72);
    this.add.rectangle(640, 360, 1080, 620, 0xfffcf1, 1).setStrokeStyle(7, 0xffd23f);
    this.add.rectangle(640, 104, 1020, 86, 0x6b4a8c, 1).setStrokeStyle(4, 0x102033);

    this.add
      .text(640, 82, 'Final Bake-Off Multiplier', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '34px',
        color: '#ffffff',
        fontStyle: '900'
      })
      .setOrigin(0.5);

    this.add
      .text(640, 124, data.levelTitle ?? this.station.label, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '27px',
        color: '#ffec9f',
        fontStyle: '900',
        align: 'center',
        wordWrap: { width: 900 }
      })
      .setOrigin(0.5);

    this.add.rectangle(320, 292, 318, 286, 0xffffff, 0.92).setStrokeStyle(4, 0x102033, 0.5);
    this.add
      .text(320, 174, 'Bake stage', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '22px',
        color: '#2f4056',
        fontStyle: '900'
      })
      .setOrigin(0.5);

    this.add.rectangle(870, 222, 352, 126, 0x102033, 0.92).setStrokeStyle(4, 0xffd23f);
    this.add
      .text(870, 206, `Course score: ${this.actionScore.toLocaleString('en-US')}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: '900',
        align: 'center'
      })
      .setOrigin(0.5)
      .setDepth(4);
    this.add
      .text(870, 252, 'Perfect bake = x2.0', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '26px',
        color: '#ffec9f',
        fontStyle: '900',
        align: 'center'
      })
      .setOrigin(0.5)
      .setDepth(4);

    this.drawCupcakePreview();
    this.createRecipeSlots();

    this.promptText = this.add
      .text(640, 426, '', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '26px',
        color: '#102033',
        fontStyle: '900',
        align: 'center',
        wordWrap: { width: 920 }
      })
      .setOrigin(0.5);

    this.feedbackText = this.add
      .text(640, 620, 'Build the judge ticket, then solve one ingredient math question.', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '22px',
        color: '#2f4056',
        fontStyle: '700',
        align: 'center',
        wordWrap: { width: 820 }
      })
      .setOrigin(0.5);

    this.mistakeText = this.add
      .text(640, 656, 'Multiplier ladder: x2.0 perfect | x1.5 one miss | x1.2 retry', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        color: '#6b4a8c',
        fontStyle: '800',
        align: 'center',
        wordWrap: { width: 820 }
      })
      .setOrigin(0.5);

    this.createIngredientButtons();
    this.updatePrompt();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanupKeyboardHandlers());
  }

  private drawCupcakePreview(): void {
    const tray = this.add.rectangle(320, 336, 220, 30, 0x8c5b2e, 0.92).setStrokeStyle(4, 0x102033);
    const cup = this.add.rectangle(320, 286, 136, 92, 0xd56b6b, 1).setStrokeStyle(5, 0x102033);
    const frosting = this.add.circle(320, 238, 60, 0xff9ec7, 0.94).setStrokeStyle(5, 0x102033);
    const sprinkles = [
      this.add.circle(292, 228, 8, 0xffd23f, 1),
      this.add.circle(322, 210, 8, 0x27b6a5, 1),
      this.add.circle(352, 234, 8, 0xf05f73, 1)
    ];

    this.tweens.add({
      targets: [frosting, ...sprinkles],
      y: '-=8',
      duration: 520,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    this.tweens.add({
      targets: tray,
      scaleX: 1.04,
      duration: 520,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    cup.setDepth(2);
    frosting.setDepth(3);
    sprinkles.forEach((sprinkle) => sprinkle.setDepth(4));
    this.add
      .text(320, 382, 'Tap fast. Bake smart.', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        color: '#102033',
        fontStyle: '900'
      })
      .setOrigin(0.5);
  }

  private createRecipeSlots(): void {
    this.add
      .text(640, 286, 'Judge ticket recipe order', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        color: '#2f4056',
        fontStyle: '900'
      })
      .setOrigin(0.5);

    const gap = 128;
    const startX = 640 - ((this.station.recipe.length - 1) * gap) / 2;
    this.station.recipe.forEach((ingredient, index) => {
      const x = startX + index * gap;
      const slot = this.add.rectangle(x, 346, 108, 74, 0xfff4c7, 1).setStrokeStyle(4, 0x102033);
      const text = this.add
        .text(x, 346, `${index + 1}. ${this.ingredientLabel(ingredient)}`, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '18px',
          color: '#102033',
          fontStyle: '900',
          align: 'center',
          wordWrap: { width: 96 }
        })
        .setOrigin(0.5);

      this.recipeSlots.push(slot);
      this.recipeTexts.push(text);
    });
  }

  private createIngredientButtons(): void {
    const positions = [
      { x: 310, y: 532 },
      { x: 530, y: 532 },
      { x: 750, y: 532 },
      { x: 970, y: 532 }
    ];

    INGREDIENTS.forEach((display, index) => {
      const container = this.add.container(positions[index].x, positions[index].y);
      const background = this.add
        .rectangle(0, 0, 188, 80, display.color)
        .setStrokeStyle(5, 0x102033)
        .setInteractive({ useHandCursor: true });
      const textColor = display.ingredient === 'sprinkles' || display.ingredient === 'frosting' ? '#102033' : '#ffffff';
      const numberText = this.add
        .text(-70, -28, `${index + 1}`, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '18px',
          color: textColor,
          fontStyle: '900'
        })
        .setOrigin(0.5);
      const label = this.add
        .text(0, 4, display.label, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '25px',
          color: textColor,
          fontStyle: '900'
        })
        .setOrigin(0.5);
      container.add([background, numberText, label]);
      background.on('pointerdown', () => this.chooseIngredient(display.ingredient, background, display.color));

      const key = this.input.keyboard?.addKey(
        [
          Phaser.Input.Keyboard.KeyCodes.ONE,
          Phaser.Input.Keyboard.KeyCodes.TWO,
          Phaser.Input.Keyboard.KeyCodes.THREE,
          Phaser.Input.Keyboard.KeyCodes.FOUR
        ][index]
      );
      if (key) {
        const handler = () => this.chooseIngredient(display.ingredient, background, display.color);
        key.on('down', handler);
        this.keyBindings.push({ key, handler });
      }

      this.ingredientButtons.push(container);
    });
  }

  private chooseIngredient(
    ingredient: BakingIngredient,
    background: Phaser.GameObjects.Rectangle,
    originalColor: number
  ): void {
    if (this.locked || this.step >= this.station.recipe.length) {
      return;
    }

    const expected = this.station.recipe[this.step];

    if (ingredient === expected) {
      background.setFillStyle(0x38a16d);
      this.completeRecipeStep(ingredient);
      this.step += 1;

      if (this.step >= this.station.recipe.length) {
        this.showMathQuestion();
        return;
      }

      this.feedbackText?.setText('Good match. Keep building the recipe.');
      this.updatePrompt();
      this.time.delayedCall(180, () => background.setFillStyle(originalColor));
      return;
    }

    this.mistakes += 1;
    background.setFillStyle(0xf05f73);
    this.feedbackText?.setText(`Almost. The next ingredient is ${this.ingredientLabel(expected)}.`);
    this.mistakeText?.setText(`Misses: ${this.mistakes}. One miss lowers the final multiplier.`);
    this.time.delayedCall(220, () => background.setFillStyle(originalColor));
  }

  private completeRecipeStep(ingredient: BakingIngredient): void {
    const slot = this.recipeSlots[this.step];
    const text = this.recipeTexts[this.step];
    const display = this.ingredientDisplay(ingredient);
    slot?.setFillStyle(display.color, 0.96);
    text?.setText(`${this.step + 1}. ${display.shortLabel}`);
    text?.setColor(ingredient === 'sprinkles' || ingredient === 'frosting' ? '#102033' : '#ffffff');
  }

  private showMathQuestion(): void {
    this.cleanupKeyboardHandlers();
    this.ingredientButtons.forEach((button) => button.destroy());
    this.ingredientButtons = [];
    this.promptText?.setText(this.challenge.prompt);
    this.feedbackText?.setText('Ingredient math sets the final score multiplier.');
    this.mistakeText?.setText('Choose the total ingredient count.');
    this.createAnswerButtons();
  }

  private createAnswerButtons(): void {
    const positions = [
      { x: 310, y: 532 },
      { x: 530, y: 532 },
      { x: 750, y: 532 },
      { x: 970, y: 532 }
    ];

    this.challenge.choices.forEach((choice, index) => {
      const container = this.add.container(positions[index].x, positions[index].y);
      const background = this.add
        .rectangle(0, 0, 188, 80, 0xffd23f)
        .setStrokeStyle(5, 0x102033)
        .setInteractive({ useHandCursor: true });
      const numberText = this.add
        .text(-70, -28, `${index + 1}`, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '18px',
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

      container.add([background, numberText, answerText]);
      background.on('pointerdown', () => this.chooseAnswer(choice, background));

      const key = this.input.keyboard?.addKey(
        [
          Phaser.Input.Keyboard.KeyCodes.ONE,
          Phaser.Input.Keyboard.KeyCodes.TWO,
          Phaser.Input.Keyboard.KeyCodes.THREE,
          Phaser.Input.Keyboard.KeyCodes.FOUR
        ][index]
      );
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

    this.locked = true;
    this.mathCorrect = choice === this.challenge.answer;

    if (this.mathCorrect) {
      background.setFillStyle(0x38a16d);
      this.feedbackText?.setText('Correct ingredient math.');
    } else {
      this.mistakes += 1;
      background.setFillStyle(0xf05f73);
      this.feedbackText?.setText(`Close. The ingredient total was ${this.challenge.answer}.`);
    }

    this.finish();
  }

  private finish(): void {
    const perfect = this.mistakes === 0 && this.mathCorrect;
    const multiplier = calculateBakeMultiplier(this.mistakes - (this.mathCorrect ? 0 : 1), this.mathCorrect);
    const bonus = Math.max(0, Math.round(this.actionScore * (multiplier - 1)));
    const result: BakingStationResult = {
      mistakes: this.mistakes,
      perfect,
      multiplier,
      mathCorrect: this.mathCorrect ? 1 : 0,
      mathAttempts: 1
    };

    this.mistakeText?.setText(`Multiplier x${multiplier.toFixed(1)} | Bonus +${bonus.toLocaleString('en-US')}`);

    this.time.delayedCall(740, () => {
      this.game.events.emit(this.eventKey, result);
      this.scene.stop();
    });
  }

  private updatePrompt(): void {
    const expected = this.station.recipe[this.step];
    this.promptText?.setText(`Step ${this.step + 1} of ${this.station.recipe.length}: choose ${this.ingredientLabel(expected)}`);
  }

  private buildMathChallenge(): MathChallenge {
    const ingredient = this.station.recipe[(this.stationNumber - 1) % this.station.recipe.length];
    const ingredientDisplay = this.ingredientDisplay(ingredient);
    const treats = this.stationNumber + 2;
    const perTreat = this.station.recipe.length;
    const answer = treats * perTreat;
    const choices = this.buildChoices(answer, [answer - treats, answer + treats, answer + perTreat + 1, answer - 1]);

    return {
      prompt: `${treats} birthday treats need ${perTreat} ${ingredientDisplay.pluralLabel} each. How many total?`,
      answer,
      choices
    };
  }

  private buildChoices(answer: number, candidates: number[]): number[] {
    const choices = [answer];

    for (const candidate of candidates) {
      const choice = Math.max(1, candidate);
      if (!choices.includes(choice)) {
        choices.push(choice);
      }
      if (choices.length === 4) {
        break;
      }
    }

    while (choices.length < 4) {
      choices.push(answer + choices.length + 1);
    }

    return Phaser.Utils.Array.Shuffle(choices);
  }

  private ingredientLabel(ingredient: BakingIngredient): string {
    return this.ingredientDisplay(ingredient).label;
  }

  private ingredientDisplay(ingredient: BakingIngredient): IngredientDisplay {
    return INGREDIENTS.find((display) => display.ingredient === ingredient) ?? INGREDIENTS[0];
  }

  private cleanupKeyboardHandlers(): void {
    for (const binding of this.keyBindings) {
      binding.key.off('down', binding.handler);
    }

    this.keyBindings = [];
  }
}
