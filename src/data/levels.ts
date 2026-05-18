import type { LevelDefinition } from '../types';

export const levels: LevelDefinition[] = [
  {
    id: 'yarn-yard',
    index: 0,
    title: 'Yarn Yard Qualifier',
    subtitle: 'Rook Dash through the yarn-yard trials.',
    theme: 'A bright backyard course with yarn-ball rollers and fence jumps.',
    mathCategories: ['addSub'],
    powerup: 'rook',
    targetTimeMs: 90000,
    targetScore: 6500,
    trackLength: 6400,
    gatePositions: [1850, 4000, 5600],
    platforms: [
      { id: 'yy-platform-1', x: 980, y: 486, width: 360, label: 'Lower Yarn Step' },
      { id: 'yy-platform-2', x: 1370, y: 430, width: 420, label: 'Kitten Climb Lane' },
      { id: 'yy-platform-3', x: 1780, y: 374, width: 390, label: 'Gate Perch' },
      { id: 'yy-platform-4', x: 4320, y: 470, width: 380, label: 'Fence Step' },
      { id: 'yy-platform-5', x: 4800, y: 410, width: 460, label: 'High Yarn Ledge' },
      { id: 'yy-platform-6', x: 5260, y: 350, width: 420, label: 'Rafter Dash' }
    ],
    palette: {
      skyTop: 0x96e7ff,
      skyBottom: 0xf7f0b4,
      ground: 0x38a16d,
      accent: 0xffc33d,
      secondary: 0xef6f8f
    },
    obstacles: [
      { id: 'yy-hurdle-1', kind: 'hurdle', x: 1120, label: 'Ribbon Rail' },
      { id: 'yy-low-1', kind: 'lowBarrier', x: 2600, label: 'Yarn Tunnel' },
      { id: 'yy-swing-1', kind: 'swing', x: 3400, label: 'Swinging Donut' },
      { id: 'yy-hurdle-2', kind: 'hurdle', x: 4800, label: 'Fence Pop' },
      { id: 'yy-wall-1', kind: 'cakeWall', x: 6200, label: 'Gift Stack' }
    ],
    pointThrusters: [
      { id: 'yy-thruster-jump-1', x: 1120, y: 410, value: 100, requiredAction: 'jump', kind: 'small' },
      { id: 'yy-thruster-step-1', x: 980, y: 422, value: 250, requiredAction: 'jump', kind: 'medium' },
      { id: 'yy-thruster-high-1', x: 1370, y: 355, value: 250, requiredAction: 'jump', kind: 'medium' },
      { id: 'yy-thruster-perch-1', x: 1780, y: 300, value: 250, requiredAction: 'jump', kind: 'medium' },
      { id: 'yy-thruster-slide-1', x: 2600, y: 500, value: 250, requiredAction: 'slide', kind: 'medium' },
      { id: 'yy-thruster-slide-2', x: 3400, y: 430, value: 250, requiredAction: 'slide', kind: 'medium' },
      { id: 'yy-thruster-jump-2', x: 4800, y: 335, value: 500, requiredAction: 'jump', kind: 'risky' },
      { id: 'yy-thruster-rafters', x: 5260, y: 275, value: 500, requiredAction: 'jump', kind: 'risky' },
      { id: 'yy-thruster-power-1', x: 6200, y: 430, value: 500, requiredAction: 'power', kind: 'risky' }
    ],
    bakingStations: []
  },
  {
    id: 'frosting-factory',
    index: 1,
    title: 'Frosting Factory Bake-Off',
    subtitle: 'Knight Jump over frosting, mixers, and cupcake towers.',
    theme: 'A bakery-show course with frosting slides and ingredient stations.',
    mathCategories: ['multiplyDivide'],
    powerup: 'knight',
    targetTimeMs: 105000,
    targetScore: 7600,
    trackLength: 6600,
    gatePositions: [1500, 3600, 5400],
    platforms: [
      { id: 'ff-platform-1', x: 1120, y: 475, width: 380, label: 'Sugar Step' },
      { id: 'ff-platform-2', x: 1560, y: 420, width: 390, label: 'Gate Gantry' },
      { id: 'ff-platform-3', x: 2060, y: 452, width: 420, label: 'Cupcake Step-Up' },
      { id: 'ff-platform-4', x: 2580, y: 390, width: 440, label: 'Cupcake Balcony' },
      { id: 'ff-platform-5', x: 3500, y: 470, width: 380, label: 'Mixer Step' },
      { id: 'ff-platform-6', x: 3920, y: 405, width: 500, label: 'Mixer Mezzanine' },
      { id: 'ff-platform-7', x: 4380, y: 345, width: 420, label: 'Donut Rail' },
      { id: 'ff-platform-8', x: 5780, y: 430, width: 470, label: 'Cake Top Route' },
      { id: 'ff-platform-9', x: 6200, y: 365, width: 430, label: 'Final Frosting Rise' }
    ],
    palette: {
      skyTop: 0xffd6e7,
      skyBottom: 0xfff4c7,
      ground: 0xd56b6b,
      accent: 0x27b6a5,
      secondary: 0x6f64d9
    },
    obstacles: [
      { id: 'ff-pit-1', kind: 'frostingPit', x: 760, label: 'Frosting Slick' },
      { id: 'ff-hurdle-1', kind: 'hurdle', x: 2250, label: 'Cupcake Stack' },
      { id: 'ff-low-1', kind: 'lowBarrier', x: 3000, label: 'Mixer Arm' },
      { id: 'ff-swing-1', kind: 'swing', x: 4400, label: 'Rolling Pin' },
      { id: 'ff-wall-1', kind: 'cakeWall', x: 6300, label: 'Layer Cake Wall' }
    ],
    pointThrusters: [
      { id: 'ff-thruster-jump-1', x: 760, y: 410, value: 250, requiredAction: 'jump', kind: 'medium' },
      { id: 'ff-thruster-step-1', x: 1120, y: 405, value: 250, requiredAction: 'jump', kind: 'medium' },
      { id: 'ff-thruster-gate-1', x: 1560, y: 346, value: 250, requiredAction: 'jump', kind: 'medium' },
      { id: 'ff-thruster-jump-2', x: 2060, y: 375, value: 500, requiredAction: 'jump', kind: 'risky' },
      { id: 'ff-thruster-balcony-1', x: 2580, y: 315, value: 500, requiredAction: 'jump', kind: 'risky' },
      { id: 'ff-thruster-slide-1', x: 3000, y: 500, value: 250, requiredAction: 'slide', kind: 'medium' },
      { id: 'ff-thruster-high-1', x: 3920, y: 330, value: 500, requiredAction: 'jump', kind: 'risky' },
      { id: 'ff-thruster-rail-1', x: 4380, y: 272, value: 500, requiredAction: 'jump', kind: 'risky' },
      { id: 'ff-thruster-slide-2', x: 4400, y: 430, value: 250, requiredAction: 'slide', kind: 'medium' },
      { id: 'ff-thruster-power-1', x: 5780, y: 355, value: 500, requiredAction: 'power', kind: 'risky' }
    ],
    bakingStations: [
      {
        id: 'ff-bake-1',
        x: 2580,
        label: 'Cupcake Match',
        recipe: ['frosting', 'sprinkles', 'candle'],
        value: 500,
        perfectBonus: 250
      },
      {
        id: 'ff-bake-2',
        x: 5180,
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
    subtitle: 'Bishop Leap and Queen Shield to crown the birthday champion.',
    theme: 'A final tower course with candles, fractions, and confetti cannons.',
    mathCategories: ['compareFraction'],
    powerup: 'queen',
    bonusPowerup: 'bishop',
    targetTimeMs: 120000,
    targetScore: 8500,
    trackLength: 7200,
    gatePositions: [1500, 3400, 5300, 6500],
    platforms: [
      { id: 'bt-platform-1', x: 900, y: 470, width: 360, label: 'Candle Step' },
      { id: 'bt-platform-2', x: 1300, y: 415, width: 380, label: 'Fraction Perch' },
      { id: 'bt-platform-3', x: 1700, y: 360, width: 360, label: 'Gate Catwalk' },
      { id: 'bt-platform-4', x: 3000, y: 470, width: 380, label: 'Banner Step' },
      { id: 'bt-platform-5', x: 3400, y: 410, width: 420, label: 'Middle Gate Ledge' },
      { id: 'bt-platform-6', x: 4860, y: 472, width: 360, label: 'Tower Step 1' },
      { id: 'bt-platform-7', x: 5300, y: 410, width: 360, label: 'Tower Step 2' },
      { id: 'bt-platform-8', x: 5740, y: 348, width: 360, label: 'Tower Step 3' },
      { id: 'bt-platform-9', x: 6180, y: 300, width: 360, label: 'Tower Step 4' },
      { id: 'bt-platform-10', x: 6500, y: 360, width: 520, label: 'Summit Score Lane' }
    ],
    palette: {
      skyTop: 0x8fd6ff,
      skyBottom: 0xffefd1,
      ground: 0x5f8f3f,
      accent: 0xffd23f,
      secondary: 0xf05f73
    },
    obstacles: [
      { id: 'bt-hurdle-1', kind: 'hurdle', x: 680, label: 'Candle Hop' },
      { id: 'bt-low-1', kind: 'lowBarrier', x: 2350, label: 'Banner Crawl' },
      { id: 'bt-pit-1', kind: 'frostingPit', x: 4250, label: 'Sprinkle Slick' },
      { id: 'bt-swing-1', kind: 'swing', x: 5900, label: 'Confetti Sweeper' },
      { id: 'bt-wall-1', kind: 'cakeWall', x: 7050, label: 'Crown Cake' }
    ],
    pointThrusters: [
      { id: 'bt-thruster-jump-1', x: 680, y: 390, value: 250, requiredAction: 'jump', kind: 'medium' },
      { id: 'bt-thruster-step-1', x: 900, y: 398, value: 250, requiredAction: 'jump', kind: 'medium' },
      { id: 'bt-thruster-perch-1', x: 1300, y: 340, value: 500, requiredAction: 'jump', kind: 'risky' },
      { id: 'bt-thruster-catwalk-1', x: 1700, y: 285, value: 500, requiredAction: 'jump', kind: 'risky' },
      { id: 'bt-thruster-slide-1', x: 2350, y: 500, value: 250, requiredAction: 'slide', kind: 'medium' },
      { id: 'bt-thruster-middle-1', x: 3400, y: 335, value: 500, requiredAction: 'jump', kind: 'risky' },
      { id: 'bt-thruster-jump-2', x: 4250, y: 390, value: 500, requiredAction: 'jump', kind: 'risky' },
      { id: 'bt-thruster-tower-1', x: 4860, y: 405, value: 500, requiredAction: 'jump', kind: 'risky' },
      { id: 'bt-thruster-tower-2', x: 5300, y: 335, value: 500, requiredAction: 'jump', kind: 'risky' },
      { id: 'bt-thruster-tower-3', x: 5740, y: 272, value: 750, requiredAction: 'jump', kind: 'risky' },
      { id: 'bt-thruster-tower-4', x: 6180, y: 224, value: 750, requiredAction: 'jump', kind: 'risky' },
      { id: 'bt-thruster-slide-2', x: 5900, y: 420, value: 500, requiredAction: 'slide', kind: 'risky' },
      { id: 'bt-thruster-power-1', x: 6500, y: 286, value: 750, requiredAction: 'power', kind: 'risky' },
      { id: 'bt-thruster-summit', x: 7050, y: 420, value: 750, requiredAction: 'power', kind: 'risky' }
    ],
    bakingStations: []
  }
];
