import React from 'react';
import { useGame } from '../context/GameContext.js';
import { Eye, Skull, Users, MessageSquare } from 'lucide-react';

interface SpectatorHUDProps {
  onOpenChat: () => void;
}

export const SpectatorHUD: React.FC<SpectatorHUDProps> = ({ onOpenChat }) => {
  const { gameState, player } = useGame();

  if (!gameState || !player) return null;

  const aliveCrewmates = gameState.players.filter(
    (p) => p.status === 'alive' && p.role === 'crewmate'
  );

  return (
    <div className="absolute bottom-0 left-0 right-0 z-[450] bg-slate-950/90 border-t border-purple-900/60 p-3 safe-bottom backdrop-blur-xl">
      <div className="max-w-md mx-auto flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-purple-900/80 border border-purple-400 flex items-center justify-center text-purple-200">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-purple-300">SPECTATOR MODE (ELIMINATED)</div>
              <div className="text-[10px] text-slate-400">
                You can now view all players live on the map.
              </div>
            </div>
          </div>

          <button
            onClick={onOpenChat}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-200"
          >
            <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
            <span>Chat</span>
          </button>
        </div>

        {/* Surviving Crewmates Roster */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2 flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400">Remaining Survivors:</span>
          <span className="text-emerald-400 font-bold">{aliveCrewmates.length}</span>
        </div>
      </div>
    </div>
  );
};
