import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import vm from "node:vm";
import { setTimeout as delay } from "node:timers/promises";

// Run with: node --experimental-vm-modules --test tests/localization.test.mjs
// The small DOM below covers the extension's settings UI without a browser dependency.
const ROOT = fileURLToPath(new URL("../", import.meta.url));
const LANGUAGE_CODES = ["ko", "en", "zh-CN", "zh-TW", "ja", "es", "id"];
const MOTION = { speed: 95, size: 116, jump: 60, interval: 6, idle: 8, rest: 9, paused: true };
const BLOCKED = "example.org\nhttps://private.test/*";

function decodeEntities(value) {
  return value.replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)))
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

class EventTarget {
  listeners = new Map();

  addEventListener(type, callback) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(callback);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, callback) {
    this.listeners.set(type, (this.listeners.get(type) || []).filter((item) => item !== callback));
  }

  dispatch(type, details = {}) {
    if (type === "click" && this.disabled) return;
    const event = { type, target: this, currentTarget: this, preventDefault() {}, ...details };
    for (const callback of this.listeners.get(type) || []) callback(event);
  }
}

class Element extends EventTarget {
  constructor(tagName, ownerDocument) {
    super();
    this.nodeType = 1;
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.attributes = new Map();
    this.children = [];
    this.parts = [];
    this.value = "";
    this.disabled = false;
    this.style = { setProperty() {} };
    const classes = new Set();
    this.classList = { add: (...items) => items.forEach((item) => classes.add(item)),
      remove: (...items) => items.forEach((item) => classes.delete(item)),
      toggle: (item, force) => (force ?? !classes.has(item)) ? classes.add(item) : classes.delete(item) };
  }

  get id() { return this.getAttribute("id") || ""; }
  set id(value) { this.setAttribute("id", value); }
  get name() { return this.getAttribute("name") || ""; }
  get lang() { return this.getAttribute("lang") || ""; }
  set lang(value) { this.setAttribute("lang", value); }
  get className() { return this.getAttribute("class") || ""; }
  set className(value) { this.setAttribute("class", value); }
  get valueAsNumber() { return Number(this.value); }
  get options() { return this.children; }
  get dataset() {
    return Object.fromEntries([...this.attributes].filter(([name]) => name.startsWith("data-"))
      .map(([name, value]) => [name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()), value]));
  }
  get textContent() { return this.parts.map((part) => typeof part === "string" ? part : part.textContent).join(""); }
  set textContent(value) { this.children = []; this.parts = [String(value)]; }
  get innerHTML() { return this.textContent; }
  set innerHTML(value) {
    this.replaceChildren();
    if (value) parseInto(this, value, this.ownerDocument);
  }

  getAttribute(name) { return this.attributes.get(name) ?? null; }
  setAttribute(name, value) {
    this.attributes.set(name, String(value));
    if (name === "value") this.value = String(value);
    if (name === "disabled") this.disabled = true;
  }
  removeAttribute(name) {
    this.attributes.delete(name);
    if (name === "disabled") this.disabled = false;
  }

  append(...items) {
    for (const item of items) {
      this.parts.push(item);
      if (typeof item !== "string") { this.children.push(item); item.parentNode = this; }
    }
  }
  appendChild(item) { this.append(item); return item; }
  replaceChildren(...items) { this.children = []; this.parts = []; this.append(...items); }
  remove() {
    if (!this.parentNode) return;
    this.parentNode.children = this.parentNode.children.filter((item) => item !== this);
    this.parentNode.parts = this.parentNode.parts.filter((item) => item !== this);
  }
  attachShadow() { return this.shadowRoot = new Element("shadow-root", this.ownerDocument); }

  matches(selector) {
    const tag = selector.match(/^[a-z][\w-]*/i)?.[0];
    if (tag && this.tagName.toLowerCase() !== tag.toLowerCase()) return false;
    const id = selector.match(/#([\w-]+)/)?.[1];
    if (id && this.id !== id) return false;
    const className = selector.match(/\.([\w-]+)/)?.[1];
    if (className && !this.className.split(/\s+/).includes(className)) return false;
    for (const attribute of selector.matchAll(/\[([^\]=]+)(?:=['"]?([^\]'"\]]+)['"]?)?\]/g)) {
      const [, name, value] = attribute;
      if (!this.attributes.has(name) || (value !== undefined && this.getAttribute(name) !== value)) return false;
    }
    return true;
  }
  querySelectorAll(selector) {
    const selectors = selector.split(",").map((item) => item.trim());
    const elements = [];
    const visit = (element) => {
      for (const child of element.children) {
        if (selectors.some((item) => child.matches(item))) elements.push(child);
        visit(child);
      }
    };
    visit(this);
    return elements;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
}

