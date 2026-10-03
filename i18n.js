export const DEFAULT_LANGUAGE = "en";

export const LANGUAGES = [
  { code: "ko", label: "한국어" },
  { code: "en", label: "English" },
  { code: "zh-CN", label: "简体中文" },
  { code: "zh-TW", label: "繁體中文" },
  { code: "ja", label: "日本語" },
  { code: "es", label: "Español" },
  { code: "id", label: "Bahasa Indonesia" }
];

const TRANSLATIONS = {
  ko: {
    appTitle: "Miku Desktop Pet",
    petName: "미쿠 펫",
    optionsTitle: "Miku Desktop Pet 설정",
    quickActions: "빠른 실행",
    pause: "정지",
    play: "재생",
    pauseLabel: "미쿠 일시 정지",
    playLabel: "미쿠 재생",
    addDomain: "이 도메인을 예외 목록에 추가",
    domainUnavailable: "추가할 수 없는 페이지",
    domainAdded: "예외 목록에 추가됨",
    ready: "준비됨",
    saved: "저장됨",
    saving: "저장 중…",
    resetStatus: "초기화됨",
    unsaved: "저장되지 않음",
    speed: "이동 속도",
    size: "크기",
    jump: "점프 확률",
    interval: "걷기 간격",
    idle: "서 있는 시간",
    rest: "쉬는 시간",
    reset: "초기화",
    hiddenPages: "숨김 페이지",
    hiddenPagesDescription: "일치하는 URL이나 도메인에서 미쿠를 숨깁니다.",
    blockedPages: "숨길 URL 및 도메인",
    save: "저장",
    clear: "모두 지우기",
    language: "언어",
    mascotLabel: "걷는 미쿠",
    secondsUnit: "초"
  },
  en: {
    appTitle: "Miku Desktop Pet",
    petName: "Miku Pet",
    optionsTitle: "Miku Desktop Pet Settings",
    quickActions: "Quick actions",
    pause: "Pause",
    play: "Play",
    pauseLabel: "Pause Miku",
    playLabel: "Play Miku",
    addDomain: "Hide Miku on this domain",
    domainUnavailable: "This page cannot be added",
    domainAdded: "Domain added",
    ready: "Ready",
    saved: "Saved",
    saving: "Saving…",
    resetStatus: "Reset complete",
    unsaved: "Unsaved changes",
    speed: "Speed",
    size: "Size",
    jump: "Jump chance",
    interval: "Walk interval",
    idle: "Standing time",
    rest: "Resting time",
    reset: "Reset",
    hiddenPages: "Hidden pages",
    hiddenPagesDescription: "Hide Miku on matching URLs or domains.",
    blockedPages: "URLs and domains to hide on",
    save: "Save",
    clear: "Clear all",
    language: "Language",
    mascotLabel: "Walking Miku mascot",
    secondsUnit: "s"
  },
  "zh-CN": {
    appTitle: "Miku Desktop Pet",
    petName: "初音未来宠物",
    optionsTitle: "Miku Desktop Pet 设置",
    quickActions: "快捷操作",
    pause: "暂停",
    play: "播放",
    pauseLabel: "暂停初音未来",
    playLabel: "播放初音未来",
    addDomain: "在此域名隐藏初音未来",
    domainUnavailable: "无法添加此页面",
    domainAdded: "已添加域名",
    ready: "就绪",
    saved: "已保存",
    saving: "正在保存…",
    resetStatus: "已重置",
    unsaved: "更改未保存",
    speed: "移动速度",
    size: "大小",
    jump: "跳跃概率",
    interval: "行走间隔",
    idle: "站立时间",
    rest: "休息时间",
    reset: "重置",
    hiddenPages: "隐藏页面",
    hiddenPagesDescription: "在匹配的网址或域名上隐藏初音未来。",
    blockedPages: "要隐藏的网址和域名",
    save: "保存",
    clear: "全部清空",
    language: "语言",
    mascotLabel: "行走的初音未来",
    secondsUnit: "秒"
  },
  "zh-TW": {
    appTitle: "Miku Desktop Pet",
    petName: "初音未來寵物",
    optionsTitle: "Miku Desktop Pet 設定",
    quickActions: "快速操作",
    pause: "暫停",
    play: "播放",
    pauseLabel: "暫停初音未來",
    playLabel: "播放初音未來",
    addDomain: "在此網域隱藏初音未來",
    domainUnavailable: "無法新增此頁面",
    domainAdded: "已新增網域",
    ready: "就緒",
    saved: "已儲存",
    saving: "儲存中…",
    resetStatus: "已重設",
    unsaved: "變更尚未儲存",
    speed: "移動速度",
    size: "大小",
    jump: "跳躍機率",
    interval: "行走間隔",
    idle: "站立時間",
    rest: "休息時間",
    reset: "重設",
    hiddenPages: "隱藏頁面",
    hiddenPagesDescription: "在符合條件的網址或網域上隱藏初音未來。",
    blockedPages: "要隱藏的網址與網域",
    save: "儲存",
    clear: "全部清除",
    language: "語言",
    mascotLabel: "行走的初音未來",
    secondsUnit: "秒"
  },
  ja: {
    appTitle: "Miku Desktop Pet",
    petName: "ミクペット",
    optionsTitle: "Miku Desktop Pet 設定",
    quickActions: "クイック操作",
    pause: "一時停止",
    play: "再生",
    pauseLabel: "ミクを一時停止",
    playLabel: "ミクを再生",
    addDomain: "このドメインでミクを非表示にする",
    domainUnavailable: "このページは追加できません",
    domainAdded: "ドメインを追加済み",
    ready: "準備完了",
    saved: "保存しました",
    saving: "保存中…",
    resetStatus: "リセットしました",
    unsaved: "未保存の変更あり",
    speed: "移動速度",
    size: "サイズ",
    jump: "ジャンプ確率",
    interval: "歩行間隔",
    idle: "立っている時間",
    rest: "休憩時間",
    reset: "リセット",
    hiddenPages: "非表示ページ",
    hiddenPagesDescription: "一致するURLやドメインでミクを非表示にします。",
    blockedPages: "非表示にするURLとドメイン",
    save: "保存",
    clear: "すべて消去",
    language: "言語",
    mascotLabel: "歩くミク",
    secondsUnit: "秒"
  },
  es: {
    appTitle: "Miku Desktop Pet",
    petName: "Mascota Miku",
    optionsTitle: "Ajustes de Miku Desktop Pet",
    quickActions: "Acciones rápidas",
    pause: "Pausar",
    play: "Reanudar",
    pauseLabel: "Pausar a Miku",
    playLabel: "Reanudar a Miku",
    addDomain: "Ocultar a Miku en este dominio",
    domainUnavailable: "No se puede añadir esta página",
    domainAdded: "Dominio añadido",
    ready: "Listo",
    saved: "Guardado",
    saving: "Guardando…",
    resetStatus: "Restablecido",
    unsaved: "Cambios sin guardar",
    speed: "Velocidad",
    size: "Tamaño",
    jump: "Probabilidad de salto",
    interval: "Intervalo de paseo",
    idle: "Tiempo de pie",
    rest: "Tiempo de descanso",
    reset: "Restablecer",
    hiddenPages: "Páginas ocultas",
    hiddenPagesDescription: "Oculta a Miku en las URL o los dominios que coincidan.",
    blockedPages: "URL y dominios donde ocultar a Miku",
    save: "Guardar",
    clear: "Borrar todo",
    language: "Idioma",
    mascotLabel: "Mascota Miku caminando",
    secondsUnit: "s"
  },
  id: {
    appTitle: "Miku Desktop Pet",
    petName: "Peliharaan Miku",
    optionsTitle: "Pengaturan Miku Desktop Pet",
    quickActions: "Aksi cepat",
    pause: "Jeda",
    play: "Lanjutkan",
    pauseLabel: "Jeda Miku",
    playLabel: "Lanjutkan Miku",
    addDomain: "Sembunyikan Miku di domain ini",
    domainUnavailable: "Halaman ini tidak dapat ditambahkan",
    domainAdded: "Domain ditambahkan",
    ready: "Siap",
    saved: "Tersimpan",
    saving: "Menyimpan…",
    resetStatus: "Pengaturan direset",
    unsaved: "Perubahan belum disimpan",
    speed: "Kecepatan",
    size: "Ukuran",
    jump: "Peluang melompat",
    interval: "Interval berjalan",
    idle: "Waktu berdiri",
    rest: "Waktu istirahat",
    reset: "Reset",
    hiddenPages: "Halaman tersembunyi",
    hiddenPagesDescription: "Sembunyikan Miku pada URL atau domain yang cocok.",
    blockedPages: "URL dan domain untuk menyembunyikan Miku",
    save: "Simpan",
    clear: "Hapus semua",
    language: "Bahasa",
    mascotLabel: "Maskot Miku berjalan",
    secondsUnit: " dtk"
  }
};

