import { ClientMapGenerator } from './mapGenerator.js';

export class LocalSimulation {
  constructor(messageHandler, profileManager) {
    this.messageHandler = messageHandler;
    this.profileManager = profileManager;
    this.timer = null;
    this.running = false;
  }

  startMatch({ name = 'Player', skinId = 'peppa-pig', mapType = 'metropolis', gameMode = 'classic' }) {
    this.destroy();
    this.running = true;

    const C = window.GameConstants || {};
    const WORLD_SIZE = C.WORLD_SIZE || 700;
    const LEVEL_TIERS = C.LEVEL_TIERS || [{ level: 1, radius: 1.8, speed: 17.5 }];
    const PLAYER_SKINS = C.PLAYER_SKINS || [{ id: 'peppa-pig', hex: 0xff69b4, outerLayer: 'peppa' }];
    const BOT_NAMES = C.BOT_NAMES || ['VoidEater', 'ShadowMaw', 'BlackHolePro'];

    this.worldSize = WORLD_SIZE;
    this.mapType = mapType;
    this.gameMode = gameMode;
    this.props = ClientMapGenerator.generateMap(mapType);
    this.propMap = new Map();
    this.dynamicProps = [];

    for (const p of this.props) {
      this.propMap.set(p.id, p);
      if (p.isDynamic) this.dynamicProps.push(p);
    }

    // Safe zone for Battle Royale
    this.zoneRadius = (WORLD_SIZE / 2) - 10;
    this.zoneShrinkSpeed = (this.zoneRadius - 35) / 120;
    this.timeLeft = gameMode === 'endless' ? 999999 : 120;

    // Player entity
    const mySkinDef = PLAYER_SKINS.find(s => s.id === skinId) || PLAYER_SKINS[0];
    this.playerId = 'player_local';
    this.player = {
      id: this.playerId,
      name,
      skinId: mySkinDef.id,
      skinHex: mySkinDef.hex,
      outerLayer: mySkinDef.outerLayer,
      x: (Math.random() - 0.5) * 150,
      z: (Math.random() - 0.5) * 150,
      angle: 0,
      radius: LEVEL_TIERS[0].radius,
      baseSpeed: LEVEL_TIERS[0].speed,
      score: 0,
      level: 1,
      kills: 0,
      alive: true,
      isBot: false,
      isBoosting: false,
      boostEnergy: 100,
      hasEatenSkyscraper: false,
      propsSwallowed: 0
    };

    this.playerInput = { dx: 0, dz: 0, isBoosting: false };

    // Spawn 11 smart bots
    this.bots = [];
    const botCount = 11;
    for (let i = 0; i < botCount; i++) {
      const bSkin = PLAYER_SKINS[(i + 1) % PLAYER_SKINS.length];
      const bName = BOT_NAMES[i % BOT_NAMES.length];
      const bot = {
        id: `bot_local_${i}`,
        name: bName,
        skinId: bSkin.id,
        skinHex: bSkin.hex,
        outerLayer: bSkin.outerLayer,
        x: (Math.random() - 0.5) * (WORLD_SIZE * 0.7),
        z: (Math.random() - 0.5) * (WORLD_SIZE * 0.7),
        targetX: 0,
        targetZ: 0,
        angle: Math.random() * Math.PI * 2,
        radius: LEVEL_TIERS[0].radius,
        baseSpeed: LEVEL_TIERS[0].speed,
        score: 0,
        level: 1,
        kills: 0,
        alive: true,
        isBot: true,
        isBoosting: false,
        boostEnergy: 100,
        scanTimer: Math.random() * 0.5
      };
      this.bots.push(bot);
    }

    this.swallowedQueue = [];
    this.killEvents = [];

    // Emit init_game
    this.messageHandler({
      type: 'init_game',
      playerId: this.playerId,
      roomId: 'solo_offline',
      mapType: this.mapType,
      gameMode: this.gameMode,
      zoneRadius: Math.round(this.zoneRadius),
      worldSize: this.worldSize,
      self: {
        skinId: this.player.skinId,
        outerLayer: this.player.outerLayer
      },
      props: this.props.map(p => ({
        id: p.id,
        t: p.type,
        x: p.x,
        z: p.z,
        r: p.rotY,
        rad: p.radius,
        h: p.height,
        minR: p.minRadius,
        c: p.color,
        al: p.alive ? 1 : 0
      }))
    });

    // 20Hz Tick Loop
    this.lastTick = performance.now();
    this.timer = setInterval(() => this._tick(), 50);
  }

