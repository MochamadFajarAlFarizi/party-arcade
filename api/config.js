function cleanUrl(raw) {
  const s = String(raw || '').trim().replace(/^["']|["']$/g, '');
  if (!s) return '';
  try { return new URL(s).origin; } catch { return s.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, ''); }
}

export default function handler(req, res) {
  const supabaseUrl = cleanUrl(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseAnonKey = String(process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim().replace(/^["']|["']$/g, '');

  res.setHeader('Cache-Control', 'no-store');
  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(200).json({
      mode: 'supabase',
      configured: false,
      error: 'Environment Variables SUPABASE_URL dan SUPABASE_ANON_KEY belum diisi di Vercel!',
    });
  }

  return res.status(200).json({
    mode: 'supabase',
    configured: true,
    supabaseUrl,
    supabaseAnonKey,
  });
}
