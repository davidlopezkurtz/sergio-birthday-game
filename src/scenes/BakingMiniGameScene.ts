import Phaser from 'phaser';
import { calculateBakingAward } from '../game/baking';
import type { BakingIngredient, BakingStationDefinition, BakingStationResult } from '../types';

export interface BakingMiniGameSceneData {
  station: BakingStationDefinition;
  eventKey: string;
  stationNumber: number;
}

interface IngredientDisplay {
  ingredient: BakingIngredient;
  label: string;
  shortLabel: string;
  color: number;
}

const INGREDIENTS: IngredientDisplay[] = [
  { ingredient: 'frosting', label: 'Frosting', shortLabel: 'Frost', color: 0xff9ec7 },
  { ingredient: 'sprinkles', label: 'Sprinkles', shortLabel: 'Spr', color: 0xffd23f },
  { ingredient: 'candle', label: 'Candle', shortLabel: 'Candle', color: 0x27b6a5 },
  { ingredient: 'berry', label: 'Berry', shortLabel: 'Berry', color: 0xf05f73 }
];

export class BakingMiniGameScene extends Phaser.Scene {
  private station!: BakingStationDefinition;
  private eventKey = '';
  private step = 0;
  private mistakes = 0;
  private locked = false;
  private feedbackText?: Phaser.GameObjects.Text;
  private promptText?: Phaser.GameObjects.Text;
  private mistakeText?: Phaser.GameObjects.Text;
  private recipeSlots: Phaser.GameObjects.Rectangle[] = [];
  private recipeTexts: Phaser.GameObjects.Text[] = [];
  private keyBindings: { key: Phaser.Input.Keyboard.Key; handler: () => void }[] = [];

  constructor() {
    super('BakingMiniGameScene');
  }

  init(data: BakingMiniGameSceneData): void {
    this.station = data.station;
    this.eventKey = data.eventKey;
    this.step = 0;
    this.mistakes = 0;
    this.locked = false;
    this.recipeSlots = [];
    this.recipeTexts = [];
    this.keyBindings = [];
  }

  create(data: BakingMiniGameSceneData): void {
    this.cameras.main.setBackgroundColor('rgba(16, 32, 51, 0.72)');
    this.add.rectangle(640, 360, 1280, 720, 0x102033, 0.72);
    this.add.rectangle(640, 360, 920, 550, 0xffffff, 1).setStrokeStyle(7, 0xffd23f);

    this.add
      .text(640, 120, `Bake-Off Bonus ${data.stationNumber}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '34px',
        color: '#2f4056',
        fontStyle: '900'
      })
      .setOrigin(0.5);

    this.add
      .text(640, 166, this.station.label, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '42px',
        color: '#102033',
        fontStyle: '900',
        align: 'center'
      })
      .setOrigin(0.5);

    this.add
      .text(640, 208, `Total possible: +${this.station.value + this.station.perfectBonus} | Perfect bonus needs zero misses`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '21px',
        color: '#6b4a8c',
        fontStyle: '900',
        align: 'center'
      })
      .setOrigin(0.5);

    this.drawCupcakePreview();
    this.createRecipeSlots();

    this.promptText = this.add
      .text(640, 374, '', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '27px',
        color: '#102033',
        fontStyle: '900',
        align: 'center'
      })
      .setOrigin(0.5);

    this.feedbackText = this.add
      .text(640, 574, 'Tap ingredients in recipe order. Wrong taps only cost the perfect bonus.', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '22px',
        color: '#2f4056',
        fontStyle: '700',
        align: 'center',
        wordWrap: { width: 780 }
      })
      .setOrigin(0.5);

    this.mistakeText = this.add
      .text(640, 610, `Perfect bonus: +${this.station.perfectBonus}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        color: '#6b4a8c',
        fontStyle: '800'
      })
      .setOrigin(0.5);

    this.createIngredientButtons();
    this.updatePrompt();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanupKeyboardHandlers());
  }

  private drawCupcakePreview(): void {
    this.add.rectangle(330, 272, 132, 92, 0xd56b6b, 1).setStrokeStyle(5, 0x102033);
    this.add.circle(330, 224, 58, 0xff9ec7, 0.94).setStrokeStyle(5, 0x102033);
    this.add.circle(302, 214, 8, 0xffd23f, 1);
    this.add.circle(332, 196, 8, 0x27b6a5, 1);
    this.add.circle(362, 220, 8, 0xf05f73, 1);
    this.add
      .text(330, 329, `Base +${this.station.value}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '19px',
        color: '#102033',
        fontStyle: '900'
      })
      .setOrigin(0.5);
  }

  private createRecipeSlots(): void {
    this.add
      .text(720, 242, 'Recipe order', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        color: '#2f4056',
        fontStyle: '900'
      })
      .setOrigin(0.5);

    const startX = 580;
    this.station.recipe.forEach((ingredient, index) => {
      const x = startX + index * 140;
      const slot = this.add.rectangle(x, 300, 112, 78, 0xfff4c7, 1).setStrokeStyle(4, 0x102033);
      const text = this.add
        .text(x, 300, `${index + 1}. ${this.ingredientLabel(ingredient)}`, {
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
      { x: 310, y: 490 },
      { x: 530, y: 490 },
      { x: 750, y: 490 },
      { x: 970, y: 490 }
    ];

    INGREDIENTS.forEach((display, index) => {
      const container = this.add.container(positions[index].x, positions[index].y);
      const background = this.add
        .rectangle(0, 0, 188, 86, display.color)
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
    });
  }

  private chooseIngredient(
    ingredient: BakingIngredient,
    background: Phaser.GameObjects.Rectangle,
    originalColor: number
  ): void {
    if (this.locked) {
      return;
    }

    const expected = this.station.recipe[this.step];

    if (ingredient === expected) {
      background.setFillStyle(0x38a16d);
      this.completeRecipeStep(ingredient);
      this.step += 1;

      if (this.step >= this.station.recipe.length) {
        this.finish();
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
    this.mistakeText?.setText(`Misses: ${this.mistakes} | Perfect bonus needs zero misses`);
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

  private finish(): void {
    this.locked = true;
    const perfect = this.mistakes === 0;
    const result: BakingStationResult = {
      mistakes: this.mistakes,
      perfect
    };
    const total = calculateBakingAward(this.station, result);

    this.feedbackText?.setText(
      perfect
        ? `Perfect bake: +${this.station.value} base +${this.station.perfectBonus} perfect.`
        : `Recipe complete: +${this.station.value} base. Perfect bonus missed.`
    );
    this.mistakeText?.setText(`Awarded +${total}. Back to the course.`);

    this.time.delayedCall(520, () => {
      this.game.events.emit(this.eventKey, result);
      this.scene.stop();
    });
  }

  private updatePrompt(): void {
    const expected = this.station.recipe[this.step];
    this.promptText?.setText(`Step ${this.step + 1} of ${this.station.recipe.length}: choose ${this.ingredientLabel(expected)}`);
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
