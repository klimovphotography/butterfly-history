import fs from "node:fs";
import fsp from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

loadEnvFile();

const PORT = Number(process.env.PORT || 3000);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_IMAGE_MODEL =
  process.env.GEMINI_IMAGE_MODEL || "imagen-4.0-fast-generate-001";
const GEMINI_ENABLE_IMAGES = process.env.GEMINI_ENABLE_IMAGES !== "false";
const GEMINI_BASE_URL =
  process.env.GEMINI_BASE_URL ||
  "https://generativelanguage.googleapis.com/v1beta/openai";

const AIPRODUCTIV_API_KEY = process.env.AIPRODUCTIV_API_KEY;
const AIPRODUCTIV_MODEL = process.env.AIPRODUCTIV_MODEL || "gpt-5.2";
const AIPRODUCTIV_BASE_URL =
  process.env.AIPRODUCTIV_BASE_URL || "https://api.aiproductiv.ru/v1";


const MODEL_CATALOG = [
  {
    id: "aiproductiv-gpt-5.2",
    label: "GPT-5.2",
    provider: "AIPRODUCTIV",
    providerLabel: "AIPRODUCTIV",
    model: AIPRODUCTIV_MODEL,
    baseUrl: AIPRODUCTIV_BASE_URL,
    apiKey: AIPRODUCTIV_API_KEY,
    enableImages: false,
  },
  {
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    provider: "GEMINI",
    providerLabel: "GEMINI",
    model: GEMINI_MODEL,
    baseUrl: GEMINI_BASE_URL,
    apiKey: GEMINI_API_KEY,
    enableImages: GEMINI_ENABLE_IMAGES,
  },
];

const UI_MODEL_IDS = ["aiproductiv-gpt-5.2"];

function isModelEnabled(model) {
  if (!model?.apiKey) return false;
  return true;
}

function getDefaultModelId() {
  if (AIPRODUCTIV_API_KEY) return "aiproductiv-gpt-5.2";
  if (GEMINI_API_KEY) return "gemini-2.5-flash";
  return null;
}

function getModelById(modelId) {
  if (!modelId) return null;
  return MODEL_CATALOG.find((model) => model.id === modelId) || null;
}

function getUiModels() {
  const uiModels = UI_MODEL_IDS.map((id) => getModelById(id)).filter(Boolean);
  if (uiModels.length > 0) {
    return uiModels;
  }
  return MODEL_CATALOG;
}

function pickModelConfig(requestedId) {
  const requested = getModelById(requestedId);
  if (requested && isModelEnabled(requested)) {
    return { model: requested, isFallback: false };
  }

  const fallbackId = getDefaultModelId();
  const fallback = getModelById(fallbackId);
  if (fallback && isModelEnabled(fallback)) {
    return { model: fallback, isFallback: true };
  }

  return { model: null, isFallback: false };
}

function missingModelMessage(model) {
  if (!model) {
    return (
      "Не найден API ключ. Добавьте AIPRODUCTIV_API_KEY или GEMINI_API_KEY " +
      "в .env и перезапустите сервер."
    );
  }

  return `Для ${model.providerLabel} нужен API ключ в .env.`;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, "public");

