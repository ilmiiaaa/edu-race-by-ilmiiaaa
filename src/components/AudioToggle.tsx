import React, { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { sound } from '../lib/audio';

export const AudioToggle: React.FC = () => {
  const [muted, setMuted] = useState(sound.getMuted());

  const handleToggle = () => {
    const isNowMuted = sound.toggleMute();
    setMuted(isNowMuted);
    if (!isNowMuted) {
      sound.playClick();
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={`p-2 rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 text-xs font-semibold ${
        muted
          ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
          : 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-600/30'
      }`}
      title={muted ? 'Aktifkan Suara' : 'Bisukan Suara'}
      aria-label="Toggle Audio"
    >
      {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-indigo-400 animate-pulse" />}
      <span className="hidden sm:inline">{muted ? 'Bisu' : 'Suara Aktif'}</span>
    </button>
  );
};
