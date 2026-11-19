// Combat: bullets, punches and the guards who defend the warehouse in the final job.
// Bullets are simple fast circles; hits on guards, officers and pedestrians are resolved here,
// and every hit throws sparks and a sound through the callback the game passes in.
import { distance } from './random.js';

export function createCombat(onHit) {
  const bullets = [];
  const particles = [];
  let shootCooldown = 0;

  function shoot(fromX, fromY, angle, owner) {
    if (shootCooldown > 0) return false;
    shootCooldown = 0.28;
    bullets.push({
      x: fromX + Math.cos(angle) * 22,
      y: fromY + Math.sin(angle) * 22,
      vx: Math.cos(angle) * 720,
      vy: Math.sin(angle) * 720,
      life: 0.9,
      owner,
    });
    return true;
  }

  function punch(player, targets) {
    const reach = 34;
    const px = player.x + Math.cos(player.angle) * reach;
    const py = player.y + Math.sin(player.angle) * reach;
    let hitAny = false;
    for (const t of targets) {
      if (t.health > 0 && distance(px, py, t.x, t.y) < 26) {
        t.health -= 25;
        spawnSparks(t.x, t.y, '#ffd34f', 6);
        hitAny = true;
        onHit({ kind: 'punch', target: t });
      }
    }
    return hitAny;
  }

  function spawnSparks(x, y, color, count) {
    for (let i = 0; i < count; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 160;
      particles.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: 0.4 + Math.random() * 0.3, color, size: 2 + Math.random() * 3 });
    }
  }

  function spawnSmoke(x, y) {
    particles.push({ x, y, vx: (Math.random() - 0.5) * 20, vy: -30 - Math.random() * 20, life: 0.9, color: '#888888', size: 8 + Math.random() * 8, smoke: true });
  }

  function update(dt, city, targets, player) {
    if (shootCooldown > 0) shootCooldown -= dt;
    for (const b of bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (city.collides(b.x, b.y, 2)) {
        b.life = 0;
        spawnSparks(b.x, b.y, '#ffcf5a', 4);
      }
      for (const t of targets) {
        if (t.health > 0 && distance(b.x, b.y, t.x, t.y) < 20) {
          t.health -= 34;
          b.life = 0;
          spawnSparks(b.x, b.y, '#ff5a4f', 8);
          onHit({ kind: 'shot', target: t, owner: b.owner });
        }
      }
      if (b.owner === 'enemy' && player && player.health > 0 && distance(b.x, b.y, player.x, player.y) < 16) {
        player.health -= 7;
        b.life = 0;
        spawnSparks(b.x, b.y, '#ff5a4f', 5);
      }
    }
    for (let i = bullets.length - 1; i >= 0; i -= 1) if (bullets[i].life <= 0) bullets.splice(i, 1);
    for (const p of particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
    }
    for (let i = particles.length - 1; i >= 0; i -= 1) if (particles[i].life <= 0) particles.splice(i, 1);
  }

  return {
    bullets,
    particles,
    shoot,
    punch,
    spawnSparks,
    spawnSmoke,
    update,
  };
}

// The warehouse guards for the final job: they stand their ground, take cover in the warehouse
// yard, and shoot at the player when they get close.
export function createGuards(city, random, x, y, count) {
  const guards = [];
  for (let i = 0; i < count; i += 1) {
    guards.push({
      kind: 'guard',
      x: x + random.range(-90, 90),
      y: y + random.range(-70, 70),
      angle: random.range(0, Math.PI * 2),
      health: 70,
      shootIn: random.range(0.5, 1.8),
      homeX: x,
      homeY: y,
    });
  }
  return guards;
}
