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

const FIELD_FORMATTERS = {
  speed: (value) => String(Math.round(value)),
  size: (value) => `${Math.round(value)}px`,
  jump: (value) => `${Math.round(value)}%`,
  interval: formatSeconds,
  idle: formatSeconds,
  rest: formatSeconds
};

const fields = [...document.querySelectorAll("input[type='range']")];
const saveStatus = document.querySelector("#saveStatus");
const resetButton = document.querySelector("#resetButton");
const optionsButton = document.querySelector("#optionsButton");
const togglePlaybackButton = document.querySelector("#togglePlaybackButton");
const addDomainButton = document.querySelector("#addDomainButton");
let saveTimer = 0;
let currentHostname = "";
let currentSettings = { ...DEFAULT_SETTINGS };

function formatSeconds(value) {
  const number = Number(value);
  return `${number.toFixed(Number.isInteger(number) ? 0 : 1)}s`;
}

function outputFor(name) {
  return document.querySelector(`#${name}Output`);
}

function setStatus(text) {
  saveStatus.textContent = text;
}

function updateOutput(input) {
  const formatter = FIELD_FORMATTERS[input.name] || String;
  outputFor(input.name).textContent = formatter(input.valueAsNumber);
}

function applySettings(settings) {
  currentSettings = { ...DEFAULT_SETTINGS, ...settings };
  fields.forEach((input) => {
    input.value = settings[input.name];
    updateOutput(input);
  });
  syncPlaybackButton();
}

function saveSettingsNow(partial) {
  currentSettings = { ...currentSettings, ...partial };
  chrome.storage.local.set(partial, () => {
    setStatus("Saved");
    syncPlaybackButton();
  });
}

function scheduleSave(input) {
  updateOutput(input);
  setStatus("Saving");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveSettingsNow({ [input.name]: input.valueAsNumber });
  }, 120);
}

chrome.storage.local.get(DEFAULT_SETTINGS, (items) => {
  applySettings({ ...DEFAULT_SETTINGS, ...items });
});

function syncPlaybackButton() {
  const paused = Boolean(currentSettings.paused);
  togglePlaybackButton.textContent = paused ? "재생" : "정지";
  togglePlaybackButton.setAttribute("aria-label", paused ? "Play Miku" : "Pause Miku");
}

function normalizeLines(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function setDomainButtonState() {
  if (!currentHostname) {
    addDomainButton.disabled = true;
    addDomainButton.textContent = "추가할 수 없는 페이지";
    return;
  }

  const blockedPages = normalizeLines(currentSettings.blockedPages);
  const alreadyAdded = blockedPages.some((line) => line.toLowerCase() === currentHostname.toLowerCase());
  addDomainButton.disabled = alreadyAdded;
  addDomainButton.textContent = alreadyAdded ? "예외 목록에 추가됨" : "이 도메인을 예외 목록에 추가";
}

function loadCurrentHostname() {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    try {
      const url = new URL(tab?.url || "");
      if (url.protocol === "http:" || url.protocol === "https:") {
        currentHostname = url.hostname;
      }
    } catch {
      currentHostname = "";
    }
    setDomainButtonState();
  });
}

fields.forEach((input) => {
  input.addEventListener("input", () => scheduleSave(input));
  input.addEventListener("change", () => {
    clearTimeout(saveTimer);
    saveSettingsNow({ [input.name]: input.valueAsNumber });
  });
});

resetButton.addEventListener("click", () => {
  const { blockedPages, ...defaults } = DEFAULT_SETTINGS;
  applySettings(DEFAULT_SETTINGS);
  chrome.storage.local.set(defaults, () => {
    setStatus("Reset");
  });
});

optionsButton.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

togglePlaybackButton.addEventListener("click", () => {
  saveSettingsNow({ paused: !Boolean(currentSettings.paused) });
});

addDomainButton.addEventListener("click", () => {
  if (!currentHostname) return;

  const blockedPages = normalizeLines(currentSettings.blockedPages);
  if (!blockedPages.some((line) => line.toLowerCase() === currentHostname.toLowerCase())) {
    blockedPages.push(currentHostname);
  }

  saveSettingsNow({ blockedPages: blockedPages.join("\n") });
  setDomainButtonState();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;
  for (const [key, change] of Object.entries(changes)) {
    currentSettings[key] = change.newValue;
  }
  syncPlaybackButton();
  setDomainButtonState();
});

loadCurrentHostname();
