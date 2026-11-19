// Missions and the story: a chain of five jobs from config.js. Each step is an objective the
// player completes by reaching a place, stealing a car, surviving the heat, beating a timer, or
// clearing guards. Completing a mission pays out and unlocks the next; finishing all five opens
// free roam with the crew's respect — and a cash bonus.
import { MISSIONS } from './config.js';
import { distance } from './random.js';

export const MISSION_RADIUS = 70;

export function createMissions(onEvent) {
  let index = 0;
  let stepIndex = 0;
  let timer = 0;
  let done = false;
  let guardsLeft = 0;
  let message = '';
  let messageIn = 0;

  function current() {
    return index < MISSIONS.length ? MISSIONS[index] : null;
  }
  function step() {
    const mission = current();
    return mission ? mission.steps[stepIndex] : null;
  }

  function startStep() {
    const s = step();
    if (!s) return;
    if (s.kind === 'timed' || s.kind === 'heat') timer = s.seconds;
    if (s.kind === 'clear') guardsLeft = s.guards;
    showMessage(s.text);
  }

  function showMessage(text) {
    message = text;
    messageIn = 4;
  }

  function begin() {
    index = 0;
    stepIndex = 0;
    done = false;
    startStep();
    onEvent({ type: 'mission-start', mission: current() });
  }

  function load(indexValue, stepValue) {
    index = Math.min(indexValue, MISSIONS.length);
    stepIndex = stepValue;
    done = index >= MISSIONS.length;
    if (!done) startStep();
  }

  function advance() {
    const mission = current();
    if (!mission) return;
    stepIndex += 1;
    if (stepIndex >= mission.steps.length) {
      onEvent({ type: 'mission-done', mission, reward: mission.reward });
      index += 1;
      stepIndex = 0;
      if (index >= MISSIONS.length) {
        done = true;
        showMessage('All jobs done — Solmar City is yours. Free roam!');
        onEvent({ type: 'story-done' });
        return;
      }
      showMessage(`Job complete: ${mission.title} — $${mission.reward}`);
      startStep();
      onEvent({ type: 'mission-start', mission: current() });
    } else {
      startStep();
    }
  }

  function fail(reason) {
    showMessage(reason);
    onEvent({ type: 'mission-failed', reason });
    // A failed job restarts from its first step, not from the beginning of the story.
    stepIndex = 0;
    startStep();
  }

  // Called every frame with the player's state; returns nothing, reports through onEvent.
  function update(dt, player, guards) {
    if (done || !current()) return;
    if (messageIn > 0) messageIn -= dt;
    const s = step();
    if (!s) return;
    if (s.kind === 'timed' || s.kind === 'heat') {
      timer -= dt;
      if (timer <= 0) {
        if (s.kind === 'heat') {
          // Survived the heat: the job is done.
          advance();
          return;
        }
        fail('Too slow — the courier van got away. Try the job again.');
        return;
      }
    }
    if (s.kind === 'goTo' || s.kind === 'driveTo') {
      const arrived = distance(player.x, player.y, s.x, s.y) < MISSION_RADIUS;
      if (arrived) {
        if (s.kind === 'driveTo' && s.needsCar && !player.driving) {
          // At the marker on foot: the package needs a car.
          return;
        }
        advance();
      }
    }
    if (s.kind === 'steal' && player.driving) advance();
    if (s.kind === 'clear') {
      guardsLeft = guards.filter((g) => g.health > 0).length;
      if (guardsLeft <= 0 && guards.length > 0) advance();
    }
  }

  return {
    get index() {
      return index;
    },
    get stepIndex() {
      return stepIndex;
    },
    get done() {
      return done;
    },
    get timer() {
      return timer;
    },
    get guardsLeft() {
      return guardsLeft;
    },
    get message() {
      return message;
    },
    get messageIn() {
      return messageIn;
    },
    current,
    step,
    begin,
    load,
    advance,
    fail,
    showMessage,
    update,
  };
}
