const { WORLD_SIZE, LEVEL_TIERS, PLAYER_SKINS, BOT_NAMES } = require('../shared/constants');

class Bot {
  constructor(id, name, skinId, skinHex, outerLayer) {
    this.id = id;
    this.name = name;
    const skinDef = PLAYER_SKINS.find(s => s.id === skinId) || PLAYER_SKINS[0];
    this.skinId = skinDef.id;
    this.skinHex = skinDef.hex;
    this.outerLayer = skinDef.outerLayer || 'classic';
    this.isBot = true;

    this.reset();
  }

  reset() {
    // Spawn across map with safety margin from perimeter
    const margin = WORLD_SIZE * 0.38;
    this.x = (Math.random() - 0.5) * margin * 2;
    this.z = (Math.random() - 0.5) * margin * 2;
    this.targetX = this.x;
    this.targetZ = this.z;
    this.vx = 0;
    this.vz = 0;
    this.angle = Math.random() * Math.PI * 2;

    this.score = 0;
    this.kills = 0;
    this.level = 1;
    this.radius = LEVEL_TIERS[0].radius;
    this.baseSpeed = LEVEL_TIERS[0].speed;

    this.isBoosting = false;
    this.boostEnergy = 100;
    this.boostRechargeRate = 25; // per sec
    this.boostDrainRate = 45; // per sec

    this.currentTargetProp = null;
    this.targetScanTimer = 0;
    this.alive = true;
    this.respawnTimer = 0;
  }

