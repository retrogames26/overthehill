import React, { useState } from 'react';
import { X, Users, Server, Radio, Copy, Check } from 'lucide-react';

interface MultiplayerMenuProps {
  onClose: () => void;
}

export const MultiplayerMenu: React.FC<MultiplayerMenuProps> = ({ onClose }) => {
  const [callsign, setCallsign] = useState('Trailblazer-01');
  const [roomCode, setRoomCode] = useState('WILD-HORIZON');
  const [copied, setCopied] = useState(false);

  const networkSchema = `{
  "playerId": "${callsign}",
  "vehicleId": "4x4-expedition",
  "position": [-120.0, 15.2, 175.0],
  "rotation": [0.0, 0.65, 0.0, 1.0],
  "velocity": [0.0, 0.0, 0.0],
  "checkpointProgress": 1,
  "surface": "road",
  "timestamp": ${Date.now()}
}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(networkSchema);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 select-none">
      <div className="bg-stone-900 border border-white/20 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-400" />
            <h2 className="text-xl font-black text-white">Multiplayer Convoy Sync</h2>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice */}
        <div className="bg-sky-950/40 border border-sky-500/30 p-3 rounded-xl text-xs text-sky-200 leading-relaxed">
          <strong>Architecture Ready:</strong> Network state schema, client position interpolation, and vehicle serialization hooks are fully partitioned. Single-player mode is prioritized in this build with zero dummy connections.
        </div>

        {/* Player Profile & Lobby */}
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-300 uppercase tracking-wider">Driver Callsign</label>
            <input
              type="text"
              value={callsign}
              onChange={e => setCallsign(e.target.value)}
              className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-300 uppercase tracking-wider">Expedition Room Code</label>
            <input
              type="text"
              value={roomCode}
              onChange={e => setRoomCode(e.target.value.toUpperCase())}
              className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-sm text-white uppercase tracking-wider font-mono focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        {/* Network Packet Schema Preview */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-stone-300 uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-amber-400" /> Network State Broadcast Schema
            </span>
            <button
              onClick={handleCopy}
              className="text-[11px] text-stone-400 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy JSON'}
            </button>
          </div>
          <pre className="bg-stone-950 border border-stone-800 rounded-xl p-3 text-[11px] font-mono text-emerald-400 overflow-x-auto leading-tight">
            {networkSchema}
          </pre>
        </div>

        {/* WebSocket Backend Integration Steps */}
        <div className="bg-stone-950/70 border border-stone-800 rounded-xl p-3 space-y-1 text-xs text-stone-300">
          <div className="font-bold text-stone-200 flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-amber-400" /> WebSocket Relay Setup:
          </div>
          <ol className="list-decimal list-inside space-y-1 text-[11px] text-stone-400">
            <li>Run WebSocket server via Express or `ws` on a persistent relay endpoint.</li>
            <li>Connect client socket using `const ws = new WebSocket(SERVER_URL)`.</li>
            <li>Broadcast player position packet at 20Hz tick rate.</li>
            <li>Interpolate other vehicles using cubic Hermite splines.</li>
          </ol>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
        >
          Return to Menu
        </button>
      </div>
    </div>
  );
};
