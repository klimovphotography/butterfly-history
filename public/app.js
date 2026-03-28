const form = document.getElementById("event-form");
const input = document.getElementById("event-input");
const button = document.getElementById("submit-btn");
const messages = document.getElementById("messages");
const randomButton = document.getElementById("random-btn");
const providerPill = document.getElementById("provider-pill");
const languageButton = document.getElementById("language-toggle");
const modeTabs = document.querySelectorAll(".mode-tab");

const CURRENT_YEAR = new Date().getFullYear();
window.__SCENARIO_PAYLOAD__ = typeof window.__SCENARIO_PAYLOAD__ === "string"
  ? window.__SCENARIO_PAYLOAD__
  : "";
const STORAGE_LANGUAGE_KEY = "bh_language";
const QUICK_START_EXAMPLES = {
  ru: [
    "Что если Атлантида не затонула а превратилась в технологическую сверхдержаву?",
    "Что если Гитлер поступил в Венскую академию художеств?",
    "Что если вода на планете начала наделять людей случайными мутациями?",
    "Что если Рунет полностью изолировали от глобальной сети в 2025 году?",
    "Что если декабристы успешно захватили власть в 1825 году?",
    "Что если телепатия внезапно появилась у каждого десятого человека на планете?",
    "Что если Россия не продала Аляску Соединенным Штатам?",
    "Что если Карибский кризис перерос в обмен ядерными ударами?",
    "Что если Тунгусский метеорит был потерпевшим крушение звездным крейсером?",
    "Что если Ленин прожил на двадцать лет дольше?",
    "Что если Чума уничтожила девяносто процентов населения Европы вместо трети?",
    "Что если Юрий Хованский построил успешную политическую карьеру в Госдуме?",
    "Что если Петр I не стал строить Петербург и оставил столицу в Москве?",
    "Что если Большой адронный коллайдер вызвал глобальную аномалию при запуске?",
    "Что если тайное мировое правительство решило сократить население планеты до золотого миллиарда?",
    "Что если христианство так и осталось локальной сектой на Ближнем Востоке?",
    "Что если Виктор Цой не погиб в автокатастрофе в 1990 году?",
    "Что если магия всегда существовала и стала главной наукой вместо физики?",
    "Что если советский интернет ОГАС академика Глушкова был реализован?",
    "Что если князь Владимир выбрал ислам или католичество вместо православного христианства?",
    "Что если Белое движение победило в Гражданской войне?",
    "Что если ИИ обрел самосознание в 2025 году?",
    "Что если неандертальцы победили кроманьонцев в эволюционной гонке?",
    "Что если Дональд Трамп проиграл выборы Хиллари Клинтон в 2016 году?",
    "Что если Канье Уэст реально выиграл президентские выборы в США?",
    "Что если монголо татарское нашествие обошло стороной русские княжества?",
    "Что если Бермудский треугольник оказался работающим порталом в параллельное измерение?",
    "Что если митинги на Болотной площади в 2011 году привели к смене власти?",
    "Что если гравитация на Земле внезапно уменьшилась в два раза?",
    "Что если Иван Грозный не убивал своего сына и династия Рюриковичей не прервалась?",
    "Что если мы живем в матрице и в 1999 году произошел первый массовый сбой системы?",
    "Что если ученые нашли работающий способ обратить биологическое старение вспять в 2015 году?",
    "Что если динозавры не вымерли?",
    "Что если легенды о вампирах основаны на генетической мутации правящих элит?",
    "Что если в 2020 году вместо Covid случилась глобальная эпидемия зомби?",
    "Что если Смутное время на Руси закончилось полным вхождением страны в состав Речи Посполитой?",
  ],
  en: [
    "What if Atlantis never sank and became a technological superpower?",
    "What if Hitler had been admitted to the Vienna Academy of Fine Arts?",
    "What if telepathy suddenly appeared in every tenth person on Earth?",
    "What if Russia had never sold Alaska to the United States?",
    "What if the Cuban Missile Crisis had escalated into a nuclear exchange?",
    "What if Lenin had lived twenty years longer?",
    "What if the Black Death had wiped out ninety percent of Europe?",
    "What if Peter the Great had kept the capital in Moscow?",
    "What if the Large Hadron Collider had triggered a global anomaly at launch?",
    "What if Christianity had remained a local sect in the Middle East?",
    "What if Viktor Tsoi had not died in 1990?",
    "What if OGAS, the Soviet internet project, had been implemented?",
    "What if the White Movement had won the Russian Civil War?",
    "What if AI became self-aware in 2025?",
    "What if Neanderthals had won the evolutionary race?",
    "What if gravity on Earth suddenly dropped by half?",
    "What if dinosaurs had never gone extinct?",
    "What if a global zombie epidemic replaced COVID in 2020?",
  ],
};
const SHARE_CARD_CTA = {
  ru: "смоделировать свою ветку реальности",
  en: "model your own alternate timeline",
};
const MODE_LABELS = {
  ru: {
    realism: "Реализм",
    dark: "Мрачная хроника",
    prosperity: "Эпоха процветания",
    madness: "Безумие",
    humor: "Юмор",
  },
  en: {
    realism: "Realism",
    dark: "Dark Chronicle",
    prosperity: "Age of Prosperity",
    madness: "Madness",
    humor: "Humor",
  },
};
const TRANSLATIONS = {
  ru: {
    pageTitle: "Эффект Бабочки",
    heroEyebrow: "Альтернативная история",
    heroTitle: "Эффект Бабочки",
    heroSubtitle:
      "Напишите реальное историческое событие, а ИИ построит гипотезу: что было бы, если все пошло иначе.",
    homeAria: "Главная",
    eventLabel: "Историческое событие",
    eventPlaceholder:
      "Например: Что если Карибский кризис в 1962 году не удалось бы деэскалировать?",
    randomButton: "Рандомный сценарий",
    randomAria: "Случайный сценарий быстрого старта",
    randomTitle: "Случайный сценарий",
    languageButton: "Язык: RU",
    languageAria: "Переключить язык на английский",
    modeTabsAria: "Режим генерации",
    modeRealism: "Реализм",
    modeDark: "Мрачная хроника",
    modeProsperity: "Эпоха процветания",
    modeMadness: "Безумие",
    modeHumor: "Юмор",
    submitIdle: "Смоделировать",
    submitBusy: "Думаю...",
    chatWindowAria: "Окно чата",
    donateEyebrow: "Поддержать проект",
    donateTitle: "Сделайте донат, если вам понравилась история",
    donateNoteTop: "В новой версии планируется больше визуала и глубины. Донаты пойдут на:",
    donateItem1: "генерацию исторических фото и иллюстраций",
    donateItem2: "продвинутые «мозги» для более точных сценариев",
    donateNoteBottom:
      "Это разовый безопасный платеж через CloudTips. Любая сумма помогает ускорять развитие проекта и делать сценарии глубже.",
    donateCta: "Поддержать донатом",
    legalNote: "Важно: это творческая историческая гипотеза, а не установленные факты.",
    loadingScenario: "Моделирую альтернативную ветку...",
    errorPrefix: "Ошибка",
    unknownError: "неизвестная ошибка.",
    parseError: "Не удалось разобрать ответ ИИ.",
    networkError: "Ошибка сети. Проверьте, что сервер запущен.",
    aiBadge: "ИИ",
    userBadge: "Вы",
    formatAuto: "Авто",
    openPng: "Открыть PNG",
    ready: "Готово",
    failed: "Не вышло",
    cardEyebrow: "Что если?",
    cardEmptyNarrative: "Гипотеза готова, но текст оказался пустым.",
    popupTitle: "Карточка сценария",
    popupAlt: "Карточка сценария",
    fallbackCardTitle: "Что если?",
    fallbackCardPoint: "Ключевой поворот истории.",
    fallbackCardFinal: "Финальный эффект захватывает современность.",
    fallbackCardSubtitle: "Хроника альтернативного перелома — коротко и дерзко.",
    stageLabel: "Этап",
    timelineEarlyTitle: "Ранний перелом",
    timelineEarlyDetails: "Начинаются первые изменения.",
    timelineTrendTitle: "Закрепление",
    timelineTrendDetails: "Новые процессы становятся устойчивыми.",
    timelineShiftTitle: "Институциональный сдвиг",
    timelineShiftDetails: "Изменения входят в норму.",
    timelineGlobalTitle: "Глобальный эффект",
    timelineGlobalDetails: "Изменения влияют на международный баланс.",
    timelineEchoTitle: "Эхо перемен",
    timelineEchoDetails: "Новое поколение живет иначе.",
    timelineTodayTitle: "Сегодня",
    timelineTodayDetails: "Формируется альтернативная современность.",
    branch1: "Усилить международные союзы",
    branch2: "Сделать ставку на технологический рывок",
    branch3: "Сфокусироваться на внутренних реформах",
    imagePromptFallback: "Иллюстрация альтернативной истории",
    narrativeIncomplete: "Гипотеза построена, но текстовое описание оказалось неполным.",
    narrativeJson: "Гипотеза построена, но модель вернула служебный JSON вместо чистого текста.",
  },
  en: {
    pageTitle: "Butterfly Effect",
    heroEyebrow: "Alternate History",
    heroTitle: "Butterfly Effect",
    heroSubtitle:
      "Describe a real historical event, and AI will build a hypothesis of how the world could have changed.",
    homeAria: "Home",
    eventLabel: "Historical Event",
    eventPlaceholder:
      "For example: What if the Cuban Missile Crisis in 1962 had not been de-escalated?",
    randomButton: "Random Scenario",
    randomAria: "Random quick-start scenario",
    randomTitle: "Random scenario",
    languageButton: "Language: EN",
    languageAria: "Switch language to Russian",
    modeTabsAria: "Generation mode",
    modeRealism: "Realism",
    modeDark: "Dark Chronicle",
    modeProsperity: "Age of Prosperity",
    modeMadness: "Madness",
    modeHumor: "Humor",
    submitIdle: "Simulate",
    submitBusy: "Thinking...",
    chatWindowAria: "Chat window",
    donateEyebrow: "Support The Project",
    donateTitle: "Make a donation if you enjoyed the story",
    donateNoteTop: "The new version will include deeper visuals and richer scenarios. Donations go to:",
    donateItem1: "generation of historical photos and illustrations",
    donateItem2: "more advanced AI models for higher-quality scenarios",
    donateNoteBottom:
      "This is a one-time secure payment via CloudTips. Any amount helps speed up development and improve scenario depth.",
    donateCta: "Support with a donation",
    legalNote: "Important: this is a creative historical hypothesis, not established fact.",
    loadingScenario: "Modeling an alternate timeline...",
    errorPrefix: "Error",
    unknownError: "unknown error.",
    parseError: "Failed to parse the AI response.",
    networkError: "Network error. Check that the server is running.",
    aiBadge: "AI",
    userBadge: "You",
    formatAuto: "Auto",
    openPng: "Open PNG",
    ready: "Done",
    failed: "Failed",
    cardEyebrow: "What if?",
    cardEmptyNarrative: "The hypothesis is ready, but the text came back empty.",
    popupTitle: "Scenario Card",
    popupAlt: "Scenario card",
    fallbackCardTitle: "What if?",
    fallbackCardPoint: "Key turning point in history.",
    fallbackCardFinal: "The final effect reshapes the present day.",
    fallbackCardSubtitle: "A sharp snapshot of an alternate turning point.",
    stageLabel: "Phase",
    timelineEarlyTitle: "Early Breakpoint",
    timelineEarlyDetails: "The first changes begin.",
    timelineTrendTitle: "Trend Consolidation",
    timelineTrendDetails: "New dynamics become stable.",
    timelineShiftTitle: "Institutional Shift",
    timelineShiftDetails: "Changes become the new normal.",
    timelineGlobalTitle: "Global Impact",
    timelineGlobalDetails: "Shifts alter the international balance.",
    timelineEchoTitle: "Echo Of Change",
    timelineEchoDetails: "A new generation lives differently.",
    timelineTodayTitle: "Today",
    timelineTodayDetails: "An alternate present takes shape.",
    branch1: "Strengthen international alliances",
    branch2: "Double down on a technological leap",
    branch3: "Focus on internal reforms",
    imagePromptFallback: "Illustration of alternate history",
    narrativeIncomplete: "The hypothesis was generated, but the text description was incomplete.",
    narrativeJson: "The hypothesis was generated, but the model returned service JSON instead of clean text.",
  },
};

