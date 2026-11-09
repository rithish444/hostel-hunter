import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useGame } from '../context/GameContext.js';
import { Trophy, Skull, Users, Clock, CheckCircle2, RotateCcw, ArrowRight } from 'lucide-react';

interface ResultsViewProps {
  onPlayAgain: () => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({ onPlayAgain }) => {
  const { gameState, player } = useGame();

  useEffect(() => {
    if (gameState?.winner === 'crewmates') {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, [gameState?.winner]);

  if (!gameState) return null;

  const isHuntersWin = gameState.winner === 'hunters';
  const durationSecs = gameState.startTime ? Math.round((Date.now() - gameState.startTime) / 1000) : 0;
  const mins = Math.floor(durationSecs / 60);
  const secs = durationSecs % 60;

  return (
    <div className="fixed inset-0 z-[650] bg-slate-950/95 backdrop-blur-2xl flex items-center justify-center p-4 overflow-y-auto select-none">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl shadow-2xl p-6 flex flex-col text-center space-y-4 my-auto">
        {/* Trophy / Skull Header */}
        <div
          className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center border-4 shadow-2xl ${
            isHuntersWin
              ? 'bg-red-950 border-red-500 text-red-400 shadow-red-950/80'
              : 'bg-cyan-950 border-cyan-400 text-cyan-300 shadow-cyan-950/80'
          }`}
        >
          {isHuntersWin ? <Skull className="w-10 h-10 animate-bounce" /> : <Trophy className="w-10 h-10 animate-bounce" />}
        </div>

        <div>
          <h2
            className={`text-2xl font-black uppercase tracking-wider ${
              isHuntersWin ? 'text-red-400' : 'text-cyan-400'
            }`}
          >
            {isHuntersWin ? 'HUNTERS TRIUMPH!' : 'CREWMATES SURVIVED!'}
          </h2>
          <p className="text-xs text-slate-300 mt-1">{gameState.winReason}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 bg-slate-950 p-3 rounded-2xl border border-slate-800 text-xs font-mono">
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-500 uppercase">Duration</span>
            <div className="font-bold text-slate-200">
              {mins}m {secs}s
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-500 uppercase">Catches</span>
            <div className="font-bold text-red-400">{gameState.stats.catches.length}</div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-500 uppercase">Tasks Done</span>
            <div className="font-bold text-emerald-400">
              {gameState.stats.tasksCompleted}/{gameState.stats.totalTasks}
            </div>
          </div>
        </div>

        {/* Catches Timeline */}
        <div className="space-y-2 text-left">
          <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
            Match Catches Record:
          </span>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-h-40 overflow-y-auto divide-y divide-slate-800/80 text-xs">
            {gameState.stats.catches.length === 0 ? (
              <div className="p-3 text-center text-slate-500 text-[11px]">
                Zero crewmates caught! Flawless evasion.
              </div>
            ) : (
              gameState.stats.catches.map((c, idx) => (
                <div key={idx} className="p-2.5 flex items-center justify-between font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="text-red-400 font-bold">{c.hunterName}</span>
                    <span className="text-slate-500">caught</span>
                    <span className="text-cyan-300 font-bold">{c.crewmateName}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                    Floor {c.floor}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={onPlayAgain}
          className="w-full bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-bold py-3 rounded-2xl shadow-xl transition flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Return to Lobby</span>
        </button>
      </div>
    </div>
  );
};
