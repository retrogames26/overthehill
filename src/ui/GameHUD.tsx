import React, { useState } from 'react';
import { CheckpointData, ExpeditionStats, GameMode, VehicleTelemetry } from '../types/game';
import { CameraMode } from '../game/CameraController';
import { Minimap } from './Minimap';
import { RoadPoint } from '../game/Terrain';
import { 
  Compass, 
  Fuel, 
  ShieldAlert, 
  Camera, 
  RotateCcw, 
  Pause, 
  ChevronUp, 
  ChevronDown, 
  Footprints, 
  Car,
  Flag,
  Gauge
} from 'lucide-react';

interface GameHUDProps {
  telemetry: VehicleTelemetry;
  expeditionStats: ExpeditionStats;
  currentCheckpoint: CheckpointData | null;
  mode: GameMode;
  cameraMode: CameraMode;
  isDriving: boolean;
  interactionPrompt: string | null;
  notification: string | null;
  onRecover: () => void;
  onCameraToggle: () => void;
  onEnterExitVehicle: () => void;
  onPause: () => void;
  onVirtualDrive: (throttle: number, steer: number, handbrake: boolean) => void;
  onVirtualWalk: (forward: number, right: number, run: boolean) => void;
  playerCoords: { x: number; z: number; yaw: number };
  checkpoints: CheckpointData[];
  mainRoad: RoadPoint[];
}