let isLoading = false;
let activeMode = "realism";
let currentLanguage = normalizeLanguage(
  window.localStorage?.getItem(STORAGE_LANGUAGE_KEY) ||
    document.documentElement.lang ||
    "ru"
);
const shareUrlCache = new Map();
const CARD_FORMAT_OPTIONS = [
  { id: "auto" },
  { id: "portrait" },
  { id: "square" },
  { id: "landscape" },
];
const CARD_CAPTURE_SIZES = {
  portrait: { width: 1080, height: 1920 },
  square: { width: 1200, height: 1200 },
  landscape: { width: 1600, height: 900 },
};


initModeTabs();
initLanguageSwitcher();
setLanguage(currentLanguage, { persist: false });

loadProviderMeta();
void hydrateScenarioFromUrl();

input.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || event.shiftKey) return;
  event.preventDefault();
  if (typeof form.requestSubmit === "function") {
    form.requestSubmit(button);
  } else {
    form.dispatchEvent(new Event("submit", { cancelable: true }));
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  await startScenario(input.value);
});

if (randomButton) {
  randomButton.addEventListener("click", () => {
    const examples = getQuickStartExamples();
    if (!examples.length) return;
    const eventText =
      examples[Math.floor(Math.random() * examples.length)];
    input.value = eventText;
    input.focus();
  });
}

