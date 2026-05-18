import type { LevelDefinition } from '../types';

const WORLD_WIDTH = 1280;
const WORLD_HEIGHT = 1740;
const GROUND_Y = 1580;
const START_X = 130;

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

export const levels: LevelDefinition[] = [
  {
    id: 'yarn-yard',
    index: 0,
    title: 'Yarn Yard Qualifier',
    subtitle: 'Climb the yarn tower, dodge course hazards, and chase the top route.',
    theme: 'A bright backyard tower course with yarn ladders, rail jumps, and score ledges.',
    mathCategories: ['addSub'],
    powerup: 'rook',
    targetTimeMs: 90000,
    targetScore: 7200,
    trackLength: 1180,
    worldWidth: WORLD_WIDTH,
    worldHeight: WORLD_HEIGHT,
    startX: START_X,
    groundY: GROUND_Y,
    gatePositions: [900, 300, 930],
    gateYPositions: [GROUND_Y, 1100, 620],
    finish: { x: 1050, y: 380, width: 260, label: 'Top Yarn Bell' },
    platforms: [
      { id: 'yy-floor-1', x: 700, y: 1340, width: 1050, label: 'Yarn Yard Floor 2' },
      { id: 'yy-floor-2', x: 580, y: 1100, width: 1050, label: 'Kitten Climb Floor' },
      { id: 'yy-floor-3', x: 700, y: 860, width: 1050, label: 'Ribbon Rail Floor' },
      { id: 'yy-floor-4', x: 580, y: 620, width: 1050, label: 'High Yarn Floor' },
      { id: 'yy-top', x: 820, y: 380, width: 720, label: 'Top Yarn Bell' }
    ],
    ladders: [
      { id: 'yy-ladder-1', x: 1050, yTop: 1340, yBottom: GROUND_Y, label: 'Climb' },
      { id: 'yy-ladder-2', x: 260, yTop: 1100, yBottom: 1340, label: 'Climb' },
      { id: 'yy-ladder-3', x: 1030, yTop: 860, yBottom: 1100, label: 'Climb' },
      { id: 'yy-ladder-4', x: 300, yTop: 620, yBottom: 860, label: 'Climb' },
      { id: 'yy-ladder-5', x: 990, yTop: 380, yBottom: 620, label: 'Summit' }
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
      { id: 'yy-swing-1', kind: 'swing', x: 720, y: obstacleY('swing', 1340), label: 'Swinging Yarn' },
      { id: 'yy-low-1', kind: 'lowBarrier', x: 430, y: obstacleY('lowBarrier', 1100), label: 'Yarn Tunnel' },
      { id: 'yy-hurdle-2', kind: 'hurdle', x: 800, y: obstacleY('hurdle', 860), label: 'Fence Pop' },
      { id: 'yy-wall-1', kind: 'cakeWall', x: 1060, y: obstacleY('cakeWall', 380), label: 'Gift Stack' }
    ],
    pointThrusters: [
      { id: 'yy-thruster-bottom-1', x: 430, y: GROUND_Y - 150, value: 250, requiredAction: 'jump', kind: 'medium' },
      { id: 'yy-thruster-ladder-1', x: 1050, y: 1450, value: 250, requiredAction: 'jump', kind: 'medium' },
      { id: 'yy-thruster-floor-1', x: 720, y: 1265, value: 250, requiredAction: 'slide', kind: 'medium' },
      { id: 'yy-thruster-ladder-2', x: 260, y: 1210, value: 250, requiredAction: 'jump', kind: 'medium' },
      { id: 'yy-thruster-floor-2', x: 430, y: 1018, value: 250, requiredAction: 'slide', kind: 'medium' },
      { id: 'yy-thruster-floor-3', x: 800, y: 775, value: 500, requiredAction: 'jump', kind: 'risky' },
      { id: 'yy-thruster-high-1', x: 300, y: 735, value: 500, requiredAction: 'jump', kind: 'risky' },
      { id: 'yy-thruster-high-2', x: 930, y: 545, value: 500, requiredAction: 'jump', kind: 'risky' },
      { id: 'yy-thruster-summit', x: 1060, y: 305, value: 750, requiredAction: 'power', kind: 'risky' }
    ],
    bakingStations: []
  },
  {
    id: 'frosting-factory',
    index: 1,
    title: 'Frosting Factory Bake-Off',
    subtitle: 'Climb the mixer tower, hit bake stations, and take the risky frosting route.',
    theme: 'A bakery-show tower with frosting ladders, mixer arms, and cupcake balconies.',
    mathCategories: ['multiplyDivide'],
    powerup: 'knight',
    targetTimeMs: 105000,
    targetScore: 8400,
    trackLength: 1180,
    worldWidth: WORLD_WIDTH,
    worldHeight: WORLD_HEIGHT,
    startX: START_X,
    groundY: GROUND_Y,
    gatePositions: [830, 350, 920],
    gateYPositions: [GROUND_Y, 1100, 620],
    finish: { x: 1050, y: 380, width: 260, label: 'Cake Stand Summit' },
    platforms: [
      { id: 'ff-floor-1', x: 700, y: 1340, width: 1050, label: 'Sugar Step Floor' },
      { id: 'ff-floor-2', x: 580, y: 1100, width: 1050, label: 'Cupcake Balcony' },
      { id: 'ff-floor-3', x: 700, y: 860, width: 1050, label: 'Mixer Mezzanine' },
      { id: 'ff-floor-4', x: 580, y: 620, width: 1050, label: 'Donut Rail Floor' },
      { id: 'ff-top', x: 820, y: 380, width: 720, label: 'Cake Stand Summit' }
    ],
    ladders: [
      { id: 'ff-ladder-1', x: 1040, yTop: 1340, yBottom: GROUND_Y, label: 'Climb' },
      { id: 'ff-ladder-2', x: 250, yTop: 1100, yBottom: 1340, label: 'Climb' },
      { id: 'ff-ladder-3', x: 1030, yTop: 860, yBottom: 1100, label: 'Climb' },
      { id: 'ff-ladder-4', x: 310, yTop: 620, yBottom: 860, label: 'Climb' },
      { id: 'ff-ladder-5', x: 990, yTop: 380, yBottom: 620, label: 'Summit' }
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
      { id: 'ff-hurdle-1', kind: 'hurdle', x: 780, y: obstacleY('hurdle', 1340), label: 'Cupcake Stack' },
      { id: 'ff-low-1', kind: 'lowBarrier', x: 430, y: obstacleY('lowBarrier', 1100), label: 'Mixer Arm' },
      { id: 'ff-swing-1', kind: 'swing', x: 830, y: obstacleY('swing', 860), label: 'Rolling Pin' },
      { id: 'ff-wall-1', kind: 'cakeWall', x: 1050, y: obstacleY('cakeWall', 380), label: 'Layer Cake Wall' }
    ],
    pointThrusters: [
      { id: 'ff-thruster-bottom-1', x: 430, y: GROUND_Y - 150, value: 250, requiredAction: 'jump', kind: 'medium' },
      { id: 'ff-thruster-ladder-1', x: 1040, y: 1450, value: 250, requiredAction: 'jump', kind: 'medium' },
      { id: 'ff-thruster-floor-1', x: 780, y: 1265, value: 500, requiredAction: 'jump', kind: 'risky' },
      { id: 'ff-thruster-bake-1', x: 560, y: 1028, value: 250, requiredAction: 'jump', kind: 'medium' },
      { id: 'ff-thruster-floor-2', x: 430, y: 1018, value: 250, requiredAction: 'slide', kind: 'medium' },
      { id: 'ff-thruster-floor-3', x: 830, y: 780, value: 500, requiredAction: 'slide', kind: 'risky' },
      { id: 'ff-thruster-bake-2', x: 720, y: 548, value: 500, requiredAction: 'jump', kind: 'risky' },
      { id: 'ff-thruster-summit', x: 1050, y: 305, value: 750, requiredAction: 'power', kind: 'risky' }
    ],
    bakingStations: [
      {
        id: 'ff-bake-1',
        x: 560,
        y: 1100,
        label: 'Cupcake Match',
        recipe: ['frosting', 'sprinkles', 'candle'],
        value: 500,
        perfectBonus: 250
      },
      {
        id: 'ff-bake-2',
        x: 720,
        y: 620,
        label: 'Layer Cake Bonus',
        recipe: ['frosting', 'berry', 'sprinkles'],
        value: 650,
        perfectBonus: 350
      }
    ]
  },
  {
    id: 'birthday-beast-tower',
    index: 2,
    title: 'Birthday Beast Tower',
    subtitle: 'Climb the birthday beast, use chess powers, and crown the cat champion.',
    theme: 'A final stacked tower course with candle hops, fraction gates, and summit thrusters.',
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
    gatePositions: [820, 310, 900, 970],
    gateYPositions: [GROUND_Y, 1100, 620, 380],
    finish: { x: 1080, y: 380, width: 250, label: 'Birthday Crown' },
    platforms: [
      { id: 'bt-floor-1', x: 700, y: 1340, width: 1050, label: 'Candle Step Floor' },
      { id: 'bt-floor-2', x: 580, y: 1100, width: 1050, label: 'Fraction Perch Floor' },
      { id: 'bt-floor-3', x: 700, y: 860, width: 1050, label: 'Confetti Catwalk' },
      { id: 'bt-floor-4', x: 580, y: 620, width: 1050, label: 'Summit Approach' },
      { id: 'bt-top', x: 820, y: 380, width: 720, label: 'Birthday Crown' }
    ],
    ladders: [
      { id: 'bt-ladder-1', x: 1050, yTop: 1340, yBottom: GROUND_Y, label: 'Climb' },
      { id: 'bt-ladder-2', x: 250, yTop: 1100, yBottom: 1340, label: 'Climb' },
      { id: 'bt-ladder-3', x: 1030, yTop: 860, yBottom: 1100, label: 'Climb' },
      { id: 'bt-ladder-4', x: 300, yTop: 620, yBottom: 860, label: 'Climb' },
      { id: 'bt-ladder-5', x: 990, yTop: 380, yBottom: 620, label: 'Summit' }
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
      { id: 'bt-low-1', kind: 'lowBarrier', x: 760, y: obstacleY('lowBarrier', 1340), label: 'Banner Crawl' },
      { id: 'bt-pit-1', kind: 'frostingPit', x: 450, y: obstacleY('frostingPit', 1100), label: 'Sprinkle Slick' },
      { id: 'bt-swing-1', kind: 'swing', x: 820, y: obstacleY('swing', 860), label: 'Confetti Sweeper' },
      { id: 'bt-wall-1', kind: 'cakeWall', x: 1080, y: obstacleY('cakeWall', 380), label: 'Crown Cake' }
    ],
    pointThrusters: [
      { id: 'bt-thruster-bottom-1', x: 420, y: GROUND_Y - 150, value: 250, requiredAction: 'jump', kind: 'medium' },
      { id: 'bt-thruster-ladder-1', x: 1050, y: 1450, value: 500, requiredAction: 'jump', kind: 'risky' },
      { id: 'bt-thruster-floor-1', x: 760, y: 1215, value: 500, requiredAction: 'slide', kind: 'risky' },
      { id: 'bt-thruster-ladder-2', x: 250, y: 1210, value: 500, requiredAction: 'jump', kind: 'risky' },
      { id: 'bt-thruster-floor-2', x: 450, y: 1010, value: 500, requiredAction: 'jump', kind: 'risky' },
      { id: 'bt-thruster-floor-3', x: 820, y: 780, value: 750, requiredAction: 'slide', kind: 'risky' },
      { id: 'bt-thruster-high-1', x: 300, y: 735, value: 750, requiredAction: 'jump', kind: 'risky' },
      { id: 'bt-thruster-high-2', x: 900, y: 545, value: 750, requiredAction: 'power', kind: 'risky' },
      { id: 'bt-thruster-summit', x: 1080, y: 300, value: 1000, requiredAction: 'power', kind: 'multiplier' }
    ],
    bakingStations: []
  }
];
