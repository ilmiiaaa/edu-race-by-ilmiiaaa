import React, { useState, useEffect } from 'react';
import { Flag, BookOpen, Users, Trophy, Play, Plus, FileText, ArrowRight, Clock, Award, RotateCcw, Settings, ChevronRight } from 'lucide-react';
import { sound } from '../lib/audio';
import { getAuthHeaders } from '../lib/auth';

interface AdminDashboardPageProps {
  onNavigate: (view: string, data?: any) => void;
  adminUser: any;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ onNavigate, adminUser }) => {
  const [stats, setStats] = useState<{
    totalGames: number;
    totalQuestionSets: number;
    totalQuestions: number;
    totalParticipants: number;
    totalSubjects: number;
  }>({
    totalGames: 0,
    totalQuestionSets: 0,
    totalQuestions: 0,
    totalParticipants: 0,
    totalSubjects: 0,
  });

  const [recentGames, setRecentGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchStats = () => {
    fetch('/api/admin/dashboard', {
      headers: getAuthHeaders(),
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.stats) setStats(data.stats);
        if (data.recentGames) setRecentGames(data.recentGames);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleResetPackages = async () => {
    sound.playClick();
    try {
      const res = await fetch('/api/admin/reset-packages', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Paket kuis aktif berhasil di-reset ke kurikulum standar!');
        fetchStats();
      } else {
        showToast(data.error || 'Gagal mereset paket kuis.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 sm:p-8 max-w-7xl mx-auto space-y-8 text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-semibold flex items-center justify-between shadow animate-in fade-in">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white text-xs ml-2">
            ✕
          </button>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900/60 via-indigo-900/60 to-purple-900/60 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 font-bold text-xs border border-indigo-500/30">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>PORTAL GURU & HOST EDU RACE</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Selamat Datang, {adminUser?.name || 'Bapak/Ibu Guru'}! 🏎️
          </h1>
          <p className="text-slate-300 text-sm max-w-xl">
            Platform kompetisi kuis balapan edukasi real-time. Kelola sesi permainan, bank soal kurikulum, dan data pembalap secara terpadu.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              sound.playClick();
              onNavigate('admin-create-game');
            }}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 flex items-center gap-2 transition transform hover:scale-105 active:scale-95"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>BUAT BALAPAN BARU</span>
          </button>
          <button
            onClick={handleResetPackages}
            className="px-4 py-3 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-bold text-xs border border-amber-500/30 flex items-center gap-2 transition"
            title="Reset paket kuis kurikulum ke kondisi awal"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Paket Kuis</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid with Direct Navigation to CRUD */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Permainan */}
        <div
          onClick={() => {
            sound.playClick();
            onNavigate('admin-games');
          }}
          className="bg-slate-900 border border-slate-800 hover:border-blue-500/50 rounded-3xl p-5 shadow-lg space-y-2 cursor-pointer transition transform hover:-translate-y-1 group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
              <Flag className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
              CRUD <ChevronRight className="w-3 h-3" />
            </span>
          </div>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Permainan</p>
          <p className="text-2xl sm:text-3xl font-black text-white group-hover:text-blue-400 transition">{stats.totalGames}</p>
          <p className="text-[10px] text-slate-500">Klik untuk kelola & reset sesi</p>
        </div>

        {/* Card 2: Paket Kuis */}
        <div
          onClick={() => {
            sound.playClick();
            onNavigate('admin-question-bank');
          }}
          className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-3xl p-5 shadow-lg space-y-2 cursor-pointer transition transform hover:-translate-y-1 group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
              CRUD <ChevronRight className="w-3 h-3" />
            </span>
          </div>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Paket Kuis Aktif</p>
          <p className="text-2xl sm:text-3xl font-black text-white group-hover:text-indigo-400 transition">{stats.totalQuestionSets}</p>
          <p className="text-[10px] text-slate-500">Klik untuk buat & edit paket</p>
        </div>

        {/* Card 3: Total Soal */}
        <div
          onClick={() => {
            sound.playClick();
            onNavigate('admin-question-bank');
          }}
          className="bg-slate-900 border border-slate-800 hover:border-purple-500/50 rounded-3xl p-5 shadow-lg space-y-2 cursor-pointer transition transform hover:-translate-y-1 group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
              CRUD <ChevronRight className="w-3 h-3" />
            </span>
          </div>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Soal</p>
          <p className="text-2xl sm:text-3xl font-black text-white group-hover:text-purple-400 transition">{stats.totalQuestions}</p>
          <p className="text-[10px] text-slate-500">Klik untuk tambah & impor CSV</p>
        </div>

        {/* Card 4: Peserta Balapan */}
        <div
          onClick={() => {
            sound.playClick();
            onNavigate('admin-players');
          }}
          className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-3xl p-5 shadow-lg space-y-2 cursor-pointer transition transform hover:-translate-y-1 group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
              CRUD <ChevronRight className="w-3 h-3" />
            </span>
          </div>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Peserta Balapan</p>
          <p className="text-2xl sm:text-3xl font-black text-white group-hover:text-emerald-400 transition">{stats.totalParticipants}</p>
          <p className="text-[10px] text-slate-500">Klik untuk kelola & atur pembalap</p>
        </div>
      </div>

      {/* Quick Access Toolbar for CRUD */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 p-4 rounded-3xl border border-slate-800">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">Manajemen Sistem Terpadu (CRUD):</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('admin-games')}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition"
          >
            🏁 Kelola Permainan
          </button>
          <button
            onClick={() => onNavigate('admin-question-bank')}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition"
          >
            📚 Kelola Paket & Soal
          </button>
          <button
            onClick={() => onNavigate('admin-players')}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition"
          >
            👥 Kelola Peserta Balapan
          </button>
        </div>
      </div>

      {/* Recent Games List */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-400" />
            <span>Sesi Balapan Terbaru</span>
          </h2>
          <button
            onClick={() => onNavigate('admin-games')}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1"
          >
            <span>Lihat Semua Permainan</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentGames.length > 0 ? (
          <div className="divide-y divide-slate-800/80">
            {recentGames.map((game) => (
              <div
                key={game.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/30 px-3 rounded-2xl transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      {game.roomCode}
                    </span>
                    <h3 className="font-extrabold text-white text-base">{game.title}</h3>
                  </div>
                  <p className="text-xs text-slate-400">
                    {game.playerCount} Pembalap • {game.totalQuestions} Soal • Dibuat{' '}
                    {new Date(game.createdAt).toLocaleDateString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                      game.status === 'FINISHED'
                        ? 'bg-slate-800 text-slate-400'
                        : game.status === 'LOBBY'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse'
                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    }`}
                  >
                    {game.status === 'LOBBY'
                      ? 'Lobby Buka'
                      : game.status === 'FINISHED'
                      ? 'Selesai'
                      : 'Sedang Bermain'}
                  </span>

                  <button
                    onClick={() => {
                      sound.playClick();
                      onNavigate('admin-host', { gameId: game.id, roomCode: game.roomCode });
                    }}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow"
                  >
                    <span>{game.status === 'FINISHED' ? 'Laporan' : 'Masuk Host'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 space-y-3">
            <Flag className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">Belum ada sesi balapan yang dibuat.</p>
            <button
              onClick={() => onNavigate('admin-create-game')}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition"
            >
              Mulai Balapan Pertamamu Sekarang
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
