import { InputManager } from './InputManager.js';

export class TouchDragInput extends InputManager {
  constructor() {
    super();
    this._dragging = false;
    this._lastY = null;
    this._threshold = 2;
    this._handlers = {
      down: null,
      move: null,
      up: null
    };
  }

  attach(target) {
    super.attach(target);
    this._handlers.down = (e) => this._onDown(e);
    this._handlers.move = (e) => this._onMove(e);
    this._handlers.up = () => this._onUp();

    target.addEventListener('pointerdown', this._handlers.down);
    target.addEventListener('pointermove', this._handlers.move);
    target.addEventListener('pointerup', this._handlers.up);
    target.addEventListener('pointercancel', this._handlers.up);
  }

  detach() {
    const target = this._target;
    if (target) {
      target.removeEventListener('pointerdown', this._handlers.down);
      target.removeEventListener('pointermove', this._handlers.move);
      target.removeEventListener('pointerup', this._handlers.up);
      target.removeEventListener('pointercancel', this._handlers.up);
    }
    this._handlers.down = null;
    this._handlers.move = null;
    this._handlers.up = null;
    this._dragging = false;
    this._lastY = null;
    super.detach();
  }

  setThreshold(px) {
    this._threshold = px;
  }

  _onDown(e) {
    this._dragging = true;
    try { e.preventDefault?.(); } catch {}
    this._emit(e.clientY);
  }

  _onMove(e) {
    if (!this._dragging) return;
    this._emit(e.clientY);
  }

  _onUp() {
    this._dragging = false;
  }

  _emit(clientY) {
    if (this._lastY !== null && Math.abs(clientY - this._lastY) < this._threshold) return;
    this._lastY = clientY;
    this._emitPaddleTopY(clientY);
  }
}
