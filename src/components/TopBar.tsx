import React from 'react';
import { Volume2, VolumeX, Pause, Sparkles, Settings as SettingsIcon, Trophy } from 'lucide-react';
import { Biome } from '../types/game';

interface TopBarProps {
  score: number;
  highScore: number;
  corn: number;
  biome: Biome;
  combo: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onPause: () => void;
  onOpenLocker: () => void;
  onOpenAchievements: () => void;
  onOpenSettings: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  score,
  highScore,
  corn,
  biome,
  combo,
  soundEnabled,
  onToggleSound,
  onPause,
  onOpenLocker,
  onOpenAchievements,
  onOpenSettings,
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-30 pt-safe px-4 py-2.5 flex items-center justify-between pointer-events-none select-none">
      {/* Left: Score & High Score */}
      <div className="flex items-center gap-3 pointer-events-auto">
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-2xl px-3.5 py-1.5 shadow-lg flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Score</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black tabular-nums tracking-tight text-white leading-none">
                {score}
              </span>
              {combo > 1 && (
                <span className="text-xs font-bold text-amber-400 animate-pulse">
                  {combo}x
                </span>
              )}
            </div>
          </div>

          <div className="w-[1px] h-6 bg-slate-700/60" />

          <div className="flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Best</span>
            <span className="text-sm font-bold tabular-nums text-emerald-400 leading-none">
              {highScore}
            </span>
          </div>
        </div>

        {/* Biome Indicator on wider screens or subtle text */}
        <span className="hidden sm:inline-block text-xs font-medium text-slate-300/80 bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-800">
          {biome.name}
        </span>
      </div>

      {/* Right: Currency & Action Buttons */}
      <div className="flex items-center gap-2 pointer-events-auto">
        {/* Corn Currency Counter */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-2xl px-3 py-1.5 shadow-lg flex items-center gap-1.5">
          <span className="text-base" role="img" aria-label="corn">🌽</span>
          <span className="text-sm font-bold tabular-nums text-amber-300">
            {corn}
          </span>
        </div>

        {/* Locker / Skins Button */}
        <button
          onClick={onOpenLocker}
          aria-label="Character Locker"
          className="min-h-[44px] min-w-[44px] bg-slate-900/80 backdrop-blur-md border border-slate-700/50 hover:bg-slate-800 text-amber-400 rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-all"
        >
          <Sparkles className="w-5 h-5" />
        </button>

        {/* Achievements Button */}
        <button
          onClick={onOpenAchievements}
          aria-label="Achievements"
          className="min-h-[44px] min-w-[44px] bg-slate-900/80 backdrop-blur-md border border-slate-700/50 hover:bg-slate-800 text-yellow-400 rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-all"
        >
          <Trophy className="w-5 h-5" />
        </button>

        {/* Sound Toggle */}
        <button
          onClick={onToggleSound}
          aria-label={soundEnabled ? 'Mute audio' : 'Unmute audio'}
          className="min-h-[44px] min-w-[44px] bg-slate-900/80 backdrop-blur-md border border-slate-700/50 hover:bg-slate-800 text-slate-300 rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-all"
        >
          {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-slate-500" />}
        </button>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          aria-label="Settings"
          className="min-h-[44px] min-w-[44px] bg-slate-900/80 backdrop-blur-md border border-slate-700/50 hover:bg-slate-800 text-slate-300 rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-all"
        >
          <SettingsIcon className="w-5 h-5" />
        </button>

        {/* Pause Button */}
        <button
          onClick={onPause}
          aria-label="Pause game"
          className="min-h-[44px] min-w-[44px] bg-slate-900/80 backdrop-blur-md border border-slate-700/50 hover:bg-slate-800 text-slate-300 rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-all"
        >
          <Pause className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
