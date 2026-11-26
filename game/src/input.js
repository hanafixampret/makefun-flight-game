// Ridge Runner — keyboard and mouse input, one shared state object.
// Arrow keys / WASD fly the plane, mouse steers too, C changes camera, R restarts.
const Input = {
  keys: {},
  mouseX: 0, // -1 (left edge) .. 1 (right edge)
  mouseY: 0, // -1 (top) .. 1 (bottom)
  mouseDown: false,
  anyKey: false,
  init() {
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      if (!e.repeat) this.anyKey = true;
      this.keys[e.code] = true;
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
    window.addEventListener('blur', () => {
      this.keys = {};
    });
    window.addEventListener('mousemove', (e) => {
      this.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouseY = (e.clientY / window.innerHeight) * 2 - 1;
    });
    window.addEventListener('mousedown', () => {
      this.mouseDown = true;
    });
    window.addEventListener('mouseup', () => {
      this.mouseDown = false;
    });
  },
  down(code) {
    return !!this.keys[code];
  },
  // -1..1: positive banks right. Keys win over the mouse when both are used.
  rollAxis() {
    let v = 0;
    if (this.down('ArrowLeft') || this.down('KeyA')) v -= 1;
    if (this.down('ArrowRight') || this.down('KeyD')) v += 1;
    if (v === 0 && Math.abs(this.mouseX) > 0.12) v = clamp(this.mouseX * 1.4, -1, 1);
    return v;
  },
  // -1..1: positive pulls the nose up.
  pitchAxis() {
    let v = 0;
    if (this.down('ArrowUp') || this.down('KeyW')) v += 1;
    if (this.down('ArrowDown') || this.down('KeyS')) v -= 1;
    if (v === 0 && Math.abs(this.mouseY) > 0.18) v = clamp(-this.mouseY * 1.2, -1, 1);
    return v;
  },
  // -1..1: throttle trim keys.
  throttleAxis() {
    let v = 0;
    if (this.down('ShiftLeft') || this.down('ShiftRight') || this.down('KeyE')) v += 1;
    if (this.down('ControlLeft') || this.down('KeyQ')) v -= 1;
    return v;
  },
};
