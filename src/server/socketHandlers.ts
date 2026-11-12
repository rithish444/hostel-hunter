import { Server, Socket } from 'socket.io';
import { GameManager } from './gameManager.js';
import { LatLngWithFloor, RedZone, BoundarySettings, GameSettings } from '../shared/types.js';

interface SocketSession {
  roomCode?: string;
  playerId?: string;
}

export function registerSocketHandlers(io: Server, gameManager: GameManager): void {
  // Store socket to player mapping
  const socketMap = new Map<string, SocketSession>();

  // Helper to broadcast personalized states to all clients in a room
  const broadcastRoomStates = (roomCode: string) => {
    const room = gameManager.getRoom(roomCode);
    if (!room) return;

    // Iterate through all connected sockets in room
    const sockets = io.sockets.adapter.rooms.get(roomCode);
    if (!sockets) return;

    for (const socketId of sockets) {
      const session = socketMap.get(socketId);
      if (session && session.playerId) {
        const clientState = gameManager.generateClientState(roomCode, session.playerId);
        if (clientState) {
          io.to(socketId).emit('GAME_STATE_UPDATE', clientState);
        }
      }
    }
  };

  io.on('connection', (socket: Socket) => {
    socketMap.set(socket.id, {});

    // Create room
    socket.on('CREATE_ROOM', (data: { hostName: string; gameName?: string; settings?: Partial<GameSettings>; boundary?: Partial<BoundarySettings> }, callback) => {
      try {
        const { room, hostPlayer } = gameManager.createRoom(
          data.hostName,
          data.gameName,
          data.settings,
          data.boundary
        );

        socketMap.set(socket.id, { roomCode: room.roomCode, playerId: hostPlayer.id });
        socket.join(room.roomCode);

        const clientState = gameManager.generateClientState(room.roomCode, hostPlayer.id);
        callback?.({ success: true, roomCode: room.roomCode, player: hostPlayer, state: clientState });
      } catch (err: any) {
        callback?.({ success: false, error: err.message || 'Failed to create room.' });
      }
    });

    // Join room
    socket.on('JOIN_ROOM', (data: { roomCode: string; playerName: string; avatar?: string; existingPlayerId?: string }, callback) => {
      try {
        const room = gameManager.getRoom(data.roomCode);
        if (!room) {
          callback?.({ success: false, error: 'Room not found.' });
          return;
        }

        // Reconnect existing player if ID provided
        if (data.existingPlayerId && room.players[data.existingPlayerId]) {
          const player = room.players[data.existingPlayerId];
          player.status = player.status === 'disconnected' ? 'alive' : player.status;

          socketMap.set(socket.id, { roomCode: room.roomCode, playerId: player.id });
          socket.join(room.roomCode);

          const clientState = gameManager.generateClientState(room.roomCode, player.id);
          callback?.({ success: true, player, state: clientState, reconnected: true });
          broadcastRoomStates(room.roomCode);
          return;
        }

        const result = gameManager.joinRoom(data.roomCode, data.playerName, data.avatar);
        if (!result.success || !result.player) {
          callback?.({ success: false, error: result.error });
          return;
        }

        socketMap.set(socket.id, { roomCode: room.roomCode, playerId: result.player.id });
        socket.join(room.roomCode);

        const clientState = gameManager.generateClientState(room.roomCode, result.player.id);
        callback?.({ success: true, player: result.player, state: clientState });
        broadcastRoomStates(room.roomCode);
      } catch (err: any) {
        callback?.({ success: false, error: err.message || 'Failed to join room.' });
      }
    });

    // Location update from client
    socket.on('UPDATE_LOCATION', (data: { roomCode: string; playerId: string; location: LatLngWithFloor }) => {
      gameManager.updatePlayerLocation(data.roomCode, data.playerId, data.location);
      broadcastRoomStates(data.roomCode);
    });

    // Start game
    socket.on('START_GAME', (data: { roomCode: string; hostId: string }, callback) => {
      const result = gameManager.startGame(data.roomCode, data.hostId);
      callback?.(result);
      if (result.success) {
        broadcastRoomStates(data.roomCode);
      }
    });

    // Skip hiding phase (instant hunt start)
    socket.on('SKIP_HIDING_PHASE', (data: { roomCode: string; hostId: string }, callback) => {
      const success = gameManager.skipHidingPhase(data.roomCode, data.hostId);
      callback?.({ success });
      if (success) {
        broadcastRoomStates(data.roomCode);
      }
    });

    // Catch player
    socket.on('CATCH_PLAYER', (data: { roomCode: string; hunterId: string; method: 'qr' | 'proximity_tag'; qrToken?: string; targetPlayerId?: string }, callback) => {
      const result = gameManager.catchPlayer(
        data.roomCode,
        data.hunterId,
        data.method,
        data.qrToken,
        data.targetPlayerId
      );
      callback?.(result);
      if (result.success) {
        broadcastRoomStates(data.roomCode);
      }
    });

    // Radar pulse power-up
    socket.on('ACTIVATE_RADAR_PULSE', (data: { roomCode: string; hunterId: string }, callback) => {
      const result = gameManager.activateRadarPulse(data.roomCode, data.hunterId);
      callback?.(result);
      if (result.success) {
        broadcastRoomStates(data.roomCode);
      }
    });

    // Complete task
    socket.on('COMPLETE_TASK', (data: { roomCode: string; playerId: string; taskId: string; code: string }, callback) => {
      const result = gameManager.completeTask(data.roomCode, data.playerId, data.taskId, data.code);
      callback?.(result);
      if (result.success) {
        broadcastRoomStates(data.roomCode);
      }
    });

    // Emergency meeting
    socket.on('CALL_EMERGENCY_MEETING', (data: { roomCode: string; playerId: string }, callback) => {
      const result = gameManager.callEmergencyMeeting(data.roomCode, data.playerId);
      callback?.(result);
      if (result.success) {
        broadcastRoomStates(data.roomCode);
      }
    });

    // SOS alert
    socket.on('TRIGGER_SOS', (data: { roomCode: string; playerId: string }, callback) => {
      const result = gameManager.triggerSOS(data.roomCode, data.playerId);
      callback?.(result);
      if (result.success) {
        broadcastRoomStates(data.roomCode);
      }
    });

    socket.on('RESOLVE_SOS', (data: { roomCode: string; hostId: string }, callback) => {
      const success = gameManager.resolveSOS(data.roomCode, data.hostId);
      callback?.({ success });
      if (success) {
        broadcastRoomStates(data.roomCode);
      }
    });

    // Chat message
    socket.on('SEND_CHAT', (data: { roomCode: string; senderId: string; text: string; channel: 'all' | 'hunters' | 'announcements' }, callback) => {
      const result = gameManager.sendChatMessage(data.roomCode, data.senderId, data.text, data.channel);
      callback?.(result);
      if (result.success) {
        broadcastRoomStates(data.roomCode);
      }
    });

    // Host controls: add bots
    socket.on('ADD_BOTS', (data: { roomCode: string; hostId: string; count?: number }, callback) => {
      const result = gameManager.addBots(data.roomCode, data.hostId, data.count || 4);
      callback?.(result);
      if (result.success) {
        broadcastRoomStates(data.roomCode);
      }
    });

    // Host controls: kick player
    socket.on('KICK_PLAYER', (data: { roomCode: string; hostId: string; targetId: string }, callback) => {
      const success = gameManager.kickPlayer(data.roomCode, data.hostId, data.targetId);
      callback?.({ success });
      if (success) {
        broadcastRoomStates(data.roomCode);
      }
    });

    // Host controls: update settings
    socket.on('UPDATE_SETTINGS', (data: { roomCode: string; hostId: string; settings: Partial<GameSettings> }, callback) => {
      const success = gameManager.updateSettings(data.roomCode, data.hostId, data.settings);
      callback?.({ success });
      if (success) {
        broadcastRoomStates(data.roomCode);
      }
    });

    // Host controls: update boundary
    socket.on('UPDATE_BOUNDARY', (data: { roomCode: string; hostId: string; boundary: BoundarySettings }, callback) => {
      const success = gameManager.updateBoundary(data.roomCode, data.hostId, data.boundary);
      callback?.({ success });
      if (success) {
        broadcastRoomStates(data.roomCode);
      }
    });

    // Host controls: add red zone
    socket.on('ADD_RED_ZONE', (data: { roomCode: string; hostId: string; zone: RedZone }, callback) => {
      const success = gameManager.addRedZone(data.roomCode, data.hostId, data.zone);
      callback?.({ success });
      if (success) {
        broadcastRoomStates(data.roomCode);
      }
    });

    // Host controls: remove red zone
    socket.on('REMOVE_RED_ZONE', (data: { roomCode: string; hostId: string; zoneId: string }, callback) => {
      const success = gameManager.removeRedZone(data.roomCode, data.hostId, data.zoneId);
      callback?.({ success });
      if (success) {
        broadcastRoomStates(data.roomCode);
      }
    });

    // Leave / Close Room
    socket.on('LEAVE_ROOM', (data: { roomCode: string; playerId: string }, callback) => {
      const result = gameManager.leaveOrCloseRoom(data.roomCode, data.playerId);
      socket.leave(data.roomCode);
      socketMap.set(socket.id, {});
      callback?.(result);
      if (!result.isHostClosed) {
        broadcastRoomStates(data.roomCode);
      }
    });

    // Disconnect handling
    socket.on('disconnect', () => {
      const session = socketMap.get(socket.id);
      if (session && session.roomCode && session.playerId) {
        const room = gameManager.getRoom(session.roomCode);
        if (room && room.players[session.playerId]) {
          const player = room.players[session.playerId];
          // If in lobby, remove player; if during active game, mark as disconnected for reconnect
          if (room.phase === 'lobby') {
            delete room.players[session.playerId];
          } else {
            player.status = 'disconnected';
          }
          broadcastRoomStates(session.roomCode);
        }
      }
      socketMap.delete(socket.id);
    });
  });
}

