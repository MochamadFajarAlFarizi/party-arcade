import { BaseGame, pickRandom, randRange } from './base-game.js';

const TRIVIA_BANK = [
  // Sains & Alam
  { q: 'Planet terbesar di tata surya kita adalah?', opts: ['Saturnus', 'Jupiter', 'Neptunus', 'Mars'], ans: 1 },
  { q: 'Planet yang dijuluki "Planet Merah" adalah?', opts: ['Venus', 'Mars', 'Merkurius', 'Jupiter'], ans: 1 },
  { q: 'Simbol kimia untuk air adalah?', opts: ['CO2', 'O2', 'H2O', 'NaCl'], ans: 2 },
  { q: 'Simbol kimia untuk emas di tabel periodik adalah?', opts: ['Ag', 'Au', 'Fe', 'Cu'], ans: 1 },
  { q: 'Hewan tercepat di darat adalah?', opts: ['Singa', 'Cheetah', 'Kuda', 'Serigala'], ans: 1 },
  { q: 'Hewan mamalia terbesar yang pernah hidup di Bumi adalah?', opts: ['Gajah Afrika', 'Paus Biru', 'Hiu Paus', 'T-Rex'], ans: 1 },
  { q: 'Berapa jumlah jantung yang dimiliki gurita?', opts: ['1', '2', '3', '4'], ans: 2 },
  { q: 'Gas utama yang paling banyak menyusun atmosfer Bumi adalah?', opts: ['Oksigen', 'Nitrogen', 'Karbon Dioksida', 'Hidrogen'], ans: 1 },
  { q: 'Organ tubuh manusia yang memompa darah adalah?', opts: ['Paru-paru', 'Hati', 'Jantung', 'Ginjal'], ans: 2 },
  { q: 'Organ terbesar pada tubuh manusia adalah?', opts: ['Hati', 'Kulit', 'Otak', 'Usus'], ans: 1 },
  { q: 'Berapa jumlah warna utama dalam pelangi?', opts: ['5', '6', '7', '8'], ans: 2 },
  { q: 'Hewan apa yang bisa tidur sambil berdiri?', opts: ['Kucing', 'Kuda', 'Anjing', 'Kelinci'], ans: 1 },
  { q: 'Buah apa yang bijinya ada di bagian luar kulitnya?', opts: ['Apel', 'Stroberi', 'Jeruk', 'Mangga'], ans: 1 },
  { q: 'Alat untuk mengukur gempa bumi disebut?', opts: ['Termometer', 'Barometer', 'Seismograf', 'Speedometer'], ans: 2 },
  { q: 'Proses tumbuhan membuat makanan dengan cahaya matahari disebut?', opts: ['Respirasi', 'Fotosintesis', 'Fermentasi', 'Evaporasi'], ans: 1 },
  { q: 'Vitamin apa yang banyak didapat dari sinar matahari pagi?', opts: ['Vitamin A', 'Vitamin B12', 'Vitamin C', 'Vitamin D'], ans: 3 },
  { q: 'Logam apa yang berwujud cair pada suhu ruangan?', opts: ['Besi', 'Raksa / Merkuri', 'Aluminium', 'Tembaga'], ans: 1 },
  { q: 'Hewan apa yang tidak bisa melompat?', opts: ['Kangguru', 'Gajah', 'Kucing', 'Kelinci'], ans: 1 },
  { q: 'Lapisan atmosfer yang melindungi Bumi dari sinar UV adalah?', opts: ['Ozon', 'Karbon', 'Helium', 'Neon'], ans: 0 },
  { q: 'Burung apa yang bisa terbang mundur?', opts: ['Elang', 'Kolibri', 'Merpati', 'Burung Hantu'], ans: 1 },
  { q: 'Tulang terpanjang di tubuh manusia terletak di bagian?', opts: ['Lengan', 'Paha', 'Punggung', 'Betis'], ans: 1 },
  { q: 'Berapa derajat titik didih air murni di permukaan laut?', opts: ['90°C', '100°C', '110°C', '120°C'], ans: 1 },
  { q: 'Planet terdekat dengan Matahari adalah?', opts: ['Venus', 'Merkurius', 'Mars', 'Bumi'], ans: 1 },
  { q: 'Darah berwarna merah karena mengandung protein bernama?', opts: ['Klorofil', 'Hemoglobin', 'Insulin', 'Kolagen'], ans: 1 },
  { q: 'Bintang terdekat dari Bumi adalah?', opts: ['Sirius', 'Matahari', 'Alpha Centauri', 'Polaris'], ans: 1 },

  // Indonesia & Geografi
  { q: 'Pulau terbesar di Indonesia adalah?', opts: ['Jawa', 'Sumatra', 'Kalimantan', 'Sulawesi'], ans: 2 },
  { q: 'Makanan khas Padang yang pernah jadi terenak di dunia?', opts: ['Gudeg', 'Rendang', 'Pempek', 'Rawon'], ans: 1 },
  { q: 'Candi Buddha terbesar di dunia yang ada di Jawa Tengah adalah?', opts: ['Prambanan', 'Borobudur', 'Mendut', 'Sewu'], ans: 1 },
  { q: 'Danau vulkanik terbesar di Indonesia dan Asia Tenggara adalah?', opts: ['Danau Singkarak', 'Danau Toba', 'Danau Poso', 'Danau Maninjau'], ans: 1 },
  { q: 'Hewan endemik kadal purba raksasa asli NTT adalah?', opts: ['Anoa', 'Komodo', 'Babirusa', 'Maleo'], ans: 1 },
  { q: 'Gunung tertinggi di Pulau Jawa adalah?', opts: ['Merapi', 'Semeru', 'Slamet', 'Rinjani'], ans: 1 },
  { q: 'Suku asli yang mendiami wilayah Jakarta adalah?', opts: ['Sunda', 'Betawi', 'Baduy', 'Osing'], ans: 1 },
  { q: 'Tari Kecak berasal dari provinsi?', opts: ['Jawa Timur', 'Bali', 'NTB', 'Sulawesi Selatan'], ans: 1 },
  { q: 'Alat musik tradisional Angklung berasal dari daerah?', opts: ['Jawa Tengah', 'Jawa Barat', 'Sumatra Barat', 'Kalimantan'], ans: 1 },
  { q: 'Makanan khas Palembang yang terbuat dari ikan dan sagu adalah?', opts: ['Batagor', 'Pempek', 'Otak-otak', 'Siomay'], ans: 1 },
  { q: 'Tanggal kemerdekaan Republik Indonesia diperingati setiap?', opts: ['17 Juli', '17 Agustus', '10 November', '1 Juni'], ans: 1 },
  { q: 'Sungai terpanjang di Indonesia adalah?', opts: ['Bengawan Solo', 'Kapuas', 'Musi', 'Mahakam'], ans: 1 },
  { q: 'Kota yang dijuluki "Kota Pelajar" di Indonesia adalah?', opts: ['Bandung', 'Yogyakarta', 'Malang', 'Semarang'], ans: 1 },
  { q: 'Bunga raksasa berbau khas yang tumbuh di Bengkulu adalah?', opts: ['Melati', 'Rafflesia Arnoldii', 'Anggrek Hitam', 'Edelweis'], ans: 1 },
  { q: 'Selat yang memisahkan Pulau Jawa dan Pulau Sumatra adalah?', opts: ['Selat Bali', 'Selat Sunda', 'Selat Malaka', 'Selat Makassar'], ans: 1 },

  // Dunia & Geografi Global
  { q: 'Ibukota negara Jepang adalah?', opts: ['Kyoto', 'Osaka', 'Tokyo', 'Seoul'], ans: 2 },
  { q: 'Gunung tertinggi di dunia adalah?', opts: ['Kilimanjaro', 'Fuji', 'Everest', 'Rinjani'], ans: 2 },
  { q: 'Benua terkecil di dunia adalah?', opts: ['Eropa', 'Australia', 'Antartika', 'Amerika Selatan'], ans: 1 },
  { q: 'Negara mana yang dijuluki Negeri Gajah Putih?', opts: ['Vietnam', 'Thailand', 'India', 'Malaysia'], ans: 1 },
  { q: 'Menara Eiffel berada di kota?', opts: ['London', 'Roma', 'Paris', 'Berlin'], ans: 2 },
  { q: 'Mata uang resmi negara Jepang adalah?', opts: ['Won', 'Yuan', 'Yen', 'Baht'], ans: 2 },
  { q: 'Negara terluas di dunia berdasarkan luas daratannya adalah?', opts: ['Kanada', 'China', 'Rusia', 'Amerika Serikat'], ans: 2 },
  { q: 'Samudra terbesar di dunia adalah?', opts: ['Atlantik', 'Hindia', 'Pasifik', 'Arktik'], ans: 2 },
  { q: 'Piramida Giza terletak di negara?', opts: ['Maroko', 'Mesir', 'Yordania', 'Meksiko'], ans: 1 },
  { q: 'Negara yang terkenal dengan pizza dan Menara Miring Pisa?', opts: ['Spanyol', 'Prancis', 'Italia', 'Yunani'], ans: 2 },
  { q: 'Ibukota Korea Selatan adalah?', opts: ['Busan', 'Incheon', 'Seoul', 'Daegu'], ans: 2 },
  { q: 'Gurun pasir panas terbesar di dunia adalah?', opts: ['Gobi', 'Sahara', 'Kalahari', 'Arab'], ans: 1 },
  { q: 'Negara mana yang paling banyak menjuarai Piala Dunia FIFA?', opts: ['Jerman', 'Argentina', 'Brasil', 'Prancis'], ans: 2 },
  { q: 'Benua mana yang tidak memiliki negara tetap?', opts: ['Australia', 'Antartika', 'Eropa', 'Afrika'], ans: 1 },
  { q: 'Sungai Nil berada di benua?', opts: ['Asia', 'Afrika', 'Amerika Selatan', 'Eropa'], ans: 1 },

  // Gaming, Teknologi & Pop Culture
  { q: 'Siapa tokoh utama di game Super Mario?', opts: ['Luigi', 'Sonic', 'Mario', 'Link'], ans: 2 },
  { q: 'Logo aplikasi Discord berbentuk seperti apa?', opts: ['Burung', 'Gamepad / Clyde', 'Hantu', 'Roket'], ans: 1 },
  { q: 'Di Minecraft, blok paling keras yang tidak bisa dihancurkan di survival adalah?', opts: ['Obsidian', 'Diamond', 'Bedrock', 'Netherite'], ans: 2 },
  { q: 'Di Mobile Legends, monster raksasa ungu yang muncul di sungai untuk push tower disebut?', opts: ['Turtle', 'Lord', 'Buff Ungu', 'Crab'], ans: 1 },
  { q: 'Bahasa pemrograman yang berjalan langsung di browser web adalah?', opts: ['JavaScript', 'C++', 'Swift', 'Kotlin'], ans: 0 },
  { q: 'Shortcut keyboard untuk "Copy" di Windows adalah?', opts: ['Ctrl + V', 'Ctrl + C', 'Ctrl + X', 'Ctrl + Z'], ans: 1 },
  { q: 'Shortcut keyboard untuk "Undo" (batalkan) di Windows adalah?', opts: ['Ctrl + Y', 'Ctrl + Z', 'Ctrl + A', 'Ctrl + S'], ans: 1 },
  { q: 'Karakter landak biru super cepat milik SEGA adalah?', opts: ['Tails', 'Sonic', 'Crash', 'Pikachu'], ans: 1 },
  { q: 'Pokemon listrik kuning paling ikonik bernama?', opts: ['Charmander', 'Eevee', 'Pikachu', 'Meowth'], ans: 2 },
  { q: 'Di game Among Us, pemain yang menyamar sebagai penjahat disebut?', opts: ['Crewmate', 'Impostor', 'Traitor', 'Hunter'], ans: 1 },
  { q: 'Siapa karakter utama di anime One Piece?', opts: ['Naruto', 'Luffy', 'Ichigo', 'Goku'], ans: 1 },
  { q: 'Di Valorant, objek bom yang dipasang oleh tim Attacker disebut?', opts: ['C4', 'Spike', 'Core', 'Orb'], ans: 1 },
  { q: 'Kepanjangan dari "HTTP" dalam alamat web adalah?', opts: ['HyperText Transfer Protocol', 'High Tech Text Program', 'Home Tool Transfer Process', 'Host Terminal Type Protocol'], ans: 0 },
  { q: 'Perusahaan teknologi yang membuat sistem operasi Android adalah?', opts: ['Apple', 'Google', 'Microsoft', 'Meta'], ans: 1 },
  { q: 'Dalam game GTA San Andreas, siapa nama karakter utamanya?', opts: ['Tommy Vercetti', 'Carl Johnson (CJ)', 'Trevor', 'Niko Bellic'], ans: 1 },
  { q: 'Berapa jumlah pemain dalam 1 tim standar di Dota 2 / MLBB / Valorant?', opts: ['4', '5', '6', '7'], ans: 1 },
  { q: 'Istilah gaming "AFK" adalah singkatan dari?', opts: ['All For Kill', 'Away From Keyboard', 'Auto Fire Mode', 'Attack From Behind'], ans: 1 },
  { q: 'Istilah gaming "GG" biasanya diucapkan di akhir match, artinya?', opts: ['Get Gold', 'Good Game', 'Go Go', 'Great Guard'], ans: 1 },
  { q: 'Warna utama logo YouTube adalah?', opts: ['Biru', 'Merah', 'Hijau', 'Ungu'], ans: 1 },
  { q: 'Di Minecraft, musuh hijau yang suka meledak saat mendekat adalah?', opts: ['Enderman', 'Zombie', 'Creeper', 'Skeleton'], ans: 2 },
  { q: 'Di Clash of Clans, pasukan barbar berambut kuning disebut?', opts: ['Giant', 'Barbarian', 'Wizard', 'Goblin'], ans: 1 },
  { q: 'Konsol game Nintendo yang bisa dimainkan portable maupun di TV adalah?', opts: ['PlayStation 5', 'Nintendo Switch', 'Xbox Series X', 'GameBoy'], ans: 1 },
  { q: 'Siapa ninja berambut kuning dari desa Konoha?', opts: ['Sasuke', 'Naruto', 'Kakashi', 'Itachi'], ans: 1 },
  { q: 'Dalam catur, bidak apa yang jalannya membentuk huruf "L"?', opts: ['Benteng', 'Gajah', 'Kuda', 'Menteri'], ans: 2 },
  { q: 'Berapa jumlah kotak pada papan catur standar?', opts: ['36', '48', '64', '81'], ans: 2 },

  // Logika, Olahraga & Umum
  { q: 'Berapa jumlah sisi pada sebuah kubus?', opts: ['4', '6', '8', '12'], ans: 1 },
  { q: 'Berapa menit dalam 2,5 jam?', opts: ['120 menit', '135 menit', '150 menit', '160 menit'], ans: 2 },
  { q: 'Berapa jumlah pemain satu tim sepak bola di lapangan?', opts: ['9', '10', '11', '12'], ans: 2 },
  { q: 'Berapa hasil dari 2 pangkat 5?', opts: ['16', '25', '32', '64'], ans: 2 },
  { q: 'Jika kemarin hari Rabu, maka lusa adalah hari?', opts: ['Kamis', 'Jumat', 'Sabtu', 'Minggu'], ans: 2 },
  { q: 'Bulan apa dalam setahun yang kadang punya 29 hari?', opts: ['Januari', 'Februari', 'April', 'Juni'], ans: 1 },
  { q: 'Berapa jumlah sudut dalam sebuah segitiga?', opts: ['90°', '180°', '270°', '360°'], ans: 1 },
  { q: 'Warna campuran antara Biru dan Kuning menghasilkan warna?', opts: ['Ungu', 'Oranye', 'Hijau', 'Cokelat'], ans: 2 },
  { q: 'Warna campuran antara Merah dan Biru menghasilkan warna?', opts: ['Ungu', 'Hijau', 'Kuning', 'Abu-abu'], ans: 0 },
  { q: 'Dalam bulu tangkis, bola berbulu yang dipukul disebut?', opts: ['Raket', 'Shuttlecock / Kok', 'Net', 'Smash'], ans: 1 },
  { q: 'Berapa poin untuk 1 kali tembakan tiga angka (3-point) di basket?', opts: ['1', '2', '3', '4'], ans: 2 },
  { q: 'Kalau kamu menyalip orang di posisi ke-2 saat balap lari, sekarang kamu posisi ke berapa?', opts: ['Ke-1', 'Ke-2', 'Ke-3', 'Ke-4'], ans: 1 },
  { q: 'Mana yang lebih berat: 1 kg kapas atau 1 kg besi?', opts: ['1 kg besi', '1 kg kapas', 'Sama beratnya', 'Tergantung angin'], ans: 2 },
  { q: 'Berapa detik dalam 1 jam penuh?', opts: ['600 detik', '1800 detik', '3600 detik', '7200 detik'], ans: 2 },
  { q: 'Alat musik piano memiliki tuts berwarna hitam dan?', opts: ['Merah', 'Putih', 'Kuning', 'Biru'], ans: 1 },
  { q: 'Bentuk rambu lalu lintas "STOP" umumnya berbentuk segi?', opts: ['Segitiga', 'Segi empat', 'Segi enam', 'Segi delapan'], ans: 3 },
  { q: 'Bilangan prima terkecil adalah?', opts: ['0', '1', '2', '3'], ans: 2 },
  { q: 'Siapa penemu bola lampu pijar yang paling terkenal?', opts: ['Nikola Tesla', 'Thomas Alva Edison', 'Albert Einstein', 'Isaac Newton'], ans: 1 },
  { q: 'Berapa jumlah kartu dalam 1 dek kartu remi standar (tanpa Joker)?', opts: ['48', '50', '52', '54'], ans: 2 },
  { q: 'Satu lusin sama dengan berapa buah?', opts: ['10', '12', '14', '20'], ans: 1 },
  { q: 'Satu kodi sama dengan berapa buah?', opts: ['12', '15', '20', '24'], ans: 2 },
  { q: 'Akar kuadrat dari 144 adalah?', opts: ['11', '12', '13', '14'], ans: 1 },
  { q: 'Olahraga tinju dimainkan di arena berbentuk?', opts: ['Bulat', 'Segi empat (Ring)', 'Segitiga', 'Oval'], ans: 1 },
  { q: 'Berapa jumlah jari tangan dan kaki manusia normal seluruhnya?', opts: ['10', '15', '20', '25'], ans: 2 },
  { q: 'Di jam dinding analog, jarum pendek menunjukkan?', opts: ['Detik', 'Menit', 'Jam', 'Tanggal'], ans: 2 },
];

