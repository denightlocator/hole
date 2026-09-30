const {
  WORLD_SIZE,
  TICK_RATE,
  TARGET_ENTITIES,
  MATCH_DURATION,
  POST_MATCH_DURATION,
  LEVEL_TIERS,
  PLAYER_SKINS,
  GAME_MODES
} = require('../shared/constants');
const MapGenerator = require('./mapGenerator');
const SpatialGrid = require('./spatialGrid');
const { BotManager } = require('./botManager');
const progressStore = require('./progressStore');

class Player {
  constructor(id, ws, name, skinId) {
    this.id = id;
    this.ws = ws;
    this.name = name || 'Guest_' + id.substr(0, 4);
    const skinDef = PLAYER_SKINS.find(s => s.id === skinId) || PLAYER_SKINS[0];
    this.skinId = skinDef.id;
    this.skinHex = skinDef.hex;
    this.outerLayer = skinDef.outerLayer || 'classic';
    this.isBot = false;

    this.propsSwallowedCount = 0;
    this.hasEatenSkyscraper = false;
    this.isMonster = false;

    this.reset();
  }

  reset() {
    const margin = WORLD_SIZE * 0.35;
    this.x = (Math.random() - 0.5) * margin * 2;
    this.z = (Math.random() - 0.5) * margin * 2;
    this.vx = 0;
    this.vz = 0;
    this.angle = 0;

    this.score = 0;
    this.kills = 0;
    this.level = 1;
    this.radius = LEVEL_TIERS[0].radius;
    this.baseSpeed = LEVEL_TIERS[0].speed;
    this.propsSwallowedCount = 0;
    this.hasEatenSkyscraper = false;
    this.isMonster = false;

    this.inputDirX = 0;
    this.inputDirZ = 0;
    this.isBoosting = false;
    this.boostEnergy = 100;

    this.alive = true;
    this.respawnTimer = 0;
  }

  update(dt) {
    if (!this.alive) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        this.reset();
        this.alive = true;
      }
      return;
    }

    // Boost drain and recharge
    if (this.isBoosting && (this.inputDirX !== 0 || this.inputDirZ !== 0)) {
      this.boostEnergy = Math.max(0, this.boostEnergy - 40 * dt);
      if (this.boostEnergy <= 0) {
        this.isBoosting = false;
      }
    } else {
      this.boostEnergy = Math.min(100, this.boostEnergy + 25 * dt);
    }

    // Move based on input direction
    const inputLen = Math.hypot(this.inputDirX, this.inputDirZ);
    if (inputLen > 0.05) {
      const speed = this.isBoosting ? this.baseSpeed * 1.55 : this.baseSpeed;
      const targetVx = (this.inputDirX / inputLen) * speed;
      const targetVz = (this.inputDirZ / inputLen) * speed;

      // Smooth inertia
      this.vx += (targetVx - this.vx) * Math.min(1.0, 10.0 * dt);
      this.vz += (targetVz - this.vz) * Math.min(1.0, 10.0 * dt);

      this.angle = Math.atan2(this.vx, this.vz);
    } else {
      this.vx *= Math.pow(0.1, dt);
      this.vz *= Math.pow(0.1, dt);
    }

    this.x += this.vx * dt;
    this.z += this.vz * dt;

    // Boundaries
    const bound = WORLD_SIZE / 2 - this.radius;
    if (this.x < -bound) { this.x = -bound; this.vx = 0; }
    if (this.x > bound)  { this.x = bound;  this.vx = 0; }
    if (this.z < -bound) { this.z = -bound; this.vz = 0; }
    if (this.z > bound)  { this.z = bound;  this.vz = 0; }
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

class GameRoom {
  constructor(roomId = 'default', mapType = 'metropolis', gameMode = 'classic') {
    this.roomId = roomId;
    this.mapType = mapType || 'metropolis';
    this.gameMode = gameMode || 'classic';

    this.players = new Map();
    this.botManager = new BotManager(this);
    this.grid = new SpatialGrid(25);

    this.state = 'PLAYING';
    const modeDef = GAME_MODES[this.gameMode] || GAME_MODES.classic;
    this.timeLeft = modeDef.hasTimer ? (modeDef.duration || MATCH_DURATION) : 999999;
    this.postMatchTimer = 0;

    // Battle Royale safe zone
    const maxSafeZone = (WORLD_SIZE / 2) - 10;
    this.zoneRadius = maxSafeZone;
    this.minZoneRadius = 35;
    this.zoneShrinkSpeed = (maxSafeZone - 35) / (modeDef.duration || 120);

    // Monster hunt
    this.juggernautId = null;

    this.props = [];
    this.propMap = new Map();
    this.dynamicProps = [];
    this.respawnQueue = [];

    this.swallowedQueue = [];
    this.killEvents = [];

    this._initMap();
    this._startLoop();
  }

