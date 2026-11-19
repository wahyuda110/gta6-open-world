// Keyboard and mouse input: WASD/arrows to move and drive, E to enter or leave a car,
// F to punch, mouse aim with click to shoot, Shift to sprint, Space to brake, P or Esc to pause,
// M to mute. Tracks held keys, pressed edges, and the mouse position in canvas pixels.
export const ACTION = {
  up: 'up',
  down: 'down',
  left: 'left',
  right: 'right',
  enter: 'enter',
  punch: 'punch',
  brake: 'brake',
  sprint: 'sprint',
  pause: 'pause',
  mute: 'mute',
  confirm: 'confirm',
  restart: 'restart',
};

const KEY_MAP = {
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  KeyE: 'enter',
  KeyF: 'punch',
  Space: 'brake',
  ShiftLeft: 'sprint',
  ShiftRight: 'sprint',
  KeyP: 'pause',
  Escape: 'pause',
  KeyM: 'mute',
  Enter: 'confirm',
  KeyR: 'restart',
};

export function createInput(canvas) {
  const held = new Set();
  const pressed = new Set();
  const mouse = { x: 0, y: 0, down: false, clicked: false };

  function onKeyDown(event) {
    const action = KEY_MAP[event.code];
    if (!action) return;
    if (event.code === 'Space' || event.code.startsWith('Arrow')) event.preventDefault();
    if (!held.has(action)) pressed.add(action);
    held.add(action);
  }
  function onKeyUp(event) {
    const action = KEY_MAP[event.code];
    if (action) held.delete(action);
  }
  function onMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
  }
  function onMouseDown(event) {
    if (event.button === 0) {
      mouse.down = true;
      mouse.clicked = true;
    }
  }
  function onMouseUp(event) {
    if (event.button === 0) mouse.down = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);

  return {
    mouse,
    isHeld(action) {
      return held.has(action);
    },
    wasPressed(action) {
      return pressed.has(action);
    },
    // Steering and throttle in -1..1, from held keys.
    axis() {
      const x = (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0);
      const y = (held.has('down') ? 1 : 0) - (held.has('up') ? 1 : 0);
      return { x, y };
    },
    endFrame() {
      pressed.clear();
      mouse.clicked = false;
    },
  };
}
