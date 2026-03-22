const form = document.getElementById("event-form");
const input = document.getElementById("event-input");
const button = document.getElementById("submit-btn");
const messages = document.getElementById("messages");
const randomButton = document.getElementById("random-btn");
const providerPill = document.getElementById("provider-pill");
const modeTabs = document.querySelectorAll(".mode-tab");

const CURRENT_YEAR = new Date().getFullYear();
const QUICK_START_EXAMPLES = [
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
];

let isLoading = false;
let activeMode = "realism";
const MODE_LABELS = {
  realism: "Реализм",
  dark: "Мрачная хроника",
  prosperity: "Эпоха процветания",
  madness: "Безумие",
  humor: "Юмор",
};
const CARD_FORMAT_OPTIONS = [
  { id: "auto", label: "Авто" },
  { id: "portrait", label: "9:16" },
  { id: "square", label: "1:1" },
  { id: "landscape", label: "16:9" },
];
const CARD_CAPTURE_SIZES = {
  portrait: { width: 1080, height: 1920 },
  square: { width: 1200, height: 1200 },
  landscape: { width: 1600, height: 900 },
};


initModeTabs();

loadProviderMeta();

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
    if (!QUICK_START_EXAMPLES.length) return;
    const eventText =
      QUICK_START_EXAMPLES[Math.floor(Math.random() * QUICK_START_EXAMPLES.length)];
    input.value = eventText;
    input.focus();
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
  });
}