// =========================================================================
// 18. TRIVIA RUSH — Fast-paced 8-question Discord Quiz Battle (105+ bank!)
// =========================================================================
export class TriviaRushGame extends BaseGame {
  constructor(room, players) {
    super(room, 'trivia-rush');
    this.players = players.map((p) => ({
      id: p.id, name: p.name, color: p.color, hat: p.hat, isBot: !!p.isBot,
      score: 0, streak: 0, correct: 0, answer: null, answeredAt: 0,
    }));
    this.questions = [...TRIVIA_BANK].sort(() => Math.random() - 0.5).slice(0, 8);
    this.qIdx = 0;
    this.subPhase = 'question';
    this.timer = 10;
    this.botTimers = new Map();
    this.countdown = 3.5;
  }

  onStart() {
    this._startQ();
  }

  _startQ() {
    if (this.qIdx >= this.questions.length) {
      return this.finishGame(this.players.map((p) => ({
        id: p.id, name: p.name, color: p.color, hat: p.hat, isBot: p.isBot,
        score: p.score, detail: `🧠 ${p.correct}/${this.questions.length} benar`,
      })));
    }
    this.subPhase = 'question';
    this.timer = 10;
    this.botTimers.clear();
    this.players.forEach((p) => {
      p.answer = null;
      if (p.isBot) this.botTimers.set(p.id, randRange(1.4, 5.5));
    });
  }

