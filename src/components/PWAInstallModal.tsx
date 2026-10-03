import React from 'react';
import { X, Share, PlusSquare } from 'lucide-react';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  isIOS: boolean;
  onInstallNative?: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  isIOS,
  onInstallNative,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-3xl mb-3">
          🐔
        </div>

        <h3 className="text-lg font-bold text-white tracking-tight">
          Install on Your Phone
        </h3>
        <p className="text-xs text-slate-400 mt-1 mb-5">
          Play Crossy Cluck full-screen anytime with zero lag and offline play!
        </p>

        {isIOS ? (
          <div className="w-full bg-slate-800/60 rounded-2xl p-4 text-left text-xs text-slate-300 space-y-3 mb-5 border border-slate-700/50">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-slate-700 text-sky-400 shrink-0">
                <Share className="w-4 h-4" />
              </div>
              <div>
                <span className="font-semibold text-white">Step 1:</span> Tap the <strong>Share</strong> icon in the Safari navigation bar.
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-slate-700 text-emerald-400 shrink-0">
                <PlusSquare className="w-4 h-4" />
              </div>
              <div>
                <span className="font-semibold text-white">Step 2:</span> Scroll down and tap <strong>Add to Home Screen</strong>.
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full mb-5">
            <button
              onClick={() => {
                if (onInstallNative) onInstallNative();
                onClose();
              }}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-900/40 cursor-pointer"
            >
              Add to Home Screen Now
            </button>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-2xl cursor-pointer text-xs"
        >
          Got it
        </button>
      </div>
    </div>
  );
};
