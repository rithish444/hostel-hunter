import React, { useState } from 'react';
import { useGame } from '../context/GameContext.js';
import { QrCode, Radio, Users, Crosshair, Zap, MessageSquare } from 'lucide-react';
import { calculateDistanceMeters } from '../../shared/geoUtils.js';

interface HunterHUDProps {
  onOpenScanner: () => void;
  onOpenChat: () => void;
}

export const HunterHUD: React.FC<HunterHUDProps> = ({ onOpenScanner, onOpenChat }) => {
  const { gameState, player, activateRadarPulse, catchPlayer } = useGame();
  const [taggingId, setTaggingId] = useState<string | null>(null);

  if (!gameState || !player) return null;

  // Filter alive targets who might be within physical tag proximity (< 15m on same floor)
  const nearbyCandidates = gameState.players.filter((p) => {
    if (p.id === player.id || p.status !== 'alive' || p.role === 'hunter') return false;
    if (!p.location || !player.location) return false;
    if (p.location.floor !== player.location.floor) return false;
    const dist = calculateDistanceMeters(player.location, p.location);
    return dist <= 15;
  });

  const handleQuickTag = async (targetId: string) => {
    setTaggingId(targetId);
    await catchPlayer('proximity_tag', undefined, targetId);
    setTaggingId(null);
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 z-[450] bg-slate-950/90 border-t border-red-900/60 p-3 safe-bottom backdrop-blur-xl">
      <div className="max-w-md mx-auto flex flex-col gap-2.5">
        {/* Hunter Status Strip */}
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-1.5 text-red-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            HUNTER SQUADRON ACTIVE
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span>
              Remaining Crew: <b className="text-cyan-400 font-bold">{gameState.stats.totalCrewmates - gameState.stats.caughtCrewmates}</b>
            </span>
          </div>
        </div>

        {/* Nearby Targets Quick-Tag Alert (if within 15m on same floor) */}
        {nearbyCandidates.length > 0 && (
          <div className="bg-red-950/80 border border-red-500/80 p-2 rounded-xl flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-red-400 animate-spin" />
              <div className="text-xs">
                <span className="font-bold text-red-200">TARGET CORNERED!</span>
                <span className="text-[10px] text-red-300 ml-1">
                  ({nearbyCandidates.length} within 15m on Floor {player.location?.floor})
                </span>
              </div>
            </div>
            {nearbyCandidates.map((c) => (
              <button
                key={c.id}
                onClick={() => handleQuickTag(c.id)}
                disabled={taggingId === c.id}
                className="bg-red-600 hover:bg-red-500 active:scale-95 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-lg border border-red-300 transition"
              >
                {taggingId === c.id ? 'TAGGING...' : `TAG ${c.name.slice(0, 8)}`}
              </button>
            ))}
          </div>
        )}

        {/* Main Action Bar */}
        <div className="grid grid-cols-3 gap-2">
          {/* Scan Target QR Code */}
          <button
            onClick={onOpenScanner}
            className="flex flex-col items-center justify-center gap-1 py-2.5 px-2 bg-gradient-to-b from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 active:scale-95 text-white rounded-xl shadow-lg shadow-red-950/80 border border-red-400 transition"
          >
            <QrCode className="w-5 h-5 text-red-100" />
            <span className="text-[11px] font-bold tracking-tight">SCAN CATCH QR</span>
          </button>

          {/* Radar Pulse Power-Up */}
          <button
            onClick={() => activateRadarPulse()}
            disabled={player.radarPulsesLeft <= 0}
            className={`flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-xl shadow-lg border transition ${
              player.radarPulsesLeft > 0
                ? 'bg-gradient-to-b from-amber-600 to-amber-800 hover:from-amber-500 hover:to-amber-700 active:scale-95 text-white border-amber-300 shadow-amber-950/80'
                : 'bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed'
            }`}
          >
            <div className="relative">
              <Zap className="w-5 h-5 text-amber-200" />
              <span className="absolute -top-1 -right-2 bg-black text-amber-300 text-[9px] font-bold font-mono px-1 rounded-full border border-amber-400">
                {player.radarPulsesLeft}
              </span>
            </div>
            <span className="text-[11px] font-bold tracking-tight">RADAR PULSE</span>
          </button>

          {/* Hunter Radio Channel */}
          <button
            onClick={onOpenChat}
            className="flex flex-col items-center justify-center gap-1 py-2.5 px-2 bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-200 border border-slate-700 rounded-xl shadow-lg transition"
          >
            <div className="relative">
              <MessageSquare className="w-5 h-5 text-red-400" />
              <span className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-red-500" />
            </div>
            <span className="text-[11px] font-bold tracking-tight">HUNTER RADIO</span>
          </button>
        </div>
      </div>
    </div>
  );
};
