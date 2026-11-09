import React from 'react';
import { useGame } from '../context/GameContext.js';
import { Bell, Clock, Users, X } from 'lucide-react';

interface EmergencyMeetingModalProps {
  onClose: () => void;
}

export const EmergencyMeetingModal: React.FC<EmergencyMeetingModalProps> = ({ onClose }) => {
  const { gameState } = useGame();

  if (!gameState || gameState.phase !== 'meeting') return null;

  return (
    <div className="fixed inset-0 z-[800] bg-red-950/95 backdrop-blur-xl flex items-center justify-center p-4 select-none animate-fade-in">
      <div className="bg-slate-900 border-2 border-red-500 w-full max-w-md rounded-3xl shadow-2xl p-6 text-center space-y-4">
        <div className="relative mx-auto w-16 h-16 rounded-full bg-red-900 border-2 border-red-400 flex items-center justify-center animate-bounce">
          <Bell className="w-8 h-8 text-red-200" />
        </div>

        <h2 className="text-xl font-black text-red-100 uppercase tracking-wider">
          EMERGENCY MEETING CALLED!
        </h2>

        <p className="text-xs text-red-300">
          Timers paused! Gather in the Common Room or open the tactical chat to discuss clues and hunter sightings.
        </p>

        <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex items-center justify-center gap-3">
          <Clock className="w-6 h-6 text-amber-400 animate-spin" />
          <div className="text-2xl font-black font-mono text-amber-400">
            {gameState.remainingSeconds}s
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded-xl shadow-lg transition"
        >
          Open Chat & Discuss
        </button>
      </div>
    </div>
  );
};
