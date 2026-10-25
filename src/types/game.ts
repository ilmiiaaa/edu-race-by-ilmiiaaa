export type QuestionType = 'multiple_choice' | 'true_false';
export type Difficulty = 'easy' | 'medium' | 'hard';

export type GameStatus =
  | 'DRAFT'
  | 'LOBBY'
  | 'COUNTDOWN'
  | 'QUESTION_ACTIVE'
  | 'QUESTION_RESULT'
  | 'PAUSED'
  | 'FINISHED'
  | 'CANCELLED';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'teacher';
  createdAt: string;
}

export interface Subject {
  id: string;
  name: string;
  description: string;
  icon?: string;
  createdAt: string;
}

export interface QuestionOption {
  id: string;
  optionText: string;
  imageUrl?: string;
  isCorrect?: boolean; // stripped on client student payload
  orderIndex: number;
}

export interface Question {
  id: string;
  questionSetId: string;
  questionText: string;
  questionType: QuestionType;
  imageUrl?: string;
  explanation?: string;
  difficulty: Difficulty;
  timeLimitSeconds: number;
  points: number;
  orderIndex: number;
  options: QuestionOption[];
  createdAt: string;
}

export interface QuestionSet {
  id: string;
  title: string;
  description: string;
  subjectId: string;
  subjectName?: string;
  gradeLevel?: string;
  ownerId: string;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface GameSettings {
  timeLimitSeconds: number;
  speedBonusEnabled: boolean;
  maxPlayers: number;
  requireUniqueName: boolean;
  showLeaderboard: boolean;
  revealExplanation: boolean;
  randomizeQuestions: boolean;
}

export interface GamePlayer {
  id: string;
  gameId: string;
  sessionId: string;
  displayName: string;
  normalizedName: string;
  carId: string;
  carColor: string;
  carNumber: number;
  status: 'waiting' | 'ready' | 'answering' | 'answered' | 'finished' | 'disconnected';
  totalScore: number;
  correctAnswers: number;
  wrongAnswers: number;
  unansweredCount: number;
  raceProgress: number; // 0 to 100 percentage
  finishPosition?: number;
  lastResponseTimeMs?: number;
  lastScoreAwarded?: number;
  joinedAt: string;
  lastSeenAt: string;
}

export interface Game {
  id: string;
  hostId: string;
  hostName: string;
  questionSetId: string;
  questionSetTitle: string;
  title: string;
  roomCode: string;
  status: GameStatus;
  settings: GameSettings;
  currentQuestionIndex: number;
  totalQuestions: number;
  currentQuestionStartedAt?: number;
  currentQuestionEndsAt?: number;
  startedAt?: string;
  finishedAt?: string;
  createdAt: string;
}

export interface ClientQuestionPayload {
  index: number;
  total: number;
  questionText: string;
  questionType: QuestionType;
  imageUrl?: string;
  timeLimitSeconds: number;
  points: number;
  options: Array<{
    id: string;
    optionText: string;
    imageUrl?: string;
    orderIndex: number;
  }>;
  startedAt: number;
  endsAt: number;
}

export interface QuestionResultPayload {
  questionIndex: number;
  correctOptionId: string;
  explanation?: string;
  stats: {
    totalAnswered: number;
    correctCount: number;
    wrongCount: number;
    unansweredCount: number;
  };
}

export interface PlayerAnswerRecord {
  id: string;
  gameId: string;
  gamePlayerId: string;
  questionIndex: number;
  selectedOptionId: string | null;
  isCorrect: boolean;
  scoreAwarded: number;
  speedBonus: number;
  responseTimeMs: number;
  submittedAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  displayName: string;
  carColor: string;
  carNumber: number;
  totalScore: number;
  correctAnswers: number;
  raceProgress: number;
  lastScoreDelta?: number;
  lastAnswerCorrect?: boolean;
}

export interface GameResultSummary {
  id: string;
  gameId: string;
  gamePlayerId: string;
  displayName: string;
  carColor: string;
  carNumber: number;
  finalScore: number;
  finalPosition: number;
  correctAnswers: number;
  wrongAnswers: number;
  unansweredCount: number;
  accuracy: number;
  averageResponseTimeMs: number;
  totalQuestions: number;
  createdAt: string;
}

export const CAR_COLORS = [
  { id: 'red', name: 'Merah Kilat', hex: '#ef4444', accent: '#b91c1c' },
  { id: 'blue', name: 'Biru Turbo', hex: '#3b82f6', accent: '#1d4ed8' },
  { id: 'emerald', name: 'Hijau Nitro', hex: '#10b981', accent: '#047857' },
  { id: 'amber', name: 'Kuning Api', hex: '#f59e0b', accent: '#b45309' },
  { id: 'purple', name: 'Ungu Kosmik', hex: '#8b5cf6', accent: '#6d28d9' },
  { id: 'pink', name: 'Merah Muda Neon', hex: '#ec4899', accent: '#be185d' },
  { id: 'cyan', name: 'Sian Kecepatan', hex: '#06b6d4', accent: '#0e7490' },
  { id: 'orange', name: 'Oranye Roket', hex: '#f97316', accent: '#c2410c' },
];
