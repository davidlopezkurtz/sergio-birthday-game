import Phaser from 'phaser';
import { assetsByKey } from '../assets/assetManifest';
import { levels } from '../data/levels';
import { formatScore, formatTime } from '../game/scoring';
import type { ScoreSummary } from '../types';

interface ResultsSceneData {
  levelIndex: number;
  summary: ScoreSummary;
}

export class ResultsScene extends Phaser.Scene {
  private levelIndex = 0;
  private summary!: ScoreSummary;

  constructor() {
    super('ResultsScene');
  }

  init(data: ResultsSceneData): void {
    this.levelIndex = data.levelIndex;
    this.summary = data.summary;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x173f48);
    this.add.rectangle(640, 360, 1280, 720, 0x173f48);
    this.add.rectangle(640, 360, 900, 560, 0xffffff, 1).setStrokeStyle(8, 0xffd23f);

    this.add
      .text(640, 116, `${this.summary.levelTitle} Complete`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '42px',
        color: '#102033',
        fontStyle: '900',
        align: 'center'
      })
      .setOrigin(0.5);

    this.add
      .text(640, 178, `Score: ${formatScore(this.summary.score)}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '50px',
        color: '#102033',
        fontStyle: '900',
        align: 'center'
      })
      .setOrigin(0.5);

    this.addStars();
    this.addStats();
    this.addButtons();
  }

  private addStars(): void {
    for (let index = 0; index < 3; index += 1) {
      const star = this.add.image(540 + index * 100, 248, 'star');
      star.setAlpha(index < this.summary.stars ? 1 : 0.22);
      star.setDisplaySize(assetsByKey.star.width * 0.9, assetsByKey.star.height * 0.9);
    }
  }

  private addStats(): void {
    const accuracy =
      this.summary.mathAttempts === 0
        ? '100%'
        : `${Math.round((this.summary.mathCorrect / this.summary.mathAttempts) * 100)}%`;

    const earnedLines = [
      `Target score: ${formatScore(this.summary.targetScore)}`,
      `Thrusters: ${this.summary.thrustersCollected}/${this.summary.totalThrusters} (+${formatScore(this.summary.thrusterPoints)})`,
      `Obstacle clears: ${this.summary.obstacleClears} (+${formatScore(this.summary.obstaclePoints)})`,
      `Math points: +${formatScore(this.summary.mathPoints)} | Accuracy ${this.summary.mathCorrect}/${this.summary.mathAttempts} (${accuracy})`,
      ...(this.summary.totalBakingStations > 0
        ? [
            `Bake-Off: ${this.summary.bakingStationsCompleted}/${this.summary.totalBakingStations} | Perfect ${this.summary.bakingPerfect}/${this.summary.totalBakingStations} (+${formatScore(this.summary.bakingPoints)})`
          ]
        : []),
      `Combo bonus: +${formatScore(this.summary.comboBonus)} | Best combo x${this.summary.maxCombo}`
    ];

    const bonusLines = [
      `Finish bonus: +${formatScore(this.summary.finishBonus)}`,
      `No-hit bonus: +${formatScore(this.summary.noHitBonus)}`,
      `Math streak bonus: +${formatScore(this.summary.mathStreakBonus)}`,
      `Time bonus: +${formatScore(this.summary.timeBonus)}`,
      `Penalties: -${formatScore(this.summary.penaltyPoints)}`,
      `Bumps: ${this.summary.obstacleHits} | Hints: ${this.summary.hintsUsed}`,
      `Time: ${formatTime(this.summary.elapsedMs)}`
    ];

    this.add
      .text(250, 316, earnedLines.join('\n'), {
        fontFamily: 'Arial, sans-serif',
        fontSize: '19px',
        color: '#2f4056',
        fontStyle: '800',
        align: 'left',
        lineSpacing: 8,
        wordWrap: { width: 385 }
      })
      .setOrigin(0, 0);

    this.add
      .text(690, 316, bonusLines.join('\n'), {
        fontFamily: 'Arial, sans-serif',
        fontSize: '19px',
        color: '#2f4056',
        fontStyle: '800',
        align: 'left',
        lineSpacing: 8,
        wordWrap: { width: 350 }
      })
      .setOrigin(0, 0);
  }

  private addButtons(): void {
    const isFinalLevel = this.levelIndex >= levels.length - 1;
    this.createButton(480, 576, 'Replay Level', 0x27b6a5, () => {
      this.scene.start('PlayScene', { levelIndex: this.levelIndex });
    });

    this.createButton(800, 576, isFinalLevel ? 'Birthday Finale' : 'Next Level', 0xffd23f, () => {
      if (isFinalLevel) {
        this.scene.start('FinaleScene');
        return;
      }

      this.scene.start('PlayScene', { levelIndex: this.levelIndex + 1 });
    });
  }

  private createButton(x: number, y: number, label: string, color: number, onPress: () => void): void {
    const background = this.add
      .rectangle(x, y, 260, 78, color)
      .setStrokeStyle(5, 0x102033)
      .setInteractive({ useHandCursor: true });
    const textColor = color === 0xffd23f ? '#102033' : '#ffffff';
    this.add
      .text(x, y, label, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '25px',
        color: textColor,
        fontStyle: '900'
      })
      .setOrigin(0.5);

    background.on('pointerdown', onPress);
  }
}
