import Phaser from 'phaser';
import { assetsByKey } from '../assets/assetManifest';
import { gameProfile } from '../data/profile';
import { formatScore, formatTime, uniqueScoreSummaries } from '../game/scoring';
import type { ScoreSummary } from '../types';

export class FinaleScene extends Phaser.Scene {
  constructor() {
    super('FinaleScene');
  }

  create(): void {
    const summaries = uniqueScoreSummaries((this.registry.get('scoreSummaries') ?? []) as ScoreSummary[]);
    const totalStars = summaries.reduce((sum, summary) => sum + summary.stars, 0);
    const totalScore = summaries.reduce((sum, summary) => sum + summary.score, 0);
    const totalTime = summaries.reduce((sum, summary) => sum + summary.elapsedMs, 0);
    const totalCorrect = summaries.reduce((sum, summary) => sum + summary.mathCorrect, 0);
    const totalAttempts = summaries.reduce((sum, summary) => sum + summary.mathAttempts, 0);
    const totalThrusters = summaries.reduce((sum, summary) => sum + summary.thrustersCollected, 0);
    const totalAvailableThrusters = summaries.reduce((sum, summary) => sum + summary.totalThrusters, 0);
    const totalBakes = summaries.reduce((sum, summary) => sum + summary.bakingStationsCompleted, 0);
    const totalAvailableBakes = summaries.reduce((sum, summary) => sum + summary.totalBakingStations, 0);
    const totalPerfectBakes = summaries.reduce((sum, summary) => sum + summary.bakingPerfect, 0);
    const bestCombo = summaries.reduce((best, summary) => Math.max(best, summary.maxCombo), 0);
    const accuracy = totalAttempts === 0 ? 100 : Math.round((totalCorrect / totalAttempts) * 100);

    this.cameras.main.setBackgroundColor(0x102033);
    this.add.rectangle(640, 360, 1280, 720, 0x102033);

    for (let index = 0; index < 90; index += 1) {
      const confetti = this.add.rectangle(
        Phaser.Math.Between(20, 1260),
        Phaser.Math.Between(20, 700),
        Phaser.Math.Between(8, 18),
        Phaser.Math.Between(18, 40),
        [0xffd23f, 0x27b6a5, 0xf05f73, 0x8fd6ff][index % 4],
        0.82
      )
        .setAngle(Phaser.Math.Between(-25, 25))
        .setDepth(1);

      this.tweens.add({
        targets: confetti,
        y: confetti.y + Phaser.Math.Between(70, 150),
        angle: confetti.angle + Phaser.Math.Between(110, 260),
        alpha: { from: 0.42, to: 0.92 },
        duration: Phaser.Math.Between(1500, 2700),
        delay: Phaser.Math.Between(0, 900),
        repeat: -1,
        yoyo: true,
        ease: 'Sine.easeInOut'
      });
    }

    const titleText = this.add
      .text(640, 64, `Happy ${gameProfile.birthdayAge}th Birthday, ${gameProfile.playerName}!`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '44px',
        color: '#ffffff',
        fontStyle: '900',
        align: 'center',
        wordWrap: { width: 1100 }
      })
      .setOrigin(0.5)
      .setDepth(6);

    this.tweens.add({
      targets: titleText,
      y: 74,
      duration: 1150,
      repeat: -1,
      yoyo: true,
      ease: 'Sine.easeInOut'
    });

    const championCard = this.add
      .rectangle(346, 370, 390, 420, 0xffffff, 0.1)
      .setStrokeStyle(5, 0xffd23f, 0.8)
      .setDepth(2);
    const victoryCat = this.add
      .image(346, 330, 'catVictory')
      .setDisplaySize(assetsByKey.catVictory.width * 1.48, assetsByKey.catVictory.height * 1.48)
      .setDepth(3);
    const catBaseScaleX = victoryCat.scaleX;
    const catBaseScaleY = victoryCat.scaleY;