  _initMap() {
    this.props = MapGenerator.generateMap(this.mapType);
    this.propMap.clear();
    this.dynamicProps = [];
    this.grid = new SpatialGrid(25);

    for (const prop of this.props) {
      this.propMap.set(prop.id, prop);
      if (prop.isDynamic || prop.isVehicle) {
        this.dynamicProps.push(prop);
      }
      this.grid.insert(prop);
    }
  }

  addPlayer(id, ws, name, skinId) {
    const player = new Player(id, ws, name, skinId);
    this.players.set(id, player);

    // Send complete map and initial state to newcomer
    const mapData = this.props.map(p => ({
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
    }));

    this._sendTo(ws, {
      type: 'init_game',
      playerId: player.id,
      roomId: this.roomId,
      mapType: this.mapType,
      gameMode: this.gameMode,
      zoneRadius: Math.round(this.zoneRadius),
      worldSize: WORLD_SIZE,
      timeLeft: Math.round(this.timeLeft),
      gameState: this.state,
      props: mapData,
      self: {
        id: player.id,
        name: player.name,
        skinId: player.skinId,
        skinHex: player.skinHex,
        outerLayer: player.outerLayer,
        x: player.x,
        z: player.z,
        radius: player.radius,
        score: player.score,
        level: player.level,
        boostEnergy: player.boostEnergy
      }
    });

    this.botManager.syncBotCount(TARGET_ENTITIES);
    return player;
  }

  removePlayer(id) {
    this.players.delete(id);
    this.botManager.syncBotCount(TARGET_ENTITIES);
  }

  handlePlayerInput(id, data) {
    const player = this.players.get(id);
    if (!player) return;

    if (typeof data.dirX === 'number' && typeof data.dirZ === 'number') {
      player.inputDirX = data.dirX;
      player.inputDirZ = data.dirZ;
    }
    if (typeof data.boost === 'boolean') {
      player.isBoosting = data.boost && player.boostEnergy > 5;
    }
  }

  _startLoop() {
    const dt = 1 / TICK_RATE;
    this.intervalId = setInterval(() => {
      this._update(dt);
    }, 1000 / TICK_RATE);
  }

  _update(dt) {
    // 1. Match timer management
    if (this.state === 'PLAYING') {
      if (this.gameMode !== 'endless') {
        this.timeLeft -= dt;
        if (this.timeLeft <= 0) {
          this.timeLeft = 0;
          this.state = 'GAME_OVER';
          this.postMatchTimer = POST_MATCH_DURATION;
          this._handleGameOver();
        }
      }
    } else if (this.state === 'GAME_OVER') {
      this.postMatchTimer -= dt;
      if (this.postMatchTimer <= 0) {
        this._restartMatch();
      }
    }

    // 2. Ensure bot count is maintained
    this.botManager.syncBotCount(TARGET_ENTITIES);

    // 3. Update all human players
    for (const player of this.players.values()) {
      player.update(dt);
    }

    // 4. Update dynamic props (moving pedestrians and driving cars)
    this._updateDynamicProps(dt);

    // 5. Gather all entities (human players + bots)
    const allEntities = [...this.players.values(), ...this.botManager.getBotsList()];

    // 6. Mode specific: Monster Hunt
    if (this.gameMode === 'monster_hunt' && allEntities.length > 0) {
      if (!this.juggernautId || !allEntities.some(e => e.id === this.juggernautId && e.alive)) {
        // Pick largest or first entity as Juggernaut
        const candidate = allEntities.find(e => e.alive) || allEntities[0];
        if (candidate) {
          candidate.score = Math.max(candidate.score, 900);
          candidate._updateLevel();
          candidate.isMonster = true;
          this.juggernautId = candidate.id;
        }
      }
    }

    // 7. Mode specific: Battle Royale Storm Zone
    if (this.gameMode === 'battle_royale') {
      this.zoneRadius = Math.max(this.minZoneRadius, this.zoneRadius - this.zoneShrinkSpeed * dt);
      for (const ent of allEntities) {
        if (!ent.alive) continue;
        const d = Math.hypot(ent.x, ent.z);
        if (d > this.zoneRadius) {
          // Storm damage
          ent.score = Math.max(0, ent.score - 18 * dt);
          ent._updateLevel();
        }
      }
    }

    // 8. Update bots
    this.botManager.update(dt, this.grid, allEntities);

    // 9. Check Swallow Collisions (Hole vs Props)
    this._checkPropSwallowing(allEntities);

    // 10. Check Hole vs Hole predation
    this._checkHolePredation(allEntities);

    // 11. Process prop respawns (faster in endless)
    this._processRespawns(this.gameMode === 'endless' ? dt * 2.5 : dt);

    // 12. Broadcast snapshot to all clients
    this._broadcastTick(allEntities);
  }

