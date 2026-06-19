export class Room {
  constructor(id) {
    this.id = id;
    this.players = [];
    this.state = 'waiting';
    this.createdAt = Date.now();
  }

  get host() {
    return this.players[0] ?? null;
  }

  get guest() {
    return this.players[1] ?? null;
  }

  get playerCount() {
    return this.players.length;
  }

  full() {
    return this.players.length >= 2;
  }

  isEmpty() {
    return this.players.length === 0;
  }

  addPlayer(socket) {
    if (this.full()) return false;
    const role = this.players.length === 0 ? 'host' : 'guest';
    this.players.push(socket);
    socket.data.roomId = this.id;
    socket.data.role = role;
    return role;
  }

  removePlayer(socket) {
    const idx = this.players.findIndex((s) => s.id === socket.id);
    if (idx === -1) return false;
    this.players.splice(idx, 1);
    delete socket.data.roomId;
    delete socket.data.role;
    if (this.isEmpty()) this.state = 'ended';
    return true;
  }

  getPlayer(socketId) {
    return this.players.find((s) => s.id === socketId) ?? null;
  }

  getOther(socketId) {
    return this.players.find((s) => s.id !== socketId) ?? null;
  }

  broadcast(event, payload, exceptSocketId = null) {
    for (const s of this.players) {
      if (exceptSocketId && s.id === exceptSocketId) continue;
      s.emit(event, payload);
    }
  }

  relayFrom(senderSocket, event, payload) {
    const other = this.getOther(senderSocket.id);
    if (other) other.emit(event, payload);
  }

  start() {
    if (this.full()) this.state = 'playing';
  }
}
