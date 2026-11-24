import { RoomManager, GAME_CATALOG } from '../engine/room-manager.js';

/**
 * Dual-Mode Multiplayer Transport:
 * - Local Mode (Node server): connects to native WebSocket (/ws)
 * - Vercel + Supabase Mode: connects to Supabase Realtime Broadcast + Presence
 *   (Host browser runs the exact same 20 game engines & persists leaderboard to Supabase Postgres!)
 */
export class GameTransport {
  constructor({ onStatus, onMessage }) {
    this.onStatus = onStatus;
    this.onMessage = onMessage;
    this.mode = 'ws';
    this.ws = null;

    // Supabase Realtime state
    this.supabase = null;
    this.myId = `p_${Math.random().toString(36).slice(2, 10)}`;
    this.channel = null;
    this.isHost = false;
    this.roomCode = null;
    this.hostManager = null;
    this.hostWs = null;
    this.remoteAdapters = new Map();
    this.joinTimer = null;
    this.cachedLeaderboard = { updatedAt: new Date().toISOString(), global: [], perGame: {}, recentMatches: [] };
  }

  async connect() {
    let cfg = { mode: 'ws' };
    try {
      const r = await fetch('/api/config', { cache: 'no-store' });
      if (r.ok) cfg = await r.json();
    } catch {
      cfg = { mode: 'ws' };
    }

    if (cfg.mode === 'supabase') {
      this.mode = 'supabase';
      if (!cfg.configured) {
        this.onStatus('err', 'Env Supabase belum diset');
        this.onMessage({ type: 'error', message: cfg.error || 'Isi SUPABASE_URL & SUPABASE_ANON_KEY di Vercel!' });
        return;
      }
      await this._connectSupabase(cfg.supabaseUrl, cfg.supabaseAnonKey);
    } else {
      this.mode = 'ws';
      this._connectLocalWS();
    }
  }