export const GameHUD: React.FC<GameHUDProps> = ({
  telemetry,
  expeditionStats,
  currentCheckpoint,
  mode,
  cameraMode,
  isDriving,
  interactionPrompt,
  notification,
  onRecover,
  onCameraToggle,
  onEnterExitVehicle,
  onPause,
  onVirtualDrive,
  onVirtualWalk,
  playerCoords,
  checkpoints,
  mainRoad,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showTouchControls, setShowTouchControls] = useState(false);

  // Surface label mapper
  const surfaceLabels: Record<string, { label: string; color: string }> = {
    road: { label: 'DIRT TRAIL', color: 'text-amber-400' },
    grass: { label: 'MEADOW', color: 'text-emerald-400' },
    mud: { label: 'MUD & SILT', color: 'text-yellow-600' },
    water: { label: 'SHALLOW RIVER', color: 'text-cyan-400' },
    rock: { label: 'ALPINE ROCK', color: 'text-stone-400' },
  };

  const currentSurface = surfaceLabels[telemetry.surface] || { label: 'OFF-ROAD', color: 'text-stone-300' };

  // RPM percentage for tachometer arc (800 to 6500)
  const rpmPercent = Math.min(100, Math.max(0, ((telemetry.rpm - 800) / 5700) * 100));

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-10 flex flex-col justify-between p-4">
      {/* 1. TOP HEADER ROW */}
      <div className="flex items-start justify-between w-full pointer-events-auto gap-4">
        {/* Left: Expedition Objective & Progress */}
        <div className="flex flex-col gap-2 max-w-sm">
          {mode === 'expedition' && (
            <div className="bg-stone-900/90 border border-white/15 backdrop-blur-md rounded-xl p-3 shadow-xl">
              <div className="flex items-center justify-between text-xs font-semibold text-stone-300 pb-1.5 border-b border-white/10">
                <span className="flex items-center gap-1.5 text-amber-400 uppercase tracking-wide">
                  <Flag className="w-3.5 h-3.5" /> Checkpoint {expeditionStats.currentCheckpointIndex + 1} / {expeditionStats.totalCheckpoints}
                </span>
                <span className="font-gauge text-stone-300 tabular-nums">
                  {Math.floor(expeditionStats.elapsedTime / 60)}:
                  {(Math.floor(expeditionStats.elapsedTime) % 60).toString().padStart(2, '0')}
                </span>
              </div>

              {currentCheckpoint ? (
                <div className="mt-2">
                  <div className="text-sm font-bold text-white tracking-tight">{currentCheckpoint.name}</div>
                  <div className="text-xs text-stone-400 mt-0.5 leading-snug">{currentCheckpoint.description}</div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-stone-300 font-medium">
                    <span>Distance to target:</span>
                    <span className="font-gauge text-amber-400 font-semibold">{expeditionStats.distanceToNext} m</span>
                  </div>
                </div>
              ) : (
                <div className="mt-2 text-xs text-emerald-400 font-semibold">
                  All Checkpoints Cleared! Proceed to Summit.
                </div>
              )}
            </div>
          )}

          {mode === 'freedrive' && (
            <div className="bg-stone-900/80 border border-white/15 backdrop-blur-md rounded-xl px-3 py-2 text-xs font-semibold text-stone-300 shadow-lg flex items-center gap-2">
              <Compass className="w-4 h-4 text-emerald-400" />
              <span>FREE EXPLORATION MODE · NO TIME LIMITS</span>
            </div>
          )}

          {/* Banner Notification (when passing checkpoints) */}
          {notification && (
            <div className="bg-amber-500/95 text-stone-950 font-bold text-xs uppercase tracking-wider py-1.5 px-3 rounded-lg shadow-lg flex items-center gap-2 animate-bounce">
              <Flag className="w-4 h-4" />
              {notification}
            </div>
          )}
        </div>

        {/* Center: On-foot Interaction Prompt */}
        {interactionPrompt && (
          <div className="bg-stone-950/90 border-2 border-amber-500 px-5 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md text-center pointer-events-auto animate-pulse">
            <span className="text-sm font-extrabold text-amber-400 tracking-wide uppercase">
              {interactionPrompt}
            </span>
          </div>
        )}

        {/* Right: GPS Minimap & System Actions */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={onCameraToggle}
              className="bg-stone-900/80 hover:bg-stone-800 text-stone-200 border border-white/15 p-2 rounded-lg backdrop-blur-md transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-medium"
              title="Change Camera View (C)"
            >
              <Camera className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline capitalize">{cameraMode} Cam</span>
            </button>

            <button
              onClick={onRecover}
              className="bg-stone-900/80 hover:bg-stone-800 text-stone-200 border border-white/15 p-2 rounded-lg backdrop-blur-md transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-medium"
              title="Recover Vehicle (R)"
            >
              <RotateCcw className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Recover (R)</span>
            </button>

            <button
              onClick={onEnterExitVehicle}
              className="bg-stone-900/80 hover:bg-stone-800 text-stone-200 border border-white/15 p-2 rounded-lg backdrop-blur-md transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-medium"
              title="Enter / Exit (E)"
            >
              {isDriving ? <Footprints className="w-4 h-4 text-amber-400" /> : <Car className="w-4 h-4 text-amber-400" />}
              <span className="hidden sm:inline">{isDriving ? 'Walk' : 'Drive'} (E)</span>
            </button>

            <button
              onClick={onPause}
              className="bg-stone-900/80 hover:bg-stone-800 text-stone-200 border border-white/15 p-2 rounded-lg backdrop-blur-md transition-colors cursor-pointer"
              title="Pause (Esc)"
            >
              <Pause className="w-4 h-4" />
            </button>
          </div>

          <Minimap
            playerX={playerCoords.x}
            playerZ={playerCoords.z}
            playerYaw={playerCoords.yaw}
            checkpoints={checkpoints}
            currentCheckpointIndex={expeditionStats.currentCheckpointIndex}
            mainRoad={mainRoad}
          />
        </div>
      </div>

      {/* 2. ON-SCREEN TOUCH CONTROLS (OPTIONAL FOR TOUCH DEVICES) */}
      <div className="flex justify-between items-end w-full px-2 pointer-events-auto">
        <button
          onClick={() => setShowTouchControls(!showTouchControls)}
          className="bg-stone-900/70 hover:bg-stone-800 text-stone-400 hover:text-white text-[11px] px-2 py-1 rounded border border-white/10 backdrop-blur cursor-pointer"
        >
          {showTouchControls ? 'Hide Touch Controls' : 'Show Touch Controls'}
        </button>

        {showTouchControls && (
          <div className="flex justify-between w-full max-w-xl mx-auto my-2">
            {/* Steering / Move Left-Right */}
            <div className="flex gap-2">
              <button
                onMouseDown={() => isDriving ? onVirtualDrive(telemetry.throttle, -1, false) : onVirtualWalk(0, -1, false)}
                onMouseUp={() => isDriving ? onVirtualDrive(telemetry.throttle, 0, false) : onVirtualWalk(0, 0, false)}
                onTouchStart={() => isDriving ? onVirtualDrive(telemetry.throttle, -1, false) : onVirtualWalk(0, -1, false)}
                onTouchEnd={() => isDriving ? onVirtualDrive(telemetry.throttle, 0, false) : onVirtualWalk(0, 0, false)}
                className="w-14 h-14 bg-stone-900/80 active:bg-amber-600 rounded-xl border border-white/20 text-white font-bold flex items-center justify-center text-lg active:scale-95"
              >
                ◀
              </button>
              <button
                onMouseDown={() => isDriving ? onVirtualDrive(telemetry.throttle, 1, false) : onVirtualWalk(0, 1, false)}
                onMouseUp={() => isDriving ? onVirtualDrive(telemetry.throttle, 0, false) : onVirtualWalk(0, 0, false)}
                onTouchStart={() => isDriving ? onVirtualDrive(telemetry.throttle, 1, false) : onVirtualWalk(0, 1, false)}
                onTouchEnd={() => isDriving ? onVirtualDrive(telemetry.throttle, 0, false) : onVirtualWalk(0, 0, false)}
                className="w-14 h-14 bg-stone-900/80 active:bg-amber-600 rounded-xl border border-white/20 text-white font-bold flex items-center justify-center text-lg active:scale-95"
              >
                ▶
              </button>
            </div>

            {/* Throttle / Brake / Jump */}
            <div className="flex gap-2">
              <button
                onMouseDown={() => isDriving ? onVirtualDrive(-1, telemetry.steering, false) : onVirtualWalk(-1, 0, false)}
                onMouseUp={() => isDriving ? onVirtualDrive(0, telemetry.steering, false) : onVirtualWalk(0, 0, false)}
                onTouchStart={() => isDriving ? onVirtualDrive(-1, telemetry.steering, false) : onVirtualWalk(-1, 0, false)}
                onTouchEnd={() => isDriving ? onVirtualDrive(0, telemetry.steering, false) : onVirtualWalk(0, 0, false)}
                className="w-14 h-14 bg-rose-950/80 active:bg-rose-600 rounded-xl border border-rose-500/40 text-white font-bold flex items-center justify-center text-sm active:scale-95"
              >
                BRAKE
              </button>
              <button
                onMouseDown={() => isDriving ? onVirtualDrive(1, telemetry.steering, false) : onVirtualWalk(1, 0, false)}
                onMouseUp={() => isDriving ? onVirtualDrive(0, telemetry.steering, false) : onVirtualWalk(0, 0, false)}
                onTouchStart={() => isDriving ? onVirtualDrive(1, telemetry.steering, false) : onVirtualWalk(1, 0, false)}
                onTouchEnd={() => isDriving ? onVirtualDrive(0, telemetry.steering, false) : onVirtualWalk(0, 0, false)}
                className="w-14 h-14 bg-emerald-950/80 active:bg-emerald-600 rounded-xl border border-emerald-500/40 text-white font-bold flex items-center justify-center text-sm active:scale-95"
              >
                GAS
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. BOTTOM ERGONOMIC TELEMETRY DOCK */}
      <div className="flex flex-col items-center pointer-events-auto">
        {/* Toggle Collapse Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="bg-stone-900/90 hover:bg-stone-800 text-stone-400 hover:text-white px-3 py-1 rounded-t-lg border-t border-x border-white/15 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer mb-[-1px] z-10"
        >
          {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{isCollapsed ? 'Show Telemetry (H)' : 'Cinema Mode'}</span>
        </button>

        {!isCollapsed && (
          <div className="w-full max-w-3xl bg-stone-900/95 border border-white/15 rounded-2xl shadow-2xl backdrop-blur-md p-3.5 flex flex-wrap items-center justify-between gap-4">
            {/* Speedometer & Gear */}
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1">
                  <Gauge className="w-3 h-3 text-amber-400" /> Velocity
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-gauge text-4xl font-black text-white tabular-nums tracking-tighter">
                    {telemetry.speedKmh}
                  </span>
                  <span className="text-xs font-semibold text-stone-400">KM/H</span>
                </div>
              </div>

              {/* Transmission Gear Pill */}
              <div className="flex flex-col items-center justify-center bg-stone-950 border border-stone-800 rounded-xl px-3 py-1.5">
                <span className="text-[9px] font-bold text-stone-500 uppercase">Gear</span>
                <span className="font-gauge text-xl font-black text-amber-400">
                  {telemetry.gear}
                </span>
              </div>
            </div>

            {/* Tachometer RPM & Surface Grip */}
            <div className="flex-1 min-w-[160px] flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-stone-300">
                <span className="flex items-center gap-1">
                  Surface: <span className={`font-bold ${currentSurface.color}`}>{currentSurface.label}</span>
                </span>
                <span className="font-gauge text-stone-400 tabular-nums">
                  {telemetry.rpm} <span className="text-[9px]">RPM</span>
                </span>
              </div>

              {/* RPM Bar */}
              <div className="w-full h-2.5 bg-stone-950 rounded-full overflow-hidden border border-stone-800 flex">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 transition-all duration-75"
                  style={{ width: `${rpmPercent}%` }}
                />
              </div>

              {/* Pitch & Roll Clinometer Readings */}
              <div className="flex justify-between text-[10px] text-stone-400 font-mono">
                <span>PITCH: {Math.round(telemetry.pitch * 57.3)}°</span>
                <span>ROLL: {Math.round(telemetry.roll * 57.3)}°</span>
                <span>{telemetry.isGrounded ? '4WD ENGAGED' : 'AIRBORNE'}</span>
              </div>
            </div>

            {/* Fuel & Vehicle Condition */}
            <div className="flex items-center gap-3">
              {/* Fuel Level */}
              <div className="flex items-center gap-2 bg-stone-950/70 border border-stone-800 rounded-xl px-3 py-1.5">
                <Fuel className="w-4 h-4 text-amber-400" />
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-stone-400 uppercase">Fuel</span>
                  <span className="font-gauge text-xs font-bold text-stone-200 tabular-nums">
                    {telemetry.fuel}%
                  </span>
                </div>
              </div>

              {/* Damage */}
              <div className="flex items-center gap-2 bg-stone-950/70 border border-stone-800 rounded-xl px-3 py-1.5">
                <ShieldAlert className={`w-4 h-4 ${telemetry.damage > 50 ? 'text-rose-500' : 'text-stone-400'}`} />
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-stone-400 uppercase">Damage</span>
                  <span className={`font-gauge text-xs font-bold tabular-nums ${telemetry.damage > 50 ? 'text-rose-400' : 'text-stone-200'}`}>
                    {telemetry.damage}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
