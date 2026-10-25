import React, { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { Users, Flag, Sparkles, Volume2, ShieldCheck, Flame } from 'lucide-react';
import { sound } from '../lib/audio';

interface PlayerLobbyProps {
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
  onGameStarted: (data: any) => void;
  onExit: () => void;
}

export const PlayerLobbyPage: React.FC<PlayerLobbyProps> = ({
  socket,
  gameId,
  roomCode,
  gameTitle,
  player,
  onGameStarted,
  onExit,
}) => {
  const [playersList, setPlayersList] = useState<any[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (!socket) return;

    // Listen for room updates
    socket.on('room:player-list', (list: any[]) => {
      setPlayersList(list);
    });

    // Listen for countdown
    socket.on('game:countdown', (data: { seconds: number }) => {
      let count = data.seconds;
      setCountdown(count);
      sound.playCountdownBeep(false);

      const interval = setInterval(() => {
        count--;
        if (count > 0) {
          setCountdown(count);
          sound.playCountdownBeep(false);
        } else if (count === 0) {
          setCountdown(0);
          sound.playCountdownBeep(true);
        } else {
          clearInterval(interval);
        }
      }, 1000);
    });

    // Listen for game started
    socket.on('game:started', (data: any) => {
      sound.playEngineRev();
      onGameStarted(data);
    });

    // Listen for immediate question started
    socket.on('question:started', (qData: any) => {
      onGameStarted(qData);
    });

    return () => {
      socket.off('room:player-list');
      socket.off('game:countdown');
      socket.off('game:started');
      socket.off('question:started');
    };
  }, [socket, onGameStarted]);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-4 bg-slate-950 text-white relative">
      {/* Fullscreen Countdown Overlay */}
      {countdown !== null && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-200">
          <div className="text-center space-y-4">
            <p className="text-xl sm:text-2xl font-bold text-amber-400 tracking-widest uppercase">
              BERSUDAHLAH DI GARIS AWAL!
            </p>
            <div className="text-8xl sm:text-9xl font-black bg-gradient-to-r from-red-500 via-amber-400 to-emerald-400 bg-clip-text text-transparent animate-pulse scale-125">
              {countdown === 0 ? 'GO! 🏎️💨' : countdown}
            </div>
            <p className="text-slate-400 text-sm font-semibold">Tancap gas dan jawab secepat mungkin!</p>
          </div>
        </div>
      )}

      <div className="w-full max-w-2xl space-y-6">
        {/* Header Lobby info */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>RUANG TUNGGU BALAPAN</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white">{gameTitle}</h2>

          <div className="flex items-center justify-center gap-3">
            <span className="text-xs uppercase font-bold text-slate-400">KODE BALAPAN:</span>
            <span className="font-mono text-2xl font-black text-amber-400 bg-slate-950 px-4 py-1 rounded-xl border border-amber-500/30 tracking-widest">
              {roomCode}
            </span>
          </div>

          {/* Player Kart Preview */}
          <div className="py-4 flex flex-col items-center justify-center gap-2">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-4 shadow-inner">
              <div
                className="w-14 h-9 rounded-xl flex items-center justify-center font-black text-white text-base shadow-lg"
                style={{ backgroundColor: player.carColor }}
              >
                #{player.carNumber}
              </div>
              <div className="text-left">
                <p className="text-xs text-slate-400">Pembalap Siap:</p>
                <p className="text-lg font-extrabold text-white">{player.displayName}</p>
              </div>
              <button
                onClick={() => sound.playEngineRev()}
                className="ml-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-amber-400 flex items-center gap-1.5 transition active:scale-95"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Tes Gas</span>
              </button>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-blue-950/40 border border-blue-500/20 text-xs text-blue-300 font-medium flex items-center justify-center gap-2 animate-pulse">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Menunggu Guru / Host memulai balapan... Tetap di halaman ini!</span>
          </div>
        </div>

        {/* Competitors List */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-200">
              <Users className="w-4 h-4 text-indigo-400" />
              <span>Teman Pembalap ({playersList.length || 1})</span>
            </div>
            <span className="text-xs text-slate-400">Status: Siap di Lintasan</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {playersList.length > 0 ? (
              playersList.map((p) => (
                <div
                  key={p.id}
                  className={`p-3 rounded-2xl border flex items-center gap-2.5 transition ${
                    p.id === player.id
                      ? 'bg-blue-600/20 border-blue-500 text-white'
                      : 'bg-slate-950/70 border-slate-800 text-slate-300'
                  }`}
                >
                  <div
                    className="w-7 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white shadow-sm shrink-0"
                    style={{ backgroundColor: p.carColor }}
                  >
                    #{p.carNumber}
                  </div>
                  <span className="text-xs font-semibold truncate">
                    {p.displayName} {p.id === player.id && '(Kamu)'}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-3 rounded-2xl bg-blue-600/20 border border-blue-500 text-white flex items-center gap-2.5">
                <div
                  className="w-7 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white shadow-sm shrink-0"
                  style={{ backgroundColor: player.carColor }}
                >
                  #{player.carNumber}
                </div>
                <span className="text-xs font-semibold truncate">{player.displayName} (Kamu)</span>
              </div>
            )}
          </div>
        </div>

        {/* Exit option */}
        <div className="text-center">
          <button
            onClick={onExit}
            className="text-xs text-slate-400 hover:text-rose-400 transition underline underline-offset-4"
          >
            Keluar dari room
          </button>
        </div>
      </div>
    </div>
  );
};
