// Saving: the player's money, mission progress and position persist in localStorage, so a
// session can be continued later. Saving never throws: private windows just keep the save for
// this visit only.
import { SAVE_KEY } from './config.js';

export function saveGame(player, missions) {
  try {
    const data = {
      money: Math.round(player.money),
      health: Math.round(player.health),
      missionIndex: missions.index,
      stepIndex: missions.stepIndex,
      x: Math.round(player.x),
      y: Math.round(player.y),
      savedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.money !== 'number' || typeof data.missionIndex !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
}
