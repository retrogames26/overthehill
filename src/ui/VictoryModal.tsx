import React from 'react';
import { Trophy, Compass, RotateCcw, Home, Clock, Gauge, Flag } from 'lucide-react';
import { ExpeditionStats } from '../types/game';

interface VictoryModalProps {
  stats: ExpeditionStats;
  onContinueFreeRoam: () => void;
  onRestartExpedition: () => void;
  onReturnToTitle: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  stats,
  onContinueFreeRoam,
  onRestartExpedition,
  onReturnToTitle,
}) => {
  const minutes = Math.floor(stats.elapsedTime / 60);
  const seconds = (Math.floor(stats.elapsedTime) % 60).toString().padStart(2, '0');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 select-none animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-stone-900 border border-amber-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl flex flex-col items-center text-center gap-5">
        {/* Trophy Badge */}
        <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center shadow-lg">
          <Trophy className="w-8 h-8 text-amber-400" />
        </div>

        <div>
          <div className="text-xs uppercase tracking-[0.25em] font-extrabold text-amber-400">
            Summit Lookout Conquered
          </div>
          <h2 className="text-3xl font-black text-white mt-1">Expedition Accomplished!</h2>
          <p className="text-xs text-stone-400 mt-1 max-w-xs mx-auto">
            You navigated through river rapids, forest canyons, and alpine cliffs to reach the mountain summit.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 w-full">
          <div className="bg-stone-950/80 border border-stone-800 rounded-2xl p-3 flex flex-col items-center">
            <Clock className="w-4 h-4 text-amber-400 mb-1" />
            <span className="text-[10px] uppercase font-bold text-stone-400">Time</span>
            <span className="font-gauge text-lg font-bold text-white tabular-nums">
              {minutes}:{seconds}
            </span>
          </div>

          <div className="bg-stone-950/80 border border-stone-800 rounded-2xl p-3 flex flex-col items-center">
            <Flag className="w-4 h-4 text-emerald-400 mb-1" />
            <span className="text-[10px] uppercase font-bold text-stone-400">Gates</span>
            <span className="font-gauge text-lg font-bold text-white">
              {stats.totalCheckpoints} / {stats.totalCheckpoints}
            </span>
          </div>

          <div className="bg-stone-950/80 border border-stone-800 rounded-2xl p-3 flex flex-col items-center">
            <Gauge className="w-4 h-4 text-sky-400 mb-1" />
            <span className="text-[10px] uppercase font-bold text-stone-400">Top Speed</span>
            <span className="font-gauge text-lg font-bold text-white tabular-nums">
              {stats.topSpeed} <span className="text-[9px]">KM/H</span>
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5 w-full mt-2">
          <button
            onClick={onContinueFreeRoam}
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg cursor-pointer"
          >
            <Compass className="w-4 h-4" />
            Continue Free Exploration
          </button>

          <button
            onClick={onRestartExpedition}
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-stone-800 hover:bg-stone-700 text-white font-semibold text-xs uppercase tracking-wider rounded-xl border border-white/10 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-amber-400" />
            Retry Expedition Route
          </button>

          <button
            onClick={onReturnToTitle}
            className="flex items-center justify-center gap-2 w-full py-2 text-stone-400 hover:text-stone-200 font-semibold text-xs transition-colors cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            Return to Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};
