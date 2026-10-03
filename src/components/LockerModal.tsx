import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Lock, Sparkles } from 'lucide-react';
import { CharacterSkin } from '../types/game';
import { sound } from '../audio/soundEffects';

interface LockerModalProps {
  isOpen: boolean;
  onClose: () => void;
  skins: CharacterSkin[];
  activeSkinId: string;
  totalCorn: number;
  onUnlockSkin: (skinId: string, cost: number) => boolean;
  onSelectSkin: (skin: CharacterSkin) => void;
}

export const LockerModal: React.FC<LockerModalProps> = ({
  isOpen,
  onClose,
  skins,
  activeSkinId,
  totalCorn,
  onUnlockSkin,
  onSelectSkin,
}) => {
  const [selectedSkinId, setSelectedSkinId] = useState(activeSkinId);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    setSelectedSkinId(activeSkinId);
  }, [activeSkinId, isOpen]);

  const selectedSkin = skins.find((s) => s.id === selectedSkinId) || skins[0];

  // Render animated chicken preview in canvas
  useEffect(() => {
    if (!isOpen) return;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const render = () => {
      t += 0.05;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height * 0.65;

      // Hop physics
      const hop = Math.max(0, Math.sin(t * 3)) * 14;
      const shadowScale = Math.max(0.4, 1 - hop / 30);

      // Ground shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 8, 20 * shadowScale, 8 * shadowScale, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body position
      const bodyY = cy - hop;
      const bodyW = 34;
      const bodyH = 38;

      ctx.save();
      ctx.translate(cx, bodyY);

      // Stretch & squash
      const stretchY = 1 + (hop > 2 ? 0.15 : -0.08);
      const stretchX = 1 - (hop > 2 ? 0.08 : -0.05);
      ctx.scale(stretchX, stretchY);

      // Body Shadow side
      ctx.fillStyle = selectedSkin.accentColor;
      ctx.beginPath();
      ctx.roundRect(-bodyW / 2 + 2, -bodyH, bodyW, bodyH, 10);
      ctx.fill();

      // Front body
      ctx.fillStyle = selectedSkin.primaryColor;
      ctx.beginPath();
      ctx.roundRect(-bodyW / 2, -bodyH - 2, bodyW, bodyH, 10);
      ctx.fill();

      // Comb
      ctx.fillStyle = selectedSkin.combColor;
      ctx.beginPath();
      ctx.roundRect(-6, -bodyH - 12, 12, 12, 4);
      ctx.fill();

      // Eyes
      ctx.fillStyle = selectedSkin.eyeColor;
      ctx.beginPath();
      ctx.arc(-8, -bodyH + 10, 3.5, 0, Math.PI * 2);
      ctx.arc(8, -bodyH + 10, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Beak
      ctx.fillStyle = selectedSkin.beakColor;
      ctx.beginPath();
      ctx.moveTo(-6, -bodyH + 13);
      ctx.lineTo(0, -bodyH + 22);
      ctx.lineTo(6, -bodyH + 13);
      ctx.closePath();
      ctx.fill();

      // Accessory
      if (selectedSkin.accessory === 'CROWN') {
        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.moveTo(-11, -bodyH - 8);
        ctx.lineTo(-8, -bodyH - 18);
        ctx.lineTo(0, -bodyH - 11);
        ctx.lineTo(8, -bodyH - 18);
        ctx.lineTo(11, -bodyH - 8);
        ctx.closePath();
        ctx.fill();
      } else if (selectedSkin.accessory === 'VISOR') {
        ctx.fillStyle = '#38BDF8';
        ctx.fillRect(-12, -bodyH + 7, 24, 6);
      } else if (selectedSkin.accessory === 'HEADBAND') {
        ctx.fillStyle = '#EF4444';
        ctx.fillRect(-bodyW / 2 - 2, -bodyH + 4, bodyW + 4, 6);
      } else if (selectedSkin.accessory === 'GOGGLES') {
        ctx.fillStyle = '#0284C7';
        ctx.beginPath();
        ctx.arc(-8, -bodyH + 10, 6, 0, Math.PI * 2);
        ctx.arc(8, -bodyH + 10, 6, 0, Math.PI * 2);
        ctx.fill();
      } else if (selectedSkin.accessory === 'WIZARD_HAT') {
        ctx.fillStyle = '#4C1D95';
        ctx.beginPath();
        ctx.moveTo(-15, -bodyH - 8);
        ctx.lineTo(0, -bodyH - 32);
        ctx.lineTo(15, -bodyH - 8);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(-18, -bodyH - 10, 36, 4);
      }

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isOpen, selectedSkin]);

  if (!isOpen) return null;

  const handleUnlock = () => {
    if (totalCorn >= selectedSkin.cost) {
      const success = onUnlockSkin(selectedSkin.id, selectedSkin.cost);
      if (success) {
        sound.playGoldenEgg();
        sound.triggerHaptic([30, 50, 30]);
      }
    } else {
      sound.triggerHaptic([20, 20]);
    }
  };

  const handleEquip = () => {
    onSelectSkin(selectedSkin);
    sound.playHop();
    sound.triggerHaptic(15);
  };

  const isEquipped = activeSkinId === selectedSkin.id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl" role="img" aria-label="chicken">🐔</span>
            <h2 className="text-lg font-bold text-white tracking-tight">Chicken Locker</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-800/40">
              <span role="img" aria-label="corn">🌽</span>
              <span className="tabular-nums">{totalCorn}</span>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Preview Stage */}
        <div className="relative bg-gradient-to-b from-slate-800/40 to-slate-950/60 p-4 flex flex-col items-center justify-center border-b border-slate-800/80">
          <canvas
            ref={previewCanvasRef}
            width={140}
            height={110}
            className="w-[140px] h-[110px]"
          />

          <div className="text-center mt-1">
            <h3 className="text-lg font-bold text-white flex items-center justify-center gap-1.5">
              <span>{selectedSkin.name}</span>
              {selectedSkin.specialEffect && (
                <Sparkles className="w-4 h-4 text-amber-400 inline" />
              )}
            </h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              {selectedSkin.description}
            </p>
          </div>

          {/* Action Button: Equip or Unlock */}
          <div className="mt-3 w-full px-6">
            {selectedSkin.unlocked ? (
              <button
                onClick={handleEquip}
                disabled={isEquipped}
                className={`w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isEquipped
                    ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 active:scale-98'
                }`}
              >
                {isEquipped ? (
                  <>
                    <Check className="w-4 h-4" /> Equipped
                  </>
                ) : (
                  'Equip Chicken'
                )}
              </button>
            ) : (
              <button
                onClick={handleUnlock}
                disabled={totalCorn < selectedSkin.cost}
                className={`w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  totalCorn >= selectedSkin.cost
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-900/40 active:scale-98'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                }`}
              >
                <Lock className="w-4 h-4" />
                Unlock for {selectedSkin.cost} 🌽
              </button>
            )}
          </div>
        </div>

        {/* Skin Selection Grid */}
        <div className="p-4 overflow-y-auto no-scrollbar grid grid-cols-3 gap-2.5">
          {skins.map((skin) => {
            const isSelected = skin.id === selectedSkinId;
            const isEquippedSkin = skin.id === activeSkinId;

            return (
              <button
                key={skin.id}
                onClick={() => {
                  setSelectedSkinId(skin.id);
                  sound.playHop();
                }}
                className={`relative flex flex-col items-center p-3 rounded-2xl border transition-all text-left cursor-pointer ${
                  isSelected
                    ? 'bg-slate-800 border-emerald-500 shadow-md ring-1 ring-emerald-500/50'
                    : 'bg-slate-900/90 border-slate-800 hover:bg-slate-800/60'
                }`}
              >
                {/* Equipped Badge */}
                {isEquippedSkin && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-950" />
                )}

                {/* Skin Icon */}
                <div className="text-3xl my-1 relative">
                  {skin.iconEmoji}
                  {!skin.unlocked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 rounded-full">
                      <Lock className="w-4 h-4 text-amber-400" />
                    </div>
                  )}
                </div>

                <span className="text-xs font-semibold text-white truncate max-w-full">
                  {skin.name}
                </span>

                <span className="text-[10px] text-slate-400 tabular-nums">
                  {skin.unlocked ? (isEquippedSkin ? 'Active' : 'Ready') : `${skin.cost} 🌽`}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
