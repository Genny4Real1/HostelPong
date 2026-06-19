import { NetworkManager } from './NetworkManager.js';

const net = new NetworkManager();

const state = {
  screen: 'menu',
  role: null,
  roomCode: null,
  localRematchPressed: false,
  opponentRematchPressed: false,
  game: null,
  renderer: null,
  input: null
};

const dom = {
  canvas: document.getElementById('game'),
  screens: {
    menu: document.getElementById('screen-menu'),
    lobby: document.getElementById('screen-lobby'),
    game: document.getElementById('screen-game'),
    endgame: document.getElementById('screen-endgame')
  },
  btnCreate: document.getElementById('btn-create'),
  btnJoin: document.getElementById('btn-join'),
  joinCode: document.getElementById('join-code'),
  menuError: document.getElementById('menu-error'),
  lobbyCode: document.getElementById('lobby-code'),
  qrcode: document.getElementById('qrcode'),
  btnLobbyBack: document.getElementById('btn-lobby-back'),
  scoreP1: document.getElementById('score-p1'),
  scoreP2: document.getElementById('score-p2'),
  resultText: document.getElementById('result-text'),
  btnRematch: document.getElementById('btn-rematch'),
  rematchStatus: document.getElementById('rematch-status')
};

function showScreen(name) {
  state.screen = name;
  for (const key of Object.keys(dom.screens)) {
    dom.screens[key].classList.toggle('active', key === name);
  }
}

function setMenuError(msg) {
  dom.menuError.textContent = msg || '';
}

function generateQR(code) {
  dom.qrcode.innerHTML = '';
  const joinUrl = `${location.origin}${location.pathname}?code=${code}`;
  if (typeof window.QRCode === 'function') {
    new window.QRCode(dom.qrcode, {
      text: joinUrl,
      width: 180,
      height: 180,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: window.QRCode.CorrectLevel ? window.QRCode.CorrectLevel.M : 1
    });
  }
}

function resetScoreHud() {
  dom.scoreP1.textContent = '0';
  dom.scoreP2.textContent = '0';
}

function updateScoreHud(score) {
  if (!score) return;
  if (score.p1 !== undefined) dom.scoreP1.textContent = String(score.p1);
  if (score.p2 !== undefined) dom.scoreP2.textContent = String(score.p2);
}

function startMatch() {
  state.localRematchPressed = false;
  state.opponentRematchPressed = false;
  dom.rematchStatus.textContent = '';
  resetScoreHud();
  showScreen('game');

  if (state.game && typeof state.game.reset === 'function') {
    state.game.reset();
    if (state.role === 'host' && typeof state.game.start === 'function') {
      state.game.start();
    }
  }
}

function endMatch(winner) {
  const isWin = (state.role === 'host' && winner === 'p1') ||
                (state.role === 'guest' && winner === 'p2');
  dom.resultText.textContent = isWin ? 'WIN' : 'LOSE';
  dom.resultText.className = `result ${isWin ? 'win' : 'lose'}`;
  dom.rematchStatus.textContent = '';
  showScreen('endgame');
}

function requestRematch() {
  state.localRematchPressed = true;
  dom.rematchStatus.innerHTML = '<span class="dot"></span>In attesa dell\'avversario...';
  net.sendRematch();
  if (state.opponentRematchPressed) startMatch();
}

function handleOpponentRematch() {
  state.opponentRematchPressed = true;
  if (state.localRematchPressed) {
    startMatch();
  } else {
    dom.rematchStatus.textContent = 'Avversario pronto! Premi Rematch';
  }
}

function leaveToMenu(message) {
  state.role = null;
  state.roomCode = null;
  state.localRematchPressed = false;
  state.opponentRematchPressed = false;
  state.game = null;
  state.renderer = null;
  state.input = null;
  dom.joinCode.value = '';
  setMenuError(message || '');
  showScreen('menu');
}

net.onConnect(({ id }) => {
  console.log('[Main] connesso al server:', id);
});

net.onDisconnect(({ reason }) => {
  console.log('[Main] disconnesso:', reason);
  leaveToMenu('Connessione persa');
});

net.onError((err) => {
  console.error('[Main] errore rete:', err);
  const msg = err && err.message ? err.message : 'Errore di rete';
  if (state.screen === 'menu') setMenuError(msg);
});

net.onRoomCreated((payload) => {
  state.role = payload.role;
  state.roomCode = payload.code ?? payload.roomCode;
  dom.lobbyCode.textContent = state.roomCode;
  generateQR(state.roomCode);
  setMenuError('');
  showScreen('lobby');
});

net.onMatchStart((payload) => {
  state.role = payload.role;
  state.roomCode = payload.roomCode;
  startMatch();
});

net.onScoreUpdate((score) => {
  updateScoreHud(score);
});

net.onMatchEnd((payload) => {
  endMatch(payload.winner);
});

net.onOpponentLeft(() => {
  leaveToMenu('L\'avversario ha abbandonato');
});

net.onRematch(() => {
  handleOpponentRematch();
});

dom.btnCreate.addEventListener('click', () => {
  setMenuError('');
  net.createRoom();
});

dom.btnJoin.addEventListener('click', () => {
  const code = dom.joinCode.value.trim();
  if (!/^\d{4}$/.test(code)) {
    setMenuError('Inserisci un codice di 4 cifre');
    return;
  }
  setMenuError('Connessione alla stanza...');
  net.joinRoom(code);
});

dom.joinCode.addEventListener('input', () => {
  dom.joinCode.value = dom.joinCode.value.replace(/\D/g, '').slice(0, 4);
});

dom.joinCode.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') dom.btnJoin.click();
});

dom.btnLobbyBack.addEventListener('click', () => {
  net.leaveRoom();
  leaveToMenu('');
});

dom.btnRematch.addEventListener('click', () => {
  requestRematch();
});

function applyUrlAutoJoin() {
  const params = new URLSearchParams(location.search);
  const code = params.get('code');
  if (code && /^\d{4}$/.test(code)) {
    dom.joinCode.value = code;
    history.replaceState({}, '', location.pathname);
  }
}

applyUrlAutoJoin();
net.connect();

window.__hostelPong = { net, state, dom, startMatch, endMatch };