  // ===== MODE 1: LOCAL NODE WEBSOCKET =====
  _connectLocalWS() {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${location.host}/ws`);
    this.ws = ws;

    ws.addEventListener('open', () => {
      this.onStatus('ok', 'Online');
      this.send({ type: 'get_leaderboard' });
    });

    ws.addEventListener('close', () => {
      this.onStatus('err', 'Reconnecting...');
      setTimeout(() => this._connectLocalWS(), 1800);
    });

    ws.addEventListener('message', (ev) => {
      try {
        this.onMessage(JSON.parse(ev.data));
      } catch { /* ignore */ }
    });
  }

  // ===== MODE 2: SUPABASE REALTIME (100% VERCEL + SUPABASE) =====
  async _connectSupabase(url, anonKey) {
    try {
      const mod = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
      this.supabase = mod.createClient(url, anonKey, {
        realtime: { params: { eventsPerSecond: 40 } },
      });
      this.onStatus('ok', 'Online (Cloud)');
      this.onMessage({ type: 'hello', clientId: this.myId, games: GAME_CATALOG });
      this._refreshLeaderboard();
    } catch (err) {
      this.onStatus('err', 'Gagal load Supabase');
      this.onMessage({ type: 'error', message: `Gagal memuat Supabase Realtime: ${err.message}` });
    }
  }

  async _refreshLeaderboard() {
    try {
      const r = await fetch('/api/leaderboard', { cache: 'no-store' });
      if (r.ok) {
        this.cachedLeaderboard = await r.json();
        this.onMessage({ type: 'leaderboard', data: this.cachedLeaderboard });
      }
    } catch { /* ignore */ }
  }

  _deliverLocal(obj) {
    queueMicrotask(() => this.onMessage(obj));
  }

  async _cleanupChannel() {
    clearTimeout(this.joinTimer);
    this.joinTimer = null;
    if (this.hostManager && this.hostWs) {
      this.hostManager.leaveRoom(this.hostWs);
    }
    this.hostManager = null;
    this.hostWs = null;
    this.remoteAdapters.clear();
    this.isHost = false;
    this.roomCode = null;
    if (this.channel && this.supabase) {
      try { await this.supabase.removeChannel(this.channel); } catch { /* ignore */ }
      this.channel = null;
    }
  }

  _createHostManager() {
    const self = this;
    const lbBridge = {
      getLeaderboard() {
        return self.cachedLeaderboard;
      },
      recordGameResult({ gameId, roomCode, standings }) {
        fetch('/api/leaderboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameId, roomCode, standings }),
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((fresh) => {
            if (fresh) {
              self.cachedLeaderboard = fresh;
              self._deliverLocal({ type: 'leaderboard', data: fresh });
              if (self.channel && self.remoteAdapters.size > 0) {
                self.channel.send({
                  type: 'broadcast',
                  event: 's2c',
                  payload: { to: null, excludeId: self.myId, msg: { type: 'leaderboard', data: fresh } },
                });
              }
            }
          })
          .catch(() => {});
      },
    };

    const mgr = new RoomManager(lbBridge);
    mgr.tickMs = 50; // Smooth 20 Hz sync (60 FPS interpolated on client!)
    mgr.onRoomBroadcast = (room, obj, excludeId) => {
      if (excludeId !== self.myId && room.players.has(self.myId)) {
        self._deliverLocal(obj);
      }
      if (self.channel && self.remoteAdapters.size > 0) {
        self.channel.send({
          type: 'broadcast',
          event: 's2c',
          payload: { to: null, excludeId, msg: obj },
        });
      }
    };
    return mgr;
  }

  _getRemoteAdapter(remoteId) {
    let adapter = this.remoteAdapters.get(remoteId);
    if (!adapter) {
      const sendObj = (obj) => {
        if (!this.channel) return;
        this.channel.send({
          type: 'broadcast',
          event: 's2c',
          payload: { to: remoteId, msg: obj },
        });
      };
      adapter = {
        id: remoteId,
        sendJSON: sendObj,
        sendText: (raw) => {
          try { sendObj(JSON.parse(raw)); } catch { /* ignore */ }
        },
      };
      this.remoteAdapters.set(remoteId, adapter);
    }
    return adapter;
  }

  async _hostRoom(profile) {
    await this._cleanupChannel();
    this.isHost = true;
    this.hostManager = this._createHostManager();
    this.hostWs = {
      id: this.myId,
      sendJSON: (obj) => {
        if (obj.type === 'welcome') this.roomCode = obj.roomCode;
        this._deliverLocal(obj);
      },
      sendText: (raw) => {
        try { this._deliverLocal(JSON.parse(raw)); } catch { /* ignore */ }
      },
    };

    this.hostManager.handleMessage(this.hostWs, JSON.stringify({ type: 'create_room', profile }));
    const code = this.roomCode;
    if (!code) return;

    const ch = this.supabase.channel(`party-room:${code}`, {
      config: { broadcast: { self: false, ack: false }, presence: { key: this.myId } },
    });
    this.channel = ch;

    ch.on('broadcast', { event: 'c2s' }, ({ payload }) => {
      if (!this.hostManager || !payload || !payload.from || !payload.msg) return;
      const remoteWs = this._getRemoteAdapter(payload.from);
      this.hostManager.handleMessage(remoteWs, JSON.stringify(payload.msg));
    });

    ch.on('presence', { event: 'leave' }, ({ key }) => {
      if (!key || key === this.myId) return;
      const adapter = this.remoteAdapters.get(key);
      if (adapter && this.hostManager) {
        this.hostManager.leaveRoom(adapter);
        this.remoteAdapters.delete(key);
      }
    });

    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        ch.track({ role: 'host', id: this.myId });
      }
    });
  }

  async _joinRoom(rawCode, profile) {
    const code = String(rawCode || '').trim().toUpperCase();
    if (!code) return;
    await this._cleanupChannel();
    this.isHost = false;
    this.roomCode = code;

    let welcomed = false;
    const ch = this.supabase.channel(`party-room:${code}`, {
      config: { broadcast: { self: false, ack: false }, presence: { key: this.myId } },
    });
    this.channel = ch;

    ch.on('broadcast', { event: 's2c' }, ({ payload }) => {
      if (!payload || !payload.msg) return;
      if (payload.to !== null && payload.to !== undefined && payload.to !== this.myId) return;
      if (payload.excludeId && payload.excludeId === this.myId) return;
      if (payload.msg.type === 'welcome') {
        welcomed = true;
        clearTimeout(this.joinTimer);
      }
      this.onMessage(payload.msg);
    });

    ch.on('presence', { event: 'leave' }, ({ leftPresences }) => {
      if (!welcomed) return;
      const hostLeft = (leftPresences || []).some((p) => p.role === 'host');
      if (hostLeft) {
        this.onMessage({ type: 'error', message: 'Host keluar — room ditutup.' });
        this._cleanupChannel();
        this.onMessage({ type: 'host_left' });
      }
    });

    const sendJoin = () => {
      ch.send({
        type: 'broadcast',
        event: 'c2s',
        payload: { from: this.myId, msg: { type: 'join_room', code, profile } },
      });
    };

    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        ch.track({ role: 'guest', id: this.myId });
        sendJoin();
        setTimeout(() => { if (!welcomed && this.channel === ch) sendJoin(); }, 1200);
        this.joinTimer = setTimeout(() => {
          if (!welcomed) {
            this._cleanupChannel();
            this.onMessage({ type: 'error', message: `Room "${code}" tidak ditemukan! Cek kode dari Host.` });
          }
        }, 4500);
      }
    });
  }

  send(msg) {
    if (this.mode === 'ws') {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(msg));
      }
      return;
    }

    if (!this.supabase) return;
    if (msg.type === 'get_leaderboard') {
      this._refreshLeaderboard();
      return;
    }
    if (msg.type === 'create_room') {
      this._hostRoom(msg.profile || {});
      return;
    }
    if (msg.type === 'join_room') {
      this._joinRoom(msg.code, msg.profile || {});
      return;
    }
    if (msg.type === 'leave_room') {
      this._cleanupChannel();
      return;
    }

    if (this.isHost && this.hostManager && this.hostWs) {
      this.hostManager.handleMessage(this.hostWs, JSON.stringify(msg));
    } else if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'c2s',
        payload: { from: this.myId, msg },
      });
    }
  }
}
