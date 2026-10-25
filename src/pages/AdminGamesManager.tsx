import React, { useState, useEffect } from 'react';
import { Flag, Play, RotateCcw, Trash2, Edit2, ArrowLeft, Plus, Users, Clock, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { sound } from '../lib/audio';
import { getAuthHeaders } from '../lib/auth';

interface AdminGamesManagerProps {
  onBack: () => void;
  onNavigateToHost: (gameId: string, roomCode: string) => void;
  onNavigateToCreate: () => void;
}

export const AdminGamesManager: React.FC<AdminGamesManagerProps> = ({
  onBack,
  onNavigateToHost,
  onNavigateToCreate,
}) => {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Edit Game Modal State
  const [editingGame, setEditingGame] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editTimeLimit, setEditTimeLimit] = useState(15);
  const [editMaxPlayers, setEditMaxPlayers] = useState(50);
  const [editSpeedBonus, setEditSpeedBonus] = useState(true);
  const [editUniqueName, setEditUniqueName] = useState(true);

  const loadGames = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/games', {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setGames(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGames();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleDeleteGame = async (gameId: string) => {
    sound.playClick();
    try {
      const res = await fetch(`/api/games/${gameId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (res.ok) {
        showToast('Sesi permainan berhasil dihapus.');
        loadGames();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetGame = async (gameId: string) => {
    sound.playClick();
    try {
      const res = await fetch(`/api/games/${gameId}/reset`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (res.ok) {
        showToast('Permainan berhasil di-reset ke garis awal (Lobby).');
        loadGames();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearAllGames = async () => {
    sound.playClick();
    try {
      const res = await fetch('/api/games', {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (res.ok) {
        showToast('Semua sesi permainan telah dihapus.');
        loadGames();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openEditModal = (game: any) => {
    sound.playClick();
    setEditingGame(game);
    setEditTitle(game.title);
    setEditTimeLimit(game.settings?.timeLimitSeconds || 15);
    setEditMaxPlayers(game.settings?.maxPlayers || 50);
    setEditSpeedBonus(game.settings?.speedBonusEnabled !== false);
    setEditUniqueName(game.settings?.requireUniqueName !== false);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGame) return;
    sound.playClick();

    try {
      const res = await fetch(`/api/games/${editingGame.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          title: editTitle,
          settings: {
            timeLimitSeconds: editTimeLimit,
            maxPlayers: editMaxPlayers,
            speedBonusEnabled: editSpeedBonus,
            requireUniqueName: editUniqueName,
          },
        }),
      });

      if (res.ok) {
        showToast('Pengaturan permainan berhasil diperbarui.');
        setEditingGame(null);
        loadGames();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredGames = games.filter((g) => {
    const matchesStatus = filterStatus === 'ALL' || g.status === filterStatus;
    const matchesSearch =
      g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.roomCode.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 sm:p-8 max-w-7xl mx-auto space-y-6 text-white">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              <Flag className="w-6 h-6 text-amber-400" />
              <span>Kelola Seluruh Sesi Permainan (CRUD)</span>
            </h1>
            <p className="text-xs text-slate-400">
              Buat, tinjau, ubah pengaturan, reset ulang skor, atau hapus sesi balapan kelas.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {games.length > 0 && (
            <button
              onClick={handleClearAllGames}
              className="px-3.5 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 text-xs font-bold transition flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Bersihkan Semua</span>
            </button>
          )}
          <button
            onClick={onNavigateToCreate}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Permainan Baru</span>
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-between shadow animate-in fade-in">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white text-xs ml-2">
            ✕
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 p-3 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'ALL', label: 'Semua Status' },
            { id: 'LOBBY', label: 'Lobby Buka' },
            { id: 'QUESTION_ACTIVE', label: 'Sedang Berlangsung' },
            { id: 'FINISHED', label: 'Selesai' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setFilterStatus(tab.id);
                sound.playClick();
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                filterStatus === tab.id
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari judul atau kode room..."
          className="w-full sm:w-64 px-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-indigo-500"
        />
      </div>

      {/* Games Table List */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        {filteredGames.length > 0 ? (
          <div className="divide-y divide-slate-800">
            {filteredGames.map((game) => (
              <div
                key={game.id}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-800/40 transition"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-black px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      {game.roomCode}
                    </span>
                    <h3 className="font-extrabold text-white text-base">{game.title}</h3>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        game.status === 'LOBBY'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse'
                          : game.status === 'FINISHED'
                          ? 'bg-slate-800 text-slate-400'
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}
                    >
                      {game.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-blue-400" />
                      {game.playerCount} Pembalap
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      {game.totalQuestions} Soal
                    </span>
                    <span>•</span>
                    <span>
                      Dibuat: {new Date(game.createdAt).toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </p>
                </div>

                {/* Action Buttons for Game */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onNavigateToHost(game.id, game.roomCode)}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow"
                    title="Buka Layar Host"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Host Monitor</span>
                  </button>

                  <button
                    onClick={() => handleResetGame(game.id)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition"
                    title="Reset Permainan ke Lobby Awal"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => openEditModal(game)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                    title="Edit Pengaturan Sesi"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDeleteGame(game.id)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 border border-slate-700 transition"
                    title="Hapus Sesi Permainan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 space-y-3">
            <Flag className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">Tidak ada sesi permainan yang sesuai kriteria.</p>
            <button
              onClick={onNavigateToCreate}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs"
            >
              Buat Balapan Baru Sekarang
            </button>
          </div>
        )}
      </div>

      {/* Modal: Edit Game */}
      {editingGame && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-4 shadow-2xl">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-indigo-400" />
              <span>Ubah Pengaturan Permainan</span>
            </h2>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Judul Permainan</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Durasi Menjawab</label>
                  <select
                    value={editTimeLimit}
                    onChange={(e) => setEditTimeLimit(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white outline-none"
                  >
                    <option value={10}>10 Detik</option>
                    <option value={15}>15 Detik</option>
                    <option value={20}>20 Detik</option>
                    <option value={30}>30 Detik</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Maksimal Peserta</label>
                  <input
                    type="number"
                    min={2}
                    max={100}
                    value={editMaxPlayers}
                    onChange={(e) => setEditMaxPlayers(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editSpeedBonus}
                    onChange={(e) => setEditSpeedBonus(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-500 cursor-pointer"
                  />
                  <span>Aktifkan Bonus Kecepatan (Speed Bonus)</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editUniqueName}
                    onChange={(e) => setEditUniqueName(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-500 cursor-pointer"
                  />
                  <span>Wajibkan Nama Pembalap Unik dalam Room</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingGame(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-xs text-white shadow"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
