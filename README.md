# 🎉 PARTY POP! — Cross-Platform Multiplayer Party Game Hub

Web-based multiplayer party game (2–12 pemain) dengan tema **Vibrant Cartoon Party** (ala Fall Guys / Mario Party), super ringan 60 FPS di PC maupun browser HP, lengkap dengan **6 mini-game**, **Mode Party Cup**, **Bot AI**, **Reaksi Emoji**, dan **Leaderboard Global**.

## 🎮 6 Mini-Game Termasuk
1. **💣 Bomb Pass** — Oper bom sebelum meledak! Ada bumper pantul, boost pad, dan Dash.
2. **🏝️ Sumo Knockout** — Dorong lawan jatuh dari pulau yang makin mengecil + 4 Power-up (Turbo, Shield, Mega Sumo, Shockwave).
3. **🎨 Turf Paint** — Perang cat wilayah 25×15! Ambil Bom Cat & Dash untuk stun lawan.
4. **✏️ Tebak Gambar Cepat** — Gambar dengan kuas warna-warni (lancar di touchscreen HP & mouse PC) dan tebak di chat dengan sistem petunjuk otomatis.
5. **🔤 Word Bomb** — Ketik kata Bahasa Indonesia / Inggris sesuai suku kata sebelum bom meledak + live typing bubble!
6. **⚡ Chaos Survival** — 3 ronde kacau beruntun: Lampu Merah-Hijau, Laser Disko, dan Lantai Jebakan Warna!

## 🚀 Cara Menjalankan (Tanpa `npm install`!)
Cukup pastikan Node.js v20+ terpasang, lalu jalankan:

```bash
cd C:\Users\User\holycat\party-arcade
npm start
```

Server akan otomatis menampilkan alamat:
- **PC Lokal**: `http://localhost:3456`
- **HP / Wi-Fi yang sama (LAN)**: `http://<IP-LOKAL-KAMU>:3456`

## 🎧 Main Bareng Teman Discord (Online Internet)
- **Cara Tercepat (Gratis, 1 perintah):**
  - Pakai Cloudflare Tunnel: `npx cloudflared tunnel --url http://localhost:3456`
  - Atau ngrok: `ngrok http 3456`
  - Buka link HTTPS yang muncul → Buat Room → Klik **"📋 Salin Link Discord"** → Paste di channel Discord!
- **Deploy Permanen (Gratis/Murah):**
  - Push folder ini ke GitHub lalu deploy ke **Render**, **Railway**, atau **Fly.io** (start command: `npm start`, zero dependencies!).

## 🧪 Jalankan Automated Test
```bash
npm test
```
