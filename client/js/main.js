import { NetworkManager } from './NetworkManager.js';

const net = new NetworkManager();

net.onConnect(({ id }) => console.log('[Main] connesso al server:', id));
net.onDisconnect(({ reason }) => console.log('[Main] disconnesso:', reason));
net.onError((err) => console.error('[Main] errore rete:', err));
net.onRoomCreated((p) => console.log('[Main] stanza creata:', p));
net.onMatchStart((p) => console.log('[Main] match inizia - ruolo:', p.role));
net.onBallState((s) => console.log('[Main] ballState:', s));
net.onPaddleInput((p) => console.log('[Main] paddleInput:', p));
net.onScoreUpdate((s) => console.log('[Main] score:', s));
net.onMatchEnd((p) => console.log('[Main] match finito:', p));
net.onOpponentLeft(() => console.log('[Main] avversario uscito'));
net.onRematch(() => console.log('[Main] rematch richiesto'));

net.connect();

window.__hostelPong = { net };
