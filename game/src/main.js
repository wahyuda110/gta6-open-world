// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s steps,
// and the renderer paints what is there. The game moves between title, play, paused, wasted,
// busted and story-complete screens. Saves go to localStorage on mission completion and on pause.
//
// ?seed=N fixes the city and traffic. ?shot=start|chase|mission|roam (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady for a screenshot.
import { CAR, MISSIONS, STEP } from './config.js';
import { createRandom, clamp, distance } from './random.js';
import { createCity } from './world.js';
import { createTraffic, spawnParkedCar } from './traffic.js';
import { createPolice } from './police.js';
import { createMissions } from './missions.js';
import { createCombat, createGuards } from './combat.js';
import { createPlayer, nearestEnterable } from './player.js';
import { createRenderer } from './render.js';
import { createHud, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_WASTED, SCREEN_BUSTED, SCREEN_DONE } from './hud.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { saveGame, loadGame, clearSave } from './save.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const random = createRandom(seed);
const city = createCity(random);
const audio = createAudio();
const renderer = createRenderer(canvas);
const hud = createHud(canvas);

let traffic;
let police;
let missions;
let combat;
let guards = [];
let playerApi;
let player;
let state;
let screen = SCREEN_TITLE;
let save = loadGame();
let saveTimer = 0;
let shootWantedIn = 0;
let stealWantedIn = 0;

function buildWorld() {
  traffic = createTraffic(city, random, 16);
  police = createPolice(city, random);
  combat = createCombat(onCombatHit);
  playerApi = createPlayer(city, 1456, 1456);
  player = playerApi.player;
  guards = [];
  missions = createMissions(onMissionEvent);
  state = {
    city,
    traffic,
    police,
    missions,
    combat,
    guards,
    player,
    time: 0,
    screen: SCREEN_PLAY,
  };
}

function onCombatHit(event) {
  const target = event.target;
  if (target.kind === 'ped') {
    police.addWanted(1);
    audio.wantedUp();
  } else if (target.kind === 'officer') {
    police.addWanted(2);
    audio.wantedUp();
  } else if (target.kind === 'guard' && target.health <= 0) {
    missions.showMessage('Guard down.');
  }
}

function onMissionEvent(event) {
  if (event.type === 'mission-done') {
    player.money += event.reward;
    audio.missionDone();
    saveGame(player, missions);
  } else if (event.type === 'mission-start') {
    const step = missions.step();
    if (step && step.kind === 'heat') {
      police.setWanted(3);
      audio.wantedUp();
    }
    if (step && step.kind === 'clear') {
      guards = createGuards(city, random, step.x, step.y, step.guards);
      state.guards = guards;
    }
    if (step && step.kind === 'timed') {
      const van = spawnParkedCar(traffic, city, random, step.x, step.y);
      van.name = 'Courier Van';
      van.color = '#e8e8e8';
    }
  } else if (event.type === 'story-done') {
    screen = SCREEN_DONE;
    audio.missionDone();
    saveGame(player, missions);
  } else if (event.type === 'mission-failed') {
    audio.busted();
  }
}

function onBusted() {
  if (screen !== SCREEN_PLAY) return;
  screen = SCREEN_BUSTED;
  player.money = Math.max(0, player.money - 150);
  audio.busted();
}

function onWasted() {
  if (screen !== SCREEN_PLAY) return;
  screen = SCREEN_WASTED;
  player.money = Math.max(0, player.money - 100);
  audio.busted();
}

function respawn() {
  if (player.driving) playerApi.exitCar();
  player.x = 1456;
  player.y = 1456;
  player.health = 100;
  police.setWanted(0);
  police.cars.length = 0;
  police.officers.length = 0;
  screen = SCREEN_PLAY;
  saveGame(player, missions);
}

