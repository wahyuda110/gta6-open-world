// Screenshot scenes behind ?shot=start|chase|mission|roam. Each one plays the real game
// forward from a fresh world for a fixed number of steps, steered by a simple autopilot that
// drives toward the mission marker and stays on the roads, so every frame is what a short
// session really looks like — and the same seed always gives the same frame.
import { STEP } from './config.js';
import { roadWaypoint } from './world.js';
import { SCREEN_PLAY, SCREEN_TITLE } from './hud.js';
import { angleDiff, clamp } from './random.js';

// A fake input object the autopilot drives instead of the keyboard.
function autopilotInput(game, target) {
  const player = game.player;
  const held = new Set();
  let mx = 0;
  let my = 0;
  if (player.driving && player.car) {
    const car = player.car;
    // Follow the road grid toward the marker, not a straight line through the blocks.
    const wp = roadWaypoint(game.state.city, car.x, car.y, target.x, target.y);
    const want = Math.atan2(wp.y - car.y, wp.x - car.x);
    const diff = angleDiff(car.angle, want);
    if (Math.abs(diff) > 2.2 && Math.abs(car.speed) < 120) {
      // Three-point turn: reverse while steering the other way, so the car turns around
      // on the road instead of swinging wide into the buildings.
      held.add('down');
      if (diff > 0) held.add('left');
      else held.add('right');
      return {
        mouse: { x: 640, y: 300, down: false, clicked: false },
        isHeld: (a) => held.has(a),
        wasPressed: () => false,
        axis: () => ({ x: (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0), y: (held.has('down') ? 1 : 0) - (held.has('up') ? 1 : 0) }),
        endFrame: () => {},
      };
    }
    if (diff > 0.15) held.add('right');
    if (diff < -0.15) held.add('left');
    held.add('up');
    // Brake only at speed: braking while crawling would stop the car turning at all.
    if (Math.abs(diff) > 1.2 && Math.abs(car.speed) > 150) held.add('brake');
  } else {
    // On foot, follow the road grid toward the marker like a pedestrian would.
    const wp = roadWaypoint(game.state.city, player.x, player.y, target.x, target.y);
    const want = Math.atan2(wp.y - player.y, wp.x - player.x);
    const dx = Math.cos(want);
    const dy = Math.sin(want);
    if (dx > 0.3) held.add('right');
    if (dx < -0.3) held.add('left');
    if (dy > 0.3) held.add('down');
    if (dy < -0.3) held.add('up');
    mx = dx;
    my = dy;
  }
  return {
    mouse: { x: 640, y: 300, down: false, clicked: false },
    isHeld: (a) => held.has(a),
    wasPressed: () => false,
    axis: () => ({ x: (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0), y: (held.has('down') ? 1 : 0) - (held.has('up') ? 1 : 0) }),
    endFrame: () => {},
  };
}

function driveSteps(game, seconds, target) {
  for (let i = 0; i < seconds / STEP; i += 1) {
    game.update(STEP, autopilotInput(game, target));
  }
}

export function stageShot(name, game) {
  game.reset();
  const state = game.state;
  if (name === 'start') {
    // Title screen over a living city: traffic rolling past the garage.
    game.player.x = 1456;
    game.player.y = 1456;
    for (let i = 0; i < 6 / STEP; i += 1) game.update(STEP, autopilotInput(game, { x: 1560, y: 1300 }));
    return { screen: SCREEN_TITLE, best: null };
  }
  if (name === 'chase') {
    // A three-star police chase: Mara in a stolen car, interceptors behind, hideout on the map.
    game.missions.load(2, 0);
    const car = game.spawnPlayerCar(2300, 1420);
    game.enterPlayerCar(car);
    game.police.setWanted(3);
    game.police.spawnPoliceCar(game.player);
    game.police.spawnPoliceCar(game.player);
    driveSteps(game, 6, { x: 3000, y: 2220 });
    return { screen: SCREEN_PLAY, best: null };
  }
  if (name === 'mission') {
    // The Vault Run: a timed delivery across town, courier van ahead, wanted heat rising.
    game.missions.load(3, 0);
    const car = game.spawnPlayerCar(1500, 1420);
    game.enterPlayerCar(car);
    game.police.setWanted(2);
    game.police.spawnPoliceCar(game.player);
    driveSteps(game, 11, { x: 900, y: 2100 });
    return { screen: SCREEN_PLAY, best: null };
  }
  // roam: on foot at the marina, traffic and pedestrians around, first job on the HUD.
  game.missions.load(0, 0);
  game.player.x = 436;
  game.player.y = 1116;
  game.player.money = 120;
  for (let i = 0; i < 4 / STEP; i += 1) {
    game.update(STEP, autopilotInput(game, { x: 420, y: 980 }));
  }
  return { screen: SCREEN_PLAY, best: null };
}
