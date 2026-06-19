import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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

io.on('connection', (socket) => {
  console.log(`[Socket] connesso: ${socket.id}`);

  socket.on('disconnect', (reason) => {
    console.log(`[Socket] disconnesso: ${socket.id} (${reason})`);
  });
});

server.listen(PORT, () => {
  console.log(`[HostelPong] server in ascolto su http://localhost:${PORT}`);
});

export { app, server, io };
