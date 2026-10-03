import React from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { sound } from '../audio/soundEffects';

interface MobileControlsProps {
  onMove: (dx: number, dy: number) => void;
  visible: boolean;
}

export const MobileControls: React.FC<MobileControlsProps> = ({ onMove, visible }) => {
  if (!visible) return null;

  const handlePress = (dx: number, dy: number) => {
    sound.triggerHaptic(12);
    onMove(dx, dy);
  };

  return (
    <div className="fixed bottom-6 left-0 right-0 z-20 pb-safe flex justify-center pointer-events-none select-none">
      <div className="pointer-events-auto bg-slate-900/70 backdrop-blur-md border border-slate-700/60 p-3 rounded-3xl shadow-2xl flex flex-col items-center gap-1.5 touch-manipulation">
        {/* Up / Forward Button */}
        <button
          onClick={() => handlePress(0, 1)}
          aria-label="Hop Forward"
          className="w-14 h-14 bg-emerald-600/90 active:bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg active:scale-90 transition-transform cursor-pointer"
        >
          <ArrowUp className="w-7 h-7 stroke-[2.5]" />
        </button>

        {/* Left, Center Tap, Right */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePress(-1, 0)}
            aria-label="Hop Left"
            className="w-14 h-14 bg-slate-800/90 active:bg-slate-700 hover:bg-slate-800 text-white rounded-2xl flex items-center justify-center shadow-md active:scale-90 transition-transform cursor-pointer"
          >
            <ArrowLeft className="w-6 h-6 stroke-[2.5]" />
          </button>

          {/* Quick Forward Tap Center */}
          <button
            onClick={() => handlePress(0, 1)}
            aria-label="Hop Forward"
            className="w-12 h-12 bg-slate-700/60 active:bg-slate-600 text-emerald-400 rounded-xl flex items-center justify-center text-xs font-bold active:scale-90 transition-transform cursor-pointer"
          >
            HOP
          </button>

          <button
            onClick={() => handlePress(1, 0)}
            aria-label="Hop Right"
            className="w-14 h-14 bg-slate-800/90 active:bg-slate-700 hover:bg-slate-800 text-white rounded-2xl flex items-center justify-center shadow-md active:scale-90 transition-transform cursor-pointer"
          >
            <ArrowRight className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* Down / Backward Button */}
        <button
          onClick={() => handlePress(0, -1)}
          aria-label="Hop Backward"
          className="w-14 h-12 bg-slate-800/90 active:bg-slate-700 hover:bg-slate-800 text-slate-300 rounded-2xl flex items-center justify-center shadow-md active:scale-90 transition-transform cursor-pointer"
        >
          <ArrowDown className="w-5 h-5 stroke-[2]" />
        </button>
      </div>
    </div>
  );
};
