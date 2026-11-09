import React, { useState } from 'react';
import { useGame } from '../context/GameContext.js';
import { Crosshair, Shield, Users, HelpCircle, Trophy, ArrowRight, Sparkles } from 'lucide-react';

const AVATARS = ['🦊', '🐺', '🐱', '🦁', '🐯', '🦅', '🐻', '🐼', '🐨', '🤖', '👻', '🥷'];

interface JoinCreateScreenProps {
  onOpenHowToPlay: () => void;
  onOpenLeaderboard: () => void;
}

export const JoinCreateScreen: React.FC<JoinCreateScreenProps> = ({
  onOpenHowToPlay,
  onOpenLeaderboard,
}) => {
  const { createRoom, joinRoom, error, clearError } = useGame();
  const [tab, setTab] = useState<'join' | 'create'>('join');

  // Form states
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [gameName, setGameName] = useState('Hostel Hunt Alpha');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [loading, setLoading] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || !roomCode.trim()) return;

    setLoading(true);
    clearError();
    await joinRoom(roomCode.trim(), playerName.trim(), selectedAvatar);
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) return;

    setLoading(true);
    clearError();
    await createRoom(playerName.trim(), gameName.trim());
    setLoading(false);
  };

  return (
    <div className="flex-1 w-full max-w-md mx-auto p-4 flex flex-col justify-between overflow-y-auto select-none safe-top safe-bottom">
      <div className="space-y-6 pt-4">
        {/* App Title Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-tr from-red-600 via-amber-600 to-cyan-500 p-0.5 shadow-2xl shadow-cyan-950/80">
            <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
              <Crosshair className="w-8 h-8 text-cyan-400 animate-pulse" />
            </div>
          </div>

          <div>
            <h1 className="text-3xl font-black tracking-tight text-white uppercase italic">
              HOSTEL <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-amber-400">HUNT</span>
            </h1>
            <p className="text-xs text-slate-400 font-mono tracking-wider mt-1">
              TACTICAL REAL-LIFE HIDE & SEEK
            </p>
          </div>
        </div>

        {/* Action Tabs */}
        <div className="bg-slate-900 p-1.5 rounded-2xl border border-slate-800 grid grid-cols-2 text-xs font-bold font-mono">
          <button
            onClick={() => setTab('join')}
            className={`py-2 rounded-xl transition ${
              tab === 'join' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Join Match
          </button>
          <button
            onClick={() => setTab('create')}
            className={`py-2 rounded-xl transition ${
              tab === 'create' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Host Match
          </button>
        </div>

        {/* Error notification */}
        {error && (
          <div className="bg-red-950/80 border border-red-500/80 p-3 rounded-2xl text-xs text-red-200 text-center animate-shake">
            {error}
          </div>
        )}

        {/* Join Match Form */}
        {tab === 'join' ? (
          <form onSubmit={handleJoin} className="space-y-4 bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-xl">
            <div>
              <label className="block text-xs font-mono font-bold text-slate-400 uppercase mb-1.5">
                Codename / Player Name
              </label>
              <input
                type="text"
                placeholder="e.g. ShadowHunter, Alex"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={20}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-slate-400 uppercase mb-1.5">
                Room Code (5 letters)
              </label>
              <input
                type="text"
                placeholder="e.g. HUNT4"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={8}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-base text-cyan-400 font-mono font-bold tracking-widest text-center uppercase focus:outline-none focus:border-cyan-400"
              />
            </div>

            {/* Avatar selector */}
            <div>
              <label className="block text-xs font-mono font-bold text-slate-400 uppercase mb-1.5">
                Choose Combat Badge
              </label>
              <div className="flex gap-2 overflow-x-auto py-1 text-xl">
                {AVATARS.map((av) => (
                  <button
                    type="button"
                    key={av}
                    onClick={() => setSelectedAvatar(av)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center border transition flex-shrink-0 ${
                      selectedAvatar === av
                        ? 'bg-cyan-950 border-cyan-400 scale-110 shadow'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !playerName.trim() || !roomCode.trim()}
              className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl shadow-xl transition flex items-center justify-center gap-2 mt-2"
            >
              <span>{loading ? 'Entering Arena...' : 'Join Operation'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          /* Host Match Form */
          <form onSubmit={handleCreate} className="space-y-4 bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-xl">
            <div>
              <label className="block text-xs font-mono font-bold text-slate-400 uppercase mb-1.5">
                Host Codename
              </label>
              <input
                type="text"
                placeholder="e.g. Commander Bob"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={20}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-slate-400 uppercase mb-1.5">
                Match Title
              </label>
              <input
                type="text"
                placeholder="e.g. Hostel Hunt Block-A"
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                maxLength={30}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-slate-400 uppercase mb-1.5">
                Choose Combat Badge
              </label>
              <div className="flex gap-2 overflow-x-auto py-1 text-xl">
                {AVATARS.map((av) => (
                  <button
                    type="button"
                    key={av}
                    onClick={() => setSelectedAvatar(av)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center border transition flex-shrink-0 ${
                      selectedAvatar === av
                        ? 'bg-amber-950 border-amber-400 scale-110 shadow'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !playerName.trim()}
              className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl shadow-xl transition flex items-center justify-center gap-2 mt-2"
            >
              <span>{loading ? 'Initializing Server...' : 'Create Mission Room'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>

      {/* Footer Utility Links */}
      <div className="flex items-center justify-center gap-6 py-4 text-xs font-mono text-slate-400">
        <button
          onClick={onOpenHowToPlay}
          className="flex items-center gap-1.5 hover:text-slate-200 transition"
        >
          <HelpCircle className="w-4 h-4 text-cyan-400" />
          <span>How to Play</span>
        </button>

        <button
          onClick={onOpenLeaderboard}
          className="flex items-center gap-1.5 hover:text-slate-200 transition"
        >
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>Leaderboard</span>
        </button>
      </div>
    </div>
  );
};
