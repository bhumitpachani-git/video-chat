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
        console.log(`[Host] Initial assignment: ${username} (${socket.id})`);
      }

      const isUserHost = room.hostId === socket.id;
      room.peers.set(socket.id, {
        username,
        transports: new Map(),
        producers: new Map(),
        consumers: new Map(),
        isHost: isUserHost,
        joinedAt: Date.now()
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
        polls: Array.from(room.polls.values()),
        isHost: isUserHost
      });

      // Notify others about the new peer with correct host status
      socket.to(roomId).emit('user-joined', {
        socketId: socket.id,
        username,
        isHost: isUserHost
      });

    } catch (error) {
      console.error('Error joining room:', error);
      callback({ error: error.message });
    }
  });

  socket.on('mute-participant', ({ roomId, targetSocketId, kind }, callback) => {
    try {
      const room = rooms.get(roomId);
      if (!room) throw new Error('Room not found');
      if (room.hostId !== socket.id) throw new Error('Only host can mute participants');

      io.to(targetSocketId).emit('force-mute', { kind });
      callback({ success: true });
    } catch (error) {
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
            // Pick the peer who joined first among the remaining peers
            let oldestPeerId = null;
            let oldestJoinTime = Infinity;
            
            for (const [peerId, p] of room.peers.entries()) {
              if (p.joinedAt < oldestJoinTime) {
                oldestJoinTime = p.joinedAt;
                oldestPeerId = peerId;
              }
            }
            
            if (oldestPeerId) {
              room.hostId = oldestPeerId;
              const nextHost = room.peers.get(oldestPeerId);
              nextHost.isHost = true;
              
              io.to(currentRoomId).emit('host-changed', {
                newHostId: oldestPeerId,
                username: nextHost.username
              });
              console.log(`Host migrated to ${nextHost.username} (${oldestPeerId}) - oldest participant`);
            }
          }
        }

        if (room.peers.size === 0) {
          rooms.delete(currentRoomId);
          console.log(`Room ${currentRoomId} deleted (empty)`);
        }
      }
    }
  });

  socket.on('send-chat-message', ({ roomId, message, toSocketId }) => {
    try {
      const room = rooms.get(roomId);
      if (!room) return;

      const peer = room.peers.get(socket.id);
      if (!peer) return;

      const chatMsg = {
        id: Math.random().toString(36).substr(2, 9),
        socketId: socket.id,
        username: peer.username,
        message,
        timestamp: Date.now(),
        toSocketId // null for public, socketId for private
      };

      if (toSocketId) {
        // Private message
        io.to(toSocketId).emit('chat-message', chatMsg);
        socket.emit('chat-message', chatMsg); // Send back to sender
      } else {
        // Public message
        io.to(roomId).emit('chat-message', chatMsg);
      }
    } catch (error) {
      console.error('Error sending chat message:', error);
    }
  });
});

createWorker().then(() => {
  server.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
});
