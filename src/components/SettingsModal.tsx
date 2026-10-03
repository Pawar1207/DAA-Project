import React from 'react';
import { X, Volume2, Smartphone, Gamepad2, Hand, Download } from 'lucide-react';
import { GameSettings } from '../types/game';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onInstallPWA?: () => void;
  isInstallable?: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onInstallPWA,
  isInstallable,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white tracking-tight">Settings</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 text-sm">
          {/* Control Mode Segmented Control */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Mobile Control Scheme
            </label>
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
              <button
                onClick={() => onUpdateSettings({ controlMode: 'SWIPE_AND_TAP' })}
                className={`py-2 px-3 rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  settings.controlMode === 'SWIPE_AND_TAP'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Hand className="w-4 h-4" />
                <span>Swipe & Tap</span>
              </button>

              <button
                onClick={() => onUpdateSettings({ controlMode: 'DPAD' })}
                className={`py-2 px-3 rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  settings.controlMode === 'DPAD'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Gamepad2 className="w-4 h-4" />
                <span>On-Screen D-Pad</span>
              </button>
            </div>
          </div>

          {/* Sound & Haptics Toggles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/40 border border-slate-800">
              <div className="flex items-center gap-2.5">
                <Volume2 className="w-5 h-5 text-emerald-400" />
                <div>
                  <div className="font-semibold text-white">Audio Effects</div>
                  <div className="text-xs text-slate-400">Synthesized 8-bit clucks & chimes</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={(e) => onUpdateSettings({ soundEnabled: e.target.checked })}
                className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/40 border border-slate-800">
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-5 h-5 text-emerald-400" />
                <div>
                  <div className="font-semibold text-white">Haptic Vibration</div>
                  <div className="text-xs text-slate-400">Tactile phone buzz on hop & bump</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.hapticsEnabled}
                onChange={(e) => onUpdateSettings({ hapticsEnabled: e.target.checked })}
                className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Install to Phone CTA if installable */}
          {isInstallable && onInstallPWA && (
            <button
              onClick={onInstallPWA}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-800 text-emerald-400 font-bold rounded-2xl border border-emerald-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Install Crossy Cluck on Phone</span>
            </button>
          )}

          {/* Version & Info */}
          <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-800/60">
            Crossy Cluck · Mobile Edition
          </div>
        </div>
      </div>
    </div>
  );
};
