import React from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Smartphone, HelpCircle } from 'lucide-react';

interface PauseModalProps {
  isOpen: boolean;
  onResume: () => void;
  onRestart: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  hapticsEnabled: boolean;
  onToggleHaptics: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  isOpen,
  onResume,
  onRestart,
  soundEnabled,
  onToggleSound,
  hapticsEnabled,
  onToggleHaptics,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl flex flex-col items-center">
        <h2 className="text-xl font-bold text-white tracking-tight mb-5">
          Game Paused
        </h2>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5 w-full mb-6">
          <button
            onClick={onResume}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 active:scale-98 transition-all cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>Resume Game</span>
          </button>

          <button
            onClick={onRestart}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-2xl border border-slate-700/60 flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restart Run</span>
          </button>
        </div>

        {/* Toggles */}
        <div className="w-full bg-slate-850/60 border border-slate-800 rounded-2xl p-3 flex items-center justify-around mb-5">
          <button
            onClick={onToggleSound}
            className={`flex flex-col items-center gap-1 text-xs font-medium cursor-pointer ${
              soundEnabled ? 'text-emerald-400' : 'text-slate-500'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            <span>Sound</span>
          </button>

          <div className="w-[1px] h-8 bg-slate-800" />

          <button
            onClick={onToggleHaptics}
            className={`flex flex-col items-center gap-1 text-xs font-medium cursor-pointer ${
              hapticsEnabled ? 'text-emerald-400' : 'text-slate-500'
            }`}
          >
            <Smartphone className="w-5 h-5" />
            <span>Vibration</span>
          </button>
        </div>

        {/* Mini Guide */}
        <div className="w-full text-left bg-slate-800/40 rounded-2xl p-3.5 border border-slate-800/80 text-xs text-slate-400 space-y-1.5">
          <div className="flex items-center gap-1.5 text-slate-300 font-semibold mb-1">
            <HelpCircle className="w-4 h-4 text-emerald-400" />
            <span>Controls & Tips</span>
          </div>
          <p>• <strong>Tap screen:</strong> Hop forward</p>
          <p>• <strong>Swipe in any direction:</strong> Hop Up, Down, Left, or Right</p>
          <p>• <strong>Ride logs:</strong> Jump onto floating logs to cross rivers safely</p>
          <p>• <strong>Keep moving:</strong> Lingering in one place triggers the hawk!</p>
        </div>
      </div>
    </div>
  );
};
