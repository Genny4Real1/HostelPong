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
    this._remote = null;
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
    this._remote = null;
  }

  _serve(dir) {
    this.ball.x = this.field.w / 2;
    this.ball.y = this.field.h / 2;
    const angle = (Math.random() * 0.5 - 0.25) * Math.PI;
    this.ball.vx = Math.cos(angle) * Game.BASE_SPEED * dir;
    this.ball.vy = Math.sin(angle) * Game.BASE_SPEED;
  }

  setPaddleY(which, y) {
    const p = this.paddles[which];
    if (!p) return;
    p.y = Math.max(0, Math.min(this.field.h - p.h, y));
  }

  update(dt) {
    if (!this.running) return;
    if (this.role === 'host') {
      this.ball.x += this.ball.vx * dt;
      this.ball.y += this.ball.vy * dt;
    } else if (this._remote) {
      const k = 1 - Math.pow(0.0001, dt);
      this.ball.x += (this._remote.ball.x - this.ball.x) * k;
      this.ball.y += (this._remote.ball.y - this.ball.y) * k;
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
      running: this.running
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
  }
}
