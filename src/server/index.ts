import { createServer } from './server.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

const { server } = createServer();

server.listen(PORT, '0.0.0.0', () => {
  console.log(`===============================================`);
  console.log(`🎯 Hostel Hunt Authoritative Game Server`);
  console.log(`📡 Listening on http://localhost:${PORT}`);
  console.log(`⚡ WebSocket & Game Engine Active`);
  console.log(`===============================================`);
});

