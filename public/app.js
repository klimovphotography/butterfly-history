const form = document.getElementById("event-form");
const input = document.getElementById("event-input");
const button = document.getElementById("submit-btn");
const messages = document.getElementById("messages");
const historyList = document.getElementById("history-list");
const clearHistoryButton = document.getElementById("clear-history-btn");
const exampleButtons = document.querySelectorAll(".example-btn");

const HISTORY_KEY = "butterfly_history_v2";
const HISTORY_LIMIT = 20;
const CURRENT_YEAR = new Date().getFullYear();

let history = readHistory();
let activeScenario = null;
let isLoading = false;

renderHistory();

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  await startScenario(input.value);
});

clearHistoryButton.addEventListener("click", () => {
  history = [];
  saveHistory(history);
  renderHistory();
});

for (const btn of exampleButtons) {
  btn.addEventListener("click", () => {
    const eventText = btn.dataset.event || "";
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

  if (scenario.timeline.length > 0) {
    const title = document.createElement("p");
    title.className = "section-title";
    title.textContent = "Таймлайн по годам";
    article.append(title);
    article.append(buildYearTimeline(scenario.timeline));
  }

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
  messages.scrollTop = messages.scrollHeight;
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

  return { narrative, timeline, branches, images };
}

function normalizeTimeline(rawTimeline) {
  const defaults = [
    { year: CURRENT_YEAR - 120, title: "Ранний перелом", details: "Начинаются первые изменения." },
    { year: CURRENT_YEAR - 80, title: "Закрепление", details: "Новые процессы становятся устойчивыми." },
    { year: CURRENT_YEAR - 35, title: "Глобальный эффект", details: "Изменения влияют на международный баланс." },
    { year: CURRENT_YEAR, title: "Сегодня", details: "Формируется альтернативная современность." },
  ];

  if (!Array.isArray(rawTimeline)) {
    return defaults;
  }

  const parsed = rawTimeline
    .slice(0, 6)
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
  while (parsed.length < 4) {
    parsed.push(defaults[parsed.length]);
  }
  parsed[parsed.length - 1].year = CURRENT_YEAR;
  parsed.sort((a, b) => a.year - b.year);
  return parsed.slice(0, 4);
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