  _updateDynamicProps(dt) {
    for (const prop of this.dynamicProps) {
      if (!prop.alive) continue;

      if (prop.driveDir === 'z' || prop.walkDir === 'z') {
        prop.z += prop.vz * dt;
        if (prop.z > 230) {
          prop.z = -230;
        } else if (prop.z < -230) {
          prop.z = 230;
        }
      } else if (prop.driveDir === 'x' || prop.walkDir === 'x') {
        prop.x += prop.vx * dt;
        if (prop.x > 230) {
          prop.x = -230;
        } else if (prop.x < -230) {
          prop.x = 230;
        }
      }

      this.grid.update(prop);
    }
  }

  _checkPropSwallowing(allEntities) {
    for (const hole of allEntities) {
      if (!hole.alive) continue;

      // Query nearby props
      const nearbyProps = this.grid.queryRadius(hole.x, hole.z, hole.radius + 1.5);
      for (const prop of nearbyProps) {
        if (!prop.alive) continue;

        // Swallow criteria: prop must fit inside hole radius and hole center is close enough
        if (prop.minRadius <= hole.radius) {
          const dist = Math.hypot(prop.x - hole.x, prop.z - hole.z);
          // If prop center is comfortably inside the hole
          const swallowDistanceThreshold = Math.max(0.6, hole.radius - prop.radius * 0.4);
          if (dist <= swallowDistanceThreshold) {
            prop.alive = false;
            this.grid.remove(prop);

            hole.addXp(prop.xp);
            hole.propsSwallowedCount = (hole.propsSwallowedCount || 0) + 1;
            if (prop.type === 'SKYSCRAPER' || prop.type === 'APARTMENT_TOWER') {
              hole.hasEatenSkyscraper = true;
            }

            this.swallowedQueue.push({
              propId: prop.id,
              holeId: hole.id,
              xp: prop.xp,
              x: prop.x,
              z: prop.z,
              t: prop.type
            });

            // Queue respawn for small/medium props (cones, cans, hydrants, trees, cars, pedestrians)
            if (prop.xp < 120 || prop.isDynamic) {
              this.respawnQueue.push({
                prop,
                timer: 20 + Math.random() * 15
              });
            }
          }
        }
      }
    }
  }

  _checkHolePredation(allEntities) {
    for (let i = 0; i < allEntities.length; i++) {
      const a = allEntities[i];
      if (!a.alive) continue;

      for (let j = 0; j < allEntities.length; j++) {
        if (i === j) continue;
        const b = allEntities[j];
        if (!b.alive) continue;

        // Predator must be at least 25% bigger than victim
        if (a.radius > b.radius * 1.25) {
          const dist = Math.hypot(a.x - b.x, a.z - b.z);
          // b must be inside a's hole
          if (dist < a.radius * 0.75) {
            b.alive = false;
            b.respawnTimer = 4.0;
            a.kills++;

            let gainedXp = Math.floor(b.score * 0.4) + 120;
            if (this.gameMode === 'monster_hunt' && b.id === this.juggernautId) {
              gainedXp += 450;
              b.isMonster = false;
              a.isMonster = true;
              this.juggernautId = a.id;
            }

            a.addXp(gainedXp);

            const killEvent = {
              predatorId: a.id,
              predatorName: a.name,
              victimId: b.id,
              victimName: b.name,
              xp: gainedXp,
              x: b.x,
              z: b.z
            };
            this.killEvents.push(killEvent);
          }
        }
      }
    }
  }

  _processRespawns(dt) {
    for (let i = this.respawnQueue.length - 1; i >= 0; i--) {
      const item = this.respawnQueue[i];
      item.timer -= dt;
      if (item.timer <= 0) {
        const prop = item.prop;
        prop.alive = true;
        this.grid.insert(prop);
        this.swallowedQueue.push({
          respawnPropId: prop.id,
          x: prop.x,
          z: prop.z
        });
        this.respawnQueue.splice(i, 1);
      }
    }
  }

