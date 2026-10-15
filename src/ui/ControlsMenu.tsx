import React from 'react';
import { X, Car, Footprints, Lightbulb } from 'lucide-react';

interface ControlsMenuProps {
  onClose: () => void;
}

export const ControlsMenu: React.FC<ControlsMenuProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 select-none">
      <div className="bg-stone-900 border border-white/20 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-stone-800">
          <h2 className="text-xl font-black text-white">Controls & Expedition Manual</h2>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Driving Controls */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <Car className="w-4 h-4" /> 4x4 Off-Road Driving
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-stone-950/80 p-2.5 rounded-xl border border-stone-800 flex justify-between items-center">
              <span className="text-stone-300">Accelerate</span>
              <kbd className="px-2 py-1 bg-stone-800 rounded font-mono text-amber-300 font-bold">W / ↑</kbd>
            </div>
            <div className="bg-stone-950/80 p-2.5 rounded-xl border border-stone-800 flex justify-between items-center">
              <span className="text-stone-300">Brake / Reverse</span>
              <kbd className="px-2 py-1 bg-stone-800 rounded font-mono text-amber-300 font-bold">S / ↓</kbd>
            </div>
            <div className="bg-stone-950/80 p-2.5 rounded-xl border border-stone-800 flex justify-between items-center">
              <span className="text-stone-300">Steer Left / Right</span>
              <kbd className="px-2 py-1 bg-stone-800 rounded font-mono text-amber-300 font-bold">A / D / ← →</kbd>
            </div>
            <div className="bg-stone-950/80 p-2.5 rounded-xl border border-stone-800 flex justify-between items-center">
              <span className="text-stone-300">Emergency Handbrake</span>
              <kbd className="px-2 py-1 bg-stone-800 rounded font-mono text-amber-300 font-bold">Space</kbd>
            </div>
            <div className="bg-stone-950/80 p-2.5 rounded-xl border border-stone-800 flex justify-between items-center">
              <span className="text-stone-300">Recover to Safe Trail</span>
              <kbd className="px-2 py-1 bg-stone-800 rounded font-mono text-amber-300 font-bold">R</kbd>
            </div>
            <div className="bg-stone-950/80 p-2.5 rounded-xl border border-stone-800 flex justify-between items-center">
              <span className="text-stone-300">Switch Camera View</span>
              <kbd className="px-2 py-1 bg-stone-800 rounded font-mono text-amber-300 font-bold">C</kbd>
            </div>
            <div className="bg-stone-950/80 p-2.5 rounded-xl border border-stone-800 flex justify-between items-center">
              <span className="text-stone-300">Exit Vehicle to Walk</span>
              <kbd className="px-2 py-1 bg-stone-800 rounded font-mono text-amber-300 font-bold">E</kbd>
            </div>
            <div className="bg-stone-950/80 p-2.5 rounded-xl border border-stone-800 flex justify-between items-center">
              <span className="text-stone-300">Free Look / Orbit</span>
              <span className="px-2 py-1 bg-stone-800 rounded font-mono text-amber-300 font-bold text-[11px]">Mouse Drag</span>
            </div>
          </div>
        </div>

        {/* On-Foot Walking Controls */}
        <div className="space-y-2 pt-2 border-t border-stone-800">
          <div className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
            <Footprints className="w-4 h-4" /> On-Foot Explorer
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-stone-950/80 p-2.5 rounded-xl border border-stone-800 flex justify-between items-center">
              <span className="text-stone-300">Walk Direction</span>
              <kbd className="px-2 py-1 bg-stone-800 rounded font-mono text-sky-300 font-bold">W A S D</kbd>
            </div>
            <div className="bg-stone-950/80 p-2.5 rounded-xl border border-stone-800 flex justify-between items-center">
              <span className="text-stone-300">Sprint / Run</span>
              <kbd className="px-2 py-1 bg-stone-800 rounded font-mono text-sky-300 font-bold">Shift</kbd>
            </div>
            <div className="bg-stone-950/80 p-2.5 rounded-xl border border-stone-800 flex justify-between items-center">
              <span className="text-stone-300">Jump Obstacles</span>
              <kbd className="px-2 py-1 bg-stone-800 rounded font-mono text-sky-300 font-bold">Space</kbd>
            </div>
            <div className="bg-stone-950/80 p-2.5 rounded-xl border border-stone-800 flex justify-between items-center">
              <span className="text-stone-300">Enter Vehicle (near door)</span>
              <kbd className="px-2 py-1 bg-stone-800 rounded font-mono text-sky-300 font-bold">E</kbd>
            </div>
          </div>
        </div>

        {/* Off-Road Expedition Tips */}
        <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl space-y-1 text-xs text-amber-200">
          <div className="font-bold flex items-center gap-1.5">
            <Lightbulb className="w-4 h-4 text-amber-400" /> Expedition Pro-Tips:
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-stone-300 text-[11px] leading-relaxed">
            <li><strong>Steep Hill Climbing:</strong> Maintain momentum before initiating the ascent; feather throttle on steep grades.</li>
            <li><strong>Mud & Silt:</strong> Steering is less responsive in mud; brake gently to avoid loss of traction.</li>
            <li><strong>River Crossing:</strong> Deep water produces hydrodynamic drag; either cross slowly or take the timber log bridge!</li>
          </ul>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
        >
          Got It
        </button>
      </div>
    </div>
  );
};
