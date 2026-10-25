import React, { useState } from 'react';
import { Lock, Mail, LogIn, AlertCircle, Sparkles, UserCheck } from 'lucide-react';
import { sound } from '../lib/audio';
import { setAuthToken } from '../lib/auth';

interface AdminLoginPageProps {
  onLoginSuccess: (user: any) => void;
  onBackToJoin: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onLoginSuccess, onBackToJoin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    sound.playClick();

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login gagal.');
      }

      if (data.token) {
        setAuthToken(data.token);
      }

      sound.playCorrect();
      onLoginSuccess(data.user);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail('guru@edurace.id');
    setPassword('EduRace2026!');
    sound.playClick();
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-4 bg-slate-950 text-white relative">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400 shadow-lg">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Login Guru & Host</h1>
          <p className="text-slate-400 text-xs sm:text-sm">
            Masuk untuk membuat room balapan, mengelola bank soal, dan melihat laporan kelas.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Email Guru
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="guru@edurace.id"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 text-sm font-medium text-white outline-none transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 text-sm font-medium text-white outline-none transition"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Masuk ke Dashboard Guru</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Fill Button */}
          <div className="pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={handleFillDemo}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-semibold text-amber-300 flex items-center justify-center gap-1.5 transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Gunakan Akun Demo Guru (Pak Budi)</span>
            </button>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={onBackToJoin}
            className="text-xs text-slate-400 hover:text-slate-200 transition underline underline-offset-4"
          >
            ← Kembali ke halaman gabung peserta
          </button>
        </div>
      </div>
    </div>
  );
};
