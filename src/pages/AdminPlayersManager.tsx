import React, { useState, useEffect } from 'react';
import { Users, Trash2, Edit2, Plus, ArrowLeft, Search, Trophy, Gauge, Flag, RefreshCw, CheckCircle2, ShieldAlert } from 'lucide-react';
import { sound } from '../lib/audio';
import { getAuthHeaders } from '../lib/auth';

interface AdminPlayersManagerProps {
  onBack: () => void;
  onNavigateToHost?: (gameId: string, roomCode: string) => void;
}

export const AdminPlayersManager: React.FC<AdminPlayersManagerProps> = ({ onBack, onNavigateToHost }) => {
  const [players, setPlayers] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGameFilter, setSelectedGameFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal: Add Manual Player
  const [showAddModal, setShowAddModal] = useState(false);
  const [targetGameId, setTargetGameId] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerColor, setNewPlayerColor] = useState('#3b82f6');
  const [newPlayerScore, setNewPlayerScore] = useState(0);

  // Modal: Edit Player
  const [editingPlayer, setEditingPlayer] = useState<any | null>(null);
  const [editPlayerName, setEditPlayerName] = useState('');
  const [editPlayerColor, setEditPlayerColor] = useState('#3b82f6');
  const [editPlayerScore, setEditPlayerScore] = useState(0);
  const [editPlayerProgress, setEditPlayerProgress] = useState(0);

  const CAR_COLORS = [
    { label: 'Biru Turbo', value: '#3b82f6' },
    { label: 'Merah Kilat', value: '#ef4444' },
    { label: 'Hijau Nitro', value: '#10b981' },
    { label: 'Kuning Api', value: '#f59e0b' },
    { label: 'Ungu Kecepatan', value: '#8b5cf6' },
    { label: 'Pink Neon', value: '#ec4899' },
  ];

  const loadData = async () => {
    setLoading(true);
    try {
      const [playersRes, gamesRes] = await Promise.all([
        fetch('/api/players', { headers: getAuthHeaders(), credentials: 'include' }).then((r) => r.json()),
        fetch('/api/games', { headers: getAuthHeaders(), credentials: 'include' }).then((r) => r.json()),
      ]);

      if (Array.isArray(playersRes)) setPlayers(playersRes);
      if (Array.isArray(gamesRes)) {
        setGames(gamesRes);
        if (gamesRes.length > 0 && !targetGameId) {
          setTargetGameId(gamesRes[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleKickPlayer = async (gameId: string, playerId: string, name: string) => {
    sound.playClick();
    try {
      const res = await fetch(`/api/games/${gameId}/players/${playerId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (res.ok) {
        showToast(`Peserta "${name}" berhasil dikeluarkan dari room.`);
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearAllPlayers = async () => {
    sound.playClick();
    try {
      const res = await fetch('/api/players', {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (res.ok) {
        showToast('Semua data peserta aktif berhasil dibersihkan.');
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetGameId || !newPlayerName.trim()) return;
    sound.playClick();

    try {
      const res = await fetch(`/api/games/${targetGameId}/players`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          displayName: newPlayerName.trim(),
          carColor: newPlayerColor,
          totalScore: newPlayerScore,
        }),
      });

      if (res.ok) {
        showToast(`Peserta "${newPlayerName}" berhasil ditambahkan ke balapan!`);
        setShowAddModal(false);
        setNewPlayerName('');
        setNewPlayerScore(0);
        loadData();
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal menambahkan peserta.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openEditModal = (player: any) => {
    sound.playClick();
    setEditingPlayer(player);
    setEditPlayerName(player.displayName);
    setEditPlayerColor(player.carColor || '#3b82f6');
    setEditPlayerScore(player.totalScore || 0);
    setEditPlayerProgress(player.raceProgress || 0);
  };

  const handleSaveEditPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer) return;
    sound.playClick();

    try {
      const res = await fetch(`/api/games/${editingPlayer.gameId}/players/${editingPlayer.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          displayName: editPlayerName,
          carColor: editPlayerColor,
          totalScore: editPlayerScore,
          raceProgress: editPlayerProgress,
        }),
      });

      if (res.ok) {
        showToast(`Data peserta "${editPlayerName}" berhasil diperbarui.`);
        setEditingPlayer(null);
        loadData();
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal memperbarui data peserta.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredPlayers = players.filter((p) => {
    const matchesGame = selectedGameFilter === 'ALL' || p.gameId === selectedGameFilter;
    const matchesSearch =
      p.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.roomCode && p.roomCode.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesGame && matchesSearch;
  });

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 sm:p-8 max-w-7xl mx-auto space-y-6 text-white">
      {/* Header Bar */}
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
              <Users className="w-6 h-6 text-emerald-400" />
              <span>Kelola Peserta Balapan (CRUD Siswa)</span>
            </h1>
            <p className="text-xs text-slate-400">
              Lihat, daftarkan manual, ubah nilai/mobil, atau keluarkan pembalap dari sesi room kuis.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {players.length > 0 && (
            <button
              onClick={handleClearAllPlayers}
              className="px-3.5 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 text-xs font-bold transition flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Keluarkan Semua</span>
            </button>
          )}
          {games.length > 0 && (
            <button
              onClick={() => {
                sound.playClick();
                setShowAddModal(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Peserta Manual</span>
            </button>
          )}
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

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 p-3 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="text-xs text-slate-400 font-bold shrink-0">Filter Sesi:</label>
          <select
            value={selectedGameFilter}
            onChange={(e) => {
              setSelectedGameFilter(e.target.value);
              sound.playClick();
            }}
            className="w-full sm:w-64 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-emerald-500"
          >
            <option value="ALL">Semua Sesi Permainan ({players.length} Pembalap)</option>
            {games.map((g) => (
              <option key={g.id} value={g.id}>
                [{g.roomCode}] {g.title}
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama peserta atau kode..."
            className="w-full pl-9 pr-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Players List Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        {filteredPlayers.length > 0 ? (
          <div className="divide-y divide-slate-800">
            {filteredPlayers.map((player) => (
              <div
                key={player.id}
                className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-800/40 transition"
              >
                {/* Player Profile & Car */}
                <div className="flex items-center gap-3.5">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center font-black text-white text-base shadow-lg border border-white/20 shrink-0"
                    style={{ backgroundColor: player.carColor || '#3b82f6' }}
                  >
                    #{player.carNumber || 1}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-white text-base">{player.displayName}</h3>
                      {player.roomCode && (
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700">
                          {player.roomCode}
                        </span>
                      )}
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-800 text-slate-300">
                        {player.status || 'Aktif'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 flex flex-wrap items-center gap-2">
                      <span className="text-slate-300">{player.gameTitle || 'Sesi Balapan'}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-emerald-400 font-bold">
                        <Trophy className="w-3 h-3" /> {player.totalScore || 0} Poin
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-blue-400">
                        <Gauge className="w-3 h-3" /> Progres: {player.raceProgress || 0}%
                      </span>
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end md:self-center">
                  <button
                    onClick={() => openEditModal(player)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1 transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Ubah Nilai / Mobil</span>
                  </button>

                  <button
                    onClick={() => handleKickPlayer(player.gameId, player.id, player.displayName)}
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 border border-slate-700 transition"
                    title="Keluarkan Peserta"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 space-y-3">
            <Users className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">Tidak ada peserta balapan yang ditemukan.</p>
            {games.length > 0 && (
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs"
              >
                Daftarkan Peserta Manual
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal: Tambah Peserta Manual */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 shadow-2xl">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-400" />
              <span>Tambah Peserta Balapan Manual</span>
            </h2>

            <form onSubmit={handleAddPlayer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Pilih Sesi Permainan</label>
                <select
                  value={targetGameId}
                  onChange={(e) => setTargetGameId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white outline-none"
                  required
                >
                  {games.map((g) => (
                    <option key={g.id} value={g.id}>
                      [{g.roomCode}] {g.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Nama Peserta / Siswa</label>
                <input
                  type="text"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Pilih Warna Mobil</label>
                <div className="grid grid-cols-3 gap-2">
                  {CAR_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setNewPlayerColor(c.value)}
                      className={`p-2 rounded-xl flex items-center gap-2 text-xs font-semibold border transition ${
                        newPlayerColor === c.value
                          ? 'border-emerald-400 bg-emerald-500/10 text-white'
                          : 'border-slate-800 bg-slate-950 text-slate-400'
                      }`}
                    >
                      <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: c.value }} />
                      <span className="truncate">{c.label.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Skor Awal (Opsional)</label>
                <input
                  type="number"
                  value={newPlayerScore}
                  onChange={(e) => setNewPlayerScore(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white shadow"
                >
                  Daftarkan ke Balapan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Data Peserta */}
      {editingPlayer && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 shadow-2xl">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-indigo-400" />
              <span>Ubah Profil & Nilai Peserta</span>
            </h2>

            <form onSubmit={handleSaveEditPlayer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Nama Pembalap</label>
                <input
                  type="text"
                  value={editPlayerName}
                  onChange={(e) => setEditPlayerName(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Warna Mobil Balap</label>
                <div className="grid grid-cols-3 gap-2">
                  {CAR_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setEditPlayerColor(c.value)}
                      className={`p-2 rounded-xl flex items-center gap-2 text-xs font-semibold border transition ${
                        editPlayerColor === c.value
                          ? 'border-indigo-400 bg-indigo-500/10 text-white'
                          : 'border-slate-800 bg-slate-950 text-slate-400'
                      }`}
                    >
                      <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: c.value }} />
                      <span className="truncate">{c.label.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Total Skor</label>
                  <input
                    type="number"
                    value={editPlayerScore}
                    onChange={(e) => setEditPlayerScore(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Progres Lintasan (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={editPlayerProgress}
                    onChange={(e) => setEditPlayerProgress(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingPlayer(null)}
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
