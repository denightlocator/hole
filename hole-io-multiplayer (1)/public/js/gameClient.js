import * as THREE from './vendor/three.module.js';
import { ModelFactory } from './models.js';
import { CityEnvironment } from './cityEnvironment.js';
import { HoleVisual } from './holeVisual.js';
import { EffectsManager } from './effects.js';
import { AudioManager } from './audio.js';
import { UIManager } from './ui.js';
import { ProfileManager } from './profileManager.js';
import { LocalSimulation } from './localSimulation.js';

export class GameClient {
  constructor() {
    this.container = document.getElementById('game-container');
    this.profileManager = new ProfileManager();
    this.audio = new AudioManager();
    this.effects = null;
    this.modelFactory = null;
    this.cityEnv = null;
    this.ui = null;

    // Three.js scene members
    this.scene = null;
    this.camera = null;
    this.renderer = null;

    // Game state
    this.ws = null;
    this.localSim = null;
    this.isOfflineMode = false;
    this.myPlayerId = null;
    this.myPlayerName = this.profileManager.getProfile().username || 'Player';
    this.mySkinId = this.profileManager.getProfile().selectedSkin || 'peppa-pig';
    this.roomId = 'default';
    this.worldSize = 700;

    this.holeVisuals = new Map(); // entityId -> HoleVisual
    this.propMeshes = new Map();  // propId -> THREE.Group
    this.dynamicProps = new Map(); // propId -> { mesh, data }

    this.selfData = {
      x: 0,
      z: 0,
      radius: 1.8,
      score: 0,
      level: 1,
      kills: 0,
      boostEnergy: 100,
      isBoosting: false
    };

    // Camera settings
    this.camTargetDist = 34;
    this.camTargetHeight = 40;
    this.camCurrentDist = 34;
    this.camCurrentHeight = 40;

    // Input state
    this.mouse = { x: 0, y: 0, isDown: false };
    this.keys = { KeyW: false, KeyS: false, KeyA: false, KeyD: false, ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, Space: false };
    this.touch = { active: false, startX: 0, startY: 0, currentX: 0, currentY: 0, boosting: false };

    this.ping = 0;
    this.lastPingSent = 0;

    this.raycaster = new THREE.Raycaster();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.mouseWorldTarget = new THREE.Vector3(0, 0, 0);

    this.clock = new THREE.Clock();

    this._initUI();
    this._initThree();
    this._bindControls();
    this._animate();
  }

  _initUI() {
    this.ui = new UIManager(this.profileManager, {
      onStartGame: (opts) => this.connect(opts),
      onPlayAgain: () => {
        if (this.isOfflineMode && this.localSim) {
          const profile = this.profileManager.getProfile();
          this.localSim.startMatch({
            name: profile.username,
            skinId: profile.selectedSkin,
            mapType: this.mapType,
            gameMode: this.gameMode
          });
        }
        this.ui.showGame();
      },
      onToggleMute: () => this.audio.toggleMute()
    });
  }

  _initThree() {
    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Sky blue
    this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.0035);