async function requestScenario(payload) {
  isLoading = true;
  setUiBusy(true);
  const loadingId = addTextMessage("assistant", "Моделирую альтернативную ветку...");

  try {
    const response = await fetch("/api/alt-history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    removeMessage(loadingId);

    if (!response.ok) {
      addTextMessage("assistant", `Ошибка: ${data.error || "неизвестная ошибка."}`);
      return;
    }

    const scenario = normalizeScenario(data);
    if (!scenario) {
      addTextMessage("assistant", "Не удалось разобрать ответ ИИ.");
      return;
    }

    addScenarioMessage(scenario, { interactive: true, mode: payload.mode });
  } catch {
    removeMessage(loadingId);
    addTextMessage("assistant", "Ошибка сети. Проверьте, что сервер запущен.");
  } finally {
    isLoading = false;
    setUiBusy(false);
    input.focus();
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
  button.textContent = state ? "Думаю..." : "Смоделировать";
  if (randomButton) {
    randomButton.disabled = state;
  }
  for (const tab of modeTabs) {
    tab.disabled = state;
  }
}

function addScenarioMessage(scenario, options = {}) {
  const modeLabel = MODE_LABELS[options.mode] || MODE_LABELS[activeMode] || "Реализм";
  const article = document.createElement("article");
  article.className = "message assistant scenario-result";
  article.dataset.id = crypto.randomUUID();

  if (scenario.shareCard) {
    article.append(
      buildShareCard({
        card: scenario.shareCard,
        narrative: scenario.narrative,
        timeline: scenario.timeline,
        modeLabel,
      })
    );
  } else {
    const badge = document.createElement("div");
    badge.className = "badge";
    badge.textContent = `ИИ — ${modeLabel}`;
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
    formatButton.textContent = option.label;
    formatButton.setAttribute("aria-pressed", option.id === selectedFormat ? "true" : "false");
    formatButton.addEventListener("click", () => {
      selectedFormat = option.id;
      renderFrame();
    });
    formatButtons.set(option.id, formatButton);
    formatGroup.append(formatButton);
  }

  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.className = "share-card-control";
  copyButton.textContent = "Копировать текст";
  copyButton.addEventListener("click", async () => {
    const success = await copyTextToClipboard(buildShareCardText(payload));
    setTemporaryButtonLabel(copyButton, success ? "Скопировано" : "Не вышло");
  });

  const shareButton = document.createElement("button");
  shareButton.type = "button";
  shareButton.className = "share-card-control";
  shareButton.textContent = "Поделиться";
  shareButton.addEventListener("click", async () => {
    const format = frame.dataset.format || resolveCardFormat(selectedFormat);
    const shared = await shareScenarioCard(frame, payload, format);
    if (shared === "native") {
      setTemporaryButtonLabel(shareButton, "Отправлено");
      return;
    }
    if (shared === "copied") {
      setTemporaryButtonLabel(shareButton, "Ссылка скопирована");
      return;
    }
    setTemporaryButtonLabel(shareButton, "Не вышло");
  });

  const openButton = document.createElement("button");
  openButton.type = "button";
  openButton.className = "share-card-control share-card-download";
  openButton.textContent = "Открыть PNG";
  openButton.addEventListener("click", async () => {
    const format = frame.dataset.format || resolveCardFormat(selectedFormat);
    const opened = await openShareCardImage(frame, card, format);
    setTemporaryButtonLabel(openButton, opened ? "Готово" : "Не вышло");
  });

  actionGroup.append(copyButton, shareButton, openButton);
  toolbar.append(formatGroup, actionGroup);
  wrapper.append(toolbar, frameStage);
  renderFrame();

  return wrapper;
}

function buildShareCardFrame(payload, format) {
  const { card, narrative, modeLabel } = payload;
  const footerLines = parseShareCardFooter(card.footer);
  const storyParagraphs = buildStoryParagraphs(narrative, format);
  const timelineItems = pickCardItemsForFormat(card.items, format);
  const fragment = document.createDocumentFragment();

  const header = document.createElement("div");
  header.className = "share-card-header";

  const meta = document.createElement("div");
  meta.className = "share-card-meta";

  const eyebrow = document.createElement("p");
  eyebrow.className = "share-card-eyebrow";
  eyebrow.textContent = "Что если?";

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

  const storyLabel = document.createElement("p");
  storyLabel.className = "share-card-section-title";
  storyLabel.textContent = "Сценарий";

  story.append(storyLabel);

  for (const paragraphText of storyParagraphs) {
    const paragraph = document.createElement("p");
    paragraph.className = "share-card-paragraph";
    paragraph.textContent = paragraphText;
    story.append(paragraph);
  }

  const timeline = document.createElement("section");
  timeline.className = "share-card-timeline";

  const timelineLabel = document.createElement("p");
  timelineLabel.className = "share-card-section-title";
  timelineLabel.textContent = "Ключевые даты";

  const list = document.createElement("div");
  list.className = "share-card-list";

  for (const item of timelineItems) {
    const row = document.createElement("div");
    row.className = "share-card-item";

    const year = document.createElement("span");
    year.className = "share-card-year";
    year.textContent = String(item.year);

    const text = document.createElement("span");
    text.className = "share-card-text";
    text.textContent = item.text;

    row.append(year, text);
    list.append(row);
  }

  timeline.append(timelineLabel, list);
  body.append(story, timeline);

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
  const text = String(narrative || "").replace(/\s+/g, " ").trim();
  if (!text) {
    return ["Гипотеза готова, но текст оказался пустым."];
  }

  const maxLengthByFormat = {
    portrait: 420,
    square: 560,
    landscape: 720,
  };
  const targetParagraphsByFormat = {
    portrait: 3,
    square: 3,
    landscape: 3,
  };

  const trimmed = trimTextForCard(text, maxLengthByFormat[format] || 760);
  const sentences = trimmed
    .match(/[^.!?]+[.!?]?/g)
    ?.map((sentence) => sentence.trim())
    .filter(Boolean);

  if (!sentences || sentences.length <= 1) {
    return [trimmed];
  }

  const perParagraph = Math.max(
    1,
    Math.ceil(sentences.length / (targetParagraphsByFormat[format] || 3))
  );
  const paragraphs = [];

  for (let index = 0; index < sentences.length; index += perParagraph) {
    const paragraph = sentences.slice(index, index + perParagraph).join(" ").trim();
    if (paragraph) {
      paragraphs.push(paragraph);
    }
  }

  return paragraphs.slice(0, targetParagraphsByFormat[format] || 3);
}

function trimTextForCard(text, maxLength) {
  if (text.length <= maxLength) {
    return text;
  }

  const sliced = text.slice(0, maxLength);
  const sentenceBreak = Math.max(
    sliced.lastIndexOf(". "),
    sliced.lastIndexOf("! "),
    sliced.lastIndexOf("? ")
  );

  if (sentenceBreak >= Math.floor(maxLength * 0.55)) {
    return sliced.slice(0, sentenceBreak + 1).trim();
  }

  return `${sliced.trimEnd()}…`;
}

function pickCardItemsForFormat(items, format) {
  const countByFormat = {
    portrait: 5,
    square: 4,
    landscape: 5,
  };
  const count = countByFormat[format] || 5;
  return Array.isArray(items) ? items.slice(0, count) : [];
}

function buildShareCardText(payload) {
  const { card, narrative, timeline, modeLabel } = payload;
  const footerLines = parseShareCardFooter(card.footer);
  const lines = [
    card.title,
    card.subtitle,
    `Режим: ${modeLabel}`,
    "",
    narrative,
    "",
    "Ключевые даты:",
    ...timeline.slice(0, 6).map((item) => `${item.year} — ${item.title}: ${item.details}`),
    "",
    footerLines.domain,
    footerLines.cta,
    getShareUrl(),
  ];

  return lines.filter(Boolean).join("\n");
}

function buildShareTeaser(payload) {
  const { card } = payload;
  return [card.title, card.subtitle].filter(Boolean).join("\n");
}

function getShareUrl() {
  const current = String(window.location.href || "");
  if (current.includes("localhost") || current.includes("127.0.0.1")) {
    return "https://butterfly-history.ru/";
  }
  return current || "https://butterfly-history.ru/";
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
    if (!asset?.dataUrl) {
      return false;
    }

    const dataUrl = asset.dataUrl;
    const win = window.open();
    if (win) {
      win.document.write(`<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Карточка сценария</title>
    <style>
      html, body {
        margin: 0;
        min-height: 100%;
        background: #060606;
      }
      body {
        display: flex;
        justify-content: center;
        padding: 10px;
      }
      img {
        display: block;
        width: auto;
        max-width: 100%;
        height: auto;
      }
    </style>
  </head>
  <body>
    <img src="${dataUrl}" alt="Карточка сценария" />
  </body>
</html>`);
      win.document.close();
    } else {
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = buildShareCardFilename(card, format);
      document.body.append(link);
      link.click();
      link.remove();
    }
    return true;
  } catch {
    return false;
  }
}

async function shareScenarioCard(target, payload, format) {
  const shareUrl = getShareUrl();
  const teaser = buildShareTeaser(payload);

  if (typeof navigator.share !== "function") {
    const copied = await copyTextToClipboard(`${teaser}\n\n${shareUrl}`);
    return copied ? "copied" : "failed";
  }

  try {
    const asset = await renderShareCardAsset(target, format);
    if (asset?.blob) {
      const file = new File([asset.blob], buildShareCardFilename(payload.card, format), {
        type: "image/png",
      });
      if (
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          title: payload.card.title,
          text: teaser,
          url: shareUrl,
          files: [file],
        });
        return "native";
      }
    }

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
      dataUrl: canvas.toDataURL("image/png"),
    };
  } finally {
    host.remove();
  }
}

