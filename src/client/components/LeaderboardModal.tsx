import React, { useEffect, useState } from 'react';
import { X, Trophy, History, Shield, Crosshair, Medal } from 'lucide-react';

interface LeaderboardEntry {
  playerName: string;
  hunterWins: number;
  crewmateWins: number;
  totalCatches: number;
  matchesPlayed: number;
}

interface CompletedMatch {
  id: string;
  roomCode: string;
  gameName: string;
  playedAt: number;
  durationSeconds: number;
  winner: 'hunters' | 'crewmates';
  winReason: string;
  hunters: string[];
  crewmates: string[];
  catchesCount: number;
}

interface LeaderboardModalProps {
  onClose: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ onClose }) => {
  const [tab, setTab] = useState<'leaderboard' | 'history'>('leaderboard');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [matches, setMatches] = useState<CompletedMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [lbRes, mRes] = await Promise.all([
          fetch('/api/leaderboard'),
          fetch('/api/matches'),
        ]);
        if (lbRes.ok) setLeaderboard(await lbRes.json());
        if (mRes.ok) setMatches(await mRes.json());
      } catch (e) {
        console.error('Error fetching leaderboard:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="fixed inset-0 z-[700] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
              Hall of Fame & Records
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 border-b border-slate-800 bg-slate-950/60 text-xs font-mono font-bold">
          <button
            onClick={() => setTab('leaderboard')}
            className={`py-2.5 transition flex items-center justify-center gap-2 ${
              tab === 'leaderboard'
                ? 'border-b-2 border-amber-400 text-amber-400 bg-slate-800/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Medal className="w-4 h-4" />
            Leaderboard
          </button>
          <button
            onClick={() => setTab('history')}
            className={`py-2.5 transition flex items-center justify-center gap-2 ${
              tab === 'history'
                ? 'border-b-2 border-amber-400 text-amber-400 bg-slate-800/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            Match Logs
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-3">
          {loading ? (
            <div className="text-center text-xs text-slate-500 py-10 font-mono">
              Loading records...
            </div>
          ) : tab === 'leaderboard' ? (
            leaderboard.length === 0 ? (
              <div className="text-center text-xs text-slate-500 py-10 font-mono">
                No completed matches recorded yet. Play a game to record stats!
              </div>
            ) : (
              <div className="divide-y divide-slate-800 border border-slate-800 rounded-2xl overflow-hidden bg-slate-950">
                {leaderboard.map((entry, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-slate-500 w-4">
                        #{idx + 1}
                      </span>
                      <div>
                        <div className="font-bold text-slate-200">{entry.playerName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {entry.matchesPlayed} Matches • {entry.totalCatches} Catches
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="text-red-400">{entry.hunterWins}H</span>
                      <span className="text-slate-600">/</span>
                      <span className="text-cyan-400">{entry.crewmateWins}C</span>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            matches.length === 0 ? (
              <div className="text-center text-xs text-slate-500 py-10 font-mono">
                No past match history found.
              </div>
            ) : (
              <div className="space-y-2.5">
                {matches.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200 font-mono">
                        {m.roomCode} • {m.gameName}
                      </span>
                      <span
                        className={`font-bold font-mono uppercase text-[10px] px-1.5 py-0.5 rounded ${
                          m.winner === 'hunters'
                            ? 'bg-red-950 text-red-300 border border-red-800'
                            : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                        }`}
                      >
                        {m.winner} WIN
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">{m.winReason}</div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Catches: {m.catchesCount} • Duration: {Math.round(m.durationSeconds / 60)}m
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

