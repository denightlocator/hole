import * as THREE from './vendor/three.module.js';
import { HoleVisual } from './holeVisual.js';

const GameConstants = window.GameConstants || {};

export class UIManager {
  constructor(profileManager, callbacks = {}) {
    this.profileManager = profileManager;
    this.callbacks = callbacks;

    // Cache elements
    this.lobbyEl = document.getElementById('lobby-screen');
    this.hudEl = document.getElementById('game-hud');
    this.gameOverEl = document.getElementById('game-over-screen');

    this.nameInput = document.getElementById('player-name');
    this.roomInput = document.getElementById('room-id');
    this.playBtn = document.getElementById('play-btn');
    this.playAgainBtn = document.getElementById('play-again-btn');

    this.timerEl = document.getElementById('hud-timer');
    this.pingEl = document.getElementById('hud-ping');
    this.roomLabelEl = document.getElementById('hud-room-label');
    this.modeLabelEl = document.getElementById('hud-mode-label');
    this.zoneLabelEl = document.getElementById('hud-zone-label');
    this.monsterLabelEl = document.getElementById('hud-monster-label');
    this.muteBtn = document.getElementById('mute-btn');

    this.levelBadgeEl = document.getElementById('hud-level-badge');
    this.levelNameEl = document.getElementById('hud-level-name');
    this.xpFillEl = document.getElementById('hud-xp-fill');
    this.xpTextEl = document.getElementById('hud-xp-text');

    this.boostFillEl = document.getElementById('hud-boost-fill');
    this.leaderboardListEl = document.getElementById('hud-leaderboard-list');
    this.announcementEl = document.getElementById('announcement-banner');

    this.miniMapCanvas = document.getElementById('minimap-canvas');
    if (this.miniMapCanvas) {
      this.miniMapCtx = this.miniMapCanvas.getContext('2d');
    }

    // Profile & Locker elements
    this.coinsValEl = document.getElementById('lobby-coins-val');
    this.careerValEl = document.getElementById('lobby-career-val');
    this.previewNameEl = document.getElementById('preview-skin-name');
    this.previewTagEl = document.getElementById('preview-outer-tag');

    this.lockerModal = document.getElementById('locker-modal');
    this.statsModal = document.getElementById('stats-modal');
    this.lockerCoinEl = document.getElementById('locker-coin-val');
    this.lockerGridEl = document.getElementById('locker-skins-grid');

    // Selected match settings
    this.selectedMode = 'classic';
    this.selectedMap = 'metropolis';
    this.activeLockerTab = 'all';

    // Initialize 3D Preview Viewport
    this._init3DPreview();

    // Bind events & populate UI
    this._bindEvents();
    this._syncProfileUI();
    this._initQuickSkinGrid();
  }

  _init3DPreview() {
    const container = document.getElementById('skin-preview-3d');
    if (!container) return;

    this.previewScene = new THREE.Scene();
    this.previewCamera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    this.previewCamera.position.set(0, 4.2, 5.0);
    this.previewCamera.lookAt(0, 0, 0);

    this.previewRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.previewRenderer.setSize(140, 140);
    this.previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = '';
    container.appendChild(this.previewRenderer.domElement);

    const amb = new THREE.AmbientLight(0xffffff, 0.85);
    this.previewScene.add(amb);
    const dir = new THREE.DirectionalLight(0xffffff, 0.95);
    dir.position.set(5, 10, 5);
    this.previewScene.add(dir);

    const curSkinId = this.profileManager.getProfile().selectedSkin || 'peppa-pig';
    this._loadPreviewSkin(curSkinId);

    const animatePreview = () => {
      requestAnimationFrame(animatePreview);
      if (this.previewHole) {
        this.previewHole.update(0.016);
        this.previewHole.group.rotation.y += 0.015;
      }
      this.previewRenderer.render(this.previewScene, this.previewCamera);
    };
    animatePreview();
  }

