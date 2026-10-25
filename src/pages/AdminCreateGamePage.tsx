import React, { useState, useEffect } from 'react';
import { Flag, Play, Settings, ArrowLeft, CheckCircle2, Clock, Zap, Users, Shuffle, AlertCircle } from 'lucide-react';
import { sound } from '../lib/audio';
import { getAuthHeaders } from '../lib/auth';

interface AdminCreateGamePageProps {
  onGameCreated: (gameData: { gameId: string; roomCode: string }) => void;
  onBack: () => void;
}

export const AdminCreateGamePage: React.FC<AdminCreateGamePageProps> = ({ onGameCreated, onBack }) => {
  const [questionSets, setQuestionSets] = useState<any[]>([]);
  const [selectedSetId, setSelectedSetId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [timeLimit, setTimeLimit] = useState(15);
  const [speedBonus, setSpeedBonus] = useState(true);
  const [uniqueName, setUniqueName] = useState(true);
  const [randomize, setRandomize] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/question-sets')
      .then((res) => res.json())
      .then((data) => {
        setQuestionSets(data);
        if (data.length > 0) {
          setSelectedSetId(data[0].id);
          setTitle(data[0].title);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const handleSelectSet = (s: any) => {
    setSelectedSetId(s.id);
    setTitle(s.title);
    sound.playClick();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSetId) {
      setError('Harap pilih paket kuis untuk dimainkan.');
      return;
    }

    setLoading(true);
    setError(null);
    sound.playClick();

    try {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          questionSetId: selectedSetId,
          title,
          settings: {
            timeLimitSeconds: timeLimit,
            speedBonusEnabled: speedBonus,
            maxPlayers,
            requireUniqueName: uniqueName,
            randomizeQuestions: randomize,
            showLeaderboard: true,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal membuat permainan.');
      }

      sound.playEngineRev();
      onGameCreated({ gameId: data.id, roomCode: data.roomCode });
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 sm:p-8 max-w-4xl mx-auto space-y-6 text-white">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Play className="w-5 h-5 text-amber-400 fill-current" />
            <span>Buat Sesi Balapan Baru</span>
          </h1>
          <p className="text-xs text-slate-400">
            Pilih paket materi soal dan atur konfigurasi balapan untuk kelas Anda.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleCreate} className="space-y-6">
        {/* Step 1: Select Question Set */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs">
              1
            </span>
            <span>Pilih Paket Materi Soal</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {questionSets.map((s) => (
              <div
                key={s.id}
                onClick={() => handleSelectSet(s)}
                className={`p-4 rounded-2xl border cursor-pointer transition ${
                  selectedSetId === s.id
                    ? 'bg-indigo-600/20 border-indigo-500 ring-2 ring-indigo-500/40 text-white shadow-lg'
                    : 'bg-slate-950/70 border-slate-800 hover:bg-slate-800/50 text-slate-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {s.subjectName || 'Umum'}
                  </span>
                  <span className="text-xs font-bold text-amber-400">{s.questionCount} Soal</span>
                </div>
                <h3 className="font-extrabold text-white text-base mt-2">{s.title}</h3>
                <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{s.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Step 2: Settings Configuration */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs">
              2
            </span>
            <span>Pengaturan Balapan & Lintasan</span>
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                Nama Sesi Balapan (Tampil di Layar Siswa)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Balapan Aritmatika Kelas 5A"
                className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-700 text-sm font-semibold text-white outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Durasi Menjawab Per Soal</span>
                </label>
                <select
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm font-semibold text-white outline-none"
                >
                  <option value={10}>10 Detik (Tinggi / Kilat)</option>
                  <option value={15}>15 Detik (Direkomendasikan)</option>
                  <option value={20}>20 Detik (Sedang)</option>
                  <option value={30}>30 Detik (Santai)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-400" />
                  <span>Maksimal Peserta dalam Room</span>
                </label>
                <input
                  type="number"
                  min={2}
                  max={100}
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm font-semibold text-white outline-none"
                />
              </div>
            </div>

            {/* Checkbox Toggles */}
            <div className="pt-2 space-y-3">
              <label className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={speedBonus}
                  onChange={(e) => setSpeedBonus(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-500 cursor-pointer"
                />
                <div>
                  <p className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Aktifkan Bonus Kecepatan (Speed Bonus)</span>
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Siswa yang menjawab benar lebih awal mendapatkan poin ekstra hingga +500 poin.
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={uniqueName}
                  onChange={(e) => setUniqueName(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-500 cursor-pointer"
                />
                <div>
                  <p className="text-xs font-bold text-white">Wajibkan Nama Unik dalam Room</p>
                  <p className="text-[11px] text-slate-400">
                    Mencegah dua siswa menggunakan nama tampilan yang persis sama.
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={randomize}
                  onChange={(e) => setRandomize(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-500 cursor-pointer"
                />
                <div>
                  <p className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Shuffle className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Acak Urutan Soal</span>
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Mengacak urutan soal sebelum balapan dimulai.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-base tracking-wide shadow-xl shadow-orange-500/20 flex items-center justify-center gap-2 transition transform hover:scale-[1.01] active:scale-99 disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Flag className="w-5 h-5 fill-current" />
              <span>BUAT ROOM & BUKA LOBBY BALAPAN</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
