import React from 'react';
import { X, CheckCircle2, Trophy } from 'lucide-react';
import { Achievement } from '../types/game';

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  achievements: Achievement[];
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({
  isOpen,
  onClose,
  achievements,
}) => {
  if (!isOpen) return null;

  const unlockedCount = achievements.filter((a) => a.isUnlocked).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">Achievements</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-400 tabular-nums">
              {unlockedCount} / {achievements.length}
            </span>
            <button
              onClick={onClose}
              aria-label="Close"
              className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="p-4 overflow-y-auto no-scrollbar space-y-2.5">
          {achievements.map((ach) => {
            const pct = Math.min(100, Math.floor((ach.progress / ach.maxProgress) * 100));

            return (
              <div
                key={ach.id}
                className={`p-3.5 rounded-2xl border flex items-center gap-3.5 transition-colors ${
                  ach.isUnlocked
                    ? 'bg-slate-800/80 border-emerald-500/40'
                    : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                <div className="text-2xl p-2 rounded-xl bg-slate-800 shrink-0">
                  {ach.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <h3 className="text-sm font-bold text-white truncate">
                      {ach.title}
                    </h3>
                    <span className="text-xs font-bold text-amber-400 shrink-0 flex items-center gap-1">
                      <span>🌽</span> +{ach.rewardCorn}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-tight mb-2">
                    {ach.description}
                  </p>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        ach.isUnlocked ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {ach.isUnlocked && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
