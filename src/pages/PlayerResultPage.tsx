import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Medal, Award, CheckCircle2, XCircle, RotateCcw, ArrowLeft, Star, Zap } from 'lucide-react';
import { sound } from '../lib/audio';

interface PlayerResultPageProps {
  report: any;
  currentPlayerId: string;
  onPlayAgain: () => void;
}

export const PlayerResultPage: React.FC<PlayerResultPageProps> = ({ report, currentPlayerId, onPlayAgain }) => {
  const players: any[] = report?.players || [];
  const myPlayer = players.find((p) => p.id === currentPlayerId || p.playerId === currentPlayerId) || players[0];
  const myRank = players.findIndex((p) => p.id === currentPlayerId || p.playerId === currentPlayerId) + 1;
  const isPodium = myRank >= 1 && myRank <= 3;
  const totalQ = report?.totalQuestions || Math.max(1, (myPlayer?.correctAnswers || 0) + (myPlayer?.wrongAnswers || 0));
  const accuracy = totalQ > 0 ? Math.round(((myPlayer?.correctAnswers || 0) / totalQ) * 100) : 0;

  useEffect(() => {
    if (isPodium) {
      sound.playFanfare();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } else {
      sound.playCorrect();
    }
  }, [isPodium]);

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 sm:p-8 max-w-4xl mx-auto space-y-6 text-white">
      {/* Result Hero Header */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-4 relative overflow-hidden">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold">
            <Trophy className="w-3.5 h-3.5" />
            <span>HASIL AKHIR BALAPAN</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white">
            {isPodium ? 'Luar Biasa, Kamu Naik Podium! 🏆' : 'Balapan Selesai! Kerja Bagus! 🏁'}
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm">
            {report?.title || 'Edu Race'} — Kode Room: {report?.roomCode}
          </p>
        </div>

        {/* Player Badge Card */}
        {myPlayer && (
          <div className="max-w-md mx-auto p-5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between shadow-inner">
            <div className="flex items-center gap-3.5">
              <div
                className="w-14 h-9 rounded-xl flex items-center justify-center font-black text-white text-base shadow-lg"
                style={{ backgroundColor: myPlayer.carColor }}
              >
                #{myPlayer.carNumber}
              </div>
              <div className="text-left">
                <span className="text-xs text-slate-400 font-semibold block">Pembalap:</span>
                <span className="text-lg font-black text-white">{myPlayer.displayName}</span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-400 font-semibold block">Peringkat Akhir:</span>
              <span className="text-2xl font-black text-amber-400">
                #{myRank}{' '}
                <span className="text-xs text-slate-400 font-normal">dari {players.length}</span>
              </span>
            </div>
          </div>
        )}

        {/* Stat metrics */}
        {myPlayer && (
          <div className="grid grid-cols-3 gap-3 max-w-md mx-auto pt-2">
            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-bold">TOTAL SKOR</span>
              <span className="text-xl font-black text-amber-400">
                {myPlayer.totalScore.toLocaleString()}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-bold">JAWABAN BENAR</span>
              <span className="text-xl font-black text-emerald-400">
                {myPlayer.correctAnswers} / {totalQ}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-bold">AKURASI</span>
              <span className="text-xl font-black text-blue-400">{accuracy}%</span>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2">
          <button
            onClick={onPlayAgain}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 inline-flex items-center gap-2 transition transform hover:scale-105 active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Ikut Balapan Lainnya</span>
          </button>
        </div>
      </div>

      {/* Class Standings */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Medal className="w-5 h-5 text-indigo-400" />
          <span>Klasemen Seluruh Pembalap</span>
        </h2>

        <div className="divide-y divide-slate-800 text-sm">
          {players.map((p, idx) => {
            const isMe = p.id === currentPlayerId || p.playerId === currentPlayerId;
            return (
              <div
                key={p.id || p.playerId || idx}
                className={`py-3 px-3 rounded-xl flex items-center justify-between ${
                  isMe ? 'bg-indigo-600/20 border border-indigo-500/40 font-bold' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 text-center font-black text-amber-400 text-sm">#{idx + 1}</span>
                  <div
                    className="w-7 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                    style={{ backgroundColor: p.carColor }}
                  >
                    #{p.carNumber}
                  </div>
                  <span className="text-white">
                    {p.displayName} {isMe && '(Kamu)'}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <span className="text-emerald-400 font-semibold">{p.correctAnswers} Benar</span>
                  <span className="font-extrabold text-amber-400 text-sm">
                    {p.totalScore.toLocaleString()} Poin
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
