/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/GameEngine';
import { CheckpointData, ExpeditionStats, GameMode, GameSettings, VehicleTelemetry } from './types/game';
import { CameraMode } from './game/CameraController';
import { MainMenu } from './ui/MainMenu';
import { GameHUD } from './ui/GameHUD';
import { PauseMenu } from './ui/PauseMenu';
import { SettingsMenu } from './ui/SettingsMenu';
import { ControlsMenu } from './ui/ControlsMenu';
import { MultiplayerMenu } from './ui/MultiplayerMenu';
import { VictoryModal } from './ui/VictoryModal';

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // High-level game states
  const [mode, setMode] = useState<GameMode>('menu');
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isDriving, setIsDriving] = useState<boolean>(true);
  const [cameraMode, setCameraMode] = useState<CameraMode>('chase');
  const [interactionPrompt, setInteractionPrompt] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [webglError, setWebglError] = useState<string | null>(null);

  // Modals
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(false);
  const [showMultiplayer, setShowMultiplayer] = useState<boolean>(false);
  const [showVictory, setShowVictory] = useState<boolean>(false);

  // Live Telemetry
  const [telemetry, setTelemetry] = useState<VehicleTelemetry>({
    speedKmh: 0,
    rpm: 850,
    gear: 'P',
    throttle: 0,
    steering: 0,
    handbrake: false,
    surface: 'road',
    fuel: 100,
    damage: 0,
    pitch: 0,
    roll: 0,
    isGrounded: true,
  });

  // Expedition progression
  const [expeditionStats, setExpeditionStats] = useState<ExpeditionStats>({
    totalCheckpoints: 6,
    currentCheckpointIndex: 0,
    completed: false,
    startTime: 0,
    elapsedTime: 0,
    topSpeed: 0,
    distanceToNext: 0,
  });

  const [currentCheckpoint, setCurrentCheckpoint] = useState<CheckpointData | null>(null);
  const [playerCoords, setPlayerCoords] = useState<{ x: number; z: number; yaw: number }>({
    x: -120,
    z: 175,
    yaw: 0.65,
  });

  // Settings
  const [settings, setSettings] = useState<GameSettings>({
    graphicsQuality: 'high',
    masterVolume: 0.7,
    engineVolume: 0.65,
    sfxVolume: 0.8,
    mouseSensitivity: 1.0,
    cameraFov: 60,
  });

  // Initialize GameEngine
  useEffect(() => {
    if (!mountRef.current) return;

    let notificationTimer: ReturnType<typeof setTimeout> | null = null;

    try {
      const engine = new GameEngine(mountRef.current, {
        onTelemetryUpdate: (telem) => {
          setTelemetry(telem);
          if (engineRef.current) {
            setPlayerCoords({
              x: engineRef.current.vehiclePhysics.position.x,
              z: engineRef.current.vehiclePhysics.position.z,
              yaw: engineRef.current.vehiclePhysics.yaw,
            });
            setIsDriving(engineRef.current.isDriving);
          }
        },
        onExpeditionUpdate: (stats) => {
          setExpeditionStats(stats);
          if (engineRef.current) {
            setCurrentCheckpoint(engineRef.current.checkpoints.getCurrentCheckpoint());
          }
        },
        onCheckpointPassed: (cp, isFinal) => {
          if (notificationTimer) clearTimeout(notificationTimer);
          if (isFinal) {
            setNotification(`Summit Reached! Route Complete!`);
            setShowVictory(true);
          } else {
            setNotification(`Checkpoint ${cp.id + 1} Passed: ${cp.name}!`);
          }
          notificationTimer = setTimeout(() => {
            setNotification(null);
          }, 4500);
        },
        onInteractionPrompt: (prompt) => {
          setInteractionPrompt(prompt);
        },
        onModeChange: (newMode) => {
          setMode(newMode);
          setIsPaused(false);
          setShowVictory(false);
        },
        onCameraModeChange: (camMode) => {
          setCameraMode(camMode);
        },
        onDamageEvent: (dmg) => {
          // Visual shake or audio handled by engine
        },
      });

      engineRef.current = engine;
      engine.applySettings(settings);

      return () => {
        if (notificationTimer) clearTimeout(notificationTimer);
        engine.dispose();
        engineRef.current = null;
      };
    } catch (err) {
      console.error('Game initialization failed:', err);
      setWebglError('Error starting 3D graphics engine: ' + (err instanceof Error ? err.message : String(err)));
    }
  }, []);

  // Actions
  const handleStartExpedition = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.startExpedition();
      setMode('expedition');
      setIsPaused(false);
      setShowVictory(false);
    }
  }, []);

  const handleStartFreeDrive = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.startFreeDrive();
      setMode('freedrive');
      setIsPaused(false);
      setShowVictory(false);
    }
  }, []);

  const handleResume = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.setPaused(false);
      setIsPaused(false);
    }
  }, []);

  const handlePause = useCallback(() => {
    if (engineRef.current) {
      const paused = engineRef.current.togglePause();
      setIsPaused(paused);
    }
  }, []);

  const handleRecover = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.recoverVehicle();
    }
  }, []);

  const handleCameraToggle = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.cameraController.nextMode();
      setCameraMode(engineRef.current.cameraController.mode);
    }
  }, []);

  const handleEnterExit = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.toggleEnterExitVehicle();
      setIsDriving(engineRef.current.isDriving);
    }
  }, []);

  const handleExitToMenu = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.mode = 'menu';
      engineRef.current.isPaused = false;
      engineRef.current.audio.stopEngine();
      setMode('menu');
      setIsPaused(false);
      setShowVictory(false);
    }
  }, []);

  const handleUpdateSettings = useCallback((newSettings: GameSettings) => {
    setSettings(newSettings);
    if (engineRef.current) {
      engineRef.current.applySettings(newSettings);
    }
  }, []);

  const handleSelectColor = useCallback((hex: number) => {
    if (engineRef.current) {
      engineRef.current.setVehicleColor(hex);
    }
  }, []);

  const handleVirtualDrive = useCallback((throttle: number, steer: number, handbrake: boolean) => {
    if (engineRef.current) {
      engineRef.current.setVirtualDrivingInputs(throttle, steer, handbrake);
    }
  }, []);

  const handleVirtualWalk = useCallback((forward: number, right: number, run: boolean) => {
    if (engineRef.current) {
      engineRef.current.setVirtualWalkingInputs(forward, right, run);
    }
  }, []);

  if (webglError) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-stone-950 text-white p-6">
        <div className="bg-stone-900 border border-rose-500/40 rounded-2xl p-8 max-w-md text-center shadow-2xl">
          <h2 className="text-xl font-bold text-rose-400 mb-2">Graphics Error</h2>
          <p className="text-sm text-stone-300 leading-relaxed mb-4">{webglError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-sm"
          >
            Reload Game
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-stone-950">
      {/* 3D WebGL Canvas Mount Container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      {/* Main Menu Overlay */}
      {mode === 'menu' && (
        <MainMenu
          onStartExpedition={handleStartExpedition}
          onStartFreeDrive={handleStartFreeDrive}
          onOpenMultiplayer={() => setShowMultiplayer(true)}
          onOpenSettings={() => setShowSettings(true)}
          onOpenControls={() => setShowControls(true)}
          onSelectVehicleColor={handleSelectColor}
        />
      )}

      {/* In-Game Active HUD */}
      {mode !== 'menu' && engineRef.current && (
        <GameHUD
          telemetry={telemetry}
          expeditionStats={expeditionStats}
          currentCheckpoint={currentCheckpoint}
          mode={mode}
          cameraMode={cameraMode}
          isDriving={isDriving}
          interactionPrompt={interactionPrompt}
          notification={notification}
          onRecover={handleRecover}
          onCameraToggle={handleCameraToggle}
          onEnterExitVehicle={handleEnterExit}
          onPause={handlePause}
          onVirtualDrive={handleVirtualDrive}
          onVirtualWalk={handleVirtualWalk}
          playerCoords={playerCoords}
          checkpoints={engineRef.current.checkpoints.checkpoints}
          mainRoad={engineRef.current.terrain.mainRoad}
        />
      )}

      {/* Pause Menu */}
      {isPaused && (
        <PauseMenu
          onResume={handleResume}
          onRecover={handleRecover}
          onRestart={handleStartExpedition}
          onOpenSettings={() => setShowSettings(true)}
          onOpenControls={() => setShowControls(true)}
          onExitToMenu={handleExitToMenu}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsMenu
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Controls & Manual Modal */}
      {showControls && <ControlsMenu onClose={() => setShowControls(false)} />}

      {/* Multiplayer Architecture Dialog */}
      {showMultiplayer && <MultiplayerMenu onClose={() => setShowMultiplayer(false)} />}

      {/* Expedition Victory Modal */}
      {showVictory && (
        <VictoryModal
          stats={expeditionStats}
          onContinueFreeRoam={() => {
            setShowVictory(false);
            setMode('freedrive');
          }}
          onRestartExpedition={handleStartExpedition}
          onReturnToTitle={handleExitToMenu}
        />
      )}
    </div>
  );
}
