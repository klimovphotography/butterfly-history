const form = document.getElementById("event-form");
const input = document.getElementById("event-input");
const button = document.getElementById("submit-btn");
const messages = document.getElementById("messages");
const historyList = document.getElementById("history-list");
const clearHistoryButton = document.getElementById("clear-history-btn");
const randomButton = document.getElementById("random-btn");
const providerPill = document.getElementById("provider-pill");

const HISTORY_KEY = "butterfly_history_v2";
const HISTORY_LIMIT = 20;
const CURRENT_YEAR = new Date().getFullYear();
const QUICK_START_EXAMPLES = [
  "Что если Карибский кризис 1962 года перешел в прямой военный конфликт?",
  "Что если Византия удержала Константинополь в 1453 году?",
  "Что если высадка в Нормандии в 1944 году провалилась?",
  "Что если Юлий Цезарь не был убит в 44 году до н.э.?",
  "Что если Великая Армада Испании победила Англию в 1588 году?",
  "Что если Наполеон выиграл битву при Ватерлоо в 1815 году?",
  "Что если Российская империя избежала революции 1917 года?",
  "Что если Римская империя не распалась на западную и восточную части?",
  "Что если полет Гагарина в 1961 году не состоялся?",
  "Что если СССР не распался в 1991 году?",
];

let history = readHistory();
let activeScenario = null;
let isLoading = false;

renderHistory();
loadProviderMeta();

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  await startScenario(input.value);
});

