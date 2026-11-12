import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  ClientGameState,
  Player,
  LatLngWithFloor,
  GameSettings,
  BoundarySettings,
  RedZone,
} from '../../shared/types.js';
import { useSoundEffects } from '../hooks/useSoundEffects.js';
import { useVibration } from '../hooks/useVibration.js';

interface SessionData {
  roomCode: string;
  playerId: string;
  playerName: string;
  avatar: string;
}

interface GameContextType {
  socket: Socket | null;
  gameState: ClientGameState | null;
  roomCode: string | null;
  player: Player | null;
  isConnected: boolean;
  error: string | null;
  activeModal: string | null;
  setActiveModal: (modal: string | null) => void;
  createRoom: (hostName: string, gameName?: string, settings?: Partial<GameSettings>, boundary?: Partial<BoundarySettings>) => Promise<boolean>;
  joinRoom: (roomCode: string, playerName: string, avatar?: string) => Promise<boolean>;
  startGame: () => Promise<boolean>;
  skipHidingPhase: () => Promise<boolean>;
  reportLocation: (location: LatLngWithFloor) => void;
  catchPlayer: (method: 'qr' | 'proximity_tag', qrToken?: string, targetPlayerId?: string) => Promise<{ success: boolean; caughtPlayerName?: string; error?: string }>;
  activateRadarPulse: () => Promise<boolean>;
  completeTask: (taskId: string, code: string) => Promise<boolean>;
  callEmergencyMeeting: () => Promise<boolean>;
  triggerSOS: () => Promise<boolean>;
  resolveSOS: () => Promise<boolean>;
  sendChat: (text: string, channel: 'all' | 'hunters' | 'announcements') => Promise<boolean>;
  addBots: (count?: number) => Promise<boolean>;
  kickPlayer: (targetId: string) => Promise<boolean>;
  updateSettings: (settings: Partial<GameSettings>) => Promise<boolean>;
  updateBoundary: (boundary: BoundarySettings) => Promise<boolean>;
  addRedZone: (zone: RedZone) => Promise<boolean>;
  removeRedZone: (zoneId: string) => Promise<boolean>;
  leaveRoom: () => void;
  clearError: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const SESSION_STORAGE_KEY = 'hostel_hunt_session_v1';

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const sounds = useSoundEffects();
  const vibrations = useVibration();
  const lastLocationSentRef = useRef<number>(0);

  // Initialize socket
  useEffect(() => {
    // Determine socket target URL
    const socketUrl = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '/';
    const s = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    s.on('connect', () => {
      setIsConnected(true);
      // Attempt auto-reconnect if session exists
      const saved = localStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) {
        try {
          const session: SessionData = JSON.parse(saved);
          s.emit('JOIN_ROOM', {
            roomCode: session.roomCode,
            playerName: session.playerName,
            avatar: session.avatar,
            existingPlayerId: session.playerId,
          }, (res: any) => {
            if (res.success) {
              setRoomCode(session.roomCode);
              setPlayer(res.player);
              setGameState(res.state);
            } else {
              localStorage.removeItem(SESSION_STORAGE_KEY);
            }
          });
        } catch (_) {
          localStorage.removeItem(SESSION_STORAGE_KEY);
        }
      }
    });

    s.on('disconnect', () => {
      setIsConnected(false);
    });

    // Authoritative state push from server
    s.on('GAME_STATE_UPDATE', (newState: ClientGameState) => {
      setGameState(newState);
      if (newState.self) {
        setPlayer(newState.self);
      }
    });

    // Game events
    s.on('GAME_STARTED', () => {
      sounds.playRadarPing();
      vibrations.vibrateTap();
    });

    s.on('HUNT_STARTED', () => {
      sounds.playRadarPing();
      vibrations.vibrateDangerAlarm();
    });

    s.on('PLAYER_CAUGHT', (data) => {
      sounds.playCatchSound();
      vibrations.vibrateCatchHit();
    });

    s.on('RED_ZONE_WARNING', () => {
      sounds.playDangerAlarm();
      vibrations.vibrateDangerAlarm();
    });

    s.on('BOUNDARY_VIOLATION', () => {
      sounds.playDangerAlarm();
      vibrations.vibrateDangerAlarm();
    });

    s.on('RADAR_PULSE_ACTIVATED', () => {
      sounds.playRadarPing();
      vibrations.vibrateProximityPulse();
    });

    s.on('EMERGENCY_MEETING_CALLED', () => {
      sounds.playEmergencyMeetingSound();
      vibrations.vibrateDangerAlarm();
    });

    s.on('SOS_TRIGGERED', () => {
      sounds.playDangerAlarm();
      vibrations.vibrateDangerAlarm();
    });

    s.on('GAME_ENDED', (data) => {
      sounds.playVictoryFanfare();
      vibrations.vibrateTap();
    });

    s.on('ROOM_CLOSED', (data: { reason?: string }) => {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      setRoomCode(null);
      setPlayer(null);
      setGameState(null);
      setError(data?.reason || 'Room was closed by the host.');
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  // Heartbeat proximity loop: when hunter is nearby, trigger rhythmic heartbeat audio & pulse
  useEffect(() => {
    if (!gameState || gameState.phase !== 'hunting') return;
    if (gameState.myRole !== 'crewmate' || !gameState.proximityAlert?.active) return;

    const interval = setInterval(() => {
      sounds.playHeartbeat();
      vibrations.vibrateProximityPulse();
    }, 1200);

    return () => clearInterval(interval);
  }, [gameState?.phase, gameState?.myRole, gameState?.proximityAlert?.active]);

  const reportLocation = useCallback((location: LatLngWithFloor) => {
    if (!socket || !roomCode || !player) return;
    const now = Date.now();
    // Throttle location pushes to max once per 1.5 seconds
    if (now - lastLocationSentRef.current < 1500) return;
    lastLocationSentRef.current = now;

    socket.emit('UPDATE_LOCATION', {
      roomCode,
      playerId: player.id,
      location,
    });
  }, [socket, roomCode, player]);

  const createRoom = useCallback(async (
    hostName: string,
    gameName?: string,
    settings?: Partial<GameSettings>,
    boundary?: Partial<BoundarySettings>
  ): Promise<boolean> => {
    if (!socket) return false;
    return new Promise((resolve) => {
      socket.emit('CREATE_ROOM', { hostName, gameName, settings, boundary }, (res: any) => {
        if (res.success) {
          setRoomCode(res.roomCode);
          setPlayer(res.player);
          setGameState(res.state);
          localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
            roomCode: res.roomCode,
            playerId: res.player.id,
            playerName: res.player.name,
            avatar: res.player.avatar,
          }));
          resolve(true);
        } else {
          setError(res.error || 'Failed to create room.');
          resolve(false);
        }
      });
    });
  }, [socket]);