    this.tweens.add({
      targets: championCard,
      scaleX: 1.012,
      scaleY: 1.012,
      duration: 900,
      repeat: -1,
      yoyo: true,
      ease: 'Sine.easeInOut'
    });
    this.tweens.add({
      targets: victoryCat,
      y: victoryCat.y - 18,
      scaleX: catBaseScaleX * 1.04,
      scaleY: catBaseScaleY * 1.04,
      duration: 850,
      repeat: -1,
      yoyo: true,
      ease: 'Sine.easeInOut'
    });
    this.tweens.add({
      targets: victoryCat,
      angle: { from: -2.5, to: 2.5 },
      duration: 1250,
      repeat: -1,
      yoyo: true,
      ease: 'Sine.easeInOut'
    });

    this.add
      .text(346, 548, 'Cat Beast Champion', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '38px',
        color: '#ffec9f',
        fontStyle: '900',
        align: 'center',
        wordWrap: { width: 340 }
      })
      .setOrigin(0.5)
      .setDepth(4);

    if (this.textures.exists('star')) {
      const starPositions = [
        { x: 184, y: 194 },
        { x: 506, y: 214 },
        { x: 180, y: 506 },
        { x: 504, y: 488 },
        { x: 346, y: 150 }
      ];

      starPositions.forEach((position, index) => {
        const star = this.add.image(position.x, position.y, 'star').setDisplaySize(54, 54).setDepth(4).setAlpha(0.9);
        this.tweens.add({
          targets: star,
          y: star.y - 12,
          angle: index % 2 === 0 ? 18 : -18,
          scaleX: star.scaleX * 1.12,
          scaleY: star.scaleY * 1.12,
          duration: 720 + index * 95,
          delay: index * 120,
          repeat: -1,
          yoyo: true,
          ease: 'Sine.easeInOut'
        });
      });
    }

    const lines = [
      `Final score: ${formatScore(totalScore)}`,
      `Stars earned: ${totalStars}/9`,
      `Pastries: ${totalThrusters}/${totalAvailableThrusters}`,
      ...(totalAvailableBakes > 0 ? [`Bake-Offs: ${totalBakes}/${totalAvailableBakes} | Perfect ${totalPerfectBakes}`] : []),
      `Best combo: x${bestCombo}`,
      `Bake math: ${totalCorrect}/${totalAttempts} (${accuracy}%)`,
      `Total course time: ${formatTime(totalTime)}`
    ];

    this.add.rectangle(820, 376, 500, 420, 0xffffff, 0.12).setStrokeStyle(5, 0xffffff, 0.76).setDepth(2);
    this.add
      .text(820, 194, 'Final Scorecard', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '34px',
        color: '#ffec9f',
        fontStyle: '900',
        align: 'center'
      })
      .setOrigin(0.5)
      .setDepth(4);

    this.add
      .text(610, 246, lines.join('\n'), {
        fontFamily: 'Arial, sans-serif',
        fontSize: '26px',
        color: '#ffffff',
        fontStyle: '800',
        align: 'left',
        lineSpacing: 10,
        wordWrap: { width: 420 }
      })
      .setOrigin(0, 0)
      .setDepth(4);

    this.createButton(820, 636, 'Run the Course Again', () => {
      this.registry.set('scoreSummaries', []);
      this.registry.set('runSeed', `run-${Date.now()}-${Phaser.Math.Between(1000, 9999)}`);
      this.scene.start('PlayScene', { levelIndex: 0 });
    });
  }

  private createButton(x: number, y: number, label: string, onPress: () => void): void {
    const background = this.add
      .rectangle(x, y, 360, 68, 0xffd23f)
      .setStrokeStyle(5, 0xffffff)
      .setInteractive({ useHandCursor: true })
      .setDepth(5);

    this.add
      .text(x, y, label, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '25px',
        color: '#102033',
        fontStyle: '900'
      })
      .setOrigin(0.5)
      .setDepth(6);

    this.tweens.add({
      targets: background,
      scaleX: 1.035,
      scaleY: 1.08,
      duration: 900,
      repeat: -1,
      yoyo: true,
      ease: 'Sine.easeInOut'
    });

    background.on('pointerdown', onPress);
  }
}