clearHistoryButton.addEventListener("click", () => {
  history = [];
  saveHistory(history);
  renderHistory();
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

  activeScenario = {
    rootEvent: eventText,
    steps: [],
  };

  addTextMessage("user", eventText);
  form.reset();

  await requestScenario({
    event: eventText,
    branch: "",
    context: [],
  });
}

async function continueScenario(branchText) {
  if (!activeScenario || isLoading) return;
  const branch = String(branchText || "").trim();
  if (!branch) return;

  addTextMessage("user", `Что делаем дальше: ${branch}`);

  await requestScenario({
    event: activeScenario.rootEvent,
    branch,
    context: activeScenario.steps.map((step) => ({
      branch: step.branch,
      narrative: step.narrative,
      timeline: step.timeline,
    })),
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

    if (activeScenario) {
      activeScenario.steps.push({
        branch: payload.branch || "Старт",
        narrative: scenario.narrative,
        timeline: scenario.timeline,
      });
    }

    addScenarioMessage(scenario, { interactive: true });
    pushHistory({
      event: payload.branch ? `${payload.event} -> ${payload.branch}` : payload.event,
      rootEvent: payload.event,
      branch: payload.branch || "",
      scenario: toHistoryScenario(scenario),
      createdAt: new Date().toISOString(),
    });
  } catch {
    removeMessage(loadingId);
    addTextMessage("assistant", "Ошибка сети. Проверьте, что сервер запущен.");
  } finally {
    isLoading = false;
    setUiBusy(false);
    input.focus();
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

  for (const branchButton of messages.querySelectorAll(".branch-btn")) {
    branchButton.disabled = state;
  }
}

function addScenarioMessage(scenario, options = {}) {
  const interactive = options.interactive !== false;
  const article = document.createElement("article");
  article.className = "message assistant";
  article.dataset.id = crypto.randomUUID();

  const badge = document.createElement("div");
  badge.className = "badge";
  badge.textContent = "ИИ";
  article.append(badge);

  const narrative = document.createElement("p");
  narrative.className = "body";
  narrative.textContent = scenario.narrative;
  article.append(narrative);

  if (scenario.shareCard) {
    article.append(buildShareCard(scenario.shareCard));
  }

  // Таймлайн по годам скрыт, так как дублирует сторис-карточку.

  if (scenario.images.length > 0) {
    const title = document.createElement("p");
    title.className = "section-title";
    title.textContent = "Иллюстрации альтернативного мира";
    article.append(title);
    article.append(buildImageGrid(scenario.images));
  }

  if (interactive && scenario.branches.length > 0) {
    const branchBox = document.createElement("div");
    branchBox.className = "branch-box";

    const title = document.createElement("p");
    title.className = "section-title";
    title.textContent = "Что делаем дальше?";
    branchBox.append(title);

    const list = document.createElement("div");
    list.className = "branch-list";

    for (const branch of scenario.branches) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "branch-btn";
      btn.textContent = branch;
      btn.addEventListener("click", async () => {
        await continueScenario(branch);
      });
      list.append(btn);
    }

    branchBox.append(list);
    article.append(branchBox);
  }

  messages.append(article);
  scrollMessageToStart(article);
}

function buildYearTimeline(items) {
  const timeline = document.createElement("ol");
  timeline.className = "year-timeline";

  for (const item of items) {
    const li = document.createElement("li");
    li.className = "year-item";

    const year = document.createElement("div");
    year.className = "year-badge";
    year.textContent = String(item.year);

    const content = document.createElement("div");
    content.className = "year-content";

    const title = document.createElement("p");
    title.className = "year-title";
    title.textContent = item.title;

    const details = document.createElement("p");
    details.className = "year-details";
    details.textContent = item.details;

    content.append(title, details);
    li.append(year, content);
    timeline.append(li);
  }

  return timeline;
}

function buildImageGrid(images) {
  const grid = document.createElement("div");
  grid.className = "image-grid";

  for (const image of images) {
    const card = document.createElement("figure");
    card.className = "image-card";

    const img = document.createElement("img");
    img.loading = "lazy";
    img.src = image.src;
    img.alt = image.prompt || "Иллюстрация альтернативной истории";

    const caption = document.createElement("figcaption");
    caption.className = "image-caption";
    caption.textContent = shorten(image.prompt || "Иллюстрация", 130);

    card.append(img, caption);
    grid.append(card);
  }

  return grid;
}

function buildShareCard(card) {
  const wrapper = document.createElement("div");
  wrapper.className = "share-card";

  const frame = document.createElement("div");
  frame.className = "share-card-frame";
  frame.dataset.captureId = crypto.randomUUID();

  const eyebrow = document.createElement("p");
  eyebrow.className = "share-card-eyebrow";
  eyebrow.textContent = "Что если?";

  const title = document.createElement("h3");
  title.className = "share-card-title";
  title.textContent = card.title;

  const subtitle = document.createElement("p");
  subtitle.className = "share-card-subtitle";
  subtitle.textContent = card.subtitle;

  const list = document.createElement("div");
  list.className = "share-card-list";

  for (const item of card.items) {
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

  const footer = document.createElement("div");
  footer.className = "share-card-footer";

  const tag = document.createElement("span");
  tag.className = "share-card-tag";
  const footerLines = parseShareCardFooter(card.footer);
  const domain = document.createElement("span");
  domain.className = "share-card-domain";
  domain.textContent = footerLines.domain;
  const cta = document.createElement("span");
  cta.className = "share-card-cta";
  cta.textContent = footerLines.cta;
  tag.dataset.domain = footerLines.domain;
  tag.dataset.cta = footerLines.cta;
  tag.append(domain, cta);

  footer.append(tag);
  frame.append(eyebrow, title, subtitle, list, footer);
  wrapper.append(frame);

  const openButton = document.createElement("button");
  openButton.type = "button";
  openButton.className = "share-card-download";
  openButton.textContent = "Открыть изображение";
  openButton.addEventListener("click", async () => {
    await openShareCardImage(frame, card);
  });

  wrapper.append(openButton);
  return wrapper;
}

async function openShareCardImage(target, card) {
  if (!target || typeof window.html2canvas !== "function") {
    return;
  }

  try {
    if (document.fonts && typeof document.fonts.ready?.then === "function") {
      await document.fonts.ready;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
    const captureId = target.dataset.captureId;
    const canvas = await window.html2canvas(target, {
      backgroundColor: null,
      scale: 2,
      useCORS: true,
      onclone: (doc) => {
        if (!captureId) return;
        const clonedTarget = doc.querySelector(`[data-capture-id="${captureId}"]`);
        if (!clonedTarget) return;
        const tag = clonedTarget.querySelector(".share-card-tag");
        if (!tag) return;
        const domain = tag.dataset.domain || "butterfly-history.ru";
        const cta = tag.dataset.cta || "смоделировать свою ветку реальности";
        tag.textContent = `${domain}\n${cta}`;
        tag.style.whiteSpace = "pre-line";
        tag.style.textAlign = "center";
        tag.style.color = "#061413";
        tag.style.textShadow = "none";
        tag.style.fontFamily = "Space Grotesk, Arial, sans-serif";
      },
    });

    const dataUrl = canvas.toDataURL("image/png");
    const win = window.open();
    if (win) {
      win.document.write(`<img src="${dataUrl}" alt="Share card" style="width:100%;height:auto;display:block;margin:0;" />`);
      win.document.close();
    } else {
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = buildShareCardFilename(card);
      document.body.append(link);
      link.click();
      link.remove();
    }
  } catch {
    // Ignore download errors silently.
  }
}

function buildShareCardFilename(card) {
  const base = String(card?.title || "share-card")
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${base || "share-card"}.png`;
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

  const narrative =
    typeof raw.narrative === "string" && raw.narrative.trim()
      ? raw.narrative.trim()
      : "Гипотеза построена, но текстовое описание оказалось неполным.";

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
      text: item.text.length > 90 ? `${item.text.slice(0, 87)}…` : item.text,
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
  return {
    narrative: text.trim(),
    timeline: normalizeTimeline([]),
    branches: normalizeBranches([]),
    images: [],
    shareCard: normalizeShareCard(null, text.trim(), normalizeTimeline([])),
  };
}

function pushHistory(entry) {
  history = [entry, ...history].slice(0, HISTORY_LIMIT);
  saveHistory(history);
  renderHistory();
}

function toHistoryScenario(scenario) {
  return {
    narrative: scenario.narrative,
    timeline: scenario.timeline,
    branches: scenario.branches,
    images: scenario.images
      .filter((image) => image.src.startsWith("http://") || image.src.startsWith("https://"))
      .slice(0, 2),
    shareCard: scenario.shareCard,
  };
}

function renderHistory() {
  historyList.innerHTML = "";

  if (history.length === 0) {
    const empty = document.createElement("p");
    empty.className = "history-empty";
    empty.textContent = "Пока пусто. Первый сценарий появится здесь.";
    historyList.append(empty);
    return;
  }

  for (const item of history) {
    const card = document.createElement("article");
    card.className = "history-item";

    const title = document.createElement("h3");
    title.textContent = item.event;

    const meta = document.createElement("p");
    meta.className = "history-meta";
    meta.textContent = formatDate(item.createdAt);

    const preview = document.createElement("p");
    preview.className = "history-preview";
    preview.textContent = shorten(item?.scenario?.narrative || "", 180);

    const actions = document.createElement("div");
    actions.className = "history-actions";

    const openButton = document.createElement("button");
    openButton.type = "button";
    openButton.className = "ghost-btn";
    openButton.textContent = "Открыть в чате";
    openButton.addEventListener("click", () => {
      addTextMessage("user", item.event);
      if (item?.scenario) {
        addScenarioMessage(item.scenario, { interactive: false });
      }
    });

    const rerunButton = document.createElement("button");
    rerunButton.type = "button";
    rerunButton.className = "ghost-btn";
    rerunButton.textContent = "Повторить запрос";
    rerunButton.addEventListener("click", async () => {
      await startScenario(item.rootEvent || item.event);
    });

    actions.append(openButton, rerunButton);
    card.append(title, meta, preview, actions);
    historyList.append(card);
  }
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "";
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function shorten(value, maxLength) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}

function saveHistory(value) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(value));
}

function readHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (item) =>
          typeof item?.event === "string" &&
          typeof item?.createdAt === "string" &&
          item?.scenario &&
          typeof item.scenario === "object"
      )
      .slice(0, HISTORY_LIMIT);
  } catch {
    return [];
  }
}
