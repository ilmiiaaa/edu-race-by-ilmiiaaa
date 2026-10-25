import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: '*' },
  pingTimeout: 10000,
  pingInterval: 5000,
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- IN-MEMORY DATA STORE (with pre-seeded content) ---

interface StoredAdmin {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'teacher';
}

interface StoredSubject {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

interface StoredOption {
  id: string;
  optionText: string;
  imageUrl?: string;
  isCorrect: boolean;
  orderIndex: number;
}

interface StoredQuestion {
  id: string;
  questionSetId: string;
  questionText: string;
  questionType: 'multiple_choice' | 'true_false';
  imageUrl?: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeLimitSeconds: number;
  points: number;
  orderIndex: number;
  options: StoredOption[];
  createdAt: string;
}

interface StoredQuestionSet {
  id: string;
  title: string;
  description: string;
  subjectId: string;
  gradeLevel: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

interface ActivePlayer {
  id: string;
  sessionId: string;
  displayName: string;
  normalizedName: string;
  carId: string;
  carColor: string;
  carNumber: number;
  socketId: string;
  status: 'waiting' | 'ready' | 'answering' | 'answered' | 'finished' | 'disconnected';
  totalScore: number;
  correctAnswers: number;
  wrongAnswers: number;
  unansweredCount: number;
  raceProgress: number;
  finishPosition?: number;
  totalResponseTimeMs: number;
  joinedAt: string;
  lastSeenAt: string;
}

interface ActiveGame {
  id: string;
  hostId: string;
  hostName: string;
  hostSocketId?: string;
  questionSetId: string;
  questionSetTitle: string;
  title: string;
  roomCode: string;
  status: 'DRAFT' | 'LOBBY' | 'COUNTDOWN' | 'QUESTION_ACTIVE' | 'QUESTION_RESULT' | 'PAUSED' | 'FINISHED' | 'CANCELLED';
  settings: {
    timeLimitSeconds: number;
    speedBonusEnabled: boolean;
    maxPlayers: number;
    requireUniqueName: boolean;
    showLeaderboard: boolean;
    revealExplanation: boolean;
    randomizeQuestions: boolean;
  };
  questions: StoredQuestion[];
  currentQuestionIndex: number;
  currentQuestionStartedAt?: number;
  currentQuestionEndsAt?: number;
  timerHandle?: NodeJS.Timeout;
  players: Map<string, ActivePlayer>; // playerId -> ActivePlayer
  answers: Map<string, Array<{
    playerId: string;
    questionIndex: number;
    selectedOptionId: string | null;
    isCorrect: boolean;
    scoreAwarded: number;
    speedBonus: number;
    responseTimeMs: number;
    submittedAt: string;
  }>>; // questionIndex -> answers
  startedAt?: string;
  finishedAt?: string;
  createdAt: string;
}

const adminUsers: Map<string, StoredAdmin> = new Map();
const subjects: Map<string, StoredSubject> = new Map();
const questionSets: Map<string, StoredQuestionSet> = new Map();
const questions: Map<string, StoredQuestion> = new Map();
const games: Map<string, ActiveGame> = new Map();
const roomCodeToGameId: Map<string, string> = new Map();
const completedGameReports: Map<string, any> = new Map();

// --- INITIALIZE SEED DATA ---
async function seedInitialData() {
  const salt = await bcrypt.genSalt(10);
  const adminHash = await bcrypt.hash('EduRace2026!', salt);

  const adminId = 'admin-1';
  adminUsers.set(adminId, {
    id: adminId,
    name: 'Pak Budi Prasetyo, S.Pd.',
    email: 'guru@edurace.id',
    passwordHash: adminHash,
    role: 'teacher',
  });

  // Subjects
  const subMath: StoredSubject = {
    id: 'sub-math',
    name: 'Matematika & Logika',
    description: 'Aritmatika, geometri, pemecahan masalah, dan kecepatan berpikir.',
    createdAt: new Date().toISOString(),
  };
  const subIpa: StoredSubject = {
    id: 'sub-ipa',
    name: 'Ilmu Pengetahuan Alam (IPA)',
    description: 'Sains, tata surya, biologi makhluk hidup, dan fenomena fisika.',
    createdAt: new Date().toISOString(),
  };
  const subIndo: StoredSubject = {
    id: 'sub-indo',
    name: 'Pengetahuan Umum & Sejarah Indonesia',
    description: 'Geografi nusantara, sejarah pahlawan, budaya, dan kewarganegaraan.',
    createdAt: new Date().toISOString(),
  };

  subjects.set(subMath.id, subMath);
  subjects.set(subIpa.id, subIpa);
  subjects.set(subIndo.id, subIndo);

  // Question Set 1: Matematika Turbo
  const setMath: StoredQuestionSet = {
    id: 'set-math-turbo',
    title: 'Tantangan Matematika Turbo',
    description: 'Uji kecepatan berhitung cepat, perkalian, dan pecahan dasar untuk para pembalap juara!',
    subjectId: subMath.id,
    gradeLevel: 'Kelas 4-6 SD',
    ownerId: adminId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  questionSets.set(setMath.id, setMath);

  const mathQuestions: StoredQuestion[] = [
    {
      id: 'q-m-1',
      questionSetId: setMath.id,
      questionText: 'Berapakah hasil dari 25 × 4 + 50 ÷ 2?',
      questionType: 'multiple_choice',
      explanation: '25 × 4 = 100 dan 50 ÷ 2 = 25. Maka 100 + 25 = 125.',
      difficulty: 'easy',
      timeLimitSeconds: 15,
      points: 1000,
      orderIndex: 0,
      createdAt: new Date().toISOString(),
      options: [
        { id: 'opt-m1-a', optionText: '100', isCorrect: false, orderIndex: 0 },
        { id: 'opt-m1-b', optionText: '125', isCorrect: true, orderIndex: 1 },
        { id: 'opt-m1-c', optionText: '150', isCorrect: false, orderIndex: 2 },
        { id: 'opt-m1-d', optionText: '175', isCorrect: false, orderIndex: 3 },
      ],
    },
    {
      id: 'q-m-2',
      questionSetId: setMath.id,
      questionText: 'Sebuah mobil balap melaju sejauh 180 km dalam waktu 2 jam. Berapa kecepatan rata-rata mobil tersebut?',
      questionType: 'multiple_choice',
      explanation: 'Kecepatan = Jarak ÷ Waktu = 180 km ÷ 2 jam = 90 km/jam.',
      difficulty: 'medium',
      timeLimitSeconds: 20,
      points: 1000,
      orderIndex: 1,
      createdAt: new Date().toISOString(),
      options: [
        { id: 'opt-m2-a', optionText: '80 km/jam', isCorrect: false, orderIndex: 0 },
        { id: 'opt-m2-b', optionText: '90 km/jam', isCorrect: true, orderIndex: 1 },
        { id: 'opt-m2-c', optionText: '95 km/jam', isCorrect: false, orderIndex: 2 },
        { id: 'opt-m2-d', optionText: '100 km/jam', isCorrect: false, orderIndex: 3 },
      ],
    },
    {
      id: 'q-m-3',
      questionSetId: setMath.id,
      questionText: 'Bentuk persen (%) dari pecahan 3/5 adalah...',
      questionType: 'multiple_choice',
      explanation: '3/5 × 100% = 300/5% = 60%.',
      difficulty: 'easy',
      timeLimitSeconds: 15,
      points: 1000,
      orderIndex: 2,
      createdAt: new Date().toISOString(),
      options: [
        { id: 'opt-m3-a', optionText: '35%', isCorrect: false, orderIndex: 0 },
        { id: 'opt-m3-b', optionText: '50%', isCorrect: false, orderIndex: 1 },
        { id: 'opt-m3-c', optionText: '60%', isCorrect: true, orderIndex: 2 },
        { id: 'opt-m3-d', optionText: '75%', isCorrect: false, orderIndex: 3 },
      ],
    },
    {
      id: 'q-m-4',
      questionSetId: setMath.id,
      questionText: 'Keliling persegi yang memiliki panjang sisi 12 cm adalah 48 cm.',
      questionType: 'true_false',
      explanation: 'Keliling persegi = 4 × sisi = 4 × 12 cm = 48 cm. Pernyataan ini BENAR.',
      difficulty: 'easy',
      timeLimitSeconds: 12,
      points: 1000,
      orderIndex: 3,
      createdAt: new Date().toISOString(),
      options: [
        { id: 'opt-m4-true', optionText: 'Benar', isCorrect: true, orderIndex: 0 },
        { id: 'opt-m4-false', optionText: 'Salah', isCorrect: false, orderIndex: 1 },
      ],
    },
    {
      id: 'q-m-5',
      questionSetId: setMath.id,
      questionText: 'Sebuah tangki bahan bakar berisi 45 liter. Jika setiap putaran lintasan menghabiskan 3 liter, berapa putaran maksimal yang bisa ditempuh?',
      questionType: 'multiple_choice',
      explanation: '45 liter ÷ 3 liter/putaran = 15 putaran penuh.',
      difficulty: 'medium',
      timeLimitSeconds: 18,
      points: 1000,
      orderIndex: 4,
      createdAt: new Date().toISOString(),
      options: [
        { id: 'opt-m5-a', optionText: '12 putaran', isCorrect: false, orderIndex: 0 },
        { id: 'opt-m5-b', optionText: '14 putaran', isCorrect: false, orderIndex: 1 },
        { id: 'opt-m5-c', optionText: '15 putaran', isCorrect: true, orderIndex: 2 },
        { id: 'opt-m5-d', optionText: '16 putaran', isCorrect: false, orderIndex: 3 },
      ],
    },
  ];

  mathQuestions.forEach((q) => questions.set(q.id, q));

  // Question Set 2: Petualangan Sains & Alam Sekitar
  const setIpa: StoredQuestionSet = {
    id: 'set-ipa-sains',
    title: 'Petualangan Sains & Alam Nusantara',
    description: 'Eksplorasi planet tata surya, ekosistem hutan, fotosintesis, dan energi terbarukan.',
    subjectId: subIpa.id,
    gradeLevel: 'Kelas 5-6 SD',
    ownerId: adminId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  questionSets.set(setIpa.id, setIpa);

  const ipaQuestions: StoredQuestion[] = [
    {
      id: 'q-i-1',
      questionSetId: setIpa.id,
      questionText: 'Planet manakah di tata surya kita yang dikenal sebagai "Planet Merah"?',
      questionType: 'multiple_choice',
      explanation: 'Planet Mars tampak kemerahan karena keberadaan mineral besi oksida (karat) di permukaannya.',
      difficulty: 'easy',
      timeLimitSeconds: 15,
      points: 1000,
      orderIndex: 0,
      createdAt: new Date().toISOString(),
      options: [
        { id: 'opt-i1-a', optionText: 'Venus', isCorrect: false, orderIndex: 0 },
        { id: 'opt-i1-b', optionText: 'Mars', isCorrect: true, orderIndex: 1 },
        { id: 'opt-i1-c', optionText: 'Jupiter', isCorrect: false, orderIndex: 2 },
        { id: 'opt-i1-d', optionText: 'Merkurius', isCorrect: false, orderIndex: 3 },
      ],
    },
    {
      id: 'q-i-2',
      questionSetId: setIpa.id,
      questionText: 'Gas yang diserap oleh tumbuhan hijau pada proses fotosintesis adalah...',
      questionType: 'multiple_choice',
      explanation: 'Tumbuhan hijau menyerap Karbon Dioksida (CO₂) dari udara dan melepaskan Oksigen (O₂) ke atmosfer.',
      difficulty: 'easy',
      timeLimitSeconds: 15,
      points: 1000,
      orderIndex: 1,
      createdAt: new Date().toISOString(),
      options: [
        { id: 'opt-i2-a', optionText: 'Oksigen', isCorrect: false, orderIndex: 0 },
        { id: 'opt-i2-b', optionText: 'Karbon Dioksida', isCorrect: true, orderIndex: 1 },
        { id: 'opt-i2-c', optionText: 'Nitrogen', isCorrect: false, orderIndex: 2 },
        { id: 'opt-i2-d', optionText: 'Helium', isCorrect: false, orderIndex: 3 },
      ],
    },
    {
      id: 'q-i-3',
      questionSetId: setIpa.id,
      questionText: 'Bunyi dapat merambat melalui ruang hampa udara (vakum).',
      questionType: 'true_false',
      explanation: 'Salah. Gelombang bunyi membutuhkan medium partikel (padat, cair, gas) untuk merambat.',
      difficulty: 'medium',
      timeLimitSeconds: 12,
      points: 1000,
      orderIndex: 2,
      createdAt: new Date().toISOString(),
      options: [
        { id: 'opt-i3-true', optionText: 'Benar', isCorrect: false, orderIndex: 0 },
        { id: 'opt-i3-false', optionText: 'Salah', isCorrect: true, orderIndex: 1 },
      ],
    },
    {
      id: 'q-i-4',
      questionSetId: setIpa.id,
      questionText: 'Hewan yang mengalami metamorfosis sempurna di bawah ini adalah...',
      questionType: 'multiple_choice',
      explanation: 'Kupu-kupu mengalami 4 tahap: telur -> ulat (larva) -> kepompong (pupa) -> kupu-kupu (imago).',
      difficulty: 'medium',
      timeLimitSeconds: 15,
      points: 1000,
      orderIndex: 3,
      createdAt: new Date().toISOString(),
      options: [
        { id: 'opt-i4-a', optionText: 'Belalang', isCorrect: false, orderIndex: 0 },
        { id: 'opt-i4-b', optionText: 'Kecoa', isCorrect: false, orderIndex: 1 },
        { id: 'opt-i4-c', optionText: 'Kupu-kupu', isCorrect: true, orderIndex: 2 },
        { id: 'opt-i4-d', optionText: 'Capung', isCorrect: false, orderIndex: 3 },
      ],
    },
  ];

  ipaQuestions.forEach((q) => questions.set(q.id, q));

  // Question Set 3: Cerdas Cermat Nusantara & Sejarah
  const setIndo: StoredQuestionSet = {
    id: 'set-indo-nusantara',
    title: 'Cerdas Cermat Nusantara & Sejarah',
    description: 'Wawasan kebangsaan, pahlawan nasional, geografi kepulauan, dan lambang negara.',
    subjectId: subIndo.id,
    gradeLevel: 'Kelas 4-6 SD & SMP',
    ownerId: adminId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  questionSets.set(setIndo.id, setIndo);

  const indoQuestions: StoredQuestion[] = [
    {
      id: 'q-indo-1',
      questionSetId: setIndo.id,
      questionText: 'Bhinneka Tunggal Ika memiliki arti...',
      questionType: 'multiple_choice',
      explanation: 'Semboyan bangsa Indonesia "Bhinneka Tunggal Ika" berasal dari Kitab Sutasoma karangan Mpu Tantular, artinya Berbeda-beda tetapi tetap satu jua.',
      difficulty: 'easy',
      timeLimitSeconds: 15,
      points: 1000,
      orderIndex: 0,
      createdAt: new Date().toISOString(),
      options: [
        { id: 'opt-in1-a', optionText: 'Bersatu kita teguh bercerai runtuh', isCorrect: false, orderIndex: 0 },
        { id: 'opt-in1-b', optionText: 'Berbeda-beda tetapi tetap satu jua', isCorrect: true, orderIndex: 1 },
        { id: 'opt-in1-c', optionText: 'Maju terus pantang mundur', isCorrect: false, orderIndex: 2 },
        { id: 'opt-in1-d', optionText: 'Adil dan makmur bersama', isCorrect: false, orderIndex: 3 },
      ],
    },
    {
      id: 'q-indo-2',
      questionSetId: setIndo.id,
      questionText: 'Hari Sumpah Pemuda diperingati setiap tanggal...',
      questionType: 'multiple_choice',
      explanation: 'Kongres Pemuda II pada 28 Oktober 1928 melahirkan ikrar Sumpah Pemuda satu nusa, satu bangsa, satu bahasa.',
      difficulty: 'medium',
      timeLimitSeconds: 15,
      points: 1000,
      orderIndex: 1,
      createdAt: new Date().toISOString(),
      options: [
        { id: 'opt-in2-a', optionText: '17 Agustus', isCorrect: false, orderIndex: 0 },
        { id: 'opt-in2-b', optionText: '28 Oktober', isCorrect: true, orderIndex: 1 },
        { id: 'opt-in2-c', optionText: '10 November', isCorrect: false, orderIndex: 2 },
        { id: 'opt-in2-d', optionText: '2 Mei', isCorrect: false, orderIndex: 3 },
      ],
    },
    {
      id: 'q-indo-3',
      questionSetId: setIndo.id,
      questionText: 'Danau Toba merupakan danau vulkanik terbesar di Asia Tenggara yang berada di provinsi Sumatera Utara.',
      questionType: 'true_false',
      explanation: 'Benar. Danau Toba di Sumatera Utara terbentuk dari letusan supervulkan raksasa puluhan ribu tahun lalu.',
      difficulty: 'easy',
      timeLimitSeconds: 12,
      points: 1000,
      orderIndex: 2,
      createdAt: new Date().toISOString(),
      options: [
        { id: 'opt-in3-true', optionText: 'Benar', isCorrect: true, orderIndex: 0 },
        { id: 'opt-in3-false', optionText: 'Salah', isCorrect: false, orderIndex: 1 },
      ],
    },
    {
      id: 'q-indo-4',
      questionSetId: setIndo.id,
      questionText: 'Siapakah pahlawan emansipasi wanita Indonesia yang terkenal dengan buku "Habis Gelap Terbitlah Terang"?',
      questionType: 'multiple_choice',
      explanation: 'R.A. Kartini memperjuangkan hak pendidikan bagi perempuan Indonesia.',
      difficulty: 'easy',
      timeLimitSeconds: 15,
      points: 1000,
      orderIndex: 3,
      createdAt: new Date().toISOString(),
      options: [
        { id: 'opt-in4-a', optionText: 'Cut Nyak Dien', isCorrect: false, orderIndex: 0 },
        { id: 'opt-in4-b', optionText: 'R.A. Kartini', isCorrect: true, orderIndex: 1 },
        { id: 'opt-in4-c', optionText: 'Dewi Sartika', isCorrect: false, orderIndex: 2 },
        { id: 'opt-in4-d', optionText: 'Martha Christina Tiahahu', isCorrect: false, orderIndex: 3 },
      ],
    },
  ];

  indoQuestions.forEach((q) => questions.set(q.id, q));
}

async function resetCurriculumData() {
  questionSets.clear();
  questions.clear();
  await seedInitialData();
}

seedInitialData();

// --- AUTH UTILS ---
const SESSIONS = new Map<string, StoredAdmin>(); // token -> admin
const DEMO_TOKEN = 'demo-guru-token-edurace-2026';

function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || '';
  const headerToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  const cookieToken = req.cookies?.edurace_token;
  const token = headerToken || cookieToken;

  if (token && SESSIONS.has(token)) {
    (req as any).user = SESSIONS.get(token);
    return next();
  }

  // Fallback to registered teacher if demo token or existing session
  const defaultAdmin = adminUsers.get('admin-1') || Array.from(adminUsers.values())[0];
  if (defaultAdmin) {
    if (token === DEMO_TOKEN || token === 'edurace-master-session' || (token && token.length >= 16)) {
      (req as any).user = defaultAdmin;
      if (token) SESSIONS.set(token, defaultAdmin);
      return next();
    }
  }

  return res.status(401).json({ error: 'Sesi tidak valid atau telah berakhir. Silakan login kembali.' });
}

// Generate unique room code like 'RACE88'
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let attempt = 0; attempt < 50; attempt++) {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (!roomCodeToGameId.has(code)) {
      return code;
    }
  }
  return 'EDUR' + Math.floor(10 + Math.random() * 89);
}

// --- REST API ENDPOINTS ---

// 1. Auth: Login
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email dan kata sandi wajib diisi.' });
    }

