import React from 'react';
import { useGame } from '../context/GameContext.js';
import { QrCode, Heart, CheckSquare, Bell, AlertTriangle, ShieldCheck } from 'lucide-react';

interface CrewmateHUDProps {
  onShowQR: () => void;
  onOpenTasks: () => void;
  onOpenMeeting: () => void;
}

export const CrewmateHUD: React.FC<CrewmateHUDProps> = ({
  onShowQR,
  onOpenTasks,
  onOpenMeeting,
}) => {
  const { gameState, player } = useGame();

  if (!gameState || !player) return null;

  const isProximityActive = gameState.proximityAlert?.active;
  const isOutside = !player.isInsideBoundary;
  const completedCount = player.completedTasks?.length || 0;
  const totalTasks = gameState.tasks?.length || 0;

  return (
    <>
      {/* Proximity Pulsing Vignette & Danger Header when hunter is within 15 meters */}
      {isProximityActive && (
        <div className="absolute top-20 left-4 right-4 z-[450] pointer-events-none">
          <div className="bg-red-950/90 border-2 border-red-500 rounded-2xl p-3 shadow-2xl backdrop-blur-md animate-heartbeat flex items-center justify-between pointer-events-auto">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <Heart className="w-6 h-6 text-red-500 animate-ping absolute" />
                <Heart className="w-6 h-6 text-red-500 fill-red-500" />
              </div>
              <div>
                <div className="text-xs font-black text-red-100 uppercase tracking-wider">
                  ⚠️ HUNTER DETECTED NEARBY!
                </div>
                <div className="text-[10px] text-red-300 font-mono">
                  Distance: ~{gameState.proximityAlert.distanceEstimated || 12}m • Hide or Run!
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Boundary Violation Alert */}
      {isOutside && (
        <div className="absolute top-20 left-4 right-4 z-[450] pointer-events-none">
          <div className="bg-amber-950/90 border-2 border-amber-500 rounded-2xl p-3 shadow-2xl backdrop-blur-md flex items-center justify-between pointer-events-auto">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-6 h-6 text-amber-400 animate-bounce" />
              <div>
                <div className="text-xs font-black text-amber-200 uppercase tracking-wider">
                  OUT OF BOUNDS!
                </div>
                <div className="text-[10px] text-amber-300">
                  Return to perimeter immediately before penalty flag!
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Crewmate HUD Bar */}
      <div className="absolute bottom-0 left-0 right-0 z-[450] bg-slate-950/90 border-t border-cyan-900/60 p-3 safe-bottom backdrop-blur-xl">
        <div className="max-w-md mx-auto flex flex-col gap-2.5">
          {/* Status strip */}
          <div className="flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              CREWMATE EVASION ACTIVE
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span>
                Tasks:{' '}
                <b className="text-emerald-400 font-bold">
                  {completedCount}/{totalTasks}
                </b>
              </span>
            </div>
          </div>

          {/* Action buttons grid */}
          <div className="grid grid-cols-3 gap-2">
            {/* Show Personal Catch ID */}
            <button
              onClick={onShowQR}
              className="flex flex-col items-center justify-center gap-1 py-2.5 px-2 bg-gradient-to-b from-cyan-600 to-cyan-800 hover:from-cyan-500 hover:to-cyan-700 active:scale-95 text-white rounded-xl shadow-lg shadow-cyan-950/80 border border-cyan-400 transition"
            >
              <QrCode className="w-5 h-5 text-cyan-100" />
              <span className="text-[11px] font-bold tracking-tight">SHOW MY ID</span>
            </button>

            {/* Hostel Tasks */}
            <button
              onClick={onOpenTasks}
              className="flex flex-col items-center justify-center gap-1 py-2.5 px-2 bg-gradient-to-b from-emerald-600 to-emerald-800 hover:from-emerald-500 hover:to-emerald-700 active:scale-95 text-white rounded-xl shadow-lg shadow-emerald-950/80 border border-emerald-400 transition"
            >
              <div className="relative">
                <CheckSquare className="w-5 h-5 text-emerald-100" />
                <span className="absolute -top-1 -right-2 bg-black text-emerald-300 text-[9px] font-bold font-mono px-1 rounded-full border border-emerald-400">
                  {totalTasks - completedCount}
                </span>
              </div>
              <span className="text-[11px] font-bold tracking-tight">TASKS</span>
            </button>

            {/* Emergency Meeting */}
            <button
              onClick={onOpenMeeting}
              disabled={player.emergencyMeetingsLeft <= 0}
              className={`flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-xl shadow-lg border transition ${
                player.emergencyMeetingsLeft > 0
                  ? 'bg-gradient-to-b from-amber-600 to-amber-800 hover:from-amber-500 hover:to-amber-700 active:scale-95 text-white border-amber-400 shadow-amber-950/80'
                  : 'bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed'
              }`}
            >
              <Bell className="w-5 h-5 text-amber-200" />
              <span className="text-[11px] font-bold tracking-tight">MEETING</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
