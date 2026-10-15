import React from 'react';
import { Play, RotateCcw, RefreshCw, Settings, HelpCircle, LogOut } from 'lucide-react';

interface PauseMenuProps {
  onResume: () => void;
  onRecover: () => void;
  onRestart: () => void;
  onOpenSettings: () => void;
  onOpenControls: () => void;
  onExitToMenu: () => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  onResume,
  onRecover,
  onRestart,
  onOpenSettings,
  onOpenControls,
  onExitToMenu,
}) => {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 select-none">
      <div className="bg-stone-900 border border-white/20 rounded-2xl p-6 sm:p-8 max-w-sm w-full shadow-2xl flex flex-col gap-3">
        <div className="text-center pb-3 border-b border-stone-800">
          <div className="text-xs uppercase tracking-widest font-extrabold text-amber-500">Expedition Paused</div>
          <h2 className="text-2xl font-black text-white mt-1">Trailbound</h2>
        </div>

        <button
          onClick={onResume}
          className="flex items-center justify-center gap-2.5 w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-sm uppercase tracking-wider rounded-xl transition-all shadow-lg cursor-pointer"
        >
          <Play className="w-4 h-4 fill-current" />
          Resume
        </button>

        <button
          onClick={onRecover}
          className="flex items-center justify-center gap-2.5 w-full py-2.5 bg-stone-800 hover:bg-stone-700 text-white font-semibold text-xs uppercase tracking-wider rounded-xl border border-white/10 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4 text-amber-400" />
          Recover Vehicle (R)
        </button>

        <button
          onClick={onRestart}
          className="flex items-center justify-center gap-2.5 w-full py-2.5 bg-stone-800 hover:bg-stone-700 text-white font-semibold text-xs uppercase tracking-wider rounded-xl border border-white/10 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4 text-sky-400" />
          Restart Expedition
        </button>

        <div className="grid grid-cols-2 gap-2 my-1">
          <button
            onClick={onOpenControls}
            className="flex items-center justify-center gap-2 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white font-semibold text-xs uppercase tracking-wider rounded-xl border border-white/10 transition-colors cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
            Controls
          </button>
          <button
            onClick={onOpenSettings}
            className="flex items-center justify-center gap-2 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white font-semibold text-xs uppercase tracking-wider rounded-xl border border-white/10 transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4 text-stone-400" />
            Settings
          </button>
        </div>

        <button
          onClick={onExitToMenu}
          className="flex items-center justify-center gap-2.5 w-full py-2.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 font-semibold text-xs uppercase tracking-wider rounded-xl border border-rose-500/20 transition-colors cursor-pointer mt-2"
        >
          <LogOut className="w-4 h-4" />
          Exit to Main Menu
        </button>
      </div>
    </div>
  );
};