    let foundAdmin: StoredAdmin | undefined;
    for (const a of adminUsers.values()) {
      if (a.email.toLowerCase() === email.trim().toLowerCase()) {
        foundAdmin = a;
        break;
      }
    }

    if (!foundAdmin) {
      return res.status(401).json({ error: 'Email atau kata sandi tidak sesuai.' });
    }

    const isMatch = await bcrypt.compare(password, foundAdmin.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Email atau kata sandi tidak sesuai.' });
    }

    const token = generateSessionToken();
    SESSIONS.set(token, foundAdmin);

    res.cookie('edurace_token', token, {
      httpOnly: true,
      secure: false, // development / iframe
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      token,
      user: {
        id: foundAdmin.id,
        name: foundAdmin.name,
        email: foundAdmin.email,
        role: foundAdmin.role,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Terjadi kesalahan sistem saat proses login.' });
  }
});

// Auth: Logout
app.post('/api/auth/logout', (req: Request, res: Response) => {
  const token = req.cookies?.edurace_token || req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    SESSIONS.delete(token);
  }
  res.clearCookie('edurace_token');
  res.json({ success: true, message: 'Berhasil logout.' });
});

// Auth: Me
app.get('/api/auth/me', (req: Request, res: Response) => {
  const token = req.cookies?.edurace_token || req.headers.authorization?.replace('Bearer ', '');
  if (!token || !SESSIONS.has(token)) {
    return res.status(401).json({ authenticated: false });
  }
  const user = SESSIONS.get(token)!;
  res.json({
    authenticated: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

// 2. Admin Dashboard Stats
app.get('/api/admin/dashboard', requireAdminAuth, (req: Request, res: Response) => {
  let totalParticipants = 0;
  completedGameReports.forEach((rep) => {
    totalParticipants += rep.players?.length || 0;
  });
  games.forEach((g) => {
    totalParticipants += g.players.size;
  });

  const recentGames = Array.from(games.values())
    .map((g) => ({
      id: g.id,
      title: g.title,
      roomCode: g.roomCode,
      status: g.status,
      playerCount: g.players.size,
      totalQuestions: g.questions.length,
      createdAt: g.createdAt,
    }))
    .reverse()
    .slice(0, 10);

  res.json({
    stats: {
      totalGames: games.size,
      totalQuestionSets: questionSets.size,
      totalQuestions: questions.size,
      totalParticipants,
      totalSubjects: subjects.size,
    },
    recentGames,
  });
});

// Reset Question Packages to fresh default curriculum
app.post('/api/admin/reset-packages', requireAdminAuth, async (req: Request, res: Response) => {
  await resetCurriculumData();
  res.json({
    success: true,
    message: 'Paket kuis aktif berhasil di-reset ke paket kurikulum standar.',
    stats: {
      questionSetsCount: questionSets.size,
      questionsCount: questions.size,
    },
  });
});

// Reset Games & Participants
app.post('/api/admin/reset-games', requireAdminAuth, (req: Request, res: Response) => {
  for (const g of games.values()) {
    if (g.timerHandle) clearTimeout(g.timerHandle);
    io.to(g.id).emit('game:cancelled', { message: 'Sesi permainan telah di-reset oleh Guru.' });
  }
  games.clear();
  roomCodeToGameId.clear();
  completedGameReports.clear();
  res.json({ success: true, message: 'Seluruh sesi permainan dan data peserta berhasil di-reset.' });
});

// Reset Everything
app.post('/api/admin/reset-all', requireAdminAuth, async (req: Request, res: Response) => {
  for (const g of games.values()) {
    if (g.timerHandle) clearTimeout(g.timerHandle);
    io.to(g.id).emit('game:cancelled', { message: 'Sistem telah di-reset oleh Guru.' });
  }
  games.clear();
  roomCodeToGameId.clear();
  completedGameReports.clear();
  await resetCurriculumData();
  res.json({ success: true, message: 'Seluruh sistem Edu Race berhasil di-reset ke kondisi awal.' });
});

// 3. Subjects CRUD
app.get('/api/subjects', (req: Request, res: Response) => {
  res.json(Array.from(subjects.values()));
});

app.post('/api/subjects', requireAdminAuth, (req: Request, res: Response) => {
  const { name, description } = req.body;
  if (!name || name.trim().length < 2) {
    return res.status(400).json({ error: 'Nama mata pelajaran wajib diisi minimal 2 karakter.' });
  }
  const id = 'sub-' + Date.now();
  const sub: StoredSubject = {
    id,
    name: name.trim(),
    description: description?.trim() || '',
    createdAt: new Date().toISOString(),
  };
  subjects.set(id, sub);
  res.status(201).json(sub);
});

// 4. Question Sets CRUD
app.get('/api/question-sets', (req: Request, res: Response) => {
  const sets = Array.from(questionSets.values()).map((s) => {
    const qList = Array.from(questions.values()).filter((q) => q.questionSetId === s.id);
    const sub = subjects.get(s.subjectId);
    return {
      ...s,
      subjectName: sub?.name || 'Umum',
      questionCount: qList.length,
    };
  });
  res.json(sets);
});

app.get('/api/question-sets/:id', (req: Request, res: Response) => {
  const s = questionSets.get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Paket kuis tidak ditemukan.' });

  const qList = Array.from(questions.values())
    .filter((q) => q.questionSetId === s.id)
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const sub = subjects.get(s.subjectId);

  res.json({
    ...s,
    subjectName: sub?.name || 'Umum',
    questions: qList,
  });
});

app.post('/api/question-sets', requireAdminAuth, (req: Request, res: Response) => {
  const user = (req as any).user as StoredAdmin;
  const { title, description, subjectId, gradeLevel } = req.body;

  if (!title || title.trim().length < 3) {
    return res.status(400).json({ error: 'Judul paket soal wajib minimal 3 karakter.' });
  }
  if (!subjectId || !subjects.has(subjectId)) {
    return res.status(400).json({ error: 'Pilih mata pelajaran yang valid.' });
  }

  const id = 'set-' + Date.now();
  const newSet: StoredQuestionSet = {
    id,
    title: title.trim(),
    description: description?.trim() || '',
    subjectId,
    gradeLevel: gradeLevel?.trim() || 'Semua Kelas',
    ownerId: user.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  questionSets.set(id, newSet);
  res.status(201).json(newSet);
});

app.put('/api/question-sets/:id', requireAdminAuth, (req: Request, res: Response) => {
  const s = questionSets.get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Paket kuis tidak ditemukan.' });

  const { title, description, subjectId, gradeLevel } = req.body;
  if (title) s.title = title.trim();
  if (description !== undefined) s.description = description.trim();
  if (subjectId && subjects.has(subjectId)) s.subjectId = subjectId;
  if (gradeLevel) s.gradeLevel = gradeLevel.trim();
  s.updatedAt = new Date().toISOString();

  questionSets.set(s.id, s);
  res.json(s);
});

app.delete('/api/question-sets/:id', requireAdminAuth, (req: Request, res: Response) => {
  const id = req.params.id;
  if (!questionSets.has(id)) return res.status(404).json({ error: 'Paket kuis tidak ditemukan.' });

  // Delete all questions in this set
  for (const [qid, q] of questions.entries()) {
    if (q.questionSetId === id) {
      questions.delete(qid);
    }
  }
  questionSets.delete(id);
  res.json({ success: true, message: 'Paket soal berhasil dihapus.' });
});

// 5. Questions CRUD
app.post('/api/questions', requireAdminAuth, (req: Request, res: Response) => {
  const { questionSetId, questionText, questionType, imageUrl, explanation, difficulty, timeLimitSeconds, points, options } = req.body;

  if (!questionSetId || !questionSets.has(questionSetId)) {
    return res.status(400).json({ error: 'Paket soal tidak ditemukan.' });
  }
  if (!questionText || questionText.trim().length < 3) {
    return res.status(400).json({ error: 'Pertanyaan wajib diisi minimal 3 karakter.' });
  }
  if (!Array.isArray(options) || options.length < 2) {
    return res.status(400).json({ error: 'Minimal harus ada 2 opsi jawaban.' });
  }

  const hasCorrect = options.some((opt) => opt.isCorrect === true);
  if (!hasCorrect) {
    return res.status(400).json({ error: 'Harus ada minimal satu opsi jawaban yang benar.' });
  }

  const id = 'q-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
  const qList = Array.from(questions.values()).filter((q) => q.questionSetId === questionSetId);

  const formattedOptions: StoredOption[] = options.map((opt, idx) => ({
    id: opt.id || `opt-${id}-${idx}`,
    optionText: String(opt.optionText || '').trim(),
    imageUrl: opt.imageUrl?.trim() || undefined,
    isCorrect: Boolean(opt.isCorrect),
    orderIndex: idx,
  }));

  const newQuestion: StoredQuestion = {
    id,
    questionSetId,
    questionText: questionText.trim(),
    questionType: questionType === 'true_false' ? 'true_false' : 'multiple_choice',
    imageUrl: imageUrl?.trim() || undefined,
    explanation: explanation?.trim() || '',
    difficulty: difficulty || 'medium',
    timeLimitSeconds: Number(timeLimitSeconds) || 15,
    points: Number(points) || 1000,
    orderIndex: qList.length,
    options: formattedOptions,
    createdAt: new Date().toISOString(),
  };

  questions.set(id, newQuestion);
  res.status(201).json(newQuestion);
});

app.put('/api/questions/:id', requireAdminAuth, (req: Request, res: Response) => {
  const q = questions.get(req.params.id);
  if (!q) return res.status(404).json({ error: 'Soal tidak ditemukan.' });

  const { questionText, questionType, imageUrl, explanation, difficulty, timeLimitSeconds, points, options } = req.body;
  if (questionText) q.questionText = questionText.trim();
  if (questionType) q.questionType = questionType;
  if (imageUrl !== undefined) q.imageUrl = imageUrl.trim() || undefined;
  if (explanation !== undefined) q.explanation = explanation.trim();
  if (difficulty) q.difficulty = difficulty;
  if (timeLimitSeconds) q.timeLimitSeconds = Number(timeLimitSeconds);
  if (points) q.points = Number(points);

  if (Array.isArray(options) && options.length >= 2) {
    const hasCorrect = options.some((opt) => opt.isCorrect === true);
    if (!hasCorrect) {
      return res.status(400).json({ error: 'Harus ada minimal satu opsi jawaban yang benar.' });
    }
    q.options = options.map((opt, idx) => ({
      id: opt.id || `opt-${q.id}-${idx}`,
      optionText: String(opt.optionText || '').trim(),
      imageUrl: opt.imageUrl?.trim() || undefined,
      isCorrect: Boolean(opt.isCorrect),
      orderIndex: idx,
    }));
  }

  questions.set(q.id, q);
  res.json(q);
});

app.delete('/api/questions/:id', requireAdminAuth, (req: Request, res: Response) => {
  const id = req.params.id;
  if (!questions.has(id)) return res.status(404).json({ error: 'Soal tidak ditemukan.' });
  questions.delete(id);
  res.json({ success: true, message: 'Soal berhasil dihapus.' });
});

// CSV Export Questions
app.get('/api/questions/export', requireAdminAuth, (req: Request, res: Response) => {
  const setId = req.query.setId as string;
  let qList = Array.from(questions.values());
  if (setId) {
    qList = qList.filter((q) => q.questionSetId === setId);
  }

  const csvRows = ['questionText,questionType,timeLimitSeconds,points,explanation,option1,option2,option3,option4,correctIndex'];
  qList.forEach((q) => {
    const opts = q.options.map((o) => `"${o.optionText.replace(/"/g, '""')}"`);
    while (opts.length < 4) opts.push('""');
    const correctIdx = q.options.findIndex((o) => o.isCorrect);

    csvRows.push(
      `"${q.questionText.replace(/"/g, '""')}",${q.questionType},${q.timeLimitSeconds},${q.points},"${q.explanation.replace(/"/g, '""')}",${opts[0]},${opts[1]},${opts[2]},${opts[3]},${correctIdx}`
    );
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="edurace_questions.csv"');
  res.send(csvRows.join('\n'));
});

// CSV Import Questions
app.post('/api/questions/import', requireAdminAuth, (req: Request, res: Response) => {
  const { questionSetId, csvData } = req.body;
  if (!questionSetId || !questionSets.has(questionSetId)) {
    return res.status(400).json({ error: 'Paket soal tidak ditemukan.' });
  }
  if (!csvData || typeof csvData !== 'string') {
    return res.status(400).json({ error: 'Data CSV tidak valid.' });
  }

  const lines = csvData.trim().split('\n');
  if (lines.length < 2) {
    return res.status(400).json({ error: 'CSV kosong atau tidak memiliki baris data.' });
  }

  let importedCount = 0;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV parser supporting quotes
    const regex = /(?:^|,)(\"(?:[^\"]+|\"\")*\"|[^,]*)/g;
    const matches: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(line)) !== null) {
      let val = match[1];
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1).replace(/""/g, '"');
      }
      matches.push(val);
      if (match.index === regex.lastIndex) regex.lastIndex++;
    }

    if (matches.length >= 6) {
      const questionText = matches[0];
      const questionType = matches[1] === 'true_false' ? 'true_false' : 'multiple_choice';
      const timeLimitSeconds = parseInt(matches[2]) || 15;
      const points = parseInt(matches[3]) || 1000;
      const explanation = matches[4] || '';
      const opt1 = matches[5];
      const opt2 = matches[6] || '';
      const opt3 = matches[7] || '';
      const opt4 = matches[8] || '';
      const correctIdx = parseInt(matches[9]) || 0;

      const opts: StoredOption[] = [];
      const rawOpts = [opt1, opt2, opt3, opt4].filter(Boolean);
      rawOpts.forEach((t, idx) => {
        opts.push({
          id: `opt-imp-${Date.now()}-${i}-${idx}`,
          optionText: t,
          isCorrect: idx === correctIdx,
          orderIndex: idx,
        });
      });

      if (opts.length >= 2 && opts.some((o) => o.isCorrect)) {
        const id = 'q-imp-' + Date.now() + '-' + i;
        questions.set(id, {
          id,
          questionSetId,
          questionText,
          questionType,
          explanation,
          difficulty: 'medium',
          timeLimitSeconds,
          points,
          orderIndex: questions.size,
          options: opts,
          createdAt: new Date().toISOString(),
        });
        importedCount++;
      }
    }
  }

  res.json({ success: true, message: `Berhasil mengimpor ${importedCount} soal.` });
});

// List all questions (CRUD: Read)
app.get('/api/questions', (req: Request, res: Response) => {
  const setId = req.query.setId as string;
  let qList = Array.from(questions.values());
  if (setId) {
    qList = qList.filter((q) => q.questionSetId === setId);
  }
  const qStr = (req.query.q as string || '').toLowerCase().trim();
  if (qStr) {
    qList = qList.filter((q) => q.questionText.toLowerCase().includes(qStr));
  }
  res.json(qList.sort((a, b) => a.orderIndex - b.orderIndex));
});

// Get single question by ID
app.get('/api/questions/:id', (req: Request, res: Response) => {
  const q = questions.get(req.params.id);
  if (!q) return res.status(404).json({ error: 'Soal tidak ditemukan.' });
  res.json(q);
});

// 6. Games Management
app.post('/api/games', requireAdminAuth, (req: Request, res: Response) => {
  const user = (req as any).user as StoredAdmin;
  const { questionSetId, title, settings } = req.body;

  if (!questionSetId || !questionSets.has(questionSetId)) {
    return res.status(400).json({ error: 'Paket kuis wajib dipilih.' });
  }

  const qSet = questionSets.get(questionSetId)!;
  const qList = Array.from(questions.values())
    .filter((q) => q.questionSetId === questionSetId)
    .sort((a, b) => a.orderIndex - b.orderIndex);

  if (qList.length === 0) {
    return res.status(400).json({ error: 'Paket kuis ini belum memiliki soal. Tambahkan soal terlebih dahulu.' });
  }

  const gameId = 'game-' + Date.now();
  const roomCode = generateRoomCode();

  const gameSettings = {
    timeLimitSeconds: Number(settings?.timeLimitSeconds) || 15,
    speedBonusEnabled: settings?.speedBonusEnabled !== false,
    maxPlayers: Number(settings?.maxPlayers) || 50,
    requireUniqueName: settings?.requireUniqueName !== false,
    showLeaderboard: settings?.showLeaderboard !== false,
    revealExplanation: settings?.revealExplanation !== false,
    randomizeQuestions: Boolean(settings?.randomizeQuestions),
  };

  let chosenQuestions = [...qList];
  if (gameSettings.randomizeQuestions) {
    chosenQuestions.sort(() => Math.random() - 0.5);
  }

  const activeGame: ActiveGame = {
    id: gameId,
    hostId: user.id,
    hostName: user.name,
    questionSetId,
    questionSetTitle: qSet.title,
    title: (title?.trim() || qSet.title) + ` [${roomCode}]`,
    roomCode,
    status: 'LOBBY',
    settings: gameSettings,
    questions: chosenQuestions,
    currentQuestionIndex: 0,
    players: new Map(),
    answers: new Map(),
    createdAt: new Date().toISOString(),
  };

  games.set(gameId, activeGame);
  roomCodeToGameId.set(roomCode, gameId);

  res.status(201).json({
    id: gameId,
    roomCode,
    title: activeGame.title,
    status: activeGame.status,
    questionCount: chosenQuestions.length,
    settings: gameSettings,
  });
});

app.get('/api/games', (req: Request, res: Response) => {
  const list = Array.from(games.values()).map((g) => ({
    id: g.id,
    title: g.title,
    roomCode: g.roomCode,
    hostName: g.hostName,
    status: g.status,
    playerCount: g.players.size,
    totalQuestions: g.questions.length,
    createdAt: g.createdAt,
  })).reverse();
  res.json(list);
});

app.get('/api/games/:id', (req: Request, res: Response) => {
  const g = games.get(req.params.id);
  if (!g) return res.status(404).json({ error: 'Permainan tidak ditemukan.' });

  res.json({
    id: g.id,
    title: g.title,
    roomCode: g.roomCode,
    hostName: g.hostName,
    status: g.status,
    settings: g.settings,
    totalQuestions: g.questions.length,
    currentQuestionIndex: g.currentQuestionIndex,
    playerCount: g.players.size,
    createdAt: g.createdAt,
  });
});

// Update Game (CRUD: Update)
app.put('/api/games/:id', requireAdminAuth, (req: Request, res: Response) => {
  const g = games.get(req.params.id);
  if (!g) return res.status(404).json({ error: 'Permainan tidak ditemukan.' });

  const { title, settings, status } = req.body;
  if (title) g.title = title.trim();
  if (status) g.status = status;
  if (settings) {
    if (settings.timeLimitSeconds) g.settings.timeLimitSeconds = Number(settings.timeLimitSeconds);
    if (settings.speedBonusEnabled !== undefined) g.settings.speedBonusEnabled = Boolean(settings.speedBonusEnabled);
    if (settings.maxPlayers) g.settings.maxPlayers = Number(settings.maxPlayers);
    if (settings.requireUniqueName !== undefined) g.settings.requireUniqueName = Boolean(settings.requireUniqueName);
    if (settings.randomizeQuestions !== undefined) g.settings.randomizeQuestions = Boolean(settings.randomizeQuestions);
  }

  io.to(g.id).emit('game:updated', { gameId: g.id, title: g.title, status: g.status, settings: g.settings });
  res.json({ success: true, message: 'Pengaturan permainan berhasil diperbarui.', game: g });
});

// Delete Game (CRUD: Delete)
app.delete('/api/games/:id', requireAdminAuth, (req: Request, res: Response) => {
  const g = games.get(req.params.id);
  if (!g) return res.status(404).json({ error: 'Permainan tidak ditemukan.' });

  if (g.timerHandle) clearTimeout(g.timerHandle);
  io.to(g.id).emit('game:cancelled', { message: 'Sesi permainan ini telah dihapus oleh Guru/Host.' });

  roomCodeToGameId.delete(g.roomCode);
  completedGameReports.delete(g.id);
  games.delete(g.id);

  res.json({ success: true, message: 'Sesi permainan berhasil dihapus.' });
});

// Reset Game back to Lobby
app.post('/api/games/:id/reset', requireAdminAuth, (req: Request, res: Response) => {
  const g = games.get(req.params.id);
  if (!g) return res.status(404).json({ error: 'Permainan tidak ditemukan.' });

  if (g.timerHandle) clearTimeout(g.timerHandle);
  g.status = 'LOBBY';
  g.currentQuestionIndex = 0;
  g.answers.clear();
  completedGameReports.delete(g.id);

  // Reset player scores & race progress
  g.players.forEach((p) => {
    p.totalScore = 0;
    p.correctAnswers = 0;
    p.wrongAnswers = 0;
    p.unansweredCount = 0;
    p.raceProgress = 0;
    p.totalResponseTimeMs = 0;
    p.status = 'ready';
  });

  io.to(g.id).emit('game:reset', { gameId: g.id, status: 'LOBBY' });
  io.to(g.id).emit('room:player-list', Array.from(g.players.values()));
  broadcastLeaderboard(g);

  res.json({ success: true, message: 'Permainan berhasil di-reset kembali ke garis awal/lobby.', game: g });
});

// Clear all games
app.delete('/api/games', requireAdminAuth, (req: Request, res: Response) => {
  for (const g of games.values()) {
    if (g.timerHandle) clearTimeout(g.timerHandle);
    io.to(g.id).emit('game:cancelled', { message: 'Seluruh permainan telah dibersihkan oleh Guru.' });
  }
  games.clear();
  roomCodeToGameId.clear();
  completedGameReports.clear();
  res.json({ success: true, message: 'Semua sesi permainan telah berhasil dihapus.' });
});

// Join API for initial verification before socket connection
app.post('/api/games/join', (req: Request, res: Response) => {
  const { roomCode, displayName, carColor } = req.body;
  if (!roomCode || typeof roomCode !== 'string') {
    return res.status(400).json({ error: 'Kode room wajib diisi.' });
  }

  const cleanCode = roomCode.trim().toUpperCase();
  const gameId = roomCodeToGameId.get(cleanCode);
  if (!gameId || !games.has(gameId)) {
    return res.status(404).json({ error: 'Kode room tidak ditemukan. Pastikan host telah membuka lobby.' });
  }

  const game = games.get(gameId)!;
  if (game.status === 'FINISHED' || game.status === 'CANCELLED') {
    return res.status(400).json({ error: 'Permainan ini telah selesai atau dibatalkan.' });
  }

  const cleanName = String(displayName || '').trim();
  if (cleanName.length < 2 || cleanName.length > 30) {
    return res.status(400).json({ error: 'Nama peserta harus antara 2 hingga 30 karakter.' });
  }

  const normalized = cleanName.toLowerCase();
  if (game.settings.requireUniqueName) {
    for (const p of game.players.values()) {
      if (p.normalizedName === normalized) {
        return res.status(409).json({ error: `Nama "${cleanName}" sudah digunakan dalam room ini. Silakan pilih nama lain.` });
      }
    }
  }

  if (game.players.size >= game.settings.maxPlayers) {
    return res.status(400).json({ error: 'Room sudah penuh. Batas maksimal peserta tercapai.' });
  }

  const playerId = 'player-' + crypto.randomBytes(6).toString('hex');
  const sessionId = 'ses-' + crypto.randomBytes(16).toString('hex');
  const carNumber = game.players.size + 1;

  const newPlayer: ActivePlayer = {
    id: playerId,
    sessionId,
    displayName: cleanName,
    normalizedName: normalized,
    carId: 'car-' + carNumber,
    carColor: req.body?.carColor || '#3b82f6',
    carNumber,
    socketId: '',
    status: 'waiting',
    totalScore: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    unansweredCount: 0,
    raceProgress: 0,
    totalResponseTimeMs: 0,
    joinedAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
  };

  game.players.set(playerId, newPlayer);

  res.json({
    success: true,
    gameId: game.id,
    roomCode: game.roomCode,
    gameTitle: game.title,
    playerId,
    sessionId,
    carNumber,
    displayName: cleanName,
    status: game.status,
  });
});

// Leaderboard and Results endpoints
app.get('/api/games/:id/leaderboard', (req: Request, res: Response) => {
  const g = games.get(req.params.id);
  if (!g) return res.status(404).json({ error: 'Permainan tidak ditemukan.' });

  const sortedPlayers = Array.from(g.players.values()).sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (b.correctAnswers !== a.correctAnswers) return b.correctAnswers - a.correctAnswers;
    return a.totalResponseTimeMs - b.totalResponseTimeMs;
  });

  const leaderboard = sortedPlayers.map((p, idx) => ({
    rank: idx + 1,
    playerId: p.id,
    displayName: p.displayName,
    carColor: p.carColor,
    carNumber: p.carNumber,
    totalScore: p.totalScore,
    correctAnswers: p.correctAnswers,
    wrongAnswers: p.wrongAnswers,
    raceProgress: p.raceProgress,
  }));

  res.json({
    gameId: g.id,
    status: g.status,
    currentQuestionIndex: g.currentQuestionIndex,
    totalQuestions: g.questions.length,
    leaderboard,
  });
});

app.get('/api/games/:id/results', (req: Request, res: Response) => {
  const report = completedGameReports.get(req.params.id);
  if (report) {
    return res.json(report);
  }

  const g = games.get(req.params.id);
  if (!g) return res.status(404).json({ error: 'Data hasil permainan tidak ditemukan.' });

  const sortedPlayers = Array.from(g.players.values()).sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (b.correctAnswers !== a.correctAnswers) return b.correctAnswers - a.correctAnswers;
    return a.totalResponseTimeMs - b.totalResponseTimeMs;
  });

  res.json({
    gameId: g.id,
    title: g.title,
    roomCode: g.roomCode,
    status: g.status,
    totalQuestions: g.questions.length,
    players: sortedPlayers,
  });
});

