const DEFAULT_FRAMES = {
  stand: "./assets/miku/shime1.png",
  walk: ["./assets/miku/shime1.png", "./assets/miku/shime2.png", "./assets/miku/shime3.png", "./assets/miku/shime2.png"],
  idle: "./assets/miku/shime11.png",
  rest: ["./assets/miku/shime26.png", "./assets/miku/shime27.png", "./assets/miku/shime28.png", "./assets/miku/shime27.png"],
  wave: ["./assets/miku/shime15.png", "./assets/miku/shime16.png", "./assets/miku/shime17.png"],
  dance: ["./assets/miku/shime5.png", "./assets/miku/shime6.png", "./assets/miku/shime1.png"],
  trip: ["./assets/miku/shime18.png", "./assets/miku/shime19.png", "./assets/miku/shime19.png"],
  drag: ["./assets/miku/shime7.png", "./assets/miku/shime5.png", "./assets/miku/shime8.png", "./assets/miku/shime6.png"],
  falling: ["./assets/miku/shime10.png", "./assets/miku/shime18.png"],
  fallen: ["./assets/miku/shime9.png", "./assets/miku/shime4.png", "./assets/miku/shime19.png"],
  hangSide: "./assets/miku/shime12.png",
  climbSide: ["./assets/miku/shime13.png", "./assets/miku/shime14.png"],
  hangTop: "./assets/miku/shime23.png",
  climbTop: ["./assets/miku/shime24.png", "./assets/miku/shime25.png"],
  jump: "./assets/miku/shime22.png"
};