function parseInto(parent, html, document) {
  const stack = [parent];
  const voidTags = new Set(["meta", "link", "img", "input", "br", "hr"]);
  for (const token of html.matchAll(/<!--[\s\S]*?-->|<![^>]*>|<\/([\w-]+)\s*>|<([\w-]+)([^>]*)>|([^<]+)/g)) {
    if (token[1]) { if (stack.length > 1) stack.pop(); }
    else if (token[2]) {
      const element = document.createElement(token[2]);
      for (const match of token[3].matchAll(/([\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
        element.setAttribute(match[1], decodeEntities(match[2] ?? match[3] ?? match[4] ?? ""));
      }
      stack.at(-1).append(element);
      if (!voidTags.has(token[2].toLowerCase())) stack.push(element);
    } else if (token[4]) stack.at(-1).append(decodeEntities(token[4]));
  }
}

class Document extends Element {
  constructor(html = "<html><head></head><body></body></html>") {
    super("document", null);
    this.nodeType = 9;
    this.ownerDocument = this;
    this.readyState = "complete";
    parseInto(this, html, this);
    this.documentElement = this.querySelector("html");
    this.body = this.querySelector("body");
  }
  createElement(tagName) { return new Element(tagName, this); }
  getElementById(id) { return this.querySelector(`#${id}`); }
  get title() { return this.querySelector("title")?.textContent || ""; }
  set title(value) { this.querySelector("title").textContent = value; }
}

class Storage {
  constructor(initial = {}) { this.items = { ...initial }; this.listeners = []; this.writes = []; }
  get(defaults, callback) {
    const result = Array.isArray(defaults)
      ? Object.fromEntries(defaults.filter((key) => key in this.items).map((key) => [key, this.items[key]]))
      : { ...defaults, ...this.items };
    queueMicrotask(() => callback(result));
  }
  set(partial, callback = () => {}) {
    const changes = {};
    this.writes.push({ ...partial });
    for (const [key, value] of Object.entries(partial)) {
      if (this.items[key] !== value) changes[key] = { oldValue: this.items[key], newValue: value };
      this.items[key] = value;
    }
    queueMicrotask(() => {
      if (Object.keys(changes).length) this.listeners.forEach((listener) => listener(changes, "local"));
      callback();
    });
  }
  remove(key) {
    const oldValue = this.items[key];
    delete this.items[key];
    queueMicrotask(() => this.listeners.forEach((listener) => listener({ [key]: { oldValue } }, "local")));
  }
}

async function settle() { for (let index = 0; index < 12; index += 1) await Promise.resolve(); }

async function until(predicate) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (predicate()) return;
    await delay(5);
  }
  assert.ok(predicate(), "Content script did not reach the expected state");
}

async function browserPage(name, storage = new Storage(), tabUrl = "https://current.test/path", beforeImport = async () => {}) {
  const html = name === "content" ? undefined : await readFile(path.join(ROOT, `${name}.html`), "utf8");
  const document = new Document(html);
  const timers = new Map();
  let timerId = 0;
  const chrome = {
    storage: { local: { get: storage.get.bind(storage), set: storage.set.bind(storage) },
      onChanged: { addListener: (listener) => storage.listeners.push(listener) } },
    tabs: { query: (_, callback) => queueMicrotask(() => callback([{ url: tabUrl }])) },
    i18n: { getUILanguage: () => "ko-KR", getMessage: () => "" },
    runtime: { getURL: (file) => pathToFileURL(path.join(ROOT, file)).href, openOptionsPage() {} }
  };
  const window = new EventTarget();
  window.innerWidth = 1200;
  window.innerHeight = 800;
  window.matchMedia = () => ({ matches: false });
  const context = vm.createContext({ document, chrome, window, URL, console,
    location: new URL(tabUrl), navigator: { language: "ko-KR", languages: ["ko-KR"] },
    performance: { now: () => 1000 },
    setTimeout: (callback) => { const id = ++timerId; timers.set(id, callback); return id; },
    clearTimeout: (id) => timers.delete(id),
    requestAnimationFrame: () => ++timerId, cancelAnimationFrame() {},
    matchMedia: () => ({ matches: false }) });
  const modules = new Map();
  async function loadModule(specifier, referrer = pathToFileURL(path.join(ROOT, `${name}.js`)).href) {
    const identifier = new URL(specifier, referrer).href;
    if (modules.has(identifier)) return modules.get(identifier);
    const source = await readFile(fileURLToPath(identifier), "utf8");
    const module = new vm.SourceTextModule(source, { context, identifier,
      importModuleDynamically: async (child, parent) => {
        await beforeImport(child);
        const loaded = await loadModule(child, parent.identifier);
        if (loaded.status === "linked") await loaded.evaluate();
        return loaded;
      } });
    modules.set(identifier, module);
    await module.link((child, parent) => loadModule(child, parent.identifier));
    return module;
  }
  const entry = await loadModule(`./${name}.js`);
  await entry.evaluate();
  await settle();
  const i18n = await loadModule("./i18n.js");
  if (i18n.status === "linked") await i18n.evaluate();
  return { document, storage, i18n: i18n.namespace, loadModule,
    element: (id) => document.getElementById(id),
    async event(id, type, details) { document.getElementById(id).dispatch(type, details); await settle(); },
    async language(code) { document.getElementById("languageSelect").value = code; await this.event("languageSelect", "change"); },
    async timers() { const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach((callback) => callback()); await settle(); } };
}

function expectMessage(page, id, language, key, attribute) {
  const actual = attribute ? page.element(id).getAttribute(attribute) : page.element(id).textContent;
  assert.equal(actual, page.i18n.translate(language, key), `${id} should render ${key} in ${language}`);
}

function expectTranslatedMarkup(page, language) {
  assert.equal(page.document.documentElement.lang, language);
  assert.equal(page.element("languageSelect").value, language);
  const localized = page.document.querySelectorAll("[data-i18n], [data-i18n-aria-label]");
  assert.ok(localized.length > 5, "Page should mark visible text and accessible labels for translation");
  for (const element of localized) {
    for (const [source, target] of [["data-i18n", null], ["data-i18n-aria-label", "aria-label"]]) {
      const key = element.getAttribute(source);
      if (!key) continue;
      const translated = page.i18n.translate(language, key);
      assert.notEqual(translated, key, `Missing translation: ${language}/${key}`);
      assert.equal(target ? element.getAttribute(target) : element.textContent, translated, `${language}/${key}`);
    }
  }
  assert.deepEqual(page.element("languageSelect").children.map((option) => option.value), LANGUAGE_CODES);
}

test("version and native extension catalogs cover the seven supported languages", async () => {
  const manifest = JSON.parse(await readFile(path.join(ROOT, "manifest.json"), "utf8"));
  assert.equal(manifest.version, "1.1.0");
  assert.equal(manifest.default_locale, "en");
  assert.equal(manifest.name, "__MSG_extensionName__");
  assert.equal(manifest.description, "__MSG_extensionDescription__");
  assert.equal(manifest.action.default_title, "__MSG_extensionName__");
  const catalogs = await Promise.all(LANGUAGE_CODES.map((language) =>
    readFile(path.join(ROOT, "_locales", language.replace("-", "_"), "messages.json"), "utf8").then(JSON.parse)));
  const keys = Object.keys(catalogs[0]).sort();
  assert.ok(keys.includes("extensionName"));
  assert.ok(keys.includes("extensionDescription"));
  for (const catalog of catalogs) {
    assert.deepEqual(Object.keys(catalog).sort(), keys);
    for (const { message } of Object.values(catalog)) assert.ok(typeof message === "string" && message.trim());
  }
});

test("both settings pages default to English despite a Korean browser locale", async () => {
  for (const name of ["popup", "options"]) {
    const page = await browserPage(name);
    expectTranslatedMarkup(page, "en");
    assert.equal(page.i18n.DEFAULT_LANGUAGE, "en");
    assert.deepEqual(Array.from(page.i18n.LANGUAGES, ({ code }) => code), LANGUAGE_CODES);
  }
});

test("all seven stored languages render both pages completely", async () => {
  for (const language of LANGUAGE_CODES) {
    for (const name of ["popup", "options"]) {
      const page = await browserPage(name, new Storage({ language }));
      expectTranslatedMarkup(page, language);
      expectMessage(page, "saveStatus", language, "ready");
    }
  }
});

test("language normalization and invalid or removed storage fall back to English", async () => {
  const page = await browserPage("popup");
  for (const value of [undefined, null, 42, "", "fr", "en-US", {}, ["ja"]]) {
    assert.equal(page.i18n.normalizeLanguage(value), "en");
    assert.equal(page.i18n.translate(value, "speed"), page.i18n.translate("en", "speed"));
  }
  assert.equal(page.i18n.normalizeLanguage(" zh_cn "), "zh-CN");
  assert.equal(page.i18n.normalizeLanguage("ZH_tw"), "zh-TW");
  for (const name of ["popup", "options"]) {
    const invalid = await browserPage(name, new Storage({ language: "unsupported" }));
    expectTranslatedMarkup(invalid, "en");
    await invalid.language("ja");
    invalid.storage.remove("language");
    await settle();
    assert.equal(invalid.document.documentElement.lang, "en");
    assert.equal(invalid.element("languageSelect").value, "en");
  }
});

test("popup language selection persists, reopens, and preserves pet settings", async () => {
  const storage = new Storage({ ...MOTION, blockedPages: BLOCKED });
  const popup = await browserPage("popup", storage);
  for (const language of LANGUAGE_CODES) {
    await popup.language(language);
    assert.deepEqual(storage.items, { ...MOTION, blockedPages: BLOCKED, language });
    assert.equal(popup.document.documentElement.lang, language);
    expectMessage(popup, "togglePlaybackButton", language, "play");
    expectMessage(popup, "togglePlaybackButton", language, "playLabel", "aria-label");
  }
  const reopened = await browserPage("popup", storage);
  assert.equal(reopened.document.documentElement.lang, "id");
  for (const [name, value] of Object.entries(MOTION)) {
    if (name !== "paused") assert.equal(Number(reopened.element(`${name}Input`).value), value);
  }
});

test("popup and options synchronize language without losing an unsaved blocked-page draft", async () => {
  const storage = new Storage({ ...MOTION, blockedPages: BLOCKED, language: "ko" });
  const popup = await browserPage("popup", storage);
  const options = await browserPage("options", storage);
  const draft = "draft.test\nhttps://draft.test/*\n";
  options.element("blockedPages").value = draft;
  await options.event("blockedPages", "input");
  expectMessage(options, "saveStatus", "ko", "unsaved");
  await popup.language("es");
  assert.equal(options.document.documentElement.lang, "es");
  assert.equal(options.element("languageSelect").value, "es");
  assert.equal(options.element("blockedPages").value, draft);
  expectMessage(options, "saveStatus", "es", "unsaved");
  await options.language("zh-TW");
  assert.equal(popup.document.documentElement.lang, "zh-TW");
  assert.equal(options.element("blockedPages").value, draft);
  assert.equal(storage.items.blockedPages, BLOCKED);
  assert.deepEqual(Object.fromEntries(Object.keys(MOTION).map((key) => [key, storage.items[key]])), MOTION);
  await options.event("saveButton", "click");
  assert.equal(storage.items.blockedPages, draft.trim());
  expectMessage(options, "saveStatus", "zh-TW", "saved");
  await options.event("clearButton", "click");
  assert.equal(storage.items.blockedPages, "");
  expectMessage(options, "saveStatus", "zh-TW", "saved");
});

test("playback and current-domain actions stay localized as their state changes", async () => {
  const storage = new Storage({ language: "ja" });
  const popup = await browserPage("popup", storage);
  expectMessage(popup, "togglePlaybackButton", "ja", "pause");
  expectMessage(popup, "togglePlaybackButton", "ja", "pauseLabel", "aria-label");
  await popup.event("togglePlaybackButton", "click");
  assert.equal(storage.items.paused, true);
  expectMessage(popup, "togglePlaybackButton", "ja", "play");
  expectMessage(popup, "togglePlaybackButton", "ja", "playLabel", "aria-label");
  await popup.language("en");
  expectMessage(popup, "togglePlaybackButton", "en", "play");
  await popup.event("togglePlaybackButton", "click");
  assert.equal(storage.items.paused, false);
  expectMessage(popup, "togglePlaybackButton", "en", "pause");
  expectMessage(popup, "addDomainButton", "en", "addDomain");
  await popup.event("addDomainButton", "click");
  assert.equal(storage.items.blockedPages, "current.test");
  assert.equal(popup.element("addDomainButton").disabled, true);
  expectMessage(popup, "addDomainButton", "en", "domainAdded");
  await popup.language("zh-CN");
  expectMessage(popup, "addDomainButton", "zh-CN", "domainAdded");
  const unavailable = await browserPage("popup", new Storage({ language: "id" }), "chrome://extensions/");
  assert.equal(unavailable.element("addDomainButton").disabled, true);
  expectMessage(unavailable, "addDomainButton", "id", "domainUnavailable");
  const alreadyAdded = await browserPage("popup", new Storage({ language: "es", blockedPages: "CURRENT.TEST" }));
  assert.equal(alreadyAdded.element("addDomainButton").disabled, true);
  expectMessage(alreadyAdded, "addDomainButton", "es", "domainAdded");
});

test("saving and reset messages translate live while reset retains language and blocked pages", async () => {
  const storage = new Storage({ ...MOTION, blockedPages: BLOCKED, language: "en" });
  const popup = await browserPage("popup", storage);
  popup.element("speedInput").value = "130";
  await popup.event("speedInput", "input");
  expectMessage(popup, "saveStatus", "en", "saving");
  await popup.language("ja");
  assert.equal(Number(popup.element("speedInput").value), 130);
  // Language writes must not report the pending slider value as already saved.
  expectMessage(popup, "saveStatus", "ja", "saving");
  await popup.timers();
  assert.equal(storage.items.speed, 130);
  expectMessage(popup, "saveStatus", "ja", "saved");
  await popup.event("resetButton", "click");
  assert.equal(storage.items.language, "ja");
  assert.equal(storage.items.blockedPages, BLOCKED);
  assert.equal(storage.items.speed, 50);
  assert.equal(storage.items.paused, false);
  expectMessage(popup, "saveStatus", "ja", "resetStatus");
  storage.set({ language: "es" });
  await settle();
  expectMessage(popup, "saveStatus", "es", "resetStatus");
  const options = await browserPage("options", storage);
  assert.equal(options.element("blockedPages").value, BLOCKED);
  assert.equal(options.element("languageSelect").value, "es");
});

test("reset cancels every pending slider change before its debounce can overwrite defaults", async () => {
  const storage = new Storage({ ...MOTION, blockedPages: BLOCKED, language: "zh-CN" });
  const popup = await browserPage("popup", storage);
  popup.element("speedInput").value = "150";
  await popup.event("speedInput", "input");
  popup.element("sizeInput").value = "136";
  await popup.event("sizeInput", "input");
  storage.set({ language: "id" });
  await settle();
  assert.equal(Number(popup.element("speedInput").value), 150);
  assert.equal(Number(popup.element("sizeInput").value), 136);
  expectMessage(popup, "saveStatus", "id", "saving");
  await popup.event("resetButton", "click");
  await popup.timers();
  assert.equal(storage.items.speed, 50);
  assert.equal(storage.items.size, 100);
  assert.equal(storage.items.language, "id");
  assert.equal(storage.items.blockedPages, BLOCKED);
  expectMessage(popup, "saveStatus", "id", "resetStatus");
});

test("a mounted content pet updates its bubble and accessible label in all seven languages", async () => {
  const storage = new Storage({ language: "en", paused: true });
  const page = await browserPage("content", storage);
  await until(() => page.element("miku-walker-extension-host")?.shadowRoot?.querySelector(".miku-walker"));
  const host = page.element("miku-walker-extension-host");
  const pet = host.shadowRoot.querySelector(".miku-walker");
  const bubble = host.shadowRoot.querySelector(".miku-walker__bubble");
  for (const language of LANGUAGE_CODES) {
    storage.set({ language });
    await until(() => pet.lang === language);
    assert.equal(bubble.textContent, page.i18n.translate(language, "petName"));
    assert.equal(pet.getAttribute("aria-label"), page.i18n.translate(language, "mascotLabel"));
    assert.equal(page.element("miku-walker-extension-host"), host, "Language changes should retain the mounted pet");
    assert.equal(storage.items.paused, true);
  }
  storage.set({ language: "unsupported" });
  await until(() => pet.lang === "en");
  assert.equal(bubble.textContent, page.i18n.translate("en", "petName"));
});

test("language changes made during the first walker import apply after the pet mounts", async () => {
  let releaseImport;
  let importStarted;
  const gate = new Promise((resolve) => { releaseImport = resolve; });
  const started = new Promise((resolve) => { importStarted = resolve; });
  const storage = new Storage({ language: "en", paused: true });
  const page = await browserPage("content", storage, "https://current.test/path", async (specifier) => {
    if (specifier.endsWith("miku-walker.js")) { importStarted(); await gate; }
  });
  await started;
  storage.set({ language: "ja" });
  storage.set({ language: "es" });
  await settle();
  releaseImport();
  await until(() => page.element("miku-walker-extension-host")?.shadowRoot?.querySelector(".miku-walker")?.lang === "es");
  const pet = page.element("miku-walker-extension-host").shadowRoot.querySelector(".miku-walker");
  assert.equal(pet.getAttribute("aria-label"), page.i18n.translate("es", "mascotLabel"));
});
