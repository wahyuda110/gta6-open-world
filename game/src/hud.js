// The HUD and the menus: money, health, wanted stars, the mission objective, the minimap, the
// speedometer, toasts, and the title / pause / wasted / busted / story-complete screens. All
// drawn on the same canvas, so a screenshot always shows the full interface.
import { WANTED_MAX, WORLD } from './config.js';
import { clamp } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_WASTED = 'wasted';
export const SCREEN_BUSTED = 'busted';
export const SCREEN_DONE = 'done';

export function createHud(canvas) {
  const ctx = canvas.getContext('2d');

  function panel(x, y, w, h) {
    ctx.fillStyle = 'rgba(12,14,20,0.72)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function drawStars(wanted, x, y) {
    for (let i = 0; i < WANTED_MAX; i += 1) {
      ctx.font = '26px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = i < wanted ? '#ffd34f' : 'rgba(255,255,255,0.25)';
      ctx.fillText('★', x + i * 28, y);
    }
  }

  function drawMinimap(state) {
    const size = 190;
    const x0 = canvas.width - size - 16;
    const y0 = canvas.height - size - 16;
    const scale = size / Math.max(WORLD.width, WORLD.height);
    panel(x0 - 8, y0 - 8, size + 16, size + 16);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, y0, size, size);
    ctx.clip();
    ctx.fillStyle = '#2e4a2e';
    ctx.fillRect(x0, y0, size, size);
    // Roads on the minimap.
    ctx.fillStyle = '#5a6068';
    for (const rx of state.city.roadsV) ctx.fillRect(x0 + rx * scale - 2, y0, 4, size);
    for (const ry of state.city.roadsH) ctx.fillRect(x0, y0 + ry * scale - 2, size, 4);
    // Water.
    ctx.fillStyle = '#2e7fa8';
    ctx.fillRect(x0, y0 + state.city.water.y * scale, size, size - state.city.water.y * scale);
    // Mission marker.
    const s = state.missions.step();
    if (s && s.x !== undefined) {
      ctx.fillStyle = '#ffd34f';
      ctx.beginPath();
      ctx.arc(x0 + s.x * scale, y0 + s.y * scale, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    // Police blips.
    ctx.fillStyle = '#3b82ff';
    for (const car of state.police.cars) {
      ctx.beginPath();
      ctx.arc(x0 + car.x * scale, y0 + car.y * scale, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    // The player, always centred in view.
    const px = x0 + state.player.x * scale;
    const py = y0 + state.player.y * scale;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffd34f';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('SOLMAR CITY', x0, y0 - 14);
  }

  function drawHud(state) {
    const player = state.player;
    // Money and health, top left.
    panel(14, 14, 250, 64);
    ctx.fillStyle = '#7ac74f';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`$${Math.round(player.money).toLocaleString('en-US')}`, 28, 42);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(28, 52, 200, 10);
    ctx.fillStyle = player.health > 35 ? '#7ac74f' : '#ff3b30';
    ctx.fillRect(28, 52, 200 * clamp(player.health / 100, 0, 1), 10);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('HEALTH', 232, 42);
    // Wanted stars, top right.
    panel(canvas.width - 190, 14, 176, 44);
    drawStars(state.police.wanted, canvas.width - 178, 42);
    // Mission objective, top centre.
    const mission = state.missions.current();
    const step = state.missions.step();
    if (mission && step) {
      const text = `${mission.title}: ${step.text}`;
      ctx.font = 'bold 15px system-ui, sans-serif';
      const w = Math.min(canvas.width - 460, ctx.measureText(text).width + 28);
      panel((canvas.width - w) / 2, 14, w, 44);
      ctx.fillStyle = '#ffd34f';
      ctx.textAlign = 'center';
      ctx.fillText(text, canvas.width / 2, 42);
      if ((step.kind === 'timed' || step.kind === 'heat') && state.missions.timer > 0) {
        ctx.fillStyle = state.missions.timer < 20 ? '#ff3b30' : '#ffffff';
        ctx.font = 'bold 18px system-ui, sans-serif';
        ctx.fillText(`${Math.ceil(state.missions.timer)}s`, canvas.width / 2, 82);
      }
    }
    // Speed and car health while driving, bottom left.
    if (player.driving && player.car) {
      panel(14, canvas.height - 76, 210, 62);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${Math.round(Math.abs(player.car.speed) * 0.36)} km/h`, 28, canvas.height - 44);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillText(`${player.car.name}  •  car ${Math.max(0, Math.round(player.car.health))}%`, 28, canvas.height - 24);
    }
    // Controls hint, bottom centre-left.
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'left';
    const hint = player.driving
      ? 'WASD drive • Space brake • E leave car • P pause • M mute'
      : 'WASD move • Shift run • E enter car • Click shoot • F punch • P pause';
    ctx.fillText(hint, 16, canvas.height - 92);
    // Toast message.
    if (state.missions.messageIn > 0) {
      ctx.font = 'bold 17px system-ui, sans-serif';
      const w = ctx.measureText(state.missions.message).width + 32;
      panel((canvas.width - w) / 2, 74, w, 38);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(state.missions.message, canvas.width / 2, 99);
    }
    drawMinimap(state);
  }

  function drawTitle(state, best) {
    ctx.fillStyle = 'rgba(10,8,16,0.55)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd34f';
    ctx.font = 'bold 64px system-ui, sans-serif';
    ctx.fillText('SOLMAR', canvas.width / 2, canvas.height / 2 - 110);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 64px system-ui, sans-serif';
    ctx.fillText('CITY', canvas.width / 2, canvas.height / 2 - 44);
    ctx.fillStyle = '#ffb08a';
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText('An open-world crime story — steal cars, outrun the harbour police, run the jobs.', canvas.width / 2, canvas.height / 2 + 2);
    panel(canvas.width / 2 - 260, canvas.height / 2 + 30, 520, 92);
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText('Mara Voss owes the harbour crew five jobs.', canvas.width / 2, canvas.height / 2 + 62);
    ctx.fillText('Start with First Wheels: steal a car and bring it to the garage.', canvas.width / 2, canvas.height / 2 + 88);
    ctx.fillStyle = '#ffd34f';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText('Press ENTER to play', canvas.width / 2, canvas.height / 2 + 160);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText('WASD move / drive  •  E enter car  •  Mouse aim, click shoot  •  F punch  •  P pause  •  M mute', canvas.width / 2, canvas.height / 2 + 192);
    if (best && best.money > 0) {
      ctx.fillText(`Saved game: $${best.money} — mission ${best.missionIndex + 1} of 5`, canvas.width / 2, canvas.height / 2 + 220);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('An original game. Solmar City, Mara Voss and the harbour crew are invented for this game.', canvas.width / 2, canvas.height - 20);
  }

  function drawPaused(state) {
    ctx.fillStyle = 'rgba(10,8,16,0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px system-ui, sans-serif';
    ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2 - 20);
    ctx.font = '17px system-ui, sans-serif';
    ctx.fillText('Your progress is saved. Press P or Enter to keep playing, R to restart the story.', canvas.width / 2, canvas.height / 2 + 20);
    ctx.fillText(`Money $${Math.round(state.player.money)}  •  Job ${state.missions.index + 1} of 5`, canvas.width / 2, canvas.height / 2 + 50);
  }

  function drawEnd(state, kind) {
    ctx.fillStyle = 'rgba(10,8,16,0.65)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = kind === 'wasted' ? '#ff3b30' : '#3b82ff';
    ctx.font = 'bold 56px system-ui, sans-serif';
    ctx.fillText(kind === 'wasted' ? 'WASTED' : 'BUSTED', canvas.width / 2, canvas.height / 2 - 30);
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillText(
      kind === 'wasted'
        ? 'Mara is down. The harbour crew picks her up — minus $100.'
        : 'The harbour police caught up with Mara. She pays the fine — minus $150.',
      canvas.width / 2,
      canvas.height / 2 + 10,
    );
    ctx.fillStyle = '#ffd34f';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText('Press ENTER to get back on the street', canvas.width / 2, canvas.height / 2 + 60);
  }

  function drawDone(state) {
    ctx.fillStyle = 'rgba(10,8,16,0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd34f';
    ctx.font = 'bold 52px system-ui, sans-serif';
    ctx.fillText('KING OF SOLMAR', canvas.width / 2, canvas.height / 2 - 60);
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText('All five jobs done. Mara owns the city now — free roam, keep the money coming.', canvas.width / 2, canvas.height / 2 - 14);
    ctx.fillStyle = '#7ac74f';
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillText(`Final take: $${Math.round(state.player.money).toLocaleString('en-US')}`, canvas.width / 2, canvas.height / 2 + 30);
    ctx.fillStyle = '#ffd34f';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText('Press ENTER to keep playing', canvas.width / 2, canvas.height / 2 + 80);
  }

  return { drawHud, drawTitle, drawPaused, drawEnd, drawDone, drawMinimap };
}
