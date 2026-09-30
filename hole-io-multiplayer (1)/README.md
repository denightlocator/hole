# 🕳️ Hole.io 3D Multiplayer

> An open-source, real-time multiplayer 3D urban devourer game inspired by Hole.io. Built with **Node.js**, **WebSockets**, and **Three.js** (WebGL). Designed for fast-paced 10-14 player matches with dynamic AI bots, massive 700×700 maps, deep progression, and an arcade 3D perspective.
> 
> **🎮 Dual-Play Architecture**: Plays seamlessly online as a **GitHub Pages** web game (with smart client-side bots) AND as a full real-time **WebSocket Multiplayer Server** when hosted with Node.js!

[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org)
[![Three.js](https://img.shields.io/badge/Three.js-r186-black.svg)](https://threejs.org)
[![WebSockets](https://img.shields.io/badge/WebSockets-ws-blue.svg)](https://github.com/websockets/ws)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Ready-brightgreen.svg)](https://pages.github.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## ⚡ How to Put on GitHub & Play in 2 Minutes

### Option 1: Play Directly on GitHub Pages (Free Instant Web Game)

You can host and play this game directly on GitHub without running any server:

1. **Create a GitHub Repository**:
   - Go to [GitHub](https://github.com/new) and create a new repository (e.g. `hole-io-multiplayer`).
2. **Upload or Push the Project**:
   - Unzip `hole-io-multiplayer.zip` on your computer.
   - Push the files to your repository:
     ```bash
     git init
     git add .
     git commit -m "Initial commit of Hole.io 3D"
     git branch -M main
     git remote add origin https://github.com/YOUR_USERNAME/hole-io-multiplayer.git
     git push -u origin main
     ```
   - *(Or drag-and-drop the extracted files into GitHub's web interface).*
3. **Enable GitHub Pages**:
   - In your GitHub repo, go to **Settings** ⚙️ ➔ **Pages** (in the left sidebar).
   - Under **Build and deployment** ➔ **Source**, select **Deploy from a branch**.
   - Under **Branch**, select **`main`** and choose the **`/docs`** (or `/root`) folder, then click **Save**.
4. **Play!**
   - GitHub will generate your live game link:  
     `https://YOUR_USERNAME.github.io/hole-io-multiplayer/`
   - Open that URL in your browser and play right away!

---

### Option 2: Run with Real-Time Multiplayer (Node.js & WebSockets)

To play real-time internet multiplayer with friends across multiple computers or tabs:

1. **Extract and open terminal**:
   ```bash
   cd hole-io-multiplayer
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Start the server**:
   ```bash
   npm start
   ```
4. **Play**:
   - Open `http://localhost:3000` in any web browser.
   - Open multiple browser tabs or share your IP with friends on your local network to play together in real time!

---

### Option 3: Deploy to Free Cloud Hosts (Render, Railway, Glitch)

1. Connect your GitHub repository to [Render.com](https://render.com) or [Railway.app](https://railway.app).
2. Set Build Command: `npm install`
3. Set Start Command: `npm start`
4. You now have a live 24/7 online multiplayer server with global WebSockets!

---

## 🌟 Key Features

- **🌐 Real-Time Multiplayer & Matchmaking**: Low-latency WebSocket room system supporting ~10-14 players per match with 20Hz server tick loop and smooth client interpolation.
- **🤖 Smart AI Bots**: Whenever fewer human players are active, AI bots seamlessly fill the room. Bots wander, evaluate nearby food, hunt smaller holes, and flee with speed boost when in danger!
- **🎮 4 Diverse Game Modes**:
  - ⏱️ **Classic Match (2:00)**: Competitive timed battle. Devour the most city mass to top the podium!
  - 🔥 **Battle Royale**: Shrinking ring of death! Avoid the contracting storm wall and be the last hole standing.
  - ♾️ **Endless Sandbox**: No time limits, rapid continuous prop respawns. Relax and grow into a universe-devouring void!
  - 👾 **Monster Hunt**: One player/bot starts as the colossal Kaiju Juggernaut (3.5x size!). Hunt or survive the titan!
- **🏙️ 5 Massive Maps (700×700 World Scale)**:
  - 🏙️ **Mega Metropolis**: Skyline high-rises, commercial shops, financial twin towers, and construction cranes (1,300+ props).
  - ✈️ **International Airport & Resort**: Giant 600m runway strip with passenger jet airliners, control tower, airport terminals, luxury yachts at the marina, and beachside hotels (1,000+ props).
  - 🎡 **Wonderland Carnival & Mega Park**: Giant revolving Ferris wheels, circus big-top tents, carousels, kiosks, gazebos, and surrounding countryside barns and windmills (980+ props).
  - 🏡 **Sunny Suburbs & Countryside**: Expansive neighborhood with 60+ houses, rustic farm barns, windmills, fences, gardens, and lakes (1,600+ props).
  - 🌃 **Neo-Tokyo Cyber Megacity**: Futuristic night metropolis with glowing neon grid streets, shipping docks, cargo warehouses, twin titan towers, and police cruisers (1,150+ props).
- **👗 Custom Character Skins & 3D Outer Layer Ornaments**:
  - 🐷 **Peppa Pig** *(Starter Free)*: 3D sculpted piggy ears with wiggle animations, snout with nostrils, blushing cheeks, and mud puddle vortex.
  - 🎒 **Dora the Explorer** *(🪙 150 Coins)*: 3D dark-brown bob haircut, purple backpack charm, and golden explorer star badge.
  - 🌹 **Rose Bloom** *(🪙 250 Coins)*: 12 layered 3D crimson rose petals forming a blooming collar with thorny green leaves.
  - 🐱 **Anime Neko** *(🪙 350 Coins)*: 3D fluffy cat ears with inner fur, side whiskers, and glowing heart crest.
  - ⚡ **Anime Saiyan** *(🪙 500 Coins)*: 10 jagged 3D crystalline ki energy flame spikes with flickering animation.
  - 👑 **Royal Crown** *(🪙 650 Coins)*: 8 golden imperial crown battlements set with glowing ruby and sapphire jewels.
  - 🐉 **Cyber Dragon** *(🪙 800 Coins)*: 2 sweeping dragon horns and dorsal spine plates.
  - 🌌 **Cosmic Galaxy** *(🪙 1000 Coins)*: 3D tilted Saturn planetary ring with 3 miniature moons orbiting the hole in real time.
  - 🔷 **Classic Starter Auras** *(Starter Free)*: Neon Cyan, Neon Pink, and Toxic Lime dual-layer glowing horizons.
- **🪙 Coin Economy & In-Game Shop**:
  - Starter skins are 100% free from the beginning.
  - Earn coins by devouring props, eliminating opponents, and placing on the match podium.
  - Unlock premium character skins, anime hairstyles, floral layers, and cosmic rings in the Skins Locker!
- **💾 Dual-Layer Progress Saving**:
  - **Local Persistence (`localStorage`)** and **Server-Side Storage (`server/data/players.json`)** seamlessly sync your nickname, career level, lifetime XP, match statistics, coin earnings, and achievements across sessions.
- **📐 2.5D / 3D Isometric View**:
  - Tilted perspective camera looking down at the 3D skyline.
  - Objects tumble, wobble, shrink, and fall down into the abyss with particle bursts and floating `+XP` texts.
  - Dynamic camera zoom smoothly pulls back as you grow from a puddle to a cosmic singularity.
- **🔊 Procedural Web Audio Engine**: 100% self-contained synthesized sounds (bloops, gulps, building crunches, jet engine rumbles, boost whoosh, level up fanfare, and victory chords) without any external audio downloads.

---

## 🎮 How to Play & Controls

| Action | Desktop Controls | Mobile / Touch Controls |
| :--- | :--- | :--- |
| **Move Hole** | Move Mouse cursor (Hole follows) OR `WASD` / `Arrow Keys` | Drag finger anywhere on screen |
| **Speed Boost** | Hold `Spacebar` OR Hold `Left / Right Mouse Button` | Tap & hold screen with 2 fingers |
| **Mute / Unmute** | Click the 🔊 sound button in top-left HUD | Tap the 🔊 sound button in top-left HUD |

---

## 📁 Repository Structure

```text
├── index.html                # Root entry point (automatic redirect to docs/ for GitHub Pages)
├── package.json              # Project metadata & npm dependencies
├── LICENSE                   # MIT License
├── README.md                 # Project documentation
├── .gitignore                # Git ignore rules
│
├── .github/                  # GitHub Actions Automation
│   └── workflows/
│       └── deploy.yml        # Auto-deploys to GitHub Pages on every git push
│
├── docs/                     # Static Game Web Root (Ready for GitHub Pages)
│   ├── index.html            # Main game HTML with HUD & 3D canvases
│   ├── css/style.css         # Modern neon arcade UI, podium, HUD styling
│   ├── shared/constants.js   # Game constants, skin configs & prop defs
│   └── js/                   # Client-side 3D engine, models, audio, UI
│
├── public/                   # Server static assets directory (Node.js)
│
├── server/                   # Backend Server (Node.js & WebSockets)
│   ├── index.js              # Express static server & WebSocket endpoint
│   ├── gameRoom.js           # Match modes (Classic, BR, Endless, Monster Hunt)
│   ├── mapGenerator.js       # Procedural generator (5 massive maps: 1000-1600 props each)
│   ├── botManager.js         # Intelligent AI state machine & decision making
│   ├── progressStore.js      # Server-side player profiles & coin persistence
│   └── spatialGrid.js        # High-performance spatial partitioning grid
│
└── shared/                   # Universal game definitions
    └── constants.js          # Skins, game modes, maps, level tiers, prop definitions
```

---

## 📜 License

MIT License © 2026. Built with ❤️ for open-source gaming.
