import React, { useState } from 'react';
import { Play, Compass, Users, Settings as SettingsIcon, HelpCircle, Award, Palette } from 'lucide-react';

interface MainMenuProps {
  onStartExpedition: () => void;
  onStartFreeDrive: () => void;
  onOpenMultiplayer: () => void;
  onOpenSettings: () => void;
  onOpenControls: () => void;
  onSelectVehicleColor: (hex: number) => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onStartExpedition,
  onStartFreeDrive,
  onOpenMultiplayer,
  onOpenSettings,
  onOpenControls,
  onSelectVehicleColor,
}) => {
  const [selectedColor, setSelectedColor] = useState(0xcc551f);
  const [showCredits, setShowCredits] = useState(false);

  const colors = [
    { name: 'Expedition Ochre', hex: 0xcc551f, bg: 'bg-[#cc551f]' },
    { name: 'Alpine Frost', hex: 0xe2e8f0, bg: 'bg-slate-200' },
    { name: 'Forest Olive', hex: 0x2d4a3e, bg: 'bg-[#2d4a3e]' },
    { name: 'Cobalt River', hex: 0x1d4ed8, bg: 'bg-blue-700' },
    { name: 'Sandstone Tan', hex: 0xa88350, bg: 'bg-[#a88350]' },
    { name: 'Granite Obsidian', hex: 0x262626, bg: 'bg-stone-800' },
  ];

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-between p-8 sm:p-12 pointer-events-none select-none bg-gradient-to-r from-stone-950/80 via-stone-950/40 to-transparent">
      {/* Top Brand Header */}
      <div className="flex items-center justify-between pointer-events-auto">
        <div className="flex flex-col">
          <div className="text-xs uppercase tracking-[0.3em] font-extrabold text-amber-500 mb-1">
            Wilderness Off-Road Simulator
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white font-sans drop-shadow-md">
            TRAILBOUND
          </h1>
          <div className="text-lg sm:text-xl font-bold tracking-wider text-stone-300 font-sans mt-[-2px] uppercase">
            Wild Horizons
          </div>
        </div>

        {/* Vehicle Customizer Widget */}
        <div className="hidden sm:flex flex-col items-end gap-2 bg-stone-950/70 border border-white/15 p-3 rounded-2xl backdrop-blur-md">
          <span className="text-[11px] font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-amber-400" /> 4x4 Livery
          </span>
          <div className="flex gap-2">
            {colors.map(col => (
              <button
                key={col.hex}
                onClick={() => {
                  setSelectedColor(col.hex);
                  onSelectVehicleColor(col.hex);
                }}
                className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${col.bg} ${
                  selectedColor === col.hex ? 'border-amber-400 scale-125 shadow-md' : 'border-stone-600 hover:scale-110'
                }`}
                title={col.name}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Center / Left Main Navigation */}
      <div className="flex flex-col gap-3 max-w-sm pointer-events-auto my-auto">
        <button
          onClick={onStartExpedition}
          className="group relative flex items-center justify-between px-6 py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-base tracking-wider uppercase transition-all shadow-xl hover:translate-x-1 cursor-pointer active:scale-98"
        >
          <span className="flex items-center gap-3">
            <Play className="w-5 h-5 fill-current" />
            Play Expedition
          </span>
          <span className="text-xs font-semibold opacity-75">6 Checkpoints</span>
        </button>

        <button
          onClick={onStartFreeDrive}
          className="group flex items-center justify-between px-6 py-3.5 rounded-xl bg-stone-900/80 hover:bg-stone-800/90 text-stone-100 font-bold text-sm tracking-wide uppercase border border-white/15 transition-all backdrop-blur-md hover:translate-x-1 cursor-pointer active:scale-98"
        >
          <span className="flex items-center gap-3">
            <Compass className="w-4 h-4 text-emerald-400" />
            Free Drive
          </span>
          <span className="text-xs text-stone-400 font-normal">Open Map</span>
        </button>

        <button
          onClick={onOpenMultiplayer}
          className="group flex items-center justify-between px-6 py-3 rounded-xl bg-stone-900/80 hover:bg-stone-800/90 text-stone-100 font-bold text-sm tracking-wide uppercase border border-white/15 transition-all backdrop-blur-md hover:translate-x-1 cursor-pointer active:scale-98"
        >
          <span className="flex items-center gap-3">
            <Users className="w-4 h-4 text-sky-400" />
            Multiplayer
          </span>
          <span className="text-xs text-stone-400 font-normal">Convoy Sync</span>
        </button>

        <div className="flex gap-2">
          <button
            onClick={onOpenControls}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900/80 hover:bg-stone-800 text-stone-300 hover:text-white font-semibold text-xs tracking-wider uppercase border border-white/10 transition-colors backdrop-blur-md cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
            Controls
          </button>

          <button
            onClick={onOpenSettings}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900/80 hover:bg-stone-800 text-stone-300 hover:text-white font-semibold text-xs tracking-wider uppercase border border-white/10 transition-colors backdrop-blur-md cursor-pointer"
          >
            <SettingsIcon className="w-4 h-4 text-stone-300" />
            Settings
          </button>
        </div>

        <button
          onClick={() => setShowCredits(!showCredits)}
          className="text-left text-xs text-stone-400 hover:text-stone-200 transition-colors pt-1 px-1 cursor-pointer flex items-center gap-1.5"
        >
          <Award className="w-3.5 h-3.5" />
          <span>About & Credits</span>
        </button>
      </div>

      {/* Credits Modal */}
      {showCredits && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 pointer-events-auto">
          <div className="bg-stone-900 border border-white/20 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">Trailbound: Wild Horizons</h3>
            <p className="text-sm text-stone-300 leading-relaxed mb-4">
              An original 3D off-road exploration and expedition driving experience created with React, Three.js, Web Audio API, and custom raycast vehicle physics.
            </p>
            <div className="text-xs text-stone-400 space-y-1 mb-6 border-t border-stone-800 pt-3">
              <div>• 4x4 Raycast Suspension & Longitudinal/Lateral Slip Model</div>
              <div>• 800x800 Unit Procedural Open Terrain & River System</div>
              <div>• 6 Sequential Mountain Expedition Checkpoints</div>
              <div>• On-Foot Explorer Character Integration</div>
              <div>• 100% Procedural Web Audio Engine & Sound Synthesis</div>
            </div>
            <button
              onClick={() => setShowCredits(false)}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-sm transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Bottom Footer Details */}
      <div className="flex items-center justify-between text-xs text-stone-400 pointer-events-auto">
        <div className="flex items-center gap-3">
          <span>Terrain: 800m Alpine Basin</span>
          <span>·</span>
          <span>Physics: 4WD Raycast Suspension</span>
          <span>·</span>
          <span>Audio: Procedural Synth</span>
        </div>
        <div className="hidden sm:block text-stone-400">
          Press <kbd className="px-1.5 py-0.5 bg-stone-800 border border-stone-700 rounded text-stone-300 font-mono">W</kbd> to accelerate · <kbd className="px-1.5 py-0.5 bg-stone-800 border border-stone-700 rounded text-stone-300 font-mono">C</kbd> Camera
        </div>
      </div>
    </div>
  );
};