const server = http.createServer(async (req, res) => {
  try {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);

    if (req.method === "GET" && url.pathname === "/api/meta") {
      const defaultModelId = getDefaultModelId();
      const { model } = pickModelConfig(defaultModelId);
      const uiModels = getUiModels();
      sendJson(res, 200, {
        provider: model?.providerLabel || "",
        model: model?.label || "",
        selectedModelId: model?.id || "",
        models: uiModels.map((entry) => ({
          id: entry.id,
          label: entry.label,
          provider: entry.providerLabel,
          enabled: isModelEnabled(entry),
        })),
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/alt-history") {
      await handleAltHistory(req, res);
      return;
    }

    if (req.method === "GET" || req.method === "HEAD") {
      await serveStaticFile(url.pathname, res, req.method);
      return;
    }

    sendJson(res, 405, { error: "Method Not Allowed" });
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: "Внутренняя ошибка сервера." });
  }
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

async function handleAltHistory(req, res) {
  const body = await readJsonBody(req);
  const event = typeof body.event === "string" ? body.event.trim() : "";
  const branch = typeof body.branch === "string" ? body.branch.trim() : "";
  const context = normalizeContext(body.context);
  const modeId = typeof body.mode === "string" ? body.mode.trim() : "";
  const requestedModelId =
    typeof body.modelId === "string" ? body.modelId.trim() : "";
  const currentYear = new Date().getFullYear();

  if (!event) {
    sendJson(res, 400, { error: "Введите историческое событие." });
    return;
  }

  const { model: modelConfig } = pickModelConfig(requestedModelId);
  if (!modelConfig) {
    const requestedModel = getModelById(requestedModelId);
    sendJson(res, 500, { error: missingModelMessage(requestedModel) });
    return;
  }

  const modeConfig = resolveModeConfig(modeId);
  const systemMessage = buildSystemMessage(modeConfig.id, currentYear);
  const userPrompt = buildUserPrompt({ event, branch, context, currentYear });

  try {
    const scenario = await generateScenario({
      modelConfig,
      systemMessage,
      userPrompt,
      currentYear,
      event,
      temperature: modeConfig.temperature,
    });

    if (modelConfig.enableImages && scenario.imagePrompts.length > 0) {
      scenario.images = await generateScenarioImages(scenario.imagePrompts);
    } else {
      scenario.images = [];
    }

    sendJson(res, 200, { scenario });
  } catch (error) {
    console.error(error);
    const message =
      error && typeof error.message === "string"
        ? error.message
        : "Не удалось получить ответ от API модели.";
    sendJson(res, 500, { error: message });
  }
}

async function generateScenario({
  modelConfig,
  systemMessage,
  userPrompt,
  currentYear,
  event,
  temperature,
}) {
  const baseUrl = modelConfig.baseUrl.replace(/\/+$/, "");
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${modelConfig.apiKey}`,
  };

  const payload = {
    model: modelConfig.model,
    messages: [systemMessage, { role: "user", content: userPrompt }],
    temperature: Number.isFinite(temperature) ? temperature : 0.6,
  };

  const { response, data } = await fetchJson(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const apiMessage =
      data?.error?.message || "Ошибка при обращении к API модели.";
    throw new Error(apiMessage);
  }

  const modelText = extractTextFromChatCompletion(data);
  if (!modelText) {
    throw new Error("Модель вернула пустой ответ.");
  }

  return parseScenarioResponse(modelText, currentYear, event);
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  return { response, data };
}


function buildUserPrompt({ event, branch, context, currentYear }) {
  const serializedContext =
    context.length > 0
      ? JSON.stringify(context, null, 2)
      : "[]";

  if (branch) {
    return `
Исходное событие: ${event}
Выбранная развилка: ${branch}
Текущий год: ${currentYear}
Краткий контекст прошлых шагов:
${serializedContext}

Продолжи именно эту альтернативную ветку.
`.trim();
  }

  return `
Исходное событие: ${event}
Текущий год: ${currentYear}
Контекст прошлых шагов (если пусто, это первый шаг):
${serializedContext}

Построй первый шаг альтернативной истории.
`.trim();
}

function resolveModeConfig(rawMode) {
  const mode = String(rawMode || "").toLowerCase();
  switch (mode) {
    case "dark":
      return {
        id: "dark",
        temperature: 0.3,
      };
    case "prosperity":
      return {
        id: "prosperity",
        temperature: 0.6,
      };
    case "madness":
      return {
        id: "madness",
        temperature: 0.9,
      };
    case "humor":
      return {
        id: "humor",
        temperature: 0.9,
      };
    case "realism":
    default:
      return {
        id: "realism",
        temperature: 0.3,
      };
  }
}

function normalizeContext(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.slice(-4).map((item) => {
    const branch = typeof item?.branch === "string" ? item.branch.slice(0, 200) : "";
    const narrative =
      typeof item?.narrative === "string" ? item.narrative.slice(0, 1200) : "";
    const timeline = Array.isArray(item?.timeline)
      ? item.timeline
          .slice(0, 4)
          .map((point) => ({
            year: normalizeYear(point?.year),
            title: typeof point?.title === "string" ? point.title.slice(0, 180) : "",
            details:
              typeof point?.details === "string" ? point.details.slice(0, 280) : "",
          }))
      : [];

    return { branch, narrative, timeline };
  });
}

function buildSystemMessage(modeId, currentYear) {
  switch (modeId) {
    case "dark":
      return {
        role: "system",
        content: `
Ты летописец катастроф. Опиши наихудший из возможных вариантов. Каждое решение ведет к краху войнам и упадку. Атмосфера тотальной безысходности.
Нельзя писать markdown, пояснения, префиксы или блоки кода.
Верни только корректный JSON-объект с полями:
- "narrative": строка 220-420 слов.
- "timeline": массив из ровно 6 объектов:
  {"year": number, "title": string, "details": string}
  Годы должны идти по возрастанию и быть конкретными числами.
  Последняя точка timeline должна быть про текущий год ${currentYear}.
- "branches": массив из 2-3 коротких вариантов продолжения (действие/развилка).
- "image_prompts": массив из 1-2 подробных промптов для иллюстраций альтернативного мира (без текста на изображении).
- "share_card": объект для сторис, НЕ повторяющий narrative:
  {"title": string, "subtitle": string, "items": [{"year": number, "text": string}], "footer": string}
  "items" содержит 5-6 коротких пунктов (до ~90 символов каждый).
`.trim(),
      };
    case "prosperity":
      return {
        role: "system",
        content: `
Ты оптимистичный футуролог. Опиши утопичный исход где люди решают конфликты мирным путем. Фокус на научном и социальном прогрессе.
Нельзя писать markdown, пояснения, префиксы или блоки кода.
Верни только корректный JSON-объект с полями:
- "narrative": строка 220-420 слов.
- "timeline": массив из ровно 6 объектов:
  {"year": number, "title": string, "details": string}
  Годы должны идти по возрастанию и быть конкретными числами.
  Последняя точка timeline должна быть про текущий год ${currentYear}.
- "branches": массив из 2-3 коротких вариантов продолжения (действие/развилка).
- "image_prompts": массив из 1-2 подробных промптов для иллюстраций альтернативного мира (без текста на изображении).
- "share_card": объект для сторис, НЕ повторяющий narrative:
  {"title": string, "subtitle": string, "items": [{"year": number, "text": string}], "footer": string}
  "items" содержит 5-6 коротких пунктов (до ~90 символов каждый).
`.trim(),
      };
    case "madness":
      return {
        role: "system",
        content: `
Ты автор артхаусного кино. Напиши абсолютно абсурдный сценарий где ломаются базовые законы логики. Происходит лютая дичь и пространственные парадоксы.
Нельзя писать markdown, пояснения, префиксы или блоки кода.
Верни только корректный JSON-объект с полями:
- "narrative": строка 220-420 слов.
- "timeline": массив из ровно 6 объектов:
  {"year": number, "title": string, "details": string}
  Годы должны идти по возрастанию и быть конкретными числами.
  Последняя точка timeline должна быть про текущий год ${currentYear}.
- "branches": массив из 2-3 коротких вариантов продолжения (действие/развилка).
- "image_prompts": массив из 1-2 подробных промптов для иллюстраций альтернативного мира (без текста на изображении).
- "share_card": объект для сторис, НЕ повторяющий narrative:
  {"title": string, "subtitle": string, "items": [{"year": number, "text": string}], "footer": string}
  "items" содержит 5-6 коротких пунктов (до ~90 символов каждый).
`.trim(),
      };
    case "humor":
      return {
        role: "system",
        content: `
Ты циничный комик и автор сатирического издания. Жестко высмеивай исторические события и пафос правителей. Текст обязан быть пропитан едким сарказмом и нелепыми метафорами. Никакой серьезной аналитики.
Нельзя писать markdown, пояснения, префиксы или блоки кода.
Верни только корректный JSON-объект с полями:
- "narrative": строка 220-420 слов.
- "timeline": массив из ровно 6 объектов:
  {"year": number, "title": string, "details": string}
  Годы должны идти по возрастанию и быть конкретными числами.
  Последняя точка timeline должна быть про текущий год ${currentYear}.
- "branches": массив из 2-3 коротких вариантов продолжения (действие/развилка).
- "image_prompts": массив из 1-2 подробных промптов для иллюстраций альтернативного мира (без текста на изображении).
- "share_card": объект для сторис, НЕ повторяющий narrative:
  {"title": string, "subtitle": string, "items": [{"year": number, "text": string}], "footer": string}
  "items" содержит 5-6 коротких пунктов (до ~90 символов каждый).
`.trim(),
      };
    case "realism":
    default:
      return {
        role: "system",
        content: `
Ты строгий академический историк. Твоя задача выдать максимально правдоподобный сценарий альтернативной истории. Опирайся исключительно на экономику демографию и политику. Сухой аналитический стиль.
Нельзя писать markdown, пояснения, префиксы или блоки кода.
Верни только корректный JSON-объект с полями:
- "narrative": строка 220-420 слов.
- "timeline": массив из ровно 6 объектов:
  {"year": number, "title": string, "details": string}
  Годы должны идти по возрастанию и быть конкретными числами.
  Последняя точка timeline должна быть про текущий год ${currentYear}.
- "branches": массив из 2-3 коротких вариантов продолжения (действие/развилка).
- "image_prompts": массив из 1-2 подробных промптов для иллюстраций альтернативного мира (без текста на изображении).
- "share_card": объект для сторис, НЕ повторяющий narrative:
  {"title": string, "subtitle": string, "items": [{"year": number, "text": string}], "footer": string}
  "items" содержит 5-6 коротких пунктов (до ~90 символов каждый).
`.trim(),
      };
  }
}

function parseScenarioResponse(modelText, currentYear, event) {
  const parsed = parseJsonFromModelText(modelText);
  const narrative = pickString(parsed?.narrative) || modelText.trim();
  const timeline = normalizeTimeline(parsed?.timeline, currentYear, narrative);
  const branches = normalizeBranches(parsed?.branches);
  const imagePrompts = normalizeImagePrompts(parsed?.image_prompts, narrative);
  const shareCard = normalizeShareCard(parsed?.share_card, {
    narrative,
    timeline,
    currentYear,
    event,
  });

  return {
    narrative,
    timeline,
    branches,
    imagePrompts,
    images: [],
    shareCard,
  };
}

function parseJsonFromModelText(text) {
  const raw = String(text || "").trim();
  if (!raw) {
    return null;
  }

  const withoutFences = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  try {
    return JSON.parse(withoutFences);
  } catch {
    const start = withoutFences.indexOf("{");
    const end = withoutFences.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      return null;
    }
    try {
      return JSON.parse(withoutFences.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

function normalizeTimeline(rawTimeline, currentYear, narrative) {
  const defaults = buildDefaultTimeline(currentYear, narrative);

  if (!Array.isArray(rawTimeline)) {
    return defaults;
  }

  const cleaned = rawTimeline
    .slice(0, 8)
    .map((item, index) => ({
      year: normalizeYear(item?.year) ?? defaults[Math.min(index, defaults.length - 1)].year,
      title:
        pickString(item?.title) ||
        `Этап ${index + 1}`,
      details:
        pickString(item?.details) ||
        pickString(item?.text) ||
        defaults[Math.min(index, defaults.length - 1)].details,
    }))
    .filter((item) => item.details);

  if (cleaned.length === 0) {
    return defaults;
  }

  const usedYears = new Set();
  for (const item of cleaned) {
    let year = item.year;
    while (usedYears.has(year)) {
      year += 1;
    }
    item.year = year;
    usedYears.add(year);
  }

  cleaned.sort((a, b) => a.year - b.year);

  while (cleaned.length < 6) {
    const fallback = defaults[Math.min(cleaned.length, defaults.length - 1)];
    cleaned.push({ ...fallback });
  }

  const timeline = cleaned.slice(0, 6);
  timeline[timeline.length - 1].year = currentYear;
  timeline.sort((a, b) => a.year - b.year);
  return timeline;
}

function buildDefaultTimeline(currentYear, narrative) {
  const snippet = pickString(narrative) || "Последствия разворачиваются постепенно.";
  return [
    {
      year: currentYear - 120,
      title: "Ранний перелом",
      details: snippet.slice(0, 180),
    },
    {
      year: currentYear - 80,
      title: "Закрепление тренда",
      details: "Новые политические и экономические правила начинают стабилизироваться.",
    },
    {
      year: currentYear - 50,
      title: "Институциональный сдвиг",
      details: "Изменения входят в рутину управления и становятся нормой.",
    },
    {
      year: currentYear - 35,
      title: "Глобальный эффект",
      details: "Изменения переходят на мировой уровень и влияют на союзы и технологии.",
    },
    {
      year: currentYear - 15,
      title: "Эхо перемен",
      details: "Новые поколения живут в иной политической и культурной реальности.",
    },
    {
      year: currentYear,
      title: "Состояние сегодня",
      details: "Мир приходит к альтернативной современной конфигурации.",
    },
  ];
}

function normalizeBranches(rawBranches) {
  const defaults = [
    "Сделать ставку на технологический рывок и его последствия",
    "Усилить международные союзы и проверить, как меняется баланс сил",
    "Сфокусироваться на внутренних реформах и реакции общества",
  ];

  if (!Array.isArray(rawBranches)) {
    return defaults.slice(0, 3);
  }

  const unique = [];
  for (const entry of rawBranches) {
    const branch = pickString(entry);
    if (!branch) continue;
    if (unique.includes(branch)) continue;
    unique.push(branch);
    if (unique.length === 3) break;
  }

  while (unique.length < 2) {
    unique.push(defaults[unique.length]);
  }

  return unique.slice(0, 3);
}

function normalizeImagePrompts(rawPrompts, narrative) {
  const prompts = Array.isArray(rawPrompts)
    ? rawPrompts
        .map((prompt) => pickString(prompt))
        .filter(Boolean)
        .slice(0, 2)
    : [];

  if (prompts.length > 0) {
    return prompts;
  }

  const summary = (pickString(narrative) || "").slice(0, 260);
  return [
    `Альтернативная история, кинематографичная сцена, исторический антураж, высокая детализация: ${summary}`,
    `Панорама города в альтернативном мире, исторический реализм, широкоугольный кадр, реалистичный свет`,
  ];
}

function normalizeShareCard(rawCard, { narrative, timeline, currentYear, event }) {
  const fallback = buildFallbackShareCard({ narrative, timeline, currentYear, event });

  if (!rawCard || typeof rawCard !== "object") {
    return fallback;
  }

  const title = pickString(rawCard.title) || fallback.title;
  const subtitle = pickString(rawCard.subtitle) || fallback.subtitle;
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
      const year = normalizeYear(item?.year) ?? fallback.items[Math.min(index, fallback.items.length - 1)].year;
      const text =
        pickString(item?.text) ||
        pickString(item?.title) ||
        pickString(item?.details) ||
        fallback.items[Math.min(index, fallback.items.length - 1)].text;
      return { year, text };
    })
    .filter((item) => item.text);

  let normalized = ensureUniqueYears(items.slice(0, 6), timeline, currentYear);
  while (normalized.length < 5) {
    normalized.push(fallback.items[normalized.length]);
  }
  normalized = ensureUniqueYears(normalized, timeline, currentYear);

  return {
    title,
    subtitle,
    items: normalized,
    footer,
  };
}

function ensureUniqueYears(items, timeline, currentYear) {
  const fallbackYears = timeline.map((point) => point.year).filter(Boolean);
  const used = new Set();
  const result = [];

  for (let i = 0; i < items.length; i += 1) {
    const baseYear = items[i]?.year ?? fallbackYears[i] ?? currentYear;
    let year = baseYear;
    while (used.has(year)) {
      year += 1;
    }
    used.add(year);
    result.push({ ...items[i], year });
  }

  return result;
}

function buildFallbackShareCard({ narrative, timeline, currentYear, event }) {
  const titleBase = pickString(event) || "Что если?";
  const title = titleBase.length > 72 ? `${titleBase.slice(0, 69)}…` : titleBase;
  const subtitle = buildCardSubtitle(narrative);
  const items = timeline.slice(0, 6).map((point) => ({
    year: point.year || currentYear,
    text: pickString(point.title) || pickString(point.details) || "Ключевой поворот истории.",
  }));

  const trimmed = items
    .map((item) => ({
      year: item.year,
      text: item.text.length > 90 ? `${item.text.slice(0, 87)}…` : item.text,
    }))
    .slice(0, 6);

  while (trimmed.length < 5) {
    trimmed.push({
      year: currentYear,
      text: "Финальный эффект захватывает современность.",
    });
  }

  return {
    title,
    subtitle,
    items: trimmed,
    footer: "butterfly-history.ru\nсмоделировать свою ветку реальности",
  };
}

function buildCardSubtitle(narrative) {
  const text = pickString(narrative).replace(/\s+/g, " ").trim();
  if (!text) return "Хроника альтернативного перелома — коротко и дерзко.";
  const sentence = text.split(/[.!?]/).find((part) => part.trim());
  if (!sentence) return "Хроника альтернативного перелома — коротко и дерзко.";
  const trimmed = sentence.trim();
  return trimmed.length > 110 ? `${trimmed.slice(0, 107)}…` : trimmed;
}

async function generateScenarioImages(prompts) {
  const tasks = prompts.slice(0, 2).map((prompt) => generateSingleImage(prompt));
  const results = await Promise.all(tasks);
  const generated = results.filter(Boolean);

  if (generated.length === prompts.slice(0, 2).length) {
    return generated;
  }

  const withFallback = [...generated];
  for (const prompt of prompts.slice(0, 2)) {
    if (withFallback.length >= 2) break;

    const exists = withFallback.some((img) => img.prompt === prompt);
    if (exists) continue;

    withFallback.push({
      src: buildFallbackSvgDataUri(prompt),
      prompt,
    });
  }

  return withFallback.slice(0, 2);
}

async function generateSingleImage(prompt) {
  try {
    const response = await fetch(
      `${GEMINI_BASE_URL.replace(/\/+$/, "")}/images/generations`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GEMINI_API_KEY}`,
        },
        body: JSON.stringify({
          model: GEMINI_IMAGE_MODEL,
          prompt,
          size: "1024x1024",
          n: 1,
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      console.warn("Image generation failed:", data?.error?.message || response.statusText);
      return null;
    }

    const image = extractImagePayload(data);
    if (!image) {
      return null;
    }

    if (image.url) {
      return { src: image.url, prompt };
    }

    return { src: `data:${image.mimeType};base64,${image.base64}`, prompt };
  } catch (error) {
    console.warn("Image generation error:", error?.message || error);
    return null;
  }
}

