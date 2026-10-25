import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import {
  Flag,
  Play,
  Pause,
  SkipForward,
  Square,
  Users,
  Copy,
  Check,
  Download,
  AlertCircle,
  Share2,
  Clock,
  CheckCircle2,
  XCircle,
  Trophy,
} from 'lucide-react';
import { RaceTrackCanvas } from '../components/RaceTrackCanvas';
import { PodiumView } from '../components/PodiumView';
import { LeaderboardEntry, QuestionResultPayload } from '../types/game';
import { sound } from '../lib/audio';

interface AdminHostPageProps {
  socket: Socket | null;
  gameId: string;
  roomCode: string;
  onExit: () => void;
}

export const AdminHostPage: React.FC<AdminHostPageProps> = ({ socket, gameId, roomCode, onExit }) => {
  const [game, setGame] = useState<any | null>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<any | null>(null);
  const [questionResult, setQuestionResult] = useState<QuestionResultPayload | null>(null);
  const [gameStatus, setGameStatus] = useState<string>('LOBBY');
  const [finalReport, setFinalReport] = useState<any | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [hostNotice, setHostNotice] = useState<string | null>(null);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);

  // Initial load
  useEffect(() => {
    fetch(`/api/games/${gameId}`)
      .then((res) => res.json())
      .then((data) => {
        setGame(data);
        setGameStatus(data.status);
      })
      .catch((err) => console.error(err));
  }, [gameId]);

  // Socket host events
  useEffect(() => {
    if (!socket) return;

    socket.emit('host:join', { gameId });

    socket.on('host:joined', (data: any) => {
      setGameStatus(data.status);
      if (Array.isArray(data.players)) {
        setPlayers(data.players);
      }
    });

    socket.on('room:player-list', (list: any[]) => {
      setPlayers(list);
    });

    socket.on('question:started', (payload: any) => {
      setCurrentQuestion(payload);
      setQuestionResult(null);
      setGameStatus('QUESTION_ACTIVE');
      setAnsweredCount(0);
      sound.playEngineRev();
    });

    socket.on('answer:accepted', () => {
      setAnsweredCount((prev) => prev + 1);
    });

    socket.on('race:progress', (data: any) => {
      setLeaderboard((prev) => {
        const idx = prev.findIndex((p) => p.playerId === data.playerId);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], raceProgress: data.raceProgress, totalScore: data.totalScore };
          return updated;
        }
        return prev;
      });
    });

    socket.on('question:ended', (payload: QuestionResultPayload) => {
      setQuestionResult(payload);
      setGameStatus('QUESTION_RESULT');
      sound.playCorrect();
    });

    socket.on('leaderboard:updated', (data: { leaderboard: LeaderboardEntry[] }) => {
      setLeaderboard(data.leaderboard);
    });

    socket.on('game:paused', () => {
      setGameStatus('PAUSED');
    });

    socket.on('game:resumed', () => {
      setGameStatus('QUESTION_ACTIVE');
    });

    socket.on('game:finished', (report: any) => {
      setFinalReport(report);
      setGameStatus('FINISHED');
    });

    return () => {
      socket.off('host:joined');
      socket.off('room:player-list');
      socket.off('question:started');
      socket.off('answer:accepted');
      socket.off('race:progress');
      socket.off('question:ended');
      socket.off('leaderboard:updated');
      socket.off('game:paused');
      socket.off('game:resumed');
      socket.off('game:finished');
    };
  }, [socket, gameId]);

  const handleStartCountdown = () => {
    if (!socket) return;
    if (players.length === 0) {
      setHostNotice('Belum ada peserta yang bergabung di room ini. Bagikan kode balapan ke siswa!');
      setTimeout(() => setHostNotice(null), 4000);
      return;
    }
    sound.playClick();
    socket.emit('game:countdown', { gameId });
  };

  const handleNextQuestion = () => {
    if (!socket) return;
    sound.playClick();
    socket.emit('host:next-question', { gameId });
  };

  const handlePauseResume = () => {
    if (!socket) return;
    sound.playClick();
    if (gameStatus === 'PAUSED') {
      socket.emit('game:resume', { gameId });
    } else {
      socket.emit('game:pause', { gameId });
    }
  };

  const confirmFinishGame = () => {
    if (!socket) return;
    sound.playClick();
    setShowFinishConfirm(false);
    socket.emit('game:finish', { gameId });
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    sound.playClick();
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyShareLink = () => {
    const link = `${window.location.origin}/?code=${roomCode}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    sound.playClick();
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // 1. FINISHED STATE: Render Podium View
  if (gameStatus === 'FINISHED' && finalReport) {
    return (
      <PodiumView
        players={finalReport.players || []}
        totalQuestions={finalReport.totalQuestions || 0}
        gameTitle={game?.title || 'Edu Race'}
        roomCode={roomCode}
        isHost={true}
        onPlayAgain={onExit}
        onExportCsv={() => {
          window.location.href = `/api/reports/games/${gameId}`;
        }}
      />
    );
  }

  // 2. LOBBY STATE: Waiting for players, big room code display
  if (gameStatus === 'LOBBY' || gameStatus === 'COUNTDOWN') {
    return (
      <div className="min-h-[calc(100vh-4rem)] p-4 sm:p-8 max-w-5xl mx-auto space-y-6 text-white">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <Flag className="w-5 h-5 text-amber-400" />
              <span>{game?.title || 'Lobby Balapan Edu Race'}</span>
            </h1>
            <p className="text-xs text-slate-400">Tampilkan halaman ini di proyektor atau layar kelas.</p>
          </div>

          <button
            onClick={onExit}
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300 transition"
          >
            Keluar dari Sesi
          </button>
        </div>

        {hostNotice && (
          <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-sm font-semibold flex items-center justify-center gap-2 animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <span>{hostNotice}</span>
          </div>
        )}

        {/* Big Code & Instruction Card */}
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950/70 to-slate-900 border-2 border-indigo-500/40 rounded-3xl p-6 sm:p-10 text-center shadow-2xl space-y-6">
          <div className="space-y-1">
            <p className="text-xs sm:text-sm font-extrabold uppercase tracking-widest text-indigo-300">
              GABUNG BALAPAN DI BROWSER DENGAN KODE:
            </p>
            <div className="inline-block py-2 px-8 rounded-3xl bg-slate-950 border-4 border-amber-400/80 shadow-2xl shadow-amber-500/10">
              <span className="font-mono text-5xl sm:text-7xl font-black tracking-widest text-amber-400 drop-shadow">
                {roomCode}
              </span>
            </div>
          </div>

          {/* Quick Copy Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={copyRoomCode}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-2 transition"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedCode ? 'Kode Tersalin!' : 'Salin Kode Balapan'}</span>
            </button>
            <button
              onClick={copyShareLink}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-indigo-300 flex items-center gap-2 transition"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
              <span>{copiedLink ? 'Tautan Tersalin!' : 'Salin Tautan Langsung'}</span>
            </button>
          </div>

          {/* Start Race Button */}
          <div className="pt-2">
            <button
              onClick={handleStartCountdown}
              disabled={players.length === 0}
              className="w-full max-w-md mx-auto py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-600 hover:from-emerald-400 hover:to-blue-500 text-slate-950 font-black text-base tracking-wider shadow-2xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>
                {players.length === 0
                  ? 'MENUNGGU PESERTA GABUNG...'
                  : `MULAI BALAPAN SEKARANG (${players.length} PEMBALAP)!`}
              </span>
            </button>
          </div>
        </div>

        {/* Connected Players Grid */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="font-bold text-white text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              <span>Peserta di Garis Start ({players.length})</span>
            </h2>
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Real-time Sync
            </span>
          </div>

          {players.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {players.map((p) => (
                <div
                  key={p.id}
                  className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center gap-2.5 transition animate-in fade-in"
                >
                  <div
                    className="w-8 h-5 rounded-lg flex items-center justify-center text-[10px] font-black text-white shadow"
                    style={{ backgroundColor: p.carColor }}
                  >
                    #{p.carNumber}
                  </div>
                  <span className="text-xs font-bold text-white truncate">{p.displayName}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 text-xs">
              Minta para siswa membuka Edu Race dan memasukkan kode{' '}
              <strong className="text-amber-400 font-mono">{roomCode}</strong>.
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3. IN-GAME STATE: Real-time Host Monitor & Track Control
  return (
    <div className="min-h-[calc(100vh-4rem)] p-3 sm:p-6 max-w-7xl mx-auto space-y-5 text-white">
      {/* Top Monitor Bar with Host Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
              {roomCode}
            </span>
            <h1 className="text-base sm:text-lg font-black text-white">{game?.title}</h1>
          </div>
          <p className="text-xs text-slate-400">
            {currentQuestion
              ? `Soal ${currentQuestion.index + 1} dari ${currentQuestion.total}`
              : 'Memuat Soal...'}
          </p>
        </div>

        {/* Host Control Actions */}
        <div className="flex items-center gap-2">
          {gameStatus === 'QUESTION_RESULT' ? (
            <button
              onClick={handleNextQuestion}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow"
            >
              <span>Soal Berikutnya</span>
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handlePauseResume}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 transition border border-slate-700"
            >
              {gameStatus === 'PAUSED' ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              <span>{gameStatus === 'PAUSED' ? 'Lanjutkan' : 'Jeda'}</span>
            </button>
          )}

          <button
            onClick={() => setShowFinishConfirm(true)}
            className="px-3 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <Square className="w-3 h-3 fill-current" />
            <span>Akhiri Balapan</span>
          </button>
        </div>
      </div>

      {/* 2D Race Track Live Monitor */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold px-1">
          <span className="flex items-center gap-1.5 text-slate-300">
            <Flag className="w-4 h-4 text-amber-400" />
            LINTASAN BALAP REAL-TIME
          </span>
          <span className="text-emerald-400">{leaderboard.length || players.length} Pembalap Aktif</span>
        </div>
        <RaceTrackCanvas
          players={leaderboard}
          height={220}
          isLiveRace={gameStatus !== 'PAUSED'}
        />
      </div>

      {/* Question Info & Real-Time Stats */}
      {currentQuestion && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Question Box */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                Pertanyaan #{currentQuestion.index + 1}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                Poin: {currentQuestion.points}
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-white leading-snug">
              {currentQuestion.questionText}
            </h2>

            {/* Options display with correct indicators if result */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
              {currentQuestion.options.map((opt: any, idx: number) => {
                const isCorrect = questionResult && questionResult.correctOptionId === opt.id;
                return (
                  <div
                    key={opt.id}
                    className={`p-3.5 rounded-2xl border text-sm flex items-center justify-between transition ${
                      isCorrect
                        ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200 font-bold ring-2 ring-emerald-500/30'
                        : 'bg-slate-950/70 border-slate-800 text-slate-300'
                    }`}
                  >
                    <span>{opt.optionText}</span>
                    {isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  </div>
                );
              })}
            </div>

            {questionResult && questionResult.explanation && (
              <div className="p-3.5 rounded-2xl bg-indigo-950/50 border border-indigo-500/30 text-xs text-indigo-200">
                <strong className="block text-white mb-0.5">Pembahasan Guru:</strong>
                {questionResult.explanation}
              </div>
            )}
          </div>

          {/* Side Panel: Answers Progress & Leaderboard */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="font-extrabold text-white text-sm flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Klasemen Sementara</span>
            </h3>

            {/* Answer submission counter */}
            {gameStatus === 'QUESTION_ACTIVE' && (
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-1">
                <p className="text-xs text-slate-400">Pembalap yang Telah Menjawab:</p>
                <p className="text-2xl font-black text-amber-400">
                  {answeredCount} / {players.length}
                </p>
              </div>
            )}

            {/* Question Results Stats (if ended) */}
            {questionResult && (
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30">
                  <span className="text-[10px] text-emerald-400 font-semibold block">Benar</span>
                  <span className="text-lg font-black text-emerald-300">
                    {questionResult.stats?.correctCount || 0}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/30">
                  <span className="text-[10px] text-rose-400 font-semibold block">Salah</span>
                  <span className="text-lg font-black text-rose-300">
                    {questionResult.stats?.wrongCount || 0}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-semibold block">Lewat</span>
                  <span className="text-lg font-black text-slate-300">
                    {questionResult.stats?.unansweredCount || 0}
                  </span>
                </div>
              </div>
            )}

            {/* Top 5 Leaderboard */}
            <div className="divide-y divide-slate-800 text-xs">
              {leaderboard.slice(0, 6).map((entry, idx) => (
                <div key={entry.playerId} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-bold text-slate-400 w-4">#{idx + 1}</span>
                    <div
                      className="w-5 h-3.5 rounded flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                      style={{ backgroundColor: entry.carColor }}
                    >
                      #{entry.carNumber}
                    </div>
                    <span className="font-semibold text-slate-200 truncate max-w-[110px]">
                      {entry.displayName}
                    </span>
                  </div>
                  <span className="font-bold text-amber-400">{entry.totalScore.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Finish Game Early */}
      {showFinishConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
              <Square className="w-6 h-6 fill-current" />
            </div>
            <h3 className="text-xl font-black text-white">Akhiri Balapan Sekarang?</h3>
            <p className="text-xs text-slate-400">
              Permainan akan dihentikan dan seluruh peserta akan langsung melihat podium juara dan hasil akhir nilai.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setShowFinishConfirm(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
              >
                Batal & Lanjutkan
              </button>
              <button
                onClick={confirmFinishGame}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow transition"
              >
                Ya, Akhiri Balapan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