  handleAction(playerId, msg) {
    if (this.phase !== 'playing' || this.subPhase !== 'question') return;
    if (msg.action !== 'choice') return;
    const p = this.players.find((x) => x.id === playerId);
    if (!p || p.answer !== null) return;
    const idx = Number(msg.index);
    if (idx < 0 || idx > 3) return;
    p.answer = idx;
    p.answeredAt = this.timer;

    const q = this.questions[this.qIdx];
    if (idx === q.ans) {
      p.correct += 1;
      p.streak += 1;
      p.score += Math.round(70 + (this.timer / 10) * 80 + Math.min(p.streak - 1, 3) * 20);
      this.emitEvent('sfx', { sound: 'correct' });
    } else {
      p.streak = 0;
      this.emitEvent('sfx', { sound: 'wrong' });
    }
    if (this.players.every((x) => x.answer !== null)) {
      this.subPhase = 'reveal';
      this.timer = 2.2;
    }
  }

  update(dt) {
    this.timer -= dt;
    if (this.subPhase === 'question') {
      for (const [botId, t] of this.botTimers.entries()) {
        const nt = t - dt;
        this.botTimers.set(botId, nt);
        if (nt <= 0) {
          this.botTimers.delete(botId);
          const q = this.questions[this.qIdx];
          const pick = Math.random() < 0.65 ? q.ans : Math.floor(Math.random() * 4);
          this.handleAction(botId, { action: 'choice', index: pick });
        }
      }
      if (this.timer <= 0) {
        this.subPhase = 'reveal';
        this.timer = 2.4;
      }
    } else if (this.timer <= 0) {
      this.qIdx += 1;
      this._startQ();
    }
  }

