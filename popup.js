import {
  DEFAULT_LANGUAGE,
  normalizeLanguage,
  translate,
  applyTranslations,
  populateLanguageSelect
} from "./i18n.js";

const DEFAULT_SETTINGS = {
  speed: 50,
  size: 100,
  jump: 28,
  interval: 4.3,
  idle: 7,
  rest: 5,
  paused: false,
  blockedPages: "",
  language: DEFAULT_LANGUAGE
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
const languageSelect = document.querySelector("#languageSelect");
let saveTimer = 0;
let pendingSettings = {};
let currentHostname = "";
let currentSettings = { ...DEFAULT_SETTINGS };
let statusKey = "ready";

function formatSeconds(value) {
  const number = Number(value);
  const formatted = new Intl.NumberFormat(currentSettings.language, { maximumFractionDigits: 1 }).format(number);
  return `${formatted}${translate(currentSettings.language, "secondsUnit")}`;
}

function outputFor(name) {
  return document.querySelector(`#${name}Output`);
}

function setStatus(key) {
  statusKey = key;
  saveStatus.textContent = translate(currentSettings.language, key);
}

function updateOutput(input) {
  const formatter = FIELD_FORMATTERS[input.name] || String;
  outputFor(input.name).textContent = formatter(input.valueAsNumber);
}

function applySettings(settings) {
  currentSettings = { ...DEFAULT_SETTINGS, ...settings };
  currentSettings.language = normalizeLanguage(currentSettings.language);
  fields.forEach((input) => {
    input.value = currentSettings[input.name];
    updateOutput(input);
  });
  applyTranslations(currentSettings.language);
  languageSelect.value = currentSettings.language;
  setStatus(statusKey);
  syncPlaybackButton();
  setDomainButtonState();
}

function saveSettingsNow(partial) {
  currentSettings = { ...currentSettings, ...partial };
  chrome.storage.local.set(partial, () => {
    setStatus(Object.keys(pendingSettings).length ? "saving" : "saved");
    syncPlaybackButton();
  });
}

function scheduleSave(input) {
  currentSettings[input.name] = input.valueAsNumber;
  pendingSettings[input.name] = input.valueAsNumber;
  updateOutput(input);
  setStatus("saving");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushPendingSettings, 120);
}

function flushPendingSettings() {
  clearTimeout(saveTimer);
  if (!Object.keys(pendingSettings).length) return;
  const partial = pendingSettings;
  pendingSettings = {};
  saveSettingsNow(partial);
}

populateLanguageSelect(languageSelect);
applySettings(DEFAULT_SETTINGS);

chrome.storage.local.get(DEFAULT_SETTINGS, (items) => {
  applySettings({ ...DEFAULT_SETTINGS, ...items });
});

function syncPlaybackButton() {
  const paused = Boolean(currentSettings.paused);
  togglePlaybackButton.textContent = translate(currentSettings.language, paused ? "play" : "pause");
  togglePlaybackButton.setAttribute("aria-label", translate(currentSettings.language, paused ? "playLabel" : "pauseLabel"));
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
    addDomainButton.textContent = translate(currentSettings.language, "domainUnavailable");
    return;
  }

  const blockedPages = normalizeLines(currentSettings.blockedPages);
  const alreadyAdded = blockedPages.some((line) => line.toLowerCase() === currentHostname.toLowerCase());
  addDomainButton.disabled = alreadyAdded;
  addDomainButton.textContent = translate(currentSettings.language, alreadyAdded ? "domainAdded" : "addDomain");
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
    currentSettings[input.name] = input.valueAsNumber;
    pendingSettings[input.name] = input.valueAsNumber;
    flushPendingSettings();
  });
});

resetButton.addEventListener("click", () => {
  clearTimeout(saveTimer);
  pendingSettings = {};
  const { blockedPages, language, ...defaults } = DEFAULT_SETTINGS;
  applySettings({ ...currentSettings, ...defaults });
  chrome.storage.local.set(defaults, () => {
    setStatus("resetStatus");
  });
});

languageSelect.addEventListener("change", () => {
  const language = normalizeLanguage(languageSelect.value);
  // Updating language must not replace a slider value that is waiting to save.
  currentSettings.language = language;
  applyTranslations(language);
  languageSelect.value = language;
  fields.forEach(updateOutput);
  setStatus("saving");
  syncPlaybackButton();
  setDomainButtonState();
  saveSettingsNow({ language });
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
    if (Object.hasOwn(DEFAULT_SETTINGS, key) && !Object.hasOwn(pendingSettings, key)) {
      currentSettings[key] = change.newValue ?? DEFAULT_SETTINGS[key];
    }
  }
  applySettings(currentSettings);
});

loadCurrentHostname();
