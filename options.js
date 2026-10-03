import {
  DEFAULT_LANGUAGE,
  normalizeLanguage,
  translate,
  applyTranslations,
  populateLanguageSelect
} from "./i18n.js";

const DEFAULT_SETTINGS = {
  blockedPages: "",
  language: DEFAULT_LANGUAGE
};

const languageSelect = document.querySelector("#languageSelect");
const blockedPages = document.querySelector("#blockedPages");
const saveButton = document.querySelector("#saveButton");
const clearButton = document.querySelector("#clearButton");
const saveStatus = document.querySelector("#saveStatus");
let language = DEFAULT_LANGUAGE;
let statusKey = "ready";

populateLanguageSelect(languageSelect);

function setLanguage(value) {
  language = normalizeLanguage(value);
  languageSelect.value = language;
  applyTranslations(language);
  setStatus(statusKey);
}

function normalizeLines(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

function setStatus(key) {
  statusKey = key;
  saveStatus.textContent = translate(language, key);
}

function save() {
  chrome.storage.local.set({ blockedPages: normalizeLines(blockedPages.value) }, () => {
    blockedPages.value = normalizeLines(blockedPages.value);
    setStatus("saved");
  });
}

chrome.storage.local.get(DEFAULT_SETTINGS, (items) => {
  blockedPages.value = items.blockedPages || "";
  setLanguage(items.language);
});

languageSelect.addEventListener("change", () => {
  setLanguage(languageSelect.value);
  chrome.storage.local.set({ language });
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes.language) {
    setLanguage(changes.language.newValue);
  }
});

saveButton.addEventListener("click", save);

clearButton.addEventListener("click", () => {
  blockedPages.value = "";
  save();
});

blockedPages.addEventListener("input", () => {
  setStatus("unsaved");
});
