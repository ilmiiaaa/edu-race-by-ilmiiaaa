import React, { useState, useEffect } from 'react';
import { Flag, Play, Sparkles, AlertCircle, Users, Check, Flame } from 'lucide-react';
import { CAR_COLORS } from '../types/game';
import { sound } from '../lib/audio';

interface JoinPageProps {
  onJoinSuccess: (sessionData: {
    gameId: string;
    roomCode: string;
    gameTitle: string;
    playerId: string;
    sessionId: string;
    displayName: string;
    carNumber: number;
    carColor: string;
  }) => void;
}

export const JoinPage: React.FC<JoinPageProps> = ({ onJoinSuccess }) => {
  const [roomCode, setRoomCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedColor, setSelectedColor] = useState(CAR_COLORS[1].hex); // Default Blue Turbo
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeRooms, setActiveRooms] = useState<Array<{ id: string; title: string; roomCode: string; status: string; playerCount: number }>>([]);

  // Fetch active rooms for easy one-click testing
  useEffect(() => {
    fetch('/api/games')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setActiveRooms(data.filter((g) => g.status === 'LOBBY' || g.status === 'QUESTION_ACTIVE'));
        }
      })
      .catch(() => {});
  }, []);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanCode = roomCode.trim().toUpperCase();
    const cleanName = displayName.trim();

    if (!cleanCode) {
      setError('Harap masukkan Kode Room dari Guru / Host.');
      return;
    }
    if (cleanName.length < 2 || cleanName.length > 30) {
      setError('Nama peserta harus antara 2 hingga 30 karakter.');
      return;
    }

    setLoading(true);
    sound.playClick();

    try {
      const res = await fetch('/api/games/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode: cleanCode,
          displayName: cleanName,
          carColor: selectedColor,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal bergabung ke dalam room balapan.');
      }

      sound.playEngineRev();
      onJoinSuccess({
        gameId: data.gameId,
        roomCode: data.roomCode,
        gameTitle: data.gameTitle,
        playerId: data.playerId,
        sessionId: data.sessionId,
        displayName: data.displayName,
        carNumber: data.carNumber,
        carColor: selectedColor,
      });
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center py-10 px-4 bg-slate-950 text-white relative overflow-hidden">
      {/* Background Glows & Grid Pattern */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Hero Card */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>KUIS EDUKASI BALAPAN REAL-TIME</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            Siap Masuk <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">Lintasan Balap?</span>
          </h1>
          <p className="text-slate-400 text-sm">
            Jawab soal dengan benar dan cepat untuk memacu mobil kartmu menuju garis finis juara!
          </p>
        </div>

        {/* Join Box */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleJoin} className="space-y-4">
            {/* Room Code Field */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Kode Room (PIN Balapan)
              </label>
              <input
                type="text"
                maxLength={8}
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Contoh: RACE88"
                className="w-full px-4 py-3.5 rounded-2xl bg-slate-950 border-2 border-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 text-center font-mono text-2xl font-black tracking-widest text-white placeholder-slate-600 outline-none transition uppercase"
                required
              />
            </div>

            {/* Player Name Field */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Nama Pembalap
              </label>
              <input
                type="text"
                maxLength={30}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Masukkan nama panggilanmu..."
                className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 text-base font-semibold text-white placeholder-slate-500 outline-none transition"
                required
              />
            </div>

            {/* Car Color Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Pilih Warna Mobil Balap
              </label>
              <div className="grid grid-cols-4 gap-2">
                {CAR_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedColor(c.hex);
                      sound.playClick();
                    }}
                    className={`relative p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                      selectedColor === c.hex
                        ? 'border-white bg-slate-800 ring-2 ring-blue-500 shadow-md scale-105'
                        : 'border-slate-800 bg-slate-950/70 hover:bg-slate-800/50'
                    }`}
                  >
                    <div
                      className="w-6 h-4 rounded shadow"
                      style={{ backgroundColor: c.hex }}
                    />
                    <span className="text-[10px] font-medium text-slate-300 truncate w-full text-center">
                      {c.name.split(' ')[0]}
                    </span>
                    {selectedColor === c.hex && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center shadow">
                        <Check className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white font-extrabold text-base tracking-wide shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  <span>GABUNG BALAPAN SEKARANG!</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Live Active Rooms (Quick Join Shortcut) */}
        {activeRooms.length > 0 && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                Room Yang Sedang Buka:
              </span>
              <span className="text-[11px] text-emerald-400 font-semibold">{activeRooms.length} Aktif</span>
            </div>
            <div className="space-y-1.5">
              {activeRooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => {
                    setRoomCode(room.roomCode);
                    sound.playClick();
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 flex items-center justify-between text-xs transition"
                >
                  <div className="text-left">
                    <p className="font-semibold text-white truncate max-w-[200px]">{room.title}</p>
                    <p className="text-[10px] text-slate-400">{room.playerCount} Pembalap terdaftar</p>
                  </div>
                  <span className="font-mono font-black text-amber-400 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                    {room.roomCode}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick Instructions */}
        <div className="text-center text-xs text-slate-400 space-y-1">
          <p>
            💡 <strong className="text-slate-300">Tips Balapan:</strong> Siswa tidak memerlukan akun atau password.
          </p>
          <p>Cukup masukkan Kode Room dari Bapak/Ibu Guru dan bersiaplah memacu mobilmu!</p>
        </div>
      </div>
    </div>
  );
};
