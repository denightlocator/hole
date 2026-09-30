const fs = require('fs');
const path = require('path');
const { PLAYER_SKINS, CAREER_LEVELS, ACHIEVEMENTS } = require('../shared/constants');

const DATA_FILE = path.join(__dirname, 'data/players.json');

class ProgressStore {
  constructor() {
    this.profiles = new Map();
    this._load();
  }

  _load() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        for (const [key, val] of Object.entries(parsed)) {
          this.profiles.set(key.toLowerCase(), val);
        }
        console.log(`[ProgressStore] Loaded ${this.profiles.size} player profiles`);
      }
    } catch (err) {
      console.error('[ProgressStore] Load error:', err.message);
    }
  }

  _save() {
    try {
      const dir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const obj = {};
      for (const [k, v] of this.profiles.entries()) {
        obj[k] = v;
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2), 'utf8');
    } catch (err) {
      console.error('[ProgressStore] Save error:', err.message);
    }
  }

  getProfile(name = 'Player') {
    const key = name.trim().toLowerCase();
    const starterSkins = PLAYER_SKINS.filter(s => s.price === 0).map(s => s.id);

    if (!this.profiles.has(key)) {
      const newProfile = {
        username: name.trim(),
        coins: 200, // Starter bonus coins to get players started
        careerXp: 0,
        careerLevel: 1,
        careerTitle: CAREER_LEVELS[0].title,
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
      this.profiles.set(key, newProfile);
      this._save();
    } else {
      // Ensure starter skins are always unlocked
      const p = this.profiles.get(key);
      starterSkins.forEach(id => {
        if (!p.unlockedSkins.includes(id)) p.unlockedSkins.push(id);
      });
    }
    return this.profiles.get(key);
  }

  recordMatchResult(name, stats = {}) {
    const profile = this.getProfile(name);
    const score = stats.score || 0;
    const kills = stats.kills || 0;
    const rank = stats.rank || 10;
    const propsCount = stats.propsCount || Math.floor(score / 8);

    // 1. Calculate rewards
    const baseCoins = Math.floor(score / 10);
    const rankBonus = rank === 1 ? 150 : rank === 2 ? 80 : rank === 3 ? 40 : 15;
    const killBonus = kills * 30;
    const earnedCoins = baseCoins + rankBonus + killBonus;

    const earnedXp = score;

    // 2. Update profile
    profile.coins += earnedCoins;
    profile.careerXp += earnedXp;

    profile.stats.matchesPlayed += 1;
    if (rank === 1) profile.stats.matchesWon += 1;
    profile.stats.totalKills += kills;
    profile.stats.totalPropsSwallowed += propsCount;
    if (score > profile.stats.highestScore) {
      profile.stats.highestScore = score;
    }

    // 3. Update Career Level
    let newLevel = 1;
    let newTitle = CAREER_LEVELS[0].title;
    for (let i = CAREER_LEVELS.length - 1; i >= 0; i--) {
      if (profile.careerXp >= CAREER_LEVELS[i].reqXp) {
        newLevel = CAREER_LEVELS[i].level;
        newTitle = CAREER_LEVELS[i].title;
        break;
      }
    }
    const leveledUp = newLevel > profile.careerLevel;
    profile.careerLevel = newLevel;
    profile.careerTitle = newTitle;

    // 4. Check Achievements
    const newAchievements = [];
    for (const ach of ACHIEVEMENTS) {
      if (profile.achievements[ach.id]) continue; // already earned

      let unlocked = false;
      if (ach.id === 'first_bite' && profile.stats.totalPropsSwallowed >= ach.goal) unlocked = true;
      if (ach.id === 'hole_hunter' && profile.stats.totalKills >= ach.goal) unlocked = true;
      if (ach.id === 'first_win' && profile.stats.matchesWon >= ach.goal) unlocked = true;
      if (ach.id === 'level_six' && stats.level >= 6) unlocked = true;
      if (ach.id === 'skyscraper_eater' && stats.hasEatenSkyscraper) unlocked = true;
      if (ach.id === 'coin_hoarder' && profile.coins >= ach.goal) unlocked = true;
      if (ach.id === 'match_veteran' && profile.stats.matchesPlayed >= ach.goal) unlocked = true;

      if (unlocked) {
        profile.achievements[ach.id] = Date.now();
        profile.coins += ach.rewardCoins;
        newAchievements.push(ach);
      }
    }

    this._save();

    return {
      earnedCoins,
      earnedXp,
      leveledUp,
      newLevel,
      newTitle,
      newAchievements,
      profile
    };
  }

  unlockSkin(name, skinId) {
    const profile = this.getProfile(name);
    if (profile.unlockedSkins.includes(skinId)) {
      return { success: true, message: 'Already unlocked', profile };
    }

    const skinDef = PLAYER_SKINS.find(s => s.id === skinId);
    if (!skinDef) {
      return { success: false, message: 'Invalid skin' };
    }

    if (profile.coins < skinDef.price) {
      return {
        success: false,
        message: `Not enough coins! Needs ${skinDef.price} coins (you have ${profile.coins})`
      };
    }

    profile.coins -= skinDef.price;
    profile.unlockedSkins.push(skinId);
    profile.selectedSkin = skinId;
    this._save();

    return { success: true, profile };
  }

  equipSkin(name, skinId) {
    const profile = this.getProfile(name);
    if (!profile.unlockedSkins.includes(skinId)) {
      return { success: false, message: 'Skin not unlocked yet' };
    }

    profile.selectedSkin = skinId;
    this._save();

    return { success: true, profile };
  }
}

module.exports = new ProgressStore();