  getState() {
    const q = this.questions[this.qIdx] || this.questions[0];
    return {
      gameId: this.gameId, uiType: 'quiz', phase: this.phase, countdown: Number(this.countdown.toFixed(1)),
      subPhase: this.subPhase, timer: Number(Math.max(0, this.timer).toFixed(1)),
      round: this.qIdx + 1, totalRounds: this.questions.length,
      prompt: q.q, options: q.opts,
      correctIdx: this.subPhase === 'reveal' ? q.ans : null,
      players: this.players.map((p) => ({
        id: p.id, name: p.name, color: p.color, hat: p.hat,
        score: p.score, answered: p.answer !== null,
        lastCorrect: this.subPhase === 'reveal' ? p.answer === q.ans : null,
      })),
    };
  }
}

// =========================================================================
// 19. REFLEX DUEL — Reaction time showdown with FAKE-OUT bait rounds!
// =========================================================================
export class ReflexDuelGame extends BaseGame {
  constructor(room, players) {
    super(room, 'reflex-duel');
    this.players = players.map((p) => ({
      id: p.id, name: p.name, color: p.color, hat: p.hat, isBot: !!p.isBot,
      score: 0, bestMs: 9999, tapped: false, lastMs: null, jumped: false,
    }));
    this.round = 1;
    this.totalRounds = 6;
    this.subPhase = 'wait';
    this.timer = 2.5;
    this.goStartAt = 0;
    this.hasBait = false;
    this.botTimers = new Map();
    this.countdown = 3.5;
  }

