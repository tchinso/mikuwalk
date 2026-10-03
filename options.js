const DEFAULT_SETTINGS = {
  blockedPages: ""
};

const blockedPages = document.querySelector("#blockedPages");
const saveButton = document.querySelector("#saveButton");
const clearButton = document.querySelector("#clearButton");
const saveStatus = document.querySelector("#saveStatus");

function normalizeLines(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

function setStatus(text) {
  saveStatus.textContent = text;
}

function save() {
  chrome.storage.local.set({ blockedPages: normalizeLines(blockedPages.value) }, () => {
    blockedPages.value = normalizeLines(blockedPages.value);
    setStatus("Saved");
  });
}

chrome.storage.local.get(DEFAULT_SETTINGS, (items) => {
  blockedPages.value = items.blockedPages || "";
});

saveButton.addEventListener("click", save);

clearButton.addEventListener("click", () => {
  blockedPages.value = "";
  save();
});

blockedPages.addEventListener("input", () => {
  setStatus("Unsaved");
});
