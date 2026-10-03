import React from 'react';
import { RotateCcw, Share2, Sparkles, Award } from 'lucide-react';
import { DeathCause } from '../types/game';

interface GameOverModalProps {
  isOpen: boolean;
  score: number;
  highScore: number;
  isNewHigh: boolean;
  runCorn: number;
  totalCorn: number;
  deathCause: DeathCause | null;
  onRestart: () => void;
  onOpenLocker: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  score,
  highScore,
  isNewHigh,
  runCorn,
  totalCorn,
  deathCause,
  onRestart,
  onOpenLocker,
}) => {
  if (!isOpen) return null;

  const getDeathDetails = () => {
    switch (deathCause) {
      case 'CAR':
        return {
          emoji: '🚗💥',
          title: 'Traffic Mishap',
          subtitle: 'The chicken did not make it across the asphalt.',
        };
      case 'TRAIN':
        return {
          emoji: '🚆💨',
          title: 'Express Steamrolled',
          subtitle: 'Bullet trains do not yield for poultry.',
        };
      case 'RIVER':
        return {
          emoji: '🌊🫧',
          title: 'Went for a Swim',
          subtitle: 'Chickens make terrible submarines.',
        };
      case 'EAGLE':
        return {
          emoji: '🦅⚡',
          title: 'Predator Lunch',
          subtitle: 'Hesitation is fatal when hawks patrol the sky.',
        };
      default:
        return {
          emoji: '🐔',
          title: 'End of the Road',
          subtitle: 'Better luck on the next crossing!',
        };
    }
  };

  const details = getDeathDetails();

  const handleShare = async () => {
    const shareData = {
      title: 'Crossy Cluck',
      text: `I just scored ${score} points hopping across roads and rivers in Crossy Cluck! Can you beat my high score of ${highScore}? 🐔🌽`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // Share cancelled
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
        alert('Score copied to clipboard!');
      } catch {
        // Clipboard error
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl flex flex-col items-center text-center">
        {/* Death Emoji Banner */}
        <div className="text-4xl mb-2">{details.emoji}</div>

        <h2 className="text-xl font-black text-white tracking-tight">
          {details.title}
        </h2>
        <p className="text-xs text-slate-400 mt-1 mb-5">
          {details.subtitle}
        </p>

        {/* Score Card Box */}
        <div className="w-full bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 mb-4 flex flex-col items-center">
          {isNewHigh && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 mb-1.5 animate-bounce">
              <Award className="w-4 h-4" />
              <span>NEW PERSONAL BEST!</span>
            </div>
          )}

          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Final Score</span>
          <span className="text-5xl font-black tabular-nums tracking-tight text-white my-1">
            {score}
          </span>

          <div className="w-full border-t border-slate-700/60 mt-3 pt-3 flex items-center justify-around text-xs">
            <div className="flex flex-col items-center">
              <span className="text-slate-400 font-medium">Best</span>
              <span className="text-base font-bold tabular-nums text-emerald-400">
                {highScore}
              </span>
            </div>
            <div className="w-[1px] h-6 bg-slate-700/60" />
            <div className="flex flex-col items-center">
              <span className="text-slate-400 font-medium">Corn Earned</span>
              <span className="text-base font-bold tabular-nums text-amber-300 flex items-center gap-1">
                <span>🌽</span> +{runCorn}
              </span>
            </div>
          </div>
        </div>

        {/* Primary Action: Single-Line Play Again Button */}
        <button
          onClick={onRestart}
          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer text-base"
        >
          <RotateCcw className="w-5 h-5 stroke-[2.5]" />
          <span>Play Again</span>
        </button>

        {/* Secondary Actions */}
        <div className="grid grid-cols-2 gap-2.5 w-full mt-3">
          <button
            onClick={onOpenLocker}
            className="py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-800 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700/60 flex items-center justify-center gap-1.5 active:scale-98 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Skins ({totalCorn} 🌽)</span>
          </button>

          <button
            onClick={handleShare}
            className="py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-800 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700/60 flex items-center justify-center gap-1.5 active:scale-98 transition-all cursor-pointer"
          >
            <Share2 className="w-4 h-4 text-sky-400" />
            <span>Share Run</span>
          </button>
        </div>
      </div>
    </div>
  );
};