  onStart() {
    this._startRound();
  }

  _startRound() {
    if (this.round > this.totalRounds) {
      return this.finishGame(this.players.map((p) => ({
        id: p.id, name: p.name, color: p.color, hat: p.hat, isBot: p.isBot,
        score: Math.max(0, p.score),
        detail: p.bestMs < 9999 ? `⚡ Rekor ${p.bestMs} ms` : 'Belum sempat tap!',
      })));
    }
    this.subPhase = 'wait';
    this.hasBait = this.round >= 2 && Math.random() < 0.45;
    this.timer = randRange(1.6, 3.6);
    this.botTimers.clear();
    this.players.forEach((p) => { p.tapped = false; p.lastMs = null; p.jumped = false; });
  }

  handleAction(playerId, msg) {
    if (this.phase !== 'playing' || msg.action !== 'tap') return;
    const p = this.players.find((x) => x.id === playerId);
    if (!p || p.tapped) return;

    if (this.subPhase === 'wait' || this.subPhase === 'bait') {
      p.tapped = true;
      p.jumped = true;
      p.score = Math.max(0, p.score - 35);
      this.emitEvent('sfx', { sound: 'wrong' });
      return;
    }

    if (this.subPhase === 'go') {
      p.tapped = true;
      const ms = Math.max(40, Math.round(Date.now() - this.goStartAt));
      p.lastMs = ms;
      if (ms < p.bestMs) p.bestMs = ms;
      const rankBonus = Math.max(30, 140 - this.players.filter((x) => x.tapped && !x.jumped).length * 22);
      const speedPts = Math.max(15, Math.round((1200 - Math.min(ms, 1100)) / 10));
      p.score += rankBonus + speedPts;
      this.emitEvent('sfx', { sound: 'correct' });

      if (this.players.every((x) => x.tapped)) {
        this.subPhase = 'result';
        this.timer = 2.0;
      }
    }
  }

