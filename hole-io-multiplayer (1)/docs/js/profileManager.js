const GameConstants = window.GameConstants || {};

const STORAGE_KEY = 'hole_io_user_profile_v2';

export class ProfileManager {
  constructor() {
    this.profile = this._loadLocal();
  }

  _getStarterSkins() {
    if (window.GameConstants && Array.isArray(window.GameConstants.PLAYER_SKINS)) {
      return window.GameConstants.PLAYER_SKINS.filter(s => s.price === 0).map(s => s.id);
    }
    return ['peppa-pig', 'neon-cyan', 'neon-pink', 'toxic-lime'];
  }

  _loadLocal() {
    const starterSkins = this._getStarterSkins();

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.username) {
          if (!Array.isArray(parsed.unlockedSkins)) parsed.unlockedSkins = [...starterSkins];
          starterSkins.forEach(id => {
            if (!parsed.unlockedSkins.includes(id)) parsed.unlockedSkins.push(id);
          });
          if (!parsed.selectedSkin) parsed.selectedSkin = 'peppa-pig';
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[ProfileManager] LocalStorage load error', e);
    }

    // Default new profile (starts with 200 coins + 4 free starter skins including Peppa Pig!)
    const defaultProfile = {
      username: 'VoidMaster',
      coins: 200,
      careerXp: 0,
      careerLevel: 1,
      careerTitle: 'Street Puddle',
      selectedSkin: 'peppa-pig',
      unlockedSkins: [...starterSkins],
      stats: {
        matchesPlayed: 0,
        matchesWon: 0,
        totalKills: 0,
        totalPropsSwallowed: 0,
        highestScore: 0
      },
      achievements: {}
    };
    this._saveLocal(defaultProfile);
    return defaultProfile;
  }

  _saveLocal(profile) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch (e) {
      console.warn('[ProfileManager] LocalStorage save error', e);
    }
  }

  getProfile() {
    return this.profile;
  }

  setUsername(name) {
    if (!name) return;
    this.profile.username = name.slice(0, 15);
    this._saveLocal(this.profile);
    this.syncWithServer(this.profile.username);
  }

  async syncWithServer(name = this.profile.username) {
    try {
      const res = await fetch(`/api/profile?name=${encodeURIComponent(name)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.profile) {
          const s = data.profile;
          this.profile.coins = Math.max(this.profile.coins, s.coins || 0);
          this.profile.careerXp = Math.max(this.profile.careerXp, s.careerXp || 0);
          this.profile.careerLevel = Math.max(this.profile.careerLevel, s.careerLevel || 1);
          this.profile.careerTitle = s.careerTitle || this.profile.careerTitle;

          // Merge unlocked skins
          if (Array.isArray(s.unlockedSkins)) {
            s.unlockedSkins.forEach(id => {
              if (!this.profile.unlockedSkins.includes(id)) {
                this.profile.unlockedSkins.push(id);
              }
            });
          }

          if (s.selectedSkin && this.profile.unlockedSkins.includes(s.selectedSkin)) {
            this.profile.selectedSkin = s.selectedSkin;
          }

          // Merge stats
          if (s.stats) {
            this.profile.stats.matchesPlayed = Math.max(this.profile.stats.matchesPlayed, s.stats.matchesPlayed || 0);
            this.profile.stats.matchesWon = Math.max(this.profile.stats.matchesWon, s.stats.matchesWon || 0);
            this.profile.stats.totalKills = Math.max(this.profile.stats.totalKills, s.stats.totalKills || 0);
            this.profile.stats.totalPropsSwallowed = Math.max(this.profile.stats.totalPropsSwallowed, s.stats.totalPropsSwallowed || 0);
            this.profile.stats.highestScore = Math.max(this.profile.stats.highestScore, s.stats.highestScore || 0);
          }

          if (s.achievements) {
            this.profile.achievements = { ...this.profile.achievements, ...s.achievements };
          }

          this._saveLocal(this.profile);
        }
      }
    } catch (err) {
      console.warn('[ProfileManager] Server sync failed (offline / network error)', err.message);
    }
    return this.profile;
  }

  async unlockSkin(skinId) {
    if (this.profile.unlockedSkins.includes(skinId)) {
      return { success: true, profile: this.profile };
    }

    const skinsList = (window.GameConstants && window.GameConstants.PLAYER_SKINS) || [];
    const skinDef = skinsList.find(s => s.id === skinId);
    if (!skinDef) return { success: false, message: 'Skin not found' };

    if (this.profile.coins < skinDef.price) {
      return {
        success: false,
        message: `Need ${skinDef.price - this.profile.coins} more coins! Play matches to earn coins.`
      };
    }

    // Local deduction
    this.profile.coins -= skinDef.price;
    this.profile.unlockedSkins.push(skinId);
    this.profile.selectedSkin = skinId;
    this._saveLocal(this.profile);

    // Sync with server
    try {
      const res = await fetch('/api/profile/unlock-skin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: this.profile.username, skinId })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.profile) {
          this.profile.coins = data.profile.coins;
          this.profile.unlockedSkins = data.profile.unlockedSkins;
          this._saveLocal(this.profile);
        }
      }
    } catch (e) {
      console.warn('[ProfileManager] Server unlock sync failed', e);
    }

    return { success: true, profile: this.profile };
  }

  async equipSkin(skinId) {
    if (!this.profile.unlockedSkins.includes(skinId)) {
      return { success: false, message: 'Skin not unlocked yet' };
    }

    this.profile.selectedSkin = skinId;
    this._saveLocal(this.profile);

    try {
      await fetch('/api/profile/equip-skin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: this.profile.username, skinId })
      });
    } catch (e) {
      console.warn('[ProfileManager] Server equip sync failed', e);
    }

    return { success: true, profile: this.profile };
  }

  updateFromMatchRewards(rewards) {
    if (!rewards) return;
    if (typeof rewards.earnedCoins === 'number') {
      this.profile.coins += rewards.earnedCoins;
    }
    if (typeof rewards.earnedXp === 'number') {
      this.profile.careerXp += rewards.earnedXp;
    }
    if (rewards.newLevel) {
      this.profile.careerLevel = rewards.newLevel;
      this.profile.careerTitle = rewards.newTitle || this.profile.careerTitle;
    }
    if (rewards.profile) {
      this.profile.stats = rewards.profile.stats || this.profile.stats;
      this.profile.achievements = rewards.profile.achievements || this.profile.achievements;
    }
    this._saveLocal(this.profile);
  }
}
