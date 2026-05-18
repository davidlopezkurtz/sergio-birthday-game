import type { LevelDefinition } from '../types';

const WORLD_WIDTH = 1280;
const WORLD_HEIGHT = 2260;
const GROUND_Y = 2060;
const START_X = 130;
const FLOOR_1_Y = 1680;
const FLOOR_2_Y = 1300;
const FLOOR_3_Y = 920;
const FLOOR_4_Y = 540;
const TOP_Y = 250;

const MID_GROUND_TO_1 = (GROUND_Y + FLOOR_1_Y) / 2;
const MID_1_TO_2 = (FLOOR_1_Y + FLOOR_2_Y) / 2;

const obstacleY = (kind: LevelDefinition['obstacles'][number]['kind'], surfaceY: number): number => {
  switch (kind) {
    case 'lowBarrier':
      return surfaceY - 142;
    case 'swing':
      return surfaceY - 164;
    case 'frostingPit':
      return surfaceY - 34;
    case 'cakeWall':
      return surfaceY - 86;
    case 'hurdle':
      return surfaceY - 64;
  }
};

const finishAt = (x: number, label: string): LevelDefinition['finish'] => ({ x, y: TOP_Y, width: 250, label });

export const levels: LevelDefinition[] = [
  {
    id: 'yarn-yard',
    index: 0,
    title: 'Yarn Yard Qualifier',
    subtitle: 'Climb the yarn tower, jump rails, crawl tunnels, and grab pastry points.',
    theme: 'A bright backyard tower course with yarn ladders, pastry jumps, and score ledges.',
    mathCategories: ['addSub'],
    powerup: 'rook',
    bonusPowerup: 'knight',
    targetTimeMs: 90000,
    targetScore: 7200,
    trackLength: 1180,
    worldWidth: WORLD_WIDTH,
    worldHeight: WORLD_HEIGHT,
    startX: START_X,
    groundY: GROUND_Y,
    finish: finishAt(1050, 'Top Yarn Bell'),
    platforms: [
      { id: 'yy-floor-1', x: 700, y: FLOOR_1_Y, width: 1050, label: 'Yarn Yard Floor 2' },
      { id: 'yy-floor-2', x: 580, y: FLOOR_2_Y, width: 1050, label: 'Kitten Climb Floor' },
      { id: 'yy-floor-3', x: 700, y: FLOOR_3_Y, width: 1050, label: 'Ribbon Rail Floor' },
      { id: 'yy-floor-4', x: 580, y: FLOOR_4_Y, width: 1050, label: 'High Yarn Floor' },
      { id: 'yy-top', x: 820, y: TOP_Y, width: 720, label: 'Top Yarn Bell' }
    ],
    ladders: [
      { id: 'yy-ladder-1', x: 1050, yTop: FLOOR_1_Y, yBottom: GROUND_Y, label: 'Climb' },
      { id: 'yy-ladder-2', x: 260, yTop: FLOOR_2_Y, yBottom: FLOOR_1_Y, label: 'Climb' },
      { id: 'yy-ladder-3', x: 1030, yTop: FLOOR_3_Y, yBottom: FLOOR_2_Y, label: 'Climb' },
      { id: 'yy-ladder-4', x: 300, yTop: FLOOR_4_Y, yBottom: FLOOR_3_Y, label: 'Climb' },
      { id: 'yy-ladder-5', x: 990, yTop: TOP_Y, yBottom: FLOOR_4_Y, label: 'Summit' }
    ],
    palette: {
      skyTop: 0x96e7ff,
      skyBottom: 0xf7f0b4,
      ground: 0x38a16d,
      accent: 0xffc33d,
      secondary: 0xef6f8f
    },
    obstacles: [
      { id: 'yy-hurdle-1', kind: 'hurdle', x: 430, y: obstacleY('hurdle', GROUND_Y), label: 'Ribbon Rail' },
      { id: 'yy-swing-1', kind: 'swing', x: 720, y: obstacleY('swing', FLOOR_1_Y), label: 'Swinging Yarn' },
      { id: 'yy-low-1', kind: 'lowBarrier', x: 560, y: obstacleY('lowBarrier', FLOOR_2_Y), label: 'Yarn Tunnel' },
      { id: 'yy-hurdle-2', kind: 'hurdle', x: 800, y: obstacleY('hurdle', FLOOR_3_Y), label: 'Fence Pop' },
      { id: 'yy-low-2', kind: 'lowBarrier', x: 620, y: obstacleY('lowBarrier', FLOOR_4_Y), label: 'Ribbon Crawl' },
      { id: 'yy-wall-1', kind: 'cakeWall', x: 1060, y: obstacleY('cakeWall', TOP_Y), label: 'Gift Stack' }
    ],
    pointThrusters: [
      { id: 'yy-thruster-bottom-1', x: 430, y: GROUND_Y - 150, value: 250, requiredAction: 'jump', kind: 'medium' },
      { id: 'yy-thruster-ladder-1', x: 1050, y: MID_GROUND_TO_1, value: 250, requiredAction: 'jump', kind: 'medium' },
      { id: 'yy-thruster-floor-1', x: 720, y: FLOOR_1_Y - 86, value: 250, requiredAction: 'slide', kind: 'medium' },
      { id: 'yy-thruster-ladder-2', x: 260, y: MID_1_TO_2, value: 250, requiredAction: 'jump', kind: 'medium' },
      { id: 'yy-thruster-floor-2', x: 560, y: FLOOR_2_Y - 86, value: 250, requiredAction: 'slide', kind: 'medium' },
      { id: 'yy-thruster-floor-3', x: 800, y: FLOOR_3_Y - 125, value: 500, requiredAction: 'jump', kind: 'risky' },
      { id: 'yy-thruster-high-1', x: 300, y: FLOOR_4_Y - 120, value: 500, requiredAction: 'jump', kind: 'risky' },
      { id: 'yy-thruster-high-2', x: 930, y: FLOOR_4_Y - 112, value: 500, requiredAction: 'jump', kind: 'risky' },
      { id: 'yy-thruster-summit', x: 1060, y: TOP_Y - 76, value: 750, requiredAction: 'power', kind: 'risky' }
    ],
    powerBadges: [
      { id: 'yy-rook-badge', x: 470, y: FLOOR_4_Y - 104, powerup: 'rook', label: 'Rook Dash' },
      { id: 'yy-knight-badge', x: 900, y: FLOOR_1_Y - 104, powerup: 'knight', label: 'Knight Jump' }
    ],
    bakingStations: []
  },
  {
    id: 'frosting-factory',
    index: 1,
    title: 'Frosting Factory Bake-Off',
    subtitle: 'Climb the mixer tower, dodge bakery hazards, and cash out pastries in the bake-off.',
    theme: 'A bakery-show tower with frosting ladders, mixer arms, and cupcake balconies.',
    mathCategories: ['multiplyDivide'],
    powerup: 'knight',
    bonusPowerup: 'bishop',
    targetTimeMs: 105000,
    targetScore: 8400,
    trackLength: 1180,
    worldWidth: WORLD_WIDTH,
    worldHeight: WORLD_HEIGHT,
    startX: START_X,
    groundY: GROUND_Y,
    finish: finishAt(1050, 'Cake Stand Summit'),
    platforms: [
      { id: 'ff-floor-1', x: 700, y: FLOOR_1_Y, width: 1050, label: 'Sugar Step Floor' },
      { id: 'ff-floor-2', x: 580, y: FLOOR_2_Y, width: 1050, label: 'Cupcake Balcony' },
      { id: 'ff-floor-3', x: 700, y: FLOOR_3_Y, width: 1050, label: 'Mixer Mezzanine' },
      { id: 'ff-floor-4', x: 580, y: FLOOR_4_Y, width: 1050, label: 'Donut Rail Floor' },
      { id: 'ff-top', x: 820, y: TOP_Y, width: 720, label: 'Cake Stand Summit' }
    ],
    ladders: [
      { id: 'ff-ladder-1', x: 1040, yTop: FLOOR_1_Y, yBottom: GROUND_Y, label: 'Climb' },
      { id: 'ff-ladder-2', x: 250, yTop: FLOOR_2_Y, yBottom: FLOOR_1_Y, label: 'Climb' },
      { id: 'ff-ladder-3', x: 1030, yTop: FLOOR_3_Y, yBottom: FLOOR_2_Y, label: 'Climb' },
      { id: 'ff-ladder-4', x: 310, yTop: FLOOR_4_Y, yBottom: FLOOR_3_Y, label: 'Climb' },
      { id: 'ff-ladder-5', x: 990, yTop: TOP_Y, yBottom: FLOOR_4_Y, label: 'Summit' }
    ],
    palette: {
      skyTop: 0xffd6e7,
      skyBottom: 0xfff4c7,
      ground: 0xd56b6b,
      accent: 0x27b6a5,
      secondary: 0x6f64d9
    },
    obstacles: [
      { id: 'ff-pit-1', kind: 'frostingPit', x: 430, y: obstacleY('frostingPit', GROUND_Y), label: 'Frosting Slick' },
      { id: 'ff-hurdle-1', kind: 'hurdle', x: 780, y: obstacleY('hurdle', FLOOR_1_Y), label: 'Piping Rail' },
      { id: 'ff-low-1', kind: 'lowBarrier', x: 560, y: obstacleY('lowBarrier', FLOOR_2_Y), label: 'Mixer Arm' },
      { id: 'ff-swing-1', kind: 'swing', x: 830, y: obstacleY('swing', FLOOR_3_Y), label: 'Rolling Pin' },
      { id: 'ff-low-2', kind: 'lowBarrier', x: 660, y: obstacleY('lowBarrier', FLOOR_4_Y), label: 'Frosting Arch' },
      { id: 'ff-wall-1', kind: 'cakeWall', x: 1050, y: obstacleY('cakeWall', TOP_Y), label: 'Bakery Gate' }
    ],
    pointThrusters: [
      { id: 'ff-thruster-bottom-1', x: 430, y: GROUND_Y - 150, value: 250, requiredAction: 'jump', kind: 'medium' },
      { id: 'ff-thruster-ladder-1', x: 1040, y: MID_GROUND_TO_1, value: 250, requiredAction: 'jump', kind: 'medium' },
      { id: 'ff-thruster-floor-1', x: 780, y: FLOOR_1_Y - 125, value: 500, requiredAction: 'jump', kind: 'risky' },
      { id: 'ff-thruster-bake-1', x: 560, y: FLOOR_2_Y - 118, value: 250, requiredAction: 'jump', kind: 'medium' },
      { id: 'ff-thruster-floor-2', x: 560, y: FLOOR_2_Y - 86, value: 250, requiredAction: 'slide', kind: 'medium' },
      { id: 'ff-thruster-floor-3', x: 830, y: FLOOR_3_Y - 86, value: 500, requiredAction: 'slide', kind: 'risky' },
      { id: 'ff-thruster-bake-2', x: 720, y: FLOOR_4_Y - 120, value: 500, requiredAction: 'jump', kind: 'risky' },
      { id: 'ff-thruster-summit', x: 1050, y: TOP_Y - 76, value: 750, requiredAction: 'power', kind: 'risky' }
    ],
    powerBadges: [
      { id: 'ff-knight-badge', x: 860, y: FLOOR_4_Y - 104, powerup: 'knight', label: 'Knight Jump' },
      { id: 'ff-bishop-badge', x: 900, y: FLOOR_1_Y - 104, powerup: 'bishop', label: 'Bishop Leap' }
    ],
    bakingStations: []
  },
  {
    id: 'birthday-beast-tower',
    index: 2,
    title: 'Birthday Beast Tower',
    subtitle: 'Climb the birthday beast, use chess powers, and bake the final multiplier.',
    theme: 'A final stacked tower course with candle hops, crawl hazards, pastries, and summit powers.',
    mathCategories: ['compareFraction'],
    powerup: 'queen',
    bonusPowerup: 'bishop',
    targetTimeMs: 120000,
    targetScore: 9400,
    trackLength: 1180,
    worldWidth: WORLD_WIDTH,
    worldHeight: WORLD_HEIGHT,
    startX: START_X,
    groundY: GROUND_Y,
    finish: finishAt(1080, 'Birthday Crown'),
    platforms: [
      { id: 'bt-floor-1', x: 700, y: FLOOR_1_Y, width: 1050, label: 'Candle Step Floor' },
      { id: 'bt-floor-2', x: 580, y: FLOOR_2_Y, width: 1050, label: 'Fraction Perch Floor' },
      { id: 'bt-floor-3', x: 700, y: FLOOR_3_Y, width: 1050, label: 'Confetti Catwalk' },
      { id: 'bt-floor-4', x: 580, y: FLOOR_4_Y, width: 1050, label: 'Summit Approach' },
      { id: 'bt-top', x: 820, y: TOP_Y, width: 720, label: 'Birthday Crown' }
    ],
    ladders: [
      { id: 'bt-ladder-1', x: 1050, yTop: FLOOR_1_Y, yBottom: GROUND_Y, label: 'Climb' },
      { id: 'bt-ladder-2', x: 250, yTop: FLOOR_2_Y, yBottom: FLOOR_1_Y, label: 'Climb' },
      { id: 'bt-ladder-3', x: 1030, yTop: FLOOR_3_Y, yBottom: FLOOR_2_Y, label: 'Climb' },
      { id: 'bt-ladder-4', x: 300, yTop: FLOOR_4_Y, yBottom: FLOOR_3_Y, label: 'Climb' },
      { id: 'bt-ladder-5', x: 990, yTop: TOP_Y, yBottom: FLOOR_4_Y, label: 'Summit' }
    ],
    palette: {
      skyTop: 0x8fd6ff,
      skyBottom: 0xffefd1,
      ground: 0x5f8f3f,
      accent: 0xffd23f,
      secondary: 0xf05f73
    },
    obstacles: [
      { id: 'bt-hurdle-1', kind: 'hurdle', x: 420, y: obstacleY('hurdle', GROUND_Y), label: 'Candle Hop' },
      { id: 'bt-low-1', kind: 'lowBarrier', x: 720, y: obstacleY('lowBarrier', FLOOR_1_Y), label: 'Banner Crawl' },
      { id: 'bt-pit-1', kind: 'frostingPit', x: 450, y: obstacleY('frostingPit', FLOOR_2_Y), label: 'Sprinkle Slick' },
      { id: 'bt-swing-1', kind: 'swing', x: 820, y: obstacleY('swing', FLOOR_3_Y), label: 'Confetti Sweeper' },
      { id: 'bt-low-2', kind: 'lowBarrier', x: 700, y: obstacleY('lowBarrier', FLOOR_4_Y), label: 'Crown Crawl' },
      { id: 'bt-wall-1', kind: 'cakeWall', x: 1080, y: obstacleY('cakeWall', TOP_Y), label: 'Crown Wall' }
    ],
    pointThrusters: [
      { id: 'bt-thruster-bottom-1', x: 420, y: GROUND_Y - 150, value: 250, requiredAction: 'jump', kind: 'medium' },
      { id: 'bt-thruster-ladder-1', x: 1050, y: MID_GROUND_TO_1, value: 500, requiredAction: 'jump', kind: 'risky' },
      { id: 'bt-thruster-floor-1', x: 720, y: FLOOR_1_Y - 86, value: 500, requiredAction: 'slide', kind: 'risky' },
      { id: 'bt-thruster-ladder-2', x: 250, y: MID_1_TO_2, value: 500, requiredAction: 'jump', kind: 'risky' },
      { id: 'bt-thruster-floor-2', x: 450, y: FLOOR_2_Y - 125, value: 500, requiredAction: 'jump', kind: 'risky' },
      { id: 'bt-thruster-floor-3', x: 820, y: FLOOR_3_Y - 86, value: 750, requiredAction: 'slide', kind: 'risky' },
      { id: 'bt-thruster-high-1', x: 300, y: FLOOR_4_Y - 120, value: 750, requiredAction: 'jump', kind: 'risky' },
      { id: 'bt-thruster-high-2', x: 900, y: FLOOR_4_Y - 112, value: 750, requiredAction: 'power', kind: 'risky' },
      { id: 'bt-thruster-summit', x: 1080, y: TOP_Y - 76, value: 1000, requiredAction: 'power', kind: 'multiplier' }
    ],
    powerBadges: [
      { id: 'bt-queen-badge', x: 500, y: FLOOR_4_Y - 104, powerup: 'queen', label: 'Queen Shield' },
      { id: 'bt-bishop-badge', x: 900, y: FLOOR_1_Y - 104, powerup: 'bishop', label: 'Bishop Leap' }
    ],
    bakingStations: []
  }
];
