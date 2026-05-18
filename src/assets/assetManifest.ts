import bishopUrl from './images/bishop-beast.png';
import bishopHighDpiUrl from './images/bishop-beast-2x.png';
import cakeWallUrl from './images/cakeWall-beast.png';
import cakeWallHighDpiUrl from './images/cakeWall-beast-2x.png';
import catUrl from './images/cat-ninja.png';
import catHighDpiUrl from './images/cat-ninja-2x.png';
import catHurtUrl from './images/catHurt-ninja.png';
import catHurtHighDpiUrl from './images/catHurt-ninja-2x.png';
import catJumpUrl from './images/catJump-ninja.png';
import catJumpHighDpiUrl from './images/catJump-ninja-2x.png';
import catSlideUrl from './images/catSlide-ninja.png';
import catSlideHighDpiUrl from './images/catSlide-ninja-2x.png';
import catVictoryUrl from './images/catVictory-ninja.png';
import catVictoryHighDpiUrl from './images/catVictory-ninja-2x.png';
import frostingPitUrl from './images/frostingPit-beast.png';
import frostingPitHighDpiUrl from './images/frostingPit-beast-2x.png';
import gateUrl from './images/gate-beast.png';
import gateHighDpiUrl from './images/gate-beast-2x.png';
import hurdleYarnUrl from './images/hurdle-yarn.png';
import hurdleYarnHighDpiUrl from './images/hurdle-yarn-2x.png';
import hurdleBakeryUrl from './images/hurdle-bakery.png';
import hurdleBakeryHighDpiUrl from './images/hurdle-bakery-2x.png';
import hurdleTowerUrl from './images/hurdle-tower.png';
import hurdleTowerHighDpiUrl from './images/hurdle-tower-2x.png';
import knightUrl from './images/knight-beast.png';
import knightHighDpiUrl from './images/knight-beast-2x.png';
import levelBirthdayBeastTowerBgUrl from './images/level-birthday-beast-tower-bg.png';
import levelBirthdayBeastTowerBgHighDpiUrl from './images/level-birthday-beast-tower-bg-2x.png';
import levelFrostingFactoryBgUrl from './images/level-frosting-factory-bg.png';
import levelFrostingFactoryBgHighDpiUrl from './images/level-frosting-factory-bg-2x.png';
import levelYarnYardBgUrl from './images/level-yarn-yard-bg.png';
import levelYarnYardBgHighDpiUrl from './images/level-yarn-yard-bg-2x.png';
import lowBarrierYarnUrl from './images/lowBarrier-yarn.png';
import lowBarrierYarnHighDpiUrl from './images/lowBarrier-yarn-2x.png';
import lowBarrierBakeryUrl from './images/lowBarrier-bakery.png';
import lowBarrierBakeryHighDpiUrl from './images/lowBarrier-bakery-2x.png';
import lowBarrierTowerUrl from './images/lowBarrier-tower.png';
import lowBarrierTowerHighDpiUrl from './images/lowBarrier-tower-2x.png';
import platformBakeryUrl from './images/platform-bakery.png';
import platformBakeryHighDpiUrl from './images/platform-bakery-2x.png';
import platformTowerUrl from './images/platform-tower.png';
import platformTowerHighDpiUrl from './images/platform-tower-2x.png';
import platformYarnUrl from './images/platform-yarn.png';
import platformYarnHighDpiUrl from './images/platform-yarn-2x.png';
import queenUrl from './images/queen-beast.png';
import queenHighDpiUrl from './images/queen-beast-2x.png';
import rookUrl from './images/rook-beast.png';
import rookHighDpiUrl from './images/rook-beast-2x.png';
import starUrl from './images/star-beast.png';
import starHighDpiUrl from './images/star-beast-2x.png';
import swingYarnUrl from './images/swing-yarn.png';
import swingYarnHighDpiUrl from './images/swing-yarn-2x.png';
import swingBakeryUrl from './images/swing-bakery.png';
import swingBakeryHighDpiUrl from './images/swing-bakery-2x.png';
import swingTowerUrl from './images/swing-tower.png';
import swingTowerHighDpiUrl from './images/swing-tower-2x.png';

export type AssetKey =
  | 'cat'
  | 'catSlide'
  | 'catJump'
  | 'catVictory'
  | 'catHurt'
  | 'gate'
  | 'hurdle'
  | 'hurdle-yarn'
  | 'hurdle-bakery'
  | 'hurdle-tower'
  | 'lowBarrier'
  | 'lowBarrier-yarn'
  | 'lowBarrier-bakery'
  | 'lowBarrier-tower'
  | 'swing'
  | 'swing-yarn'
  | 'swing-bakery'
  | 'swing-tower'
  | 'frostingPit'
  | 'cakeWall'
  | 'rook'
  | 'knight'
  | 'bishop'
  | 'queen'
  | 'star'
  | 'level-yarn-yard-bg'
  | 'level-frosting-factory-bg'
  | 'level-birthday-beast-tower-bg'
  | 'platform-yarn'
  | 'platform-bakery'
  | 'platform-tower';

