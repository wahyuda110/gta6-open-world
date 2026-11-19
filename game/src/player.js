// The player: Mara Voss on foot and behind the wheel. On foot she walks, sprints and aims with
// the mouse; in a car the same keys drive it, with arcade steering, braking and a handbrake
// drift. Stealing an occupied car is a crime the police module hears about through the callback.
import { CAR, PLAYER } from './config.js';
import { angleDiff, clamp, distance } from './random.js';

export function createPlayer(city, x, y) {
  const player = {
    x,
    y,
    angle: -Math.PI / 2,
    aimAngle: -Math.PI / 2,
    health: PLAYER.maxHealth,
    money: 0,
    driving: false,
    car: null,
    speed: 0,
    walkBob: 0,
    moving: false,
    skid: 0,
    wantedCooldown: 0,
  };

  function updateOnFoot(dt, input, audio) {
    const axis = input.axis();
    const sprint = input.isHeld('sprint');
    const speed = sprint ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
    const len = Math.hypot(axis.x, axis.y) || 1;
    const vx = (axis.x / len) * speed * (axis.x || axis.y ? 1 : 0);
    const vy = (axis.y / len) * speed * (axis.x || axis.y ? 1 : 0);
    player.moving = axis.x !== 0 || axis.y !== 0;
    if (player.moving) {
      player.walkBob += dt * (sprint ? 14 : 10);
      const nx = player.x + vx * dt;
      const ny = player.y + vy * dt;
      if (!city.collides(nx, player.y, PLAYER.radius)) player.x = nx;
      if (!city.collides(player.x, ny, PLAYER.radius)) player.y = ny;
      // Push out of any building the player is already touching (a bad spawn or a shove).
      player.r = PLAYER.radius;
      city.resolveCircle(player);
      player.angle = Math.atan2(vy, vx);
    }
    player.speed = player.moving ? speed : 0;
    if (audio) audio.setEngine(0, false);
  }

  function updateDriving(dt, input, audio) {
    const car = player.car;
    if (!car) {
      player.driving = false;
      return;
    }
    const axis = input.axis();
    const throttle = axis.y < 0 ? 1 : axis.y > 0 ? -0.6 : 0;
    const braking = input.isHeld('brake');
    if (throttle > 0) car.speed += CAR.accel * dt;
    else if (throttle < 0) car.speed -= CAR.accel * 0.7 * dt;
    else car.speed -= Math.sign(car.speed) * 140 * dt;
    if (braking) {
      car.speed -= Math.sign(car.speed) * CAR.brake * dt;
      player.skid = Math.abs(car.speed) > 120 ? 1 : 0;
    } else {
      player.skid = 0;
    }
    car.speed = clamp(car.speed, -CAR.reverseSpeed, CAR.maxSpeed);
    if (Math.abs(car.speed) < 4 && throttle === 0) car.speed = 0;
    const steer = axis.x * CAR.turnRate * clamp(Math.abs(car.speed) / 160, 0.35, 1);
    car.angle += steer * dt * Math.sign(car.speed || 1);
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    // Slide along walls instead of stopping dead: try the full step, then each axis alone.
    if (!city.collides(nx, ny, 24)) {
      car.x = nx;
      car.y = ny;
    } else if (!city.collides(nx, car.y, 24)) {
      car.x = nx;
      if (Math.abs(car.speed) > 200) {
        car.health -= 4;
        if (audio) audio.crash();
      }
      car.speed *= 0.7;
    } else if (!city.collides(car.x, ny, 24)) {
      car.y = ny;
      if (Math.abs(car.speed) > 200) {
        car.health -= 4;
        if (audio) audio.crash();
      }
      car.speed *= 0.7;
    } else {
      // A crash: stop dead, damage the car, shake the camera through the callback's sound.
      if (Math.abs(car.speed) > 200) {
        car.health -= 6;
        if (audio) audio.crash();
      }
      car.speed *= -0.25;
    }
    player.x = car.x;
    player.y = car.y;
    player.angle = car.angle;
    player.speed = Math.abs(car.speed);
    player.moving = Math.abs(car.speed) > 10;
    if (car.health <= 0) {
      // The car is wrecked: smoke, the player climbs out on foot.
      car.speed = 0;
      exitCar();
    }
    if (audio) audio.setEngine(Math.abs(car.speed) / CAR.maxSpeed, true);
  }

  function enterCar(car, onSteal) {
    if (!car) return false;
    const wasOccupied = car.driver;
    car.stolen = true;
    car.driver = true;
    player.car = car;
    player.driving = true;
    player.x = car.x;
    player.y = car.y;
    if (wasOccupied && onSteal) onSteal(car);
    return true;
  }

  function exitCar() {
    if (!player.car) return;
    const car = player.car;
    const side = car.angle + Math.PI / 2;
    player.x = car.x + Math.cos(side) * 40;
    player.y = car.y + Math.sin(side) * 40;
    if (city.collides(player.x, player.y, PLAYER.radius)) {
      player.x = car.x - Math.cos(side) * 40;
      player.y = car.y - Math.sin(side) * 40;
    }
    player.car = null;
    player.driving = false;
    player.speed = 0;
  }

  function update(dt, input, audio, onSteal) {
    if (player.wantedCooldown > 0) player.wantedCooldown -= dt;
    if (player.health < PLAYER.maxHealth) player.health = Math.min(PLAYER.maxHealth, player.health + 1.2 * dt);
    if (player.driving) updateDriving(dt, input, audio);
    else updateOnFoot(dt, input, audio);
    // E near a car: get in (or out, when already driving).
    if (input.wasPressed('enter')) {
      if (player.driving) exitCar();
      else {
        // Find the nearest car in reach; occupied cars are a crime, parked ones are free.
        return { tryEnter: true };
      }
    }
    return null;
  }

  return { player, enterCar, exitCar, update };
}

// The nearest car to the player within reach, for the E key.
export function nearestEnterable(traffic, police, x, y) {
  let best = traffic.nearestCar(x, y, 64, false);
  let bestD = best ? distance(x, y, best.x, best.y) : Infinity;
  for (const car of police.cars) {
    const d = distance(x, y, car.x, car.y);
    if (d < bestD && d < 64) {
      best = car;
      bestD = d;
    }
  }
  return best;
}
