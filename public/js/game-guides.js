/**
 * Petunjuk Permainan (How-to-Play Briefing) untuk semua 32 Mini-Game PARTY POP!
 * Ditampilkan otomatis saat countdown awal setiap ronde + bisa dibuka kapan saja via tombol ❓ di HUD.
 */
export const GAME_GUIDES = {
  // === PERPECAHAN ===
  'split-or-steal': {
    goal: 'Negosiasi dengan pasanganmu tiap ronde: pilih 🤝 BAGI RATA atau 🔪 KHIANATI!',
    controls: 'Klik tombol BAGI atau KHIANATI sebelum waktu habis (Ronde 5 bernilai 2x!).',
    tip: 'Sama-sama Bagi (+120), Khianati teman jujur (+260 / -40), tapi kalau sama-sama Khianat (-60 berdua)!',
  },
  'blame-vote': {
    goal: 'Vote rahasia untuk menjatuhkan 1 target & rampas poinnya — atau pasang 🛡️ Perisai Pantul!',
    controls: 'Klik nama target untuk menuduh, atau klik 🛡️ PERISAI PANTUL (hanya 2x per match!).',
    tip: 'Kalau target yang dikroyok pasang Perisai, semua penuduh malah kena pantul -55 poin!',
  },
  'greed-heist': {
    goal: 'Jarah brankas sedalam mungkin dan kabur sebelum 🚨 Polisi menggerebek!',
    controls: 'Pilih 💎 LANJUT RAMPOK, 🏃 KABUR AMAN, atau 😈 TEKAN ALARM (1x per match).',
    tip: 'Tombol 😈 TEKAN ALARM bikin kamu kabur aman + risiko polisi naik +35% untuk teman yang masih serakah!',
  },
  'betrayal-bridge': {
    goal: 'Bertahan di ubin aman saat jembatan retak & dorong lawan jatuh ke lava!',
    controls: 'WASD / Joystick untuk gerak • Spasi / tombol DASH untuk mendorong lawan.',
    tip: 'Peti Emas 👑 memberi +85 poin & gelombang shockwave! Di Mode Tim, dash ke teman malah kasih Speed Boost.',
  },

  // === BOARD GAME ===
  'snakes-ladders': {
    goal: 'Balapan jadi yang pertama mencapai Petak 50 di papan Ular Tangga!',
    controls: 'Saat giliranmu, klik 🎲 LEMPAR DADU atau pakai 😈 SABOTASE (-4 petak leader) 1x per match.',
    tip: 'Dapat angka 6 atau Petak ⭐ dapat lempar lagi! Petak 🌀 menukar posisimu dengan pemain terdepan!',
  },
  'mini-monopoly': {
    goal: 'Kumpulkan kekayaan terbesar dengan memborong kota, bangun hotel & tarik sewa!',
    controls: 'Saat giliranmu klik 🎲 LEMPAR DADU, lalu pilih 🏠 BELI / ⬆️ UPGRADE HOTEL atau ⏭️ LEWATI.',
    tip: 'Upgrade kota jadi Hotel bikin sewa 2x lipat! Di Mode Tim, mampir di kota rekan tim GRATIS.',
  },
  'crazy-cards': {
    goal: 'Habiskan semua kartu di tanganmu lebih dulu daripada pemain lain!',
    controls: 'Klik kartu menyala yang cocok warna/angka dengan kartu tengah, atau klik 📥 AMBIL KARTU.',
    tip: 'Simpan kartu +2, 🚫 Skip, atau 🔥 Wild +4 buat ngehajar pemain yang sudah sisa 1 kartu (UNO)!',
  },
  'ludo-blitz': {
    goal: 'Bawa kedua pionmu (A & B) keliling 24 petak masuk ke Finish lebih dulu!',
    controls: 'Klik 🎲 LEMPAR DADU lalu pilih Pion A atau B. Angka 1 atau 6 mengeluarkan pion dari markas.',
    tip: 'Injak pion musuh di luar petak ⭐ untuk TENDANG dia balik ke markas (+65 poin & bonus lempar lagi)!',
  },

  // === ACTION & KOMPETITIF ===
  'dash-blade': {
    goal: 'Duel pedang 3 HP! Tebas semua lawan sampai tinggal kamu (atau timmu) yang bertahan.',
    controls: 'WASD / Joystick untuk gerak • Spasi / DASH untuk menebas pedang ke depan.',
    tip: 'Adu dash bersamaan memicu ⚔️ CLASH! Ambil orb ❤️ untuk heal & orb ⚔️ Fury untuk damage 2x.',
  },
  'ricochet-duel': {
    goal: 'Eliminasi lawan dengan peluru energi pantul (3 HP) memanfaatkan pilar pelindung!',
    controls: 'Arahkan karakter dengan WASD / Joystick • Spasi / DASH untuk menembak.',
    tip: 'Peluru memantul 2 kali dari dinding & pilar — manfaatkan sudut pantulan buat nembak lawan yang ngumpet!',
  },
  'bomb-pass': {
    goal: 'Jangan pegang bom saat hitungan mundur habis! Oper bom ke lawan sebelum meledak.',
    controls: 'WASD / Joystick untuk lari • Spasi / DASH untuk mengejar atau kabur cepat.',
    tip: 'Injak pad petir ⚡ untuk ngebut, dan hati-hati pantulan bumper tengah arena!',
  },
  'sumo-knockout': {
    goal: 'Dorong semua lawan jatuh ke laut dari pulau yang terus mengecil!',
    controls: 'WASD / Joystick untuk bergerak • Spasi / DASH untuk seruduk lebih kencang.',
    tip: 'Ambil power-up 💪 Raksasa (dorongan super berat), 🛡️ Perisai, atau 🌀 Shockwave!',
  },
  'turf-paint': {
    goal: 'Warnai lantai arena seluas-luasnya dengan warna karaktermu sebelum waktu habis!',
    controls: 'Jalan untuk mengecat ubin • Spasi / DASH untuk cat luas sekaligus bikin lawan pusing!',
    tip: 'Cat lawan bisa kamu timpa balik — rebut wilayah besar di 10 detik terakhir!',
  },
  'crown-chase': {
    goal: 'Rebut 👑 Mahkota Emas & tahan selama mungkin untuk memanen poin tiap detik!',
    controls: 'WASD / Joystick untuk kejar/kabur • Spasi / DASH untuk merebut mahkota.',
    tip: 'Pemegang mahkota bergerak sedikit lebih lambat, jadi manfaatkan dash di tikungan!',
  },
  'coin-rush': {
    goal: 'Kumpulkan koin 💰 & berlian 💎 terbanyak sebelum timer habis!',
    controls: 'WASD / Joystick untuk ambil koin • Spasi / DASH ke lawan agar koin mereka tumpah!',
    tip: 'Incar pemain yang bawa tumpukan koin terbanyak, lalu tabrak pakai Dash!',
  },
  'king-hill': {
    goal: 'Bertahan di dalam Zona Emas 🎯 yang terus berpindah untuk mencetak poin!',
    controls: 'WASD / Joystick untuk masuk zona • Spasi / DASH untuk dorong lawan keluar zona.',
    tip: 'Perhatikan timer pindah zona supaya kamu duluan lari ke posisi berikutnya!',
  },

  // === SPORT ===
  'dodgeball': {
    goal: 'Ambil bola di lantai dan lempar untuk meng-KO semua lawan!',
    controls: 'Jalan ke bola untuk mengambil • Arahkan & tekan Spasi / DASH untuk melempar keras.',
    tip: 'Bola yang masih memantul cepat tetap berbahaya — hindari bola menyala merah!',
  },
  'bumper-soccer': {
    goal: 'Masukkan bola ke gawang lawan sebanyak mungkin bersama tim Merah / Biru!',
    controls: 'WASD / Joystick untuk menggiring bola • Spasi / DASH untuk tendangan super keras.',
    tip: 'Satu pemain bisa jaga gawang sambil rekannya menyerang — tendangan Dash bikin bola melesat!',
  },
  'turbo-race': {
    goal: 'Selesaikan balapan 3 lap bolak-balik secepat mungkin!',
    controls: 'WASD / Joystick untuk melaju • Spasi / DASH untuk turbo sprint.',
    tip: 'Hindari lumpur cokelat (bikin lambat) & palang berputar, lalu injak pad biru ⚡ untuk ngebut!',
  },

  // === SURVIVAL ===
  'memory-rush': {
    goal: 'Hafalkan posisi ubin bintang ⭐ sebelum tertutup menjadi ❓ lalu injak ubin aman!',
    controls: 'WASD / Joystick untuk lari ke ubin ⭐ • Spasi / DASH untuk dorong musuh keluar ubin!',
    tip: 'Fokus hafalkan 1–2 ubin terdekat saja, lalu jaga posisimu dari dorongan lawan!',
  },
  'zombie-tag': {
    goal: 'Manusia bertahan hidup sampai waktu habis; Zombi 🧟 kejar & infeksi semua manusia!',
    controls: 'WASD / Joystick untuk lari/kejar • Spasi / DASH untuk melompat cepat.',
    tip: 'Manusia jangan pojokkan diri sendiri — terus bergerak memutar di sisi luar arena!',
  },
  'ghost-freeze': {
    goal: 'Hantu Es 👻 bekukan semua pemain; pemain lain kabur & cairkan teman yang membeku 🧊!',
    controls: 'WASD / Joystick untuk bergerak • Sentuh teman yang membeku untuk menyelamatkannya!',
    tip: 'Kerja sama selamatkan teman beku bikin Hantu Es kewalahan!',
  },
  'meteor-shower': {
    goal: 'Hindari hujan meteor ☄️ & kawah lava panas selama mungkin!',
    controls: 'WASD / Joystick untuk menghindar • Spasi / DASH saat lingkaran merah muncul di bawahmu.',
    tip: 'Jangan berdiri di tengah kerumunan — simpan Dash untuk situasi darurat!',
  },
  'shark-escape': {
    goal: 'Berenang hindari hiu lapar 🦈 sambil memungut bintang laut ⭐ buat bonus poin!',
    controls: 'WASD / Joystick untuk berenang • Spasi / DASH untuk kabur dari kejaran hiu.',
    tip: 'Hiu mengejar pemain terdekat — pancing menjauh lalu Dash berbelok tajam!',
  },
  'snake-party': {
    goal: 'Makan buah untuk memperpanjang ekor & potong jalur lawan biar menabrak badanmu!',
    controls: 'WASD / Joystick untuk berbelok • Spasi / DASH untuk ngebut memotong depan musuh.',
    tip: 'Jangan menabrak ekor pemain lain — potong cepat di depan wajah mereka!',
  },
  'chaos-survival': {
    goal: 'Bertahan melewati 3 babak brutal: Lampu Merah-Hijau, Laser Putar & Lantai Runtuh!',
    controls: 'WASD / Joystick • Spasi / DASH. Saat Lampu Merah 🚦 BERHENTI total jangan gerak!',
    tip: 'Di babak Laser Putar ikuti arah putaran, dan di Lantai Runtuh segera cari ikon aman!',
  },

  // === OTAK & KATA ===
  'word-bomb': {
    goal: 'Ketik kata bahasa Indonesia/Inggris yang DIAWALI suku kata yang muncul sebelum bom meledak!',
    controls: 'Ketik kata di kolom bawah lalu tekan Enter / KIRIM saat giliranmu.',
    tip: 'Suku kata berikutnya diambil dari akhir katamu (contoh: DA → DALAM → LAM → LAMPU)!',
  },
  'trivia-rush': {
    goal: 'Jawab 8 soal pengetahuan umum secepat & setepat mungkin!',
    controls: 'Klik tombol pilihan A / B / C / D begitu soal terbuka.',
    tip: 'Makin cepat menjawab benar makin besar bonusnya, dan jawaban benar beruntun bikin Streak!',
  },
  'math-panic': {
    goal: 'Selesaikan 10 soal hitung cepat (+, -, ×, ÷, kuadrat, persen) dengan level makin sulit!',
    controls: 'Klik jawaban yang benar secepat kilat sebelum timer habis.',
    tip: 'Cek angka satuan (digit terakhir) untuk menebak hasil perkalian besar lebih cepat!',
  },
  'closest-wins': {
    goal: 'Tebak angka fakta dunia sedekat mungkin dengan jawaban asli!',
    controls: 'Ketik angka perkiraanmu lalu tekan 🎯 KUNCI TEBAKAN.',
    tip: 'Tebakan paling dekat dapat +160 poin, dan tebakan TEPAT SASARAN langsung JACKPOT +250!',
  },

  // === SOSIAL ===
  'quick-draw': {
    goal: 'Pelukis menggambar kata rahasia; pemain lain menebak secepat mungkin di kolom chat!',
    controls: 'Pelukis: gambar di kanvas • Penebak: ketik tebakan di chat kanan/bawah.',
    tip: 'Makin cepat kamu menebak benar, makin besar poin untuk penebak DAN pelukisnya!',
  },
  'reflex-duel': {
    goal: 'Uji refleks milidetik! Tap layar secepat kilat TEPAT saat layar berubah HIJAU!',
    controls: 'Klik / Tap tombol raksasa hanya saat berubah HIJAU (🔥 TAP SEKARANG!).',
    tip: 'AWAS JEBAKAN! Jangan tap saat warna merah/oranye palsu atau kena penalti -35 poin!',
  },
};

export function getGameGuide(gameId, fallbackMeta = null) {
  return GAME_GUIDES[gameId] || {
    goal: fallbackMeta?.desc || 'Kumpulkan poin terbanyak & kalahkan lawanmu!',
    controls: 'Ikuti tombol aksi di layar atau WASD + Spasi di PC.',
    tip: 'Ajak temanmu mabar biar makin rusuh!',
  };
}
