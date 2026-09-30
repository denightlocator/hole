const http = require('http');
const path = require('path');
const express = require('express');
const { WebSocketServer } = require('ws');
const GameRoom = require('./gameRoom');
const progressStore = require('./progressStore');

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

const app = express();
app.use(express.json());

// Enable CORS and disable any host-header restrictions
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', '*');
  next();
});

// Serve shared constants and public frontend assets
app.use('/shared', express.static(path.join(__dirname, '../shared')));
app.use(express.static(path.join(__dirname, '../public')));

// Profile & Progress APIs
app.get('/api/profile', (req, res) => {
  const name = (req.query.name || 'Player').slice(0, 16);
  const profile = progressStore.getProfile(name);
  res.json({ status: 'ok', profile });
});

app.post('/api/profile/unlock-skin', (req, res) => {
  const { name, skinId } = req.body || {};
  if (!name || !skinId) return res.status(400).json({ error: 'Missing name or skinId' });
  const result = progressStore.unlockSkin(name, skinId);
  res.json(result);
});

app.post('/api/profile/equip-skin', (req, res) => {
  const { name, skinId } = req.body || {};
  if (!name || !skinId) return res.status(400).json({ error: 'Missing name or skinId' });
  const result = progressStore.equipSkin(name, skinId);
  res.json(result);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    rooms: rooms.size,
    timestamp: Date.now()
  });
});

// Download full repository ZIP
app.get('/download', (req, res) => {
  const zipPath = path.join(__dirname, '../hole-io-multiplayer.zip');
  res.download(zipPath, 'hole-io-multiplayer.zip', (err) => {
    if (err) {
      console.error('[Download error]', err);
      res.status(500).send('Error generating download');
    }
  });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Room management
const rooms = new Map(); // roomId -> GameRoom

function getOrCreateRoom(roomId = 'default', mapType = 'metropolis', gameMode = 'classic') {
  const cleanId = roomId.trim().toLowerCase().slice(0, 16) || 'default';
  if (!rooms.has(cleanId)) {
    console.log(`[Room] Creating new game room: ${cleanId} [Map: ${mapType}, Mode: ${gameMode}]`);
    const room = new GameRoom(cleanId, mapType, gameMode);
    rooms.set(cleanId, room);
  }
  return rooms.get(cleanId);
}

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://localhost');
  const playerName = (url.searchParams.get('name') || 'Player').slice(0, 16);
  const skinId = url.searchParams.get('skinId') || 'peppa-pig';
  const roomId = url.searchParams.get('room') || 'default';
  const mapType = url.searchParams.get('map') || 'metropolis';
  const gameMode = url.searchParams.get('mode') || 'classic';

  const playerId = 'p_' + Math.random().toString(36).substring(2, 9);
  const room = getOrCreateRoom(roomId, mapType, gameMode);
  const player = room.addPlayer(playerId, ws, playerName, skinId);

  console.log(`[Connect] ${playerName} (${playerId}) [Skin: ${skinId}, Room: ${roomId}, Map: ${mapType}, Mode: ${gameMode}]. Total players: ${room.players.size}`);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      switch (data.type) {
        case 'input':
          room.handlePlayerInput(playerId, data);
          break;
        case 'ping':
          if (ws.readyState === 1) {
            ws.send(JSON.stringify({ type: 'pong', clientTime: data.clientTime }));
          }
          break;
        default:
          break;
      }
    } catch (err) {
      console.error('[WS Message Error]', err.message);
    }
  });

  ws.on('close', () => {
    console.log(`[Disconnect] ${playerName} (${playerId}) left room "${roomId}"`);
    room.removePlayer(playerId);
    if (room.players.size === 0 && roomId !== 'default') {
      console.log(`[Room] Cleaning up empty custom room: ${roomId}`);
      room.destroy();
      rooms.delete(roomId);
    }
  });

  ws.on('error', (err) => {
    console.error(`[WS Error for ${playerId}]`, err.message);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`===============================================`);
  console.log(`  HOLE.IO MULTIPLAYER SERVER RUNNING!          `);
  console.log(`  Host:    http://${HOST}:${PORT}              `);
  console.log(`  WebSockets ready on ws://${HOST}:${PORT}     `);
  console.log(`===============================================`);
});