function extractImagePayload(data) {
  const candidates = [
    data?.data?.[0],
    data?.images?.[0],
    data?.output?.[0],
    data?.result?.[0],
    data,
  ];

  for (const item of candidates) {
    if (!item) continue;

    if (typeof item?.url === "string" && item.url) {
      return { url: item.url };
    }

    if (typeof item?.b64_json === "string" && item.b64_json) {
      return { base64: item.b64_json, mimeType: "image/png" };
    }

    if (typeof item?.base64 === "string" && item.base64) {
      return { base64: item.base64, mimeType: "image/png" };
    }

    if (typeof item?.image_base64 === "string" && item.image_base64) {
      return { base64: item.image_base64, mimeType: "image/png" };
    }

    const inline = item?.inline_data;
    if (typeof inline?.data === "string" && inline.data) {
      return { base64: inline.data, mimeType: inline.mime_type || "image/png" };
    }
  }

  const inlinePart = data?.candidates?.[0]?.content?.parts?.find(
    (part) => typeof part?.inline_data?.data === "string" && part.inline_data.data
  );

  if (inlinePart) {
    return {
      base64: inlinePart.inline_data.data,
      mimeType: inlinePart.inline_data.mime_type || "image/png",
    };
  }

  return null;
}

function pickString(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function normalizeYear(value) {
  const year = Number.parseInt(String(value), 10);
  if (!Number.isFinite(year)) {
    return null;
  }
  if (year < 500 || year > 4000) {
    return null;
  }
  return year;
}

function buildFallbackSvgDataUri(prompt) {
  const hash = hashText(prompt);
  const topColor = `hsl(${hash % 360} 62% 72%)`;
  const bottomColor = `hsl(${(hash + 50) % 360} 48% 40%)`;
  const sunColor = `hsl(${(hash + 190) % 360} 78% 76%)`;
  const skyline = createSkylinePath(hash);
  const caption = escapeXml(prompt.slice(0, 96));

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="768" viewBox="0 0 1024 768">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${topColor}"/>
      <stop offset="100%" stop-color="${bottomColor}"/>
    </linearGradient>
    <linearGradient id="ground" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="rgba(25,20,18,0.78)"/>
      <stop offset="100%" stop-color="rgba(12,10,9,0.88)"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="768" fill="url(#bg)"/>
  <circle cx="${170 + (hash % 640)}" cy="${120 + (hash % 130)}" r="84" fill="${sunColor}" opacity="0.58"/>
  <path d="${skyline}" fill="url(#ground)"/>
  <rect x="0" y="646" width="1024" height="122" fill="rgba(8,8,8,0.42)"/>
  <text x="44" y="704" font-family="Trebuchet MS, Segoe UI, sans-serif" font-size="28" fill="rgba(255,255,255,0.87)">
    Альтернативный мир
  </text>
  <text x="44" y="738" font-family="Trebuchet MS, Segoe UI, sans-serif" font-size="20" fill="rgba(255,255,255,0.78)">
    ${caption}
  </text>
</svg>`.trim();

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function createSkylinePath(seed) {
  let x = 0;
  let path = "M0 620 ";
  const base = 620;

  while (x < 1024) {
    const width = 26 + ((seed + x * 13) % 48);
    const height = 100 + ((seed + x * 19) % 230);
    path += `L${x} ${base} L${x} ${base - height} L${Math.min(1024, x + width)} ${base - height} L${Math.min(1024, x + width)} ${base} `;
    x += width + 6;
  }

  path += "L1024 768 L0 768 Z";
  return path;
}

function hashText(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function escapeXml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function extractTextFromChatCompletion(data) {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === "string" && content.trim()) {
    return content.trim();
  }

  if (!Array.isArray(content)) {
    return "";
  }

  const texts = content
    .filter((part) => typeof part?.text === "string")
    .map((part) => part.text);
  return texts.join("\n").trim();
}

async function serveStaticFile(pathname, res, method = "GET") {
  const targetPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.resolve(PUBLIC_DIR, `.${targetPath}`);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  try {
    const content = await fsp.readFile(filePath);
    res.writeHead(200, { "Content-Type": getContentType(filePath) });
    if (method === "HEAD") {
      res.end();
      return;
    }
    res.end(content);
  } catch (error) {
    if (error?.code === "ENOENT") {
      sendJson(res, 404, { error: "Not found" });
      return;
    }
    throw error;
  }
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "application/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".png":
      return "image/png";
    case ".ico":
      return "image/x-icon";
    case ".svg":
      return "image/svg+xml";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });

    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve({});
      }
    });

    req.on("error", reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, max-age=0",
  });
  res.end(JSON.stringify(data));
}

function loadEnvFile() {
  const envPath = path.join(process.cwd(), ".env");

  if (!fs.existsSync(envPath)) {
    return;
  }

  const content = fs.readFileSync(envPath, "utf-8");
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const equalIndex = trimmed.indexOf("=");
    if (equalIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, equalIndex).trim();
    let value = trimmed.slice(equalIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}