  _loadPreviewSkin(skinId) {
    const skinDef = GameConstants.PLAYER_SKINS.find(s => s.id === skinId) || GameConstants.PLAYER_SKINS[0];

    if (this.previewHole) {
      this.previewScene.remove(this.previewHole.group);
      this.previewHole = null;
    }

    this.previewHole = new HoleVisual(this.previewScene, {
      id: 'preview',
      name: skinDef.name,
      skinId: skinDef.id,
      skinHex: skinDef.hex,
      outerLayer: skinDef.outerLayer,
      radius: 1.4,
      x: 0,
      z: 0
    }, false);

    if (this.previewHole.nameSprite) {
      this.previewHole.nameSprite.visible = false;
    }

    if (this.previewNameEl) {
      this.previewNameEl.textContent = `${skinDef.icon} ${skinDef.name}`;
    }
    if (this.previewTagEl) {
      const tagText = skinDef.outerLayer === 'classic' ? 'CLASSIC RIM' : `3D ${skinDef.outerLayer.toUpperCase()} LAYER`;
      this.previewTagEl.textContent = tagText;
    }

    const previewContainer = document.getElementById('skin-preview-3d');
    if (previewContainer) {
      previewContainer.style.borderColor = skinDef.color;
      previewContainer.style.boxShadow = `0 0 25px ${skinDef.color}88`;
    }
  }

