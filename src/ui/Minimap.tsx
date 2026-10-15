import React, { useState } from 'react';
import { CheckpointData } from '../types/game';
import { RoadPoint } from '../game/Terrain';
import { Compass, Maximize2, Minimize2 } from 'lucide-react';

interface MinimapProps {
  playerX: number;
  playerZ: number;
  playerYaw: number;
  checkpoints: CheckpointData[];
  currentCheckpointIndex: number;
  mainRoad: RoadPoint[];
  mapSize?: number;
}

export const Minimap: React.FC<MinimapProps> = ({
  playerX,
  playerZ,
  playerYaw,
  checkpoints,
  currentCheckpointIndex,
  mainRoad,
  mapSize = 180,
}) => {
  const [isZoomedOut, setIsZoomedOut] = useState(false);

  // In zoomed mode, we view entire 800x800 world (-400 to +400).
  // In local mode, we view a 240x240 area centered on the player.
  const worldSpan = isZoomedOut ? 800 : 260;
  const halfSpan = worldSpan / 2;

  const toMapCoord = (x: number, z: number) => {
    let relX = 0;
    let relZ = 0;

    if (isZoomedOut) {
      relX = (x + 400) / 800;
      relZ = (z + 400) / 800;
    } else {
      relX = (x - (playerX - halfSpan)) / worldSpan;
      relZ = (z - (playerZ - halfSpan)) / worldSpan;
    }

    return {
      cx: Math.max(0, Math.min(mapSize, relX * mapSize)),
      cy: Math.max(0, Math.min(mapSize, relZ * mapSize)),
    };
  };

  // Convert main road points to SVG polyline
  const roadPointsStr = mainRoad
    .map(pt => {
      const { cx, cy } = toMapCoord(pt.x, pt.z);
      return `${cx},${cy}`;
    })
    .join(' ');

  // Player icon position
  const playerCoord = toMapCoord(playerX, playerZ);
  const playerDeg = (playerYaw * 180) / Math.PI + 180;

  return (
    <div className="relative rounded-xl overflow-hidden bg-stone-900/90 border border-white/15 shadow-xl backdrop-blur-md p-2">
      <div className="flex items-center justify-between text-[11px] font-semibold text-stone-300 pb-1.5 px-1 border-b border-white/10">
        <span className="flex items-center gap-1.5 uppercase tracking-wider text-amber-400">
          <Compass className="w-3.5 h-3.5" /> GPS Nav
        </span>
        <button
          onClick={() => setIsZoomedOut(!isZoomedOut)}
          className="text-stone-400 hover:text-white transition-colors p-0.5 rounded cursor-pointer"
          title={isZoomedOut ? 'Zoom In' : 'Full Map'}
        >
          {isZoomedOut ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>

      <div className="relative mt-1.5 rounded-lg overflow-hidden bg-stone-950 border border-stone-800">
        <svg width={mapSize} height={mapSize} className="block">
          {/* River Representation */}
          <path
            d={
              isZoomedOut
                ? `M 0,${mapSize * 0.58} Q ${mapSize * 0.5},${mapSize * 0.55} ${mapSize},${mapSize * 0.62}`
                : `M 0,${toMapCoord(-200, 65).cy} Q ${mapSize * 0.5},${toMapCoord(0, 75).cy} ${mapSize},${toMapCoord(200, 60).cy}`
            }
            stroke="#1e3a5f"
            strokeWidth="7"
            fill="none"
            strokeLinecap="round"
            opacity="0.8"
          />

          {/* Expedition Dirt Trail */}
          <polyline
            points={roadPointsStr}
            fill="none"
            stroke="#a16207"
            strokeWidth="3.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray="4 2"
          />

          {/* Base Camp Marker */}
          {(() => {
            const camp = toMapCoord(-120, 180);
            return (
              <g transform={`translate(${camp.cx}, ${camp.cy})`}>
                <circle r="4.5" fill="#f59e0b" />
                <circle r="2.5" fill="#ffffff" />
              </g>
            );
          })()}

          {/* Summit Marker */}
          {(() => {
            const summit = toMapCoord(-70, -330);
            return (
              <g transform={`translate(${summit.cx}, ${summit.cy})`}>
                <polygon points="0,-6 5,4 -5,4" fill="#ef4444" />
              </g>
            );
          })()}

          {/* Checkpoints */}
          {checkpoints.map((cp, idx) => {
            const pos = toMapCoord(cp.position[0], cp.position[2]);
            const isCompleted = idx < currentCheckpointIndex;
            const isActive = idx === currentCheckpointIndex;
            const color = isCompleted ? '#10b981' : isActive ? '#f59e0b' : '#64748b';

            return (
              <g key={cp.id} transform={`translate(${pos.cx}, ${pos.cy})`}>
                {isActive && (
                  <circle r="8" fill="none" stroke="#f59e0b" strokeWidth="1.5" opacity="0.75" />
                )}
                <circle r={isActive ? 4.5 : 3} fill={color} />
              </g>
            );
          })}

          {/* Player Vehicle Marker (Arrow) */}
          <g
            transform={`translate(${playerCoord.cx}, ${playerCoord.cy}) rotate(${playerDeg})`}
          >
            <polygon points="0,-7 5,6 0,3 -5,6" fill="#38bdf8" stroke="#0284c7" strokeWidth="1" />
          </g>
        </svg>

        {/* Compass Cardinal Heading */}
        <div className="absolute bottom-1 right-1.5 text-[9px] font-mono text-stone-400 bg-stone-900/80 px-1 py-0.5 rounded">
          {Math.round((playerDeg + 360) % 360)}°
        </div>
      </div>
    </div>
  );
};