  const joinRoom = useCallback(async (
    code: string,
    playerName: string,
    avatar = '👤'
  ): Promise<boolean> => {
    if (!socket) return false;
    return new Promise((resolve) => {
      socket.emit('JOIN_ROOM', { roomCode: code.toUpperCase().trim(), playerName, avatar }, (res: any) => {
        if (res.success) {
          setRoomCode(code.toUpperCase().trim());
          setPlayer(res.player);
          setGameState(res.state);
          localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
            roomCode: code.toUpperCase().trim(),
            playerId: res.player.id,
            playerName: res.player.name,
            avatar: res.player.avatar,
          }));
          resolve(true);
        } else {
          setError(res.error || 'Failed to join room.');
          resolve(false);
        }
      });
    });
  }, [socket]);

  const startGame = useCallback(async (): Promise<boolean> => {
    if (!socket || !roomCode || !player) return false;
    return new Promise((resolve) => {
      socket.emit('START_GAME', { roomCode, hostId: player.id }, (res: any) => {
        if (res.success) {
          resolve(true);
        } else {
          setError(res.error || 'Failed to start game.');
          resolve(false);
        }
      });
    });
  }, [socket, roomCode, player]);

  const skipHidingPhase = useCallback(async (): Promise<boolean> => {
    if (!socket || !roomCode || !player) return false;
    return new Promise((resolve) => {
      socket.emit('SKIP_HIDING_PHASE', { roomCode, hostId: player.id }, (res: any) => {
        resolve(res.success);
      });
    });
  }, [socket, roomCode, player]);

  const catchPlayer = useCallback(async (
    method: 'qr' | 'proximity_tag',
    qrToken?: string,
    targetPlayerId?: string
  ): Promise<{ success: boolean; caughtPlayerName?: string; error?: string }> => {
    if (!socket || !roomCode || !player) return { success: false, error: 'Not connected' };
    return new Promise((resolve) => {
      socket.emit('CATCH_PLAYER', {
        roomCode,
        hunterId: player.id,
        method,
        qrToken,
        targetPlayerId,
      }, (res: any) => {
        if (!res.success) {
          setError(res.error);
        }
        resolve(res);
      });
    });
  }, [socket, roomCode, player]);

  const activateRadarPulse = useCallback(async (): Promise<boolean> => {
    if (!socket || !roomCode || !player) return false;
    return new Promise((resolve) => {
      socket.emit('ACTIVATE_RADAR_PULSE', { roomCode, hunterId: player.id }, (res: any) => {
        if (res.success) {
          resolve(true);
        } else {
          setError(res.error || 'Radar pulse failed.');
          resolve(false);
        }
      });
    });
  }, [socket, roomCode, player]);

  const completeTask = useCallback(async (taskId: string, code: string): Promise<boolean> => {
    if (!socket || !roomCode || !player) return false;
    return new Promise((resolve) => {
      socket.emit('COMPLETE_TASK', { roomCode, playerId: player.id, taskId, code }, (res: any) => {
        if (res.success) {
          resolve(true);
        } else {
          setError(res.error || 'Task verification failed.');
          resolve(false);
        }
      });
    });
  }, [socket, roomCode, player]);

  const callEmergencyMeeting = useCallback(async (): Promise<boolean> => {
    if (!socket || !roomCode || !player) return false;
    return new Promise((resolve) => {
      socket.emit('CALL_EMERGENCY_MEETING', { roomCode, playerId: player.id }, (res: any) => {
        if (res.success) {
          resolve(true);
        } else {
          setError(res.error || 'Failed to call emergency meeting.');
          resolve(false);
        }
      });
    });
  }, [socket, roomCode, player]);

  const triggerSOS = useCallback(async (): Promise<boolean> => {
    if (!socket || !roomCode || !player) return false;
    return new Promise((resolve) => {
      socket.emit('TRIGGER_SOS', { roomCode, playerId: player.id }, (res: any) => {
        if (res.success) {
          resolve(true);
        } else {
          setError(res.error || 'SOS trigger failed.');
          resolve(false);
        }
      });
    });
  }, [socket, roomCode, player]);

  const resolveSOS = useCallback(async (): Promise<boolean> => {
    if (!socket || !roomCode || !player) return false;
    return new Promise((resolve) => {
      socket.emit('RESOLVE_SOS', { roomCode, hostId: player.id }, (res: any) => {
        resolve(res.success);
      });
    });
  }, [socket, roomCode, player]);

  const sendChat = useCallback(async (
    text: string,
    channel: 'all' | 'hunters' | 'announcements'
  ): Promise<boolean> => {
    if (!socket || !roomCode || !player) return false;
    return new Promise((resolve) => {
      socket.emit('SEND_CHAT', { roomCode, senderId: player.id, text, channel }, (res: any) => {
        resolve(res.success);
      });
    });
  }, [socket, roomCode, player]);

  const addBots = useCallback(async (count = 4): Promise<boolean> => {
    if (!socket || !roomCode || !player) return false;
    return new Promise((resolve) => {
      socket.emit('ADD_BOTS', { roomCode, hostId: player.id, count }, (res: any) => {
        if (res.success) {
          resolve(true);
        } else {
          setError(res.error || 'Failed to add bots.');
          resolve(false);
        }
      });
    });
  }, [socket, roomCode, player]);

  const kickPlayer = useCallback(async (targetId: string): Promise<boolean> => {
    if (!socket || !roomCode || !player) return false;
    return new Promise((resolve) => {
      socket.emit('KICK_PLAYER', { roomCode, hostId: player.id, targetId }, (res: any) => {
        resolve(res.success);
      });
    });
  }, [socket, roomCode, player]);

  const updateSettings = useCallback(async (settings: Partial<GameSettings>): Promise<boolean> => {
    if (!socket || !roomCode || !player) return false;
    return new Promise((resolve) => {
      socket.emit('UPDATE_SETTINGS', { roomCode, hostId: player.id, settings }, (res: any) => {
        resolve(res.success);
      });
    });
  }, [socket, roomCode, player]);

  const updateBoundary = useCallback(async (boundary: BoundarySettings): Promise<boolean> => {
    if (!socket || !roomCode || !player) return false;
    return new Promise((resolve) => {
      socket.emit('UPDATE_BOUNDARY', { roomCode, hostId: player.id, boundary }, (res: any) => {
        resolve(res.success);
      });
    });
  }, [socket, roomCode, player]);

  const addRedZone = useCallback(async (zone: RedZone): Promise<boolean> => {
    if (!socket || !roomCode || !player) return false;
    return new Promise((resolve) => {
      socket.emit('ADD_RED_ZONE', { roomCode, hostId: player.id, zone }, (res: any) => {
        resolve(res.success);
      });
    });
  }, [socket, roomCode, player]);

  const removeRedZone = useCallback(async (zoneId: string): Promise<boolean> => {
    if (!socket || !roomCode || !player) return false;
    return new Promise((resolve) => {
      socket.emit('REMOVE_RED_ZONE', { roomCode, hostId: player.id, zoneId }, (res: any) => {
        resolve(res.success);
      });
    });
  }, [socket, roomCode, player]);

  const leaveRoom = useCallback(() => {
    if (socket && roomCode && player) {
      socket.emit('LEAVE_ROOM', { roomCode, playerId: player.id });
    }
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setRoomCode(null);
    setPlayer(null);
    setGameState(null);
  }, [socket, roomCode, player]);

  const clearError = useCallback(() => setError(null), []);

  return (
    <GameContext.Provider
      value={{
        socket,
        gameState,
        roomCode,
        player,
        isConnected,
        error,
        activeModal,
        setActiveModal,
        createRoom,
        joinRoom,
        startGame,
        skipHidingPhase,
        reportLocation,
        catchPlayer,
        activateRadarPulse,
        completeTask,
        callEmergencyMeeting,
        triggerSOS,
        resolveSOS,
        sendChat,
        addBots,
        kickPlayer,
        updateSettings,
        updateBoundary,
        addRedZone,
        removeRedZone,
        leaveRoom,
        clearError,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

