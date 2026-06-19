export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this._dpr = dpr;
    const cssW = this.canvas.clientWidth || window.innerWidth;
    const cssH = this.canvas.clientHeight || window.innerHeight;
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this._cssW = cssW;
    this._cssH = cssH;
  }

  getTransform(fieldW = 1000, fieldH = 600) {
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const scale = Math.min(cw / fieldW, ch / fieldH);
    const offsetX = (cw - fieldW * scale) / 2;
    const offsetY = (ch - fieldH * scale) / 2;
    return { scale, offsetX, offsetY, cssW: this._cssW, cssH: this._cssH };
  }

  draw(state) {
    const ctx = this.ctx;
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const fw = state.field.w;
    const fh = state.field.h;
    const t = this.getTransform(fw, fh);
    const { scale, offsetX, offsetY } = t;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, cw, ch);

    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

    ctx.strokeStyle = 'rgba(0, 229, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, fw, fh);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 14]);
    ctx.beginPath();
    ctx.moveTo(fw / 2, 0);
    ctx.lineTo(fw / 2, fh);
    ctx.stroke();
    ctx.setLineDash([]);

    this._drawPaddle(ctx, state.paddles.p1, '#00e5ff');
    this._drawPaddle(ctx, state.paddles.p2, '#ff3df0');
    this._drawBall(ctx, state.ball);
  }

  _drawPaddle(ctx, p, color) {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    ctx.fillStyle = color;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.restore();
  }

  _drawBall(ctx, b) {
    ctx.save();
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 24;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
