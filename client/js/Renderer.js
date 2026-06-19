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

  draw(state, viewport = {}) {
    const ctx = this.ctx;
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const fw = state.field.w;
    const fh = state.field.h;
    const t = this.getTransform(fw, fh);
    const { scale, offsetX, offsetY } = t;

    const shakeX = (viewport.shakeX || 0) * scale;
    const shakeY = (viewport.shakeY || 0) * scale;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, cw, ch);

    ctx.setTransform(scale, 0, 0, scale, offsetX + shakeX, offsetY + shakeY);

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

    this._drawTriggerIcon(ctx, fw / 2, fh / 2);

    if (state.fridge && state.fridge.active) {
      this._drawFridge(ctx, state.fridge);
    }

    this._drawPaddle(ctx, state.paddles.p1, '#00e5ff');
    this._drawPaddle(ctx, state.paddles.p2, '#ff3df0');

    if (state.chaos && state.chaos.effect) {
      this._drawChaosIndicator(ctx, fw, fh, state.chaos.effect);
    }

    this._drawBall(ctx, state.ball);
  }

  _drawTriggerIcon(ctx, cx, cy) {
    ctx.save();
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 300);
    ctx.shadowColor = '#ffcc00';
    ctx.shadowBlur = 12 + pulse * 12;
    ctx.strokeStyle = `rgba(255, 204, 0, ${0.4 + pulse * 0.4})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = `rgba(255, 204, 0, ${0.15 + pulse * 0.2})`;
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _drawFridge(ctx, f) {
    ctx.save();
    ctx.shadowColor = '#88ccff';
    ctx.shadowBlur = 16;
    ctx.fillStyle = 'rgba(136, 204, 255, 0.25)';
    ctx.fillRect(f.x, f.y, f.w, f.h);
    ctx.strokeStyle = '#88ccff';
    ctx.lineWidth = 3;
    ctx.strokeRect(f.x, f.y, f.w, f.h);
    ctx.strokeStyle = 'rgba(136, 204, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(f.x + f.w * 0.2, f.y + f.h / 2);
    ctx.lineTo(f.x + f.w * 0.8, f.y + f.h / 2);
    ctx.stroke();
    ctx.restore();
  }

  _drawChaosIndicator(ctx, fw, fh, effect) {
    const labels = { screenShake: 'SHAKE', drunkBall: 'DRUNK', fridge: 'FRIDGE' };
    const label = labels[effect] || effect;
    ctx.save();
    ctx.font = 'bold 18px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#ffcc00';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffcc00';
    ctx.fillText(label, fw / 2, 28);
    ctx.restore();
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