  _handleGameOver() {
    const allEntities = [...this.players.values(), ...this.botManager.getBotsList()];
    allEntities.sort((a, b) => b.score - a.score);

    const podium = allEntities.slice(0, 3).map((e, idx) => ({
      rank: idx + 1,
      id: e.id,
      name: e.name,
      score: e.score,
      kills: e.kills,
      level: e.level,
      isBot: !!e.isBot,
      skinId: e.skinId,
      skinHex: e.skinHex,
      outerLayer: e.outerLayer
    }));

    const rankings = allEntities.map((e, idx) => ({
      rank: idx + 1,
      id: e.id,
      name: e.name,
      score: e.score,
      kills: e.kills,
      level: e.level
    }));

    // Record career progress for each human player
    for (const player of this.players.values()) {
      const myRank = rankings.findIndex(r => r.id === player.id) + 1;
      const rewardResult = progressStore.recordMatchResult(player.name, {
        score: player.score,
        kills: player.kills,
        rank: myRank > 0 ? myRank : 10,
        level: player.level,
        propsCount: player.propsSwallowedCount,
        hasEatenSkyscraper: player.hasEatenSkyscraper
      });

      this._sendTo(player.ws, {
        type: 'game_over',
        podium,
        rankings,
        rewards: rewardResult,
        nextRoundIn: POST_MATCH_DURATION
      });
    }

    // For any spectators or extra connections
    this._broadcast({
      type: 'game_over',
      podium,
      rankings,
      nextRoundIn: POST_MATCH_DURATION
    });
  }

  _restartMatch() {
    this.state = 'PLAYING';
    const modeDef = GAME_MODES[this.gameMode] || GAME_MODES.classic;
    this.timeLeft = modeDef.hasTimer ? (modeDef.duration || MATCH_DURATION) : 999999;
    this.zoneRadius = (WORLD_SIZE / 2) - 10;

    // Reset map
    this._initMap();

    // Reset all players and bots
    for (const player of this.players.values()) {
      player.reset();
    }
    for (const bot of this.botManager.getBotsList()) {
      bot.reset();
    }
    this.juggernautId = null;

    this._broadcast({
      type: 'match_restart',
      timeLeft: this.timeLeft
    });
  }

  _broadcastTick(allEntities) {
    // Build compressed entity array: [id, name, skinId, skinHex, outerLayer, x, z, angle, radius, score, level, isBoosting, alive, kills, isBot]
    const entitiesData = allEntities.map(e => ({
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
      bot: e.isBot ? 1 : 0,
      mst: e.id === this.juggernautId ? 1 : 0
    }));

    // Dynamic props that are alive
    const dynamicData = this.dynamicProps
      .filter(p => p.alive)
      .map(p => ({
        id: p.id,
        x: Math.round(p.x * 10) / 10,
        z: Math.round(p.z * 10) / 10,
        r: Math.round(p.rotY * 100) / 100
      }));

    // Leaderboard (sorted top 10)
    const sorted = [...allEntities].sort((a, b) => b.score - a.score);
    const leaderboard = sorted.slice(0, 10).map((e, idx) => ({
      rank: idx + 1,
      id: e.id,
      name: e.name,
      score: e.score,
      level: e.level,
      isBot: !!e.isBot,
      isMonster: e.id === this.juggernautId
    }));

    const packet = {
      type: 'tick',
      time: Math.round(this.timeLeft),
      mode: this.gameMode,
      map: this.mapType,
      zone: Math.round(this.zoneRadius || 0),
      monsterId: this.juggernautId,
      entities: entitiesData,
      dyn: dynamicData,
      swallows: this.swallowedQueue,
      kills: this.killEvents,
      lb: leaderboard
    };

    this._broadcast(packet);

    this.swallowedQueue = [];
    this.killEvents = [];
  }

  _sendTo(ws, data) {
    if (ws.readyState === 1) { // OPEN
      ws.send(JSON.stringify(data));
    }
  }

  _broadcast(data) {
    const msg = JSON.stringify(data);
    for (const player of this.players.values()) {
      if (player.ws.readyState === 1) {
        player.ws.send(msg);
      }
    }
  }

  destroy() {
    if (this.intervalId) clearInterval(this.intervalId);
  }
}

module.exports = GameRoom;
