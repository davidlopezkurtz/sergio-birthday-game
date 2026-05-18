import Phaser from 'phaser';
import { assetManifest, resolveAssetUrl } from '../assets/assetManifest';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    for (const asset of assetManifest) {
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
    this.createCatTexture('catSlide', true);
    this.createGateTexture();
    this.createObstacleTexture('hurdle', 0xffc33d, 'H');
    this.createObstacleTexture('lowBarrier', 0x27b6a5, 'S');
    this.createObstacleTexture('swing', 0xef6f8f, '!');
    this.createObstacleTexture('frostingPit', 0xff9ec7, '~');
    this.createObstacleTexture('cakeWall', 0x8c65d3, '#');
    this.createPowerTexture('rook', 'R', 0x2f4056);
    this.createPowerTexture('knight', 'N', 0x426b3c);
    this.createPowerTexture('bishop', 'B', 0x6b4a8c);
    this.createPowerTexture('queen', 'Q', 0xd2475c);
    this.createStarTexture();
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

  private createGateTexture(): void {
    if (this.shouldSkipTexture('gate')) {
      return;
    }

    const graphics = this.make.graphics({ x: 0, y: 0 }, false);
    graphics.fillStyle(0x2f4056, 1);
    graphics.fillRoundedRect(18, 10, 144, 190, 12);
    graphics.fillStyle(0xffd23f, 1);
    graphics.fillRoundedRect(34, 26, 112, 92, 8);
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRoundedRect(44, 132, 92, 42, 8);
    graphics.lineStyle(8, 0x27b6a5, 1);
    graphics.strokeRoundedRect(18, 10, 144, 190, 12);
    graphics.generateTexture('gate', 180, 220);
    graphics.destroy();
  }

  private createObstacleTexture(key: string, color: number, symbol: string): void {
    if (this.shouldSkipTexture(key)) {
      return;
    }

    const graphics = this.make.graphics({ x: 0, y: 0 }, false);
    graphics.fillStyle(color, 1);
    graphics.fillRoundedRect(16, 22, 128, 116, 16);
    graphics.lineStyle(8, 0xffffff, 0.8);
    graphics.strokeRoundedRect(16, 22, 128, 116, 16);
    graphics.fillStyle(0x102033, 1);
    graphics.fillCircle(55, 78, 8);
    graphics.fillCircle(105, 78, 8);
    graphics.generateTexture(key, 160, 160);
    graphics.destroy();

    const canvas = this.textures.createCanvas(`${key}-label`, 160, 160);
    const context = canvas?.getContext();
    if (canvas && context) {
      context.font = '700 70px sans-serif';
      context.fillStyle = '#102033';
      context.textAlign = 'center';
      context.fillText(symbol, 80, 122);
      canvas.refresh();
    }
  }

  private createPowerTexture(key: string, label: string, color: number): void {
    if (this.shouldSkipTexture(key)) {
      return;
    }

    const graphics = this.make.graphics({ x: 0, y: 0 }, false);
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(64, 64, 58);
    graphics.fillStyle(color, 1);
    graphics.fillCircle(64, 64, 48);
    graphics.lineStyle(6, 0xffd23f, 1);
    graphics.strokeCircle(64, 64, 54);
    graphics.generateTexture(key, 128, 128);
    graphics.destroy();

    const canvas = this.textures.createCanvas(`${key}-glyph`, 128, 128);
    const context = canvas?.getContext();
    if (canvas && context) {
      context.font = '800 62px Georgia, serif';
      context.fillStyle = '#ffffff';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(label, 64, 69);
      canvas.refresh();
    }
  }

  private createStarTexture(): void {
    if (this.shouldSkipTexture('star')) {
      return;
    }

    const graphics = this.make.graphics({ x: 0, y: 0 }, false);
    const points: Phaser.Geom.Point[] = [];
    for (let index = 0; index < 10; index += 1) {
      const angle = Phaser.Math.DegToRad(index * 36 - 90);
      const radius = index % 2 === 0 ? 42 : 19;
      points.push(new Phaser.Geom.Point(48 + Math.cos(angle) * radius, 48 + Math.sin(angle) * radius));
    }
    graphics.fillStyle(0xffd23f, 1);
    graphics.fillPoints(points, true);
    graphics.lineStyle(5, 0xffffff, 0.85);
    graphics.strokePoints(points, true);
    graphics.generateTexture('star', 96, 96);
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
