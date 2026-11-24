import crypto from 'node:crypto';
import { EventEmitter } from 'node:events';

const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const MAX_PAYLOAD_BYTES = 256 * 1024; // 256 KB guard per frame

/**
 * Lightweight, spec-compliant RFC 6455 WebSocket connection wrapper.
 * Zero external dependencies — handles fragmented frames, multi-frame chunks,
 * masking, ping/pong keepalive, and clean disconnects.
 */
export class WSClient extends EventEmitter {
  constructor(socket, id) {
    super();
    this.socket = socket;
    this.id = id;
    this.readyState = 1; // 1 = OPEN, 3 = CLOSED
    this.isAlive = true;
    this._buffer = Buffer.alloc(0);
    this._fragOpcode = null;
    this._fragBuffers = [];
    this._fragTotal = 0;

    socket.setNoDelay(true);
    socket.on('data', (chunk) => this._onData(chunk));
    socket.on('close', () => this._cleanup());
    socket.on('error', () => this._cleanup());
    socket.on('end', () => this._cleanup());
  }

  sendJSON(obj) {
    if (this.readyState !== 1) return;
    try {
      this.sendText(JSON.stringify(obj));
    } catch {
      this._cleanup();
    }
  }

  sendText(text) {
    if (this.readyState !== 1) return;
    this._sendFrame(0x1, Buffer.from(text, 'utf8'));
  }

  ping() {
    if (this.readyState !== 1) return;
    this._sendFrame(0x9, Buffer.alloc(0));
  }

  close(code = 1000, reason = '') {
    if (this.readyState !== 1) return;
    const reasonBuf = Buffer.from(reason, 'utf8');
    const payload = Buffer.alloc(2 + reasonBuf.length);
    payload.writeUInt16BE(code, 0);
    reasonBuf.copy(payload, 2);
    this._sendFrame(0x8, payload);
    this.readyState = 3;
    try {
      this.socket.end();
    } catch {
      // ignore
    }
    this._cleanup();
  }