  update(dt) {
    this.timer -= dt;
    if (this.subPhase === 'wait' && this.timer <= 0) {
      if (this.hasBait) {
        this.hasBait = false;
        this.subPhase = 'bait';
        this.timer = 1.05;
        this.emitEvent('sfx', { sound: 'tick' });
        for (const p of this.players) {
          if (p.isBot && !p.tapped && Math.random() < 0.25) {
            this.handleAction(p.id, { action: 'tap' });
          }
        }
      } else {
        this._triggerGo();
      }
    } else if (this.subPhase === 'bait' && this.timer <= 0) {
      this.subPhase = 'wait';
      this.timer = randRange(0.9, 2.2);
    } else if (this.subPhase === 'go') {
      for (const [botId, t] of this.botTimers.entries()) {
        const nt = t - dt;
        this.botTimers.set(botId, nt);
        if (nt <= 0) {
          this.botTimers.delete(botId);
          this.handleAction(botId, { action: 'tap' });
        }
      }
      if (this.timer <= 0) {
        this.subPhase = 'result';
        this.timer = 1.9;
      }
    } else if (this.subPhase === 'result' && this.timer <= 0) {
      this.round += 1;
      this._startRound();
    }
  }

  _triggerGo() {
    this.subPhase = 'go';
    this.timer = 2.6;
    this.goStartAt = Date.now();
    this.emitEvent('sfx', { sound: 'go' });
    this.botTimers.clear();
    for (const p of this.players) {
      if (p.isBot && !p.tapped) {
        this.botTimers.set(p.id, randRange(0.24, 0.72));
      }
    }
  }

  getState() {
    return {
      gameId: this.gameId, uiType: 'reflex', phase: this.phase, countdown: Number(this.countdown.toFixed(1)),
      subPhase: this.subPhase, round: this.round, totalRounds: this.totalRounds,
      players: this.players.map((p) => ({
        id: p.id, name: p.name, color: p.color, hat: p.hat,
        score: p.score, tapped: p.tapped, lastMs: p.lastMs, jumped: p.jumped,
      })),
    };
  }
}

// =========================================================================
// 20. MATH PANIC — 10 Escalating Rapid-Fire Mental Math Equations!
// =========================================================================
function genMathProblem(level) {
  let a, b, c, ans;
  if (level <= 2) {
    a = Math.floor(randRange(8, 35)); b = Math.floor(randRange(5, 29));
    if (Math.random() < 0.5) return buildOpts(`${a} + ${b} = ?`, a + b);
    if (b > a) [a, b] = [b, a];
    return buildOpts(`${a} - ${b} = ?`, a - b);
  }
  if (level <= 5) {
    if (Math.random() < 0.6) {
      a = Math.floor(randRange(4, 15)); b = Math.floor(randRange(3, 13));
      return buildOpts(`${a} × ${b} = ?`, a * b);
    }
    b = Math.floor(randRange(3, 12)); ans = Math.floor(randRange(4, 16));
    return buildOpts(`${b * ans} ÷ ${b} = ?`, ans);
  }
  if (level <= 8) {
    if (Math.random() < 0.5) {
      a = Math.floor(randRange(5, 13)); c = Math.floor(randRange(5, 25));
      return buildOpts(`${a}² - ${c} = ?`, a * a - c);
    }
    a = Math.floor(randRange(4, 12)); b = Math.floor(randRange(3, 9)); c = Math.floor(randRange(4, 19));
    return buildOpts(`${a} × ${b} + ${c} = ?`, a * b + c);
  }
  // Boss rounds 9-10!
  const pct = pickRandom([10, 20, 25, 50]);
  const base = pickRandom([80, 120, 160, 200, 240, 300, 400]);
  return buildOpts(`${pct}% dari ${base} = ?`, Math.round((pct / 100) * base));
}

function buildOpts(prompt, ans) {
  const set = new Set([ans]);
  while (set.size < 4) {
    const delta = pickRandom([-12, -10, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 10, 12]);
    if (ans + delta >= 0) set.add(ans + delta);
  }
  const opts = [...set].sort(() => Math.random() - 0.5);
  return { q: prompt, opts: opts.map(String), ans: opts.indexOf(ans) };
}

export class MathPanicGame extends BaseGame {
  constructor(room, players) {
    super(room, 'math-panic');
    this.players = players.map((p) => ({
      id: p.id, name: p.name, color: p.color, hat: p.hat, isBot: !!p.isBot,
      score: 0, streak: 0, correct: 0, answer: null,
    }));
    this.round = 1;
    this.totalRounds = 10;
    this.problem = genMathProblem(1);
    this.subPhase = 'question';
    this.timer = 8.0;
    this.botTimers = new Map();
    this.countdown = 3.5;
  }

  onStart() {
    this._startRound();
  }

  _startRound() {
    if (this.round > this.totalRounds) {
      return this.finishGame(this.players.map((p) => ({
        id: p.id, name: p.name, color: p.color, hat: p.hat, isBot: p.isBot,
        score: p.score, detail: `🧮 ${p.correct}/${this.totalRounds} hitungan benar`,
      })));
    }
    this.problem = genMathProblem(this.round);
    this.subPhase = 'question';
    this.timer = Math.max(5.5, 8.5 - this.round * 0.25);
    this.botTimers.clear();
    this.players.forEach((p) => {
      p.answer = null;
      if (p.isBot) this.botTimers.set(p.id, randRange(1.2, 4.4));
    });
  }

