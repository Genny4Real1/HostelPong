import { NetworkManager } from './NetworkManager.js';
import { Game } from './Game.js';
import { Renderer } from './Renderer.js';
import { TouchDragInput } from './TouchDragInput.js';
import { AudioManager } from './AudioManager.js';

const net = new NetworkManager();
const audio = new AudioManager();

const BROADCAST_HZ = 30;
let rafId = null;
let lastTime = 0;
let broadcastAcc = 0;

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
  btnMute: document.getElementById('btn-mute'),
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

function frame(now) {
  if (state.screen !== 'game') {
    rafId = null;
    return;
  }
  const dt = Math.min((now - lastTime) / 1000, 1 / 30);
  lastTime = now;
  const game = state.game;
  if (game) {
    game.update(dt);
    if (state.role === 'host') {
      flushEvents(game);
      broadcastAcc += dt;
      if (broadcastAcc >= 1 / BROADCAST_HZ) {
        broadcastAcc = 0;
        net.sendBallState(game.getSnapshot());
      }
    }
    if (state.renderer) {
      const viewport = computeViewport(game);
      state.renderer.draw(game.getSnapshot(), viewport);
    }
  }
  rafId = requestAnimationFrame(frame);
}

function computeViewport(game) {
  const chaos = game.chaos;
  if (!chaos || !chaos.effect || !chaos.expiresAt) return {};
  const now = Date.now();
  if (chaos.expiresAt <= now) return {};
  if (chaos.effect !== 'screenShake') return {};
  if (chaos.target !== game.localKey) return {};
  const remaining = (chaos.expiresAt - now) / 1000;
  const intensity = Math.min(1, remaining / 0.5);
  const magnitude = 14 * intensity;
  return {
    shakeX: (Math.random() * 2 - 1) * magnitude,
    shakeY: (Math.random() * 2 - 1) * magnitude
  };
}

function flushEvents(game) {
  const events = game.consumeEvents();
  for (const ev of events) {
    if (ev.type === 'score') {
      updateScoreHud(ev.scores);
      net.sendScore(ev.scores);
    } else if (ev.type === 'matchEnd') {
      net.sendMatchEnd(ev.winner);
      endMatch(ev.winner);
    } else if (ev.type === 'paddleHit') {
      audio.blip();
      audio.vibrate(50);
      net.sendSfxEvent('paddleHit');
    } else if (ev.type === 'wallHit') {
      audio.bloop();
      net.sendSfxEvent('wallHit');
    } else if (ev.type === 'chaosTrigger') {
      audio.crash();
      audio.vibrate(80);
      net.sendChaosTrigger({ effect: ev.effect, target: ev.target, durationMs: ev.durationMs });
      net.sendSfxEvent('chaosTrigger');
    }
  }
}

function startLoop() {
  lastTime = performance.now();
  broadcastAcc = 0;
  rafId = requestAnimationFrame(frame);
}

function stopLoop() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
}

function buildCoordinateMap() {
  const renderer = state.renderer;
  const canvas = dom.canvas;
  return (clientY) => {
    if (!renderer) return clientY;
    const rect = canvas.getBoundingClientRect();
    const t = renderer.getTransform();
    const cssY = (clientY - rect.top) * (canvas.height / rect.height);
    return (cssY - t.offsetY) / t.scale;
  };
}

function handlePaddleMove(y) {
  const game = state.game;
  if (!game) return;
  const key = game.localKey;
  game.setPaddleY(key, y);
  if (state.role === 'guest') net.sendPaddleY(y);
}

function startMatch() {
  state.localRematchPressed = false;
  state.opponentRematchPressed = false;
  dom.rematchStatus.textContent = '';
  resetScoreHud();
  showScreen('game');

  stopLoop();
  if (state.input) { state.input.detach(); state.input = null; }
  state.game = new Game({ role: state.role });
  if (!state.renderer) state.renderer = new Renderer(dom.canvas);
  state.renderer.resize();
  state.game.reset();
  if (state.role === 'host') state.game.start();

  state.input = new TouchDragInput();
  state.input.attach(dom.canvas);
  state.input.setBounds({
    fieldHeight: state.game.field.h,
    paddleHeight: state.game.paddles.p1.h
  });
  state.input.setCoordinateMap(buildCoordinateMap());
  state.input.onMove(handlePaddleMove);

  audio.init();

  startLoop();
}

function endMatch(winner) {
  if (state.input) { state.input.detach(); state.input = null; }
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
  stopLoop();
  if (state.input) { state.input.detach(); state.input = null; }
  state.role = null;
  state.roomCode = null;
  state.localRematchPressed = false;
  state.opponentRematchPressed = false;
  state.game = null;
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

net.onBallState((snapshot) => {
  if (state.game && state.role === 'guest') state.game.applySnapshot(snapshot);
});

net.onPaddleInput((payload) => {
  if (state.game && state.role === 'host' && typeof payload.y === 'number') {
    state.game.setPaddleY(state.game.opponentKey, payload.y);
  }
});

net.onScoreUpdate((score) => {
  updateScoreHud(score);
});

net.onChaosTrigger((payload) => {
  audio.crash();
  audio.vibrate(80);
});

net.onSfxEvent((payload) => {
  const type = payload && payload.type;
  if (type === 'paddleHit') { audio.blip(); audio.vibrate(50); }
  else if (type === 'wallHit') { audio.bloop(); }
  else if (type === 'chaosTrigger') { audio.crash(); audio.vibrate(80); }
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

function updateMuteIcon() {
  if (!dom.btnMute) return;
  dom.btnMute.textContent = audio.isMuted() ? '🔇' : '🔊';
  dom.btnMute.setAttribute('aria-pressed', String(audio.isMuted()));
}

if (dom.btnMute) {
  dom.btnMute.addEventListener('click', () => {
    audio.toggleMuted();
    updateMuteIcon();
  });
  updateMuteIcon();
}

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

window.addEventListener('resize', () => {
  if (state.renderer) state.renderer.resize();
});
window.addEventListener('orientationchange', () => {
  if (state.renderer) setTimeout(() => state.renderer && state.renderer.resize(), 100);
});

window.__hostelPong = { net, state, dom, startMatch, endMatch, stopLoop };
