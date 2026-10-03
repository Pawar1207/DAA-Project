import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameEngine, GameEngineCallbacks } from './game/GameEngine';
import { TouchCanvas } from './components/TouchCanvas';
import { TopBar } from './components/TopBar';
import { MobileControls } from './components/MobileControls';
import { LockerModal } from './components/LockerModal';
import { GameOverModal } from './components/GameOverModal';
import { PauseModal } from './components/PauseModal';
import { AchievementsModal } from './components/AchievementsModal';
import { SettingsModal } from './components/SettingsModal';
import { PWAInstallModal } from './components/PWAInstallModal';
import { CHARACTER_SKINS } from './data/characters';
import { INITIAL_ACHIEVEMENTS } from './data/achievements';
import { BIOMES } from './data/biomes';
import {
  CharacterSkin,
  DeathCause,
  GameSettings,
  Achievement,
  Biome,
} from './types/game';
import { sound } from './audio/soundEffects';
import { usePWAInstall } from './hooks/usePWAInstall';
import { Play, Sparkles, Smartphone, Monitor } from 'lucide-react';

const STORAGE_KEYS = {
  HIGH_SCORE: 'crossycluck_highscore_v1',
  TOTAL_CORN: 'crossycluck_total_corn_v1',
  UNLOCKED_SKINS: 'crossycluck_unlocked_skins_v1',
  ACTIVE_SKIN: 'crossycluck_active_skin_v1',
  ACHIEVEMENTS: 'crossycluck_achievements_v1',
  SETTINGS: 'crossycluck_settings_v1',
};

