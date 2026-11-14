import React from 'react';
import { LogOut, ShieldAlert, X } from 'lucide-react';

interface ExitConfirmationModalProps {
  isHost: boolean;
  isOpen: boolean;
  roomCode?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ExitConfirmationModal: React.FC<ExitConfirmationModalProps> = ({
  isHost,
  isOpen,
  roomCode,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border-2 border-red-500/80 w-full max-w-sm rounded-3xl shadow-2xl p-6 flex flex-col items-center text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="w-16 h-16 rounded-full bg-red-950/90 border-2 border-red-500 flex items-center justify-center text-red-400 shadow-xl shadow-red-950/80">
          {isHost ? <ShieldAlert className="w-8 h-8 text-red-400 animate-pulse" /> : <LogOut className="w-8 h-8 text-red-400" />}
        </div>

        <div className="space-y-1.5">
          <h3 className="text-xl font-black uppercase text-slate-100 tracking-wide">
            {isHost ? 'End & Close Room?' : 'Exit Game?'}
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed max-w-xs">
            {isHost
              ? `You are the host. Closing room ${roomCode || ''} will immediately end the match and return all players to the home screen.`
              : `Are you sure you want to leave room ${roomCode || ''}? You will return to the home screen.`}
          </p>
        </div>

        <div className="w-full flex flex-col gap-2.5 pt-2">
          <button
            onClick={onConfirm}
            className="w-full bg-red-600 hover:bg-red-500 active:scale-95 text-white font-black py-3 rounded-2xl shadow-xl shadow-red-950/80 transition flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
          >
            <LogOut className="w-4 h-4" />
            <span>{isHost ? 'Close Room For Everyone' : 'Yes, Leave Game'}</span>
          </button>

          <button
            onClick={onCancel}
            className="w-full bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 font-bold py-2.5 rounded-2xl transition text-xs"
          >
            Stay in Match
          </button>
        </div>
      </div>
    </div>
  );
};

