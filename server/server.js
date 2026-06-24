import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Room } from './Room.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;
const CLIENT_DIR = join(__dirname, '..', 'client');

app.use(cors());
app.use(express.static(CLIENT_DIR));

app.get('*', (req, res) => {
  res.sendFile(join(CLIENT_DIR, 'index.html'));
});

const rooms = new Map();

function generateRoomCode() {
  for (let attempt = 0; attempt < 1000; attempt++) {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    if (!rooms.has(code)) return code;
  }
  throw new Error('Impossibile generare un codice stanza univoco');
}

function getRoomByCode(code) {
  return rooms.get(code) ?? null;
}

function findRoomBySocket(socket) {
  const code = socket.data.roomId;
  return code ? (rooms.get(code) ?? null) : null;
}

function cleanupRoom(room) {
  if (room && room.isEmpty()) {
    rooms.delete(room.id);
  }
}

const RELAY_EVENTS = [
  'ballState',
  'scoreUpdate',
  'matchEnd',
  'chaosTrigger',
  'sfxEvent',
  'paddleInput',
  'rematch'
];

io.on('connection', (socket) => {
  console.log(`[Socket] connesso: ${socket.id}`);

  socket.on('createRoom', () => {
    if (socket.data.roomId) {
      socket.emit('error', { message: 'Già in una stanza' });
      return;
    }
    const code = generateRoomCode();
    const room = new Room(code);
    const role = room.addPlayer(socket);
    rooms.set(code, room);
    console.log(`[Room] creata ${code} da ${socket.id} (host)`);
    socket.emit('roomCreated', { code, role, roomCode: code });
  });

  socket.on('joinRoom', ({ code } = {}) => {
    if (socket.data.roomId) {
      socket.emit('error', { message: 'Già in una stanza' });
      return;
    }
    if (!code) {
      socket.emit('error', { message: 'Codice stanza mancante' });
      return;
    }
    const room = getRoomByCode(code);
    if (!room) {
      socket.emit('error', { message: 'Stanza non trovata' });
      return;
    }
    if (room.full()) {
      socket.emit('error', { message: 'Stanza piena' });
      return;
    }
    const role = room.addPlayer(socket);
    room.start();
    const host = room.host;
    const guest = room.guest;
    console.log(`[Room] ${socket.id} si è unito a ${code} (guest) - match inizia`);

    host.emit('matchStart', {
      role: 'host',
      opponentId: guest.id,
      roomCode: code
    });
    guest.emit('matchStart', {
      role: 'guest',
      opponentId: host.id,
      roomCode: code
    });
  });

  for (const eventName of RELAY_EVENTS) {
    socket.on(eventName, (payload) => {
      const room = findRoomBySocket(socket);
      if (!room) return;
      if (room.state !== 'playing' && eventName !== 'rematch' && eventName !== 'matchEnd') return;
      room.relayFrom(socket, eventName, payload);
    });
  }

  socket.on('leaveRoom', () => {
    const room = findRoomBySocket(socket);
    if (!room) return;
    const other = room.getOther(socket.id);
    room.removePlayer(socket);
    if (other) other.emit('opponentLeft', { roomCode: room.id });
    cleanupRoom(room);
    console.log(`[Socket] ${socket.id} ha lasciato la stanza`);
  });

  socket.on('disconnect', (reason) => {
    console.log(`[Socket] disconnesso: ${socket.id} (${reason})`);
    const room = findRoomBySocket(socket);
    if (!room) return;
    const other = room.getOther(socket.id);
    room.removePlayer(socket);
    if (other) other.emit('opponentLeft', { roomCode: room.id });
    cleanupRoom(room);
  });
});

server.listen(PORT, () => {
  console.log(`[HostelPong] server in ascolto su http://localhost:${PORT}`);
});

export { app, server, io };