  _bindEvents() {
    // Mode Pills Selector
    const modeSelector = document.getElementById('mode-selector');
    if (modeSelector) {
      modeSelector.addEventListener('click', (e) => {
        const pill = e.target.closest('.mode-pill');
        if (!pill) return;
        modeSelector.querySelectorAll('.mode-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.selectedMode = pill.dataset.mode;
      });
    }

    // Map Pills Selector
    const mapSelector = document.getElementById('map-selector');
    if (mapSelector) {
      mapSelector.addEventListener('click', (e) => {
        const pill = e.target.closest('.map-pill');
        if (!pill) return;
        mapSelector.querySelectorAll('.map-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.selectedMap = pill.dataset.map;
      });
    }

    // Play button
    this.playBtn.addEventListener('click', () => {
      const name = this.nameInput.value.trim() || 'Player';
      const room = this.roomInput.value.trim() || 'default';
      this.profileManager.setUsername(name);
      const profile = this.profileManager.getProfile();

      if (this.callbacks.onStartGame) {
        this.callbacks.onStartGame({
          name,
          room,
          skinId: profile.selectedSkin,
          gameMode: this.selectedMode,
          mapType: this.selectedMap
        });
      }
    });

    this.playAgainBtn.addEventListener('click', () => {
      if (this.callbacks.onPlayAgain) {
        this.callbacks.onPlayAgain();
      }
    });

    this.muteBtn.addEventListener('click', () => {
      if (this.callbacks.onToggleMute) {
        const isMuted = this.callbacks.onToggleMute();
        this.muteBtn.textContent = isMuted ? '🔇' : '🔊';
        this.muteBtn.classList.toggle('muted', isMuted);
      }
    });

    // Name input save
    this.nameInput.addEventListener('change', () => {
      this.profileManager.setUsername(this.nameInput.value.trim());
    });

    // Locker Modal triggers
    const openLocker = () => {
      this._renderLockerGrid();
      this.lockerModal.style.display = 'flex';
    };
    document.getElementById('open-locker-btn').addEventListener('click', openLocker);
    document.getElementById('open-locker-btn2').addEventListener('click', openLocker);
    document.getElementById('close-locker-btn').addEventListener('click', () => {
      this.lockerModal.style.display = 'none';
      this._syncProfileUI();
      this._initQuickSkinGrid();
    });

    // Career Stats Modal triggers
    document.getElementById('open-stats-btn').addEventListener('click', () => {
      this._renderCareerStats();
      this.statsModal.style.display = 'flex';
    });
    document.getElementById('close-stats-btn').addEventListener('click', () => {
      this.statsModal.style.display = 'none';
    });

    // Locker Tab Filtering
    const tabsContainer = document.getElementById('locker-tabs');
    if (tabsContainer) {
      tabsContainer.addEventListener('click', (e) => {
        const tabBtn = e.target.closest('.tab-btn');
        if (!tabBtn) return;
        tabsContainer.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        tabBtn.classList.add('active');
        this.activeLockerTab = tabBtn.dataset.tab;
        this._renderLockerGrid();
      });
    }

    [this.lockerModal, this.statsModal].forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
      });
    });
  }

  _syncProfileUI() {
    const profile = this.profileManager.getProfile();
    if (this.nameInput && profile.username) {
      this.nameInput.value = profile.username;
    }
    if (this.coinsValEl) {
      this.coinsValEl.textContent = profile.coins.toLocaleString();
    }
    if (this.lockerCoinEl) {
      this.lockerCoinEl.textContent = profile.coins.toLocaleString();
    }
    if (this.careerValEl) {
      this.careerValEl.textContent = `Lv. ${profile.careerLevel} ${profile.careerTitle}`;
    }
    this._loadPreviewSkin(profile.selectedSkin);
  }

  _initQuickSkinGrid() {
    const container = document.getElementById('skin-options');
    if (!container) return;

    const profile = this.profileManager.getProfile();
    container.innerHTML = '';

    GameConstants.PLAYER_SKINS.forEach((skin) => {
      const isUnlocked = profile.unlockedSkins.includes(skin.id);
      const isSelected = profile.selectedSkin === skin.id;

      const opt = document.createElement('div');
      opt.className = `skin-bubble ${isSelected ? 'selected' : ''} ${!isUnlocked ? 'locked' : ''}`;
      opt.style.backgroundColor = skin.color;
      opt.title = isUnlocked
        ? `${skin.name} (Unlocked - ${skin.outerLayer.toUpperCase()})`
        : `${skin.name} (Locked - 🪙 ${skin.price} coins)`;

      if (!isUnlocked) {
        opt.innerHTML = '<span style="font-size:11px; display:flex; align-items:center; justify-content:center; height:100%;">🔒</span>';
      }

      opt.addEventListener('click', async () => {
        if (isUnlocked) {
          document.querySelectorAll('.skin-bubble').forEach(b => b.classList.remove('selected'));
          opt.classList.add('selected');
          await this.profileManager.equipSkin(skin.id);
          this._loadPreviewSkin(skin.id);
          this._renderLockerGrid();
        } else {
          // Open locker to buy this skin
          this._loadPreviewSkin(skin.id);
          if (this.lockerModal) {
            this.lockerModal.style.display = 'flex';
            this._renderLockerGrid();
          }
        }
      });

      container.appendChild(opt);
    });
  }

  _renderLockerGrid() {
    if (!this.lockerGridEl) return;
    const profile = this.profileManager.getProfile();
    this.lockerGridEl.innerHTML = '';

    const filter = this.activeLockerTab;
    const skins = GameConstants.PLAYER_SKINS.filter(s => {
      if (filter === 'all') return true;
      return s.category.toLowerCase() === filter.toLowerCase();
    });

    skins.forEach(skin => {
      const isUnlocked = profile.unlockedSkins.includes(skin.id);
      const isSelected = profile.selectedSkin === skin.id;
      const card = document.createElement('div');
      card.className = `skin-card ${isSelected ? 'selected' : ''}`;

      const outerTag = skin.outerLayer === 'classic' ? 'Classic Rim' : `3D ${skin.outerLayer.toUpperCase()} Layer`;
      const canAfford = profile.coins >= skin.price;

      let footerHtml = '';
      if (isUnlocked) {
        const freeTag = skin.price === 0 ? '✓ FREE STARTER' : '✓ UNLOCKED';
        footerHtml = `
          <div class="skin-price">
            <span style="color:#2ecc71; font-weight:800;">${freeTag}</span>
          </div>
          <div>
            ${isSelected ?
              `<button class="btn-skin-action btn-equipped">EQUIPPED</button>` :
              `<button class="btn-skin-action btn-equip" data-equip="${skin.id}">EQUIP</button>`
            }
          </div>
        `;
      } else {
        footerHtml = `
          <div class="skin-price">
            <span style="color:#f1c40f; font-weight:800;">🪙 ${skin.price} Coins</span>
          </div>
          <div>
            ${canAfford ?
              `<button class="btn-skin-action btn-buy" data-unlock="${skin.id}">BUY 🪙 ${skin.price}</button>` :
              `<button class="btn-skin-action btn-locked" title="Play matches to earn coins!">NEED 🪙 ${skin.price}</button>`
            }
          </div>
        `;
      }

      card.innerHTML = `
        <div class="skin-card-header">
          <div class="skin-card-icon">${skin.icon}</div>
          <div>
            <div class="skin-card-title">${skin.name}</div>
            <div class="skin-card-tag">${outerTag}</div>
          </div>
        </div>
        <div class="skin-card-desc">${skin.desc}</div>
        <div class="skin-card-footer">
          ${footerHtml}
        </div>
      `;

      card.addEventListener('click', (e) => {
        if (!e.target.matches('button')) {
          this._loadPreviewSkin(skin.id);
        }
      });

      const equipBtn = card.querySelector('[data-equip]');
      if (equipBtn) {
        equipBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          await this.profileManager.equipSkin(skin.id);
          this._syncProfileUI();
          this._initQuickSkinGrid();
          this._renderLockerGrid();
        });
      }

      const unlockBtn = card.querySelector('[data-unlock]');
      if (unlockBtn) {
        unlockBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const res = await this.profileManager.unlockSkin(skin.id);
          if (res.success) {
            this._loadPreviewSkin(skin.id);
            this._syncProfileUI();
            this._initQuickSkinGrid();
            this._renderLockerGrid();
          } else {
            alert(res.message || 'Cannot unlock skin');
          }
        });
      }

      this.lockerGridEl.appendChild(card);
    });

    if (this.lockerCoinEl) {
      this.lockerCoinEl.textContent = profile.coins.toLocaleString();
    }
  }

  _renderCareerStats() {
    const profile = this.profileManager.getProfile();

    const rankTitleEl = document.getElementById('career-rank-title');
    const xpFillEl = document.getElementById('career-xp-bar-fill');
    const xpLabelEl = document.getElementById('career-xp-label');

    if (rankTitleEl) rankTitleEl.textContent = `Level ${profile.careerLevel}: ${profile.careerTitle}`;

    const nextLvlDef = GameConstants.CAREER_LEVELS.find(l => l.level === profile.careerLevel + 1);
    const curLvlDef = GameConstants.CAREER_LEVELS.find(l => l.level === profile.careerLevel) || GameConstants.CAREER_LEVELS[0];

    if (nextLvlDef && xpFillEl && xpLabelEl) {
      const curXp = profile.careerXp - curLvlDef.reqXp;
      const reqXp = nextLvlDef.reqXp - curLvlDef.reqXp;
      const pct = Math.max(0, Math.min(100, (curXp / reqXp) * 100));
      xpFillEl.style.width = `${pct}%`;
      xpLabelEl.textContent = `${profile.careerXp} / ${nextLvlDef.reqXp} Career XP`;
    } else if (xpFillEl && xpLabelEl) {
      xpFillEl.style.width = '100%';
      xpLabelEl.textContent = `${profile.careerXp} Career XP (MAX LEVEL)`;
    }

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = (val || 0).toLocaleString();
    };

    setVal('stat-matches', profile.stats.matchesPlayed);
    setVal('stat-wins', profile.stats.matchesWon);
    setVal('stat-kills', profile.stats.totalKills);
    setVal('stat-props', profile.stats.totalPropsSwallowed);
    setVal('stat-highscore', profile.stats.highestScore);
    setVal('stat-coins-earned', profile.coins);

    const achListEl = document.getElementById('achievements-list');
    if (achListEl) {
      achListEl.innerHTML = '';
      GameConstants.ACHIEVEMENTS.forEach(ach => {
        const isUnlocked = !!profile.achievements[ach.id];
        const card = document.createElement('div');
        card.className = `ach-card ${isUnlocked ? 'unlocked' : ''}`;

        card.innerHTML = `
          <div class="ach-card-info">
            <h4>${isUnlocked ? '✅ ' : '🔒 '}${ach.name}</h4>
            <p>${ach.desc}</p>
          </div>
          <div class="ach-card-reward">
            🪙 +${ach.rewardCoins} Coins
          </div>
        `;
        achListEl.appendChild(card);
      });
    }
  }

  showGame() {
    this.lobbyEl.style.display = 'none';
    this.gameOverEl.style.display = 'none';
    this.hudEl.style.display = 'block';
  }

  showLobby() {
    this.lobbyEl.style.display = 'flex';
    this.gameOverEl.style.display = 'none';
    this.hudEl.style.display = 'none';
    this._syncProfileUI();
  }

  updateHUD(data) {
    // Mode Label
    if (this.modeLabelEl && data.mode) {
      const modeDef = GameConstants.GAME_MODES[data.mode];
      this.modeLabelEl.textContent = modeDef ? `${modeDef.icon} ${modeDef.name}` : data.mode;
    }

    // Battle Royale Safe Zone Indicator
    if (this.zoneLabelEl) {
      if (data.mode === 'battle_royale' && typeof data.zone === 'number') {
        this.zoneLabelEl.style.display = 'flex';
        this.zoneLabelEl.textContent = `🔥 Safe Zone: ${data.zone}m`;
      } else {
        this.zoneLabelEl.style.display = 'none';
      }
    }

    // Monster Hunt Indicator
    if (this.monsterLabelEl) {
      if (data.mode === 'monster_hunt' && data.monsterId) {
        this.monsterLabelEl.style.display = 'flex';
      } else {
        this.monsterLabelEl.style.display = 'none';
      }
    }

    // Timer (Handle Endless mode)
    if (typeof data.timeLeft === 'number') {
      if (data.mode === 'endless') {
        this.timerEl.textContent = '♾️ ENDLESS';
        this.timerEl.classList.remove('urgent');
      } else {
        const mins = Math.floor(data.timeLeft / 60);
        const secs = data.timeLeft % 60;
        this.timerEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        if (data.timeLeft <= 15) {
          this.timerEl.classList.add('urgent');
        } else {
          this.timerEl.classList.remove('urgent');
        }
      }
    }

    if (typeof data.ping === 'number') {
      this.pingEl.textContent = `${data.ping} ms`;
    }

    if (data.roomId) {
      this.roomLabelEl.textContent = `Room: ${data.roomId}`;
    }

    if (typeof data.boostEnergy === 'number') {
      this.boostFillEl.style.width = `${Math.max(0, Math.min(100, data.boostEnergy))}%`;
      if (data.isBoosting) {
        this.boostFillEl.classList.add('boosting');
      } else {
        this.boostFillEl.classList.remove('boosting');
      }
    }

    if (data.levelTier) {
      this.levelBadgeEl.textContent = `LVL ${data.levelTier.level}`;
      this.levelNameEl.textContent = data.levelTier.name;

      if (data.nextTier) {
        const curXp = data.score - data.levelTier.minXp;
        const reqXp = data.nextTier.minXp - data.levelTier.minXp;
        const pct = Math.max(0, Math.min(100, (curXp / reqXp) * 100));
        this.xpFillEl.style.width = `${pct}%`;
        this.xpTextEl.textContent = `${data.score} / ${data.nextTier.minXp} XP`;
      } else {
        this.xpFillEl.style.width = '100%';
        this.xpTextEl.textContent = `${data.score} XP (MAX)`;
      }
    }

    if (data.leaderboard && this.leaderboardListEl) {
      this.leaderboardListEl.innerHTML = '';
      data.leaderboard.forEach(entry => {
        const row = document.createElement('div');
        const isSelf = entry.id === data.selfId;
        row.className = `lb-item ${isSelf ? 'is-self' : ''}`;

        const crown = entry.rank === 1 ? '👑 ' : `${entry.rank}. `;
        const botTag = entry.isBot ? ' 🤖' : '';
        const monsterTag = entry.isMonster ? ' 👾[MONSTER]' : '';
        row.innerHTML = `
          <span class="lb-name">${crown}${escapeHtml(entry.name)}${botTag}${monsterTag}</span>
          <span class="lb-score">${entry.score}</span>
        `;
        this.leaderboardListEl.appendChild(row);
      });
    }
  }

  showAnnouncement(text, subtext = '', duration = 2500) {
    if (!this.announcementEl) return;
    this.announcementEl.innerHTML = `
      <div class="ann-title">${text}</div>
      ${subtext ? `<div class="ann-sub">${subtext}</div>` : ''}
    `;
    this.announcementEl.classList.add('visible');

    if (this._annTimeout) clearTimeout(this._annTimeout);
    this._annTimeout = setTimeout(() => {
      this.announcementEl.classList.remove('visible');
    }, duration);
  }

  showGameOver(podium = [], selfId, selfStats = {}, rewards = null) {
    this.hudEl.style.display = 'none';
    this.gameOverEl.style.display = 'flex';

    const fillPodiumCard = (id, data, rank) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (!data) {
        el.style.opacity = '0.3';
        return;
      }
      el.style.opacity = '1';
      const isSelf = data.id === selfId;
      const crown = rank === 1 ? '👑' : rank === 2 ? '🥈' : '🥉';
      el.innerHTML = `
        <div class="podium-crown">${crown}</div>
        <div class="podium-name ${isSelf ? 'self-gold' : ''}">${escapeHtml(data.name)}</div>
        <div class="podium-score">${data.score} XP</div>
        <div class="podium-kills">⚔️ ${data.kills} Kills</div>
      `;
    };

    fillPodiumCard('podium-1st', podium[0], 1);
    fillPodiumCard('podium-2nd', podium[1], 2);
    fillPodiumCard('podium-3rd', podium[2], 3);

    const myRankEl = document.getElementById('self-final-rank');
    const myScoreEl = document.getElementById('self-final-score');
    const myKillsEl = document.getElementById('self-final-kills');
    const myLevelEl = document.getElementById('self-final-level');

    if (myRankEl) myRankEl.textContent = selfStats.rank ? `#${selfStats.rank}` : '-';
    if (myScoreEl) myScoreEl.textContent = `${selfStats.score || 0} XP`;
    if (myKillsEl) myKillsEl.textContent = `${selfStats.kills || 0}`;
    if (myLevelEl) myLevelEl.textContent = `Level ${selfStats.level || 1}`;

    if (rewards) {
      this.profileManager.updateFromMatchRewards(rewards);
      const coinsPill = document.getElementById('reward-coins-pill');
      const xpPill = document.getElementById('reward-xp-pill');
      const lvlPill = document.getElementById('reward-level-pill');

      if (coinsPill) coinsPill.textContent = `🪙 +${rewards.earnedCoins} Coins`;
      if (xpPill) xpPill.textContent = `⭐ +${rewards.earnedXp} Career XP`;
      if (lvlPill) {
        if (rewards.leveledUp) {
          lvlPill.textContent = `🎉 LEVEL UP! ${rewards.newTitle}`;
          lvlPill.style.display = 'block';
        } else {
          lvlPill.style.display = 'none';
        }
      }
    }
  }

  renderMinimap(selfPlayer, allEntities, worldSize = 700, gameMode = 'classic', zoneRadius = 0) {
    if (!this.miniMapCtx || !this.miniMapCanvas) return;
    const ctx = this.miniMapCtx;
    const w = this.miniMapCanvas.width;
    const h = this.miniMapCanvas.height;
    const half = worldSize / 2;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(0, 0, w, h);

    // Roads
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    const roads = [-220, -75, 75, 220];
    roads.forEach(r => {
      const rx = ((r + half) / worldSize) * w;
      ctx.beginPath();
      ctx.moveTo(rx, 0);
      ctx.lineTo(rx, h);
      ctx.stroke();

      const rz = ((r + half) / worldSize) * h;
      ctx.beginPath();
      ctx.moveTo(0, rz);
      ctx.lineTo(w, rz);
      ctx.stroke();
    });

    // Battle Royale Safe Zone Ring on Mini-map
    if (gameMode === 'battle_royale' && zoneRadius > 0) {
      const centerMapX = w / 2;
      const centerMapZ = h / 2;
      const mapZoneR = (zoneRadius / worldSize) * w;

      ctx.strokeStyle = '#ff0055';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerMapX, centerMapZ, mapZoneR, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Entities
    if (allEntities) {
      allEntities.forEach(ent => {
        if (!ent.alive) return;
        const ex = ((ent.x + half) / worldSize) * w;
        const ez = ((ent.z + half) / worldSize) * h;
        const isSelf = selfPlayer && ent.id === selfPlayer.id;

        if (isSelf) {
          ctx.fillStyle = '#00f2fe';
          ctx.beginPath();
          ctx.arc(ex, ez, 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else if (ent.mst) {
          // Kaiju Monster is big glowing yellow/red dot
          ctx.fillStyle = '#ffd700';
          ctx.beginPath();
          ctx.arc(ex, ez, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ff0000';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else {
          const isDanger = selfPlayer && ent.radius > selfPlayer.radius * 1.15;
          ctx.fillStyle = isDanger ? '#ff3344' : '#2ecc71';
          ctx.beginPath();
          ctx.arc(ex, ez, Math.max(2, (ent.radius / 15) * 5), 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0, 0, w, h);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