  handleAction(playerId, msg) {
    if (this.phase !== 'playing' || this.subPhase !== 'question' || msg.action !== 'choice') return;
    const p = this.players.find((x) => x.id === playerId);
    if (!p || p.answer !== null) return;
    const idx = Number(msg.index);
    if (idx < 0 || idx > 3) return;
    p.answer = idx;
    if (idx === this.problem.ans) {
      p.correct += 1;
      p.streak += 1;
      p.score += Math.round(60 + (this.timer / 8) * 75 + Math.min(p.streak - 1, 4) * 15);
      this.emitEvent('sfx', { sound: 'correct' });
    } else {
      p.streak = 0;
      this.emitEvent('sfx', { sound: 'wrong' });
    }
    if (this.players.every((x) => x.answer !== null)) {
      this.subPhase = 'reveal';
      this.timer = 1.6;
    }
  }

  update(dt) {
    this.timer -= dt;
    if (this.subPhase === 'question') {
      for (const [botId, t] of this.botTimers.entries()) {
        const nt = t - dt;
        this.botTimers.set(botId, nt);
        if (nt <= 0) {
          this.botTimers.delete(botId);
          const pick = Math.random() < 0.7 ? this.problem.ans : Math.floor(Math.random() * 4);
          this.handleAction(botId, { action: 'choice', index: pick });
        }
      }
      if (this.timer <= 0) {
        this.subPhase = 'reveal';
        this.timer = 1.7;
      }
    } else if (this.timer <= 0) {
      this.round += 1;
      this._startRound();
    }
  }

  getState() {
    return {
      gameId: this.gameId, uiType: 'quiz', phase: this.phase, countdown: Number(this.countdown.toFixed(1)),
      subPhase: this.subPhase, timer: Number(Math.max(0, this.timer).toFixed(1)),
      round: this.round, totalRounds: this.totalRounds,
      prompt: this.problem.q, options: this.problem.opts,
      correctIdx: this.subPhase === 'reveal' ? this.problem.ans : null,
      players: this.players.map((p) => ({
        id: p.id, name: p.name, color: p.color, hat: p.hat,
        score: p.score, answered: p.answer !== null,
        lastCorrect: this.subPhase === 'reveal' ? p.answer === this.problem.ans : null,
      })),
    };
  }
}

// =========================================================================
// 24. TEBAK ANGKA TERDEKAT (CLOSEST WINS) — Competitive Estimation Battle!
// =========================================================================
const ESTIMATION_BANK = [
  { q: 'Berapa tinggi Menara Eiffel di Paris (dalam meter)?', ans: 330, unit: 'meter' },
  { q: 'Berapa jumlah tulang pada tubuh manusia dewasa?', ans: 206, unit: 'tulang' },
  { q: 'Berapa kecepatan lari maksimal Cheetah (dalam km/jam)?', ans: 120, unit: 'km/jam' },
  { q: 'Tahun berapa game Minecraft pertama kali dirilis?', ans: 2009, unit: 'tahun' },
  { q: 'Tahun berapa aplikasi Discord pertama kali diluncurkan?', ans: 2015, unit: 'tahun' },
  { q: 'Berapa tinggi Monas (Monumen Nasional) Jakarta (dalam meter)?', ans: 132, unit: 'meter' },
  { q: 'Berapa tinggi Gunung Semeru di Jawa Timur (dalam meter mdpl)?', ans: 3676, unit: 'mdpl' },
  { q: 'Berapa tinggi Gunung Everest (dalam meter)?', ans: 8849, unit: 'meter' },
  { q: 'Berapa jumlah provinsi di Indonesia saat ini?', ans: 38, unit: 'provinsi' },
  { q: 'Berapa jumlah gigi permanen orang dewasa normal?', ans: 32, unit: 'gigi' },
  { q: 'Berapa menit waktu yang dibutuhkan cahaya Matahari sampai ke Bumi?', ans: 8, unit: 'menit' },
  { q: 'Berapa suhu permukaan Matahari (dalam °C)?', ans: 5500, unit: '°C' },
  { q: 'Berapa panjang lapangan sepak bola internasional standar (dalam meter)?', ans: 105, unit: 'meter' },
  { q: 'Berapa jumlah negara anggota resmi PBB?', ans: 193, unit: 'negara' },
  { q: 'Tahun berapa iPhone generasi pertama dirilis oleh Apple?', ans: 2007, unit: 'tahun' },
  { q: 'Tahun berapa YouTube pertama kali didirikan?', ans: 2005, unit: 'tahun' },
  { q: 'Berapa jumlah hari dalam 1 tahun kabisat?', ans: 366, unit: 'hari' },
  { q: 'Berapa kilometer jarak dari Jakarta ke Bandung kira-kira?', ans: 150, unit: 'km' },
  { q: 'Berapa tinggi gedung Burj Khalifa di Dubai (dalam meter)?', ans: 828, unit: 'meter' },
  { q: 'Berapa lama waktu 1 pertandingan sepak bola normal (dalam menit)?', ans: 90, unit: 'menit' },
  { q: 'Tahun berapa Mobile Legends: Bang Bang pertama kali rilis?', ans: 2016, unit: 'tahun' },
  { q: 'Tahun berapa PlayStation 2 dirilis pertama kali?', ans: 2000, unit: 'tahun' },
  { q: 'Berapa jumlah kunci/tuts pada piano grand standar?', ans: 88, unit: 'tuts' },
  { q: 'Berapa detak jantung normal manusia dewasa saat istirahat (per menit)?', ans: 72, unit: 'bpm' },
  { q: 'Berapa jumlah episode anime Naruto (seri pertama, sebelum Shippuden)?', ans: 220, unit: 'episode' },
  { q: 'Berapa gram berat 1 bola sepak ukuran standar FIFA?', ans: 430, unit: 'gram' },
  { q: 'Berapa rata-rata lama kehamilan gajah (dalam bulan)?', ans: 22, unit: 'bulan' },
  { q: 'Berapa kilometer panjang Tembok Besar China (ribuan km, tulis angka ribuannya)?', ans: 21, unit: 'ribu km' },
  { q: 'Tahun berapa film Avengers: Endgame tayang di bioskop?', ans: 2019, unit: 'tahun' },
  { q: 'Berapa total huruf dalam alfabet Latin (A sampai Z)?', ans: 26, unit: 'huruf' },
];

