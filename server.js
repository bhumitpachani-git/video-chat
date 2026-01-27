const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const mediasoup = require('mediasoup');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

let worker;
const rooms = new Map();

const mediaCodecs = [
  {
    kind: 'audio',
    mimeType: 'audio/opus',
    clockRate: 48000,
    channels: 2
  },
  {
    kind: 'video',
    mimeType: 'video/VP8',
    clockRate: 90000
  }
];

async function createWorker() {
  worker = await mediasoup.createWorker({
    logLevel: 'warn',
    rtcMinPort: 10000,
    rtcMaxPort: 10100,
  });
  worker.on('died', () => {
    console.error('MediaSoup worker died, exiting...');
    setTimeout(() => process.exit(1), 2000);
  });
  return worker;
}

async function getOrCreateRoom(roomId, password = null) {
  if (!rooms.has(roomId)) {
    const router = await worker.createRouter({ mediaCodecs });
    rooms.set(roomId, {
      router,
      peers: new Map(),
      password: password, // Store password if provided
      hostId: null, // Track host
      polls: new Map(),
      whiteboard: { strokes: [], background: '#ffffff' },
      notes: ''
    });
    console.log(`Room created: ${roomId} with password: ${!!password}`);
  }
  return rooms.get(roomId);
}

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  let currentRoomId = null;

  socket.on('join-room', async ({ roomId, username, password }, callback) => {
    try {
      let room = rooms.get(roomId);
      
      // If room exists and has password, check it
      if (room && room.password && room.password !== password) {
        return callback({ error: 'Invalid password' });
      }

      // If room doesn't exist, create it (with optional password)
      if (!room) {
        room = await getOrCreateRoom(roomId, password);
      }

      currentRoomId = roomId;

      // Assign host if none exists
      if (!room.hostId) {
        room.hostId = socket.id;
        console.log(`User ${username} (${socket.id}) is now host of room ${roomId}`);
      }

      room.peers.set(socket.id, {
        username,
        transports: new Map(),
        producers: new Map(),
        consumers: new Map(),
        isHost: room.hostId === socket.id
      });

      socket.join(roomId);

      const existingPeers = [];
      room.peers.forEach((peer, peerId) => {
        if (peerId !== socket.id) {
          existingPeers.push({
            socketId: peerId,
            username: peer.username,
            isHost: peerId === room.hostId
          });
        }
      });

      callback({
        rtpCapabilities: room.router.rtpCapabilities,
        peers: existingPeers,
        whiteboard: room.whiteboard,
        notes: room.notes,
        isHost: room.hostId === socket.id
      });

      socket.to(roomId).emit('user-joined', {
        socketId: socket.id,
        username,
        isHost: room.hostId === socket.id
      });

    } catch (error) {
      console.error('Error joining room:', error);
      callback({ error: error.message });
    }
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    if (currentRoomId && rooms.has(currentRoomId)) {
      const room = rooms.get(currentRoomId);
      const peer = room.peers.get(socket.id);
      
      if (peer) {
        room.peers.delete(socket.id);
        socket.to(currentRoomId).emit('user-left', { socketId: socket.id, username: peer.username });

        // Host migration
        if (room.hostId === socket.id) {
          room.hostId = null;
          if (room.peers.size > 0) {
            // Pick next peer as host
            const [nextHostId] = room.peers.keys();
            room.hostId = nextHostId;
            const nextHost = room.peers.get(nextHostId);
            nextHost.isHost = true;
            
            io.to(currentRoomId).emit('host-changed', {
              newHostId: nextHostId,
              username: nextHost.username
            });
            console.log(`Host migrated to ${nextHost.username} (${nextHostId})`);
          }
        }

        if (room.peers.size === 0) {
          rooms.delete(currentRoomId);
          console.log(`Room ${currentRoomId} deleted (empty)`);
        }
      }
    }
  });

  // Basic Mediasoup events would go here (createTransport, connectTransport, produce, consume, etc.)
  // I'm focusing on the password and host logic requested.
});

createWorker().then(() => {
  server.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
});