if (languageButton) {
  languageButton.addEventListener("click", () => {
    const nextLanguage = currentLanguage === "ru" ? "en" : "ru";
    setLanguage(nextLanguage);
  });
}

async function startScenario(rawText) {
  const eventText = rawText.trim();
  if (!eventText || isLoading) return;

  addTextMessage("user", eventText);
  form.reset();

  await requestScenario({
    event: eventText,
    branch: "",
    context: [],
    mode: activeMode,
    language: currentLanguage,
  });
}

async function requestScenario(payload) {
  isLoading = true;
  setUiBusy(true);
  const loadingId = addTextMessage("assistant", t("loadingScenario"));

  try {
    const response = await fetch("/api/alt-history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    removeMessage(loadingId);

    if (!response.ok) {
      addTextMessage("assistant", `${t("errorPrefix")}: ${data.error || t("unknownError")}`);
      return;
    }

    const scenario = normalizeScenario(data);
    if (!scenario) {
      addTextMessage("assistant", t("parseError"));
      return;
    }

    addScenarioMessage(scenario, { interactive: true, mode: payload.mode });
  } catch {
    removeMessage(loadingId);
    addTextMessage("assistant", t("networkError"));
  } finally {
    isLoading = false;
    setUiBusy(false);
    input.focus();
  }
}

function normalizeLanguage(value) {
  return String(value || "").toLowerCase() === "en" ? "en" : "ru";
}

function t(key) {
  const active = TRANSLATIONS[currentLanguage] || TRANSLATIONS.ru;
  return active[key] || TRANSLATIONS.ru[key] || key;
}

function setLanguage(nextLanguage, options = {}) {
  const { persist = true } = options;
  currentLanguage = normalizeLanguage(nextLanguage);

  if (persist) {
    try {
      window.localStorage?.setItem(STORAGE_LANGUAGE_KEY, currentLanguage);
    } catch {
      // Ignore private mode/localStorage errors.
    }
  }

  applyTranslations();
}

function initLanguageSwitcher() {
  if (!languageButton) return;
  languageButton.classList.toggle("is-en", currentLanguage === "en");
}

function getQuickStartExamples() {
  return QUICK_START_EXAMPLES[currentLanguage] || QUICK_START_EXAMPLES.ru;
}

function getShareCardCta() {
  return SHARE_CARD_CTA[currentLanguage] || SHARE_CARD_CTA.ru;
}

function getShareCardFooter() {
  return `butterfly-history.ru\n${getShareCardCta()}`;
}

function getCardFormatLabel(formatId) {
  if (formatId === "auto") return t("formatAuto");
  if (formatId === "portrait") return "9:16";
  if (formatId === "square") return "1:1";
  if (formatId === "landscape") return "16:9";
  return formatId;
}

function setTextById(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

function setAttrById(id, attribute, value) {
  const element = document.getElementById(id);
  if (element) {
    element.setAttribute(attribute, value);
  }
}

function applyTranslations() {
  document.documentElement.lang = currentLanguage;
  document.title = t("pageTitle");

  setTextById("hero-eyebrow", t("heroEyebrow"));
  setTextById("hero-title-text", t("heroTitle"));
  setTextById("hero-subtitle", t("heroSubtitle"));
  setTextById("event-label", t("eventLabel"));
  setTextById("donate-eyebrow", t("donateEyebrow"));
  setTextById("donate-title", t("donateTitle"));
  setTextById("donate-note-top", t("donateNoteTop"));
  setTextById("donate-item-1", t("donateItem1"));
  setTextById("donate-item-2", t("donateItem2"));
  setTextById("donate-note-bottom", t("donateNoteBottom"));
  setTextById("donate-cta", t("donateCta"));
  setTextById("legal-note", t("legalNote"));

  setAttrById("event-input", "placeholder", t("eventPlaceholder"));
  setAttrById("chat-window", "aria-label", t("chatWindowAria"));
  setAttrById("mode-tabs", "aria-label", t("modeTabsAria"));

  const homeLink = document.querySelector(".hero-logo");
  if (homeLink) {
    homeLink.setAttribute("aria-label", t("homeAria"));
  }

  if (randomButton) {
    randomButton.textContent = t("randomButton");
    randomButton.setAttribute("aria-label", t("randomAria"));
    randomButton.setAttribute("title", t("randomTitle"));
  }

  if (languageButton) {
    languageButton.textContent = t("languageButton");
    languageButton.setAttribute("aria-label", t("languageAria"));
    languageButton.setAttribute("title", t("languageAria"));
    languageButton.classList.toggle("is-en", currentLanguage === "en");
  }

  for (const tab of modeTabs) {
    const mode = tab.dataset.mode || "realism";
    if (mode === "realism") tab.textContent = t("modeRealism");
    if (mode === "dark") tab.textContent = t("modeDark");
    if (mode === "prosperity") tab.textContent = t("modeProsperity");
    if (mode === "madness") tab.textContent = t("modeMadness");
    if (mode === "humor") tab.textContent = t("modeHumor");
  }

  button.textContent = isLoading ? t("submitBusy") : t("submitIdle");
  syncDynamicTextLanguage();
}

function syncDynamicTextLanguage() {
  for (const article of messages.querySelectorAll(".scenario-result")) {
    const modeId = article.dataset.modeId || activeMode;
    const shareMode = article.querySelector(".share-card-mode");
    if (shareMode) {
      shareMode.textContent = getModeLabel(modeId);
    }
  }

  for (const article of messages.querySelectorAll(".message")) {
    const badge = article.querySelector(".badge");
    if (!badge) continue;

    if (article.classList.contains("user")) {
      badge.textContent = t("userBadge");
      continue;
    }

    if (article.classList.contains("scenario-result")) {
      const modeId = article.dataset.modeId || activeMode;
      const modeLabel = getModeLabel(modeId);
      const shareMode = article.querySelector(".share-card-mode");
      if (shareMode) {
        shareMode.textContent = modeLabel;
      } else {
        badge.textContent = `${t("aiBadge")} — ${modeLabel}`;
      }
      continue;
    }

    badge.textContent = t("aiBadge");
  }

  for (const eyebrow of document.querySelectorAll(".share-card-eyebrow")) {
    eyebrow.textContent = t("cardEyebrow");
  }

  for (const cta of document.querySelectorAll(".share-card-cta")) {
    cta.textContent = getShareCardCta();
  }

  for (const buttonElement of document.querySelectorAll(".share-card-download")) {
    const htmlButton = /** @type {HTMLButtonElement} */ (buttonElement);
    const isTemporaryLabel = Boolean(htmlButton._labelResetTimer);
    htmlButton.dataset.originalLabel = t("openPng");
    if (!isTemporaryLabel) {
      htmlButton.textContent = t("openPng");
    }
  }

  for (const buttonElement of document.querySelectorAll(".share-card-control[data-format-id]")) {
    const formatButton = /** @type {HTMLButtonElement} */ (buttonElement);
    formatButton.textContent = getCardFormatLabel(formatButton.dataset.formatId || "");
  }
}

function initModeTabs() {
  if (!modeTabs.length) return;
  const initial = Array.from(modeTabs).find((tab) => tab.classList.contains("is-active"));
  if (initial && initial.dataset.mode) {
    activeMode = initial.dataset.mode;
  } else {
    // keep default value
  }

  for (const tab of modeTabs) {
    tab.addEventListener("click", () => {
      const mode = tab.dataset.mode || "realism";
      setActiveMode(mode);
    });
  }

  setActiveMode(activeMode);
}

function setActiveMode(mode) {
  activeMode = mode;
  for (const tab of modeTabs) {
    const isActive = tab.dataset.mode === mode;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", isActive ? "true" : "false");
  }
}

async function loadProviderMeta() {
  if (!providerPill) return;
  try {
    const response = await fetch("/api/meta");
    if (!response.ok) return;
    const data = await response.json();
    const provider = String(data?.provider || "").trim();
    const model = String(data?.model || "").trim();
    if (!provider) return;
    providerPill.textContent = model ? `${provider} · ${model}` : provider;
  } catch {
    // Silent fail: meta is optional UI sugar.
  }
}

function setUiBusy(state) {
  button.disabled = state;
  button.textContent = state ? t("submitBusy") : t("submitIdle");
  if (randomButton) {
    randomButton.disabled = state;
  }
  if (languageButton) {
    languageButton.disabled = state;
  }
  for (const tab of modeTabs) {
    tab.disabled = state;
  }
}

function getModeLabel(modeId) {
  const labels = MODE_LABELS[currentLanguage] || MODE_LABELS.ru;
  const fallbackLabels = MODE_LABELS.ru;
  return labels[modeId] || fallbackLabels[modeId] || fallbackLabels.realism;
}

function addScenarioMessage(scenario, options = {}) {
  const modeId = options.mode || scenario.mode || activeMode;
  const modeLabel = getModeLabel(modeId);
  const article = document.createElement("article");
  article.className = "message assistant scenario-result";
  article.dataset.id = crypto.randomUUID();
  article.dataset.modeId = modeId;

  if (scenario.shareCard) {
    const sharePayload = {
      card: scenario.shareCard,
      narrative: scenario.narrative,
      timeline: scenario.timeline,
      modeLabel,
      modeId,
      event: scenario.event || scenario.shareCard.title || "",
    };
    article.append(
      buildShareCard(sharePayload)
    );
    if (options.interactive !== false) {
      void syncScenarioHash(sharePayload);
    }
  } else {
    const badge = document.createElement("div");
    badge.className = "badge";
    badge.textContent = `${t("aiBadge")} — ${modeLabel}`;
    const narrative = document.createElement("p");
    narrative.className = "body";
    narrative.textContent = scenario.narrative;
    article.append(badge, narrative);
  }

  // Таймлайн по годам скрыт, так как дублирует сторис-карточку.

  messages.append(article);
  scrollMessageToStart(article);
}

function buildShareCard(payload) {
  const { card } = payload;
  const wrapper = document.createElement("div");
  wrapper.className = "share-card";

  const toolbar = document.createElement("div");
  toolbar.className = "share-card-toolbar";

  const formatGroup = document.createElement("div");
  formatGroup.className = "share-card-control-group";

  const actionGroup = document.createElement("div");
  actionGroup.className = "share-card-control-group share-card-action-group";

  const frameStage = document.createElement("div");
  frameStage.className = "share-card-stage";

  const frame = document.createElement("div");
  frame.className = "share-card-frame";
  frame.dataset.captureId = crypto.randomUUID();
  frameStage.append(frame);

  let selectedFormat = "auto";
  const formatButtons = new Map();

  const renderFrame = () => {
    const format = resolveCardFormat(selectedFormat);
    frame.dataset.format = format;
    frame.replaceChildren(buildShareCardFrame(payload, format));

    for (const [formatId, button] of formatButtons) {
      const isActive = formatId === selectedFormat;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    }
  };

  for (const option of CARD_FORMAT_OPTIONS) {
    const formatButton = document.createElement("button");
    formatButton.type = "button";
    formatButton.className = "share-card-control";
    formatButton.dataset.formatId = option.id;
    formatButton.textContent = getCardFormatLabel(option.id);
    formatButton.setAttribute("aria-pressed", option.id === selectedFormat ? "true" : "false");
    formatButton.addEventListener("click", () => {
      selectedFormat = option.id;
      renderFrame();
    });
    formatButtons.set(option.id, formatButton);
    formatGroup.append(formatButton);
  }

  const openButton = document.createElement("button");
  openButton.type = "button";
  openButton.className = "share-card-control share-card-download";
  openButton.textContent = t("openPng");
  openButton.dataset.i18nKey = "openPng";
  openButton.addEventListener("click", async () => {
    const format = frame.dataset.format || resolveCardFormat(selectedFormat);
    const opened = await openShareCardImage(frame, card, format);
    setTemporaryButtonLabel(openButton, opened ? t("ready") : t("failed"));
  });

  actionGroup.append(openButton);
  toolbar.append(formatGroup, actionGroup);
  wrapper.append(toolbar, frameStage);
  renderFrame();

  return wrapper;
}

function buildShareCardFrame(payload, format) {
  const { card, narrative, modeLabel } = payload;
  const footerLines = parseShareCardFooter(card.footer);
  const storyParagraphs = buildStoryParagraphs(narrative, format);
  const fragment = document.createDocumentFragment();

  const header = document.createElement("div");
  header.className = "share-card-header";

  const meta = document.createElement("div");
  meta.className = "share-card-meta";

  const eyebrow = document.createElement("p");
  eyebrow.className = "share-card-eyebrow";
  eyebrow.textContent = t("cardEyebrow");

  const mode = document.createElement("span");
  mode.className = "share-card-mode";
  mode.textContent = modeLabel;

  meta.append(eyebrow, mode);

  const title = document.createElement("h3");
  title.className = "share-card-title";
  title.textContent = card.title;

  const subtitle = document.createElement("p");
  subtitle.className = "share-card-subtitle";
  subtitle.textContent = card.subtitle;

  header.append(meta, title, subtitle);

  const body = document.createElement("div");
  body.className = "share-card-body";

  const story = document.createElement("section");
  story.className = "share-card-story";

  for (const paragraphText of storyParagraphs) {
    const paragraph = document.createElement("p");
    paragraph.className = "share-card-paragraph";
    appendNarrativeWithYearHighlights(paragraph, paragraphText);
    story.append(paragraph);
  }

  body.append(story);

  const footer = document.createElement("div");
  footer.className = "share-card-footer";

  const tag = document.createElement("span");
  tag.className = "share-card-tag";
  tag.dataset.domain = footerLines.domain;
  tag.dataset.cta = footerLines.cta;

  const domain = document.createElement("span");
  domain.className = "share-card-domain";
  domain.textContent = footerLines.domain;

  const cta = document.createElement("span");
  cta.className = "share-card-cta";
  cta.textContent = footerLines.cta;

  tag.append(domain, cta);
  footer.append(tag);

  fragment.append(header, body, footer);
  return fragment;
}

function resolveCardFormat(selectedFormat) {
  if (selectedFormat && selectedFormat !== "auto") {
    return selectedFormat;
  }

  if (typeof window.matchMedia === "function" && window.matchMedia("(max-width: 760px)").matches) {
    return "portrait";
  }

  return "landscape";
}

function buildStoryParagraphs(narrative, format) {
  const text = String(narrative || "").replace(/\r/g, "").trim();
  if (!text) {
    return [t("cardEmptyNarrative")];
  }

  const normalized = text.replace(/[ \t]+/g, " ");
  const explicitParagraphs = normalized
    .split(/\n{2,}/)
    .map((block) => block.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  if (explicitParagraphs.length > 0) {
    return explicitParagraphs;
  }

  const sentences = normalized
    .match(/[^.!?]+[.!?…]?/g)
    ?.map((sentence) => sentence.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  if (!sentences || sentences.length <= 1) {
    return [normalized.replace(/\s+/g, " ").trim()];
  }

  const preferredSentencesPerParagraphByFormat = {
    portrait: 2,
    square: 2,
    landscape: 3,
  };
  const perParagraph = preferredSentencesPerParagraphByFormat[format] || 2;
  const paragraphs = [];

  for (let index = 0; index < sentences.length; index += perParagraph) {
    const paragraph = sentences.slice(index, index + perParagraph).join(" ").trim();
    if (paragraph) {
      paragraphs.push(paragraph);
    }
  }

  return paragraphs;
}

function appendNarrativeWithYearHighlights(target, text) {
  const value = String(text || "");
  if (!value) return;
  const yearRegex = /\b(1[0-9]{3}|20[0-9]{2}|2100)\b/g;
  let lastIndex = 0;
  let match;

  while ((match = yearRegex.exec(value)) !== null) {
    const year = match[1];
    const start = match.index;
    if (start > lastIndex) {
      target.append(document.createTextNode(value.slice(lastIndex, start)));
    }
    const chip = document.createElement("span");
    chip.className = "share-card-inline-year";
    chip.textContent = year;
    target.append(chip);
    lastIndex = start + year.length;
  }

  if (lastIndex < value.length) {
    target.append(document.createTextNode(value.slice(lastIndex)));
  }
}

function buildShareCardText(payload) {
  const { card, narrative } = payload;
  const lines = [
    card.title,
    card.subtitle,
    "",
    narrative,
    "",
    getShareUrl(payload),
  ];

  return lines.filter(Boolean).join("\n");
}

function buildShareTeaser(payload) {
  const { card, narrative } = payload;
  const lead = extractLeadSentence(narrative);
  return [card.title, card.subtitle, lead].filter(Boolean).join("\n");
}

function getShareUrl(payload) {
  const hash = payload ? buildScenarioHash(payload) : "";
  const current = String(window.location.href || "");
  const withScenarioQuery = (base) => {
    if (!hash) return base;
    const url = new URL(base);
    url.searchParams.set("scenario", hash);
    url.hash = "";
    return url.toString();
  };
  if (current.includes("localhost") || current.includes("127.0.0.1")) {
    return withScenarioQuery("https://butterfly-history.ru/");
  }
  return withScenarioQuery(current || "https://butterfly-history.ru/");
}

async function resolveShareUrl(payload) {
  const scenario = buildScenarioHash(payload);
  if (!scenario) {
    return getShareUrl(payload);
  }

  const cached = shareUrlCache.get(scenario);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch("/api/share-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenario }),
    });
    if (response.ok) {
      const data = await response.json();
      const url = String(data?.url || "").trim();
      if (url) {
        shareUrlCache.set(scenario, url);
        return url;
      }
    }
  } catch {
    // fallback below
  }

  const fallback = getShareUrl(payload);
  shareUrlCache.set(scenario, fallback);
  return fallback;
}

function extractLeadSentence(narrative) {
  const text = String(narrative || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  const sentence = text.match(/[^.!?]+[.!?]/)?.[0]?.trim() || "";
  if (!sentence) return "";
  return sentence.length > 170 ? `${sentence.slice(0, 167)}…` : sentence;
}

function buildScenarioHash(payload) {
  const data = {
    v: 1,
    lang: currentLanguage,
    event: String(payload?.event || payload?.card?.title || "").trim(),
    mode: String(payload?.modeId || activeMode || "realism").trim(),
    title: String(payload?.card?.title || "").trim(),
    subtitle: String(payload?.card?.subtitle || "").trim(),
    narrative: String(payload?.narrative || "").trim(),
  };
  const json = JSON.stringify(data);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function parseScenarioHash(hash) {
  const safe = String(hash || "").replace(/-/g, "+").replace(/_/g, "/");
  const padding = (4 - (safe.length % 4)) % 4;
  const normalized = safe + "=".repeat(padding);
  try {
    const binary = atob(normalized);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    const data = JSON.parse(json);
    if (!data || typeof data !== "object") return null;
    return data;
  } catch {
    return null;
  }
}

async function syncScenarioHash(payload) {
  if (!window.history?.replaceState) return;
  const shortUrl = await resolveShareUrl(payload);
  if (!shortUrl) return;
  const parsed = new URL(shortUrl, window.location.origin);
  window.history.replaceState(null, "", `${parsed.pathname}${parsed.search}`);
}

async function hydrateScenarioFromUrl() {
  const url = new URL(window.location.href);
  let encoded = String(window.__SCENARIO_PAYLOAD__ || "").trim();
  if (!encoded) {
    encoded = String(url.searchParams.get("scenario") || "").trim();
  }
  if (!encoded) {
    const shortId = String(url.searchParams.get("s") || "").trim();
    if (shortId) {
      encoded = await fetchScenarioByShortId(shortId);
    }
  }
  if (!encoded) {
    const legacyHash = String(window.location.hash || "");
    if (legacyHash.startsWith("#scenario=")) {
      encoded = legacyHash.slice("#scenario=".length).trim();
    }
  }
  if (!encoded) return;

  const parsed = parseScenarioHash(encoded);
  if (!parsed) return;

  const eventCandidate =
    typeof parsed.event === "string" && parsed.event.trim()
      ? parsed.event.trim()
      : typeof parsed.title === "string"
        ? parsed.title.trim()
        : "";
  const event = eventCandidate;
  const modeId = typeof parsed.mode === "string" ? parsed.mode.trim() : "realism";
  const parsedLanguage = normalizeLanguage(parsed.lang || parsed.language || currentLanguage);
  setLanguage(parsedLanguage, { persist: true });
  const narrative = sanitizeNarrativeText(parsed.narrative || "");
  if (!narrative) return;

  const timeline = normalizeTimeline([]);
  const shareCard = normalizeShareCard(
    {
      title: parsed.title,
      subtitle: parsed.subtitle,
      items: [],
      footer: getShareCardFooter(),
    },
    narrative,
    timeline,
    event
  );

  addScenarioMessage(
    {
      narrative,
      timeline,
      branches: normalizeBranches([]),
      images: [],
      shareCard,
      event: event || shareCard.title,
      mode: modeId,
    },
    { interactive: false, mode: modeId }
  );
}

async function fetchScenarioByShortId(shortId) {
  const id = String(shortId || "").trim();
  if (!id) return "";
  if (!/^[A-Za-z0-9_-]{4,32}$/.test(id)) return "";
  try {
    const response = await fetch(`/api/share-link/${encodeURIComponent(id)}`);
    if (!response.ok) return "";
    const data = await response.json();
    return String(data?.scenario || "").trim();
  } catch {
    return "";
  }
}

async function copyTextToClipboard(text) {
  const value = String(text || "").trim();
  if (!value) return false;

  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fallback below.
  }

  try {
    const field = document.createElement("textarea");
    field.value = value;
    field.setAttribute("readonly", "readonly");
    field.style.position = "fixed";
    field.style.left = "-9999px";
    field.style.top = "0";
    document.body.append(field);
    field.select();
    const copied = document.execCommand("copy");
    field.remove();
    return copied;
  } catch {
    return false;
  }
}

function setTemporaryButtonLabel(button, nextLabel) {
  if (!button) return;
  const originalLabel = button.dataset.originalLabel || button.textContent;
  button.dataset.originalLabel = originalLabel;
  button.textContent = nextLabel;

  if (button._labelResetTimer) {
    window.clearTimeout(button._labelResetTimer);
  }

  button._labelResetTimer = window.setTimeout(() => {
    button.textContent = button.dataset.originalLabel || originalLabel;
  }, 1700);
}

async function openShareCardImage(target, card, format) {
  if (!target || typeof window.html2canvas !== "function") {
    return false;
  }

  try {
    const asset = await renderShareCardAsset(target, format);
    if (!asset?.blob && !asset?.dataUrl) {
      return false;
    }

    const filename = buildShareCardFilename(card, format);
    const file = createShareCardFile(asset.blob, filename);

    if (shouldUseNativeCardShare() && (await shareCardFile(file, card))) {
      return true;
    }

    const objectUrl = file ? URL.createObjectURL(file) : asset.dataUrl;
    if (!objectUrl) {
      return false;
    }

    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    link.rel = "noopener";
    document.body.append(link);
    link.click();
    link.remove();

    if (file) {
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    }
    return true;
  } catch {
    return false;
  }
}

function createShareCardFile(blob, filename) {
  if (!(blob instanceof Blob) || typeof File !== "function") {
    return null;
  }

  try {
    return new File([blob], filename, { type: blob.type || "image/png" });
  } catch {
    return null;
  }
}

function shouldUseNativeCardShare() {
  if (typeof window.matchMedia !== "function") {
    return false;
  }

  return (
    window.matchMedia("(max-width: 760px)").matches ||
    window.matchMedia("(pointer: coarse)").matches
  );
}

async function shareCardFile(file, card) {
  if (!(file instanceof File) || typeof navigator.share !== "function") {
    return false;
  }

  const shareData = {
    files: [file],
    title: card?.title || t("fallbackCardTitle"),
  };

  if (typeof navigator.canShare === "function" && !navigator.canShare(shareData)) {
    return false;
  }

  try {
    await navigator.share(shareData);
    return true;
  } catch {
    return false;
  }
}

async function shareScenarioCard(target, payload, format) {
  const shareUrl = await resolveShareUrl(payload);
  const teaser = buildShareTeaser(payload);

  if (typeof navigator.share !== "function") {
    const copied = await copyTextToClipboard(`${teaser}\n\n${shareUrl}`);
    return copied ? "copied" : "failed";
  }

  try {
    await navigator.share({
      title: payload.card.title,
      text: teaser,
      url: shareUrl,
    });
    return "native";
  } catch {
    return "failed";
  }
}

async function renderShareCardAsset(target, format) {
  if (!target || typeof window.html2canvas !== "function") {
    return null;
  }

  if (document.fonts && typeof document.fonts.ready?.then === "function") {
    await document.fonts.ready;
  }
  await new Promise((resolve) => setTimeout(resolve, 50));

  const captureFormat = resolveCardFormat(format);
  const exportSize = CARD_CAPTURE_SIZES[captureFormat] || CARD_CAPTURE_SIZES.portrait;
  const rect = target.getBoundingClientRect();
  const sourceWidth = Math.max(1, Math.round(rect.width || exportSize.width));
  const sourceHeight = Math.max(1, Math.round(rect.height || exportSize.height));
  const qualityScale = Math.max(
    1,
    Math.min(exportSize.width / sourceWidth, exportSize.height / sourceHeight)
  );

  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-10000px";
  host.style.top = "0";
  host.style.pointerEvents = "none";
  host.style.opacity = "0";

  const clone = target.cloneNode(true);
  clone.dataset.format = captureFormat;
  clone.style.width = `${sourceWidth}px`;
  clone.style.height = `${sourceHeight}px`;
  clone.style.maxWidth = "none";
  clone.style.maxHeight = "none";
  clone.style.aspectRatio = "auto";

  host.append(clone);
  document.body.append(host);

  try {
    const canvas = await window.html2canvas(clone, {
      backgroundColor: null,
      scale: qualityScale,
      useCORS: true,
      width: sourceWidth,
      height: sourceHeight,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
    });
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    return {
      blob,
      dataUrl: blob ? null : canvas.toDataURL("image/png"),
    };
  } finally {
    host.remove();
  }
}

function buildShareCardFilename(card, format = "portrait") {
  const host = String(window.location.hostname || "site")
    .toLowerCase()
    .replace(/^www\./, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const now = new Date();
  const uniqueStamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    "-",
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ].join("");
  const suffix = {
    portrait: "9x16",
    square: "1x1",
    landscape: "16x9",
  }[resolveCardFormat(format)] || "card";
  return `${host || "site"}-${uniqueStamp}-${suffix}.png`;
}

function addTextMessage(role, text) {
  const id = crypto.randomUUID();
  const article = document.createElement("article");
  article.className = `message ${role}`;
  article.dataset.id = id;

  const badge = document.createElement("div");
  badge.className = "badge";
  badge.textContent = role === "user" ? t("userBadge") : t("aiBadge");

  const body = document.createElement("p");
  body.className = "body";
  body.textContent = text;

  article.append(badge, body);
  messages.append(article);
  messages.scrollTop = messages.scrollHeight;
  return id;
}

function removeMessage(id) {
  const item = messages.querySelector(`[data-id="${id}"]`);
  if (item) item.remove();
}

function scrollMessageToStart(element) {
  if (!element) return;
  const containerTop = messages.getBoundingClientRect().top;
  const elementTop = element.getBoundingClientRect().top;
  const offset = elementTop - containerTop + messages.scrollTop;
  messages.scrollTop = Math.max(0, offset);
}

function normalizeScenario(data) {
  const raw = data?.scenario;
  if (!raw || typeof raw !== "object") {
    if (typeof data?.reply === "string") {
      return buildFallbackScenario(data.reply);
    }
    return null;
  }

  const narrative = sanitizeNarrativeText(raw.narrative);

  const timeline = normalizeTimeline(raw.timeline);
  const branches = normalizeBranches(raw.branches);
  const images = normalizeImages(raw.images);
  const event = typeof raw.event === "string" ? raw.event.trim() : "";
  const mode = typeof raw.mode === "string" ? raw.mode.trim() : "";
  const shareCard = normalizeShareCard(raw.shareCard || raw.share_card, narrative, timeline, event);

  return { narrative, timeline, branches, images, shareCard, event, mode };
}

function normalizeShareCard(rawCard, narrative, timeline, event = "") {
  const fallback = buildFallbackShareCard(narrative, timeline, event);
  const forcedTitle = event || fallback.title;

  if (!rawCard || typeof rawCard !== "object") {
    return {
      ...fallback,
      title: forcedTitle,
    };
  }

  const title = forcedTitle;
  const subtitle =
    typeof rawCard.subtitle === "string" && rawCard.subtitle.trim()
      ? rawCard.subtitle.trim()
      : fallback.subtitle;
  const footer = getShareCardFooter();

  const rawItems = Array.isArray(rawCard.items)
    ? rawCard.items
    : Array.isArray(rawCard.timeline)
      ? rawCard.timeline
      : Array.isArray(rawCard.lines)
        ? rawCard.lines
        : [];

  const items = rawItems
    .map((item, index) => {
      if (typeof item === "string") {
        return {
          year: fallback.items[Math.min(index, fallback.items.length - 1)].year,
          text: item.trim(),
        };
      }
      const year = parseYear(item?.year) ?? fallback.items[Math.min(index, fallback.items.length - 1)].year;
      const text =
        (typeof item?.text === "string" && item.text.trim()) ||
        (typeof item?.title === "string" && item.title.trim()) ||
        (typeof item?.details === "string" && item.details.trim()) ||
        fallback.items[Math.min(index, fallback.items.length - 1)].text;
      return { year, text };
    })
    .filter((item) => item.text);

  let normalized = ensureUniqueShareCardYears(items.slice(0, 6), timeline);
  while (normalized.length < 5) {
    normalized.push(fallback.items[normalized.length]);
  }
  normalized = ensureUniqueShareCardYears(normalized, timeline);

  return {
    title,
    subtitle,
    items: normalized,
    footer,
  };
}

function ensureUniqueShareCardYears(items, timeline) {
  const fallbackYears = timeline.map((point) => point.year).filter(Boolean);
  const used = new Set();
  const result = [];

  for (let i = 0; i < items.length; i += 1) {
    const baseYear = items[i]?.year ?? fallbackYears[i] ?? CURRENT_YEAR;
    let year = baseYear;
    while (used.has(year)) {
      year += 1;
    }
    used.add(year);
    result.push({ ...items[i], year });
  }

  return result;
}

function buildFallbackShareCard(narrative, timeline, event = "") {
  const safeTitle = event || t("fallbackCardTitle");
  const subtitle = buildCardSubtitle(narrative);
  const items = timeline.slice(0, 6).map((point) => ({
    year: point.year || CURRENT_YEAR,
    text: point.title || point.details || t("fallbackCardPoint"),
  }));

  const trimmed = items
    .map((item) => ({
      year: item.year,
      text: item.text.length > 70 ? `${item.text.slice(0, 67)}…` : item.text,
    }))
    .slice(0, 6);

  while (trimmed.length < 5) {
    trimmed.push({
      year: CURRENT_YEAR,
      text: t("fallbackCardFinal"),
    });
  }

  return {
    title: safeTitle,
    subtitle,
    items: trimmed,
    footer: getShareCardFooter(),
  };
}

function buildCardSubtitle(narrative) {
  const text = String(narrative || "").replace(/\s+/g, " ").trim();
  if (!text) return t("fallbackCardSubtitle");
  const sentence = text.split(/[.!?]/).slice(1).find((part) => part.trim());
  if (!sentence) return t("fallbackCardSubtitle");
  const trimmed = sentence.trim();
  return trimmed.length > 110 ? `${trimmed.slice(0, 107)}…` : trimmed;
}

function parseShareCardFooter(value) {
  const defaultDomain = "butterfly-history.ru";
  const defaultCta = getShareCardCta();
  const knownCtas = Object.values(SHARE_CARD_CTA).map((cta) => cta.toLowerCase());
  const raw = String(value || "").trim();

  if (!raw) {
    return { domain: defaultDomain, cta: defaultCta };
  }

  const normalize = (text) => String(text || "").trim();

  if (raw.includes("\n")) {
    const parts = raw
      .split("\n")
      .map(normalize)
      .filter(Boolean);
    return {
      domain: parts[0] || defaultDomain,
      cta: parts[1] || defaultCta,
    };
  }

  if (raw.includes("·")) {
    const parts = raw
      .split("·")
      .map(normalize)
      .filter(Boolean);
    return {
      domain: parts[0] || defaultDomain,
      cta: parts[1] || defaultCta,
    };
  }

  if (knownCtas.some((cta) => raw.toLowerCase().includes(cta))) {
    const domain = raw.includes(defaultDomain) ? defaultDomain : normalize(raw);
    return { domain, cta: defaultCta };
  }

  return {
    domain: normalize(raw),
    cta: defaultCta,
  };
}

function normalizeTimeline(rawTimeline) {
  const defaults = [
    { year: CURRENT_YEAR - 120, title: t("timelineEarlyTitle"), details: t("timelineEarlyDetails") },
    { year: CURRENT_YEAR - 80, title: t("timelineTrendTitle"), details: t("timelineTrendDetails") },
    { year: CURRENT_YEAR - 50, title: t("timelineShiftTitle"), details: t("timelineShiftDetails") },
    { year: CURRENT_YEAR - 35, title: t("timelineGlobalTitle"), details: t("timelineGlobalDetails") },
    { year: CURRENT_YEAR - 15, title: t("timelineEchoTitle"), details: t("timelineEchoDetails") },
    { year: CURRENT_YEAR, title: t("timelineTodayTitle"), details: t("timelineTodayDetails") },
  ];

  if (!Array.isArray(rawTimeline)) {
    return defaults;
  }

  const parsed = rawTimeline
    .slice(0, 8)
    .map((point, index) => {
      const year = parseYear(point?.year) ?? defaults[Math.min(index, defaults.length - 1)].year;
      const title =
        typeof point?.title === "string" && point.title.trim()
          ? point.title.trim()
          : `${t("stageLabel")} ${index + 1}`;
      const details =
        typeof point?.details === "string" && point.details.trim()
          ? point.details.trim()
          : defaults[Math.min(index, defaults.length - 1)].details;
      return { year, title, details };
    });

  if (parsed.length === 0) {
    return defaults;
  }

  parsed.sort((a, b) => a.year - b.year);
  while (parsed.length < 6) {
    parsed.push(defaults[Math.min(parsed.length, defaults.length - 1)]);
  }
  parsed[parsed.length - 1].year = CURRENT_YEAR;
  parsed.sort((a, b) => a.year - b.year);
  return parsed.slice(0, 6);
}

function normalizeBranches(rawBranches) {
  const defaults = [
    t("branch1"),
    t("branch2"),
    t("branch3"),
  ];

  if (!Array.isArray(rawBranches)) {
    return defaults.slice(0, 3);
  }

  const unique = [];
  for (const entry of rawBranches) {
    const branch = typeof entry === "string" ? entry.trim() : "";
    if (!branch || unique.includes(branch)) continue;
    unique.push(branch);
    if (unique.length >= 3) break;
  }

  while (unique.length < 2) {
    unique.push(defaults[unique.length]);
  }

  return unique.slice(0, 3);
}

function normalizeImages(rawImages) {
  if (!Array.isArray(rawImages)) return [];

  return rawImages
    .map((item) => {
      if (typeof item === "string") {
        return { src: item, prompt: t("imagePromptFallback") };
      }
      if (typeof item?.src === "string") {
        return { src: item.src, prompt: item.prompt || t("imagePromptFallback") };
      }
      return null;
    })
    .filter((item) => item && isImageSrc(item.src))
    .slice(0, 2);
}

function isImageSrc(src) {
  return src.startsWith("http://") || src.startsWith("https://") || src.startsWith("data:image/");
}

function parseYear(value) {
  const year = Number.parseInt(String(value), 10);
  if (!Number.isFinite(year)) return null;
  if (year < 500 || year > 4000) return null;
  return year;
}

function buildFallbackScenario(text) {
  const narrative = sanitizeNarrativeText(text);
  const timeline = normalizeTimeline([]);
  return {
    narrative,
    timeline,
    branches: normalizeBranches([]),
    images: [],
    shareCard: normalizeShareCard(null, narrative, timeline),
  };
}

function shorten(value, maxLength) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}

function sanitizeNarrativeText(value) {
  const raw = stripCodeFences(String(value || ""));
  if (!raw) {
    return t("narrativeIncomplete");
  }

  const parsed = parseStructuredNarrative(raw);
  if (parsed) {
    return sanitizeNarrativeText(parsed);
  }

  if (looksLikeStructuredPayload(raw)) {
    return t("narrativeJson");
  }

  return raw.replace(/\s+/g, " ").trim();
}

function parseStructuredNarrative(text) {
  const direct = tryParseJson(text);
  if (typeof direct?.narrative === "string" && direct.narrative.trim()) {
    return direct.narrative.trim();
  }

  const normalized = String(text || "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");
  const embedded = tryParseJson(extractJsonSlice(normalized));
  if (typeof embedded?.narrative === "string" && embedded.narrative.trim()) {
    return embedded.narrative.trim();
  }

  const regexMatch = normalized.match(
    /"narrative"\s*:\s*"([\s\S]*?)"\s*,\s*"timeline"\s*:/i
  );
  if (!regexMatch?.[1]) {
    return "";
  }

  return regexMatch[1]
    .replace(/\\"/g, '"')
    .replace(/\\n/g, " ")
    .replace(/\\r/g, " ")
    .replace(/\\\\/g, "\\")
    .trim();
}

function tryParseJson(text) {
  const value = String(text || "").trim();
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function extractJsonSlice(text) {
  const value = String(text || "");
  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return "";
  }
  return value.slice(start, end + 1);
}

function stripCodeFences(text) {
  return String(text || "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function looksLikeStructuredPayload(text) {
  const value = String(text || "").toLowerCase();
  if (!value) return false;
  const markers = [
    '"narrative"',
    '"timeline"',
    '"branches"',
    '"share_card"',
    "“narrative”",
    "“timeline”",
    "“branches”",
    "“share_card”",
  ];
  const matched = markers.filter((marker) => value.includes(marker)).length;
  return matched >= 2;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
