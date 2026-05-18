import Phaser from 'phaser';
import { assetsByKey, resolveAssetUrl, type AssetKey } from '../assets/assetManifest';

const TITLE_ASSET_KEYS: AssetKey[] = ['cat'];

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    const progressBar = this.add.rectangle(640, 404, 520, 18, 0xffffff, 0.24).setStrokeStyle(3, 0xffffff, 0.7);
    const progressFill = this.add.rectangle(382, 404, 0, 18, 0xffd23f, 1).setOrigin(0, 0.5);
    const loadingText = this.add
      .text(640, 350, "Loading Sergio's birthday course...", {
        fontFamily: 'Arial, sans-serif',
        fontSize: '30px',
        color: '#102033',
        fontStyle: '900',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        padding: { x: 18, y: 10 }
      })
      .setOrigin(0.5);

    const updateProgress = (value: number) => {
      progressFill.width = 516 * value;
    };

    this.load.on('progress', updateProgress);
    this.load.once('complete', () => {
      this.load.off('progress', updateProgress);
      progressBar.destroy();
      progressFill.destroy();
      loadingText.destroy();
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
