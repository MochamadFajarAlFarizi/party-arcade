# 🎉 PARTY POP! — Cross-Platform Multiplayer Party Game Hub (20 Mini-Games)

Web-based multiplayer party game (2–12 pemain) bertema **Vibrant Cartoon Party** untuk **PC & Browser HP** (termasuk Fullscreen, Floating Virtual Joystick, Radial Emote Wheel ala Mobile Legends, & Custom Upload Emote!).

Mendukung **2 Mode Jalan Otomatis**:
- **Cloud (100% Vercel + Supabase)**: Multiplayer real-time via **Supabase Realtime** + Leaderboard permanen di **Supabase Postgres** (tanpa sleep!).
- **Lokal / LAN**: Jalankan `npm start` untuk server Node.js WebSocket lokal.

## 🚀 Cara Deploy ke Vercel + Supabase (100% Gratis)
1. **Setup Supabase**:
   - Buat project di https://supabase.com (region **Southeast Asia / Singapore**).
   - Buka **SQL Editor** → paste & jalankan isi file `supabase/schema.sql`.
   - Buka **Project Settings → API** → salin **Project URL** dan **anon public key**.
2. **Deploy di Vercel**:
   - Import repo GitHub ini di https://vercel.com/new.
   - Biarkan **Root Directory** `./` dan **Application Preset** `Other` (sudah diatur oleh `vercel.json`).
   - Buka **Environment Variables**, tambahkan 2 variabel:
     - `SUPABASE_URL` = Project URL dari Supabase
     - `SUPABASE_ANON_KEY` = anon public key dari Supabase
   - Klik **Deploy** → Selesai! Bagikan link Vercel ke Discord!

## 💻 Cara Jalankan Lokal
```bash
npm start
```
Lalu buka `http://localhost:3456` di PC atau `http://<IP-LAN>:3456` di HP.

## 🧪 Automated Tests
```bash
npm test
```
