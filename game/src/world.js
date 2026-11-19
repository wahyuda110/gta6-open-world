// The city itself: a grid of roads, blocks of buildings, a beach and marina on the south edge,
// parks and plazas. Generation is seeded, so the same seed builds the same Solmar City.
// Buildings are solid rectangles; `collides` and `resolveCircle` keep people and cars out of them.
import { BLOCK, COLORS, DISTRICTS, ROAD, WORLD } from './config.js';
import { clamp } from './random.js';

export function createCity(random) {
  const buildings = [];
  const trees = [];
  const parks = [];
  const roadsV = [];
  const roadsH = [];

  for (let x = ROAD; x < WORLD.width; x += BLOCK) roadsV.push(x);
  for (let y = ROAD; y < WORLD.height; y += BLOCK) roadsH.push(y);

  const roadSetV = new Set(roadsV);
  const roadSetH = new Set(roadsH);
  const isRoadX = (x) => {
    for (const rx of roadsV) if (Math.abs(x - rx) < ROAD / 2 + 4) return true;
    return false;
  };
  const isRoadY = (y) => {
    for (const ry of roadsH) if (Math.abs(y - ry) < ROAD / 2 + 4) return true;
    return false;
  };

  const roofPalette = ['#b0563a', '#8a6f4d', '#5d7a8a', '#7a5d8a', '#a85a6a', '#6a8a5d', '#c98a4b', '#4d6a8a'];
  const wallPalette = ['#d8c9b0', '#c9b8a8', '#b8c4c9', '#e0d0c0', '#c9a8a8', '#a8b8c9'];

  // Blocks: the rectangles between roads. A few become parks or plazas; the rest get buildings.
  for (let bx = 0; bx < 8; bx += 1) {
    for (let by = 0; by < 6; by += 1) {
      const x0 = ROAD + bx * BLOCK + ROAD / 2 + 14;
      const y0 = ROAD + by * BLOCK + ROAD / 2 + 14;
      const w = BLOCK - ROAD - 28;
      const h = BLOCK - ROAD - 28;
      if (x0 + w > WORLD.width || y0 + h > WORLD.height) continue;
      const roll = random.next();
      if (roll < 0.12) {
        parks.push({ x: x0, y: y0, w, h, kind: 'park' });
        for (let i = 0; i < 9; i += 1) {
          trees.push({ x: random.range(x0 + 20, x0 + w - 20), y: random.range(y0 + 20, y0 + h - 20), r: random.range(9, 15) });
        }
        continue;
      }
      if (roll < 0.18) {
        parks.push({ x: x0, y: y0, w, h, kind: 'plaza' });
        continue;
      }
      // One or two buildings per block, with a courtyard gap.
      const split = random.chance(0.5);
      const list = split
        ? [
            { x: x0, y: y0, w: w * 0.46, h: h * 0.9 },
            { x: x0 + w * 0.54, y: y0 + h * 0.1, w: w * 0.46, h: h * 0.8 },
          ]
        : [{ x: x0 + w * 0.08, y: y0 + h * 0.1, w: w * 0.84, h: h * 0.8 }];
      for (const b of list) {
        const tall = random.chance(0.3);
        buildings.push({
          x: b.x,
          y: b.y,
          w: b.w,
          h: b.h,
          roof: random.pick(roofPalette),
          wall: random.pick(wallPalette),
          height: tall ? random.int(3, 6) : random.int(1, 2),
          windows: random.int(2, 5),
        });
      }
      for (let i = 0; i < 3; i += 1) {
        trees.push({ x: random.range(x0, x0 + w), y: random.range(y0, y0 + h), r: random.range(7, 11) });
      }
    }
  }

  // The beach strip along the south edge, and the water beyond it.
  const beach = { x: 0, y: WORLD.height - 150, w: WORLD.width, h: 150 };
  const water = { x: 0, y: WORLD.height - 70, w: WORLD.width, h: 70 };

  // Landmark buildings with fixed spots, used by missions and the map.
  const landmarks = [
    { name: 'Garage', x: 1520, y: 1140, w: 90, h: 70 },
    { name: 'Marina Kiosk', x: 380, y: 940, w: 80, h: 60 },
    { name: 'Safehouse', x: 2640, y: 380, w: 90, h: 70 },
    { name: 'Hideout', x: 2960, y: 2180, w: 90, h: 70 },
    { name: 'Old Warehouse', x: 2860, y: 2060, w: 110, h: 90 },
  ];

  function collides(x, y, radius) {
    if (x < radius || y < radius || x > WORLD.width - radius || y > WORLD.height - radius) return true;
    if (y > water.y + 6) return true; // the sea is not walkable
    for (const b of buildings) {
      if (x + radius > b.x && x - radius < b.x + b.w && y + radius > b.y && y - radius < b.y + b.h) return true;
    }
    for (const l of landmarks) {
      if (x + radius > l.x && x - radius < l.x + l.w && y + radius > l.y && y - radius < l.y + l.h) return true;
    }
    return false;
  }

  // Push a circle out of whatever it overlaps; returns true when it was pushed.
  function resolveCircle(body) {
    let pushed = false;
    body.x = clamp(body.x, body.r, WORLD.width - body.r);
    body.y = clamp(body.y, body.r, WORLD.height - body.r);
    if (body.y + body.r > water.y + 6) {
      body.y = water.y + 6 - body.r;
      pushed = true;
    }
    const all = buildings.concat(landmarks);
    for (const b of all) {
      const cx = clamp(body.x, b.x, b.x + b.w);
      const cy = clamp(body.y, b.y, b.y + b.h);
      const dx = body.x - cx;
      const dy = body.y - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 < body.r * body.r) {
        const d = Math.sqrt(d2) || 0.001;
        body.x = cx + (dx / d) * body.r;
        body.y = cy + (dy / d) * body.r;
        pushed = true;
      }
    }
    return pushed;
  }

  // A point on a road near (x, y): used to spawn cars and police on the street, not inside a block.
  function nearestRoadPoint(x, y) {
    let bestX = roadsV[0];
    let best = Infinity;
    for (const rx of roadsV) {
      const d = Math.abs(rx - x);
      if (d < best) {
        best = d;
        bestX = rx;
      }
    }
    let bestY = roadsH[0];
    best = Infinity;
    for (const ry of roadsH) {
      const d = Math.abs(ry - y);
      if (d < best) {
        best = d;
        bestY = ry;
      }
    }
    return { x: bestX, y: bestY };
  }

  function randomRoadPoint() {
    const vertical = random.chance(0.5);
    if (vertical) {
      return { x: random.pick(roadsV), y: random.range(ROAD, WORLD.height - 200), along: 'v' };
    }
    return { x: random.range(ROAD, WORLD.width - ROAD), y: random.pick(roadsH), along: 'h' };
  }

  return {
    buildings,
    trees,
    parks,
    roadsV,
    roadsH,
    beach,
    water,
    landmarks,
    districts: DISTRICTS,
    roadSetV,
    roadSetH,
    isRoadX,
    isRoadY,
    collides,
    resolveCircle,
    nearestRoadPoint,
    randomRoadPoint,
  };
}

// The next waypoint on the road grid from (fx, fy) toward (tx, ty): first along the nearest
// horizontal road to the target's column road, then straight down that column to the target.
// Keeps drivers on streets instead of cutting across city blocks.
export function roadWaypoint(city, fx, fy, tx, ty) {
  const nearestRoad = (roads, v) => roads.reduce((best, r) => (Math.abs(r - v) < Math.abs(best - v) ? r : best), roads[0]);
  const rx = nearestRoad(city.roadsV, tx);
  if (Math.abs(fx - rx) < 46) return { x: rx, y: ty };
  return { x: rx, y: nearestRoad(city.roadsH, fy) };
}

// A point is on a sidewalk when it is just off a road (within the road's shoulder band).
export function onSidewalk(city, x, y) {
  const nearV = city.roadsV.some((rx) => Math.abs(x - rx) > ROAD / 2 && Math.abs(x - rx) < ROAD / 2 + 26);
  const nearH = city.roadsH.some((ry) => Math.abs(y - ry) > ROAD / 2 && Math.abs(y - ry) < ROAD / 2 + 26);
  return nearV || nearH;
}
