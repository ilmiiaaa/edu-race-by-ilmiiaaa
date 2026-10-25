import React from 'react';
import { Flag, Trophy, BookOpen, User, LogOut, Sparkles } from 'lucide-react';
import { AudioToggle } from './AudioToggle';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  adminUser: { id: string; name: string; email: string; role: string } | null;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate, adminUser, onLogout }) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/85 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div
          onClick={() => onNavigate('join')}
          className="flex items-center gap-2.5 cursor-pointer select-none group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
            <Flag className="w-5 h-5 text-yellow-300" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-xl tracking-tight text-white">EDU</span>
              <span className="font-black text-xl tracking-tight bg-gradient-to-r from-yellow-400 via-orange-400 to-red-500 bg-clip-text text-transparent">
                RACE
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                2D
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium leading-tight">
              Balapan Cerdas Pengetahuan
            </p>
          </div>
        </div>

        {/* Center / Right Controls */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Navigation Pill for Students / Teachers */}
          <nav className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => onNavigate('join')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                currentView === 'join' || currentView === 'player-lobby' || currentView === 'player-game'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🏁 Ikut Balapan
            </button>
            <button
              onClick={() => onNavigate(adminUser ? 'admin-dashboard' : 'admin-login')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                currentView === 'admin-dashboard'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🎓 Dashboard Guru
            </button>
            {adminUser && (
              <>
                <button
                  onClick={() => onNavigate('admin-games')}
                  className={`hidden sm:block px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    currentView === 'admin-games'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Permainan
                </button>
                <button
                  onClick={() => onNavigate('admin-question-bank')}
                  className={`hidden sm:block px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    currentView === 'admin-question-bank'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Bank Soal
                </button>
                <button
                  onClick={() => onNavigate('admin-players')}
                  className={`hidden sm:block px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    currentView === 'admin-players'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Peserta
                </button>
              </>
            )}
          </nav>

          {/* Sound Synthesizer Switch */}
          <AudioToggle />

          {/* Admin User Info / Logout */}
          {adminUser && (
            <div className="hidden md:flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="w-8 h-8 rounded-full bg-indigo-900/60 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-bold text-xs">
                {adminUser.name.charAt(0)}
              </div>
              <div className="text-left text-xs">
                <p className="font-semibold text-slate-200 leading-none truncate max-w-[120px]">
                  {adminUser.name}
                </p>
                <p className="text-[10px] text-slate-400">Guru Host</p>
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  title="Logout"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
