// Traffic and pedestrians: cars drive along the road grid, stop for the car ahead, and
// pedestrians stroll the sidewalks and cross at corners. Cars are stealable — the player module
// claims one — and traffic keeps the city alive around the player.
import { CAR, CAR_COLORS, CAR_NAMES } from './config.js';
import { clamp, distance } from './random.js';

export function createTraffic(city, random, count) {
  const cars = [];
  const peds = [];
  let nextId = 1;

  function spawnCar(at) {
    const point = at ?? city.randomRoadPoint();
    const along = point.along ?? (Math.abs(point.x - city.roadsV[0]) < 1 ? 'v' : 'h');
    const dir = random.chance(0.5) ? 1 : -1;
    const color = random.pick(CAR_COLORS);
    return {
      id: nextId,
      kind: 'traffic',
      name: random.pick(CAR_NAMES),
      color,
      x: point.x + (along === 'v' ? (dir > 0 ? 18 : -18) : 0),
      y: point.y + (along === 'h' ? (dir > 0 ? 18 : -18) : 0),
      angle: along === 'v' ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : dir > 0 ? 0 : Math.PI,
      speed: random.range(90, 150),
      cruise: random.range(90, 150),
      along,
      dir,
      health: 100,
      stolen: false,
      driver: true,
      stopped: 0,
    };
  }

  function spawnPed() {
    const point = city.randomRoadPoint();
    const angle = random.range(0, Math.PI * 2);
    return {
      id: nextId,
      kind: 'ped',
      x: clamp(point.x + random.range(-60, 60), 30, 3360),
      y: clamp(point.y + random.range(-60, 60), 30, 2400),
      angle,
      speed: random.range(28, 52),
      color: random.pick(['#e8e8e8', '#d94f3d', '#3d7ad9', '#e8b93c', '#7ac74f', '#c95fb0', '#4fb8a8']),
      panic: 0,
      changeIn: random.range(1, 4),
    };
  }

  for (let i = 0; i < count; i += 1) cars.push(spawnCar());
  for (let i = 0; i < 42; i += 1) peds.push(spawnPed());

  function carAhead(car) {
    let best = Infinity;
    for (const other of cars) {
      if (other === car || other.stolen) continue;
      const dx = other.x - car.x;
      const dy = other.y - car.y;
      const forward = dx * Math.cos(car.angle) + dy * Math.sin(car.angle);
      const lateral = Math.abs(-dx * Math.sin(car.angle) + dy * Math.cos(car.angle));
      if (forward > 0 && forward < best && lateral < 30) best = forward;
    }
    return best;
  }

  function update(dt, player, policeCars) {
    // Traffic cars: follow their road, slow for the car ahead, turn at the city edge.
    for (const car of cars) {
      if (car.stolen) continue;
      const gap = carAhead(car);
      const target = gap < 70 ? 0 : car.cruise;
      car.speed += clamp(target - car.speed, -260 * dt, 180 * dt);
      const nx = car.x + Math.cos(car.angle) * car.speed * dt;
      const ny = car.y + Math.sin(car.angle) * car.speed * dt;
      // Turn around at the city edge instead of driving into the sea or out of town.
      if (nx < 60 || nx > 3340 || ny < 60 || ny > 2400) {
        car.angle += Math.PI;
        car.dir *= -1;
      } else {
        car.x = nx;
        car.y = ny;
      }
      // A hard nudge when a police car or the player rams them: they swerve a little.
      for (const pc of policeCars) {
        if (distance(car.x, car.y, pc.x, pc.y) < 46) {
          car.x += (car.x - pc.x) * 0.05;
          car.y += (car.y - pc.y) * 0.05;
        }
      }
    }

    // Pedestrians: wander, change direction now and then, flee from nearby gunfire or a speeding car.
    for (const ped of peds) {
      ped.changeIn -= dt;
      if (ped.changeIn <= 0) {
        ped.angle = random.range(0, Math.PI * 2);
        ped.changeIn = random.range(2, 6);
      }
      if (ped.panic > 0) ped.panic -= dt;
      const speed = ped.panic > 0 ? ped.speed * 2.4 : ped.speed;
      const nx = ped.x + Math.cos(ped.angle) * speed * dt;
      const ny = ped.y + Math.sin(ped.angle) * speed * dt;
      if (!city.collides(nx, ny, 10)) {
        ped.x = nx;
        ped.y = ny;
      } else {
        ped.angle += Math.PI / 2;
      }
      if (ped.x < 30 || ped.x > 3370 || ped.y < 30 || ped.y > 2430) ped.angle += Math.PI;
    }
  }

  function nearestCar(x, y, maxDist, includeStolen) {
    let best = null;
    let bestD = maxDist;
    for (const car of cars) {
      if (car.stolen && !includeStolen) continue;
      const d = distance(x, y, car.x, car.y);
      if (d < bestD) {
        bestD = d;
        best = car;
      }
    }
    return best;
  }

  function scarePeds(x, y, radius) {
    for (const ped of peds) {
      if (distance(ped.x, ped.y, x, y) < radius) {
        ped.panic = 2.5;
        ped.angle = Math.atan2(ped.y - y, ped.x - x);
      }
    }
  }

  return {
    cars,
    peds,
    update,
    nearestCar,
    scarePeds,
    spawnCar,
    spawnPed,
    addCar(car) {
      cars.push(car);
    },
  };
}

// A traffic car the player is driving is drawn from the same pool; this helper finds a parked
// car (no driver, engine off) to place near the player at the start of a scene.
export function spawnParkedCar(traffic, city, random, x, y) {
  const point = city.nearestRoadPoint(x, y);
  const car = traffic.spawnCar({ x: point.x + 20, y: point.y, along: 'h' });
  car.driver = false;
  car.speed = 0;
  car.cruise = 0;
  traffic.addCar(car);
  return car;
}
