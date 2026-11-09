import React, { useState } from 'react';
import { useGame } from '../context/GameContext.js';
import {
  Shield,
  Users,
  Settings,
  MapPin,
  AlertTriangle,
  Bot,
  UserX,
  X,
  Check,
  Plus,
  Trash2,
} from 'lucide-react';
import { RedZone } from '../../shared/types.js';

interface HostControlPanelProps {
  onClose: () => void;
}

export const HostControlPanel: React.FC<HostControlPanelProps> = ({ onClose }) => {
  const {
    gameState,
    player,
    addBots,
    kickPlayer,
    updateSettings,
    updateBoundary,
    addRedZone,
    removeRedZone,
    resolveSOS,
  } = useGame();

  const [activeTab, setActiveTab] = useState<'roster' | 'boundary' | 'redzones' | 'settings'>('roster');
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneRadius, setNewZoneRadius] = useState(20);
  const [newZoneFloor, setNewZoneFloor] = useState<number | 'all'>('all');
  const [newZoneSeverity, setNewZoneSeverity] = useState<'danger' | 'warning'>('danger');

  if (!gameState || !player?.isHost) return null;

  const handleAddZone = () => {
    if (!newZoneName.trim() || !gameState.boundary) return;

    const newZone: RedZone = {
      id: `rz_${Date.now()}`,
      name: newZoneName.trim(),
      center: gameState.boundary.center,
      radius: newZoneRadius,
      floor: newZoneFloor,
      description: 'Host-defined restricted zone',
      severity: newZoneSeverity,
    };

    addRedZone(newZone);
    setNewZoneName('');
  };

  return (
    <div className="fixed inset-0 z-[600] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 select-none">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-black text-slate-100 uppercase tracking-wide">
              Host Operations Center
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* SOS Alert Bar if active */}
        {gameState.activeSos && (
          <div className="bg-red-950 border-b border-red-500/80 p-3 flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-2 text-xs text-red-200">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <div>
                <span className="font-bold">SOS ACTIVE:</span> {gameState.activeSos.playerName} on Floor{' '}
                {gameState.activeSos.location.floor}
              </div>
            </div>
            <button
              onClick={() => resolveSOS()}
              className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow"
            >
              Resolve Alert
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="grid grid-cols-4 border-b border-slate-800 text-xs font-bold font-mono">
          <button
            onClick={() => setActiveTab('roster')}
            className={`py-2.5 transition flex items-center justify-center gap-1.5 ${
              activeTab === 'roster' ? 'border-b-2 border-amber-400 text-amber-400 bg-slate-800/50' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Roster
          </button>
          <button
            onClick={() => setActiveTab('boundary')}
            className={`py-2.5 transition flex items-center justify-center gap-1.5 ${
              activeTab === 'boundary' ? 'border-b-2 border-amber-400 text-amber-400 bg-slate-800/50' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            Boundary
          </button>
          <button
            onClick={() => setActiveTab('redzones')}
            className={`py-2.5 transition flex items-center justify-center gap-1.5 ${
              activeTab === 'redzones' ? 'border-b-2 border-amber-400 text-amber-400 bg-slate-800/50' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Red Zones
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-2.5 transition flex items-center justify-center gap-1.5 ${
              activeTab === 'settings' ? 'border-b-2 border-amber-400 text-amber-400 bg-slate-800/50' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            Rules
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Tab 1: Roster */}
          {activeTab === 'roster' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-mono">
                  Total Registered: {gameState.players.length}
                </span>
                {gameState.phase === 'lobby' && (
                  <button
                    onClick={() => addBots(4)}
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow transition"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    +4 Test Bots
                  </button>
                )}
              </div>

              <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden">
                {gameState.players.map((p) => (
                  <div key={p.id} className="p-2.5 flex items-center justify-between bg-slate-900/50">
                    <div className="flex items-center gap-2.5">
                      <div className="text-lg">{p.avatar || '👤'}</div>
                      <div>
                        <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          {p.name}
                          {p.isHost && (
                            <span className="bg-amber-500/20 text-amber-300 text-[9px] px-1.5 py-0.2 rounded font-mono">
                              HOST
                            </span>
                          )}
                          {p.isBot && (
                            <span className="bg-purple-500/20 text-purple-300 text-[9px] px-1.5 py-0.2 rounded font-mono">
                              BOT
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Floor: {p.floor ?? 'Unknown'} • Status: {p.status}
                          {p.role && ` • Role: ${p.role.toUpperCase()}`}
                        </div>
                      </div>
                    </div>

                    {!p.isHost && (
                      <button
                        onClick={() => kickPlayer(p.id)}
                        className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-800 transition"
                        title="Kick player"
                      >
                        <UserX className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 2: Boundary */}
          {activeTab === 'boundary' && (
            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Perimeter Radius: {gameState.boundary.radius} meters
                </label>
                <input
                  type="range"
                  min="50"
                  max="300"
                  step="10"
                  value={gameState.boundary.radius}
                  onChange={(e) =>
                    updateBoundary({
                      ...gameState.boundary,
                      radius: parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <div className="font-bold text-slate-300">Geofence Coordinates:</div>
                <div className="font-mono text-[11px] text-slate-400">
                  Lat: {gameState.boundary.center.lat.toFixed(6)} | Lng:{' '}
                  {gameState.boundary.center.lng.toFixed(6)}
                </div>
                <div className="text-[10px] text-slate-500">
                  Grace period allowed when exiting: {gameState.settings.gracePeriodSeconds}s
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Red Zones */}
          {activeTab === 'redzones' && (
            <div className="space-y-4 text-xs">
              <div className="space-y-2">
                <span className="font-bold text-slate-300">Active Hazard Zones:</span>
                <div className="space-y-2">
                  {gameState.redZones.map((zone) => (
                    <div
                      key={zone.id}
                      className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-red-300 flex items-center gap-1">
                          ⚠️ {zone.name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Radius: {zone.radius}m • Floor:{' '}
                          {zone.floor === 'all' ? 'All' : `Floor ${zone.floor}`}
                        </div>
                      </div>
                      <button
                        onClick={() => removeRedZone(zone.id)}
                        className="text-slate-500 hover:text-red-400 p-1.5"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Red Zone form */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2.5">
                <div className="font-bold text-amber-300 flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Add Restricted Zone
                </div>
                <input
                  type="text"
                  placeholder="e.g. Roof Terrace / Generator Room"
                  value={newZoneName}
                  onChange={(e) => setNewZoneName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg text-slate-100"
                />
                <div className="flex gap-2">
                  <select
                    value={newZoneFloor}
                    onChange={(e) =>
                      setNewZoneFloor(e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10))
                    }
                    className="bg-slate-900 border border-slate-700 px-2 py-1.5 rounded-lg text-slate-200 flex-1"
                  >
                    <option value="all">All Floors</option>
                    <option value="0">Ground Floor</option>
                    <option value="1">Floor 1</option>
                    <option value="2">Floor 2</option>
                    <option value="3">Floor 3</option>
                    <option value="4">Terrace (Roof)</option>
                  </select>

                  <select
                    value={newZoneSeverity}
                    onChange={(e) => setNewZoneSeverity(e.target.value as any)}
                    className="bg-slate-900 border border-slate-700 px-2 py-1.5 rounded-lg text-slate-200"
                  >
                    <option value="danger">Danger</option>
                    <option value="warning">Warning</option>
                  </select>
                </div>

                <button
                  onClick={handleAddZone}
                  className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-1.5 rounded-lg transition"
                >
                  Create Restricted Zone
                </button>
              </div>
            </div>
          )}

          {/* Tab 4: Rules & Timers */}
          {activeTab === 'settings' && (
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Hunter Count: {gameState.settings.hunterCount}
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={gameState.settings.hunterCount}
                  onChange={(e) => updateSettings({ hunterCount: parseInt(e.target.value, 10) })}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Hiding Phase: {gameState.settings.hidingTimeSeconds} seconds
                </label>
                <input
                  type="range"
                  min="30"
                  max="180"
                  step="15"
                  value={gameState.settings.hidingTimeSeconds}
                  onChange={(e) =>
                    updateSettings({ hidingTimeSeconds: parseInt(e.target.value, 10) })
                  }
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Hunt Duration: {gameState.settings.durationMinutes} minutes
                </label>
                <input
                  type="range"
                  min="3"
                  max="30"
                  step="1"
                  value={gameState.settings.durationMinutes}
                  onChange={(e) =>
                    updateSettings({ durationMinutes: parseInt(e.target.value, 10) })
                  }
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Radar Refresh Interval: {gameState.settings.updateIntervalSeconds}s
                </label>
                <input
                  type="range"
                  min="10"
                  max="60"
                  step="5"
                  value={gameState.settings.updateIntervalSeconds}
                  onChange={(e) =>
                    updateSettings({ updateIntervalSeconds: parseInt(e.target.value, 10) })
                  }
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
