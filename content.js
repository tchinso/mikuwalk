const DEFAULT_SETTINGS = {
  speed: 50,
  size: 100,
  jump: 28,
  interval: 4.3,
  idle: 7,
  rest: 5,
  paused: false,
  blockedPages: ""
};

const NUMBER_LIMITS = {
  speed: [25, 170],
  size: [64, 140],
  jump: [0, 100],
  interval: [1, 12],
  idle: [1, 16],
  rest: [1, 12]
};

const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS);

let host = null;
let shadow = null;
let walker = null;
let walkerModulePromise = null;
let loadingWalker = false;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function cleanNumber(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return clamp(number, min, max);
}

function normalizeSettings(raw = {}) {
  const settings = { ...DEFAULT_SETTINGS, ...raw };
  for (const [key, limits] of Object.entries(NUMBER_LIMITS)) {
    settings[key] = cleanNumber(settings[key], DEFAULT_SETTINGS[key], limits[0], limits[1]);
  }
  settings.paused = Boolean(settings.paused);
  settings.blockedPages = String(settings.blockedPages || "");
  return settings;
}

function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(DEFAULT_SETTINGS, (items) => {
      resolve(normalizeSettings(items));
    });
  });
}

function extensionUrl(path) {
  return chrome.runtime.getURL(path);
}

function asset(path) {
  return extensionUrl(`assets/miku/${path}`);
}

function frameMap() {
  return {
    stand: asset("shime1.png"),
    walk: [asset("shime1.png"), asset("shime2.png"), asset("shime3.png"), asset("shime2.png")],
    idle: asset("shime11.png"),
    rest: [asset("shime26.png"), asset("shime27.png"), asset("shime28.png"), asset("shime27.png")],
    wave: [asset("shime15.png"), asset("shime16.png"), asset("shime17.png")],
    dance: [asset("shime5.png"), asset("shime6.png"), asset("shime1.png")],
    trip: [asset("shime18.png"), asset("shime19.png"), asset("shime19.png")],
    drag: [asset("shime7.png"), asset("shime5.png"), asset("shime8.png"), asset("shime6.png")],
    falling: [asset("shime10.png"), asset("shime18.png")],
    fallen: [asset("shime9.png"), asset("shime4.png"), asset("shime19.png")],
    hangSide: asset("shime12.png"),
    climbSide: [asset("shime13.png"), asset("shime14.png")],
    hangTop: asset("shime23.png"),
    climbTop: [asset("shime24.png"), asset("shime25.png")],
    jump: asset("shime22.png")
  };
}

function durationRange(seconds, spread = 0.25) {
  const duration = Math.max(0.5, Number(seconds)) * 1000;
  return {
    min: Math.max(250, duration * (1 - spread)),
    max: Math.max(500, duration * (1 + spread))
  };
}

function walkerOptions(settings) {
  const walkDelay = durationRange(settings.interval, 0.35);
  const idleDuration = durationRange(settings.idle);
  const restDuration = durationRange(settings.rest);
  return {
    size: settings.size,
    speed: settings.speed,
    bottom: 18,
    right: 28,
    bubbleText: "Miku",
    jumpChance: settings.jump / 100,
    walkDelayMin: walkDelay.min,
    walkDelayMax: walkDelay.max,
    idleDurationMin: idleDuration.min,
    idleDurationMax: idleDuration.max,
    restDurationMin: restDuration.min,
    restDurationMax: restDuration.max,
    frames: frameMap()
  };
}

function applySettings(settings) {
  if (!walker) return;
  walker.setSpeed(settings.speed);
  walker.setSize(settings.size);
  walker.setJumpChance(settings.jump);
  walker.setWalkDelay(settings.interval);
  walker.setIdleDuration(settings.idle);
  walker.setRestDuration(settings.rest);
  if (settings.paused) {
    walker.pause();
  } else {
    walker.resume();
  }
}

function ensureRoot() {
  if (host && shadow) return shadow;

  host = document.createElement("div");
  host.id = "miku-walker-extension-host";
  host.style.setProperty("all", "initial", "important");
  host.style.setProperty("position", "fixed", "important");
  host.style.setProperty("inset", "0", "important");
  host.style.setProperty("z-index", "2147483647", "important");
  host.style.setProperty("pointer-events", "none", "important");
  host.style.setProperty("display", "block", "important");

  shadow = host.attachShadow({ mode: "open" });
  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = extensionUrl("miku-walker-extension.css");
  shadow.append(stylesheet);

  (document.documentElement || document.body).append(host);
  return shadow;
}

async function ensureWalker(settings) {
  if (walker || loadingWalker) return;

  loadingWalker = true;
  try {
    ensureRoot();
    if (!walkerModulePromise) {
      walkerModulePromise = import(extensionUrl("miku-walker.js"));
    }
    const { createMikuWalker } = await walkerModulePromise;
    walker = createMikuWalker(walkerOptions(settings), shadow);
    applySettings(settings);
  } finally {
    loadingWalker = false;
  }
}

function destroyWalker() {
  walker?.destroy();
  walker = null;
  host?.remove();
  host = null;
  shadow = null;
}

function wildcardToRegExp(pattern) {
  const escaped = pattern.replace(/[|\\{}()[\]^$+?.]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`, "i");
}

function pageIsBlocked(blockedPages) {
  const lines = String(blockedPages || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));

  if (!lines.length) return false;

  const current = new URL(location.href);
  const fullUrl = current.href;
  const hostAndPath = `${current.hostname}${current.pathname}${current.search}${current.hash}`;
  const hostname = current.hostname.toLowerCase();

  return lines.some((line) => {
    const pattern = line.toLowerCase();
    if (pattern.includes("*")) {
      const matcher = wildcardToRegExp(pattern);
      return matcher.test(fullUrl.toLowerCase()) || matcher.test(hostAndPath.toLowerCase());
    }

    if (!pattern.includes("/") && !pattern.includes(":")) {
      return hostname === pattern || hostname.endsWith(`.${pattern}`);
    }

    try {
      const blockedUrl = new URL(line);
      const normalizedBlocked = blockedUrl.href.replace(/\/$/, "");
      const normalizedCurrent = current.href.replace(/\/$/, "");
      return normalizedCurrent === normalizedBlocked;
    } catch {
      return hostAndPath.toLowerCase().startsWith(pattern);
    }
  });
}

async function syncWalker() {
  const settings = await getSettings();
  if (pageIsBlocked(settings.blockedPages)) {
    destroyWalker();
    return;
  }

  await ensureWalker(settings);
  applySettings(settings);
}

function shouldHandleStorageChanges(changes) {
  return SETTING_KEYS.some((key) => Object.prototype.hasOwnProperty.call(changes, key));
}

function boot() {
  if (!/^https?:$/.test(location.protocol)) return;
  void syncWalker();
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && shouldHandleStorageChanges(changes)) {
      void syncWalker();
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
