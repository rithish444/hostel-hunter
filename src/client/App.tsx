import React, { useState } from 'react';
import { useGame } from './context/GameContext.js';
import { useGeolocation } from './hooks/useGeolocation.js';
import { JoinCreateScreen } from './components/JoinCreateScreen.js';
import { LobbyView } from './components/LobbyView.js';
import { MapView } from './components/MapView.js';
import { HunterHUD } from './components/HunterHUD.js';
import { CrewmateHUD } from './components/CrewmateHUD.js';
import { SpectatorHUD } from './components/SpectatorHUD.js';
import { HostControlPanel } from './components/HostControlPanel.js';
import { QRScannerModal } from './components/QRScannerModal.js';
import { QRCodeDisplayModal } from './components/QRCodeDisplayModal.js';
import { TaskModal } from './components/TaskModal.js';
import { ChatDrawer } from './components/ChatDrawer.js';
import { EmergencyMeetingModal } from './components/EmergencyMeetingModal.js';
import { HowToPlayModal } from './components/HowToPlayModal.js';
import { LeaderboardModal } from './components/LeaderboardModal.js';
import { ResultsView } from './components/ResultsView.js';
import { ExitConfirmationModal } from './components/ExitConfirmationModal.js';
import { Radio, Clock, ShieldAlert, Crosshair, Users, MessageSquare, Settings, LogOut } from 'lucide-react';

