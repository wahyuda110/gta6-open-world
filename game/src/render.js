// Rendering: a warm sunset top-down view of Solmar City on one canvas. The camera follows the
// player, the city is drawn block by block with long evening shadows, and cars, people, police
// and effects are drawn in world order. Everything is drawn with canvas paths — no image files.
import { BLOCK, CAR, COLORS, ROAD, WORLD } from './config.js';
import { clamp } from './random.js';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const camera = { x: 0, y: 0, shake: 0 };

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function worldToScreen(wx, wy) {
    return { x: wx - camera.x, y: wy - camera.y };
  }

  function drawGround(state) {
    // Grass base, then the beach and the sea along the south edge.
    ctx.fillStyle = COLORS.grass;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const beach = state.city.beach;
    const bs = worldToScreen(beach.x, beach.y);
    ctx.fillStyle = COLORS.sand;
    ctx.fillRect(bs.x, bs.y, beach.w, beach.h);
    const water = state.city.water;
    const ws = worldToScreen(water.x, water.y);
    const wave = Math.sin(state.time * 1.4) * 3;
    ctx.fillStyle = COLORS.water;
    ctx.fillRect(ws.x, ws.y + wave, water.w, water.h - wave);
    ctx.fillStyle = COLORS.waterDeep;
    for (let x = 0; x < water.w; x += 90) {
      const wx = worldToScreen(x, water.y + 22 + ((x * 7) % 26)).x;
      ctx.fillRect(wx, ws.y + 22 + ((x * 7) % 26), 46, 3);
    }
    // District name labels, faint, across the map.
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    for (const d of state.city.districts) {
      const p = worldToScreen(d.x + d.w / 2, d.y + d.h / 2);
      if (p.x < -200 || p.x > canvas.width + 200 || p.y < -100 || p.y > canvas.height + 100) continue;
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      ctx.fillText(d.name.toUpperCase(), p.x, p.y);
    }
  }

  function drawParks(state) {
    for (const park of state.city.parks) {
      const p = worldToScreen(park.x, park.y);
      if (p.x > canvas.width || p.y > canvas.height || p.x + park.w < 0 || p.y + park.h < 0) continue;
      ctx.fillStyle = park.kind === 'park' ? COLORS.park : COLORS.plaza;
      ctx.fillRect(p.x, p.y, park.w, park.h);
      if (park.kind === 'plaza') {
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 2;
        ctx.strokeRect(p.x + 12, p.y + 12, park.w - 24, park.h - 24);
      }
    }
  }

  function drawRoads(state) {
    const city = state.city;
    ctx.fillStyle = COLORS.road;
    for (const rx of city.roadsV) {
      const p = worldToScreen(rx - ROAD / 2, 0);
      ctx.fillRect(p.x, p.y, ROAD, WORLD.height);
    }
    for (const ry of city.roadsH) {
      const p = worldToScreen(0, ry - ROAD / 2);
      ctx.fillRect(p.x, p.y, WORLD.width, ROAD);
    }
    // Centre dashes.
    ctx.fillStyle = COLORS.roadLine;
    for (const rx of city.roadsV) {
      for (let y = 20; y < WORLD.height; y += 64) {
        const p = worldToScreen(rx - 2, y);
        if (p.y < -20 || p.y > canvas.height + 20) continue;
        ctx.fillRect(p.x, p.y, 4, 30);
      }
    }
    for (const ry of city.roadsH) {
      for (let x = 20; x < WORLD.width; x += 64) {
        const p = worldToScreen(x, ry - 2);
        if (p.x < -20 || p.x > canvas.width + 20) continue;
        ctx.fillRect(p.x, p.y, 30, 4);
      }
    }
    // Sidewalk edging along the roads.
    ctx.fillStyle = COLORS.sidewalk;
    for (const rx of city.roadsV) {
      const p = worldToScreen(rx - ROAD / 2 - 10, 0);
      ctx.fillRect(p.x, p.y, 6, WORLD.height);
      const p2 = worldToScreen(rx + ROAD / 2 + 4, 0);
      ctx.fillRect(p2.x, p2.y, 6, WORLD.height);
    }
  }

  function drawBuildings(state) {
    const city = state.city;
    for (const b of city.buildings) {
      const p = worldToScreen(b.x, b.y);
      if (p.x > canvas.width + 40 || p.y > canvas.height + 40 || p.x + b.w < -40 || p.y + b.h < -40) continue;
      // Long evening shadow to the north-east.
      ctx.fillStyle = 'rgba(40,20,10,0.28)';
      ctx.fillRect(p.x + 14, p.y - 10, b.w, b.h);
      // Walls, roof and lit windows.
      ctx.fillStyle = b.wall;
      ctx.fillRect(p.x, p.y, b.w, b.h);
      ctx.fillStyle = b.roof;
      ctx.fillRect(p.x + 5, p.y + 5, b.w - 10, b.h - 10);
      ctx.fillStyle = 'rgba(255,214,120,0.85)';
      const cols = Math.max(1, Math.floor(b.w / 34));
      const rows = Math.max(1, Math.floor(b.h / 34));
      for (let i = 0; i < cols; i += 1) {
        for (let j = 0; j < rows; j += 1) {
          if ((i * 7 + j * 3 + b.height) % 3 === 0) {
            ctx.fillRect(p.x + 12 + i * 34, p.y + 12 + j * 34, 12, 14);
          }
        }
      }
      if (b.height >= 3) {
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(p.x + 5, p.y + 5, b.w - 10, 10);
      }
    }
    for (const l of city.landmarks) {
      const p = worldToScreen(l.x, l.y);
      if (p.x > canvas.width || p.y > canvas.height || p.x + l.w < 0 || p.y + l.h < 0) continue;
      ctx.fillStyle = 'rgba(40,20,10,0.28)';
      ctx.fillRect(p.x + 12, p.y - 8, l.w, l.h);
      ctx.fillStyle = '#e8d9b0';
      ctx.fillRect(p.x, p.y, l.w, l.h);
      ctx.fillStyle = '#8a5a2e';
      ctx.fillRect(p.x + 4, p.y + 4, l.w - 8, l.h - 8);
      ctx.fillStyle = '#fff2c9';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(l.name.toUpperCase(), p.x + l.w / 2, p.y + l.h / 2 + 4);
    }
  }

  function drawTrees(state) {
    for (const t of state.city.trees) {
      const p = worldToScreen(t.x, t.y);
      if (p.x < -30 || p.x > canvas.width + 30 || p.y < -30 || p.y > canvas.height + 30) continue;
      ctx.fillStyle = 'rgba(40,20,10,0.25)';
      ctx.beginPath();
      ctx.arc(p.x + 5, p.y + 4, t.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4d8a3f';
      ctx.beginPath();
      ctx.arc(p.x, p.y, t.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#6da356';
      ctx.beginPath();
      ctx.arc(p.x - 3, p.y - 3, t.r * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawCarShape(x, y, angle, color, opts) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(-CAR.length / 2 + 4, -CAR.width / 2 + 5, CAR.length, CAR.width);
    ctx.fillStyle = color;
    roundRect(-CAR.length / 2, -CAR.width / 2, CAR.length, CAR.width, 8);
    ctx.fill();
    ctx.fillStyle = 'rgba(180,220,255,0.9)';
    ctx.fillRect(-6, -CAR.width / 2 + 3, 16, CAR.width - 6);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillRect(CAR.length / 2 - 8, -CAR.width / 2 + 3, 4, 6);
    ctx.fillRect(CAR.length / 2 - 8, CAR.width / 2 - 9, 4, 6);
    if (opts && opts.siren) {
      ctx.fillStyle = Math.sin(opts.siren) > 0 ? '#ff3b30' : '#3b82ff';
      ctx.beginPath();
      ctx.arc(-2, 0, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    if (opts && opts.smoke) {
      ctx.fillStyle = 'rgba(120,120,120,0.7)';
      ctx.beginPath();
      ctx.arc(-CAR.length / 2 - 6, 0, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawPerson(x, y, angle, color, bob) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(2, 3, 11, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    const swing = Math.sin(bob) * 4;
    ctx.strokeStyle = '#2b2b33';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(angle + Math.PI / 2) * swing, Math.sin(angle + Math.PI / 2) * swing + 8);
    ctx.moveTo(0, 0);
    ctx.lineTo(-Math.cos(angle + Math.PI / 2) * swing, -Math.sin(angle + Math.PI / 2) * swing + 8);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8b88a';
    ctx.beginPath();
    ctx.arc(Math.cos(angle) * 4, Math.sin(angle) * 4, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawMissionMarker(state) {
    const s = state.missions.step();
    if (!s || s.x === undefined || state.screen !== 'play') return;
    const p = worldToScreen(s.x, s.y);
    const pulse = 1 + Math.sin(state.time * 4) * 0.12;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(pulse, pulse);
    ctx.strokeStyle = '#ffd34f';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffd34f';
    ctx.beginPath();
    ctx.moveTo(0, -46);
    ctx.lineTo(10, -26);
    ctx.lineTo(-10, -26);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // Edge arrow pointing at the marker when it is off screen.
    if (p.x < 40 || p.x > canvas.width - 40 || p.y < 40 || p.y > canvas.height - 40) {
      const cx = clamp(p.x, 50, canvas.width - 50);
      const cy = clamp(p.y, 60, canvas.height - 60);
      const a = Math.atan2(p.y - cy, p.x - cx);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(a);
      ctx.fillStyle = '#ffd34f';
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(-10, -10);
      ctx.lineTo(-10, 10);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  function drawWorld(state) {
    const px = state.player.x;
    const py = state.player.y;
    const shakeX = camera.shake > 0 ? (Math.random() - 0.5) * camera.shake : 0;
    const shakeY = camera.shake > 0 ? (Math.random() - 0.5) * camera.shake : 0;
    camera.x = clamp(px - canvas.width / 2 + shakeX, -80, WORLD.width - canvas.width + 80);
    camera.y = clamp(py - canvas.height / 2 + shakeY, -80, WORLD.height - canvas.height + 80);
    if (camera.shake > 0) camera.shake = Math.max(0, camera.shake - 40 * (1 / 60));
    drawGround(state);
    drawParks(state);
    drawRoads(state);
    drawBuildings(state);
    drawTrees(state);
    drawMissionMarker(state);

    // Traffic, police and the player's car.
    for (const car of state.traffic.cars) {
      if (car.stolen && state.player.driving && state.player.car === car) continue;
      const p = worldToScreen(car.x, car.y);
      if (p.x < -80 || p.x > canvas.width + 80 || p.y < -80 || p.y > canvas.height + 80) continue;
      drawCarShape(p.x, p.y, car.angle, car.color, { smoke: car.health < 40 });
    }
    for (const car of state.police.cars) {
      const p = worldToScreen(car.x, car.y);
      if (p.x < -80 || p.x > canvas.width + 80 || p.y < -80 || p.y > canvas.height + 80) continue;
      drawCarShape(p.x, p.y, car.angle, car.color, { siren: car.siren });
    }
    for (const officer of state.police.officers) {
      const p = worldToScreen(officer.x, officer.y);
      drawPerson(p.x, p.y, officer.angle, '#1c2733', state.time * 6);
    }
    for (const ped of state.traffic.peds) {
      const p = worldToScreen(ped.x, ped.y);
      if (p.x < -40 || p.x > canvas.width + 40 || p.y < -40 || p.y > canvas.height + 40) continue;
      drawPerson(p.x, p.y, ped.angle, ped.color, state.time * 5 + ped.id);
    }
    for (const guard of state.guards) {
      if (guard.health <= 0) continue;
      const p = worldToScreen(guard.x, guard.y);
      drawPerson(p.x, p.y, guard.angle, '#5a2e2e', state.time * 6);
      ctx.fillStyle = '#ff3b30';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('GUARD', p.x, p.y - 18);
    }
    // The player: a car, or Mara on foot with an aim line.
    if (state.player.driving && state.player.car) {
      const car = state.player.car;
      const p = worldToScreen(car.x, car.y);
      drawCarShape(p.x, p.y, car.angle, car.color, { smoke: car.health < 40 });
      ctx.strokeStyle = 'rgba(255,211,79,0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, CAR.length / 2 + 8, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      const p = worldToScreen(state.player.x, state.player.y);
      drawPerson(p.x, p.y, state.player.angle, '#ffd34f', state.player.walkBob);
      // Aim line and crosshair when the mouse is down or the player recently shot.
      const aim = state.player.aimAngle;
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x + Math.cos(aim) * 18, p.y + Math.sin(aim) * 18);
      ctx.lineTo(p.x + Math.cos(aim) * 52, p.y + Math.sin(aim) * 52);
      ctx.stroke();
    }
    // Bullets and particles.
    for (const b of state.combat.bullets) {
      const p = worldToScreen(b.x, b.y);
      ctx.fillStyle = '#ffe08a';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const pt of state.combat.particles) {
      const p = worldToScreen(pt.x, pt.y);
      ctx.globalAlpha = clamp(pt.life * 2, 0, 1);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    // Warm sunset wash over everything.
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, 'rgba(255,150,60,0.05)');
    grad.addColorStop(1, 'rgba(255,90,40,0.10)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Vignette.
    const vg = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) * 0.45,
      canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) * 0.75,
    );
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(20,8,0,0.35)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  return {
    canvas,
    camera,
    worldToScreen,
    drawWorld,
    addShake(amount) {
      camera.shake = Math.max(camera.shake, amount);
    },
  };
}