const DEFAULT_INTERVALS = {
  walk: 175,
  idle: 1000,
  rest: 500,
  wave: 400,
  dance: 200,
  trip: 250,
  drag: 210,
  falling: 200,
  fallen: 250,
  hangSide: 200,
  climbSide: 200,
  hangTop: 200,
  climbTop: 200,
  jump: 200
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const now = () => performance.now();

export function createMikuWalker(options = {}) {
  const walker = new MikuWalker(options);
  walker.mount();
  return walker;
}

export class MikuWalker {
  constructor(options = {}) {
    this.options = {
      size: 100,
      speed: 50,
      bottom: 16,
      right: 24,
      edgePadding: 8,
      fallSpeed: 150,
      jumpSpeed: 200,
      jumpChance: 0.28,
      walkDelayMin: 2400,
      walkDelayMax: 6200,
      restDurationMin: 3000,
      restDurationMax: 7000,
      gettingUpDelay: 1800,
      bubbleText: "Hi",
      frames: DEFAULT_FRAMES,
      intervals: DEFAULT_INTERVALS,
      ...options
    };
    this.frames = { ...DEFAULT_FRAMES, ...this.options.frames };
    this.intervals = { ...DEFAULT_INTERVALS, ...this.options.intervals };
    this.size = this.options.size;
    this.currentSize = this.size;
    this.speed = this.options.speed;
    this.direction = -1;
    this.x = 0;
    this.y = 0;
    this.state = "walk";
    this.currentEdge = "bottom";
    this.paused = false;
    this.dragging = false;
    this.dragMoved = false;
    this.suppressClickUntil = 0;
    this.jumpPlan = null;
    this.edgeActionAt = 0;
    this.frameIndex = 0;
    this.frameClock = 0;
    this.actionUntil = 0;
    this.nextPauseAt = now() + this.randomRange(3200, 7600);
    this.raf = 0;
    this.lastTime = 0;
  }

  mount(parent = document.body) {
    this.el = document.createElement("div");
    this.el.className = "miku-walker";
    this.el.setAttribute("role", "button");
    this.el.setAttribute("aria-label", "Mascot walker");
    this.el.tabIndex = 0;
    this.applySize();

    this.img = document.createElement("img");
    this.img.className = "miku-walker__sprite";
    this.img.alt = "";
    this.img.draggable = false;

    this.bubble = document.createElement("div");
    this.bubble.className = "miku-walker__bubble";
    this.bubble.textContent = this.options.bubbleText;

    this.el.append(this.img, this.bubble);
    parent.append(this.el);

    this.reset();
    this.bindEvents();
    this.setFrame(this.frames.stand);

    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      this.pause();
    } else {
      this.lastTime = now();
      this.raf = requestAnimationFrame((time) => this.tick(time));
    }
  }

  bindEvents() {
    this.onResize = () => {
      this.applySize();
      this.x = clamp(this.x, this.options.edgePadding, this.maxX());
      this.y = this.floorY();
      this.render();
    };

    this.onPointerDown = (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      this.dragging = true;
      this.dragMoved = false;
      this.state = "drag";
      this.frameIndex = 0;
      this.frameClock = 0;
      this.el.classList.add("is-dragging");
      this.pointerStartX = event.clientX;
      this.pointerStartY = event.clientY;
      this.dragOffsetX = event.clientX - this.x;
      this.dragOffsetY = event.clientY - this.y;
      this.el.setPointerCapture?.(event.pointerId);
    };

    this.onPointerMove = (event) => {
      if (!this.dragging) return;
      if (Math.hypot(event.clientX - this.pointerStartX, event.clientY - this.pointerStartY) > 3) {
        this.dragMoved = true;
      }
      this.x = clamp(event.clientX - this.dragOffsetX, this.options.edgePadding, this.maxX());
      this.y = clamp(event.clientY - this.dragOffsetY, this.options.edgePadding, this.floorY());
      this.render();
    };

    this.onPointerUp = (event) => {
      if (!this.dragging) return;
      this.dragging = false;
      this.el.classList.remove("is-dragging");
      if (event.pointerId !== undefined) this.el.releasePointerCapture?.(event.pointerId);
      if (this.dragMoved) this.suppressClickUntil = now() + 300;
      if (this.y < this.floorY() - 8) {
        this.startFalling(now());
      } else {
        this.startWalk(now(), 1600, 3600);
      }
      this.render();
    };

    this.onKeyDown = (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        this.wave();
      }
    };

    window.addEventListener("resize", this.onResize);
    this.el.addEventListener("pointerdown", this.onPointerDown);
    this.el.addEventListener("pointermove", this.onPointerMove);
    this.el.addEventListener("pointerup", this.onPointerUp);
    this.el.addEventListener("pointercancel", this.onPointerUp);
    window.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("pointercancel", this.onPointerUp);
    window.addEventListener("mouseup", this.onPointerUp);
    this.el.addEventListener("click", () => {
      if (now() < this.suppressClickUntil) return;
      this.wave();
    });
    this.el.addEventListener("keydown", this.onKeyDown);
  }

  tick(time) {
    if (this.paused) return;

    const delta = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;

    if (!this.dragging) {
      this.updateState(time, delta);
      this.updatePosition(delta, time);
    }

    this.updateFrame(time, delta);
    this.render();
    this.raf = requestAnimationFrame((nextTime) => this.tick(nextTime));
  }

  updateState(time) {
    if (this.state === "falling" || this.state === "jumpToEdge") return;

    if (this.state === "fallen" && time >= this.actionUntil) {
      this.startWalk(time, 900, 1800);
      return;
    }

    if (this.isEdgeState(this.state)) {
      if (time >= this.actionUntil) this.pickEdgeAction(time);
      return;
    }

    if (this.state === "walk" && time >= this.nextPauseAt) {
      if (this.y >= this.floorY() - 1 && Math.random() < this.options.jumpChance) {
        this.startJumpToEdge(this.randomEdge(), time);
        return;
      }

      const choices = ["idle", "rest", "wave", "dance", "trip"];
      this.state = choices[Math.floor(Math.random() * choices.length)];
      this.actionUntil = time + this.actionDuration(this.state);
      this.frameClock = 0;
      this.frameIndex = 0;
      return;
    }

    if (this.state !== "walk" && this.state !== "drag" && time >= this.actionUntil) {
      this.el.classList.remove("is-talking");
      this.startWalk(time);
      if (Math.random() > 0.55) this.direction *= -1;
    }
  }

  updatePosition(delta, time) {
    if (this.state === "walk") {
      this.moveHorizontally(delta);
      this.y = this.floorY();
      return;
    }

    if (this.state === "climbTop") {
      this.y = this.options.edgePadding;
      this.moveHorizontally(delta);
      return;
    }

    if (this.state === "climbSide") {
      this.x = this.currentEdge === "left" ? this.options.edgePadding : this.maxX();
      this.y += this.direction * this.speed * delta;
      if (this.y <= this.options.edgePadding) {
        this.y = this.options.edgePadding;
        this.direction = 1;
      }
      if (this.y >= this.floorY()) {
        this.y = this.floorY();
        this.direction = -1;
      }
      return;
    }

    if (this.state === "falling") {
      this.y += this.options.fallSpeed * delta;
      if (this.y >= this.floorY()) {
        this.y = this.floorY();
        this.startFallen(time);
      }
      return;
    }

    if (this.state === "jumpToEdge" && this.jumpPlan) {
      const t = clamp((time - this.jumpPlan.startTime) / this.jumpPlan.duration, 0, 1);
      this.x = this.jumpPlan.startX + (this.jumpPlan.endX - this.jumpPlan.startX) * t;
      this.y = this.jumpPlan.startY + (this.jumpPlan.endY - this.jumpPlan.startY) * t;
      if (this.jumpPlan.endX !== this.jumpPlan.startX) {
        this.direction = this.jumpPlan.endX > this.jumpPlan.startX ? 1 : -1;
      }
      if (t >= 1) this.startEdgeIdle(this.jumpPlan.edge, time);
    }
  }

  updateFrame(time, delta) {
    this.frameClock += delta * 1000;

    const frames = this.frameList(this.state);
    const interval = this.intervals[this.state] || 250;
    if (this.frameClock > interval) {
      this.frameClock = 0;
      if (this.state === "fallen") {
        this.frameIndex = Math.min(this.frameIndex + 1, frames.length - 1);
      } else {
        this.frameIndex = (this.frameIndex + 1) % frames.length;
      }
    }
    this.setFrame(frames[this.frameIndex]);
  }

  render() {
    const hop = this.state === "hop" ? Math.sin(this.jumpProgress() * Math.PI) * 34 : 0;
    this.el.dataset.state = this.state;
    this.el.dataset.edge = this.currentEdge;
    this.el.style.transform = `translate3d(${this.x}px, ${this.y - hop}px, 0)`;
    this.img.style.transform = `scaleX(${this.facingScale()})`;
  }

  setFrame(src) {
    if (this.img.getAttribute("src") === src) return;
    this.img.src = src;
  }

  wave() {
    this.state = "wave";
    this.actionUntil = now() + 1250;
    this.frameIndex = 0;
    this.frameClock = 0;
    this.el.classList.add("is-talking");
    this.setFrame(this.frameList("wave")[0]);
    this.ensureRunning();
  }

  jump() {
    this.currentEdge = "bottom";
    this.state = "hop";
    this.actionUntil = now() + 860;
    this.frameIndex = 0;
    this.frameClock = 0;
    this.setFrame(this.frameList("hop")[0]);
    this.ensureRunning();
  }

  pause() {
    this.paused = true;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  resume() {
    if (!this.paused) return;
    this.paused = false;
    this.lastTime = now();
    this.raf = requestAnimationFrame((time) => this.tick(time));
  }

  toggle() {
    if (this.paused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  isPaused() {
    return this.paused;
  }

  setSpeed(speed) {
    this.speed = Number(speed);
  }

  getSpeed() {
    return this.speed;
  }

  setSize(size) {
    this.size = Number(size);
    this.applySize();
    this.x = clamp(this.x, this.options.edgePadding, this.maxX());
    this.y = this.floorY();
    this.render();
  }

  setJumpChance(percent) {
    this.options.jumpChance = clamp(Number(percent) / 100, 0, 1);
  }

  getJumpChancePercent() {
    return Math.round(this.options.jumpChance * 100);
  }

  setWalkDelay(seconds) {
    const delay = Math.max(500, Number(seconds) * 1000);
    this.options.walkDelayMin = Math.max(250, delay * 0.65);
    this.options.walkDelayMax = Math.max(this.options.walkDelayMin + 250, delay * 1.35);
    if (this.state === "walk") {
      this.nextPauseAt = now() + this.randomRange(this.options.walkDelayMin, this.options.walkDelayMax);
    }
  }

  getWalkDelaySeconds() {
    return Math.round(((this.options.walkDelayMin + this.options.walkDelayMax) / 2) / 100) / 10;
  }

  setRestDuration(seconds) {
    const duration = Math.max(500, Number(seconds) * 1000);
    this.options.restDurationMin = Math.max(250, duration * 0.75);
    this.options.restDurationMax = Math.max(this.options.restDurationMin + 250, duration * 1.25);
    if (this.state === "rest") {
      this.actionUntil = now() + this.randomRange(this.options.restDurationMin, this.options.restDurationMax);
    }
  }

  getRestDurationSeconds() {
    return Math.round(((this.options.restDurationMin + this.options.restDurationMax) / 2) / 100) / 10;
  }

  reset() {
    this.applySize();
    this.x = Math.max(this.options.edgePadding, window.innerWidth - this.currentSize - this.options.right);
    this.y = this.floorY();
    this.direction = -1;
    this.currentEdge = "bottom";
    this.jumpPlan = null;
    this.state = "walk";
    this.frameClock = 0;
    this.frameIndex = 0;
    this.nextPauseAt = now() + this.randomRange(this.options.walkDelayMin, this.options.walkDelayMax);
    this.el?.classList.remove("is-talking");
    this.render();
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("pointerup", this.onPointerUp);
    window.removeEventListener("pointercancel", this.onPointerUp);
    window.removeEventListener("mouseup", this.onPointerUp);
    this.el?.remove();
  }

  ensureRunning() {
    if (!this.paused && !this.raf) {
      this.lastTime = now();
      this.raf = requestAnimationFrame((time) => this.tick(time));
    }
  }

  jumpProgress() {
    const total = 860;
    const remaining = Math.max(0, this.actionUntil - now());
    return clamp(1 - remaining / total, 0, 1);
  }

  maxX() {
    return Math.max(this.options.edgePadding, window.innerWidth - this.currentSize - this.options.edgePadding);
  }

  floorY() {
    return Math.max(this.options.edgePadding, window.innerHeight - this.currentSize - this.options.bottom);
  }

  randomRange(min, max) {
    return min + Math.random() * (max - min);
  }

  actionDuration(state) {
    if (state === "idle") return this.randomRange(3000, 11000);
    if (state === "rest") return this.randomRange(this.options.restDurationMin, this.options.restDurationMax);
    if (state === "wave") return 1300;
    if (state === "dance") return 1250;
    if (state === "trip") return 900;
    return 1200;
  }

  frameList(state) {
    if (state === "hop" || state === "jumpToEdge") return this.frameList("jump");
    const frames = this.frames[state] ?? this.frames.stand;
    return Array.isArray(frames) ? frames : [frames];
  }

  moveHorizontally(delta) {
    this.x += this.direction * this.speed * delta;
    if (this.x <= this.options.edgePadding) {
      this.x = this.options.edgePadding;
      this.direction = 1;
    }
    if (this.x >= this.maxX()) {
      this.x = this.maxX();
      this.direction = -1;
    }
  }

  startWalk(time = now(), minDelay = this.options.walkDelayMin, maxDelay = this.options.walkDelayMax) {
    this.currentEdge = "bottom";
    this.jumpPlan = null;
    this.state = "walk";
    this.y = this.floorY();
    this.frameIndex = 0;
    this.frameClock = 0;
    this.nextPauseAt = time + this.randomRange(minDelay, maxDelay);
    this.el?.classList.remove("is-talking");
  }

  startFalling(time = now()) {
    this.currentEdge = "bottom";
    this.jumpPlan = null;
    this.state = "falling";
    this.frameIndex = 0;
    this.frameClock = 0;
    this.actionUntil = Infinity;
    this.el?.classList.remove("is-talking");
    if (this.y >= this.floorY() - 1) this.startFallen(time);
  }

  startFallen(time = now()) {
    this.currentEdge = "bottom";
    this.state = "fallen";
    this.frameIndex = 0;
    this.frameClock = 0;
    this.y = this.floorY();
    this.actionUntil = time + this.frameList("fallen").length * this.intervals.fallen + this.options.gettingUpDelay;
  }

  startJumpToEdge(edge, time = now()) {
    const end = this.edgePoint(edge);
    const dx = end.x - this.x;
    const dy = end.y - this.y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    this.currentEdge = "bottom";
    this.state = "jumpToEdge";
    this.frameIndex = 0;
    this.frameClock = 0;
    this.jumpPlan = {
      edge,
      startTime: time,
      duration: Math.max(450, (distance / this.options.jumpSpeed) * 1000),
      startX: this.x,
      startY: this.y,
      endX: end.x,
      endY: end.y
    };
    this.actionUntil = time + this.jumpPlan.duration;
  }

  startEdgeIdle(edge, time = now()) {
    this.currentEdge = edge;
    this.jumpPlan = null;
    this.snapToEdge(edge);
    this.state = edge === "top" ? "hangTop" : "hangSide";
    this.frameIndex = 0;
    this.frameClock = 0;
    this.actionUntil = time + this.randomRange(2800, 7600);
  }

  pickEdgeAction(time = now()) {
    const actions = ["hang", "climb", "climb", "climb", "climb", "fall", "fall"];
    const action = actions[Math.floor(Math.random() * actions.length)];
    if (action === "fall") {
      this.startFalling(time);
      return;
    }
    if (action === "hang") {
      this.startEdgeIdle(this.currentEdge, time);
      return;
    }

    this.state = this.currentEdge === "top" ? "climbTop" : "climbSide";
    this.frameIndex = 0;
    this.frameClock = 0;
    this.actionUntil = time + this.randomRange(1800, 4300);
    this.direction = Math.random() < 0.5 ? -1 : 1;
    this.snapToEdge(this.currentEdge);
  }

  randomEdge() {
    const edges = ["top", "left", "right"];
    return edges[Math.floor(Math.random() * edges.length)];
  }

  edgePoint(edge) {
    if (edge === "top") {
      return {
        x: this.randomRange(this.options.edgePadding, this.maxX()),
        y: this.options.edgePadding
      };
    }
    return {
      x: edge === "left" ? this.options.edgePadding : this.maxX(),
      y: this.randomRange(this.options.edgePadding, this.floorY() - this.currentSize * 0.35)
    };
  }

  snapToEdge(edge) {
    if (edge === "top") {
      this.y = this.options.edgePadding;
      this.x = clamp(this.x, this.options.edgePadding, this.maxX());
      return;
    }
    this.x = edge === "left" ? this.options.edgePadding : this.maxX();
    this.y = clamp(this.y, this.options.edgePadding, this.floorY());
  }

  isEdgeState(state) {
    return state === "hangSide" || state === "hangTop" || state === "climbSide" || state === "climbTop";
  }

  facingScale() {
    if (this.currentEdge === "left") return -1;
    if (this.currentEdge === "right") return 1;
    return this.direction < 0 ? 1 : -1;
  }

  applySize() {
    const mobileScale = window.matchMedia("(max-width: 760px)").matches ? 0.7 : 1;
    this.currentSize = Math.max(50, Math.round(this.size * mobileScale));
    this.el?.style.setProperty("--walker-size", `${this.currentSize}px`);
  }
}
