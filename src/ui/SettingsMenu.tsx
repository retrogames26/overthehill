import React from 'react';
import { GameSettings } from '../types/game';
import { Volume2, Monitor, Eye, X } from 'lucide-react';

interface SettingsMenuProps {
  settings: GameSettings;
  onUpdateSettings: (newSettings: GameSettings) => void;
  onClose: () => void;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({
  settings,
  onUpdateSettings,
  onClose,
}) => {
  const update = (partial: Partial<GameSettings>) => {
    onUpdateSettings({ ...settings, ...partial });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 select-none">
      <div className="bg-stone-900 border border-white/20 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl flex flex-col gap-5">
        <div className="flex items-center justify-between pb-3 border-b border-stone-800">
          <div className="flex items-center gap-2 text-white font-black text-lg">
            <span>Settings</span>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Graphics Quality */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
            <Monitor className="w-4 h-4 text-amber-400" /> Graphics Quality
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['low', 'medium', 'high'] as const).map(q => (
              <button
                key={q}
                onClick={() => update({ graphicsQuality: q })}
                className={`py-2 text-xs font-bold uppercase rounded-xl border transition-all cursor-pointer ${
                  settings.graphicsQuality === q
                    ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-md'
                    : 'bg-stone-800/80 text-stone-300 border-white/10 hover:bg-stone-700'
                }`}
              >
                {q}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-stone-400">
            {settings.graphicsQuality === 'high' && 'Soft shadow mapping, high resolution, full foliage density.'}
            {settings.graphicsQuality === 'medium' && 'Balanced performance, crisp shadows, standard resolution.'}
            {settings.graphicsQuality === 'low' && 'Optimized for mobile / lower-end hardware with shadows disabled.'}
          </p>
        </div>

        {/* 2. Audio Volumes */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
            <Volume2 className="w-4 h-4 text-amber-400" /> Audio Volumes
          </label>

          <div className="space-y-2 text-xs text-stone-300">
            <div className="flex justify-between">
              <span>Master Volume</span>
              <span className="font-mono text-stone-400">{Math.round(settings.masterVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.masterVolume}
              onChange={e => update({ masterVolume: parseFloat(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer"
            />

            <div className="flex justify-between pt-1">
              <span>Engine Rumble</span>
              <span className="font-mono text-stone-400">{Math.round(settings.engineVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.engineVolume}
              onChange={e => update({ engineVolume: parseFloat(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer"
            />

            <div className="flex justify-between pt-1">
              <span>SFX & Environment</span>
              <span className="font-mono text-stone-400">{Math.round(settings.sfxVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.sfxVolume}
              onChange={e => update({ sfxVolume: parseFloat(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>
        </div>

        {/* 3. Camera Sensitivity */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-bold text-stone-300 uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-amber-400" /> Mouse Look Sensitivity
            </span>
            <span className="font-mono text-stone-400">{settings.mouseSensitivity.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min="0.4"
            max="2.5"
            step="0.1"
            value={settings.mouseSensitivity}
            onChange={e => update({ mouseSensitivity: parseFloat(e.target.value) })}
            className="w-full accent-amber-500 cursor-pointer"
          />
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer mt-2"
        >
          Save & Back
        </button>
      </div>
    </div>
  );
};
