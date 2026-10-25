import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { Clock, CheckCircle2, XCircle, Award, Trophy, Zap, AlertCircle, Sparkles, Send } from 'lucide-react';
import { RaceTrackCanvas } from '../components/RaceTrackCanvas';
import { ClientQuestionPayload, QuestionResultPayload, LeaderboardEntry } from '../types/game';
import { sound } from '../lib/audio';

interface PlayerGamePageProps {
  socket: Socket | null;
  gameId: string;
  roomCode: string;
  gameTitle: string;
  player: {
    id: string;
    displayName: string;
    carNumber: number;
    carColor: string;
  };
  onGameFinished: (report: any) => void;
}

const OPTION_STYLES = [
  { bg: 'bg-rose-600 hover:bg-rose-500', border: 'border-rose-400', shape: '▲', colorName: 'Merah' },
  { bg: 'bg-blue-600 hover:bg-blue-500', border: 'border-blue-400', shape: '◆', colorName: 'Biru' },
  { bg: 'bg-amber-500 hover:bg-amber-400', border: 'border-amber-300', shape: '●', colorName: 'Kuning' },
  { bg: 'bg-emerald-600 hover:bg-emerald-500', border: 'border-emerald-400', shape: '■', colorName: 'Hijau' },
];

export const PlayerGamePage: React.FC<PlayerGamePageProps> = ({
  socket,
  gameId,
  roomCode,
  gameTitle,
  player,
  onGameFinished,
}) => {
  const [currentQuestion, setCurrentQuestion] = useState<ClientQuestionPayload | null>(null);
  const [questionResult, setQuestionResult] = useState<QuestionResultPayload | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);
  const [lastAnswerStatus, setLastAnswerStatus] = useState<{
    isCorrect: boolean;
    scoreAwarded: number;
    speedBonus: number;
    totalScore: number;
  } | null>(null);

  const [timeLeft, setTimeLeft] = useState<number>(15);
  const [totalTime, setTotalTime] = useState<number>(15);
  const [totalScore, setTotalScore] = useState<number>(0);
  const [floatingReactions, setFloatingReactions] = useState<Array<{ id: string; text: string; x: number }>>([]);

  const timerRef = useRef<number | null>(null);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    // 1. Question Started
    socket.on('question:started', (payload: ClientQuestionPayload) => {
      setCurrentQuestion(payload);
      setQuestionResult(null);
      setSelectedOptionId(null);
      setHasSubmitted(false);
      setLastAnswerStatus(null);

      const limit = payload.timeLimitSeconds || 15;
      setTotalTime(limit);
      setTimeLeft(limit);

      sound.playEngineRev();

      if (timerRef.current) clearInterval(timerRef.current);

      timerRef.current = window.setInterval(() => {
        const remainingMs = payload.endsAt - Date.now();
        const sec = Math.max(0, Math.ceil(remainingMs / 1000));
        setTimeLeft(sec);

        if (sec <= 3 && sec > 0) {
          sound.playCountdownBeep(false);
        }

        if (sec <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
        }
      }, 250);
    });

    // 2. Answer Accepted acknowledgement
    socket.on('answer:accepted', (data: any) => {
      setLastAnswerStatus({
        isCorrect: data.isCorrect,
        scoreAwarded: data.scoreAwarded,
        speedBonus: data.speedBonus,
        totalScore: data.totalScore,
      });
      setTotalScore(data.totalScore);
    });

    // 3. Question Ended
    socket.on('question:ended', (payload: QuestionResultPayload) => {
      if (timerRef.current) clearInterval(timerRef.current);
      setQuestionResult(payload);

      // Play audio feedback based on whether current answer was correct
      if (selectedOptionId) {
        if (selectedOptionId === payload.correctOptionId) {
          sound.playCorrect();
        } else {
          sound.playWrong();
        }
      } else {
        sound.playWrong();
      }
    });

    // 4. Leaderboard Updated
    socket.on('leaderboard:updated', (data: { leaderboard: LeaderboardEntry[] }) => {
      setLeaderboard(data.leaderboard);
      const myEntry = data.leaderboard.find((e) => e.playerId === player.id);
      if (myEntry) {
        setTotalScore(myEntry.totalScore);
      }
    });

    // 5. Race Progress
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

    // 6. Reactions
    socket.on('race:reaction', (data: { reaction: string }) => {
      const id = 'react-' + Date.now() + '-' + Math.random();
      const x = 20 + Math.random() * 60;
      setFloatingReactions((prev) => [...prev, { id, text: data.reaction, x }]);
      setTimeout(() => {
        setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
      }, 2000);
    });

    // 7. Game Finished
    socket.on('game:finished', (report: any) => {
      if (timerRef.current) clearInterval(timerRef.current);
      onGameFinished(report);
    });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      socket.off('question:started');
      socket.off('answer:accepted');
      socket.off('question:ended');
      socket.off('leaderboard:updated');
      socket.off('race:progress');
      socket.off('race:reaction');
      socket.off('game:finished');
    };
  }, [socket, selectedOptionId, player.id, onGameFinished]);

  // Handle Answer Submit
  const handleAnswerSubmit = (optionId: string) => {
    if (hasSubmitted || !currentQuestion || questionResult) return;

    setSelectedOptionId(optionId);
    setHasSubmitted(true);
    sound.playClick();

    if (socket) {
      socket.emit('answer:submit', {
        gameId,
        playerId: player.id,
        questionIndex: currentQuestion.index,
        optionId,
      });
    }
  };

  // Send fun reaction
  const sendReaction = (emoji: string) => {
    if (socket) {
      socket.emit('race:reaction', {
        gameId,
        playerId: player.id,
        reaction: emoji,
      });
    }
  };

  // Find my current rank
  const myRank = leaderboard.findIndex((p) => p.playerId === player.id) + 1;
  const timerPercentage = totalTime > 0 ? Math.max(0, (timeLeft / totalTime) * 100) : 0;

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col py-4 px-3 sm:px-6 max-w-7xl mx-auto space-y-4">
      {/* Top Banner: Game Name, Question Index, Score, Rank Badge */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow"
            style={{ backgroundColor: player.carColor }}
          >
            #{player.carNumber}
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-white truncate max-w-[200px] sm:max-w-xs">
              {currentQuestion
                ? `Soal ${currentQuestion.index + 1} dari ${currentQuestion.total}`
                : 'Menyiapkan Soal...'}
            </h2>
            <p className="text-xs text-slate-400">{player.displayName}</p>
          </div>
        </div>

        {/* Live Rank & Total Score */}
        <div className="flex items-center gap-2 sm:gap-4">
          {myRank > 0 && (
            <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 font-semibold uppercase block leading-none">
                Posisi
              </span>
              <span className="text-sm font-black text-amber-400">#{myRank}</span>
            </div>
          )}

          <div className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600/30 to-indigo-600/30 border border-indigo-500/40 text-center">
            <span className="text-[10px] text-indigo-300 font-semibold uppercase block leading-none">
              Skor Balapan
            </span>
            <span className="text-base font-black text-white">{totalScore.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* 2D Race Track Area */}
      <div className="relative">
        <RaceTrackCanvas
          players={leaderboard}
          highlightPlayerId={player.id}
          height={180}
          isLiveRace={true}
        />

        {/* Floating Reactions */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {floatingReactions.map((r) => (
            <div
              key={r.id}
              className="absolute bottom-4 text-3xl animate-bounce transition-all duration-1000"
              style={{ left: `${r.x}%`, transform: 'translateY(-60px)' }}
            >
              {r.text}
            </div>
          ))}
        </div>
      </div>

      {/* Question & Options Area */}
      {currentQuestion ? (
        <div className="space-y-4">
          {/* Question Box & Timer Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl space-y-4">
            {/* Timer Progress Bar */}
            <div className="w-full space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Clock className="w-4 h-4 text-amber-400" />
                  Sisa Waktu Menjawab
                </span>
                <span
                  className={`font-mono text-sm font-black ${
                    timeLeft <= 3 ? 'text-rose-500 animate-ping' : 'text-amber-400'
                  }`}
                >
                  {timeLeft} Detik
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    timeLeft <= 3
                      ? 'bg-rose-500'
                      : timeLeft <= 6
                      ? 'bg-amber-400'
                      : 'bg-gradient-to-r from-blue-500 to-emerald-400'
                  }`}
                  style={{ width: `${timerPercentage}%` }}
                />
              </div>
            </div>

            {/* Question Text */}
            <div className="space-y-3">
              <h1 className="text-lg sm:text-2xl font-bold text-white leading-snug">
                {currentQuestion.questionText}
              </h1>

              {currentQuestion.imageUrl && (
                <div className="max-w-md mx-auto rounded-2xl overflow-hidden border border-slate-800">
                  <img
                    src={currentQuestion.imageUrl}
                    alt="Ilustrasi Soal"
                    className="w-full h-48 object-cover"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {currentQuestion.options.map((opt, idx) => {
              const style = OPTION_STYLES[idx % OPTION_STYLES.length];
              const isSelected = selectedOptionId === opt.id;
              const isEnded = Boolean(questionResult);
              const isCorrectOption = questionResult && questionResult.correctOptionId === opt.id;
              const isWrongSelected = isEnded && isSelected && !isCorrectOption;

              return (
                <button
                  key={opt.id}
                  onClick={() => handleAnswerSubmit(opt.id)}
                  disabled={hasSubmitted || isEnded}
                  className={`relative p-4 sm:p-5 rounded-2xl border text-left transition-all duration-150 flex items-center gap-3.5 shadow-lg ${
                    isEnded
                      ? isCorrectOption
                        ? 'bg-emerald-600 border-emerald-300 ring-4 ring-emerald-500/40 text-white'
                        : isWrongSelected
                        ? 'bg-rose-600 border-rose-300 text-white opacity-90'
                        : 'bg-slate-900/60 border-slate-800 text-slate-500 opacity-50'
                      : isSelected
                      ? 'bg-indigo-600 border-white ring-4 ring-indigo-400/50 text-white scale-[1.02]'
                      : `${style.bg} ${style.border} text-white active:scale-98 cursor-pointer`
                  }`}
                >
                  {/* Shape Badge */}
                  <div className="w-10 h-10 rounded-xl bg-slate-950/40 flex items-center justify-center text-lg font-black shrink-0">
                    {style.shape}
                  </div>

                  <span className="text-base sm:text-lg font-bold flex-1 leading-snug">
                    {opt.optionText}
                  </span>

                  {/* Result Icons */}
                  {isEnded && (
                    <div className="shrink-0">
                      {isCorrectOption ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-200" />
                      ) : isWrongSelected ? (
                        <XCircle className="w-6 h-6 text-rose-200" />
                      ) : null}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Waiting or Result Feedback Box */}
          {hasSubmitted && !questionResult && (
            <div className="p-4 rounded-2xl bg-indigo-950/60 border border-indigo-500/30 text-center animate-pulse">
              <p className="text-sm font-bold text-indigo-300 flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Jawabanmu telah diterima server! Mengunci bonus kecepatan...
              </p>
            </div>
          )}

          {/* Question Ended Result Box */}
          {questionResult && (
            <div
              className={`p-5 rounded-3xl border shadow-xl space-y-2.5 ${
                selectedOptionId === questionResult.correctOptionId
                  ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-100'
                  : 'bg-rose-950/70 border-rose-500/40 text-rose-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-base font-extrabold">
                  {selectedOptionId === questionResult.correctOptionId ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <span>HEBAT! JAWABANMU BENAR! 🚀</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-rose-400" />
                      <span>JAWABAN KURANG TEPAT! TETAP SEMANGAT! 🏁</span>
                    </>
                  )}
                </div>

                {lastAnswerStatus && lastAnswerStatus.isCorrect && (
                  <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 font-black text-xs">
                    +{lastAnswerStatus.scoreAwarded} Poin (Termasuk Bonus Kecepatan!)
                  </span>
                )}
              </div>

              {questionResult.explanation && (
                <div className="pt-2 border-t border-slate-700/50 text-xs sm:text-sm text-slate-300">
                  <strong className="text-white block mb-0.5">Pembahasan:</strong>
                  {questionResult.explanation}
                </div>
              )}

              <p className="text-[11px] text-slate-400 italic text-center pt-1">
                Menunggu Guru / Host melanjutkan ke soal berikutnya...
              </p>
            </div>
          )}

          {/* Quick Reaction Bar */}
          <div className="flex items-center justify-center gap-2 pt-1">
            <span className="text-xs text-slate-400 font-semibold mr-1">Reaksi:</span>
            {['🏎️', '⚡', '🔥', '🏆', '👏'].map((emoji) => (
              <button
                key={emoji}
                onClick={() => sendReaction(emoji)}
                className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center justify-center text-lg transition active:scale-90"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-12 text-center text-slate-400 bg-slate-900 rounded-3xl border border-slate-800">
          <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="font-semibold text-white">Menghubungkan ke putaran balapan...</p>
        </div>
      )}
    </div>
  );
};