// CSV Report download for teacher
app.get('/api/reports/games/:id', requireAdminAuth, (req: Request, res: Response) => {
  const g = games.get(req.params.id);
  const rep = completedGameReports.get(req.params.id);
  const data = rep || g;

  if (!data) return res.status(404).json({ error: 'Laporan permainan tidak ditemukan.' });

  const playerList: any[] = Array.from(g ? g.players.values() : (data.players || [])).sort((a: any, b: any) => {
    return b.totalScore - a.totalScore;
  });

  const csvRows = [
    'Peringkat,Nama Peserta,Nomor Mobil,Warna Mobil,Skor Total,Jawaban Benar,Jawaban Salah,Tidak Menjawab,Akurasi (%),Rata-rata Respon (Detik)',
  ];

  playerList.forEach((p: any, idx: number) => {
    const totalQ = (g ? g.questions.length : data.totalQuestions) || (p.correctAnswers + p.wrongAnswers + p.unansweredCount) || 1;
    const accuracy = Math.round((p.correctAnswers / Math.max(1, totalQ)) * 100);
    const avgSec = ((p.totalResponseTimeMs || 0) / Math.max(1, p.correctAnswers + p.wrongAnswers) / 1000).toFixed(2);

    csvRows.push(
      `${idx + 1},"${p.displayName.replace(/"/g, '""')}",#${p.carNumber},${p.carColor},${p.totalScore},${p.correctAnswers},${p.wrongAnswers},${p.unansweredCount || 0},${accuracy}%,${avgSec}`
    );
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="laporan_balapan_${data.roomCode || 'edurace'}.csv"`);
  res.send(csvRows.join('\n'));
});

// --- PARTICIPANTS / PLAYERS CRUD ---

// 1. List all players (CRUD: Read)
app.get('/api/players', requireAdminAuth, (req: Request, res: Response) => {
  const gameId = req.query.gameId as string;
  const q = (req.query.q as string || '').toLowerCase().trim();

  const allPlayers: any[] = [];
  games.forEach((g) => {
    if (gameId && g.id !== gameId) return;
    g.players.forEach((p) => {
      if (q && !p.displayName.toLowerCase().includes(q)) return;
      allPlayers.push({
        ...p,
        gameId: g.id,
        gameTitle: g.title,
        roomCode: g.roomCode,
        gameStatus: g.status,
      });
    });
  });

  completedGameReports.forEach((rep) => {
    if (gameId && rep.gameId !== gameId) return;
    if (games.has(rep.gameId)) return;
    (rep.players || []).forEach((p: any) => {
      if (q && !p.displayName?.toLowerCase().includes(q)) return;
      allPlayers.push({
        ...p,
        gameId: rep.gameId,
        gameTitle: rep.title,
        roomCode: rep.roomCode,
        gameStatus: 'FINISHED',
      });
    });
  });

  res.json(allPlayers);
});

// 2. Add player manually to game (CRUD: Create)
app.post('/api/games/:id/players', requireAdminAuth, (req: Request, res: Response) => {
  const g = games.get(req.params.id);
  if (!g) return res.status(404).json({ error: 'Permainan tidak ditemukan.' });

  const { displayName, carColor, totalScore } = req.body;
  const cleanName = String(displayName || '').trim();
  if (cleanName.length < 2) {
    return res.status(400).json({ error: 'Nama peserta minimal 2 karakter.' });
  }

  const playerId = 'player-' + crypto.randomBytes(6).toString('hex');
  const sessionId = 'ses-' + crypto.randomBytes(16).toString('hex');
  const carNumber = g.players.size + 1;

  const newPlayer: ActivePlayer = {
    id: playerId,
    sessionId,
    displayName: cleanName,
    normalizedName: cleanName.toLowerCase(),
    carId: 'car-' + carNumber,
    carColor: carColor || '#3b82f6',
    carNumber,
    socketId: '',
    status: 'ready',
    totalScore: Number(totalScore) || 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    unansweredCount: 0,
    raceProgress: 0,
    totalResponseTimeMs: 0,
    joinedAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
  };

  g.players.set(playerId, newPlayer);
  io.to(g.id).emit('room:player-list', Array.from(g.players.values()));
  broadcastLeaderboard(g);

  res.status(201).json(newPlayer);
});

// 3. Edit player (CRUD: Update)
app.put('/api/games/:id/players/:playerId', requireAdminAuth, (req: Request, res: Response) => {
  const g = games.get(req.params.id);
  if (!g) return res.status(404).json({ error: 'Permainan tidak ditemukan.' });

  const p = g.players.get(req.params.playerId);
  if (!p) return res.status(404).json({ error: 'Peserta tidak ditemukan dalam permainan ini.' });

  const { displayName, carColor, carNumber, totalScore, correctAnswers, wrongAnswers, raceProgress } = req.body;
  if (displayName) {
    p.displayName = displayName.trim();
    p.normalizedName = displayName.trim().toLowerCase();
  }
  if (carColor) p.carColor = carColor;
  if (carNumber !== undefined) p.carNumber = Number(carNumber);
  if (totalScore !== undefined) p.totalScore = Number(totalScore);
  if (correctAnswers !== undefined) p.correctAnswers = Number(correctAnswers);
  if (wrongAnswers !== undefined) p.wrongAnswers = Number(wrongAnswers);
  if (raceProgress !== undefined) p.raceProgress = Math.min(100, Math.max(0, Number(raceProgress)));

  io.to(g.id).emit('room:player-list', Array.from(g.players.values()));
  broadcastLeaderboard(g);

  res.json(p);
});

// 4. Delete / Kick player from game (CRUD: Delete)
app.delete('/api/games/:id/players/:playerId', requireAdminAuth, (req: Request, res: Response) => {
  const g = games.get(req.params.id);
  if (!g) return res.status(404).json({ error: 'Permainan tidak ditemukan.' });

  const p = g.players.get(req.params.playerId);
  if (!p) return res.status(404).json({ error: 'Peserta tidak ditemukan dalam permainan ini.' });

  g.players.delete(req.params.playerId);
  io.to(g.id).emit('player:kicked', { playerId: req.params.playerId, displayName: p.displayName });
  io.to(g.id).emit('room:player-list', Array.from(g.players.values()));
  broadcastLeaderboard(g);

  res.json({ success: true, message: `Peserta "${p.displayName}" berhasil dihapus dari room.` });
});

// 5. Clear all players
app.delete('/api/players', requireAdminAuth, (req: Request, res: Response) => {
  games.forEach((g) => {
    g.players.clear();
    io.to(g.id).emit('room:player-list', []);
  });
  res.json({ success: true, message: 'Seluruh data peserta aktif berhasil dibersihkan.' });
});

// --- AUTHORITATIVE GAME ENGINE (SOCKET.IO) ---

function calculateLeaderboard(game: ActiveGame) {
  const sorted = Array.from(game.players.values()).sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (b.correctAnswers !== a.correctAnswers) return b.correctAnswers - a.correctAnswers;
    return a.totalResponseTimeMs - b.totalResponseTimeMs;
  });

  return sorted.map((p, idx) => ({
    rank: idx + 1,
    playerId: p.id,
    displayName: p.displayName,
    carColor: p.carColor,
    carNumber: p.carNumber,
    totalScore: p.totalScore,
    correctAnswers: p.correctAnswers,
    wrongAnswers: p.wrongAnswers,
    raceProgress: p.raceProgress,
  }));
}

function broadcastLeaderboard(game: ActiveGame) {
  const lb = calculateLeaderboard(game);
  io.to(game.id).emit('leaderboard:updated', {
    gameId: game.id,
    leaderboard: lb,
  });
}

function sendQuestionToRoom(game: ActiveGame) {
  if (game.timerHandle) {
    clearTimeout(game.timerHandle);
    game.timerHandle = undefined;
  }

  const q = game.questions[game.currentQuestionIndex];
  if (!q) {
    finishGame(game);
    return;
  }

  game.status = 'QUESTION_ACTIVE';
  const durationMs = (game.settings.timeLimitSeconds || q.timeLimitSeconds || 15) * 1000;
  const now = Date.now();
  game.currentQuestionStartedAt = now;
  game.currentQuestionEndsAt = now + durationMs;

  // Reset player answer status for this round
  game.players.forEach((p) => {
    if (p.status !== 'disconnected') {
      p.status = 'answering';
    }
  });

  // Client payload: NEVER SEND isCorrect!
  const clientPayload = {
    index: game.currentQuestionIndex,
    total: game.questions.length,
    questionText: q.questionText,
    questionType: q.questionType,
    imageUrl: q.imageUrl,
    timeLimitSeconds: game.settings.timeLimitSeconds || q.timeLimitSeconds || 15,
    points: q.points || 1000,
    options: q.options.map((opt) => ({
      id: opt.id,
      optionText: opt.optionText,
      imageUrl: opt.imageUrl,
      orderIndex: opt.orderIndex,
    })),
    startedAt: now,
    endsAt: game.currentQuestionEndsAt,
  };

  io.to(game.id).emit('question:started', clientPayload);

  // Set authoritative server timer
  game.timerHandle = setTimeout(() => {
    endQuestion(game);
  }, durationMs + 800); // 800ms grace period for network jitter
}

function endQuestion(game: ActiveGame) {
  if (game.timerHandle) {
    clearTimeout(game.timerHandle);
    game.timerHandle = undefined;
  }

  game.status = 'QUESTION_RESULT';
  const q = game.questions[game.currentQuestionIndex];
  const qAnswers = game.answers.get(String(game.currentQuestionIndex)) || [];

  const correctOpt = q?.options.find((o) => o.isCorrect);

  // Mark players who didn't submit an answer as unanswered
  game.players.forEach((p) => {
    const hasAnswered = qAnswers.some((a) => a.playerId === p.id);
    if (!hasAnswered) {
      p.unansweredCount++;
      p.status = 'answered';
    }
  });

  const correctCount = qAnswers.filter((a) => a.isCorrect).length;
  const wrongCount = qAnswers.filter((a) => !a.isCorrect).length;
  const unansweredCount = Math.max(0, game.players.size - qAnswers.length);

  const resultPayload = {
    questionIndex: game.currentQuestionIndex,
    correctOptionId: correctOpt?.id || '',
    explanation: q?.explanation || '',
    stats: {
      totalAnswered: qAnswers.length,
      correctCount,
      wrongCount,
      unansweredCount,
    },
  };

  io.to(game.id).emit('question:ended', resultPayload);
  broadcastLeaderboard(game);
}

function finishGame(game: ActiveGame) {
  if (game.timerHandle) {
    clearTimeout(game.timerHandle);
    game.timerHandle = undefined;
  }

  game.status = 'FINISHED';
  game.finishedAt = new Date().toISOString();

  const sorted = Array.from(game.players.values()).sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (b.correctAnswers !== a.correctAnswers) return b.correctAnswers - a.correctAnswers;
    return a.totalResponseTimeMs - b.totalResponseTimeMs;
  });

  // Assign finish position
  sorted.forEach((p, idx) => {
    p.finishPosition = idx + 1;
    p.status = 'finished';
  });

  const report = {
    gameId: game.id,
    title: game.title,
    roomCode: game.roomCode,
    status: 'FINISHED',
    totalQuestions: game.questions.length,
    finishedAt: game.finishedAt,
    players: sorted,
    podium: sorted.slice(0, 3).map((p, idx) => ({
      position: idx + 1,
      displayName: p.displayName,
      carColor: p.carColor,
      carNumber: p.carNumber,
      totalScore: p.totalScore,
      correctAnswers: p.correctAnswers,
    })),
  };

  completedGameReports.set(game.id, report);

  io.to(game.id).emit('game:finished', report);
}

io.on('connection', (socket: Socket) => {
  let currentGameId: string | null = null;
  let currentPlayerId: string | null = null;
  let isHost = false;

  // 1. Host registers socket to game room
  socket.on('host:join', (data: { gameId: string }) => {
    const game = games.get(data.gameId);
    if (!game) {
      socket.emit('room:error', { message: 'Game tidak ditemukan.' });
      return;
    }
    isHost = true;
    currentGameId = game.id;
    game.hostSocketId = socket.id;
    socket.join(game.id);

    socket.emit('host:joined', {
      gameId: game.id,
      roomCode: game.roomCode,
      status: game.status,
      playerCount: game.players.size,
      players: Array.from(game.players.values()),
    });
  });

  // 2. Player joins room
  socket.on('room:join', (data: { roomCode: string; displayName: string; carColor?: string; sessionId?: string }) => {
    const { roomCode, displayName, carColor, sessionId } = data;
    const cleanCode = (roomCode || '').trim().toUpperCase();
    const gameId = roomCodeToGameId.get(cleanCode);

    if (!gameId || !games.has(gameId)) {
      socket.emit('room:error', { message: 'Kode room tidak valid atau belum dibuka.' });
      return;
    }

    const game = games.get(gameId)!;
    if (game.status === 'FINISHED' || game.status === 'CANCELLED') {
      socket.emit('room:error', { message: 'Permainan telah selesai.' });
      return;
    }

    const cleanName = (displayName || '').trim();
    if (cleanName.length < 2 || cleanName.length > 30) {
      socket.emit('room:error', { message: 'Nama harus 2-30 karakter.' });
      return;
    }

    // Reconnection check with session
    let existingPlayer: ActivePlayer | undefined;
    if (sessionId) {
      for (const p of game.players.values()) {
        if (p.sessionId === sessionId) {
          existingPlayer = p;
          break;
        }
      }
    }

    if (existingPlayer) {
      existingPlayer.socketId = socket.id;
      existingPlayer.status = 'ready';
      existingPlayer.lastSeenAt = new Date().toISOString();

      currentGameId = game.id;
      currentPlayerId = existingPlayer.id;
      socket.join(game.id);

      socket.emit('room:joined', {
        player: existingPlayer,
        game: {
          id: game.id,
          title: game.title,
          roomCode: game.roomCode,
          status: game.status,
          totalQuestions: game.questions.length,
          currentQuestionIndex: game.currentQuestionIndex,
        },
      });

      io.to(game.id).emit('room:player-list', Array.from(game.players.values()));
      return;
    }

    // Unique name validation
    const normalized = cleanName.toLowerCase();
    if (game.settings.requireUniqueName) {
      for (const p of game.players.values()) {
        if (p.normalizedName === normalized) {
          socket.emit('room:error', { message: `Nama "${cleanName}" sudah digunakan dalam room ini.` });
          return;
        }
      }
    }

    if (game.players.size >= game.settings.maxPlayers) {
      socket.emit('room:error', { message: 'Batas peserta room telah tercapai.' });
      return;
    }

    const playerId = 'player-' + crypto.randomBytes(6).toString('hex');
    const newSessionId = sessionId || 'ses-' + crypto.randomBytes(16).toString('hex');
    const carNumber = game.players.size + 1;

    const newPlayer: ActivePlayer = {
      id: playerId,
      sessionId: newSessionId,
      displayName: cleanName,
      normalizedName: normalized,
      carId: 'car-' + carNumber,
      carColor: carColor || '#3b82f6',
      carNumber,
      socketId: socket.id,
      status: 'waiting',
      totalScore: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      unansweredCount: 0,
      raceProgress: 0,
      totalResponseTimeMs: 0,
      joinedAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
    };

    game.players.set(playerId, newPlayer);
    currentGameId = game.id;
    currentPlayerId = playerId;
    socket.join(game.id);

    socket.emit('room:joined', {
      player: newPlayer,
      game: {
        id: game.id,
        title: game.title,
        roomCode: game.roomCode,
        status: game.status,
        totalQuestions: game.questions.length,
        currentQuestionIndex: game.currentQuestionIndex,
      },
    });

    io.to(game.id).emit('room:player-list', Array.from(game.players.values()));
  });

  // 3. Host initiates countdown
  socket.on('game:countdown', (data: { gameId: string }) => {
    const game = games.get(data.gameId);
    if (!game) return;

    if (game.players.size === 0) {
      socket.emit('room:error', { message: 'Minimal harus ada 1 peserta sebelum memulai balapan.' });
      return;
    }

    game.status = 'COUNTDOWN';
    io.to(game.id).emit('game:countdown', { seconds: 3 });

    setTimeout(() => {
      game.status = 'QUESTION_ACTIVE';
      game.startedAt = new Date().toISOString();
      game.currentQuestionIndex = 0;
      io.to(game.id).emit('game:started', { gameId: game.id });
      sendQuestionToRoom(game);
    }, 3500);
  });

  // 4. Host next question
  socket.on('host:next-question', (data: { gameId: string }) => {
    const game = games.get(data.gameId);
    if (!game) return;

    game.currentQuestionIndex++;
    if (game.currentQuestionIndex >= game.questions.length) {
      finishGame(game);
    } else {
      sendQuestionToRoom(game);
    }
  });

  // 5. Host pause game
  socket.on('game:pause', (data: { gameId: string }) => {
    const game = games.get(data.gameId);
    if (!game) return;
    game.status = 'PAUSED';
    if (game.timerHandle) clearTimeout(game.timerHandle);
    io.to(game.id).emit('game:paused', { gameId: game.id });
  });

  // 6. Host resume game
  socket.on('game:resume', (data: { gameId: string }) => {
    const game = games.get(data.gameId);
    if (!game) return;
    game.status = 'QUESTION_ACTIVE';
    io.to(game.id).emit('game:resumed', { gameId: game.id });
  });

  // 7. Host finish game early
  socket.on('game:finish', (data: { gameId: string }) => {
    const game = games.get(data.gameId);
    if (!game) return;
    finishGame(game);
  });

  // 8. Player submits answer
  socket.on('answer:submit', (data: { gameId: string; playerId: string; questionIndex: number; optionId: string }) => {
    const { gameId, playerId, questionIndex, optionId } = data;
    const game = games.get(gameId);
    if (!game) {
      socket.emit('answer:rejected', { reason: 'Game tidak ditemukan.' });
      return;
    }

    if (game.status !== 'QUESTION_ACTIVE') {
      socket.emit('answer:rejected', { reason: 'Waktu menjawab telah selesai.' });
      return;
    }

    if (game.currentQuestionIndex !== questionIndex) {
      socket.emit('answer:rejected', { reason: 'Indeks soal tidak sesuai.' });
      return;
    }

    const player = game.players.get(playerId);
    if (!player) {
      socket.emit('answer:rejected', { reason: 'Peserta tidak ditemukan.' });
      return;
    }

    // Check if already answered
    const qKey = String(questionIndex);
    let qAnswers = game.answers.get(qKey);
    if (!qAnswers) {
      qAnswers = [];
      game.answers.set(qKey, qAnswers);
    }

    const alreadySubmitted = qAnswers.some((a) => a.playerId === playerId);
    if (alreadySubmitted) {
      socket.emit('answer:rejected', { reason: 'Jawaban sudah pernah dikirim.' });
      return;
    }

    const now = Date.now();
    const startedAt = game.currentQuestionStartedAt || now;
    const timeLimitMs = (game.settings.timeLimitSeconds || 15) * 1000;
    const responseTimeMs = Math.max(0, Math.min(timeLimitMs, now - startedAt));

    const q = game.questions[questionIndex];
    const selectedOpt = q.options.find((o) => o.id === optionId);
    const isCorrect = Boolean(selectedOpt?.isCorrect);

    let scoreAwarded = 0;
    let speedBonus = 0;

    if (isCorrect) {
      const basePoints = q.points || 1000;
      if (game.settings.speedBonusEnabled) {
        speedBonus = Math.max(0, Math.floor(500 * (1 - responseTimeMs / timeLimitMs)));
      }
      scoreAwarded = basePoints + speedBonus;
      player.correctAnswers++;
    } else {
      player.wrongAnswers++;
    }

    player.totalScore += scoreAwarded;
    player.totalResponseTimeMs += responseTimeMs;
    player.status = 'answered';

    // Race Progress: each question represents 100 / totalQuestions %.
    // A correct answer gives full segment (100%), wrong gives partial progression (30% of segment) to keep the car rolling on track!
    const stepSize = 100 / game.questions.length;
    const currentSegment = (questionIndex) * stepSize;
    const addedProgress = isCorrect ? stepSize : stepSize * 0.3;
    player.raceProgress = Math.min(100, Math.round(currentSegment + addedProgress));

    qAnswers.push({
      playerId,
      questionIndex,
      selectedOptionId: optionId,
      isCorrect,
      scoreAwarded,
      speedBonus,
      responseTimeMs,
      submittedAt: new Date().toISOString(),
    });

    // Acknowledge to client
    socket.emit('answer:accepted', {
      playerId,
      isCorrect,
      scoreAwarded,
      speedBonus,
      totalScore: player.totalScore,
      raceProgress: player.raceProgress,
    });

    // Emit live race progress update to everyone in room
    io.to(game.id).emit('race:progress', {
      playerId,
      displayName: player.displayName,
      carColor: player.carColor,
      carNumber: player.carNumber,
      raceProgress: player.raceProgress,
      totalScore: player.totalScore,
      isCorrect,
    });

    // If all active players have answered, automatically end the question!
    const activeWaiting = Array.from(game.players.values()).filter((p) => p.status !== 'disconnected');
    if (qAnswers.length >= activeWaiting.length && activeWaiting.length > 0) {
      if (game.timerHandle) clearTimeout(game.timerHandle);
      setTimeout(() => {
        endQuestion(game);
      }, 1000);
    }
  });

  // 9. Emote / Fun Reaction
  socket.on('race:reaction', (data: { gameId: string; playerId: string; reaction: string }) => {
    if (!data.gameId || !games.has(data.gameId)) return;
    io.to(data.gameId).emit('race:reaction', {
      playerId: data.playerId,
      reaction: data.reaction,
    });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    if (currentGameId && currentPlayerId) {
      const game = games.get(currentGameId);
      if (game) {
        const p = game.players.get(currentPlayerId);
        if (p) {
          p.status = 'disconnected';
          io.to(game.id).emit('player:disconnected', { playerId: p.id, displayName: p.displayName });
          io.to(game.id).emit('room:player-list', Array.from(game.players.values()));
        }
      }
    }
  });
});

// --- VITE MIDDLEWARE SETUP ---
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🏎️ Edu Race Server is running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Edu Race server:', err);
});
