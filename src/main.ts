import Phaser from 'phaser';
import './style.css';
import { BakingMiniGameScene } from './scenes/BakingMiniGameScene';
import { BootScene } from './scenes/BootScene';
import { FinaleScene } from './scenes/FinaleScene';
import { MathGateScene } from './scenes/MathGateScene';
import { PlayScene } from './scenes/PlayScene';
import { ResultsScene } from './scenes/ResultsScene';
import { TitleScene } from './scenes/TitleScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: 1280,
  height: 720,
  backgroundColor: '#bfeff0',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720,
    fullscreenTarget: 'game-shell'
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 1500 },
      debug: false
    }
  },
  input: {
    activePointers: 4
  },
  scene: [BootScene, TitleScene, PlayScene, MathGateScene, BakingMiniGameScene, ResultsScene, FinaleScene]
};

const game = new Phaser.Game(config);

if (import.meta.env.DEV) {
  (window as unknown as { __SERGIO_GAME__?: Phaser.Game }).__SERGIO_GAME__ = game;
}
