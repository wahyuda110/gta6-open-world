// The wanted system: a 0–5 star level, police cars that spawn at the city edge and chase the
// player, and foot officers who close in when the player is on foot. Crimes raise the level;
// staying unseen lets it decay. At 3+ stars officers shoot.
import { WANTED_DECAY_SECONDS, WANTED_MAX } from './config.js';
import { roadWaypoint } from './world.js';
import { angleDiff, clamp, distance } from './random.js';

export function createPolice(city, random) {
  const cars = [];
  const officers = [];
  let wanted = 0;
  let unseenFor = 0;
  let sirenIn = 0;
  let nextId = 1;

  function wantedCars() {
    return wanted <= 0 ? 0 : wanted <= 1 ? 1 : wanted <= 2 ? 2 : wanted <= 3 ? 3 : 4;
  }

  function spawnPoliceCar(player) {
    const edge = city.randomRoadPoint();
    const car = {
      id: nextId,
      kind: 'police',
      name: 'Interceptor',
      color: '#1c2733',
      x: edge.x,
      y: edge.y,
      angle: Math.atan2(player.y - edge.y, player.x - edge.x),
      speed: 0,
      cruise: 300,
      health: 100,
      siren: random.next() * Math.PI * 2,
    };
    cars.push(car);
    return car;
  }

  function spawnOfficer(player) {
    const angle = random.range(0, Math.PI * 2);
    const officer = {
      id: nextId,
      kind: 'officer',
      x: clamp(player.x + Math.cos(angle) * 420, 40, 3360),
      y: clamp(player.y + Math.sin(angle) * 420, 40, 2400),
      angle,
      speed: 120,
      health: 60,
      shootIn: random.range(0.6, 1.4),
    };
    officers.push(officer);
    return officer;
  }

  function addWanted(amount) {
    const before = wanted;
    wanted = clamp(wanted + amount, 0, WANTED_MAX);
    unseenFor = 0;
    return wanted > before;
  }

  function setWanted(level) {
    wanted = clamp(level, 0, WANTED_MAX);
    unseenFor = 0;
  }

  function update(dt, player, audio, onBusted) {
    // Keep the right number of police cars on the street for the current heat.
    const want = wantedCars();
    while (cars.length < want) spawnPoliceCar(player);
    while (cars.length > want) cars.pop();
    const wantOfficers = wanted >= 2 && !player.driving ? 2 : wanted >= 4 && !player.driving ? 3 : 0;
    while (officers.length < wantOfficers) spawnOfficer(player);
    while (officers.length > wantOfficers) officers.pop();

    let seen = false;
    for (const car of cars) {
      const d = distance(car.x, car.y, player.x, player.y);
      if (d < 700) seen = true;
      // Chase along the roads: steer toward the next road-grid waypoint to the player,
      // ram at close range, ease off when far behind.
      const wp = roadWaypoint(city, car.x, car.y, player.x, player.y);
      const target = Math.atan2(wp.y - car.y, wp.x - car.x);
      car.angle += clamp(angleDiff(car.angle, target), -2.4 * dt, 2.4 * dt);
      const targetSpeed = d > 900 ? 340 : 300 + wanted * 12;
      car.speed += clamp(targetSpeed - car.speed, -500 * dt, 320 * dt);
      // Slide along walls like the player's car does, instead of spinning in place.
      const nx = car.x + Math.cos(car.angle) * car.speed * dt;
      const ny = car.y + Math.sin(car.angle) * car.speed * dt;
      if (!city.collides(nx, ny, 22)) {
        car.x = nx;
        car.y = ny;
      } else if (!city.collides(nx, car.y, 22)) {
        car.x = nx;
        car.speed *= 0.7;
      } else if (!city.collides(car.x, ny, 22)) {
        car.y = ny;
        car.speed *= 0.7;
      } else {
        car.speed *= 0.5;
      }
      car.siren += dt * 6;
      // Ram: damage the player (or their car) on contact, then fall back for a moment
      // instead of grinding against them every frame.
      if (car.ramIn > 0) car.ramIn -= dt;
      if (d < 44 && (car.ramIn ?? 0) <= 0) {
        car.ramIn = 1.5;
        if (player.driving && player.car) {
          player.car.health -= 8;
        } else {
          player.health -= 18;
        }
      }
      // A police car wedged in a block corner never gets out on its own: after a short
      // stuck spell it is replaced by a fresh unit on a road near the player, as the
      // harbour police would send reinforcements.
      if (car.speed < 40) car.stuckIn = (car.stuckIn ?? 0) + dt;
      else car.stuckIn = 0;
      if ((car.stuckIn ?? 0) > 1.5) {
        const spot = city.randomRoadPoint();
        car.x = spot.x;
        car.y = spot.y;
        car.speed = 120;
        car.stuckIn = 0;
      }
    }

    for (const officer of officers) {
      const d = distance(officer.x, officer.y, player.x, player.y);
      if (d < 700) seen = true;
      const target = Math.atan2(player.y - officer.y, player.x - officer.x);
      officer.angle = target;
      const speed = d > 26 ? officer.speed : 0;
      const nx = officer.x + Math.cos(target) * speed * dt;
      const ny = officer.y + Math.sin(target) * speed * dt;
      if (!city.collides(nx, ny, 12)) {
        officer.x = nx;
        officer.y = ny;
      }
      officer.shootIn -= dt;
      if (wanted >= 3 && officer.shootIn <= 0 && d < 420 && !player.driving) {
        officer.shootIn = random.range(0.9, 1.6);
        player.health -= 8;
        if (audio) audio.shoot();
      }
      // A foot officer who catches the player holds them: busted.
      if (d < 24 && !player.driving) {
        onBusted();
      }
    }

    if (wanted > 0) {
      if (seen) {
        unseenFor = 0;
      } else {
        unseenFor += dt;
        if (unseenFor > WANTED_DECAY_SECONDS) {
          wanted -= 1;
          unseenFor = 0;
        }
      }
      sirenIn -= dt;
      if (sirenIn <= 0 && seen) {
        sirenIn = 4;
        if (audio) audio.siren();
      }
    }
  }

  return {
    cars,
    officers,
    get wanted() {
      return wanted;
    },
    addWanted,
    setWanted,
    update,
    spawnPoliceCar,
    spawnOfficer,
  };
}
