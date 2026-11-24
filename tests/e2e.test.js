import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { createPartyServer } from '../server/index.js';
import { isValidWord } from '../server/dictionary.js';

function connectClient(port) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const queue = [];
    const waiters = [];

    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      const idx = waiters.findIndex((w) => w.pred(msg));
      if (idx >= 0) {
        const w = waiters.splice(idx, 1)[0];
        clearTimeout(w.timer);
        w.resolve(msg);
      } else {
        queue.push(msg);
      }
    });

    ws.addEventListener('open', () => {
      resolve({
        ws,
        send(obj) {
          ws.send(JSON.stringify(obj));
        },
        waitFor(pred, timeoutMs = 4000) {
          const idx = queue.findIndex(pred);
          if (idx >= 0) return Promise.resolve(queue.splice(idx, 1)[0]);
          return new Promise((res, rej) => {
            const timer = setTimeout(() => rej(new Error('Timed out waiting for WS message')), timeoutMs);
            waiters.push({ pred, resolve: res, timer });
          });
        },
        close() {
          ws.close();
        },
      });
    });
    ws.addEventListener('error', reject);
  });
}

async function run() {
  const tmpLb = path.join(os.tmpdir(), `party_pop_lb_${Date.now()}.json`);
  const app = createPartyServer({ port: 0, leaderboardPath: tmpLb });
  const { port, rooms, leaderboard } = await app.start();

  try {
    // 1. Dictionary checks (Indonesian + English + inflections)
    assert.equal(isValidWord('kucing'), true);
    assert.equal(isValidWord('makanan'), true);
    assert.equal(isValidWord('bermain'), true);
    assert.equal(isValidWord('dragon'), true);
    assert.equal(isValidWord('zzzzxq'), false);

    // 2. HTTP health & static checks
    const healthRes = await fetch(`http://127.0.0.1:${port}/api/health`);
    const health = await healthRes.json();
    assert.equal(health.ok, true);
    assert.equal(health.games, 20);

    const htmlRes = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(htmlRes.status, 200);
    const html = await htmlRes.text();
    assert.ok(html.includes('PARTY POP!'));

    // 3. Multiplayer WebSocket room flow (3 humans + 1 bot)
    const p1 = await connectClient(port);
    const p2 = await connectClient(port);
    const p3 = await connectClient(port);

    await Promise.all([
      p1.waitFor((m) => m.type === 'hello'),
      p2.waitFor((m) => m.type === 'hello'),
      p3.waitFor((m) => m.type === 'hello'),
    ]);

    p1.send({ type: 'create_room', profile: { name: 'Raka', color: '#FF5E7E', hat: 'headset' } });
    const w1 = await p1.waitFor((m) => m.type === 'welcome');
    const code = w1.roomCode;
    assert.equal(code.length, 4);

    p2.send({ type: 'join_room', code, profile: { name: 'Budi', color: '#38BDF8', hat: 'cat' } });
    p3.send({ type: 'join_room', code, profile: { name: 'Siti', color: '#FFD166', hat: 'crown' } });
    await Promise.all([
      p2.waitFor((m) => m.type === 'welcome'),
      p3.waitFor((m) => m.type === 'welcome'),
    ]);

    // Add bot
    p1.send({ type: 'add_bot' });
    const rsBot = await p1.waitFor((m) => m.type === 'room_state' && m.players.length === 4);
    assert.equal(rsBot.players.filter((p) => p.isBot).length, 1);

    // Test chat, standard emoji & custom image emote reactions
    p2.send({ type: 'reaction', emoji: '🔥' });
    const reactMsg = await p1.waitFor((m) => m.type === 'reaction' && m.emoji === '🔥');
    assert.equal(reactMsg.name, 'Budi');

    const tinyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    p3.send({ type: 'reaction', customImage: tinyPng, label: 'NGAKAK' });
    const customReact = await p1.waitFor((m) => m.type === 'reaction' && m.customImage === tinyPng);
    assert.equal(customReact.name, 'Siti');
    assert.equal(customReact.label, 'NGAKAK');

    // 4. Verify ALL 20 mini-games boot, accept input/actions, and produce valid state
    const gameIds = [
      'bomb-pass', 'sumo-knockout', 'turf-paint', 'quick-draw', 'word-bomb', 'chaos-survival',
      'crown-chase', 'coin-rush', 'zombie-tag', 'bumper-soccer', 'meteor-shower', 'snake-party',
      'ghost-freeze', 'king-hill', 'shark-escape', 'dodgeball', 'turbo-race',
      'trivia-rush', 'reflex-duel', 'math-panic',
    ];
    for (const gid of gameIds) {
      p1.send({ type: 'start_game', gameId: gid });
      const gs = await p1.waitFor((m) => m.type === 'game_start' && m.gameId === gid);
      assert.equal(gs.gameId, gid);

      // Receive live tick state
      const tickState = await p2.waitFor((m) => m.type === 'game_state' && m.state.gameId === gid);
      assert.equal(tickState.state.players.length, 4);

      if (gid === 'quick-draw') {
        const room = rooms.rooms.get(code);
        room.currentGame.countdown = 0;
        room.currentGame.step(0.05);
        const artistId = room.currentGame.currentArtist.id;
        const chosenWord = room.currentGame.wordChoices[0].word;
        room.currentGame.handleAction(artistId, { action: 'chooseWord', word: chosenWord });
        assert.equal(room.currentGame.subPhase, 'drawing');
        const guesser = room.currentGame.players.find((p) => p.id !== artistId);
        room.currentGame.handleAction(guesser.id, { action: 'guess', text: chosenWord });
        assert.equal(guesser.guessed, true);
      }

      if (gid === 'word-bomb') {
        const room = rooms.rooms.get(code);
        room.currentGame.countdown = 0;
        room.currentGame.step(0.05);
        room.currentGame.syllable = 'DA';
        const cur1 = room.currentGame.activePlayer;
        // Must reject word NOT starting with DA
        room.currentGame.handleAction(cur1.id, { action: 'submit', word: 'makan' });
        assert.equal(cur1.wordsSolved, 0);
        // Must accept DALAM -> next prefix should be LAM!
        room.currentGame.handleAction(cur1.id, { action: 'submit', word: 'dalam' });
        assert.equal(cur1.wordsSolved, 1);
        assert.equal(room.currentGame.syllable, 'LAM');
        // Next player submits LAMPU -> accepted!
        const cur2 = room.currentGame.activePlayer;
        room.currentGame.handleAction(cur2.id, { action: 'submit', word: 'lampu' });
        assert.equal(cur2.wordsSolved, 1);
      }

      if (gid === 'trivia-rush' || gid === 'math-panic') {
        const room = rooms.rooms.get(code);
        room.currentGame.countdown = 0;
        room.currentGame.step(0.05);
        room.currentGame.handleAction(w1.playerId, { action: 'choice', index: 0 });
        assert.equal(room.currentGame.players.find((p) => p.id === w1.playerId).answer, 0);
      }

      if (gid === 'reflex-duel') {
        const room = rooms.rooms.get(code);
        room.currentGame.countdown = 0;
        room.currentGame.step(0.05);
        room.currentGame._triggerGo();
        room.currentGame.handleAction(w1.playerId, { action: 'tap' });
        assert.equal(room.currentGame.players.find((p) => p.id === w1.playerId).tapped, true);
      }

      p1.send({ type: 'input', x: 1, y: 0, action: true });
      p1.send({ type: 'back_to_lobby' });
      await p1.waitFor((m) => m.type === 'room_state' && m.state === 'lobby');
    }

    // 5. Verify Party Cup & Leaderboard persistence
    p1.send({ type: 'start_cup', rounds: 3 });
    const cupStart = await p1.waitFor((m) => m.type === 'game_start' && m.partyCup?.total === 3);
    assert.equal(cupStart.partyCup.round, 1);

    // Simulate match completion to test leaderboard recording
    const room = rooms.rooms.get(code);
    room.currentGame.finishGame([
      { id: w1.playerId, name: 'Raka', color: '#FF5E7E', hat: 'headset', isBot: false, score: 320, detail: 'Juara!' },
      { id: 'bot_x', name: 'BotBoba', color: '#22C55E', hat: 'cat', isBot: true, score: 150, detail: 'Bot' },
    ]);
    const gameOver = await p1.waitFor((m) => m.type === 'game_over');
    assert.equal(gameOver.standings[0].name, 'Raka');

    leaderboard.flush();
    const lbRes = await fetch(`http://127.0.0.1:${port}/api/leaderboard`);
    const lb = await lbRes.json();
    assert.equal(lb.global[0].name, 'Raka');
    assert.equal(lb.global[0].totalScore, 320);
    assert.equal(lb.global[0].wins, 1);

    p1.close();
    p2.close();
    p3.close();
    console.log('✅ ALL E2E TESTS PASSED (6 mini-games, Party Cup, WebSockets, Bots, Dictionary, Leaderboard)!');
  } finally {
    await app.stop();
    try { fs.unlinkSync(tmpLb); } catch { /* ignore */ }
  }
}

run().catch((err) => {
  console.error('❌ E2E TEST FAILED:', err);
  process.exit(1);
});
