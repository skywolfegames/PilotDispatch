const GAME_CODES = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowLeft",
  "ArrowDown",
  "ArrowRight",
  "ShiftLeft",
  "ShiftRight",
  "KeyE",
  "KeyF",
  "Space",
  "KeyP",
  "Escape",
]);

type InputListener = () => boolean;

class GameInput {
  keys = new Set<string>();
  injected: Set<string> | null = null;
  lookDx = 0;
  lookDy = 0;
  joyX = 0;
  joyY = 0;
  sprintTouch = false;
  interactQueued = false;
  pauseQueued = false;
  dragging = false;
  pointerId: number | null = null;
  bound = false;
  isPlaying: InputListener = () => false;
  onFreeMouse: (() => void) | null = null;
  onInteract: (() => void) | null = null;

  held(): Set<string> {
    return this.injected ?? this.keys;
  }

  consumeLook(): { x: number; y: number } {
    const x = this.lookDx;
    const y = this.lookDy;
    this.lookDx = 0;
    this.lookDy = 0;
    return { x, y };
  }

  consumeInteract(): boolean {
    const v = this.interactQueued;
    this.interactQueued = false;
    return v;
  }

  consumePause(): boolean {
    const v = this.pauseQueued;
    this.pauseQueued = false;
    return v;
  }

  setKeys(codes: string[]) {
    this.injected = new Set(codes);
  }

  queueInteract() {
    this.interactQueued = true;
  }

  reset() {
    this.keys.clear();
    this.injected = null;
    this.lookDx = 0;
    this.lookDy = 0;
    this.joyX = 0;
    this.joyY = 0;
    this.sprintTouch = false;
    this.interactQueued = false;
    this.pauseQueued = false;
    this.dragging = false;
    this.pointerId = null;
  }

  private isTypingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
  }

  bind() {
    if (this.bound || typeof window === "undefined") return;
    this.bound = true;

    window.addEventListener("keydown", (e) => {
      if (this.isTypingTarget(e.target)) return;
      if (GAME_CODES.has(e.code) && this.isPlaying()) e.preventDefault();
      this.keys.add(e.code);
      const interactKey =
        e.code === "KeyE" ||
        e.code === "KeyF" ||
        e.key === "e" ||
        e.key === "E";
      if (interactKey && this.isPlaying() && !e.repeat) {
        this.interactQueued = true;
        this.onInteract?.();
      }
      if ((e.code === "KeyP" || e.code === "Escape") && this.isPlaying() && !e.repeat) this.pauseQueued = true;
      if ((e.code === "ControlLeft" || e.code === "ControlRight") && this.isPlaying() && !e.repeat) {
        document.exitPointerLock?.();
        this.dragging = false;
        this.onFreeMouse?.();
      }
    });

    window.addEventListener("keyup", (e) => {
      this.keys.delete(e.code);
    });

    window.addEventListener("blur", () => {
      this.keys.clear();
      this.dragging = false;
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.keys.clear();
    });

    window.addEventListener("mousemove", (e) => {
      if (!this.isPlaying()) return;
      if (document.pointerLockElement) {
        this.lookDx += e.movementX;
        this.lookDy += e.movementY;
      }
    });
  }

  onPointerDown(e: React.PointerEvent) {
    if (!this.isPlaying()) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    this.dragging = true;
    this.pointerId = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  onPointerMove(e: React.PointerEvent) {
    if (!this.dragging || this.pointerId !== e.pointerId) return;
    if (document.pointerLockElement) return;
    this.lookDx += e.movementX;
    this.lookDy += e.movementY;
  }

  onPointerUp(e: React.PointerEvent) {
    if (this.pointerId !== e.pointerId) return;
    this.dragging = false;
    this.pointerId = null;
  }
}

export const gameInput = new GameInput();