export default function App() {
  // Engine and Canvas refs
  const engineRef = useRef<GameEngine | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Game UI States
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isNewHigh, setIsNewHigh] = useState<boolean>(false);
  const [currentScore, setCurrentScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem(STORAGE_KEYS.HIGH_SCORE) || '0', 10);
    } catch {
      return 0;
    }
  });
  const [totalCorn, setTotalCorn] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem(STORAGE_KEYS.TOTAL_CORN) || '0', 10);
    } catch {
      return 0;
    }
  });
  const [runCorn, setRunCorn] = useState<number>(0);
  const [combo, setCombo] = useState<number>(1);
  const [deathCause, setDeathCause] = useState<DeathCause | null>(null);
  const [activeBiome, setActiveBiome] = useState<Biome>(BIOMES[0]);

  // Modals
  const [isLockerOpen, setIsLockerOpen] = useState(false);
  const [isAchievementsOpen, setIsAchievementsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  // Desktop Phone Frame Simulation toggle
  const [phoneFrameMode, setPhoneFrameMode] = useState<boolean>(false);

  // PWA Install hook
  const { isInstallable, isIOS, install: installPWA } = usePWAInstall();

  // Settings
  const [settings, setSettings] = useState<GameSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (saved) return JSON.parse(saved);
    } catch {
      // Default settings
    }
    return {
      soundEnabled: true,
      hapticsEnabled: true,
      controlMode: 'SWIPE_AND_TAP',
      cameraSmoothness: 1,
    };
  });

  // Skins State
  const [skins, setSkins] = useState<CharacterSkin[]>(() => {
    try {
      const savedUnlocked = localStorage.getItem(STORAGE_KEYS.UNLOCKED_SKINS);
      const unlockedIds: string[] = savedUnlocked ? JSON.parse(savedUnlocked) : ['classic'];
      return CHARACTER_SKINS.map((s) => ({
        ...s,
        unlocked: unlockedIds.includes(s.id) || s.id === 'classic',
      }));
    } catch {
      return CHARACTER_SKINS;
    }
  });

  const [activeSkinId, setActiveSkinId] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.ACTIVE_SKIN) || 'classic';
    } catch {
      return 'classic';
    }
  });

  // Achievements State
  const [achievements, setAchievements] = useState<Achievement[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ACHIEVEMENTS);
      if (saved) return JSON.parse(saved);
    } catch {
      // Default
    }
    return INITIAL_ACHIEVEMENTS;
  });

  // Initialize Sound Engine settings
  useEffect(() => {
    sound.setSoundEnabled(settings.soundEnabled);
    sound.setHapticsEnabled(settings.hapticsEnabled);
  }, [settings.soundEnabled, settings.hapticsEnabled]);

  // Save Settings
  const handleUpdateSettings = (partial: Partial<GameSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...partial };
      try {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
      } catch {
        // Storage safety
      }
      return updated;
    });
  };

  // Sound Toggle Shortcut
  const handleToggleSound = () => {
    handleUpdateSettings({ soundEnabled: !settings.soundEnabled });
  };

  // Achievement Updater
  const handleAchievementProgress = useCallback((id: string, value: number) => {
    setAchievements((prev) => {
      let updated = false;
      const next = prev.map((ach) => {
        if (ach.id === id && !ach.isUnlocked) {
          const newProgress = Math.min(ach.maxProgress, Math.max(ach.progress, value));
          if (newProgress >= ach.maxProgress) {
            updated = true;
            // Award reward
            setTotalCorn((c) => {
              const nc = c + ach.rewardCorn;
              try {
                localStorage.setItem(STORAGE_KEYS.TOTAL_CORN, nc.toString());
              } catch {}
              return nc;
            });
            sound.playGoldenEgg();
            return { ...ach, progress: newProgress, isUnlocked: true };
          }
          if (newProgress !== ach.progress) {
            updated = true;
            return { ...ach, progress: newProgress };
          }
        }
        return ach;
      });

      if (updated) {
        try {
          localStorage.setItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(next));
        } catch {}
      }
      return next;
    });
  }, []);

  // Stable callbacks proxy that does not cause engine recreation
  const callbacksRef = useRef<GameEngineCallbacks>({
    onScoreUpdate: () => {},
    onCornCollect: () => {},
    onGameOver: () => {},
    onAchievementProgress: () => {},
  });

  // Keep latest callbacks in ref
  useEffect(() => {
    callbacksRef.current = {
      onScoreUpdate: (score, newBest) => {
        setCurrentScore(score);
        setHighScore((prevBest) => {
          if (newBest > prevBest) {
            setIsNewHigh(true);
            try {
              localStorage.setItem(STORAGE_KEYS.HIGH_SCORE, newBest.toString());
            } catch {}
            return newBest;
          }
          return prevBest;
        });

        if (engineRef.current) {
          setActiveBiome(engineRef.current.activeBiome);
          setCombo(engineRef.current.cornCombo);
        }
      },
      onCornCollect: (amount, total) => {
        setRunCorn((r) => r + amount);
        setTotalCorn(total);
        try {
          localStorage.setItem(STORAGE_KEYS.TOTAL_CORN, total.toString());
        } catch {}
      },
      onGameOver: (score, cause, runEarned) => {
        setIsGameOver(true);
        setDeathCause(cause);
        setRunCorn(runEarned);
      },
      onAchievementProgress: (id, delta) => {
        handleAchievementProgress(id, delta);
      },
    };
  }, [handleAchievementProgress]);

  // Canvas Ready Handler (Construct engine once)
  const handleCanvasReady = useCallback(
    (canvas: HTMLCanvasElement) => {
      canvasRef.current = canvas;
      if (engineRef.current) return;

      const currentSkin = skins.find((s) => s.id === activeSkinId) || skins[0];

      // Proxy callbacks through callbacksRef
      const proxyCallbacks: GameEngineCallbacks = {
        onScoreUpdate: (s, b) => callbacksRef.current.onScoreUpdate(s, b),
        onCornCollect: (a, t) => callbacksRef.current.onCornCollect(a, t),
        onGameOver: (s, c, r) => callbacksRef.current.onGameOver(s, c, r),
        onAchievementProgress: (id, d) => callbacksRef.current.onAchievementProgress(id, d),
      };

      const engine = new GameEngine(
        canvas,
        currentSkin,
        { highScore, totalCorn },
        proxyCallbacks
      );

      engineRef.current = engine;
      engine.start();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Clean up engine on unmount only
  useEffect(() => {
    return () => {
      if (engineRef.current) {
        engineRef.current.stop();
        engineRef.current = null;
      }
    };
  }, []);

  // Update Engine Skin when activeSkinId changes
  useEffect(() => {
    const currentSkin = skins.find((s) => s.id === activeSkinId);
    if (currentSkin && engineRef.current) {
      engineRef.current.setSkin(currentSkin);
    }
  }, [activeSkinId, skins]);

  // Handle phone frame resize
  useEffect(() => {
    const timer = setTimeout(() => {
      if (engineRef.current) {
        engineRef.current.resize();
      }
    }, 60);
    return () => clearTimeout(timer);
  }, [phoneFrameMode]);

  // Movement Handler
  const handleMove = useCallback(
    (dx: number, dy: number) => {
      if (!hasStarted) {
        setHasStarted(true);
      }
      if (engineRef.current) {
        engineRef.current.handleInput(dx, dy);
      }
    },
    [hasStarted]
  );

  // Restart Handler
  const handleRestart = () => {
    setIsGameOver(false);
    setIsPaused(false);
    setIsNewHigh(false);
    setCurrentScore(0);
    setRunCorn(0);
    setCombo(1);
    setDeathCause(null);

    if (engineRef.current) {
      engineRef.current.reset();
      engineRef.current.start();
    }
  };

  // Pause Handlers
  const handlePause = () => {
    setIsPaused(true);
    if (engineRef.current) {
      engineRef.current.pause();
    }
  };

  const handleResume = () => {
    setIsPaused(false);
    if (engineRef.current) {
      engineRef.current.resume();
    }
  };

  // Unlock Skin Handler
  const handleUnlockSkin = (skinId: string, cost: number): boolean => {
    if (totalCorn < cost) return false;

    const nextCorn = totalCorn - cost;
    setTotalCorn(nextCorn);
    try {
      localStorage.setItem(STORAGE_KEYS.TOTAL_CORN, nextCorn.toString());
    } catch {}

    const updatedSkins = skins.map((s) => (s.id === skinId ? { ...s, unlocked: true } : s));
    setSkins(updatedSkins);

    const unlockedIds = updatedSkins.filter((s) => s.unlocked).map((s) => s.id);
    try {
      localStorage.setItem(STORAGE_KEYS.UNLOCKED_SKINS, JSON.stringify(unlockedIds));
    } catch {}

    handleAchievementProgress('fashionista', unlockedIds.length);
    return true;
  };

  // Equip Skin Handler
  const handleSelectSkin = (skin: CharacterSkin) => {
    setActiveSkinId(skin.id);
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_SKIN, skin.id);
    } catch {}
  };

  return (
    <main className="fixed inset-0 w-full h-full bg-slate-950 flex items-center justify-center overflow-hidden font-sans">
      {/* Desktop Device Simulator Wrapper (only active if user toggles phoneFrameMode) */}
      <div
        className={`relative w-full h-full flex items-center justify-center transition-all ${
          phoneFrameMode
            ? 'max-w-[430px] max-h-[890px] rounded-[48px] border-[10px] border-slate-800 shadow-2xl overflow-hidden ring-1 ring-slate-700/50'
            : ''
        }`}
      >
        {/* Dynamic iPhone Notch indicator in phone frame mode */}
        {phoneFrameMode && (
          <div className="absolute top-2.5 z-40 w-28 h-5 bg-slate-900 rounded-full flex items-center justify-end px-3">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-800 border border-slate-700/60" />
          </div>
        )}

        {/* Top Navigation HUD */}
        <TopBar
          score={currentScore}
          highScore={highScore}
          corn={totalCorn}
          biome={activeBiome}
          combo={combo}
          soundEnabled={settings.soundEnabled}
          onToggleSound={handleToggleSound}
          onPause={handlePause}
          onOpenLocker={() => setIsLockerOpen(true)}
          onOpenAchievements={() => setIsAchievementsOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        {/* Core Game Canvas */}
        <TouchCanvas
          engine={engineRef.current}
          onMove={handleMove}
          onCanvasReady={handleCanvasReady}
        />

        {/* Ergonomic Mobile D-Pad if enabled in Settings */}
        <MobileControls
          visible={settings.controlMode === 'DPAD' && !isGameOver && !isPaused}
          onMove={handleMove}
        />

        {/* Start Screen Overlay on First Launch */}
        {!hasStarted && (
          <div
            onClick={() => {
              setHasStarted(true);
              sound.playHop();
            }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-end pb-24 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent p-6 text-center cursor-pointer select-none"
          >
            {/* Mascot Chicken Graphic */}
            <div className="w-20 h-20 rounded-3xl bg-emerald-600/30 border border-emerald-500/50 flex items-center justify-center text-5xl mb-3 shadow-2xl animate-bounce">
              🐔
            </div>

            <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-md">
              Crossy Cluck
            </h1>
            <p className="text-xs text-emerald-300 font-medium tracking-wide mt-1 mb-6">
              Why did the chicken cross the road?
            </p>

            {/* Prompt Pulse */}
            <div className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3.5 rounded-2xl shadow-xl shadow-emerald-950 flex items-center gap-2 text-sm tracking-wide animate-pulse">
              <Play className="w-4 h-4 fill-current" />
              <span>TAP OR SWIPE TO HOP</span>
            </div>

            <span className="text-[11px] text-slate-400 mt-4">
              Swipe in any direction · Avoid cars, trains & rivers
            </span>
          </div>
        )}

        {/* Locker / Skins Modal */}
        <LockerModal
          isOpen={isLockerOpen}
          onClose={() => setIsLockerOpen(false)}
          skins={skins}
          activeSkinId={activeSkinId}
          totalCorn={totalCorn}
          onUnlockSkin={handleUnlockSkin}
          onSelectSkin={handleSelectSkin}
        />

        {/* Game Over Modal */}
        <GameOverModal
          isOpen={isGameOver}
          score={currentScore}
          highScore={highScore}
          isNewHigh={isNewHigh}
          runCorn={runCorn}
          totalCorn={totalCorn}
          deathCause={deathCause}
          onRestart={handleRestart}
          onOpenLocker={() => {
            setIsGameOver(false);
            setIsLockerOpen(true);
          }}
        />

        {/* Pause Modal */}
        <PauseModal
          isOpen={isPaused}
          onResume={handleResume}
          onRestart={handleRestart}
          soundEnabled={settings.soundEnabled}
          onToggleSound={handleToggleSound}
          hapticsEnabled={settings.hapticsEnabled}
          onToggleHaptics={() =>
            handleUpdateSettings({ hapticsEnabled: !settings.hapticsEnabled })
          }
        />

        {/* Achievements Modal */}
        <AchievementsModal
          isOpen={isAchievementsOpen}
          onClose={() => setIsAchievementsOpen(false)}
          achievements={achievements}
        />

        {/* Settings Modal */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          isInstallable={isInstallable || isIOS}
          onInstallPWA={() => {
            setIsSettingsOpen(false);
            if (isInstallable) {
              installPWA();
            } else {
              setIsInstallModalOpen(true);
            }
          }}
        />

        {/* PWA Home Screen Install Modal */}
        <PWAInstallModal
          isOpen={isInstallModalOpen}
          onClose={() => setIsInstallModalOpen(false)}
          isIOS={isIOS}
          onInstallNative={installPWA}
        />
      </div>

      {/* Desktop view switcher: toggle phone frame preview for testing responsiveness */}
      <button
        onClick={() => setPhoneFrameMode((prev) => !prev)}
        title={phoneFrameMode ? 'Switch to Fullscreen' : 'Switch to Phone Frame'}
        className="hidden md:flex fixed bottom-4 right-4 z-50 bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60 rounded-xl px-3 py-2 text-xs font-semibold items-center gap-1.5 shadow-xl transition-all cursor-pointer"
      >
        {phoneFrameMode ? (
          <>
            <Monitor className="w-3.5 h-3.5" />
            <span>Fullscreen View</span>
          </>
        ) : (
          <>
            <Smartphone className="w-3.5 h-3.5" />
            <span>Phone View</span>
          </>
        )}
      </button>
    </main>
  );
}
