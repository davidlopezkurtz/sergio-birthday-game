import Phaser from 'phaser';
import type { MathProblem } from '../types';

export interface MathGateSceneData {
  problem: MathProblem;
  eventKey: string;
  gateNumber: number;
}

interface MathGateResult {
  wrongAttempts: number;
  hintUsed: boolean;
}

export class MathGateScene extends Phaser.Scene {
  private problem!: MathProblem;
  private eventKey = '';
  private wrongAttempts = 0;
  private answerLocked = false;
  private hintText?: Phaser.GameObjects.Text;
  private feedbackText?: Phaser.GameObjects.Text;

  constructor() {
    super('MathGateScene');
  }

  init(data: MathGateSceneData): void {
    this.problem = data.problem;
    this.eventKey = data.eventKey;
    this.wrongAttempts = 0;
    this.answerLocked = false;
  }

  create(data: MathGateSceneData): void {
    this.cameras.main.setBackgroundColor('rgba(16, 32, 51, 0.72)');

    this.add.rectangle(640, 360, 1280, 720, 0x102033, 0.72);
    this.add.rectangle(640, 360, 880, 520, 0xffffff, 1).setStrokeStyle(7, 0xffd23f);

    this.add
      .text(640, 142, `Math Gate ${data.gateNumber}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '34px',
        color: '#2f4056',
        fontStyle: '900'
      })
      .setOrigin(0.5);

    this.add
      .text(640, 222, this.problem.prompt, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '46px',
        color: '#102033',
        fontStyle: '900',
        align: 'center',
        wordWrap: { width: 760 }
      })
      .setOrigin(0.5);

    this.feedbackText = this.add
      .text(640, 604, 'Tap the answer to open the gate.', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        color: '#2f4056',
        fontStyle: '700'
      })
      .setOrigin(0.5);

    this.hintText = this.add
      .text(640, 552, '', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '22px',
        color: '#6b4a8c',
        align: 'center',
        wordWrap: { width: 720 }
      })
      .setOrigin(0.5);

    this.createAnswerButtons();
  }

  private createAnswerButtons(): void {
    const labels = this.problem.displayChoices ?? this.problem.choices.map(String);
    const answerValues: number[] = [];
    const backgrounds: Phaser.GameObjects.Rectangle[] = [];
    const positions = [
      { x: 420, y: 358 },
      { x: 860, y: 358 },
      { x: 420, y: 466 },
      { x: 860, y: 466 }
    ];

    labels.forEach((label, index) => {
      const answerValue = this.problem.displayChoices ? index : this.problem.choices[index];
      answerValues.push(answerValue);
      const container = this.add.container(positions[index].x, positions[index].y);
      const background = this.add
        .rectangle(0, 0, 330, 82, 0x27b6a5)
        .setStrokeStyle(5, 0x102033)
        .setInteractive({ useHandCursor: true });
      const text = this.add
        .text(0, 0, label, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '32px',
          color: '#ffffff',
          fontStyle: '900'
        })
        .setOrigin(0.5);

      container.add([background, text]);
      backgrounds.push(background);
      background.on('pointerdown', () => this.answer(answerValue, background));
    });

    [
      Phaser.Input.Keyboard.KeyCodes.ONE,
      Phaser.Input.Keyboard.KeyCodes.TWO,
      Phaser.Input.Keyboard.KeyCodes.THREE,
      Phaser.Input.Keyboard.KeyCodes.FOUR
    ].forEach((keyCode, index) => {
      const key = this.input.keyboard?.addKey(keyCode);
      key?.on('down', () => this.answer(answerValues[index], backgrounds[index]));
    });
  }

  private answer(answerValue: number, background: Phaser.GameObjects.Rectangle): void {
    if (this.answerLocked) {
      return;
    }

    if (answerValue === this.problem.correctAnswer) {
      this.answerLocked = true;
      background.setFillStyle(0x38a16d);
      background.disableInteractive();
      this.feedbackText?.setText('Correct. Gate open.');

      const result: MathGateResult = {
        wrongAttempts: this.wrongAttempts,
        hintUsed: this.wrongAttempts > 0
      };

      this.time.delayedCall(360, () => {
        this.game.events.emit(this.eventKey, result);
        this.scene.stop();
      });
      return;
    }

    this.wrongAttempts += 1;
    background.setFillStyle(0xf05f73);
    this.feedbackText?.setText('Try again. The cat can still win.');
    this.hintText?.setText(`Hint: ${this.problem.hint}`);
  }
}
