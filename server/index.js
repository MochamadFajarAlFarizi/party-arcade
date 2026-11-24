import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WSServer } from './ws-server.js';
import { LeaderboardStore } from './leaderboard.js';
import { RoomManager, GAME_CATALOG } from '../public/engine/room-manager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

export function createPartyServer({ port = Number(process.env.PORT) || 3456, leaderboardPath } = {}) {
  const leaderboard = new LeaderboardStore(leaderboardPath);
  const rooms = new RoomManager(leaderboard);

  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = decodeURIComponent(url.pathname);

    if (pathname === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, rooms: rooms.rooms.size, games: GAME_CATALOG.length }));
      return;
    }

    if (pathname === '/api/config') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
      res.end(JSON.stringify({ mode: 'ws' }));
      return;
    }

    if (pathname === '/api/leaderboard') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
      res.end(JSON.stringify(leaderboard.getLeaderboard(50)));
      return;
    }

    const rel = pathname === '/' ? '/index.html' : pathname;
    const safePath = path.normalize(path.join(PUBLIC_DIR, rel));
    if (!safePath.startsWith(PUBLIC_DIR)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    fs.readFile(safePath, (err, content) => {
      if (err) {
        // SPA fallback
        fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (err2, html) => {
          if (err2) {
            res.writeHead(404);
            res.end('Not Found');
            return;
          }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(html);
        });
        return;
      }
      const ext = path.extname(safePath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Cache-Control': 'no-cache',
      });
      res.end(content);
    });
  });

  const wss = new WSServer(server, '/ws');
  wss.on('connection', (client) => {
    client.sendJSON({ type: 'hello', clientId: client.id, games: GAME_CATALOG });
    client.on('message', (raw) => rooms.handleMessage(client, raw));
    client.on('close', () => rooms.leaveRoom(client));
  });

  function start() {
    return new Promise((resolve) => {
      server.listen(port, '0.0.0.0', () => {
        const addr = server.address();
        resolve({ port: addr.port, server, wss, rooms, leaderboard });
      });
    });
  }

  function stop() {
    leaderboard.flush();
    wss.close();
    return new Promise((resolve) => server.close(resolve));
  }

  return { start, stop, server, wss, rooms, leaderboard };
}

function getLanAddresses() {
  const out = [];
  const nets = os.networkInterfaces();
  for (const list of Object.values(nets)) {
    for (const net of list || []) {
      if (net.family === 'IPv4' && !net.internal) out.push(net.address);
    }
  }
  return out;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const app = createPartyServer();
  app.start().then(({ port }) => {
    console.log('\n🎉 ==========================================');
    console.log('   PARTY POP! Multiplayer Arcade Server');
    console.log('========================================== 🎉');
    console.log(`  Local PC  : http://localhost:${port}`);
    for (const ip of getLanAddresses()) {
      console.log(`  HP / LAN  : http://${ip}:${port}`);
    }
    console.log('  Discord?  : Bagikan link lewat Cloudflare Tunnel / ngrok / deploy!');
    console.log('==========================================\n');
  });
}