export class ClosestWinsGame extends BaseGame {
  constructor(room, players) {
    super(room, 'closest-wins');
    this.players = players.map((p) => ({
      id: p.id, name: p.name, color: p.color, hat: p.hat, isBot: !!p.isBot,
      score: 0, guess: null, lastDiff: null, wins: 0,
    }));
    this.questions = [...ESTIMATION_BANK].sort(() => Math.random() - 0.5).slice(0, 6);
    this.qIdx = 0;
    this.subPhase = 'question'; // question | reveal
    this.timer = 13;
    this.botTimers = new Map();
    this.countdown = 3.5;
  }

  onStart() {
    this._startQ();
  }

  _startQ() {
    if (this.qIdx >= this.questions.length) {
      return this.finishGame(this.players.map((p) => ({
        id: p.id, name: p.name, color: p.color, hat: p.hat, isBot: p.isBot,
        score: p.score, detail: `🎯 ${p.wins}x tebakan terdekat`,
      })));
    }
    this.subPhase = 'question';
    this.timer = 13;
    this.botTimers.clear();
    this.players.forEach((p) => {
      p.guess = null;
      p.lastDiff = null;
      if (p.isBot) this.botTimers.set(p.id, randRange(2.0, 7.5));
    });
  }

  handleAction(playerId, msg) {
    if (this.phase !== 'playing' || this.subPhase !== 'question' || msg.action !== 'estimate') return;
    const p = this.players.find((x) => x.id === playerId);
    if (!p || p.guess !== null) return;
    const num = Number(msg.value);
    if (!Number.isFinite(num)) return;
    p.guess = Math.round(num);
    this.emitEvent('sfx', { sound: 'pop' });

    if (this.players.every((x) => x.guess !== null)) {
      this._reveal();
    }
  }

  _reveal() {
    if (this.subPhase === 'reveal') return;
    this.subPhase = 'reveal';
    this.timer = 3.8;
    const ans = this.questions[this.qIdx].ans;
    const ranked = this.players
      .filter((p) => p.guess !== null)
      .map((p) => {
        p.lastDiff = Math.abs(p.guess - ans);
        return p;
      })
      .sort((a, b) => a.lastDiff - b.lastDiff);

    if (ranked.length > 0) {
      const bestDiff = ranked[0].lastDiff;
      ranked.forEach((p, idx) => {
        if (p.lastDiff === 0) {
          p.score += 250; // BULLSEYE JACKPOT!
          p.wins += 1;
        } else if (p.lastDiff === bestDiff) {
          p.score += 150;
          p.wins += 1;
        } else {
          p.score += Math.max(25, 110 - idx * 30);
        }
      });
      this.emitEvent('sfx', { sound: 'correct' });
    }
  }

  update(dt) {
    this.timer -= dt;
    if (this.subPhase === 'question') {
      for (const [botId, t] of this.botTimers.entries()) {
        const nt = t - dt;
        this.botTimers.set(botId, nt);
        if (nt <= 0) {
          this.botTimers.delete(botId);
          const ans = this.questions[this.qIdx].ans;
          const spread = Math.max(5, Math.round(ans * randRange(0.06, 0.35)));
          const guess = Math.max(0, ans + Math.round(randRange(-spread, spread)));
          this.handleAction(botId, { action: 'estimate', value: guess });
        }
      }
      if (this.timer <= 0) this._reveal();
    } else if (this.timer <= 0) {
      this.qIdx += 1;
      this._startQ();
    }
  }

  getState() {
    const q = this.questions[this.qIdx] || this.questions[0];
    return {
      gameId: this.gameId, uiType: 'estimate', phase: this.phase, countdown: Number(this.countdown.toFixed(1)),
      subPhase: this.subPhase, timer: Number(Math.max(0, this.timer).toFixed(1)),
      round: this.qIdx + 1, totalRounds: this.questions.length,
      prompt: q.q, unit: q.unit,
      answer: this.subPhase === 'reveal' ? q.ans : null,
      players: this.players.map((p) => ({
        id: p.id, name: p.name, color: p.color, hat: p.hat,
        score: p.score, answered: p.guess !== null,
        guess: this.subPhase === 'reveal' ? p.guess : null,
        diff: this.subPhase === 'reveal' ? p.lastDiff : null,
      })),
    };
  }
}
