// Shared constants for Solmar City: world size, colours, tuning and the story's mission list.
// Nothing here names any real place, person or commercial game: the city, its districts and its
// people are invented for this game.
export const WORLD = { width: 3400, height: 2600 };
export const ROAD = 96; // road width, in world pixels
export const BLOCK = 340; // city block pitch (road + block)
export const STEP = 1 / 60;
export const SAVE_KEY = 'solmar-save-v1';

export const COLORS = {
  grass: '#7fae62',
  park: '#6da356',
  sand: '#e8d29a',
  water: '#2e7fa8',
  waterDeep: '#1f5f84',
  road: '#3a3f4a',
  roadLine: '#d8c95a',
  sidewalk: '#9aa0a8',
  buildingRoof: '#b0563a',
  plaza: '#8d8578',
};

export const DISTRICTS = [
  { name: 'Old Harbour', x: 0, y: 1900, w: 1100, h: 700, tint: '#c98a4b' },
  { name: 'Downtown', x: 1100, y: 800, w: 1200, h: 1100, tint: '#7a86c9' },
  { name: 'Northgate', x: 2300, y: 0, w: 1100, h: 800, tint: '#6fb08a' },
  { name: 'Marina Bay', x: 0, y: 800, w: 1100, h: 1100, tint: '#4fa8b8' },
  { name: 'Sunset Hills', x: 2300, y: 800, w: 1100, h: 1100, tint: '#c97a9a' },
  { name: 'East Docks', x: 2300, y: 1900, w: 1100, h: 700, tint: '#8a7a5a' },
];

// The story: Mara Voss, a courier driver who owes the harbour crew. Each mission is one entry
// in this list; the mission module turns it into objectives at run time.
export const MISSIONS = [
  {
    id: 'first-wheels',
    title: 'First Wheels',
    brief: 'The crew needs a driver. Steal any car and bring it to the garage on Crane Street.',
    reward: 250,
    steps: [
      { kind: 'steal', text: 'Steal a car (walk up to one and press E)' },
      { kind: 'driveTo', text: 'Drive to the garage marker', x: 1560, y: 1180 },
    ],
  },
  {
    id: 'the-pickup',
    title: 'The Pickup',
    brief: 'A package is waiting at the marina kiosk. Fetch it on foot, then drive it to the safehouse.',
    reward: 400,
    steps: [
      { kind: 'goTo', text: 'Walk to the marina kiosk', x: 420, y: 980 },
      { kind: 'driveTo', text: 'Drive the package to the safehouse', x: 2680, y: 420, needsCar: true },
    ],
  },
  {
    id: 'hot-wheels',
    title: 'Hot Wheels',
    brief: 'The harbour police are onto the crew. Lose the heat: reach the hideout without getting busted.',
    reward: 600,
    steps: [
      { kind: 'heat', text: 'Lose the police — reach the hideout marker', x: 3000, y: 2220, seconds: 75 },
    ],
  },
  {
    id: 'the-vault-run',
    title: 'The Vault Run',
    brief: 'A courier van full of casino chips is crossing town. Intercept it — you have 100 seconds.',
    reward: 900,
    steps: [
      { kind: 'timed', text: 'Reach the courier van before it leaves town', x: 900, y: 2100, seconds: 100 },
    ],
  },
  {
    id: 'king-of-solmar',
    title: 'King of Solmar',
    brief: 'The docks boss sent guards to the old warehouse. Clear them out, take the cash, and bring it home.',
    reward: 1500,
    steps: [
      { kind: 'clear', text: 'Clear the guards at the old warehouse', x: 2900, y: 2100, guards: 3 },
      { kind: 'driveTo', text: 'Bring the cash back to the garage', x: 1560, y: 1180 },
    ],
  },
];

export const PLAYER = {
  walkSpeed: 175,
  sprintSpeed: 265,
  radius: 14,
  maxHealth: 100,
};

export const CAR = {
  accel: 420,
  brake: 700,
  maxSpeed: 560,
  reverseSpeed: 220,
  turnRate: 2.6,
  length: 54,
  width: 26,
};

export const WANTED_MAX = 5;
// Wanted stars decay after this many seconds unseen by any police unit.
export const WANTED_DECAY_SECONDS = 14;

export const CAR_COLORS = ['#d94f3d', '#3d7ad9', '#e8b93c', '#7ac74f', '#e8e8e8', '#2b2b33', '#c95fb0', '#4fb8a8', '#e87a2e'];
export const CAR_NAMES = ['Comet', 'Falcon', 'Dune', 'Vortex', 'Harbour', 'Sunset', 'Ridge', 'Wave', 'Bolt'];
