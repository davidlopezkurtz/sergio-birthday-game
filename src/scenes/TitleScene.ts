import Phaser from 'phaser';
import { assetsByKey } from '../assets/assetManifest';
import { gameProfile } from '../data/profile';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x102033);

    this.add.rectangle(640, 360, 1280, 720, 0x102033);
    this.add.rectangle(640, 575, 1280, 290, 0x38a16d);

    for (let index = 0; index < 12; index += 1) {
      const x = 90 + index * 106;
      const y = 112 + (index % 3) * 34;
      this.add.circle(x, y, 16 + (index % 4) * 5, [0xffd23f, 0x27b6a5, 0xef6f8f][index % 3], 0.9);
    }

    this.add
      .image(640, 430, 'cat')
      .setDisplaySize(assetsByKey.cat.width * 1.8, assetsByKey.cat.height * 1.8);

    this.add
      .text(640, 94, "Sergio's Cat Beast Birthday", {
        fontFamily: 'Arial, sans-serif',
        fontSize: '48px',
        color: '#ffffff',
        fontStyle: '900',
        align: 'center',
        wordWrap: { width: 1140 }
      })
      .setOrigin(0.5);

    this.add
      .text(640, 158, 'A 7th birthday obstacle-course math showdown', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '28px',
        color: '#ffec9f',
        fontStyle: '700',
        align: 'center'
      })
      .setOrigin(0.5);

    this.add
      .text(
        640,
        224,
        "Climb ladders, jump and duck through hazards, collect pastries, then bake for a score multiplier.",
        {
          fontFamily: 'Arial, sans-serif',
          fontSize: '25px',
          color: '#d8f7ff',
          align: 'center',
          wordWrap: { width: 920 }
        }
      )
      .setOrigin(0.5);

    this.createStartButton();
    this.add
      .text(640, 680, `${gameProfile.targetDevice} | Gentle retries | No game over`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        color: '#ffffff'
      })
      .setOrigin(0.5);
  }

  private createStartButton(): void {
    const button = this.add.container(640, 575);
    const background = this.add
      .rectangle(0, 0, 390, 90, 0xffd23f)
      .setStrokeStyle(5, 0xffffff)
      .setInteractive({ useHandCursor: true });
    const label = this.add
      .text(0, 0, 'Start the Score Chase', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '30px',
        color: '#102033',
        fontStyle: '900'
      })
      .setOrigin(0.5);

    button.add([background, label]);
    background.on('pointerdown', () => this.startGame());

    this.input.keyboard?.once('keydown-SPACE', () => this.startGame());
    this.input.keyboard?.once('keydown-ENTER', () => this.startGame());
  }

  private startGame(): void {
    this.registry.set('scoreSummaries', []);
    this.scene.start('PlayScene', { levelIndex: 0 });
  }
}
