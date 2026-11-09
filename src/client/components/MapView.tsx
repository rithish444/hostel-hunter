import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { useGame } from '../context/GameContext.js';
import { LatLngWithFloor } from '../../shared/types.js';
import {
  Navigation,
  Compass,
  Layers,
  AlertTriangle,
  Radio,
  Crosshair,
  ShieldAlert,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface MapViewProps {
  currentLocation: LatLngWithFloor;
  currentFloor: number;
  onFloorChange: (floor: number) => void;
  gpsAccuracy: number;
  accuracyQuality: 'high' | 'medium' | 'low';
  onNudgeLocation?: (dLat: number, dLng: number) => void;
}

export const MapView: React.FC<MapViewProps> = ({
  currentLocation,
  currentFloor,
  onFloorChange,
  gpsAccuracy,
  accuracyQuality,
  onNudgeLocation,
}) => {
  const { gameState, player, activateRadarPulse, triggerSOS, setActiveModal } = useGame();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Layer groups for dynamic rendering
  const boundaryLayerRef = useRef<L.LayerGroup | null>(null);
  const redZonesLayerRef = useRef<L.LayerGroup | null>(null);
  const tasksLayerRef = useRef<L.LayerGroup | null>(null);
  const playersLayerRef = useRef<L.LayerGroup | null>(null);
  const radarLayerRef = useRef<L.LayerGroup | null>(null);
  const selfMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);

  const [selectedFloorFilter, setSelectedFloorFilter] = useState<number | 'all'>('all');
  const [showDesktopControls, setShowDesktopControls] = useState<boolean>(false);

  // Initialize Map instance once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [currentLocation.lat, currentLocation.lng],
      zoom: 18,
      zoomControl: false,
      attributionControl: false,
    });

    // Dark tactical CartoDB tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 21,
      className: 'dark-tiles',
    }).addTo(map);

    // Initialize layer groups
    boundaryLayerRef.current = L.layerGroup().addTo(map);
    redZonesLayerRef.current = L.layerGroup().addTo(map);
    tasksLayerRef.current = L.layerGroup().addTo(map);
    playersLayerRef.current = L.layerGroup().addTo(map);
    radarLayerRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Boundary
  useEffect(() => {
    if (!mapInstanceRef.current || !boundaryLayerRef.current || !gameState?.boundary) return;

    boundaryLayerRef.current.clearLayers();
    const b = gameState.boundary;

    if (b.points && b.points.length >= 3) {
      const latlngs = b.points.map((p) => [p.lat, p.lng] as [number, number]);
      L.polygon(latlngs, {
        color: '#10b981',
        weight: 3,
        dashArray: '8, 6',
        fillColor: '#10b981',
        fillOpacity: 0.05,
      }).addTo(boundaryLayerRef.current);
    } else {
      L.circle([b.center.lat, b.center.lng], {
        radius: b.radius,
        color: '#10b981',
        weight: 3,
        dashArray: '8, 6',
        fillColor: '#10b981',
        fillOpacity: 0.05,
      }).addTo(boundaryLayerRef.current);
    }
  }, [gameState?.boundary]);

  // Update Red Zones
  useEffect(() => {
    if (!mapInstanceRef.current || !redZonesLayerRef.current || !gameState?.redZones) return;

    redZonesLayerRef.current.clearLayers();

    gameState.redZones.forEach((zone) => {
      // Respect floor filter
      if (
        selectedFloorFilter !== 'all' &&
        zone.floor !== 'all' &&
        zone.floor !== undefined &&
        zone.floor !== selectedFloorFilter
      ) {
        return;
      }

      const circle = L.circle([zone.center.lat, zone.center.lng], {
        radius: zone.radius,
        color: zone.severity === 'danger' ? '#ef4444' : '#f59e0b',
        fillColor: zone.severity === 'danger' ? '#dc2626' : '#d97706',
        fillOpacity: 0.25,
        weight: 2,
        dashArray: '4, 4',
        className: 'red-zone-polygon',
      });

      const tooltipContent = `
        <div class="text-xs font-bold text-red-400">
          ⚠️ ${zone.name}
          <div class="text-[10px] text-gray-300 font-normal">${zone.description}</div>
          <div class="text-[9px] text-yellow-400">Floor: ${zone.floor === 'all' ? 'All Floors' : `Floor ${zone.floor}`}</div>
        </div>
      `;
      circle.bindTooltip(tooltipContent, { permanent: false, direction: 'top' });
      circle.addTo(redZonesLayerRef.current!);
    });
  }, [gameState?.redZones, selectedFloorFilter]);

  // Update Tasks Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !tasksLayerRef.current || !gameState?.tasks) return;

    tasksLayerRef.current.clearLayers();

    gameState.tasks.forEach((task) => {
      if (selectedFloorFilter !== 'all' && task.floor !== selectedFloorFilter) {
        return;
      }

      const isDone = player?.completedTasks?.includes(task.id);
      const iconHtml = `
        <div class="flex items-center justify-center w-8 h-8 rounded-full border-2 ${
          isDone ? 'bg-emerald-600/80 border-emerald-300' : 'bg-amber-600/80 border-amber-300'
        } shadow-lg text-white font-bold text-xs backdrop-blur-sm">
          ${isDone ? '✓' : '⚡'}
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-task-icon',
        html: iconHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([task.location.lat, task.location.lng], { icon: customIcon });
      marker.bindTooltip(`
        <div class="text-xs">
          <div class="font-bold text-amber-300">${task.title}</div>
          <div class="text-[10px] text-gray-300">${task.description}</div>
          <div class="text-[9px] text-cyan-400 font-mono">Floor ${task.floor} • ${isDone ? 'COMPLETED' : 'PENDING'}</div>
        </div>
      `);
      marker.addTo(tasksLayerRef.current!);
    });
  }, [gameState?.tasks, player?.completedTasks, selectedFloorFilter]);

  // Update Self Marker & Accuracy Ring
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const latlng = [currentLocation.lat, currentLocation.lng] as [number, number];

    if (!selfMarkerRef.current) {
      const selfIcon = L.divIcon({
        className: 'self-player-icon',
        html: `
          <div class="relative flex items-center justify-center w-10 h-10">
            <div class="absolute w-10 h-10 bg-cyan-500/30 rounded-full animate-ping"></div>
            <div class="relative flex items-center justify-center w-8 h-8 bg-cyan-600 border-2 border-cyan-200 rounded-full text-white text-base shadow-xl">
              ${player?.avatar || '📍'}
            </div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      selfMarkerRef.current = L.marker(latlng, { icon: selfIcon, zIndexOffset: 1000 }).addTo(mapInstanceRef.current);

      accuracyCircleRef.current = L.circle(latlng, {
        radius: gpsAccuracy,
        color: '#06b6d4',
        weight: 1,
        fillColor: '#06b6d4',
        fillOpacity: 0.1,
      }).addTo(mapInstanceRef.current);
    } else {
      selfMarkerRef.current.setLatLng(latlng);
      if (accuracyCircleRef.current) {
        accuracyCircleRef.current.setLatLng(latlng);
        accuracyCircleRef.current.setRadius(gpsAccuracy);
      }
    }
  }, [currentLocation, gpsAccuracy, player?.avatar]);

  // Update Other Players & Blurred Radar Targets
  useEffect(() => {
    if (!mapInstanceRef.current || !playersLayerRef.current || !radarLayerRef.current || !gameState) return;

    playersLayerRef.current.clearLayers();
    radarLayerRef.current.clearLayers();

    const isHost = player?.isHost;
    const isSpectator = player?.status === 'caught' || player?.status === 'spectator';
    const isHunter = player?.role === 'hunter';

    // 1. Render Exact Players (for Host, Spectators, or Hunter allies)
    if (gameState.players) {
      gameState.players.forEach((p) => {
        if (p.id === player?.id) return; // Self is handled separately
        if (!p.location) return;

        // Floor filter check
        if (selectedFloorFilter !== 'all' && p.floor !== undefined && p.floor !== selectedFloorFilter) {
          return;
        }

        const isAllyHunter = isHunter && p.role === 'hunter';
        const showExact = isHost || isSpectator || isAllyHunter || gameState.phase === 'ended';

        if (showExact) {
          const roleColor = p.role === 'hunter' ? 'bg-red-600 border-red-300' : 'bg-cyan-600 border-cyan-300';
          const iconHtml = `
            <div class="flex flex-col items-center">
              <div class="flex items-center justify-center w-8 h-8 ${roleColor} border-2 rounded-full shadow-lg text-sm">
                ${p.avatar || '👤'}
              </div>
              <div class="bg-gray-900/90 text-[10px] text-gray-200 px-1.5 py-0.5 rounded mt-0.5 whitespace-nowrap font-mono border border-gray-700">
                ${p.name.slice(0, 10)} (F${p.floor ?? 0})
              </div>
            </div>
          `;

          const pIcon = L.divIcon({
            className: 'other-player-icon',
            html: iconHtml,
            iconSize: [40, 50],
            iconAnchor: [20, 25],
          });

          L.marker([p.location.lat, p.location.lng], { icon: pIcon }).addTo(playersLayerRef.current!);
        }
      });
    }

    // 2. Render Blurred Radar Uncertainty Circles for Hunters
    if (isHunter && gameState.blurredTargets && !isSpectator) {
      gameState.blurredTargets.forEach((target) => {
        if (selectedFloorFilter !== 'all' && target.floor !== selectedFloorFilter) {
          return;
        }

        const isPulse = target.isExact;
        L.circle([target.centroid.lat, target.centroid.lng], {
          radius: target.radiusMeters,
          color: isPulse ? '#f59e0b' : '#dc2626',
          fillColor: isPulse ? '#fbbf24' : '#ef4444',
          fillOpacity: isPulse ? 0.45 : 0.25,
          weight: isPulse ? 3 : 2,
          dashArray: isPulse ? undefined : '6, 6',
          className: 'radar-circle-blur',
        })
          .bindTooltip(`
            <div class="text-xs font-mono font-bold ${isPulse ? 'text-amber-400' : 'text-red-400'}">
              ${isPulse ? '⚡ RADAR PING (ACCURATE)' : '📡 RADAR CONTACT'}
              <div class="text-[10px] text-gray-300 font-normal">Approx Sector • Floor ${target.floor}</div>
            </div>
          `)
          .addTo(radarLayerRef.current!);
      });
    }
  }, [gameState, player, selectedFloorFilter]);

  const recenterMap = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([currentLocation.lat, currentLocation.lng], 18, { animate: true });
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      {/* Leaflet Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Top Map HUD Bar */}
      <div className="absolute top-3 left-3 right-3 z-[400] flex items-center justify-between pointer-events-none">
        {/* GPS Quality Pill */}
        <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 px-3 py-1.5 rounded-full shadow-lg backdrop-blur-md pointer-events-auto">
          <div
            className={`w-2.5 h-2.5 rounded-full animate-pulse ${
              accuracyQuality === 'high'
                ? 'bg-emerald-400'
                : accuracyQuality === 'medium'
                ? 'bg-amber-400'
                : 'bg-red-400'
            }`}
          />
          <span className="text-xs font-mono font-medium text-slate-200">
            GPS ±{Math.round(gpsAccuracy)}m • F{currentFloor}
          </span>
        </div>

        {/* SOS Emergency Trigger */}
        <button
          onClick={() => triggerSOS()}
          className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs px-3.5 py-1.5 rounded-full shadow-lg shadow-red-900/50 border border-red-400 pointer-events-auto transition"
          title="Emergency SOS Broadcast"
        >
          <ShieldAlert className="w-4 h-4 text-white animate-pulse" />
          <span>SOS</span>
        </button>
      </div>

      {/* Floating Floor Selector Pill Bar */}
      <div className="absolute top-14 left-1/2 -translate-x-1/2 z-[400] bg-slate-900/90 border border-slate-700/80 px-2 py-1 rounded-full shadow-xl backdrop-blur-md flex items-center gap-1">
        <span className="text-[10px] text-slate-400 uppercase font-mono px-1">Floor:</span>
        {[0, 1, 2, 3, 4].map((fl) => (
          <button
            key={fl}
            onClick={() => onFloorChange(fl)}
            className={`w-7 h-7 rounded-full text-xs font-bold transition flex items-center justify-center ${
              currentFloor === fl
                ? 'bg-cyan-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            {fl === 0 ? 'G' : `F${fl}`}
          </button>
        ))}
        <div className="w-[1px] h-4 bg-slate-700 mx-1" />
        <button
          onClick={() => setSelectedFloorFilter((prev) => (prev === 'all' ? currentFloor : 'all'))}
          className={`px-2 py-1 rounded-full text-[10px] font-mono transition ${
            selectedFloorFilter === 'all' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
          }`}
          title="Toggle seeing all floors or current floor only"
        >
          {selectedFloorFilter === 'all' ? 'All Floors' : `Only F${selectedFloorFilter}`}
        </button>
      </div>

      {/* Right Map Action Floating Buttons */}
      <div className="absolute bottom-24 right-3 z-[400] flex flex-col gap-2.5">
        {/* Recenter GPS */}
        <button
          onClick={recenterMap}
          className="w-11 h-11 bg-slate-900/90 hover:bg-slate-800 active:scale-95 border border-slate-700 rounded-full shadow-xl flex items-center justify-center text-cyan-400 backdrop-blur-md transition"
          title="Recenter Map"
        >
          <Crosshair className="w-5 h-5" />
        </button>

        {/* Hunter Radar Pulse Power-Up */}
        {player?.role === 'hunter' && gameState?.phase === 'hunting' && (
          <button
            onClick={() => activateRadarPulse()}
            disabled={!player.radarPulsesLeft}
            className={`relative w-11 h-11 rounded-full shadow-xl flex items-center justify-center border backdrop-blur-md transition ${
              player.radarPulsesLeft > 0
                ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-300 shadow-amber-900/50'
                : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
            }`}
            title="Activate Radar Pulse Power-up"
          >
            <Radio className="w-5 h-5 animate-spin-slow" />
            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-mono font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white">
              {player.radarPulsesLeft}
            </span>
          </button>
        )}

        {/* Desktop GPS Simulation Controller Toggle */}
        <button
          onClick={() => setShowDesktopControls(!showDesktopControls)}
          className="w-11 h-11 bg-slate-900/90 hover:bg-slate-800 active:scale-95 border border-slate-700 rounded-full shadow-xl flex items-center justify-center text-slate-300 backdrop-blur-md transition"
          title="Toggle Simulation Movement D-Pad"
        >
          <Navigation className="w-5 h-5" />
        </button>
      </div>

      {/* Desktop Simulation D-Pad for Testing in Browser */}
      {showDesktopControls && onNudgeLocation && (
        <div className="absolute bottom-24 left-3 z-[400] bg-slate-900/95 border border-slate-700 p-2 rounded-2xl shadow-2xl backdrop-blur-lg flex flex-col items-center gap-1">
          <div className="text-[9px] font-mono text-cyan-400 uppercase font-bold tracking-wider mb-1">
            Simulate Walk
          </div>
          <button
            onClick={() => onNudgeLocation(0.0001, 0)}
            className="w-9 h-9 bg-slate-800 hover:bg-slate-700 active:scale-90 rounded-lg flex items-center justify-center text-slate-100 shadow"
            title="Walk North"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
          <div className="flex gap-1">
            <button
              onClick={() => onNudgeLocation(0, -0.0001)}
              className="w-9 h-9 bg-slate-800 hover:bg-slate-700 active:scale-90 rounded-lg flex items-center justify-center text-slate-100 shadow"
              title="Walk West"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNudgeLocation(-0.0001, 0)}
              className="w-9 h-9 bg-slate-800 hover:bg-slate-700 active:scale-90 rounded-lg flex items-center justify-center text-slate-100 shadow"
              title="Walk South"
            >
              <ArrowDown className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNudgeLocation(0, 0.0001)}
              className="w-9 h-9 bg-slate-800 hover:bg-slate-700 active:scale-90 rounded-lg flex items-center justify-center text-slate-100 shadow"
              title="Walk East"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