export const AppContent: React.FC = () => {
  const {
    gameState,
    roomCode,
    player,
    reportLocation,
    catchPlayer,
    leaveRoom,
    skipHidingPhase,
    callEmergencyMeeting,
  } = useGame();

  // Active modals
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showHostPanel, setShowHostPanel] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showQRDisplay, setShowQRDisplay] = useState(false);
  const [showTasks, setShowTasks] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [catchNotification, setCatchNotification] = useState<string | null>(null);
  const [hunterViewingMap, setHunterViewingMap] = useState<boolean>(false);

  // High-accuracy Geolocation watcher
  const {
    currentLocation,
    currentFloor,
    gpsAccuracy,
    accuracyQuality,
    setFloor,
    nudgeLocation,
  } = useGeolocation({
    defaultCenter: gameState?.boundary?.center || { lat: 11.1005, lng: 76.9683 },
    initialFloor: 0,
    onLocationChange: (loc) => {
      reportLocation(loc);
    },
  });

  // Handle Hunter scanning a target QR code
  const handleScanTarget = async (token: string) => {
    setShowScanner(false);
    const res = await catchPlayer('qr', token);
    if (res.success) {
      setCatchNotification(`🎯 ELIMINATED: ${res.caughtPlayerName || 'Target'}`);
      setTimeout(() => setCatchNotification(null), 4000);
    }
  };

  // 1. Not in a room: Show Join / Host screen
  if (!roomCode || !gameState || !player) {
    return (
      <div className="w-full h-full flex flex-col bg-slate-950 text-slate-100">
        <JoinCreateScreen
          onOpenHowToPlay={() => setShowHowToPlay(true)}
          onOpenLeaderboard={() => setShowLeaderboard(true)}
        />
        {showHowToPlay && <HowToPlayModal onClose={() => setShowHowToPlay(false)} />}
        {showLeaderboard && <LeaderboardModal onClose={() => setShowLeaderboard(false)} />}
      </div>
    );
  }

  // 2. In Room Lobby: Show Lobby View
  if (gameState.phase === 'lobby') {
    return (
      <div className="w-full h-full flex flex-col bg-slate-950 text-slate-100">
        <LobbyView
          onOpenHowToPlay={() => setShowHowToPlay(true)}
          onOpenLeaderboard={() => setShowLeaderboard(true)}
          onOpenHostSettings={() => setShowHostPanel(true)}
        />
        {showHowToPlay && <HowToPlayModal onClose={() => setShowHowToPlay(false)} />}
        {showLeaderboard && <LeaderboardModal onClose={() => setShowLeaderboard(false)} />}
        {showHostPanel && <HostControlPanel onClose={() => setShowHostPanel(false)} />}
      </div>
    );
  }

  // 3. Hiding Phase for Hunters: Hunter Blinded & on Standby Countdown (with map preview & skip options)
  if (gameState.phase === 'hiding' && player.role === 'hunter' && !hunterViewingMap) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 p-6 text-center select-none safe-top safe-bottom">
        <div className="max-w-md w-full space-y-5">
          <div className="relative mx-auto w-24 h-24 rounded-full bg-red-950 border-4 border-red-500/80 flex items-center justify-center shadow-2xl shadow-red-950/80">
            <Radio className="w-12 h-12 text-red-400 animate-spin" />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-widest text-red-400 bg-red-950/80 px-3 py-1 rounded-full border border-red-800">
              ROLE ASSIGNED: HUNTER SQUAD
            </span>
            <h2 className="text-2xl font-black text-slate-100 uppercase tracking-tight">
              Hiding Phase In Progress
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
              Crewmates are scattering and taking cover. Hunters release when timer reaches zero!
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl flex items-center justify-center gap-3">
            <Clock className="w-8 h-8 text-amber-400" />
            <div className="text-4xl font-black font-mono text-amber-400">
              {gameState.remainingSeconds}s
            </div>
          </div>

          {/* Quick action buttons */}
          <div className="flex flex-col gap-2 pt-1">
            <button
              onClick={() => setHunterViewingMap(true)}
              className="w-full bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-white font-bold py-3 rounded-2xl shadow-lg transition flex items-center justify-center gap-2 text-xs"
            >
              <Crosshair className="w-4 h-4" />
              <span>Open Tactical Map Now</span>
            </button>

            {player.isHost && (
              <button
                onClick={() => skipHidingPhase()}
                className="w-full bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-bold py-2.5 rounded-2xl shadow-lg transition flex items-center justify-center gap-2 text-xs"
              >
                <span>⚡ Skip Countdown & Start Hunt</span>
              </button>
            )}

            <button
              onClick={() => setShowExitConfirm(true)}
              className="w-full bg-red-950/80 hover:bg-red-900 active:scale-95 border border-red-700/80 text-red-300 hover:text-white font-bold py-2.5 rounded-2xl transition flex items-center justify-center gap-2 text-xs"
            >
              <LogOut className="w-4 h-4 text-red-400" />
              <span>{player.isHost ? 'Close & Dissolve Room' : 'Exit Match & Return Home'}</span>
            </button>
          </div>

          <div className="flex justify-center gap-3 pt-1">
            <button
              onClick={() => setShowChat(true)}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-xs px-4 py-2 rounded-xl border border-slate-700 text-slate-200"
            >
              <MessageSquare className="w-4 h-4 text-cyan-400" />
              <span>Squad Radio</span>
            </button>
            <button
              onClick={() => setShowHowToPlay(true)}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-xs px-4 py-2 rounded-xl border border-slate-700 text-slate-200"
            >
              <span>Field Manual</span>
            </button>
          </div>
        </div>

        {showChat && <ChatDrawer onClose={() => setShowChat(false)} />}
        {showHowToPlay && <HowToPlayModal onClose={() => setShowHowToPlay(false)} />}
        <ExitConfirmationModal
          isOpen={showExitConfirm}
          isHost={player.isHost}
          roomCode={roomCode || undefined}
          onConfirm={() => {
            setShowExitConfirm(false);
            leaveRoom();
          }}
          onCancel={() => setShowExitConfirm(false)}
        />
      </div>
    );
  }

  // 4. Active Game (Hiding for Crewmates, or Hunt Phase for everyone)
  const isSpectator = player.status === 'caught' || player.status === 'spectator';

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950 overflow-hidden select-none">
      {/* Universal Top HUD Header */}
      <div className="absolute top-0 left-0 right-0 z-[480] bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-4 py-2 flex items-center justify-between safe-top">
        <div className="flex items-center gap-2">
          {/* Role badge */}
          <span
            className={`text-xs font-mono font-black uppercase px-2 py-0.5 rounded-lg border ${
              player.role === 'hunter'
                ? 'bg-red-950 text-red-300 border-red-700'
                : 'bg-cyan-950 text-cyan-300 border-cyan-700'
            }`}
          >
            {player.role}
          </span>

          <span className="text-xs text-slate-400 font-mono">
            {gameState.phase === 'hiding' ? 'HIDING' : 'HUNT'}
          </span>
        </div>

        {/* Synced Countdown Clock */}
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 px-3 py-1 rounded-full text-xs font-mono font-bold">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span className={gameState.remainingSeconds <= 30 ? 'text-red-400 animate-pulse' : 'text-slate-200'}>
            {Math.floor(gameState.remainingSeconds / 60)}:
            {(gameState.remainingSeconds % 60).toString().padStart(2, '0')}
          </span>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowChat(true)}
            className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white"
            title="Tactical Radio"
          >
            <MessageSquare className="w-4 h-4 text-cyan-400" />
          </button>

          {player.isHost && (
            <button
              onClick={() => setShowHostPanel(true)}
              className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-amber-400 hover:text-white"
              title="Host Operations Center"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setShowExitConfirm(true)}
            className="flex items-center gap-1.5 bg-red-950 hover:bg-red-900 active:scale-95 border border-red-600/80 text-red-200 hover:text-white px-2.5 py-1.5 rounded-xl text-xs font-bold transition shadow-lg shadow-red-950/60"
            title={player.isHost ? 'Close Room' : 'Leave Match'}
          >
            <LogOut className="w-3.5 h-3.5 text-red-400" />
            <span>{player.isHost ? 'Close' : 'Exit'}</span>
          </button>
        </div>
      </div>

      {/* Catch Notification Toast */}
      {catchNotification && (
        <div className="absolute top-16 left-4 right-4 z-[500] bg-red-600 text-white font-bold text-xs p-3 rounded-2xl shadow-2xl text-center animate-bounce">
          {catchNotification}
        </div>
      )}

      {/* Full-Screen Interactive Map Canvas */}
      <MapView
        currentLocation={currentLocation}
        currentFloor={currentFloor}
        onFloorChange={setFloor}
        gpsAccuracy={gpsAccuracy}
        accuracyQuality={accuracyQuality}
        onNudgeLocation={nudgeLocation}
      />

      {/* Bottom Floating Tactical HUDs depending on role & status */}
      {gameState.phase === 'hunting' && (
        <>
          {isSpectator ? (
            <SpectatorHUD
              onOpenChat={() => setShowChat(true)}
              onOpenExit={() => setShowExitConfirm(true)}
            />
          ) : player.role === 'hunter' ? (
            <HunterHUD
              onOpenScanner={() => setShowScanner(true)}
              onOpenChat={() => setShowChat(true)}
            />
          ) : (
            <CrewmateHUD
              onShowQR={() => setShowQRDisplay(true)}
              onOpenMeeting={() => callEmergencyMeeting()}
              onOpenChat={() => setShowChat(true)}
            />
          )}
        </>
      )}

      {/* Hiding Phase Banner for Crewmates */}
      {gameState.phase === 'hiding' && player.role === 'crewmate' && (
        <div className="absolute bottom-6 left-4 right-4 z-[450] bg-amber-950/90 border border-amber-500 rounded-2xl p-3 shadow-2xl backdrop-blur-md text-center">
          <div className="text-xs font-bold text-amber-200 uppercase tracking-wide">
            HIDING PHASE: Scatter & Hide!
          </div>
          <div className="text-[11px] text-amber-300 font-mono mt-0.5">
            Hunters release in {gameState.remainingSeconds}s. Take cover in dorms or reading rooms.
          </div>
        </div>
      )}

      {/* Results View Modal */}
      {gameState.phase === 'ended' && <ResultsView onPlayAgain={leaveRoom} />}

      {/* Emergency Meeting Alert */}
      {gameState.phase === 'meeting' && (
        <EmergencyMeetingModal onClose={() => setShowChat(true)} />
      )}

      {/* Modals */}
      {showScanner && (
        <QRScannerModal
          title="Scan Target Crewmate QR"
          subtitle="Point phone at crewmate's identity screen to confirm physical tag"
          onScanSuccess={handleScanTarget}
          onClose={() => setShowScanner(false)}
        />
      )}

      {showQRDisplay && (
        <QRCodeDisplayModal
          token={player.qrCatchToken}
          playerName={player.name}
          onClose={() => setShowQRDisplay(false)}
        />
      )}

      {showTasks && <TaskModal onClose={() => setShowTasks(false)} />}
      {showChat && <ChatDrawer onClose={() => setShowChat(false)} />}
      {showHostPanel && <HostControlPanel onClose={() => setShowHostPanel(false)} />}
      {showHowToPlay && <HowToPlayModal onClose={() => setShowHowToPlay(false)} />}
      {showLeaderboard && <LeaderboardModal onClose={() => setShowLeaderboard(false)} />}

      {/* Universal Exit Confirmation Modal */}
      <ExitConfirmationModal
        isOpen={showExitConfirm}
        isHost={player.isHost}
        roomCode={roomCode || undefined}
        onConfirm={() => {
          setShowExitConfirm(false);
          leaveRoom();
        }}
        onCancel={() => setShowExitConfirm(false)}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return <AppContent />;
};

export default App;

