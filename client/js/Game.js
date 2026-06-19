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
    this._remote = null;
    this._events = [];
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
    this._remote = null;
    this._events.length = 0;
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

    this._checkPaddle('p1', +1);
    this._checkPaddle('p2', -1);

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

  _checkPaddle(which, dirSign) {
    const b = this.ball;
    const p = this.paddles[which];
    const movingToward = (dirSign > 0 && b.vx < 0) || (dirSign < 0 && b.vx > 0);
    if (!movingToward) return;
    const faceX = dirSign > 0 ? p.x + p.w : p.x;
    const prevX = b.x - b.vx * (1 / 60);
    const crossed = (dirSign > 0 && b.x - b.r <= faceX && prevX - b.r > faceX) ||
                    (dirSign < 0 && b.x + b.r >= faceX && prevX + b.r < faceX);
    if (!crossed) return;
    if (b.y + b.r < p.y || b.y - b.r > p.y + p.h) return;

    if (dirSign > 0) b.x = faceX + b.r;
    else b.x = faceX - b.r;

    const rel = (b.y - (p.y + p.h / 2)) / (p.h / 2);
    const clamped = Math.max(-1, Math.min(1, rel));
    const angle = clamped * Game.MAX_BOUNCE_ANGLE;
    const speed = Math.hypot(b.vx, b.vy);
    const newSpeed = Math.min(speed * Game.SPEED_STEP, Game.MAX_BALL_SPEED);
    b.vx = Math.cos(angle) * newSpeed * dirSign;
    b.vy = Math.sin(angle) * newSpeed;
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
      winner: this.winner
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
  }
}
