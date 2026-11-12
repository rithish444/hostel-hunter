import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { GameManager } from './gameManager.js';
import { GameStorage } from './storage.js';
import { registerSocketHandlers } from './socketHandlers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createServer() {
  const app = express();
  const server = http.createServer(app);

  app.use(cors());
  app.use(express.json());

  // Socket.io initialization with CORS
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  const storage = new GameStorage();

  const gameManager = new GameManager(storage, {
    onStateChange: (roomCode) => {
      // Triggered by game events to push updates
      const sockets = io.sockets.adapter.rooms.get(roomCode);
      if (sockets) {
        for (const socketId of sockets) {
          const socket = io.sockets.sockets.get(socketId);
          // If socket has player identity, push custom state
          // Otherwise handled in socketHandlers
        }
      }
    },
    onBroadcastEvent: (roomCode, event, payload) => {
      io.to(roomCode).emit(event, payload);
    },
  });

  registerSocketHandlers(io, gameManager);

  // REST API Endpoints
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'Hostel Hunt Authoritative Server',
      timestamp: Date.now(),
    });
  });

  app.get('/api/matches', (_req, res) => {
    res.json(storage.getMatches());
  });

  app.get('/api/leaderboard', (_req, res) => {
    res.json(storage.getLeaderboard());
  });

  app.get('/api/rooms/:roomCode', (req, res) => {
    const room = gameManager.getRoom(req.params.roomCode);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    res.json({
      roomCode: room.roomCode,
      gameName: room.gameName,
      phase: room.phase,
      playerCount: Object.keys(room.players).length,
    });
  });

  // Serve static assets in production if dist/ exists
  const distPath = path.resolve(__dirname, '../../dist');
  app.use(express.static(distPath));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    const indexPath = path.join(distPath, 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) {
        next();
      }
    });
  });

  return { app, server, io, gameManager, storage };
}