export function normalizeLanguage(value) {
  if (typeof value !== "string") return DEFAULT_LANGUAGE;
  const normalized = value.trim().replaceAll("_", "-").toLowerCase();
  return LANGUAGES.find(({ code }) => code.toLowerCase() === normalized)?.code || DEFAULT_LANGUAGE;
}

export function translate(language, key) {
  const messages = TRANSLATIONS[normalizeLanguage(language)];
  return messages[key] ?? TRANSLATIONS[DEFAULT_LANGUAGE][key] ?? key;
}

export function applyTranslations(language, root = document) {
  const normalized = normalizeLanguage(language);
  if (root.nodeType === 9 && root.documentElement) {
    root.documentElement.lang = normalized;
  }

  for (const [attribute, targetAttribute] of [
    ["data-i18n", null],
    ["data-i18n-aria-label", "aria-label"]
  ]) {
    const selector = `[${attribute}]`;
    const elements = [...root.querySelectorAll(selector)];
    if (root.matches?.(selector)) elements.unshift(root);
    for (const element of elements) {
      const text = translate(normalized, element.getAttribute(attribute));
      if (targetAttribute) element.setAttribute(targetAttribute, text);
      else element.textContent = text;
    }
  }
}

export function populateLanguageSelect(select) {
  const options = LANGUAGES.map(({ code, label }) => {
    const option = select.ownerDocument.createElement("option");
    option.value = code;
    option.textContent = label;
    return option;
  });
  select.replaceChildren(...options);
}
