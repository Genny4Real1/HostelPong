export class InputManager {
  constructor() {
    this._moveCb = null;
    this._coordinateMap = (clientY) => clientY;
    this._bounds = { fieldHeight: 600, paddleHeight: 110 };
    this._attached = false;
  }

  attach(target) {
    this._target = target;
    this._attached = true;
  }

  detach() {
    this._attached = false;
    this._target = null;
    this._moveCb = null;
  }

  setBounds({ fieldHeight, paddleHeight }) {
    if (typeof fieldHeight === 'number') this._bounds.fieldHeight = fieldHeight;
    if (typeof paddleHeight === 'number') this._bounds.paddleHeight = paddleHeight;
  }

  setCoordinateMap(fn) {
    if (typeof fn === 'function') this._coordinateMap = fn;
  }

  onMove(callback) {
    if (typeof callback === 'function') this._moveCb = callback;
  }

  _emitPaddleTopY(clientY) {
    if (!this._moveCb) return;
    const fieldY = this._coordinateMap(clientY);
    const half = this._bounds.paddleHeight / 2;
    const center = Math.max(half, Math.min(this._bounds.fieldHeight - half, fieldY));
    this._moveCb(center - half);
  }
}