export interface AssetManifestEntry {
  key: AssetKey;
  description: string;
  width: number;
  height: number;
  kind: 'Hero' | 'MathGate' | 'Obstacle' | 'Power' | 'Score' | 'Background' | 'Platform';
  url?: string;
  highDpiUrl?: string;
}

export const assetManifest: AssetManifestEntry[] = [
  {
    key: 'cat',
    description: 'Ninja orange tabby birthday contestant, running',
    width: 180,
    height: 130,
    kind: 'Hero',
    url: catUrl,
    highDpiUrl: catHighDpiUrl
  },
  {
    key: 'catSlide',
    description: 'Ninja cat low slide pose',
    width: 190,
    height: 90,
    kind: 'Hero',
    url: catSlideUrl,
    highDpiUrl: catSlideHighDpiUrl
  },
  {
    key: 'catJump',
    description: 'Ninja cat mid-air jump pose',
    width: 180,
    height: 130,
    kind: 'Hero',
    url: catJumpUrl,
    highDpiUrl: catJumpHighDpiUrl
  },
  {
    key: 'catVictory',
    description: 'Ninja cat birthday champion pose',
    width: 200,
    height: 200,
    kind: 'Hero',
    url: catVictoryUrl,
    highDpiUrl: catVictoryHighDpiUrl
  },
  {
    key: 'catHurt',
    description: 'Ninja cat gentle dazed feedback pose',
    width: 180,
    height: 130,
    kind: 'Hero',
    url: catHurtUrl,
    highDpiUrl: catHurtHighDpiUrl
  },
  {
    key: 'gate',
    description: 'Obstacle-course math gate with blank sign area',
    width: 180,
    height: 220,
    kind: 'MathGate',
    url: gateUrl,
    highDpiUrl: gateHighDpiUrl
  },
  {
    key: 'hurdle',
    description: 'Default Yarn Yard jump-over hurdle',
    width: 160,
    height: 160,
    kind: 'Obstacle',
    url: hurdleYarnUrl,
    highDpiUrl: hurdleYarnHighDpiUrl
  },
  {
    key: 'hurdle-yarn',
    description: 'Yarn Yard yarn-ball jump-over hurdle',
    width: 160,
    height: 160,
    kind: 'Obstacle',
    url: hurdleYarnUrl,
    highDpiUrl: hurdleYarnHighDpiUrl
  },
  {
    key: 'hurdle-bakery',
    description: 'Frosting Factory rolling-pin jump-over hurdle',
    width: 160,
    height: 160,
    kind: 'Obstacle',
    url: hurdleBakeryUrl,
    highDpiUrl: hurdleBakeryHighDpiUrl
  },
  {
    key: 'hurdle-tower',
    description: 'Birthday Beast Tower candle jump-over hurdle',
    width: 160,
    height: 160,
    kind: 'Obstacle',
    url: hurdleTowerUrl,
    highDpiUrl: hurdleTowerHighDpiUrl
  },
  {
    key: 'lowBarrier',
    description: 'Default Yarn Yard slide-under tunnel',
    width: 160,
    height: 160,
    kind: 'Obstacle',
    url: lowBarrierYarnUrl,
    highDpiUrl: lowBarrierYarnHighDpiUrl
  },
  {
    key: 'lowBarrier-yarn',
    description: 'Yarn Yard knit slide-under tunnel',
    width: 160,
    height: 160,
    kind: 'Obstacle',
    url: lowBarrierYarnUrl,
    highDpiUrl: lowBarrierYarnHighDpiUrl
  },
  {
    key: 'lowBarrier-bakery',
    description: 'Frosting Factory buttercream slide-under wall',
    width: 160,
    height: 160,
    kind: 'Obstacle',
    url: lowBarrierBakeryUrl,
    highDpiUrl: lowBarrierBakeryHighDpiUrl
  },
  {
    key: 'lowBarrier-tower',
    description: 'Birthday Beast Tower bunting slide-under drape',
    width: 160,
    height: 160,
    kind: 'Obstacle',
    url: lowBarrierTowerUrl,
    highDpiUrl: lowBarrierTowerHighDpiUrl
  },
  {
    key: 'swing',
    description: 'Default Yarn Yard swinging timing obstacle',
    width: 160,
    height: 160,
    kind: 'Obstacle',
    url: swingYarnUrl,
    highDpiUrl: swingYarnHighDpiUrl
  },
  {
    key: 'swing-yarn',
    description: 'Yarn Yard swinging yarn-ball timing obstacle',
    width: 160,
    height: 160,
    kind: 'Obstacle',
    url: swingYarnUrl,
    highDpiUrl: swingYarnHighDpiUrl
  },
  {
    key: 'swing-bakery',
    description: 'Frosting Factory swinging donut timing obstacle',
    width: 160,
    height: 160,
    kind: 'Obstacle',
    url: swingBakeryUrl,
    highDpiUrl: swingBakeryHighDpiUrl
  },
  {
    key: 'swing-tower',
    description: 'Birthday Beast Tower swinging gift timing obstacle',
    width: 160,
    height: 160,
    kind: 'Obstacle',
    url: swingTowerUrl,
    highDpiUrl: swingTowerHighDpiUrl
  },
  {
    key: 'frostingPit',
    description: 'Glossy frosting slick jump-over hazard',
    width: 160,
    height: 160,
    kind: 'Obstacle',
    url: frostingPitUrl,
    highDpiUrl: frostingPitHighDpiUrl
  },
  {
    key: 'cakeWall',
    description: 'Stacked birthday cake power obstacle',
    width: 160,
    height: 160,
    kind: 'Obstacle',
    url: cakeWallUrl,
    highDpiUrl: cakeWallHighDpiUrl
  },
  {
    key: 'rook',
    description: 'Rook dash chess power-up badge',
    width: 128,
    height: 128,
    kind: 'Power',
    url: rookUrl,
    highDpiUrl: rookHighDpiUrl
  },
  {
    key: 'knight',
    description: 'Knight jump chess power-up badge',
    width: 128,
    height: 128,
    kind: 'Power',
    url: knightUrl,
    highDpiUrl: knightHighDpiUrl
  },
  {
    key: 'bishop',
    description: 'Bishop leap chess power-up badge',
    width: 128,
    height: 128,
    kind: 'Power',
    url: bishopUrl,
    highDpiUrl: bishopHighDpiUrl
  },
  {
    key: 'queen',
    description: 'Queen shield chess power-up badge',
    width: 128,
    height: 128,
    kind: 'Power',
    url: queenUrl,
    highDpiUrl: queenHighDpiUrl
  },
  {
    key: 'star',
    description: 'Chunky collectible score star',
    width: 96,
    height: 96,
    kind: 'Score',
    url: starUrl,
    highDpiUrl: starHighDpiUrl
  },
  {
    key: 'level-yarn-yard-bg',
    description: 'Yarn Yard side-scrolling backdrop',
    width: 1280,
    height: 720,
    kind: 'Background',
    url: levelYarnYardBgUrl,
    highDpiUrl: levelYarnYardBgHighDpiUrl
  },
  {
    key: 'level-frosting-factory-bg',
    description: 'Frosting Factory side-scrolling backdrop',
    width: 1280,
    height: 720,
    kind: 'Background',
    url: levelFrostingFactoryBgUrl,
    highDpiUrl: levelFrostingFactoryBgHighDpiUrl
  },
  {
    key: 'level-birthday-beast-tower-bg',
    description: 'Birthday Beast Tower side-scrolling backdrop',
    width: 1280,
    height: 720,
    kind: 'Background',
    url: levelBirthdayBeastTowerBgUrl,
    highDpiUrl: levelBirthdayBeastTowerBgHighDpiUrl
  },
  {
    key: 'platform-yarn',
    description: 'Yarn Yard jump-up ledge platform',
    width: 512,
    height: 96,
    kind: 'Platform',
    url: platformYarnUrl,
    highDpiUrl: platformYarnHighDpiUrl
  },
  {
    key: 'platform-bakery',
    description: 'Frosting Factory jump-up ledge platform',
    width: 512,
    height: 96,
    kind: 'Platform',
    url: platformBakeryUrl,
    highDpiUrl: platformBakeryHighDpiUrl
  },
  {
    key: 'platform-tower',
    description: 'Birthday Beast Tower jump-up ledge platform',
    width: 512,
    height: 96,
    kind: 'Platform',
    url: platformTowerUrl,
    highDpiUrl: platformTowerHighDpiUrl
  }
];

export const assetsByKey = Object.fromEntries(
  assetManifest.map((asset) => [asset.key, asset])
) as Record<AssetKey, AssetManifestEntry>;

export const resolveAssetUrl = (asset: AssetManifestEntry, devicePixelRatio = 1): string | undefined =>
  devicePixelRatio > 1 && asset.highDpiUrl ? asset.highDpiUrl : asset.url;
