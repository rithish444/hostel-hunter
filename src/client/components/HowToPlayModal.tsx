import React, { useState } from 'react';
import { X, ShieldAlert, Crosshair, MapPin, Radio, AlertTriangle, Layers, Award } from 'lucide-react';

interface HowToPlayModalProps {
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'roles' | 'floors' | 'safety'>('overview');

  return (
    <div className="fixed inset-0 z-[700] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
              Hostel Hunt Field Manual
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
        <div className="grid grid-cols-4 border-b border-slate-800 bg-slate-950/60 text-[11px] font-mono font-bold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2.5 transition ${
              activeTab === 'overview'
                ? 'border-b-2 border-cyan-400 text-cyan-400 bg-slate-800/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`py-2.5 transition ${
              activeTab === 'roles'
                ? 'border-b-2 border-cyan-400 text-cyan-400 bg-slate-800/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Roles
          </button>
          <button
            onClick={() => setActiveTab('floors')}
            className={`py-2.5 transition ${
              activeTab === 'floors'
                ? 'border-b-2 border-cyan-400 text-cyan-400 bg-slate-800/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Multi-Floor
          </button>
          <button
            onClick={() => setActiveTab('safety')}
            className={`py-2.5 transition ${
              activeTab === 'safety'
                ? 'border-b-2 border-cyan-400 text-cyan-400 bg-slate-800/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Safety
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-3.5 text-xs text-slate-300 leading-relaxed">
          {activeTab === 'overview' && (
            <div className="space-y-3">
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1">
                <span className="font-bold text-cyan-400">1. Lobby Phase</span>
                <p className="text-slate-400 text-[11px]">
                  Players join via Room Code. Host sets perimeter geofence, match duration, and hunter count, then starts the match.
                </p>
              </div>

              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1">
                <span className="font-bold text-amber-400">2. Hiding Phase (60s)</span>
                <p className="text-slate-400 text-[11px]">
                  Server secretly assigns roles. Crewmates scatter and hide inside dorms, corridors, and reading rooms. Hunters are locked on standby!
                </p>
              </div>

              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1">
                <span className="font-bold text-red-400">3. Hunt Phase (10 mins)</span>
                <p className="text-slate-400 text-[11px]">
                  Hunters release! Hunters win by catching all crewmates. Crewmates win if at least 1 survives until time expires OR if all hostel tasks are solved!
                </p>
              </div>
            </div>
          )}

          {activeTab === 'roles' && (
            <div className="space-y-3">
              <div className="bg-red-950/40 border border-red-800/80 p-3 rounded-2xl space-y-1.5">
                <div className="font-bold text-red-400 flex items-center gap-1.5">
                  <Crosshair className="w-4 h-4" />
                  HUNTER SQUAD
                </div>
                <ul className="list-disc list-inside text-[11px] text-red-200 space-y-1">
                  <li>Sees fellow hunters' live GPS positions to plan pincer traps.</li>
                  <li>Receives approximate radar circles of crewmates every 20s.</li>
                  <li>Starts with 3 "Radar Pulse" power-ups for instant exact ping.</li>
                  <li>Catch crewmates by scanning their personal screen QR badge!</li>
                </ul>
              </div>

              <div className="bg-cyan-950/40 border border-cyan-800/80 p-3 rounded-2xl space-y-1.5">
                <div className="font-bold text-cyan-400 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" />
                  CREWMATE SURVIVORS
                </div>
                <ul className="list-disc list-inside text-[11px] text-cyan-200 space-y-1">
                  <li>Sees only themselves, perimeter boundary, and restricted red zones.</li>
                  <li>Proximity Alert: Heartbeat audio & vibration trigger when a hunter is within 15 meters!</li>
                  <li>Tap "Show My ID" when cornered for hunter to scan.</li>
                  <li>Solve electrical and hostel tasks across floors to win early!</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'floors' && (
            <div className="space-y-3">
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2">
                <div className="font-bold text-amber-400 flex items-center gap-1.5">
                  <Layers className="w-4 h-4" />
                  Indoor Multi-Floor Solution
                </div>
                <p className="text-[11px] text-slate-400">
                  Because GPS does not report indoor floors, Hostel Hunt uses a synchronized multi-floor system:
                </p>
                <div className="space-y-1.5 text-[11px] text-slate-300">
                  <div>
                    <b className="text-cyan-400">Floor Quick-Bar:</b> Tap [G], [F1], [F2], [F3] at the top of your screen whenever taking stairwells.
                  </div>
                  <div>
                    <b className="text-cyan-400">QR Checkpoints:</b> Scan floor checkpoint posters on doors/staircases to instantly lock your floor and snap GPS accuracy.
                  </div>
                  <div>
                    <b className="text-cyan-400">Same-Floor Catching:</b> Hunters and Crewmates must be on the same floor for physical tags to register.
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'safety' && (
            <div className="space-y-3">
              <div className="bg-amber-950/40 border border-amber-800/80 p-3 rounded-2xl space-y-1.5">
                <div className="font-bold text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  Safety & Real-Life Hostel Rules
                </div>
                <ul className="list-disc list-inside text-[11px] text-amber-200 space-y-1">
                  <li><b>Red Zones:</b> Roofs, terraces, electrical transformer rooms, and warden quarters are strictly off-limits. Entering triggers immediate hazard alarms.</li>
                  <li><b>Perimeter Geofence:</b> Leaving the hostel boundary starts a 15s grace countdown. Stay within grounds.</li>
                  <li><b>Emergency SOS Button:</b> Tap the red SOS pill anytime if someone is hurt or needs help. It immediately broadcasts location to the host and pauses game.</li>
                  <li>Do not sprint blindly on wet tiles or push near railings!</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
