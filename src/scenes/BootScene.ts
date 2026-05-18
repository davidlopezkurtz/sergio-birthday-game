import Phaser from 'phaser';
import { assetsByKey, resolveAssetUrl, type AssetKey } from '../assets/assetManifest';

const TITLE_ASSET_KEYS: AssetKey[] = ['cat'];

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    this.cameras.main.setBackgroundColor(0x96e7ff);
    this.add.rectangle(640, 360, 1280, 720, 0x96e7ff);
    this.add.rectangle(640, 492, 1280, 180, 0x38a16d, 0.42);
    this.add.rectangle(640, 518, 940, 22, 0xffffff, 0.6);
    this.add.rectangle(640, 454, 620, 54, 0xffd23f, 0.9).setStrokeStyle(5, 0x102033);
    this.add.rectangle(486, 320, 86, 210, 0x8c5b2e, 0.92);
    this.add.rectangle(794, 320, 86, 210, 0x8c5b2e, 0.92);
    for (let index = 0; index < 5; index += 1) {
      this.add.rectangle(640, 226 + index * 44, 380, 9, 0xffd23f, 0.92);
    }
    this.add.circle(396, 422, 34, 0xfff4c7, 1).setStrokeStyle(4, 0x8c5b2e);
    this.add.circle(884, 422, 34, 0xff9ec7, 1).setStrokeStyle(4, 0x8c5b2e);

    const progressBar = this.add.rectangle(640, 404, 520, 20, 0xffffff, 0.32).setStrokeStyle(3, 0x102033, 0.7);
    const progressFill = this.add.rectangle(382, 404, 0, 20, 0x27b6a5, 1).setOrigin(0, 0.5);
    const loadingText = this.add
      .text(640, 342, "Loading Sergio's birthday course...", {
        fontFamily: 'Arial, sans-serif',
        fontSize: '34px',
        color: '#102033',
        fontStyle: '900',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        padding: { x: 18, y: 10 }
      })
      .setOrigin(0.5);
    const catDot = this.add.circle(382, 404, 16, 0xf05f73, 1).setStrokeStyle(3, 0xffffff);

    const updateProgress = (value: number) => {
      progressFill.width = 516 * value;
      catDot.x = 382 + 516 * value;
    };

    this.load.on('progress', updateProgress);
    this.load.once('complete', () => {
      this.load.off('progress', updateProgress);
      progressBar.destroy();
      progressFill.destroy();
      loadingText.destroy();
      catDot.destroy();
    });

    for (const key of TITLE_ASSET_KEYS) {
      const asset = assetsByKey[key];
      const assetUrl = resolveAssetUrl(asset, window.devicePixelRatio);
      if (assetUrl) {
        this.load.image(asset.key, assetUrl);
      }
    }
  }

  create(): void {
    this.createPlaceholders();
    this.scene.start('TitleScene');
  }

  private createPlaceholders(): void {
    this.createCatTexture('cat', false);
    this.createPhysicsBlockTexture();
  }

  private shouldSkipTexture(key: string): boolean {
    return this.textures.exists(key);
  }

  private createCatTexture(key: string, sliding: boolean): void {
    if (this.shouldSkipTexture(key)) {
      return;
    }

    const graphics = this.make.graphics({ x: 0, y: 0 }, false);
    const width = sliding ? 190 : 180;
    const height = sliding ? 92 : 128;
    const bodyY = sliding ? 44 : 66;

    graphics.fillStyle(0xf28c28, 1);
    graphics.fillRoundedRect(24, bodyY - 32, width - 58, sliding ? 42 : 64, 28);
    graphics.fillStyle(0xffb359, 1);
    graphics.fillRoundedRect(98, bodyY - 48, 58, 54, 24);
    graphics.fillStyle(0xf28c28, 1);
    graphics.fillTriangle(110, bodyY - 40, 122, bodyY - 74, 136, bodyY - 40);
    graphics.fillTriangle(138, bodyY - 40, 154, bodyY - 72, 160, bodyY - 36);
    graphics.fillStyle(0x2f4056, 1);
    graphics.fillCircle(133, bodyY - 24, 4);
    graphics.fillCircle(152, bodyY - 24, 4);
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(142, bodyY - 12, 7);
    graphics.fillStyle(0xf47f9f, 1);
    graphics.fillTriangle(138, bodyY - 17, 146, bodyY - 17, 142, bodyY - 10);
    graphics.lineStyle(7, 0xf28c28, 1);
    graphics.beginPath();
    graphics.moveTo(30, bodyY - 18);
    graphics.lineTo(12, bodyY - 54);
    graphics.lineTo(46, bodyY - 76);
    graphics.strokePath();
    graphics.lineStyle(8, 0xffb359, 1);
    graphics.lineBetween(54, bodyY + 22, 36, bodyY + 44);
    graphics.lineBetween(96, bodyY + 24, 82, bodyY + 48);
    graphics.lineBetween(126, bodyY + 18, 148, bodyY + 42);

    graphics.generateTexture(key, width, height);
    graphics.destroy();
  }

  private createPhysicsBlockTexture(): void {
    if (this.shouldSkipTexture('physicsBlock')) {
      return;
    }

    const graphics = this.make.graphics({ x: 0, y: 0 }, false);
    graphics.fillStyle(0xffffff, 0);
    graphics.fillRect(0, 0, 8, 8);
    graphics.generateTexture('physicsBlock', 8, 8);
    graphics.destroy();
  }
}