  update(dt, grid, allEntities) {
    if (!this.alive) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        this.reset();
        this.alive = true;
      }
      return;
    }

    // Boost energy recharge/drain
    if (this.isBoosting) {
      this.boostEnergy = Math.max(0, this.boostEnergy - this.boostDrainRate * dt);
      if (this.boostEnergy <= 0) {
        this.isBoosting = false;
      }
    } else {
      this.boostEnergy = Math.min(100, this.boostEnergy + this.boostRechargeRate * dt);
    }

    // AI Decision loop every 0.2s or when target lost
    this.targetScanTimer -= dt;
    if (this.targetScanTimer <= 0 || !this.currentTargetProp || !this.currentTargetProp.alive) {
      this.targetScanTimer = 0.2 + Math.random() * 0.15;
      this._evaluateAI(grid, allEntities);
    }

    // Steer towards target position
    const dx = this.targetX - this.x;
    const dz = this.targetZ - this.z;
    const dist = Math.hypot(dx, dz);

    if (dist > 0.5) {
      const targetAngle = Math.atan2(dx, dz);
      // Smooth angle interpolation
      let angleDiff = targetAngle - this.angle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      this.angle += angleDiff * Math.min(1.0, 7.0 * dt);

      const speed = (this.isBoosting ? this.baseSpeed * 1.55 : this.baseSpeed);
      this.vx = Math.sin(this.angle) * speed;
      this.vz = Math.cos(this.angle) * speed;
    } else {
      this.vx *= 0.8;
      this.vz *= 0.8;
    }

    // Move
    this.x += this.vx * dt;
    this.z += this.vz * dt;

    // World boundary bounce
    const bound = WORLD_SIZE / 2 - this.radius;
    if (this.x < -bound) { this.x = -bound; this.angle = Math.PI / 2; }
    if (this.x > bound)  { this.x = bound;  this.angle = -Math.PI / 2; }
    if (this.z < -bound) { this.z = -bound; this.angle = 0; }
    if (this.z > bound)  { this.z = bound;  this.angle = Math.PI; }
  }

  _evaluateAI(grid, allEntities) {
    let fleeThreat = null;
    let huntVictim = null;
    let closestThreatDist = 45;
    let closestVictimDist = 40;

    // 1. Check for nearby entity threats or prey
    for (const ent of allEntities) {
      if (ent.id === this.id || !ent.alive) continue;
      const d = Math.hypot(ent.x - this.x, ent.z - this.z);

      // Flee if threat: entity is bigger than us
      if (ent.radius > this.radius * 1.15 && d < closestThreatDist) {
        closestThreatDist = d;
        fleeThreat = ent;
      }
      // Hunt if prey: entity is smaller than us
      else if (this.radius > ent.radius * 1.25 && d < closestVictimDist) {
        closestVictimDist = d;
        huntVictim = ent;
      }
    }

    // Priority 1: FLEE
    if (fleeThreat) {
      const fleeX = this.x - (fleeThreat.x - this.x);
      const fleeZ = this.z - (fleeThreat.z - this.z);
      this.targetX = fleeX;
      this.targetZ = fleeZ;
      if (this.boostEnergy > 30) this.isBoosting = true;
      return;
    }

    // Priority 2: HUNT SMALLER HOLE
    if (huntVictim) {
      this.targetX = huntVictim.x;
      this.targetZ = huntVictim.z;
      if (this.boostEnergy > 40 && closestVictimDist < 25) this.isBoosting = true;
      return;
    }

    this.isBoosting = false;

    // Priority 3: SEARCH FOR SWALLOWABLE PROPS
    const searchRadius = 60 + this.radius * 2;
    const candidates = grid.queryRadius(this.x, this.z, searchRadius);

    let bestProp = null;
    let bestScore = -Infinity;

    for (const prop of candidates) {
      if (!prop.alive) continue;
      // Must be small enough to swallow
      if (prop.minRadius <= this.radius) {
        const d = Math.hypot(prop.x - this.x, prop.z - this.z);
        // Score based on value / distance
        const score = (prop.xp * 1.5) / (d + 2.0);
        if (score > bestScore) {
          bestScore = score;
          bestProp = prop;
        }
      }
    }

    if (bestProp) {
      this.currentTargetProp = bestProp;
      this.targetX = bestProp.x;
      this.targetZ = bestProp.z;
    } else {
      // Wander towards map center or random direction
      this.currentTargetProp = null;
      this.targetX = (Math.random() - 0.5) * 200;
      this.targetZ = (Math.random() - 0.5) * 200;
    }
  }

  addXp(amount) {
    this.score += amount;
    this._updateLevel();
  }

  _updateLevel() {
    for (let i = LEVEL_TIERS.length - 1; i >= 0; i--) {
      const tier = LEVEL_TIERS[i];
      if (this.score >= tier.minXp) {
        if (this.level !== tier.level) {
          this.level = tier.level;
        }
        // Smooth scaling radius based on score
        const nextTier = LEVEL_TIERS[i + 1];
        if (nextTier) {
          const progress = (this.score - tier.minXp) / (nextTier.minXp - tier.minXp);
          this.radius = tier.radius + (nextTier.radius - tier.radius) * progress;
          this.baseSpeed = tier.speed + (nextTier.speed - tier.speed) * progress;
        } else {
          this.radius = tier.radius + (this.score - tier.minXp) * 0.005;
          this.baseSpeed = tier.speed;
        }
        break;
      }
    }
  }
}

class BotManager {
  constructor(room) {
    this.room = room;
    this.bots = new Map();
  }

  syncBotCount(targetTotal) {
    const currentHumans = this.room.players.size;
    const neededBots = Math.max(0, targetTotal - currentHumans);

    // If we need more bots, spawn them
    while (this.bots.size < neededBots) {
      const id = 'bot_' + Math.random().toString(36).substr(2, 6);
      const name = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
      const skinDef = PLAYER_SKINS[Math.floor(Math.random() * PLAYER_SKINS.length)];
      const bot = new Bot(id, name, skinDef.id, skinDef.hex, skinDef.outerLayer);
      this.bots.set(id, bot);
    }

    // If we have too many bots, remove excess
    while (this.bots.size > neededBots) {
      const firstKey = this.bots.keys().next().value;
      this.bots.delete(firstKey);
    }
  }

  update(dt, grid, allEntities) {
    for (const bot of this.bots.values()) {
      bot.update(dt, grid, allEntities);
    }
  }

  getBotsList() {
    return Array.from(this.bots.values());
  }
}

module.exports = { Bot, BotManager };
