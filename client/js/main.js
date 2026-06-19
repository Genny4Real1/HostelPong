const socket = window.io?.();

if (socket) {
  socket.on('connect', () => {
    console.log('[Net] connesso al server:', socket.id);
  });
  socket.on('disconnect', (reason) => {
    console.log('[Net] disconnesso:', reason);
  });
} else {
  console.error('[Net] Socket.io client non disponibile');
}
