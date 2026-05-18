import Phaser from 'phaser';

const CAT_IDLE_FRAMES = ['title-cat-idle-1', 'title-cat-idle-2', 'title-cat-idle-1', 'title-cat-idle-3'] as const;
const FLOATING_PASTRIES = [
  { key: 'title-floating-pastry-1', x: 150, y: 232, size: 86, delay: 0 },
  { key: 'title-floating-pastry-2', x: 1090, y: 245, size: 92, delay: 220 },
  { key: 'title-floating-pastry-3', x: 248, y: 492, size: 78, delay: 440 },
  { key: 'title-floating-pastry-4', x: 1038, y: 482, size: 82, delay: 660 }
] as const;

export class TitleScene extends Phaser.Scene {
  private cat?: Phaser.GameObjects.Image;
  private startButton?: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
  private starting = false;

  constructor() {
    super('TitleScene');
  }

  create(): void {
    this.starting = false;
    this.cameras.main.setBackgroundColor(0x102033);

    this.createBackdrop();
    this.createLogoPanel();
    this.createCat();
    this.createStartButton();

    this.input.keyboard?.once('keydown-SPACE', () => this.startGame());
    this.input.keyboard?.once('keydown-ENTER', () => this.startGame());
  }

  private createBackdrop(): void {
    const background = this.addTitleImage('title-bg', 640, 360, 0);
    if (background) {
      background.setDisplaySize(1280, 720);
    } else {
      this.add.rectangle(640, 360, 1280, 720, 0x102033);
      this.add.rectangle(640, 575, 1280, 290, 0x38a16d);
    }

    this.add.rectangle(640, 360, 1280, 720, 0x102033, 0.12).setDepth(1);

    const leftSpotlight = this.addTitleImage('title-spotlight-left', 168, 296, 2)?.setDisplaySize(250, 350).setAlpha(0.5);
    const rightSpotlight = this.addTitleImage('title-spotlight-right', 1112, 296, 2)?.setDisplaySize(250, 350).setAlpha(0.5);
    this.tweens.add({
      targets: [leftSpotlight, rightSpotlight].filter(Boolean),
      angle: { from: -3, to: 3 },
      alpha: { from: 0.36, to: 0.56 },
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.addTitleImage('title-confetti-1', 260, 126, 3)?.setDisplaySize(220, 220).setAlpha(0.54);
    this.addTitleImage('title-confetti-2', 1015, 134, 3)?.setDisplaySize(220, 220).setAlpha(0.54);

    for (const pastry of FLOATING_PASTRIES) {
      const sprite = this.addTitleImage(pastry.key, pastry.x, pastry.y, 4);
      if (!sprite) {
        continue;
      }

      sprite.setDisplaySize(pastry.size, pastry.size);
      this.tweens.add({
        targets: sprite,
        y: pastry.y - 16,
        angle: pastry.x < 640 ? 5 : -5,
        duration: 1250 + pastry.delay,
        delay: pastry.delay,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
  }

  private createLogoPanel(): void {
    const panel = this.addTitleImage('title-logo-panel', 640, 132, 5);
    if (panel) {
      panel.setDisplaySize(760, 208);
    } else {
      this.add.rectangle(640, 132, 760, 188, 0x6b4a8c, 0.95).setStrokeStyle(6, 0xffd23f).setDepth(5);
    }

    this.add
      .text(640, 101, "Sergio's Cat Beast Birthday", {
        fontFamily: 'Arial, sans-serif',
        fontSize: '44px',
        color: '#ffffff',
        fontStyle: '900',
        align: 'center',
        wordWrap: { width: 650 }
      })
      .setOrigin(0.5)
      .setDepth(6);

    this.add
      .text(640, 166, 'Climb, dodge, grab pastries, then win the bake-off.', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        color: '#ffec9f',
        fontStyle: '900',
        align: 'center',
        wordWrap: { width: 650 }
      })
      .setOrigin(0.5)
      .setDepth(6);
  }

  private createCat(): void {
    this.cat = this.addTitleImage(CAT_IDLE_FRAMES[0], 640, 414, 6);
    if (!this.cat) {
      this.cat = this.add.image(640, 414, 'cat').setDepth(6);
    }

    this.cat.setDisplaySize(300, 220);
    let frameIndex = 0;
    this.time.addEvent({
      delay: 220,
      loop: true,
      callback: () => {
        if (!this.cat || this.starting) {
          return;
        }

        frameIndex = (frameIndex + 1) % CAT_IDLE_FRAMES.length;
        this.cat.setTexture(CAT_IDLE_FRAMES[frameIndex]);
      }
    });
  }

  private createStartButton(): void {
    const glow = this.addTitleImage('title-start-button-glow', 640, 584, 5);
    glow?.setDisplaySize(486, 156).setAlpha(0.64);
    if (glow) {
      this.tweens.add({
        targets: glow,
        alpha: { from: 0.42, to: 0.8 },
        scale: { from: 0.96, to: 1.04 },
        duration: 760,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }

    this.startButton = this.addTitleImage('title-start-button', 640, 584, 6) ??
      this.add.rectangle(640, 584, 430, 92, 0xffd23f).setStrokeStyle(5, 0xffffff).setDepth(6);
    this.startButton.setDisplaySize(430, 116);
    this.startButton.setInteractive({ useHandCursor: true });

    this.add
      .text(640, 584, 'Start the Score Chase', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '30px',
        color: '#102033',
        fontStyle: '900'
      })
      .setOrigin(0.5)
      .setDepth(7);

    this.startButton.on('pointerdown', () => this.startGame());
  }

  private startGame(): void {
    if (this.starting) {
      return;
    }

    this.starting = true;
    if (this.startButton instanceof Phaser.GameObjects.Image && this.textures.exists('title-start-button-pressed')) {
      this.startButton.setTexture('title-start-button-pressed');
    }

    if (this.cat && this.textures.exists('title-cat-ready')) {
      this.cat.setTexture('title-cat-ready');
    }

    this.tweens.add({
      targets: this.cat,
      y: 392,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 190,
      ease: 'Back.easeOut'
    });

    this.registry.set('scoreSummaries', []);
    this.time.delayedCall(230, () => this.scene.start('PlayScene', { levelIndex: 0 }));
  }

  private addTitleImage(key: string, x: number, y: number, depth: number): Phaser.GameObjects.Image | undefined {
    if (!this.textures.exists(key)) {
      return undefined;
    }

    return this.add.image(x, y, key).setDepth(depth);
  }
}
