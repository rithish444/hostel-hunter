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
  LogOut,
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
    leaveRoom,
  } = useGame();

  const [activeTab, setActiveTab] = useState<'roster' | 'boundary' | 'redzones' | 'settings'>('roster');
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneRadius, setNewZoneRadius] = useState(20);
  const [newZoneFloor, setNewZoneFloor] = useState<number | 'all'>('all');
  const [newZoneSeverity, setNewZoneSeverity] = useState<'danger' | 'warning'>('danger');
  const [confirmingDissolve, setConfirmingDissolve] = useState(false);

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

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <div className="font-bold text-slate-300">Geofence Coordinates:</div>
                <div className="font-mono text-[11px] text-cyan-400">
                  {gameState.boundary.name || "SREC Men's Hostel 2"}
                </div>
                <div className="font-mono text-[11px] text-slate-400">
                  Lat: {gameState.boundary.center.lat.toFixed(6)} | Lng:{' '}
                  {gameState.boundary.center.lng.toFixed(6)}
                </div>
                <div className="text-[10px] text-slate-500">
                  Grace period allowed when exiting: {gameState.settings.gracePeriodSeconds}s
                </div>

                <div className="flex flex-col gap-1.5 pt-1">
                  {player.location && (
                    <button
                      type="button"
                      onClick={() => {
                        updateBoundary({
                          ...gameState.boundary,
                          center: { lat: player.location!.lat, lng: player.location!.lng },
                          name: "Host's Real GPS Location",
                        });
                      }}
                      className="w-full bg-cyan-900/80 hover:bg-cyan-800 border border-cyan-600 text-cyan-200 font-bold py-1.5 rounded-lg text-xs transition"
                    >
                      📍 Center Boundary on My Current GPS
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      updateBoundary({
                        ...gameState.boundary,
                        center: { lat: 11.1005, lng: 76.9683 },
                        name: "SREC Men's Hostel 2 Perimeter",
                      });
                    }}
                    className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-bold py-1.5 rounded-lg text-xs transition"
                  >
                    🏫 Reset to SREC Men's Hostel 2
                  </button>
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

              {/* Map Provider & API Key Guidance */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2 mt-3">
                <div className="font-bold text-amber-300 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-amber-400" />
                  <span>Map Tiles & API Key Configuration</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  By default, Hostel Hunt uses high-speed OpenStreetMap and Satellite Aerial tiles (no key needed).
                  You can also switch map styles using the floating <span className="text-amber-400 font-bold">Layers icon</span> on the map screen.
                </p>
                <div className="text-[10px] text-slate-500 font-mono bg-slate-900 p-2 rounded-lg border border-slate-800">
                  Supported: OpenStreetMap (Tactical Dark) & Esri World Imagery (Satellite). 100% free with zero API keys required.
                </div>
              </div>

              {/* Danger Zone: Dissolve Room */}
              <div className="pt-2">
                {confirmingDissolve ? (
                  <div className="bg-red-950/90 border border-red-500 p-3 rounded-2xl flex flex-col gap-2 animate-in fade-in">
                    <div className="text-xs font-black text-red-200">
                      ⚠️ ARE YOU SURE? THIS CLOSES THE MATCH FOR EVERYONE.
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          onClose();
                          leaveRoom();
                        }}
                        className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black py-2 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Yes, Close Room</span>
                      </button>
                      <button
                        onClick={() => setConfirmingDissolve(false)}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-3 py-2 rounded-xl text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmingDissolve(true)}
                    className="w-full bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-300 font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2 text-xs"
                  >
                    <LogOut className="w-4 h-4 text-red-400" />
                    <span>End & Dissolve Match Room</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

