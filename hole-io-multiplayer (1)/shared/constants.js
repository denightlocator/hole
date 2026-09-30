// Shared constants between Server and Client
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.GameConstants = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const WORLD_SIZE = 700; // -350 to +350 (Massive map size!)
  const TICK_RATE = 20; // 20 updates per second (50ms interval)
  const MAX_PLAYERS = 14;
  const TARGET_ENTITIES = 12; // players + bots
  const MATCH_DURATION = 120; // 2 minutes per match
  const POST_MATCH_DURATION = 10; // 10 seconds podium

  // GAME MODES
  const GAME_MODES = {
    classic: {
      id: 'classic',
      name: 'Classic Match',
      desc: '2-Minute fast-paced competitive round. Devour the city and reach the top of the podium!',
      icon: '⏱️',
      hasTimer: true,
      duration: 120
    },
    battle_royale: {
      id: 'battle_royale',
      name: 'Battle Royale',
      desc: 'Shrinking ring of death! Avoid being trapped outside the safe zone and be the last hole standing!',
      icon: '🔥',
      hasTimer: true,
      duration: 140,
      hasShrinkingZone: true
    },
    endless: {
      id: 'endless',
      name: 'Endless Sandbox',
      desc: 'No time limit! Continuous prop respawns. Grow into a massive universe-eating singularity!',
      icon: '♾️',
      hasTimer: false,
      duration: 0
    },
    monster_hunt: {
      id: 'monster_hunt',
      name: 'Monster Hunt',
      desc: 'One hole spawns as a giant Kaiju Monster with 3x size! Team up to devour the Monster or survive!',
      icon: '👾',
      hasTimer: true,
      duration: 120,
      hasJuggernaut: true
    }
  };

  // MASSIVE MAP TYPES
  const MAP_TYPES = {
    metropolis: {
      id: 'metropolis',
      name: 'Mega Metropolis',
      icon: '🏙️',
      desc: 'Massive downtown skyline with twin towers, 50+ skyscrapers, avenues & financial center',
      skyColor: 0x87ceeb,
      fogColor: 0x87ceeb,
      ambientColor: 0xffffff,
      sunColor: 0xfff5e6,
      groundColor: 0x3d9940
    },
    airport_resort: {
      id: 'airport_resort',
      name: 'International Airport & Resort',
      icon: '✈️',
      desc: 'Gigantic airport runway with commercial passenger jets, terminal gates, control towers & yacht marina',
      skyColor: 0x64b5f6,
      fogColor: 0x90caf9,
      ambientColor: 0xffffff,
      sunColor: 0xfffde7,
      groundColor: 0x4caf50
    },
    amusement_park: {
      id: 'amusement_park',
      name: 'Wonderland Carnival & Mega Park',
      icon: '🎡',
      desc: 'Massive amusement festival with giant Ferris wheels, circus big-tops, windmills, barns & lakes',
      skyColor: 0x81d4fa,
      fogColor: 0xb3e5fc,
      ambientColor: 0xffffff,
      sunColor: 0xfffae6,
      groundColor: 0x48b04b
    },
    suburbs: {
      id: 'suburbs',
      name: 'Sunny Suburbs & Countryside',
      icon: '🏡',
      desc: 'Sprawling residential neighborhood with 60+ houses, farm barns, windmills, gardens & gazebos',
      skyColor: 0x74b9ff,
      fogColor: 0x74b9ff,
      ambientColor: 0xffffff,
      sunColor: 0xfffae6,
      groundColor: 0x5cb85c
    },
    cyberpunk: {
      id: 'cyberpunk',
      name: 'Neo-Tokyo Cyber Megacity',
      icon: '🌃',
      desc: 'Futuristic night metropolis, neon grid highways, cargo harbor docks & mega-corporation towers',
      skyColor: 0x080816,
      fogColor: 0x0a0c1b,
      ambientColor: 0x334466,
      sunColor: 0x00f2fe,
      groundColor: 0x1e272e
    }
  };

  const LEVEL_TIERS = [
    { level: 1, name: "Tiny Puddle",   minXp: 0,    radius: 1.8, speed: 18.0, camDist: 34, camHeight: 40 },
    { level: 2, name: "Street Drain",   minXp: 35,   radius: 2.5, speed: 17.0, camDist: 42, camHeight: 48 },
    { level: 3, name: "Sinkhole",       minXp: 95,   radius: 3.4, speed: 16.0, camDist: 52, camHeight: 58 },
    { level: 4, name: "Urban Abyss",    minXp: 200,  radius: 4.6, speed: 15.0, camDist: 66, camHeight: 70 },
    { level: 5, name: "Earth Maw",      minXp: 380,  radius: 6.2, speed: 14.0, camDist: 82, camHeight: 84 },
    { level: 6, name: "City Devourer",  minXp: 650,  radius: 8.4, speed: 13.0, camDist: 102, camHeight: 100 },
    { level: 7, name: "Tectonic Rift",  minXp: 1050, radius: 11.5, speed: 12.0, camDist: 128, camHeight: 122 },
    { level: 8, name: "Black Hole",     minXp: 1600, radius: 15.5, speed: 11.0, camDist: 158, camHeight: 145 },
    { level: 9, name: "Cosmic Singularity", minXp: 2400, radius: 21.0, speed: 10.5, camDist: 195, camHeight: 175 }
  ];

  const PROP_DEFS = {
    CONE:           { key: 'CONE',           name: 'Traffic Cone',    radius: 0.5, height: 0.9,  xp: 4,   minRadius: 1.0, color: 0xff6600 },
    TRASH_CAN:      { key: 'TRASH_CAN',      name: 'Trash Can',       radius: 0.6, height: 1.2,  xp: 6,   minRadius: 1.2, color: 0x4a7550 },
    HYDRANT:        { key: 'HYDRANT',        name: 'Fire Hydrant',    radius: 0.6, height: 1.1,  xp: 7,   minRadius: 1.2, color: 0xdd2222 },
    PEDESTRIAN:     { key: 'PEDESTRIAN',     name: 'Pedestrian',      radius: 0.7, height: 1.7,  xp: 12,  minRadius: 1.3, color: 0xffd1a4, isDynamic: true },
    BENCH:          { key: 'BENCH',          name: 'Park Bench',      radius: 1.0, height: 0.8,  xp: 14,  minRadius: 1.8, color: 0x8b5a2b },
    MAILBOX:        { key: 'MAILBOX',        name: 'Mailbox',         radius: 0.7, height: 1.3,  xp: 10,  minRadius: 1.5, color: 0x2255bb },
    BUSH:           { key: 'BUSH',           name: 'Bush',            radius: 1.1, height: 1.1,  xp: 14,  minRadius: 1.9, color: 0x2e8b57 },
    FENCE:          { key: 'FENCE',          name: 'Picket Fence',    radius: 1.2, height: 1.2,  xp: 16,  minRadius: 2.0, color: 0xdedede },
    STREET_LAMP:    { key: 'STREET_LAMP',    name: 'Street Lamp',     radius: 0.9, height: 4.5,  xp: 20,  minRadius: 2.2, color: 0x333333 },
    TRAFFIC_LIGHT:  { key: 'TRAFFIC_LIGHT',  name: 'Traffic Light',   radius: 0.9, height: 4.8,  xp: 22,  minRadius: 2.3, color: 0x222222 },
    MOTORCYCLE:     { key: 'MOTORCYCLE',     name: 'Motorcycle',      radius: 1.3, height: 1.3,  xp: 25,  minRadius: 2.4, color: 0xff3344 },
    SMALL_TREE:     { key: 'SMALL_TREE',     name: 'Small Tree',      radius: 1.5, height: 4.0,  xp: 30,  minRadius: 2.7, color: 0x228b22 },
    CAR:            { key: 'CAR',            name: 'Sedan Car',       radius: 2.0, height: 1.5,  xp: 45,  minRadius: 3.2, color: 0x3498db, isVehicle: true },
    POLICE_CAR:     { key: 'POLICE_CAR',     name: 'Police Car',      radius: 2.1, height: 1.6,  xp: 50,  minRadius: 3.3, color: 0x111111, isVehicle: true },
    SUV:            { key: 'SUV',            name: 'SUV',             radius: 2.4, height: 1.8,  xp: 60,  minRadius: 3.7, color: 0xe67e22, isVehicle: true },
    LARGE_TREE:     { key: 'LARGE_TREE',     name: 'Oak Tree',        radius: 2.5, height: 6.8,  xp: 65,  minRadius: 3.9, color: 0x196f3d },
    KIOSK:          { key: 'KIOSK',          name: 'Newsstand Kiosk', radius: 2.2, height: 2.6,  xp: 70,  minRadius: 3.8, color: 0xd35400 },
    VAN:            { key: 'VAN',            name: 'Delivery Van',    radius: 2.7, height: 2.3,  xp: 80,  minRadius: 4.3, color: 0xf1c40f, isVehicle: true },
    GAZEBO:         { key: 'GAZEBO',         name: 'Park Gazebo',     radius: 2.9, height: 3.2,  xp: 90,  minRadius: 4.6, color: 0xbdc3c7 },
    YACHT:          { key: 'YACHT',          name: 'Luxury Yacht',    radius: 4.0, height: 3.5,  xp: 180, minRadius: 6.5, color: 0xffffff },
    BUS:            { key: 'BUS',            name: 'City Bus',        radius: 3.8, height: 3.0,  xp: 130, minRadius: 5.8, color: 0x2980b9, isVehicle: true },
    FOUNTAIN:       { key: 'FOUNTAIN',       name: 'Plaza Fountain',  radius: 3.6, height: 2.2,  xp: 120, minRadius: 5.4, color: 0x5dade2 },
    HOUSE_SMALL:    { key: 'HOUSE_SMALL',    name: 'Suburban House',  radius: 4.2, height: 5.5,  xp: 160, minRadius: 6.4, color: 0xe74c3c },
    GAS_STATION:    { key: 'GAS_STATION',    name: 'Gas Station',     radius: 5.0, height: 4.5,  xp: 220, minRadius: 7.5, color: 0x9b59b6 },
    BARN:           { key: 'BARN',           name: 'Rustic Barn',     radius: 6.0, height: 7.5,  xp: 280, minRadius: 8.0, color: 0xc0392b },
    WINDMILL:       { key: 'WINDMILL',       name: 'Windmill Tower',  radius: 4.5, height: 18.0, xp: 300, minRadius: 7.5, color: 0xecf0f1 },
    HOUSE_LARGE:    { key: 'HOUSE_LARGE',    name: 'Mansion',         radius: 5.6, height: 7.0,  xp: 270, minRadius: 8.2, color: 0x16a085 },
    BUILDING_MID:   { key: 'BUILDING_MID',   name: 'Office Building', radius: 6.8, height: 13.0, xp: 400, minRadius: 9.8, color: 0x7f8c8d },
    CIRCUS_TENT:    { key: 'CIRCUS_TENT',    name: 'Circus Big-Top',  radius: 7.5, height: 12.0, xp: 450, minRadius: 10.0, color: 0xffcc00 },
    WAREHOUSE:      { key: 'WAREHOUSE',      name: 'Cargo Warehouse', radius: 7.8, height: 8.5,  xp: 450, minRadius: 11.0, color: 0x95a5a6 },
    CRANE:          { key: 'CRANE',          name: 'Tower Crane',     radius: 6.5, height: 24.0, xp: 380, minRadius: 10.0, color: 0xf39c12 },
    FERRIS_WHEEL:   { key: 'FERRIS_WHEEL',   name: 'Giant Ferris Wheel', radius: 8.0, height: 22.0, xp: 550, minRadius: 11.0, color: 0xff3366 },
    AIRPLANE:       { key: 'AIRPLANE',       name: 'Passenger Jet Plane', radius: 6.5, height: 4.5, xp: 380, minRadius: 8.5, color: 0xffffff },
    CONTROL_TOWER:  { key: 'CONTROL_TOWER',  name: 'Airport Control Tower', radius: 5.0, height: 28.0, xp: 480, minRadius: 9.0, color: 0xbdc3c7 },
    AIRPORT_TERMINAL:{ key: 'AIRPORT_TERMINAL', name: 'Airport Terminal Gate', radius: 10.0, height: 8.0, xp: 650, minRadius: 12.5, color: 0x7f8c8d },
    APARTMENT_TOWER:{ key: 'APARTMENT_TOWER',name: 'Apartment Tower', radius: 9.2, height: 22.0, xp: 650, minRadius: 13.5, color: 0x34495e },
    SKYSCRAPER:     { key: 'SKYSCRAPER',     name: 'Mega Skyscraper', radius: 12.5, height: 35.0, xp: 1100, minRadius: 17.5, color: 0x2c3e50 },
    TWIN_TOWER:     { key: 'TWIN_TOWER',     name: 'Twin Titan Tower', radius: 14.0, height: 45.0, xp: 1400, minRadius: 18.5, color: 0x2c3e50 }
  };

  // CUSTOM SKINS WITH 3D OUTER LAYERS (BUYABLE WITH COINS!)
  const PLAYER_SKINS = [
    {
      id: 'peppa-pig',
      name: 'Peppa Pig',
      icon: '🐷',
      category: 'Character',
      color: '#ff9ebb',
      hex: 0xff9ebb,
      secondaryHex: 0xff4081,
      outerLayer: 'peppa',
      desc: 'Muddy puddle lover with 3D piggy ears, snout & blushing cheeks',
      price: 0, // Starter unlocked!
      isStarter: true
    },
    {
      id: 'neon-cyan',
      name: 'Cyber Cyan',
      icon: '🔷',
      category: 'Classic',
      color: '#00f2fe',
      hex: 0x00f2fe,
      outerLayer: 'classic',
      desc: 'Pure neon cyan event horizon aura',
      price: 0,
      isStarter: true
    },
    {
      id: 'neon-pink',
      name: 'Neon Pink',
      icon: '💖',
      category: 'Classic',
      color: '#ff007f',
      hex: 0xff007f,
      outerLayer: 'classic',
      desc: 'Vibrant neon fuchsia event horizon',
      price: 0,
      isStarter: true
    },
    {
      id: 'toxic-lime',
      name: 'Toxic Lime',
      icon: '🧪',
      category: 'Classic',
      color: '#39ff14',
      hex: 0x39ff14,
      outerLayer: 'classic',
      desc: 'Radioactive green hazard horizon',
      price: 0,
      isStarter: true
    },
    {
      id: 'dora',
      name: 'Dora Explorer',
      icon: '🎒',
      category: 'Character',
      color: '#f39c12',
      hex: 0xf39c12,
      secondaryHex: 0x8e44ad,
      outerLayer: 'dora',
      desc: '3D explorer bob haircut, purple backpack charm & star badge',
      price: 150,
      isStarter: false
    },
    {
      id: 'rose-bloom',
      name: 'Rose Bloom',
      icon: '🌹',
      category: 'Nature',
      color: '#e74c3c',
      hex: 0xe74c3c,
      secondaryHex: 0x27ae60,
      outerLayer: 'rose',
      desc: 'Rich 3D blooming crimson rose petals and thorny green leaves',
      price: 250,
      isStarter: false
    },
    {
      id: 'anime-neko',
      name: 'Anime Neko',
      icon: '🐱',
      category: 'Anime',
      color: '#ff7675',
      hex: 0xff7675,
      secondaryHex: 0xfd79a8,
      outerLayer: 'neko',
      desc: 'Kawaii anime catgirl with 3D fluffy cat ears, whiskers & heart crest',
      price: 350,
      isStarter: false
    },
    {
      id: 'anime-saiyan',
      name: 'Anime Saiyan',
      icon: '⚡',
      category: 'Anime',
      color: '#ffd700',
      hex: 0xffd700,
      secondaryHex: 0xff9f43,
      outerLayer: 'saiyan',
      desc: 'Blazing 3D golden ki flame spikes & crackling aura energy',
      price: 500,
      isStarter: false
    },
    {
      id: 'imperial-crown',
      name: 'Royal Crown',
      icon: '👑',
      category: 'Mythic',
      color: '#f1c40f',
      hex: 0xf1c40f,
      secondaryHex: 0xc0392b,
      outerLayer: 'crown',
      desc: 'Imperial golden crown battlement with ruby and sapphire jewels',
      price: 650,
      isStarter: false
    },
    {
      id: 'cyber-dragon',
      name: 'Cyber Dragon',
      icon: '🐉',
      category: 'Mythic',
      color: '#00f2fe',
      hex: 0x00f2fe,
      secondaryHex: 0x0984e3,
      outerLayer: 'dragon',
      desc: 'Plasma dragon horns & sharp dorsal spine plates',
      price: 800,
      isStarter: false
    },
    {
      id: 'cosmic-galaxy',
      name: 'Cosmic Galaxy',
      icon: '🌌',
      category: 'Space',
      color: '#a29bfe',
      hex: 0xa29bfe,
      secondaryHex: 0x6c5ce7,
      outerLayer: 'galaxy',
      desc: 'Encircled by 3D planetary rings and miniature orbiting moons',
      price: 1000,
      isStarter: false
    }
  ];

  // CAREER LEVEL DEFINITIONS (Lifetime XP)
  const CAREER_LEVELS = [
    { level: 1, title: 'Street Puddle', reqXp: 0 },
    { level: 2, title: 'Curbside Drain', reqXp: 200 },
    { level: 3, title: 'Alley Sinkhole', reqXp: 600 },
    { level: 4, title: 'Park Devourer', reqXp: 1200 },
    { level: 5, title: 'Suburban Menace', reqXp: 2000 },
    { level: 6, title: 'Commercial Maw', reqXp: 3200 },
    { level: 7, title: 'Downtown Chasm', reqXp: 4800 },
    { level: 8, title: 'Skyscraper Slayer', reqXp: 7000 },
    { level: 9, title: 'Metropolis Eater', reqXp: 10000 },
    { level: 10, title: 'Continental Abyss', reqXp: 14000 },
    { level: 12, title: 'Tectonic Overlord', reqXp: 20000 },
    { level: 15, title: 'Planetary Rift', reqXp: 30000 },
    { level: 20, title: 'Cosmic Singularity Deity', reqXp: 50000 }
  ];

  // CAREER ACHIEVEMENTS
  const ACHIEVEMENTS = [
    { id: 'first_bite', name: 'First Bite', desc: 'Devour your first 25 city props', goal: 25, rewardCoins: 50 },
    { id: 'hole_hunter', name: 'Apex Predator', desc: 'Devour 3 opponent holes in matches', goal: 3, rewardCoins: 100 },
    { id: 'first_win', name: 'Champion of the City', desc: 'Claim 1st place on the match podium', goal: 1, rewardCoins: 200 },
    { id: 'level_six', name: 'City Devourer', desc: 'Reach in-game Level 6 during a match', goal: 1, rewardCoins: 150 },
    { id: 'skyscraper_eater', name: 'Skyfall', desc: 'Devour a massive skyscraper or tower', goal: 1, rewardCoins: 250 },
    { id: 'match_veteran', name: 'Urban Veteran', desc: 'Complete 10 multiplayer matches', goal: 10, rewardCoins: 400 }
  ];

  const BOT_NAMES = [
    'VoidWalker', 'BlackHole99', 'SnackMonster', 'HungryGraviton',
    'QuantumRift', 'AbyssalBeast', 'MegaGulper', 'HorizonEater',
    'Chompzilla', 'SingularityX', 'GraviTitan', 'VortexKing',
    'DarkMatter', 'CityNommer', 'ShadowPit', 'EventHorizon'
  ];

  return {
    WORLD_SIZE,
    TICK_RATE,
    MAX_PLAYERS,
    TARGET_ENTITIES,
    MATCH_DURATION,
    POST_MATCH_DURATION,
    GAME_MODES,
    MAP_TYPES,
    LEVEL_TIERS,
    PROP_DEFS,
    PLAYER_SKINS,
    CAREER_LEVELS,
    ACHIEVEMENTS,
    BOT_NAMES
  };
}));
