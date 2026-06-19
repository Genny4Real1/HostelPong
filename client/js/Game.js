export class Game {
  static FIELD_W = 1000;
  static FIELD_H = 600;
  static PADDLE_W = 14;
  static PADDLE_H = 110;
  static PADDLE_MARGIN = 24;
  static BALL_R = 9;
  static BASE_SPEED = 420;
  static MAX_BALL_SPEED = 900;
  static SPEED_STEP = 1.06;
  static MAX_BOUNCE_ANGLE = (5 * Math.PI) / 12;
  static WIN_SCORE = 5;
  static CHAOS_DURATION_MS = 4000;
  static CHAOS_SHAKE_MS = 2000;
  static CHAOS_COOLDOWN_MS = 2000;
  static DRUNK_FORCE = 700;
  static FRIDGE_W = 50;
  static FRIDGE_H = 80;
  static CHAOS_EFFECTS = ['screenShake', 'drunkBall', 'fridge'];

  constructor({ role }) {
    this.role = role;
    this.field = { w: Game.FIELD_W, h: Game.FIELD_H };
    this.paddles = {
      p1: {
        x: Game.PADDLE_MARGIN,
        y: (Game.FIELD_H - Game.PADDLE_H) / 2,
        w: Game.PADDLE_W,
        h: Game.PADDLE_H
      },
      p2: {
        x: Game.FIELD_W - Game.PADDLE_MARGIN - Game.PADDLE_W,
        y: (Game.FIELD_H - Game.PADDLE_H) / 2,
        w: Game.PADDLE_W,
        h: Game.PADDLE_H
      }
    };
    this.ball = { x: Game.FIELD_W / 2, y: Game.FIELD_H / 2, vx: 0, vy: 0, r: Game.BALL_R };
    this.scores = { p1: 0, p2: 0 };
    this.running = false;
    this.winner = null;
    this.lastHitter = null;
    this.chaos = { effect: null, target: null, expiresAt: 0 };
    this.fridge = { active: false, x: 0, y: 0, w: Game.FRIDGE_W, h: Game.FRIDGE_H };
    this._remote = null;
    this._events = [];
    this._chaosCooldownUntil = 0;
  }

  get localKey() {
    return this.role === 'host' ? 'p1' : 'p2';
  }

  get opponentKey() {
    return this.role === 'host' ? 'p2' : 'p1';
  }

  start() {
    this.running = true;
    this._serve(Math.random() < 0.5 ? -1 : 1);
  }

  reset() {
    this.scores = { p1: 0, p2: 0 };
    this.paddles.p1.y = (this.field.h - this.paddles.p1.h) / 2;
    this.paddles.p2.y = (this.field.h - this.paddles.p2.h) / 2;
    this.ball.x = this.field.w / 2;
    this.ball.y = this.field.h / 2;
    this.ball.vx = 0;
    this.ball.vy = 0;
    this.winner = null;
    this.lastHitter = null;
    this.chaos = { effect: null, target: null, expiresAt: 0 };
    this.fridge = { active: false, x: 0, y: 0, w: Game.FRIDGE_W, h: Game.FRIDGE_H };
    this._remote = null;
    this._events.length = 0;
    this._chaosCooldownUntil = 0;
  }

  _serve(dir) {
    this.ball.x = this.field.w / 2;
    this.ball.y = this.field.h / 2;
    const angle = (Math.random() * 0.5 - 0.25) * Math.PI;
    this.ball.vx = Math.cos(angle) * Game.BASE_SPEED * dir;
    this.ball.vy = Math.sin(angle) * Game.BASE_SPEED;
  }

  consumeEvents() {
    const ev = this._events;
    this._events = [];
    return ev;
  }

  setPaddleY(which, y) {
    const p = this.paddles[which];
    if (!p) return;
    p.y = Math.max(0, Math.min(this.field.h - p.h, y));
  }

  update(dt) {
    if (!this.running) return;
    const now = Date.now();
    if (this.role !== 'host') {
      if (this._remote) {
        const k = 1 - Math.pow(0.0001, dt);
        this.ball.x += (this._remote.ball.x - this.ball.x) * k;
        this.ball.y += (this._remote.ball.y - this.ball.y) * k;
      }
      return;
    }

    const b = this.ball;
    b.x += b.vx * dt;
    b.y += b.vy * dt;

    this._updateChaos(now);

    if (this.chaos.effect === 'drunkBall' && this.chaos.expiresAt > now) {
      b.vy += (Math.random() * 2 - 1) * Game.DRUNK_FORCE * dt;
    }

    if (b.y - b.r <= 0) {
      b.y = b.r;
      b.vy = -b.vy;
      this._accelerate();
      this._events.push({ type: 'wallHit' });
    } else if (b.y + b.r >= this.field.h) {
      b.y = this.field.h - b.r;
      b.vy = -b.vy;
      this._accelerate();
      this._events.push({ type: 'wallHit' });
    }

    this._checkPaddle('p1', +1, dt);
    this._checkPaddle('p2', -1, dt);

    if (this.fridge.active && this._collideRect(this.fridge)) {
      this._events.push({ type: 'wallHit' });
    }

    this._checkChaosTrigger(now, dt);

    if (b.x + b.r < 0) {
      this._scorePoint('p2');
    } else if (b.x - b.r > this.field.w) {
      this._scorePoint('p1');
    }
  }

  _accelerate() {
    const b = this.ball;
    const speed = Math.hypot(b.vx, b.vy);
    if (speed === 0) return;
    const newSpeed = Math.min(speed * Game.SPEED_STEP, Game.MAX_BALL_SPEED);
    b.vx = (b.vx / speed) * newSpeed;
    b.vy = (b.vy / speed) * newSpeed;
  }

  _reflectAlongNormal(nx, ny) {
    const b = this.ball;
    const vdotn = b.vx * nx + b.vy * ny;
    b.vx -= 2 * vdotn * nx;
    b.vy -= 2 * vdotn * ny;
  }

  _checkPaddle(which, dirSign, dt) {
    const b = this.ball;
    const p = this.paddles[which];
    const r = b.r;

    const closestX = Math.max(p.x, Math.min(b.x, p.x + p.w));
    const closestY = Math.max(p.y, Math.min(b.y, p.y + p.h));
    const dx = b.x - closestX;
    const dy = b.y - closestY;
    const distSq = dx * dx + dy * dy;
    const overlap = r * r >= distSq;

    const faceX = dirSign > 0 ? p.x + p.w : p.x;
    const prevX = b.x - b.vx * dt;
    const crossedFront =
      (dirSign > 0 && b.x - r <= faceX && prevX - r > faceX) ||
      (dirSign < 0 && b.x + r >= faceX && prevX + r < faceX);
    const inVertExtent = b.y + r >= p.y && b.y - r <= p.y + p.h;
    const tunneledFront = crossedFront && inVertExtent;

    if (!overlap && !tunneledFront) return;

    let nx, ny;
    if (overlap && distSq > 0.0001) {
      const dist = Math.sqrt(distSq);
      nx = dx / dist;
      ny = dy / dist;
    } else if (overlap) {
      const penL = b.x - p.x;
      const penR = p.x + p.w - b.x;
      const penT = b.y - p.y;
      const penB = p.y + p.h - b.y;
      const m = Math.min(penL, penR, penT, penB);
      if (m === penL) { nx = -1; ny = 0; }
      else if (m === penR) { nx = 1; ny = 0; }
      else if (m === penT) { nx = 0; ny = -1; }
      else { nx = 0; ny = 1; }
    } else {
      nx = dirSign > 0 ? 1 : -1;
      ny = 0;
    }

    if (overlap) {
      const dist = Math.sqrt(distSq) || 0;
      const pen = r - dist;
      b.x += nx * pen;
      b.y += ny * pen;
    } else {
      b.x = dirSign > 0 ? faceX + r : faceX - r;
    }

    const vdotn = b.vx * nx + b.vy * ny;
    if (vdotn >= 0) return;

    const isVerticalFace = Math.abs(nx) > Math.abs(ny);
    const isFrontFace = isVerticalFace && ((dirSign > 0 && nx > 0) || (dirSign < 0 && nx < 0));

    if (isFrontFace) {
      const rel = (b.y - (p.y + p.h / 2)) / (p.h / 2);
      const clamped = Math.max(-1, Math.min(1, rel));
      const angle = clamped * Game.MAX_BOUNCE_ANGLE;
      const speed = Math.hypot(b.vx, b.vy);
      const newSpeed = Math.min(speed * Game.SPEED_STEP, Game.MAX_BALL_SPEED);
      b.vx = Math.cos(angle) * newSpeed * dirSign;
      b.vy = Math.sin(angle) * newSpeed;
    } else {
      this._reflectAlongNormal(nx, ny);
      this._accelerate();
    }

    this.lastHitter = which;
    this._events.push({ type: 'paddleHit', which });
  }

  _scorePoint(scorer) {
    this.scores[scorer] = (this.scores[scorer] || 0) + 1;
    this._events.push({ type: 'score', scorer, scores: { p1: this.scores.p1, p2: this.scores.p2 } });
    if (this.scores[scorer] >= Game.WIN_SCORE) {
      this.running = false;
      this.winner = scorer;
      this._events.push({ type: 'matchEnd', winner: scorer });
    } else {
      const dir = scorer === 'p1' ? +1 : -1;
      this._serve(dir);
    }
  }

  _collideRect(rect) {
    const b = this.ball;
    const r = b.r;
    const closestX = Math.max(rect.x, Math.min(b.x, rect.x + rect.w));
    const closestY = Math.max(rect.y, Math.min(b.y, rect.y + rect.h));
    const dx = b.x - closestX;
    const dy = b.y - closestY;
    const distSq = dx * dx + dy * dy;
    if (distSq > r * r) return false;

    let nx, ny;
    if (distSq > 0.0001) {
      const dist = Math.sqrt(distSq);
      nx = dx / dist;
      ny = dy / dist;
    } else {
      const penL = b.x - rect.x;
      const penR = rect.x + rect.w - b.x;
      const penT = b.y - rect.y;
      const penB = rect.y + rect.h - b.y;
      const m = Math.min(penL, penR, penT, penB);
      if (m === penL) { nx = -1; ny = 0; }
      else if (m === penR) { nx = 1; ny = 0; }
      else if (m === penT) { nx = 0; ny = -1; }
      else { nx = 0; ny = 1; }
    }

    const dist = Math.sqrt(distSq) || 0;
    const pen = r - dist;
    b.x += nx * pen;
    b.y += ny * pen;

    const vdotn = b.vx * nx + b.vy * ny;
    if (vdotn >= 0) return false;

    this._reflectAlongNormal(nx, ny);
    this._accelerate();
    return true;
  }

  _updateChaos(now) {
    if (this.chaos.effect && this.chaos.expiresAt <= now) {
      this.chaos = { effect: null, target: null, expiresAt: 0 };
      this.fridge = { active: false, x: 0, y: 0, w: Game.FRIDGE_W, h: Game.FRIDGE_H };
    }
  }

  _checkChaosTrigger(now, dt) {
    if (this.chaos.effect || this._chaosCooldownUntil > now) return;
    const center = this.field.w / 2;
    const b = this.ball;
    const prevX = b.x - b.vx * dt;
    const crossed = (prevX < center && b.x >= center) || (prevX > center && b.x <= center);
    if (!crossed) return;
    this._triggerChaos(now);
  }

  _triggerChaos(now) {
    const effect = Game.CHAOS_EFFECTS[Math.floor(Math.random() * Game.CHAOS_EFFECTS.length)];
    const target = this.lastHitter === 'p1' ? 'p2' : (this.lastHitter === 'p2' ? 'p1' : 'p2');
    const durationMs = effect === 'screenShake' ? Game.CHAOS_SHAKE_MS : Game.CHAOS_DURATION_MS;
    const expiresAt = now + durationMs;

    this.chaos = { effect, target, expiresAt };
    this._chaosCooldownUntil = now + durationMs + Game.CHAOS_COOLDOWN_MS;

    if (effect === 'fridge') {
      const halfCenter = target === 'p1' ? this.field.w * 0.25 : this.field.w * 0.75;
      this.fridge = {
        active: true,
        x: halfCenter - Game.FRIDGE_W / 2,
        y: this.field.h / 2 - Game.FRIDGE_H / 2,
        w: Game.FRIDGE_W,
        h: Game.FRIDGE_H
      };
    }

    this._events.push({ type: 'chaosTrigger', effect, target, durationMs, expiresAt });
  }

  getSnapshot() {
    return {
      field: { w: this.field.w, h: this.field.h },
      paddles: {
        p1: { x: this.paddles.p1.x, y: this.paddles.p1.y, w: this.paddles.p1.w, h: this.paddles.p1.h },
        p2: { x: this.paddles.p2.x, y: this.paddles.p2.y, w: this.paddles.p2.w, h: this.paddles.p2.h }
      },
      ball: { x: this.ball.x, y: this.ball.y, r: this.ball.r },
      scores: { p1: this.scores.p1, p2: this.scores.p2 },
      running: this.running,
      winner: this.winner,
      chaos: { effect: this.chaos.effect, target: this.chaos.target, expiresAt: this.chaos.expiresAt },
      fridge: { active: this.fridge.active, x: this.fridge.x, y: this.fridge.y, w: this.fridge.w, h: this.fridge.h }
    };
  }

  applySnapshot(s) {
    if (this.role !== 'guest' || !s) return;
    this._remote = s;
    if (s.scores) this.scores = { p1: s.scores.p1 ?? this.scores.p1, p2: s.scores.p2 ?? this.scores.p2 };
    const opp = this.opponentKey;
    if (s.paddles && s.paddles[opp]) {
      this.paddles[opp] = {
        x: s.paddles[opp].x,
        y: s.paddles[opp].y,
        w: s.paddles[opp].w,
        h: s.paddles[opp].h
      };
    }
    if (typeof s.running === 'boolean') this.running = s.running;
    if (s.winner) this.winner = s.winner;
    if (s.chaos) this.chaos = { effect: s.chaos.effect ?? null, target: s.chaos.target ?? null, expiresAt: s.chaos.expiresAt ?? 0 };
    if (s.fridge) this.fridge = { active: !!s.fridge.active, x: s.fridge.x ?? 0, y: s.fridge.y ?? 0, w: s.fridge.w ?? Game.FRIDGE_W, h: s.fridge.h ?? Game.FRIDGE_H };
  }
}
