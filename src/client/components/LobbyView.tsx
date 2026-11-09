import React, { useState } from 'react';
import { useGame } from '../context/GameContext.js';
import {
  Users,
  Copy,
  Check,
  Play,
  Bot,
  Settings,
  HelpCircle,
  Trophy,
  UserX,
  Crosshair,
  Sparkles,
} from 'lucide-react';

interface LobbyViewProps {
  onOpenHowToPlay: () => void;
  onOpenLeaderboard: () => void;
  onOpenHostSettings: () => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  onOpenHowToPlay,
  onOpenLeaderboard,
  onOpenHostSettings,
}) => {
  const { gameState, player, roomCode, startGame, addBots, kickPlayer } = useGame();
  const [copied, setCopied] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  if (!gameState || !player) return null;

  const isHost = player.isHost;

  const handleCopyCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleStartGame = async () => {
    setIsStarting(true);
    await startGame();
    setIsStarting(false);
  };

  return (
    <div className="flex-1 w-full max-w-md mx-auto p-4 flex flex-col justify-between overflow-y-auto select-none">
      <div className="space-y-4">
        {/* Top Room Banner */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl shadow-xl flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">
              MISSION CODE
            </div>
            <div className="text-3xl font-black font-mono tracking-wider text-slate-100 flex items-center gap-2">
              <span>{roomCode}</span>
              <button
                onClick={handleCopyCode}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                title="Copy Room Code"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <div className="text-xs text-slate-400 mt-0.5">{gameState.gameName}</div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <button
              onClick={onOpenHowToPlay}
              className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-2.5 py-1.5 rounded-xl border border-slate-700 transition"
            >
              <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
              <span>Guide</span>
            </button>

            <button
              onClick={onOpenLeaderboard}
              className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-2.5 py-1.5 rounded-xl border border-slate-700 transition"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Rankings</span>
            </button>
          </div>
        </div>

        {/* Game Rules Summary Pill Bar */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
          <div className="bg-slate-900/80 border border-slate-800 p-2 rounded-2xl">
            <span className="text-[10px] text-slate-500 uppercase block">Hunters</span>
            <span className="font-bold text-red-400">{gameState.settings.hunterCount} Targets</span>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 p-2 rounded-2xl">
            <span className="text-[10px] text-slate-500 uppercase block">Hiding Time</span>
            <span className="font-bold text-amber-400">{gameState.settings.hidingTimeSeconds}s</span>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 p-2 rounded-2xl">
            <span className="text-[10px] text-slate-500 uppercase block">Hunt Duration</span>
            <span className="font-bold text-cyan-400">{gameState.settings.durationMinutes}m</span>
          </div>
        </div>

        {/* Players Roster */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold font-mono text-slate-300 uppercase tracking-wider">
                Active Agents ({gameState.players.length})
              </h3>
            </div>

            {isHost && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => addBots(4)}
                  className="flex items-center gap-1 bg-indigo-900/80 hover:bg-indigo-800 text-indigo-200 text-[11px] font-bold px-2.5 py-1 rounded-xl border border-indigo-700 transition"
                  title="Add 4 Simulated Bots"
                >
                  <Bot className="w-3.5 h-3.5 text-indigo-400" />
                  <span>+4 Bots</span>
                </button>

                <button
                  onClick={onOpenHostSettings}
                  className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
                  title="Host Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-2 divide-y divide-slate-800 max-h-72 overflow-y-auto">
            {gameState.players.map((p) => (
              <div key={p.id} className="p-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="text-xl">{p.avatar || '👤'}</div>
                  <div>
                    <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      {p.name}
                      {p.id === player.id && (
                        <span className="bg-cyan-500/20 text-cyan-300 text-[9px] px-1.5 rounded font-mono">
                          YOU
                        </span>
                      )}
                      {p.isHost && (
                        <span className="bg-amber-500/20 text-amber-300 text-[9px] px-1.5 rounded font-mono">
                          HOST
                        </span>
                      )}
                      {p.isBot && (
                        <span className="bg-purple-500/20 text-purple-300 text-[9px] px-1.5 rounded font-mono">
                          BOT
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Floor: {p.floor ?? 'Calibrating'} • Ready
                    </div>
                  </div>
                </div>

                {isHost && !p.isHost && (
                  <button
                    onClick={() => kickPlayer(p.id)}
                    className="text-slate-500 hover:text-red-400 p-1"
                    title="Kick player"
                  >
                    <UserX className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Start Button / Waiting Indicator */}
      <div className="pt-4 safe-bottom">
        {isHost ? (
          <button
            onClick={handleStartGame}
            disabled={gameState.players.length < 2 || isStarting}
            className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-2xl ${
              gameState.players.length >= 2
                ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white shadow-emerald-950/80 active:scale-95'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            }`}
          >
            <Play className="w-5 h-5 fill-current" />
            <span>
              {gameState.players.length < 2
                ? 'Need 2+ Players to Start (Tap +4 Bots)'
                : 'Start Mission (Assign Roles)'}
            </span>
          </button>
        ) : (
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-1">
            <div className="text-xs font-bold text-amber-400 animate-pulse">
              Awaiting Host to Initiate Match...
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              Server will randomly assign Hunter and Crewmate roles on start.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
