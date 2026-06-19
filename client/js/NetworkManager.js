export class NetworkManager {
  constructor() {
    this.socket = null;
    this.role = null;
    this.roomCode = null;
    this.connected = false;
    this._handlers = {};
  }

  connect() {
    if (this.socket) return;
    this.socket = window.io();

    this.socket.on('connect', () => {
      this.connected = true;
      console.log('[Net] connesso:', this.socket.id);
      this._emit('connect', { id: this.socket.id });
    });

    this.socket.on('disconnect', (reason) => {
      this.connected = false;
      console.log('[Net] disconnesso:', reason);
      this._emit('disconnect', { reason });
    });

    this.socket.on('error', (payload) => {
      console.error('[Net] errore:', payload);
      this._emit('error', payload);
    });

    this.socket.on('roomCreated', (payload) => {
      this.role = payload.role;
      this.roomCode = payload.code ?? payload.roomCode;
      this._emit('roomCreated', payload);
    });

    this.socket.on('matchStart', (payload) => {
      this.role = payload.role;
      this.roomCode = payload.roomCode;
      this._emit('matchStart', payload);
    });

    this.socket.on('ballState', (p) => this._emit('ballState', p));
    this.socket.on('paddleInput', (p) => this._emit('paddleInput', p));
    this.socket.on('scoreUpdate', (p) => this._emit('scoreUpdate', p));
    this.socket.on('matchEnd', (p) => this._emit('matchEnd', p));
    this.socket.on('opponentLeft', (p) => this._emit('opponentLeft', p));
    this.socket.on('rematch', (p) => this._emit('rematch', p));
    this.socket.on('chaosTrigger', (p) => this._emit('chaosTrigger', p));
    this.socket.on('sfxEvent', (p) => this._emit('sfxEvent', p));
  }

  _emit(name, payload) {
    const cb = this._handlers[name];
    if (cb) cb(payload);
  }

  on(name, cb) {
    this._handlers[name] = cb;
    return this;
  }

  onConnect(cb) { return this.on('connect', cb); }
  onDisconnect(cb) { return this.on('disconnect', cb); }
  onError(cb) { return this.on('error', cb); }
  onRoomCreated(cb) { return this.on('roomCreated', cb); }
  onMatchStart(cb) { return this.on('matchStart', cb); }
  onBallState(cb) { return this.on('ballState', cb); }
  onPaddleInput(cb) { return this.on('paddleInput', cb); }
  onScoreUpdate(cb) { return this.on('scoreUpdate', cb); }
  onMatchEnd(cb) { return this.on('matchEnd', cb); }
  onOpponentLeft(cb) { return this.on('opponentLeft', cb); }
  onRematch(cb) { return this.on('rematch', cb); }

  createRoom() {
    this.socket?.emit('createRoom');
  }

  joinRoom(code) {
    this.socket?.emit('joinRoom', { code });
  }

  sendPaddleY(y) {
    this.socket?.emit('paddleInput', { y });
  }

  sendBallState(state) {
    this.socket?.emit('ballState', state);
  }

  sendScore(score) {
    this.socket?.emit('scoreUpdate', score);
  }

  sendMatchEnd(winner) {
    this.socket?.emit('matchEnd', { winner });
  }

  sendRematch() {
    this.socket?.emit('rematch');
  }

  sendChaosTrigger(payload) {
    this.socket?.emit('chaosTrigger', payload);
  }

  sendSfxEvent(type) {
    this.socket?.emit('sfxEvent', { type });
  }

  leaveRoom() {
    this.socket?.emit('leaveRoom');
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.connected = false;
    this.role = null;
    this.roomCode = null;
  }
}