  sendInput(input) {
    if (!input) return;
    this.playerInput.dx = input.dx !== undefined ? input.dx : (input.dirX || 0);
    this.playerInput.dz = input.dz !== undefined ? input.dz : (input.dirZ || 0);
    this.playerInput.isBoosting = !!(input.isBoosting || input.boost);
  }

  _tick() {
    if (!this.running) return;
    const now = performance.now();
    const dt = Math.min((now - this.lastTick) / 1000, 0.1);
    this.lastTick = now;

    const C = window.GameConstants || {};
    const LEVEL_TIERS = C.LEVEL_TIERS || [];
    const WORLD_SIZE = this.worldSize;
    const bound = WORLD_SIZE / 2;

    // Countdown timer
    if (this.gameMode !== 'endless') {
      this.timeLeft = Math.max(0, this.timeLeft - dt);
      if (this.gameMode === 'battle_royale') {
        this.zoneRadius = Math.max(35, this.zoneRadius - this.zoneShrinkSpeed * dt);
      }
    }

    // 1. Update player
    if (this.player.alive) {
      if (this.playerInput.isBoosting && this.player.boostEnergy > 0) {
        this.player.isBoosting = true;
        this.player.boostEnergy = Math.max(0, this.player.boostEnergy - 40 * dt);
      } else {
        this.player.isBoosting = false;
        this.player.boostEnergy = Math.min(100, this.player.boostEnergy + 25 * dt);
      }

      const mult = this.player.isBoosting ? 1.45 : 1.0;
      const speed = this.player.baseSpeed * mult;
      const mag = Math.hypot(this.playerInput.dx, this.playerInput.dz);
      if (mag > 0.05) {
        const nx = this.playerInput.dx / mag;
        const nz = this.playerInput.dz / mag;
        this.player.x += nx * speed * dt;
        this.player.z += nz * speed * dt;
        this.player.angle = Math.atan2(nx, nz);
      }

      this.player.x = Math.max(-bound + this.player.radius, Math.min(bound - this.player.radius, this.player.x));
      this.player.z = Math.max(-bound + this.player.radius, Math.min(bound - this.player.radius, this.player.z));

      // Battle Royale storm check
      if (this.gameMode === 'battle_royale' && Math.hypot(this.player.x, this.player.z) > this.zoneRadius) {
        this.player.score = Math.max(0, this.player.score - Math.floor(15 * dt));
      }
    }

    // 2. Update Bots AI
    for (const bot of this.bots) {
      if (!bot.alive) continue;

      bot.scanTimer -= dt;
      if (bot.scanTimer <= 0) {
        bot.scanTimer = 0.5 + Math.random() * 0.4;
        // Find nearest edible prop
        let nearest = null;
        let bestDist = 70;
        for (const p of this.props) {
          if (!p.alive || p.minRadius > bot.radius) continue;
          const d = Math.hypot(p.x - bot.x, p.z - bot.z);
          if (d < bestDist) {
            bestDist = d;
            nearest = p;
          }
        }
        if (nearest) {
          bot.targetX = nearest.x;
          bot.targetZ = nearest.z;
        } else {
          bot.targetX = bot.x + (Math.random() - 0.5) * 60;
          bot.targetZ = bot.z + (Math.random() - 0.5) * 60;
        }
      }

      const bdx = bot.targetX - bot.x;
      const bdz = bot.targetZ - bot.z;
      const bdist = Math.hypot(bdx, bdz);
      if (bdist > 0.5) {
        const nx = bdx / bdist;
        const nz = bdz / bdist;
        bot.x += nx * bot.baseSpeed * dt;
        bot.z += nz * bot.baseSpeed * dt;
        bot.angle = Math.atan2(nx, nz);
      }

      bot.x = Math.max(-bound + bot.radius, Math.min(bound - bot.radius, bot.x));
      bot.z = Math.max(-bound + bot.radius, Math.min(bound - bot.radius, bot.z));
    }

    // 3. Dynamic vehicles & pedestrians
    for (const d of this.dynamicProps) {
      if (!d.alive) continue;
      if (d.driveDir === 'x' || d.walkDir === 'x') {
        d.x += (d.vx || 0) * dt;
        if (d.x > bound) d.x = -bound;
        else if (d.x < -bound) d.x = bound;
      } else {
        d.z += (d.vz || 0) * dt;
        if (d.z > bound) d.z = -bound;
        else if (d.z < -bound) d.z = bound;
      }
    }

    // 4. Swallow Collisions
    const allEntities = [this.player, ...this.bots];
    for (const e of allEntities) {
      if (!e.alive) continue;

      // Check props near e
      for (const p of this.props) {
        if (!p.alive) continue;
        if (p.minRadius > e.radius) continue;
        const dist = Math.hypot(p.x - e.x, p.z - e.z);
        if (dist < e.radius * 0.88) {
          p.alive = false;
          e.score += p.xp;
          if (e.id === this.playerId) {
            e.propsSwallowed++;
            if (p.type === 'SKYSCRAPER' || p.type === 'TWIN_TOWER') e.hasEatenSkyscraper = true;
          }
          this.swallowedQueue.push({ id: p.id, eaterId: e.id });

          // Check tier level up
          for (let i = LEVEL_TIERS.length - 1; i >= 0; i--) {
            if (e.score >= LEVEL_TIERS[i].reqScore) {
              e.level = LEVEL_TIERS[i].level;
              e.radius = LEVEL_TIERS[i].radius;
              e.baseSpeed = LEVEL_TIERS[i].speed;
              break;
            }
          }
        }
      }

      // Check hole vs hole predation
      for (const other of allEntities) {
        if (other === e || !other.alive) continue;
        if (e.radius > other.radius * 1.15) {
          const d = Math.hypot(other.x - e.x, other.z - e.z);
          if (d < e.radius * 0.8) {
            other.alive = false;
            e.score += Math.floor(other.score * 0.45) + 350;
            e.kills++;
            this.killEvents.push({ killerId: e.id, killerName: e.name, victimId: other.id, victimName: other.name });

            // Respawn victim after 5s
            setTimeout(() => {
              if (this.running) {
                other.x = (Math.random() - 0.5) * (WORLD_SIZE * 0.6);
                other.z = (Math.random() - 0.5) * (WORLD_SIZE * 0.6);
                other.score = Math.floor(other.score * 0.5);
                other.alive = true;
              }
            }, 5000);
          }
        }
      }
    }

    // 5. Match End Check
    if (this.timeLeft <= 0) {
      this._endMatch();
      return;
    }

    // 6. Broadcast synthetic tick
    const sorted = [...allEntities].sort((a, b) => b.score - a.score);
    const lb = sorted.map((e, idx) => ({
      rank: idx + 1,
      id: e.id,
      name: e.name,
      score: e.score,
      level: e.level,
      isBot: e.isBot
    }));

    this.messageHandler({
      type: 'tick',
      time: Math.round(this.timeLeft),
      mode: this.gameMode,
      map: this.mapType,
      zone: Math.round(this.zoneRadius),
      entities: allEntities.map(e => ({
        id: e.id,
        n: e.name,
        skId: e.skinId,
        sk: e.skinHex,
        out: e.outerLayer,
        x: Math.round(e.x * 10) / 10,
        z: Math.round(e.z * 10) / 10,
        a: Math.round(e.angle * 100) / 100,
        r: Math.round(e.radius * 100) / 100,
        s: e.score,
        lvl: e.level,
        bst: e.isBoosting ? 1 : 0,
        al: e.alive ? 1 : 0,
        k: e.kills,
        bot: e.isBot ? 1 : 0
      })),
      dyn: this.dynamicProps.filter(p => p.alive).map(p => ({
        id: p.id,
        x: Math.round(p.x * 10) / 10,
        z: Math.round(p.z * 10) / 10,
        r: Math.round(p.rotY * 100) / 100
      })),
      swallows: this.swallowedQueue,
      kills: this.killEvents,
      lb
    });

    this.swallowedQueue = [];
    this.killEvents = [];
  }

  _endMatch() {
    this.destroy();
    const allEntities = [this.player, ...this.bots];
    const sorted = [...allEntities].sort((a, b) => b.score - a.score);
    const podium = sorted.slice(0, 3).map(e => ({ name: e.name, score: e.score, kills: e.kills, skinId: e.skinId }));
    const myRank = sorted.findIndex(e => e.id === this.playerId) + 1;

    // Calculate match rewards
    const score = this.player.score;
    const kills = this.player.kills;
    const earnedCoins = Math.floor(score / 10) + (myRank === 1 ? 150 : myRank === 2 ? 80 : 30) + (kills * 30);
    const earnedXp = score;

    if (this.profileManager) {
      this.profileManager.updateFromMatchRewards({
        earnedCoins,
        earnedXp
      });
    }

    this.messageHandler({
      type: 'game_over',
      podium,
      rankings: sorted.map((e, idx) => ({ rank: idx + 1, name: e.name, score: e.score, kills: e.kills })),
      selfStats: {
        score,
        kills,
        rank: myRank,
        level: this.player.level,
        earnedCoins,
        earnedXp
      },
      nextRoundIn: 10
    });
  }

  destroy() {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
