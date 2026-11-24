export default function handler(req, res) {
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const supabaseAnonKey = (process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

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
