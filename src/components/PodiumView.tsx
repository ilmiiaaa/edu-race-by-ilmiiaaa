import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Medal, Award, RotateCcw, Download, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { sound } from '../lib/audio';

interface PodiumPlayer {
  id?: string;
  playerId?: string;
  displayName: string;
  carColor: string;
  carNumber: number;
  totalScore: number;
  correctAnswers: number;
  wrongAnswers?: number;
  unansweredCount?: number;
  totalResponseTimeMs?: number;
  finishPosition?: number;
}

interface PodiumViewProps {
  players: PodiumPlayer[];
  totalQuestions: number;
  gameTitle: string;
  roomCode: string;
  isHost?: boolean;
  onPlayAgain?: () => void;
  onExportCsv?: () => void;
}

export const PodiumView: React.FC<PodiumViewProps> = ({
  players,
  totalQuestions,
  gameTitle,
  roomCode,
  isHost = false,
  onPlayAgain,
  onExportCsv,
}) => {
  useEffect(() => {
    sound.playFanfare();

    // Fire Confetti Cannon!
    const duration = 3.5 * 1000;
    const animationEnd = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ['#3b82f6', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6'],
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ['#3b82f6', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6'],
      });

      if (Date.now() < animationEnd) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  const first = players[0];
  const second = players[1];
  const third = players[2];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 py-6 px-4">
      {/* Title Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 font-bold text-sm">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>GARIS FINIS & PODIUM JUARA</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Selamat Kepada Para Pemenang! 🏁
        </h1>
        <p className="text-slate-400 text-sm">
          {gameTitle} — Kode Balapan:{' '}
          <span className="font-mono font-bold text-indigo-400 bg-indigo-950/50 px-2 py-0.5 rounded">
            {roomCode}
          </span>
        </p>
      </div>

      {/* 3D-Style Podium Stand */}
      <div className="flex items-end justify-center gap-3 sm:gap-6 pt-12 pb-4">
        {/* 2nd Place */}
        {second ? (
          <div className="flex flex-col items-center flex-1 max-w-[190px]">
            <div className="flex flex-col items-center mb-2 animate-bounce">
              <div
                className="w-12 h-8 rounded-lg shadow-md mb-1 relative flex items-center justify-center font-bold text-xs text-white"
                style={{ backgroundColor: second.carColor }}
              >
                #{second.carNumber}
              </div>
              <Medal className="w-7 h-7 text-slate-300 drop-shadow" />
              <span className="font-bold text-slate-200 text-sm truncate max-w-[130px]">
                {second.displayName}
              </span>
              <span className="text-xs font-semibold text-slate-400">
                {second.totalScore.toLocaleString()} Poin
              </span>
            </div>
            <div className="w-full h-36 bg-gradient-to-t from-slate-700 to-slate-500 rounded-t-2xl shadow-xl flex flex-col items-center justify-center border-t-4 border-slate-300">
              <span className="text-4xl font-black text-slate-200">2</span>
              <span className="text-xs font-bold text-slate-300 tracking-wider">PERAK</span>
            </div>
          </div>
        ) : (
          <div className="flex-1 max-w-[190px] h-36 border-2 border-dashed border-slate-700 rounded-t-2xl"></div>
        )}

        {/* 1st Place (Champion) */}
        {first && (
          <div className="flex flex-col items-center flex-1 max-w-[210px] -mt-8">
            <div className="flex flex-col items-center mb-2 animate-bounce">
              <div
                className="w-14 h-9 rounded-lg shadow-xl mb-1 relative flex items-center justify-center font-black text-sm text-white"
                style={{ backgroundColor: first.carColor }}
              >
                #{first.carNumber}
                <div className="absolute -top-3 -right-2 bg-amber-400 text-slate-900 rounded-full p-0.5 shadow">
                  <Trophy className="w-3.5 h-3.5" />
                </div>
              </div>
              <Trophy className="w-10 h-10 text-amber-400 drop-shadow-lg" />
              <span className="font-extrabold text-amber-300 text-base sm:text-lg truncate max-w-[160px]">
                {first.displayName}
              </span>
              <span className="text-sm font-bold text-amber-400">
                {first.totalScore.toLocaleString()} Poin
              </span>
            </div>
            <div className="w-full h-48 bg-gradient-to-t from-amber-600 via-yellow-500 to-amber-400 rounded-t-2xl shadow-2xl flex flex-col items-center justify-center border-t-4 border-yellow-200">
              <span className="text-5xl font-black text-slate-950">1</span>
              <span className="text-xs font-extrabold text-slate-950 tracking-wider">JUARA UTAMA</span>
            </div>
          </div>
        )}

        {/* 3rd Place */}
        {third ? (
          <div className="flex flex-col items-center flex-1 max-w-[190px]">
            <div className="flex flex-col items-center mb-2 animate-bounce">
              <div
                className="w-12 h-8 rounded-lg shadow-md mb-1 relative flex items-center justify-center font-bold text-xs text-white"
                style={{ backgroundColor: third.carColor }}
              >
                #{third.carNumber}
              </div>
              <Award className="w-7 h-7 text-amber-700 drop-shadow" />
              <span className="font-bold text-slate-200 text-sm truncate max-w-[130px]">
                {third.displayName}
              </span>
              <span className="text-xs font-semibold text-slate-400">
                {third.totalScore.toLocaleString()} Poin
              </span>
            </div>
            <div className="w-full h-28 bg-gradient-to-t from-amber-900 to-amber-700 rounded-t-2xl shadow-xl flex flex-col items-center justify-center border-t-4 border-amber-600">
              <span className="text-4xl font-black text-amber-200">3</span>
              <span className="text-xs font-bold text-amber-300 tracking-wider">PERUNGGU</span>
            </div>
          </div>
        ) : (
          <div className="flex-1 max-w-[190px] h-28 border-2 border-dashed border-slate-700 rounded-t-2xl"></div>
        )}
      </div>

      {/* Complete Standings Table */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="px-6 py-4 bg-slate-800/60 border-b border-slate-700 flex items-center justify-between">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <span>Daftar Peringkat Lengkap</span>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
              {players.length} Pembalap
            </span>
          </h3>
          {isHost && onExportCsv && (
            <button
              onClick={onExportCsv}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh CSV</span>
            </button>
          )}
        </div>

        <div className="divide-y divide-slate-800 overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/40 text-xs uppercase text-slate-400 font-semibold">
              <tr>
                <th className="py-3 px-4">Peringkat</th>
                <th className="py-3 px-4">Pembalap</th>
                <th className="py-3 px-4 text-center">Jawaban Benar</th>
                <th className="py-3 px-4 text-center">Akurasi</th>
                <th className="py-3 px-4 text-right">Skor Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {players.map((p, idx) => {
                const accuracy = totalQuestions > 0 ? Math.round((p.correctAnswers / totalQuestions) * 100) : 0;
                return (
                  <tr key={p.id || p.playerId || idx} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-bold">
                      {idx === 0 ? (
                        <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-xs font-black">
                          1
                        </span>
                      ) : idx === 1 ? (
                        <span className="w-6 h-6 rounded-full bg-slate-300 text-slate-950 flex items-center justify-center text-xs font-black">
                          2
                        </span>
                      ) : idx === 2 ? (
                        <span className="w-6 h-6 rounded-full bg-amber-700 text-white flex items-center justify-center text-xs font-black">
                          3
                        </span>
                      ) : (
                        <span className="text-slate-400 text-sm ml-1.5">#{idx + 1}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                          style={{ backgroundColor: p.carColor }}
                        >
                          #{p.carNumber}
                        </div>
                        <span className="font-semibold text-white">{p.displayName}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {p.correctAnswers} / {totalQuestions}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-2">
                        <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full"
                            style={{ width: `${accuracy}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-300">{accuracy}%</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="font-extrabold text-amber-400 text-base">
                        {p.totalScore.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-4 pt-2">
        {onPlayAgain && (
          <button
            onClick={onPlayAgain}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all transform hover:scale-105 active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{isHost ? 'Kembali ke Dashboard' : 'Mainkan Balapan Lain'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
