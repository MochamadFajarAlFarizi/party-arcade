import crypto from 'node:crypto';

function getSupabaseCreds() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
  return { url, key };
}

function getSecret() {
  const { key } = getSupabaseCreds();
  return process.env.ACCOUNT_SECRET || key || 'party-pop-dev-secret-v1';
}

export function hashPin(pin) {
  const salt = crypto.randomBytes(12).toString('hex');
  const derived = crypto.scryptSync(String(pin), salt, 24).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPin(pin, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const derived = crypto.scryptSync(String(pin), salt, 24).toString('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(derived, 'hex'));
  } catch {
    return false;
  }
}

export function signAccountToken(playerKey) {
  const sig = crypto.createHmac('sha256', getSecret()).update(playerKey).digest('hex');
  return `${playerKey}.${sig}`;
}

export function verifyAccountToken(token) {
  if (!token || typeof token !== 'string') return null;
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const playerKey = token.slice(0, dot);
  const expected = signAccountToken(playerKey);
  if (expected.length !== token.length) return null;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token)) ? playerKey : null;
  } catch {
    return null;
  }
}

export function sanitizeEmotes(rawList) {
  if (!Array.isArray(rawList)) return [];
  return rawList
    .filter((e) => e && typeof e.dataUrl === 'string' && /^data:image\/(png|webp|jpeg);base64,[A-Za-z0-9+/=]+$/.test(e.dataUrl) && e.dataUrl.length <= 48000)
    .slice(0, 8)
    .map((e) => ({
      id: String(e.id || `em_${Date.now()}`).slice(0, 32),
      dataUrl: e.dataUrl,
      label: String(e.label || '').replace(/[<>]/g, '').trim().slice(0, 14),
    }));
}

async function sbFetch(path, { method = 'GET', body, prefer } = {}) {
  const { url, key } = getSupabaseCreds();
  if (!url || !key) throw new Error('Supabase belum dikonfigurasi');
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
  if (prefer) headers.Prefer = prefer;
  const resp = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`Supabase ${resp.status}: ${txt.slice(0, 160)}`);
  }
  const text = await resp.text();
  return text ? JSON.parse(text) : null;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const action = body.action;

    // 1. Login or Claim Nickname with 4-6 digit PIN
    if (action === 'auth') {
      const name = String(body.name || '').replace(/[<>]/g, '').trim().slice(0, 16);
      const pin = String(body.pin || '').trim();
      if (name.length < 2) return res.status(400).json({ error: 'Nama minimal 2 huruf!' });
      if (!/^\d{4,6}$/.test(pin)) return res.status(400).json({ error: 'PIN harus 4 sampai 6 angka!' });

      const playerKey = name.toLowerCase();
      const rows = await sbFetch(`player_accounts?player_key=eq.${encodeURIComponent(playerKey)}&limit=1`);
      const existing = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

      if (existing) {
        if (!verifyPin(pin, existing.pin_hash)) {
          return res.status(401).json({ error: 'PIN salah! Nickname ini sudah dikunci pemiliknya.' });
        }
        return res.status(200).json({
          ok: true,
          isNew: false,
          token: signAccountToken(playerKey),
          account: {
            name: existing.name,
            color: existing.color,
            hat: existing.hat,
            customEmotes: Array.isArray(existing.custom_emotes) ? existing.custom_emotes : [],
          },
        });
      }

      // Register new PIN-protected nickname!
      const cleanEmotes = sanitizeEmotes(body.customEmotes || []);
      const color = typeof body.color === 'string' ? body.color.slice(0, 16) : '#FF5E7E';
      const hat = typeof body.hat === 'string' ? body.hat.slice(0, 16) : 'headset';
      await sbFetch('player_accounts', {
        method: 'POST',
        body: {
          player_key: playerKey,
          name,
          pin_hash: hashPin(pin),
          color,
          hat,
          custom_emotes: cleanEmotes,
          updated_at: new Date().toISOString(),
        },
        prefer: 'return=minimal',
      });

      return res.status(200).json({
        ok: true,
        isNew: true,
        token: signAccountToken(playerKey),
        account: { name, color, hat, customEmotes: cleanEmotes },
      });
    }

    // 2. Fetch synced account profile + custom emotes using saved session token
    if (action === 'me') {
      const playerKey = verifyAccountToken(body.token);
      if (!playerKey) return res.status(401).json({ error: 'Sesi tidak valid' });
      const rows = await sbFetch(`player_accounts?player_key=eq.${encodeURIComponent(playerKey)}&limit=1`);
      const acc = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
      if (!acc) return res.status(404).json({ error: 'Akun tidak ditemukan' });
      return res.status(200).json({
        ok: true,
        account: {
          name: acc.name,
          color: acc.color,
          hat: acc.hat,
          customEmotes: Array.isArray(acc.custom_emotes) ? acc.custom_emotes : [],
        },
      });
    }

    // 3. Sync avatar & custom emotes to Supabase
    if (action === 'sync') {
      const playerKey = verifyAccountToken(body.token);
      if (!playerKey) return res.status(401).json({ error: 'Sesi tidak valid' });
      const patch = { updated_at: new Date().toISOString() };
      if (typeof body.color === 'string') patch.color = body.color.slice(0, 16);
      if (typeof body.hat === 'string') patch.hat = body.hat.slice(0, 16);
      if (Array.isArray(body.customEmotes)) patch.custom_emotes = sanitizeEmotes(body.customEmotes);

      await sbFetch(`player_accounts?player_key=eq.${encodeURIComponent(playerKey)}`, {
        method: 'PATCH',
        body: patch,
        prefer: 'return=minimal',
      });
      return res.status(200).json({ ok: true });
    }

    // 4. Check if a nickname is PIN-locked
    if (action === 'check') {
      const playerKey = String(body.name || '').trim().toLowerCase();
      if (!playerKey) return res.status(200).json({ locked: false });
      const rows = await sbFetch(`player_accounts?select=player_key&player_key=eq.${encodeURIComponent(playerKey)}&limit=1`);
      return res.status(200).json({ locked: Array.isArray(rows) && rows.length > 0 });
    }

    return res.status(400).json({ error: 'Action tidak dikenal' });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Account API error' });
  }
}