function buildShareCardFilename(card, format = "portrait") {
  const base = String(card?.title || "share-card")
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const suffix = {
    portrait: "9x16",
    square: "1x1",
    landscape: "16x9",
  }[resolveCardFormat(format)] || "card";
  return `${base || "share-card"}-${suffix}.png`;
}

function addTextMessage(role, text) {
  const id = crypto.randomUUID();
  const article = document.createElement("article");
  article.className = `message ${role}`;
  article.dataset.id = id;

  const badge = document.createElement("div");
  badge.className = "badge";
  badge.textContent = role === "user" ? "Вы" : "ИИ";

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
  const shareCard = normalizeShareCard(raw.shareCard || raw.share_card, narrative, timeline);

  return { narrative, timeline, branches, images, shareCard };
}

function normalizeShareCard(rawCard, narrative, timeline) {
  const fallback = buildFallbackShareCard(narrative, timeline);

  if (!rawCard || typeof rawCard !== "object") {
    return fallback;
  }

  const title =
    typeof rawCard.title === "string" && rawCard.title.trim()
      ? rawCard.title.trim()
      : fallback.title;
  const subtitle =
    typeof rawCard.subtitle === "string" && rawCard.subtitle.trim()
      ? rawCard.subtitle.trim()
      : fallback.subtitle;
  const footer = "butterfly-history.ru\nсмоделировать свою ветку реальности";

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

function buildFallbackShareCard(narrative, timeline) {
  const safeTitle = buildCardTitle(narrative);
  const subtitle = buildCardSubtitle(narrative);
  const items = timeline.slice(0, 6).map((point) => ({
    year: point.year || CURRENT_YEAR,
    text: point.title || point.details || "Ключевой поворот истории.",
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
      text: "Финальный эффект захватывает современность.",
    });
  }

  return {
    title: safeTitle,
    subtitle,
    items: trimmed,
    footer: "butterfly-history.ru\nсмоделировать свою ветку реальности",
  };
}

function buildCardTitle(narrative) {
  const text = String(narrative || "").replace(/\s+/g, " ").trim();
  if (!text) return "Что если? Альтернативная хроника";
  const chunk = text.split(/[.!?]/).find((part) => part.trim())?.trim() || text;
  const trimmed = chunk.length > 70 ? `${chunk.slice(0, 67)}…` : chunk;
  return trimmed;
}

function buildCardSubtitle(narrative) {
  const text = String(narrative || "").replace(/\s+/g, " ").trim();
  if (!text) return "Хроника альтернативного перелома — коротко и дерзко.";
  const sentence = text.split(/[.!?]/).slice(1).find((part) => part.trim());
  if (!sentence) return "Хроника альтернативного перелома — коротко и дерзко.";
  const trimmed = sentence.trim();
  return trimmed.length > 110 ? `${trimmed.slice(0, 107)}…` : trimmed;
}

function parseShareCardFooter(value) {
  const defaultDomain = "butterfly-history.ru";
  const defaultCta = "смоделировать свою ветку реальности";
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

  if (raw.toLowerCase().includes(defaultCta)) {
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
    { year: CURRENT_YEAR - 120, title: "Ранний перелом", details: "Начинаются первые изменения." },
    { year: CURRENT_YEAR - 80, title: "Закрепление", details: "Новые процессы становятся устойчивыми." },
    { year: CURRENT_YEAR - 50, title: "Институциональный сдвиг", details: "Изменения входят в норму." },
    { year: CURRENT_YEAR - 35, title: "Глобальный эффект", details: "Изменения влияют на международный баланс." },
    { year: CURRENT_YEAR - 15, title: "Эхо перемен", details: "Новое поколение живет иначе." },
    { year: CURRENT_YEAR, title: "Сегодня", details: "Формируется альтернативная современность." },
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
          : `Этап ${index + 1}`;
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
    "Усилить международные союзы",
    "Сделать ставку на технологический рывок",
    "Сфокусироваться на внутренних реформах",
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
        return { src: item, prompt: "Иллюстрация альтернативной истории" };
      }
      if (typeof item?.src === "string") {
        return { src: item.src, prompt: item.prompt || "Иллюстрация альтернативной истории" };
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
    return "Гипотеза построена, но текстовое описание оказалось неполным.";
  }

  const parsed = parseStructuredNarrative(raw);
  if (parsed) {
    return sanitizeNarrativeText(parsed);
  }

  if (looksLikeStructuredPayload(raw)) {
    return "Гипотеза построена, но модель вернула служебный JSON вместо чистого текста.";
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