function update(dt, input) {
  state.time += dt;
  if (shootWantedIn > 0) shootWantedIn -= dt;
  if (stealWantedIn > 0) stealWantedIn -= dt;

  // Aim follows the mouse (screen space to world space through the camera).
  const sp = renderer.worldToScreen(player.x, player.y);
  player.aimAngle = Math.atan2(input.mouse.y - sp.y, input.mouse.x - sp.x);

  const result = playerApi.update(dt, input, audio, null);
  if (result && result.tryEnter) {
    const car = nearestEnterable(traffic, police, player.x, player.y);
    if (car) {
      const wasOccupied = car.driver;
      playerApi.enterCar(car, () => {});
      if (wasOccupied && stealWantedIn <= 0) {
        stealWantedIn = 3;
        police.addWanted(1);
        audio.wantedUp();
        missions.showMessage('Car stolen! The harbour police are onto you.');
      } else if (!wasOccupied) {
        missions.showMessage(`In the ${car.name}. Drive!`);
      }
      audio.click();
    }
  }

  // Shooting: click while on foot. Punching: F.
  if (!player.driving && input.mouse.clicked && screen === SCREEN_PLAY) {
    const targets = guards.concat(police.officers, traffic.peds);
    if (combat.shoot(player.x, player.y, player.aimAngle, 'player')) {
      audio.shoot();
      renderer.addShake(3);
      traffic.scarePeds(player.x, player.y, 260);
      if (shootWantedIn <= 0) {
        shootWantedIn = 4;
        police.addWanted(1);
        audio.wantedUp();
      }
    }
  }
  if (!player.driving && input.wasPressed('punch')) {
    const targets = guards.concat(police.officers, traffic.peds);
    if (combat.punch(player, targets)) {
      audio.punch();
      traffic.scarePeds(player.x, player.y, 200);
    }
  }

  // Driving into a pedestrian is a crime — and a mess.
  if (player.driving && player.car) {
    for (let i = traffic.peds.length - 1; i >= 0; i -= 1) {
      const ped = traffic.peds[i];
      if (distance(player.x, player.y, ped.x, ped.y) < 30 && Math.abs(player.car.speed) > 120) {
        traffic.peds.splice(i, 1);
        combat.spawnSparks(ped.x, ped.y, '#ff5a4f', 10);
        audio.crash();
        if (stealWantedIn <= 0) {
          stealWantedIn = 3;
          police.addWanted(1);
          audio.wantedUp();
          missions.showMessage('You hit a pedestrian! Wanted level up.');
        }
        player.car.speed *= 0.6;
      }
    }
    // Bumping traffic cars shoves them aside.
    for (const car of traffic.cars) {
      if (car === player.car || car.stolen) continue;
      if (distance(player.x, player.y, car.x, car.y) < 46) {
        car.x += (car.x - player.x) * 0.06;
        car.y += (car.y - player.y) * 0.06;
        car.speed *= 0.9;
        if (Math.abs(player.car.speed) > 240) {
          player.car.health -= 4;
          audio.crash();
        }
      }
    }
    if (player.car.health < 40 && Math.random() < dt * 2) combat.spawnSmoke(player.car.x, player.car.y);
  }

  traffic.update(dt, player, police.cars);
  police.update(dt, player, audio, onBusted);

  // Guards shoot at the player when the final job is live.
  for (const guard of guards) {
    if (guard.health <= 0) continue;
    const d = distance(guard.x, guard.y, player.x, player.y);
    guard.angle = Math.atan2(player.y - guard.y, player.x - guard.x);
    guard.shootIn -= dt;
    if (d < 380 && guard.shootIn <= 0) {
      guard.shootIn = 1.4 + Math.random() * 0.8;
      combat.shoot(guard.x, guard.y, guard.angle, 'enemy');
      audio.shoot();
    }
  }

  const combatTargets = guards.concat(police.officers, traffic.peds);
  combat.update(dt, city, combatTargets, player);
  missions.update(dt, player, guards);

  if (player.health <= 0) onWasted();

  // Autosave every 15 seconds of play.
  saveTimer += dt;
  if (saveTimer > 15) {
    saveTimer = 0;
    saveGame(player, missions);
  }
}

function render() {
  state.screen = screen;
  renderer.drawWorld(state);
  if (screen === SCREEN_PLAY) hud.drawHud(state);
  else if (screen === SCREEN_TITLE) hud.drawTitle(state, save);
  else if (screen === SCREEN_PAUSED) hud.drawPaused(state);
  else if (screen === SCREEN_WASTED || screen === SCREEN_BUSTED) hud.drawEnd(state, screen === SCREEN_WASTED ? 'wasted' : 'busted');
  else if (screen === SCREEN_DONE) hud.drawDone(state);
  const text = screen === SCREEN_TITLE
    ? 'Solmar City. Press Enter to play.'
    : `Money $${Math.round(player.money)}. Job ${missions.index + 1} of ${MISSIONS.length}. Wanted ${police.wanted} stars. Health ${Math.round(player.health)}.`;
  if (status.textContent !== text) status.textContent = text;
}

function startGame() {
  audio.unlock();
  if (save) {
    player.money = save.money;
    player.health = save.health || 100;
    player.x = save.x || 1560;
    player.y = save.y || 1330;
    missions.load(save.missionIndex, save.stepIndex || 0);
  } else {
    missions.begin();
  }
  screen = SCREEN_PLAY;
  audio.click();
}

buildWorld();

const game = {
  get state() {
    return state;
  },
  get player() {
    return player;
  },
  get missions() {
    return missions;
  },
  get police() {
    return police;
  },
  update,
  reset() {
    buildWorld();
    screen = SCREEN_PLAY;
  },
  spawnPlayerCar(x, y) {
    const car = spawnParkedCar(traffic, city, random, x, y);
    return car;
  },
  enterPlayerCar(car) {
    playerApi.enterCar(car, () => {});
  },
};

function runShot(name) {
  const scene = stageShot(name, game);
  screen = scene.screen;
  let painted = 0;
  function paint() {
    render();
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let last = performance.now();
  let accumulator = 0;

  function frame(now) {
    const elapsed = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    if (input.wasPressed('mute')) {
      const muted = audio.toggleMute();
      missions.showMessage(muted ? 'Sound off' : 'Sound on');
    }
    if (screen === SCREEN_TITLE) {
      if (input.wasPressed('confirm')) startGame();
      accumulator = 0;
    } else if (screen === SCREEN_PLAY) {
      if (input.wasPressed('pause')) {
        screen = SCREEN_PAUSED;
        saveGame(player, missions);
      } else {
        accumulator += elapsed;
        while (accumulator >= STEP) {
          update(STEP, input);
          accumulator -= STEP;
        }
        if (input.wasPressed('confirm')) audio.unlock();
      }
    } else if (screen === SCREEN_PAUSED) {
      if (input.wasPressed('pause') || input.wasPressed('confirm')) screen = SCREEN_PLAY;
      else if (input.wasPressed('restart')) {
        clearSave();
        save = null;
        buildWorld();
        missions.begin();
        screen = SCREEN_PLAY;
      }
    } else if (screen === SCREEN_WASTED || screen === SCREEN_BUSTED) {
      if (input.wasPressed('confirm')) respawn();
    } else if (screen === SCREEN_DONE) {
      if (input.wasPressed('confirm')) screen = SCREEN_PLAY;
    }
    render();
    input.endFrame();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();

// A handle for automated playtesting in a browser console.
window.__game = game;