  _sendFrame(opcode, payload) {
    if (this.readyState !== 1 || this.socket.destroyed) return;
    const len = payload.length;
    let header;
    if (len < 126) {
      header = Buffer.alloc(2);
      header[0] = 0x80 | opcode;
      header[1] = len;
    } else if (len < 65536) {
      header = Buffer.alloc(4);
      header[0] = 0x80 | opcode;
      header[1] = 126;
      header.writeUInt16BE(len, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = 0x80 | opcode;
      header[1] = 127;
      header.writeBigUInt64BE(BigInt(len), 2);
    }
    try {
      this.socket.write(Buffer.concat([header, payload]));
    } catch {
      this._cleanup();
    }
  }

  _onData(chunk) {
    if (this.readyState !== 1) return;
    this._buffer = this._buffer.length === 0 ? chunk : Buffer.concat([this._buffer, chunk]);

    while (this._buffer.length >= 2) {
      const b0 = this._buffer[0];
      const b1 = this._buffer[1];
      const fin = (b0 & 0x80) !== 0;
      const opcode = b0 & 0x0f;
      const masked = (b1 & 0x80) !== 0;
      let payloadLen = b1 & 0x7f;
      let offset = 2;

      if (payloadLen === 126) {
        if (this._buffer.length < 4) return;
        payloadLen = this._buffer.readUInt16BE(2);
        offset = 4;
      } else if (payloadLen === 127) {
        if (this._buffer.length < 10) return;
        const bigLen = this._buffer.readBigUInt64BE(2);
        if (bigLen > BigInt(MAX_PAYLOAD_BYTES)) {
          this.close(1009, 'Message too big');
          return;
        }
        payloadLen = Number(bigLen);
        offset = 10;
      }

      if (payloadLen > MAX_PAYLOAD_BYTES) {
        this.close(1009, 'Message too big');
        return;
      }

      const maskLen = masked ? 4 : 0;
      const totalFrameLen = offset + maskLen + payloadLen;
      if (this._buffer.length < totalFrameLen) return;

      let maskKey = null;
      if (masked) {
        maskKey = this._buffer.subarray(offset, offset + 4);
        offset += 4;
      }

      const payload = Buffer.allocUnsafe(payloadLen);
      this._buffer.copy(payload, 0, offset, offset + payloadLen);
      this._buffer = this._buffer.subarray(totalFrameLen);

      if (masked && maskKey) {
        for (let i = 0; i < payloadLen; i++) {
          payload[i] ^= maskKey[i & 3];
        }
      }

      this._handleFrame(fin, opcode, payload);
    }
  }

  _handleFrame(fin, opcode, payload) {
    // Control frames (close, ping, pong)
    if (opcode === 0x8) {
      this._sendFrame(0x8, payload.subarray(0, 2));
      this._cleanup();
      return;
    }
    if (opcode === 0x9) {
      this._sendFrame(0xa, payload); // Pong
      return;
    }
    if (opcode === 0xa) {
      this.isAlive = true;
      return;
    }

    // Data frames (text, binary, continuation)
    if (opcode === 0x1 || opcode === 0x2) {
      if (fin) {
        if (opcode === 0x1) {
          this.emit('message', payload.toString('utf8'));
        }
      } else {
        this._fragOpcode = opcode;
        this._fragBuffers = [payload];
        this._fragTotal = payload.length;
      }
    } else if (opcode === 0x0 && this._fragOpcode !== null) {
      this._fragTotal += payload.length;
      if (this._fragTotal > MAX_PAYLOAD_BYTES) {
        this.close(1009, 'Message too big');
        return;
      }
      this._fragBuffers.push(payload);
      if (fin) {
        const full = Buffer.concat(this._fragBuffers);
        const op = this._fragOpcode;
        this._fragOpcode = null;
        this._fragBuffers = [];
        this._fragTotal = 0;
        if (op === 0x1) {
          this.emit('message', full.toString('utf8'));
        }
      }
    }
  }

  _cleanup() {
    if (this.readyState === 3) return;
    this.readyState = 3;
    try {
      this.socket.destroy();
    } catch {
      // ignore
    }
    this.emit('close');
  }
}

export class WSServer extends EventEmitter {
  constructor(httpServer, path = '/ws') {
    super();
    this.path = path;
    this.clients = new Set();
    this._nextId = 1;

    httpServer.on('upgrade', (req, socket, head) => {
      const urlPath = (req.url || '/').split('?')[0];
      if (urlPath !== this.path) {
        socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
        socket.destroy();
        return;
      }

      const key = req.headers['sec-websocket-key'];
      if (!key) {
        socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
        socket.destroy();
        return;
      }

      const accept = crypto
        .createHash('sha1')
        .update(key + WS_GUID)
        .digest('base64');

      const responseHeaders = [
        'HTTP/1.1 101 Switching Protocols',
        'Upgrade: websocket',
        'Connection: Upgrade',
        `Sec-WebSocket-Accept: ${accept}`,
        '\r\n',
      ].join('\r\n');

      socket.write(responseHeaders);

      const client = new WSClient(socket, `c${this._nextId++}_${crypto.randomBytes(3).toString('hex')}`);
      this.clients.add(client);
      client.on('close', () => {
        this.clients.delete(client);
      });

      if (head && head.length > 0) {
        client._onData(head);
      }

      this.emit('connection', client, req);
    });

    // Heartbeat keepalive every 25s
    this._heartbeat = setInterval(() => {
      for (const client of this.clients) {
        if (!client.isAlive) {
          client.close(1001, 'Ping timeout');
          continue;
        }
        client.isAlive = false;
        client.ping();
      }
    }, 25000);
    this._heartbeat.unref?.();
  }

  close() {
    clearInterval(this._heartbeat);
    for (const client of this.clients) {
      client.close(1001, 'Server shutting down');
    }
    this.clients.clear();
  }
}