    // 2. Camera: Perspective looking down at tilted isometric angle
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 1, 1000);
    this.camera.position.set(0, this.camCurrentHeight, this.camCurrentDist);
    this.camera.lookAt(0, 0, 0);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = false; // Keep high FPS
    this.container.appendChild(this.renderer.domElement);

    // 4. Lights
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xfff5e6, 0.85);
    this.sunLight.position.set(120, 180, 100);
    this.scene.add(this.sunLight);

    this.fillLight = new THREE.DirectionalLight(0xb0e0e6, 0.35);
    this.fillLight.position.set(-120, 90, -100);
    this.scene.add(this.fillLight);

    // 5. Managers
    this.cityEnv = new CityEnvironment(this.scene, this.worldSize);
    this.modelFactory = new ModelFactory();
    this.effects = new EffectsManager(this.scene);

    window.addEventListener('resize', () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });
  }

  _bindControls() {
    // Mouse movement
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    window.addEventListener('mousedown', (e) => {
      if (e.target.closest('#lobby-screen') || e.target.closest('#game-over-screen') || e.target.closest('.ui-interactive')) return;
      this.mouse.isDown = true;
    });

    window.addEventListener('mouseup', () => {
      this.mouse.isDown = false;
    });

    // Right click also boosts
    window.addEventListener('contextmenu', (e) => {
      if (!e.target.closest('#lobby-screen')) {
        e.preventDefault();
      }
    });

    // Keyboard
    window.addEventListener('keydown', (e) => {
      if (this.keys.hasOwnProperty(e.code)) {
        this.keys[e.code] = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      if (this.keys.hasOwnProperty(e.code)) {
        this.keys[e.code] = false;
      }
    });

    // Touch support for phones & tablets
    window.addEventListener('touchstart', (e) => {
      if (e.target.closest('#lobby-screen') || e.target.closest('#game-over-screen') || e.target.closest('.ui-interactive')) return;
      const t = e.touches[0];
      this.touch.active = true;
      this.touch.startX = t.clientX;
      this.touch.startY = t.clientY;
      this.touch.currentX = t.clientX;
      this.touch.currentY = t.clientY;

      if (e.touches.length > 1) {
        this.touch.boosting = true;
      }
    });

    window.addEventListener('touchmove', (e) => {
      if (!this.touch.active) return;
      const t = e.touches[0];
      this.touch.currentX = t.clientX;
      this.touch.currentY = t.clientY;
    });

    window.addEventListener('touchend', (e) => {
      if (e.touches.length === 0) {
        this.touch.active = false;
        this.touch.boosting = false;
      }
    });
  }

  connect(opts) {
    this.myPlayerName = opts.name || this.profileManager.getProfile().username || 'Player';
    this.mySkinId = opts.skinId || this.profileManager.getProfile().selectedSkin || 'peppa-pig';
    this.roomId = opts.room || 'default';
    this.gameMode = opts.gameMode || 'classic';
    this.mapType = opts.mapType || 'metropolis';

    if (this.localSim) {
      this.localSim.destroy();
      this.localSim = null;
    }

    const startOfflineFallback = (reason) => {
      if (this.isOfflineMode) return;
      console.log(`[GameClient] Starting Solo Bot Mode (${reason})`);
      this.isOfflineMode = true;
      if (this.ws) {
        try { this.ws.close(); } catch (e) {}
        this.ws = null;
      }
      this.localSim = new LocalSimulation(msg => this._handleServerMessage(msg), this.profileManager);
      this.ui.showGame();
      this.localSim.startMatch(opts);
      this._startNetworkLoop();
    };

    // If served via file:// protocol directly
    if (window.location.protocol === 'file:') {
      startOfflineFallback('file:// static mode');
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}?name=${encodeURIComponent(this.myPlayerName)}&skinId=${encodeURIComponent(this.mySkinId)}&room=${encodeURIComponent(this.roomId)}&mode=${encodeURIComponent(this.gameMode)}&map=${encodeURIComponent(this.mapType)}`;

    console.log('[Connecting WS]', wsUrl);
    let wsConnected = false;
    const fallbackTimeout = setTimeout(() => {
      if (!wsConnected) {
        startOfflineFallback('WebSocket connection timeout');
      }
    }, 2500);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        wsConnected = true;
        clearTimeout(fallbackTimeout);
        this.isOfflineMode = false;
        console.log('[WS Connected]');
        this.ui.showGame();
        this._startNetworkLoop();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this._handleServerMessage(msg);
        } catch (err) {
          console.error('[WS Parse Error]', err);
        }
      };

      this.ws.onclose = () => {
        console.log('[WS Disconnected]');
        if (!wsConnected) {
          startOfflineFallback('WebSocket closed');
        } else {
          this.ui.showLobby();
          if (this.netInterval) clearInterval(this.netInterval);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('[WS Error - Falling back to Solo Bot Mode]', err);
        if (!wsConnected) {
          startOfflineFallback('WebSocket error');
        }
      };
    } catch (e) {
      startOfflineFallback(e.message);
    }
  }

  _startNetworkLoop() {
    if (this.netInterval) clearInterval(this.netInterval);
    this.netInterval = setInterval(() => {
      const input = this._calculateInputDirection();

      if (this.isOfflineMode && this.localSim) {
        this.localSim.sendInput(input);
        return;
      }

      if (!this.ws || this.ws.readyState !== 1) return;

      this.ws.send(JSON.stringify({
        type: 'input',
        dirX: Math.round(input.dirX * 100) / 100,
        dirZ: Math.round(input.dirZ * 100) / 100,
        boost: input.boost
      }));

      // Latency ping every 2s
      const now = Date.now();
      if (now - this.lastPingSent > 2000) {
        this.lastPingSent = now;
        this.ws.send(JSON.stringify({ type: 'ping', clientTime: now }));
      }
    }, 1000 / 30); // 30Hz client input
  }

  _calculateInputDirection() {
    let dirX = 0;
    let dirZ = 0;
    let boost = this.keys.Space || this.mouse.isDown || this.touch.boosting;

    // 1. Touch joystick input
    if (this.touch.active) {
      const dx = this.touch.currentX - this.touch.startX;
      const dy = this.touch.currentY - this.touch.startY;
      const len = Math.hypot(dx, dy);
      if (len > 10) {
        dirX = dx / len;
        dirZ = dy / len;
      }
      return { dirX, dirZ, boost };
    }

    // 2. Keyboard input
    const kLeft = this.keys.KeyA || this.keys.ArrowLeft;
    const kRight = this.keys.KeyD || this.keys.ArrowRight;
    const kUp = this.keys.KeyW || this.keys.ArrowUp;
    const kDown = this.keys.KeyS || this.keys.ArrowDown;

    if (kLeft || kRight || kUp || kDown) {
      if (kLeft) dirX -= 1;
      if (kRight) dirX += 1;
      if (kUp) dirZ -= 1;
      if (kDown) dirZ += 1;
      const len = Math.hypot(dirX, dirZ);
      if (len > 0) {
        dirX /= len;
        dirZ /= len;
      }
      return { dirX, dirZ, boost };
    }

    // 3. Mouse Follow input (default Hole.io style)
    this.raycaster.setFromCamera(new THREE.Vector2(this.mouse.x, this.mouse.y), this.camera);
    const hitPoint = new THREE.Vector3();
    const hit = this.raycaster.ray.intersectPlane(this.groundPlane, hitPoint);

    if (hit) {
      const selfHole = this.holeVisuals.get(this.myPlayerId);
      const curX = selfHole ? selfHole.x : this.selfData.x;
      const curZ = selfHole ? selfHole.z : this.selfData.z;

      const dx = hitPoint.x - curX;
      const dz = hitPoint.z - curZ;
      const dist = Math.hypot(dx, dz);

      // Dead zone near center
      if (dist > 1.2) {
        dirX = dx / dist;
        dirZ = dz / dist;
      }
    }

    return { dirX, dirZ, boost };
  }

  _handleServerMessage(msg) {
    switch (msg.type) {
      case 'init_game':
        this._handleInitGame(msg);
        break;
      case 'tick':
        this._handleTick(msg);
        break;
      case 'game_over':
        this._handleGameOver(msg);
        break;
      case 'match_restart':
        this._handleMatchRestart(msg);
        break;
      case 'pong':
        this.ping = Date.now() - msg.clientTime;
        break;
      default:
        break;
    }
  }

  _handleInitGame(msg) {
    this.myPlayerId = msg.playerId;
    this.roomId = msg.roomId;
    this.worldSize = msg.worldSize;
    this.gameMode = msg.gameMode || 'classic';
    this.mapType = msg.mapType || 'metropolis';

    if (msg.self) {
      this.mySkinId = msg.self.skinId;
      this.myOuterLayer = msg.self.outerLayer;
    }

    this.cityEnv.setMapType(this.mapType);

    // Dynamic map atmosphere
    if (this.mapType === 'cyberpunk') {
      this.scene.background = new THREE.Color(0x080816);
      this.scene.fog = new THREE.FogExp2(0x0a0c1b, 0.0025);
      if (this.ambientLight) this.ambientLight.color.setHex(0x334466);
      if (this.sunLight) this.sunLight.color.setHex(0x00f2fe);
    } else if (this.mapType === 'airport_resort') {
      this.scene.background = new THREE.Color(0x48cae4); // Tropical azure sky
      this.scene.fog = new THREE.FogExp2(0x90e0ef, 0.0018);
      if (this.ambientLight) this.ambientLight.color.setHex(0xffffff);
      if (this.sunLight) this.sunLight.color.setHex(0xfff3b0);
    } else if (this.mapType === 'amusement_park') {
      this.scene.background = new THREE.Color(0xffaa75); // Carnival golden hour dusk
      this.scene.fog = new THREE.FogExp2(0xffd166, 0.002);
      if (this.ambientLight) this.ambientLight.color.setHex(0xffeedd);
      if (this.sunLight) this.sunLight.color.setHex(0xff8c42);
    } else if (this.mapType === 'suburbs') {
      this.scene.background = new THREE.Color(0x74b9ff);
      this.scene.fog = new THREE.FogExp2(0x74b9ff, 0.002);
      if (this.ambientLight) this.ambientLight.color.setHex(0xffffff);
      if (this.sunLight) this.sunLight.color.setHex(0xfffae6);
    } else {
      this.scene.background = new THREE.Color(0x87ceeb);
      this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.0022);
      if (this.ambientLight) this.ambientLight.color.setHex(0xffffff);
      if (this.sunLight) this.sunLight.color.setHex(0xfff5e6);
    }

    // Clear old props
    for (const mesh of this.propMeshes.values()) {
      this.scene.remove(mesh);
    }
    this.propMeshes.clear();
    this.dynamicProps.clear();

    // Spawn 3D meshes for all props
    for (const propData of msg.props) {
      const mesh = this.modelFactory.createPropMesh({
        id: propData.id,
        type: propData.t,
        x: propData.x,
        z: propData.z,
        rotY: propData.r,
        radius: propData.rad,
        height: propData.h,
        minRadius: propData.minR,
        color: propData.c
      });

      mesh.visible = propData.al === 1;
      this.scene.add(mesh);
      this.propMeshes.set(propData.id, mesh);
    }

    console.log(`[Init Game] Loaded ${this.propMeshes.size} props on map "${this.mapType}" (Mode: ${this.gameMode})`);
  }

  _handleTick(msg) {
    const selfId = this.myPlayerId;
    let myEntityData = null;

    // 1. Process entity updates
    const activeIds = new Set();
    const isFirstRankId = msg.lb && msg.lb.length > 0 ? msg.lb[0].id : null;

    for (const ent of msg.entities) {
      activeIds.add(ent.id);
      let visual = this.holeVisuals.get(ent.id);

      if (!visual) {
        visual = new HoleVisual(this.scene, {
          id: ent.id,
          name: ent.n,
          skinId: ent.skId,
          skinHex: ent.sk,
          outerLayer: ent.out,
          radius: ent.r,
          x: ent.x,
          z: ent.z
        }, ent.id === selfId);
        this.holeVisuals.set(ent.id, visual);
      }

      visual.setTargetState(ent.x, ent.z, ent.r, ent.bst === 1, ent.a);
      visual.alive = ent.al === 1;
      visual.updateNameplate(ent.n, ent.lvl, ent.id === isFirstRankId);

      if (ent.id === selfId) {
        myEntityData = ent;
      }
    }

    // Remove disconnected entities
    for (const [id, visual] of this.holeVisuals.entries()) {
      if (!activeIds.has(id)) {
        visual.destroy();
        this.holeVisuals.delete(id);
      }
    }

    // 2. Process dynamic props (moving pedestrians & driving cars)
    if (msg.dyn) {
      for (const dyn of msg.dyn) {
        const mesh = this.propMeshes.get(dyn.id);
        if (mesh) {
          mesh.position.x = dyn.x;
          mesh.position.z = dyn.z;
          mesh.rotation.y = dyn.r;

          // Leg swinging for pedestrians
          if (mesh.userData.leftLeg && mesh.userData.rightLeg) {
            const swing = Math.sin(Date.now() * 0.012) * 0.6;
            mesh.userData.leftLeg.rotation.x = swing;
            mesh.userData.rightLeg.rotation.x = -swing;
          }
        }
      }
    }

    // 3. Process swallowed objects
    if (msg.swallows) {
      for (const ev of msg.swallows) {
        if (ev.respawnPropId) {
          const mesh = this.propMeshes.get(ev.respawnPropId);
          if (mesh) {
            mesh.visible = true;
            mesh.scale.set(1, 1, 1);
            mesh.position.y = 0;
          }
          continue;
        }

        const mesh = this.propMeshes.get(ev.propId);
        if (mesh && mesh.visible && !mesh.userData.isSwallowing) {
          mesh.userData.isSwallowing = true;
          const holeVisual = this.holeVisuals.get(ev.holeId);
          const holePos = holeVisual ? { x: holeVisual.x, z: holeVisual.z } : { x: ev.x, z: ev.z };
          const outerLayer = holeVisual ? holeVisual.outerLayer : 'classic';

          // Swallow animation
          this.effects.startSwallowAnimation(mesh, holePos, ev.xp, () => {
            mesh.visible = false;
            mesh.userData.isSwallowing = false;
          }, outerLayer);

          // Audio
          if (ev.holeId === selfId) {
            const sizeTier = ev.xp >= 300 ? 3 : ev.xp >= 40 ? 2 : 1;
            this.audio.playSwallow(sizeTier);
          }
        }
      }
    }

    // 4. Process kill events (Hole eats hole)
    if (msg.kills) {
      for (const k of msg.kills) {
        const isPredatorSelf = k.predatorId === selfId;
        const isVictimSelf = k.victimId === selfId;

        if (isPredatorSelf) {
          this.audio.playKill();
          this.ui.showAnnouncement(`YOU DEVOURED ${k.victimName}!`, `+${k.xp} BONUS XP`, 3000);
        } else if (isVictimSelf) {
          this.audio.playDeath();
          this.ui.showAnnouncement(`EATEN BY ${k.predatorName}!`, `Respawning in 4 seconds...`, 3500);
        } else {
          this.ui.showAnnouncement(`${k.predatorName} ate ${k.victimName}!`, '', 1800);
        }
      }
    }

    // 5. Update local player status & camera zoom
    if (myEntityData) {
      const prevLevel = this.selfData.level;
      this.selfData.x = myEntityData.x;
      this.selfData.z = myEntityData.z;
      this.selfData.radius = myEntityData.r;
      this.selfData.score = myEntityData.s;
      this.selfData.level = myEntityData.lvl;
      this.selfData.kills = myEntityData.k;
      this.selfData.isBoosting = myEntityData.bst === 1;

      // Level up announcement & sound
      if (this.selfData.level > prevLevel) {
        this.audio.playLevelUp();
        const tier = window.GameConstants ? window.GameConstants.LEVEL_TIERS[this.selfData.level - 1] : null;
        const tierName = tier ? tier.name : `Level ${this.selfData.level}`;
        this.ui.showAnnouncement(`LEVEL UP!`, `You are now a ${tierName}!`, 3000);
      }

      // Smooth camera target calculation based on hole radius
      // Levels 1 to 9 scale from radius 1.8 to 21+
      const radiusFactor = Math.max(0, this.selfData.radius - 1.8);
      this.camTargetDist = 34 + radiusFactor * 6.5;
      this.camTargetHeight = 40 + radiusFactor * 5.8;

      // Audio engine boost sound
      this.audio.setBoostActive(this.selfData.isBoosting);
    }

    // Update Battle Royale storm zone
    if (this.cityEnv) {
      this.cityEnv.updateStormZone(msg.zone, msg.mode === 'battle_royale');
    }

    // 6. Update HUD
    const constants = window.GameConstants;
    const curTier = constants ? constants.LEVEL_TIERS[this.selfData.level - 1] : { level: 1, name: 'Puddle', minXp: 0 };
    const nextTier = constants ? constants.LEVEL_TIERS[this.selfData.level] : null;

    this.ui.updateHUD({
      timeLeft: msg.time,
      mode: msg.mode,
      map: msg.map,
      zone: msg.zone,
      monsterId: msg.monsterId,
      ping: this.ping,
      roomId: this.roomId,
      score: this.selfData.score,
      levelTier: curTier,
      nextTier: nextTier,
      boostEnergy: (myEntityData && myEntityData.bst) ? Math.max(0, this.selfData.boostEnergy - 2) : Math.min(100, this.selfData.boostEnergy + 1),
      isBoosting: this.selfData.isBoosting,
      leaderboard: msg.lb,
      selfId: selfId
    });

    // 7. Render mini-map
    this.ui.renderMinimap(
      myEntityData ? { id: selfId, x: myEntityData.x, z: myEntityData.z, radius: myEntityData.r } : null,
      msg.entities,
      this.worldSize,
      msg.mode,
      msg.zone
    );
  }

  _handleGameOver(msg) {
    let selfRank = msg.podium.findIndex(p => p.id === this.myPlayerId) + 1;
    if (selfRank === 0 && msg.rankings) {
      const match = msg.rankings.find(r => r.id === this.myPlayerId);
      if (match) selfRank = match.rank;
    }

    this.ui.showGameOver(msg.podium, this.myPlayerId, {
      rank: selfRank > 0 ? selfRank : 'Unranked',
      score: this.selfData.score,
      kills: this.selfData.kills,
      level: this.selfData.level
    }, msg.rewards);
  }

  _handleMatchRestart(msg) {
    this.ui.showGame();
    this.selfData.score = 0;
    this.selfData.level = 1;
    this.selfData.kills = 0;
    this.selfData.radius = 1.8;

    // Reset all prop meshes to visible
    for (const mesh of this.propMeshes.values()) {
      mesh.visible = true;
      mesh.scale.set(1, 1, 1);
      mesh.position.y = 0;
    }

    this.ui.showAnnouncement('NEW ROUND STARTED!', 'Devour the city!', 2500);
  }

  _animate() {
    requestAnimationFrame(() => this._animate());

    const dt = Math.min(this.clock.getDelta(), 0.1);

    // 1. Update Hole Visuals
    for (const visual of this.holeVisuals.values()) {
      visual.update(dt);
    }

    // 2. Update Effects (swallowing props, particles, floating XP)
    if (this.effects) {
      this.effects.update(dt);
    }

    // 3. Smooth Camera Follow
    const selfVisual = this.holeVisuals.get(this.myPlayerId);
    const focusX = selfVisual ? selfVisual.x : 0;
    const focusZ = selfVisual ? selfVisual.z : 0;

    // Lerp camera distance and height smoothly
    this.camCurrentDist += (this.camTargetDist - this.camCurrentDist) * Math.min(1.0, 4.0 * dt);
    this.camCurrentHeight += (this.camTargetHeight - this.camCurrentHeight) * Math.min(1.0, 4.0 * dt);

    const shake = this.effects ? this.effects.getShakeOffset() : { x: 0, y: 0, z: 0 };

    this.camera.position.x = focusX + shake.x;
    this.camera.position.y = this.camCurrentHeight + shake.y;
    this.camera.position.z = focusZ + this.camCurrentDist + shake.z;
    this.camera.lookAt(focusX, 0, focusZ);

    // 4. Render 3D Scene
    this.renderer.render(this.scene, this.camera);
  }
}
