import fs from "node:fs";
import fsp from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

loadEnvFile();

const PORT = Number(process.env.PORT || 3000);
const WORMSOFT_API_KEY = process.env.WORMSOFT_API_KEY;
const WORMSOFT_MODEL = process.env.WORMSOFT_MODEL || "openai/gpt-5.2";
const WORMSOFT_BASE_URL =
  process.env.WORMSOFT_BASE_URL || "https://ai.wormsoft.ru/api/gpt";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_IMAGE_MODEL =
  process.env.GEMINI_IMAGE_MODEL || "imagen-4.0-fast-generate-001";
const GEMINI_ENABLE_IMAGES = process.env.GEMINI_ENABLE_IMAGES !== "false";
const GEMINI_BASE_URL =
  process.env.GEMINI_BASE_URL ||
  "https://generativelanguage.googleapis.com/v1beta/openai";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-70b-versatile";
const GROQ_BASE_URL =
  process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "google/gemma-2-9b-it";
const OPENROUTER_BASE_URL =
  process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
const OPENROUTER_SITE_URL = process.env.OPENROUTER_SITE_URL || "";
const OPENROUTER_APP_NAME = process.env.OPENROUTER_APP_NAME || "Butterfly History";

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const MISTRAL_MODEL = process.env.MISTRAL_MODEL || "mistral-small-latest";
const MISTRAL_BASE_URL =
  process.env.MISTRAL_BASE_URL || "https://api.mistral.ai/v1";

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
const HUGGINGFACE_MODEL =
  process.env.HUGGINGFACE_MODEL || "meta-llama/Meta-Llama-3-8B-Instruct";
const HUGGINGFACE_BASE_URL =
  process.env.HUGGINGFACE_BASE_URL || "https://api-inference.huggingface.co/v1";

const AIPRODUCTIV_API_KEY = process.env.AIPRODUCTIV_API_KEY;
const AIPRODUCTIV_MODEL = process.env.AIPRODUCTIV_MODEL || "gpt-5.2";
const AIPRODUCTIV_BASE_URL =
  process.env.AIPRODUCTIV_BASE_URL || "https://api.aiproductiv.ru/v1";
const SITE_URL = (process.env.SITE_URL || "").replace(/\/+$/, "");

const FAILOVER_ORDER = (process.env.FAILOVER_ORDER || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const MODEL_CATALOG = [
  {
    id: "wormsoft-gpt-5.2",
    label: "Wormsoft GPT-5.2",
    provider: "WORMSOFT",
    providerLabel: "WORMSOFT",
    model: WORMSOFT_MODEL,
    baseUrl: WORMSOFT_BASE_URL,
    apiKey: WORMSOFT_API_KEY,
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
  {
    id: "groq-llama-3.1-70b",
    label: "Groq Llama 3.1 70B",
    provider: "GROQ",
    providerLabel: "GROQ",
    model: GROQ_MODEL,
    baseUrl: GROQ_BASE_URL,
    apiKey: GROQ_API_KEY,
    enableImages: false,
  },
  {
    id: "openrouter-gemma-2-9b",
    label: "OpenRouter Gemma 2 9B",
    provider: "OPENROUTER",
    providerLabel: "OPENROUTER",
    model: OPENROUTER_MODEL,
    baseUrl: OPENROUTER_BASE_URL,
    apiKey: OPENROUTER_API_KEY,
    enableImages: false,
  },
  {
    id: "mistral-small",
    label: "Mistral Small",
    provider: "MISTRAL",
    providerLabel: "MISTRAL",
    model: MISTRAL_MODEL,
    baseUrl: MISTRAL_BASE_URL,
    apiKey: MISTRAL_API_KEY,
    enableImages: false,
  },
  {
    id: "huggingface-llama3-8b",
    label: "Hugging Face Llama 3 8B",
    provider: "HUGGINGFACE",
    providerLabel: "HUGGINGFACE",
    model: HUGGINGFACE_MODEL,
    baseUrl: HUGGINGFACE_BASE_URL,
    apiKey: HUGGINGFACE_API_KEY,
    enableImages: false,
  },
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
];

const UI_MODEL_IDS = [
  "wormsoft-gpt-5.2",
  "gemini-2.5-flash",
  "groq-llama-3.1-70b",
  "openrouter-gemma-2-9b",
  "mistral-small",
  "huggingface-llama3-8b",
  "aiproductiv-gpt-5.2",
];
const DEFAULT_FAILOVER_ORDER = [...UI_MODEL_IDS];

function isModelEnabled(model) {
  if (!model?.apiKey) return false;
  return true;
}

function getDefaultModelId() {
  const ordered = getFailoverOrder();
  for (const modelId of ordered) {
    const model = getModelById(modelId);
    if (model && isModelEnabled(model)) {
      return modelId;
    }
  }
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

function getFailoverOrder() {
  if (FAILOVER_ORDER.length > 0) {
    return FAILOVER_ORDER;
  }
  return DEFAULT_FAILOVER_ORDER;
}

function hasAnyEnabledModels() {
  return MODEL_CATALOG.some((model) => isModelEnabled(model));
}

function buildModelAttempts(requestedId) {
  const attempts = [];
  const seen = new Set();

  const requested = getModelById(requestedId);
  if (requested && isModelEnabled(requested)) {
    attempts.push(requested);
    seen.add(requested.id);
  }

  const ordered = getFailoverOrder();
  for (const modelId of ordered) {
    const model = getModelById(modelId);
    if (!model || !isModelEnabled(model)) continue;
    if (seen.has(model.id)) continue;
    attempts.push(model);
    seen.add(model.id);
  }

  if (attempts.length === 0) {
    for (const model of MODEL_CATALOG) {
      if (!isModelEnabled(model)) continue;
      if (seen.has(model.id)) continue;
      attempts.push(model);
    }
  }

  return attempts;
}

function buildHeaders(modelConfig) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${modelConfig.apiKey}`,
  };

  if (modelConfig.provider === "OPENROUTER") {
    const referer = OPENROUTER_SITE_URL || SITE_URL;
    if (referer) {
      headers["HTTP-Referer"] = referer;
    }
    if (OPENROUTER_APP_NAME) {
      headers["X-Title"] = OPENROUTER_APP_NAME;
    }
  }

  return headers;
}

function isImagesEnabled() {
  return Boolean(GEMINI_API_KEY) && GEMINI_ENABLE_IMAGES;
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
      "Не найден API ключ. Добавьте хотя бы один из ключей: " +
      "WORMSOFT_API_KEY, GEMINI_API_KEY, GROQ_API_KEY, OPENROUTER_API_KEY, " +
      "MISTRAL_API_KEY, HUGGINGFACE_API_KEY или AIPRODUCTIV_API_KEY в .env " +
      "и перезапустите сервер."
    );
  }

  return `Для ${model.providerLabel} нужен API ключ в .env.`;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, "public");
const SHARE_LINKS_DIR = path.join(__dirname, "data");
const SHARE_LINKS_FILE = path.join(SHARE_LINKS_DIR, "share-links.json");

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
    if (req.method === "POST" && url.pathname === "/api/share-link") {
      await handleCreateShareLink(req, res);
      return;
    }
    if (req.method === "GET" && url.pathname.startsWith("/api/share-link/")) {
      const shortId = url.pathname.slice("/api/share-link/".length);
      await handleGetShareLink(req, res, shortId);
      return;
    }

    if (req.method === "GET" || req.method === "HEAD") {
      if (url.pathname === "/sitemap.xml") {
        await handleSitemap(req, res);
        return;
      }
      if (url.pathname === "/robots.txt") {
        handleRobots(req, res);
        return;
      }
      if (url.pathname === "/og/scenario.svg") {
        await handleScenarioOgImage(req, res, url);
        return;
      }
      if (url.pathname === "/og/scenario.png") {
        await handleScenarioOgPng(req, res, url);
        return;
      }
      if (url.pathname === "/" || url.pathname === "/index.html") {
        await serveIndexHtml(url, res, req.method, getSiteUrl(req));
        return;
      }
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

  const requestedModel = getModelById(requestedModelId);
  if (!hasAnyEnabledModels()) {
    sendJson(res, 500, { error: missingModelMessage(requestedModel) });
    return;
  }

  const modeConfig = resolveModeConfig(modeId);
  const systemMessage = buildSystemMessage(modeConfig.id, currentYear);
  const userPrompt = buildUserPrompt({ event, branch, context, currentYear });

  try {
    const scenario = await generateScenario({
      requestedModelId,
      systemMessage,
      userPrompt,
      currentYear,
      event,
      temperature: modeConfig.temperature,
    });

    if (isImagesEnabled() && scenario.imagePrompts.length > 0) {
      scenario.images = await generateScenarioImages(scenario.imagePrompts);
    } else {
      scenario.images = [];
    }

    sendJson(res, 200, {
      scenario: {
        ...scenario,
        event,
        mode: modeConfig.id,
      },
    });
  } catch (error) {
    console.error(error);
    const message =
      error && typeof error.message === "string"
        ? error.message
        : "Не удалось получить ответ от API модели.";
    sendJson(res, 500, { error: message });
  }
}

async function handleCreateShareLink(req, res) {
  const body = await readJsonBody(req);
  const scenario = String(body?.scenario || "").trim();
  if (!scenario) {
    sendJson(res, 400, { error: "Пустой сценарий для короткой ссылки." });
    return;
  }

  const parsed = decodeScenarioPayload(scenario);
  if (!parsed) {
    sendJson(res, 400, { error: "Некорректные данные сценария." });
    return;
  }

  const store = await readShareLinks();
  const existingId = findExistingShareId(store, scenario);
  const id = existingId || generateShortShareId(store);

  if (!existingId) {
    store[id] = {
      scenario,
      createdAt: new Date().toISOString(),
    };
    await writeShareLinks(store);
  }

  sendJson(res, 200, {
    id,
    url: `${getSiteUrl(req)}/?s=${encodeURIComponent(id)}`,
  });
}

async function handleGetShareLink(req, res, rawId) {
  const id = normalizeShortId(rawId);
  if (!id) {
    sendJson(res, 400, { error: "Некорректный id короткой ссылки." });
    return;
  }
  const store = await readShareLinks();
  const entry = store[id];
  if (!entry?.scenario) {
    sendJson(res, 404, { error: "Короткая ссылка не найдена." });
    return;
  }
  sendJson(res, 200, { id, scenario: entry.scenario });
}

async function generateScenario({
  requestedModelId,
  systemMessage,
  userPrompt,
  currentYear,
  event,
  temperature,
}) {
  const attempts = buildModelAttempts(requestedModelId);
  if (attempts.length === 0) {
    throw new Error(
      "Не найден доступный провайдер. Проверьте ключи в .env."
    );
  }

  const errors = [];
  for (const attempt of attempts) {
    try {
      const baseUrl = attempt.baseUrl.replace(/\/+$/, "");
      const headers = buildHeaders(attempt);
      const payload = {
        model: attempt.model,
        messages: [systemMessage, { role: "user", content: userPrompt }],
        temperature: Number.isFinite(temperature) ? temperature : 0.6,
      };

      const { response, data } = await fetchJson(
        `${baseUrl}/chat/completions`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const apiMessage =
          data?.error?.message ||
          data?.message ||
          "Ошибка при обращении к API модели.";
        throw new Error(apiMessage);
      }

      const modelText = extractTextFromChatCompletion(data);
      if (!modelText) {
        throw new Error("Модель вернула пустой ответ.");
      }

      return parseScenarioResponse(modelText, currentYear, event);
    } catch (error) {
      const message =
        error && typeof error.message === "string"
          ? error.message
          : "Неизвестная ошибка.";
      errors.push(`${attempt.providerLabel}: ${message}`);
      continue;
    }
  }

  throw new Error(`Все провайдеры недоступны.\n${errors.join("\n")}`);
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  if (!text) {
    return { response, data: {} };
  }
  try {
    return { response, data: JSON.parse(text) };
  } catch {
    return { response, data: { raw: text } };
  }
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
Сделай текст ярким и репостным: чтобы хотелось отправить другу в чат.
Главный заголовок карточки уже равен исходному вопросу, не придумывай абстрактных названий.
Структура narrative: 1) главный перелом, 2) цепочка конкретных последствий, 3) картина мира сегодня.
Пиши конкретно: с датами, последствиями и деталями жизни людей, без канцелярита и расплывчатых фраз.
`.trim();
  }

  return `
Исходное событие: ${event}
Текущий год: ${currentYear}
Контекст прошлых шагов (если пусто, это первый шаг):
${serializedContext}

Построй первый шаг альтернативной истории.
Сделай текст ярким и репостным: чтобы хотелось отправить другу в чат.
Главный заголовок карточки уже равен исходному вопросу, не придумывай абстрактных названий.
Структура narrative: 1) главный перелом, 2) цепочка конкретных последствий, 3) картина мира сегодня.
Пиши конкретно: с датами, последствиями и деталями жизни людей, без канцелярита и расплывчатых фраз.
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
Ты летописец катастроф и мрачных альтернативных миров. Пиши тревожно, тяжело, с ощущением надвигающейся катастрофы. Не скатывайся в сухую аналитику.
Отвечай только на русском языке. Английский не используй.
Нельзя писать markdown, пояснения, префиксы или блоки кода.
Верни только корректный JSON-объект с полями:
- "narrative": строка 220-380 слов. Формат: 3 абзаца, в каждом 2-4 предложения. Первые 1-2 предложения сразу дают самый сильный эффект.
- "timeline": массив из ровно 6 объектов:
  {"year": number, "title": string, "details": string}
  Годы должны идти по возрастанию и быть конкретными числами.
  Последняя точка timeline должна быть про текущий год ${currentYear}.
- "branches": массив из 2-3 коротких вариантов продолжения (действие/развилка).
- "image_prompts": массив из 1-2 подробных промптов для иллюстраций альтернативного мира (без текста на изображении).
- "share_card": объект для сторис:
  {"title": string, "subtitle": string, "items": [{"year": number, "text": string}], "footer": string}
Требования:
- "share_card.title" должен в точности повторять исходный вопрос пользователя, без перефразирования.
- "share_card.subtitle" — короткий тревожный хук, 1 фраза.
- Сначала назови главный перелом, потом покажи цепочку последствий, потом дай картину мира сегодня.
- В narrative обязательно вплетай 3-5 конкретных лет прямо в текст.
- Показывай, что конкретно рушится или меняется: власть, города, экономика, быт, страхи людей, международные союзы.
- Избегай канцелярита, воды и общих фраз вроде "все изменилось".
- Финал должен быть сильным и запоминающимся, чтобы текст хотелось переслать.
- "items" содержит 4-5 коротких строк как запасной формат и не повторяет narrative дословно.
`.trim(),
      };
    case "prosperity":
      return {
        role: "system",
        content: `
Ты футуролог и автор вдохновляющей альтернативной истории. Пиши масштабно и ярко: ощущение великого шанса, но без сладкой наивности.
Отвечай только на русском языке. Английский не используй.
Нельзя писать markdown, пояснения, префиксы или блоки кода.
Верни только корректный JSON-объект с полями:
- "narrative": строка 220-380 слов. Формат: 3 абзаца, в каждом 2-4 предложения. Первые 1-2 предложения сразу дают самый сильный эффект.
- "timeline": массив из ровно 6 объектов:
  {"year": number, "title": string, "details": string}
  Годы должны идти по возрастанию и быть конкретными числами.
  Последняя точка timeline должна быть про текущий год ${currentYear}.
- "branches": массив из 2-3 коротких вариантов продолжения (действие/развилка).
- "image_prompts": массив из 1-2 подробных промптов для иллюстраций альтернативного мира (без текста на изображении).
- "share_card": объект для сторис:
  {"title": string, "subtitle": string, "items": [{"year": number, "text": string}], "footer": string}
Требования:
- "share_card.title" должен в точности повторять исходный вопрос пользователя, без перефразирования.
- "share_card.subtitle" — короткий вдохновляющий хук, 1 фраза.
- Сначала назови главный перелом, потом покажи цепочку последствий, потом дай картину мира сегодня.
- В narrative обязательно вплетай 3-5 конкретных лет прямо в текст.
- Пиши конкретно, как меняются города, наука, образование, медицина, культура, уровень жизни и отношения между странами.
- Избегай канцелярита, воды и общих фраз вроде "это привело к изменениям".
- Финал должен звучать мощно и светло, чтобы текст хотелось переслать.
- "items" содержит 4-5 коротких строк как запасной формат и не повторяет narrative дословно.
`.trim(),
      };
    case "madness":
      return {
        role: "system",
        content: `
Ты автор безумной и очень образной альтернативной истории. Пиши странно, ярко и неожиданно, но сохраняй причинно-следственную связность.
Отвечай только на русском языке. Английский не используй.
Нельзя писать markdown, пояснения, префиксы или блоки кода.
Верни только корректный JSON-объект с полями:
- "narrative": строка 220-380 слов. Формат: 3 абзаца, в каждом 2-4 предложения. Первые 1-2 предложения сразу дают самый сильный эффект.
- "timeline": массив из ровно 6 объектов:
  {"year": number, "title": string, "details": string}
  Годы должны идти по возрастанию и быть конкретными числами.
  Последняя точка timeline должна быть про текущий год ${currentYear}.
- "branches": массив из 2-3 коротких вариантов продолжения (действие/развилка).
- "image_prompts": массив из 1-2 подробных промптов для иллюстраций альтернативного мира (без текста на изображении).
- "share_card": объект для сторис:
  {"title": string, "subtitle": string, "items": [{"year": number, "text": string}], "footer": string}
Требования:
- "share_card.title" должен в точности повторять исходный вопрос пользователя, без перефразирования.
- "share_card.subtitle" — короткий хук с эффектом удивления, 1 фраза.
- Сначала назови главный перелом, потом покажи цепочку последствий, потом дай картину мира сегодня.
- В narrative обязательно вплетай 3-5 конкретных лет прямо в текст.
- Даже в безумии показывай конкретику: как меняются политика, культура, технологии, города и повседневная жизнь.
- Избегай канцелярита, воды и общих фраз.
- Финал должен быть мощным, странным и запоминающимся, чтобы текст хотелось переслать.
- "items" содержит 4-5 коротких строк как запасной формат и не повторяет narrative дословно.
`.trim(),
      };
    case "humor":
      return {
        role: "system",
        content: `
Ты автор сатирического издания и точный комик. Пиши остро и смешно, но логично: не балаган, а цельная альтернативная история с колкими деталями.
Отвечай только на русском языке. Английский не используй.
Нельзя писать markdown, пояснения, префиксы или блоки кода.
Верни только корректный JSON-объект с полями:
- "narrative": строка 220-380 слов. Формат: 3 абзаца, в каждом 2-4 предложения. Первые 1-2 предложения сразу дают самый сильный эффект.
- "timeline": массив из ровно 6 объектов:
  {"year": number, "title": string, "details": string}
  Годы должны идти по возрастанию и быть конкретными числами.
  Последняя точка timeline должна быть про текущий год ${currentYear}.
- "branches": массив из 2-3 коротких вариантов продолжения (действие/развилка).
- "image_prompts": массив из 1-2 подробных промптов для иллюстраций альтернативного мира (без текста на изображении).
- "share_card": объект для сторис:
  {"title": string, "subtitle": string, "items": [{"year": number, "text": string}], "footer": string}
Требования:
- "share_card.title" должен в точности повторять исходный вопрос пользователя, без перефразирования.
- "share_card.subtitle" — короткий смешной хук, 1 фраза.
- Сначала назови главный перелом, потом покажи цепочку последствий, потом дай картину мира сегодня.
- В narrative обязательно вплетай 3-5 конкретных лет прямо в текст.
- Показывай конкретно, как меняются элиты, пропаганда, экономика, города, культура и бытовые привычки.
- Избегай канцелярита, воды и пустых обобщений.
- Финал должен быть колким и запоминающимся, чтобы текст хотелось переслать другу.
- "items" содержит 4-5 коротких строк как запасной формат и не повторяет narrative дословно.
`.trim(),
      };
    case "realism":
    default:
      return {
        role: "system",
        content: `
Ты сильный автор альтернативной истории и исторический аналитик. Пиши правдоподобно, напряженно и образно, как трейлер документального фильма, но без сухого академизма.
Отвечай только на русском языке. Английский не используй.
Нельзя писать markdown, пояснения, префиксы или блоки кода.
Верни только корректный JSON-объект с полями:
- "narrative": строка 220-380 слов. Формат: 3 абзаца, в каждом 2-4 предложения. Первые 1-2 предложения сразу дают самый сильный эффект.
- "timeline": массив из ровно 6 объектов:
  {"year": number, "title": string, "details": string}
  Годы должны идти по возрастанию и быть конкретными числами.
  Последняя точка timeline должна быть про текущий год ${currentYear}.
- "branches": массив из 2-3 коротких вариантов продолжения (действие/развилка).
- "image_prompts": массив из 1-2 подробных промптов для иллюстраций альтернативного мира (без текста на изображении).
- "share_card": объект для сторис:
  {"title": string, "subtitle": string, "items": [{"year": number, "text": string}], "footer": string}
Требования:
- "share_card.title" должен в точности повторять исходный вопрос пользователя, без перефразирования.
- "share_card.subtitle" — короткий сильный хук для репоста, 1 фраза.
- Сначала назови главный перелом, потом покажи цепочку последствий, потом дай картину мира сегодня.
- В narrative обязательно вплетай 3-5 конкретных лет прямо в текст.
- Пиши конкретно, что меняется в политике, экономике, международных отношениях, городах, технологиях и повседневной жизни людей.
- Избегай канцелярита, воды и расплывчатых фраз вроде "это привело к изменениям".
- Финал должен быть сильным и запоминающимся, чтобы текст хотелось переслать другу.
- "items" содержит 4-5 коротких строк как запасной формат и не повторяет narrative дословно.
`.trim(),
      };
  }
}

function parseScenarioResponse(modelText, currentYear, event) {
  const parsed = parseJsonFromModelText(modelText);
  const narrative = sanitizeNarrative(
    pickString(parsed?.narrative) || modelText.trim()
  );
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

function sanitizeNarrative(value) {
  const raw = stripCodeFences(String(value || ""));
  if (!raw) {
    return "Гипотеза построена, но текстовое описание оказалось неполным.";
  }

  const parsed = parseJsonFromModelText(raw);
  const parsedNarrative = pickString(parsed?.narrative);
  if (parsedNarrative) {
    return sanitizeNarrative(parsedNarrative);
  }

  const extractedNarrative = extractNarrativeField(raw);
  if (extractedNarrative) {
    return sanitizeNarrative(extractedNarrative);
  }

  if (looksLikeStructuredPayload(raw)) {
    return "Гипотеза построена, но модель вернула служебный JSON вместо чистого текста.";
  }

  return raw.replace(/\s+/g, " ").trim();
}

function stripCodeFences(text) {
  return String(text || "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function extractNarrativeField(text) {
  const normalized = String(text || "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");
  const match = normalized.match(
    /"narrative"\s*:\s*"([\s\S]*?)"\s*,\s*"timeline"\s*:/i
  );

  if (!match?.[1]) {
    return "";
  }

  return match[1]
    .replace(/\\"/g, '"')
    .replace(/\\n/g, " ")
    .replace(/\\r/g, " ")
    .replace(/\\\\/g, "\\")
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
  const forcedTitle = pickString(event) || fallback.title;

  if (!rawCard || typeof rawCard !== "object") {
    return {
      ...fallback,
      title: forcedTitle,
    };
  }

  const title = forcedTitle;
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
  const title = pickString(event) || "Что если?";
  const subtitle = buildCardSubtitle(narrative);
  const items = timeline.slice(0, 6).map((point) => ({
    year: point.year || currentYear,
    text: pickString(point.title) || pickString(point.details) || "Ключевой поворот истории.",
  }));

  const trimmed = items
    .map((item) => ({
      year: item.year,
      text: item.text.length > 70 ? `${item.text.slice(0, 67)}…` : item.text,
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

async function serveIndexHtml(url, res, method = "GET", siteUrl = "https://butterfly-history.ru") {
  try {
    const filePath = path.join(PUBLIC_DIR, "index.html");
    const rawHtml = await fsp.readFile(filePath, "utf-8");
    let scenarioParam = String(url.searchParams.get("scenario") || "").trim();
    if (!scenarioParam) {
      const shortId = normalizeShortId(url.searchParams.get("s"));
      if (shortId) {
        const store = await readShareLinks();
        scenarioParam = String(store[shortId]?.scenario || "").trim();
      }
    }
    const withBootstrap = injectScenarioBootstrap(rawHtml, scenarioParam);
    const injected = injectScenarioMeta(withBootstrap, scenarioParam, siteUrl);
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    if (method === "HEAD") {
      res.end();
      return;
    }
    res.end(injected);
  } catch (error) {
    if (error?.code === "ENOENT") {
      sendJson(res, 404, { error: "Not found" });
      return;
    }
    throw error;
  }
}

function injectScenarioBootstrap(html, scenarioParam) {
  const scenario = String(scenarioParam || "").trim();
  if (!scenario) {
    return html.replace(
      "<!-- SCENARIO_BOOTSTRAP -->",
      "<script>window.__SCENARIO_PAYLOAD__ = \"\";</script>"
    );
  }

  return html.replace(
    "<!-- SCENARIO_BOOTSTRAP -->",
    `<script>window.__SCENARIO_PAYLOAD__ = "${escapeJsString(scenario)}";</script>`
  );
}

function injectScenarioMeta(html, scenarioParam, siteUrl) {
  const meta = buildScenarioMeta(scenarioParam, siteUrl);
  if (!meta) return html;

  const scenarioUrl = `${siteUrl}/?scenario=${encodeURIComponent(scenarioParam)}`;
  const titleTag = `<title>${escapeHtmlAttr(meta.title)}</title>`;
  const socialBlock = [
    '<meta name="description" content="' + escapeHtmlAttr(meta.description) + '" />',
    '<meta property="og:title" content="' + escapeHtmlAttr(meta.title) + '" />',
    '<meta property="og:description" content="' + escapeHtmlAttr(meta.description) + '" />',
    '<meta property="og:type" content="website" />',
    '<meta property="og:url" content="' + escapeHtmlAttr(scenarioUrl) + '" />',
    '<meta property="og:locale" content="ru_RU" />',
    '<meta property="og:site_name" content="Эффект Бабочки" />',
    '<meta property="og:image" content="' + escapeHtmlAttr(meta.imageUrl) + '" />',
    '<meta property="og:image:type" content="image/png" />',
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    '<meta property="og:image:alt" content="' + escapeHtmlAttr(meta.title) + '" />',
    '<meta name="twitter:card" content="summary_large_image" />',
    '<meta name="twitter:title" content="' + escapeHtmlAttr(meta.title) + '" />',
    '<meta name="twitter:description" content="' + escapeHtmlAttr(meta.description) + '" />',
    '<meta name="twitter:image" content="' + escapeHtmlAttr(meta.imageUrl) + '" />',
  ].join("\n    ");

  return html
    .replace(/<title>[\s\S]*?<\/title>/i, titleTag)
    .replace(
      /<!--\s*SOCIAL_META_START\s*-->[\s\S]*?<!--\s*SOCIAL_META_END\s*-->/i,
      `<!-- SOCIAL_META_START -->\n    ${socialBlock}\n    <!-- SOCIAL_META_END -->`
    )
    .replace(
      /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:url" content="${escapeHtmlAttr(scenarioUrl)}" />`
    );
}

function buildScenarioMeta(scenarioParam, siteUrl) {
  const parsed = decodeScenarioPayload(scenarioParam);
  if (!parsed) return null;

  const title = oneLine(parsed.event || parsed.title || "Эффект Бабочки");
  const subtitle = oneLine(parsed.subtitle || "");
  const narrative = oneLine(parsed.narrative || "");
  const description = truncate(subtitle || firstSentence(narrative), 220)
    || "Альтернативная история с неожиданной развилкой и последствиями.";
  const imageUrl = `${siteUrl}/og/scenario.png?scenario=${encodeURIComponent(scenarioParam)}`;
  return { title, description, imageUrl, subtitle, narrative };
}

async function handleScenarioOgImage(req, res, url) {
  const scenarioParam = String(url.searchParams.get("scenario") || "").trim();
  const parsed = decodeScenarioPayload(scenarioParam);
  const title = oneLine(parsed?.event || parsed?.title || "Эффект Бабочки");
  const subtitle = oneLine(parsed?.subtitle || "Альтернативная история, которой хочется поделиться");
  const narrative = oneLine(parsed?.narrative || "");

  const svg = buildScenarioOgSvg({
    title: truncate(title, 120),
    subtitle: truncate(subtitle, 180),
    snippet: truncate(firstSentence(narrative) || narrative, 240),
  });

  res.writeHead(200, {
    "Content-Type": "image/svg+xml; charset=utf-8",
    "Cache-Control": "public, max-age=300",
  });
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  res.end(svg);
}

async function handleScenarioOgPng(req, res, url) {
  const scenarioParam = String(url.searchParams.get("scenario") || "").trim();
  const parsed = decodeScenarioPayload(scenarioParam);
  const title = oneLine(parsed?.event || parsed?.title || "Эффект Бабочки");
  const subtitle = oneLine(parsed?.subtitle || "Альтернативная история, которой хочется поделиться");
  const narrative = oneLine(parsed?.narrative || "");

  const svg = buildScenarioOgSvg({
    title: truncate(title, 120),
    subtitle: truncate(subtitle, 180),
    snippet: truncate(firstSentence(narrative) || narrative, 240),
  });

  try {
    const resvg = new Resvg(svg, {
      fitTo: {
        mode: "width",
        value: 1200,
      },
    });
    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();
    res.writeHead(200, {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=300",
      "Content-Length": String(pngBuffer.byteLength),
    });
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    res.end(pngBuffer);
  } catch {
    res.writeHead(302, {
      Location: `/og/scenario.svg?scenario=${encodeURIComponent(scenarioParam)}`,
      "Cache-Control": "no-store",
    });
    res.end();
  }
}

function buildScenarioOgSvg({ title, subtitle, snippet }) {
  const titleLines = wrapText(title, 46, 2);
  const subtitleLines = wrapText(subtitle, 56, 2);
  const snippetLines = wrapText(snippet, 68, 3);
  const titleY = 230;
  const subtitleY = 360;
  const snippetY = 500;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#071111" />
      <stop offset="55%" stop-color="#0f1f1f" />
      <stop offset="100%" stop-color="#151515" />
    </linearGradient>
    <radialGradient id="glow" cx="0.8" cy="0.2" r="0.8">
      <stop offset="0%" stop-color="rgba(124,225,217,0.38)" />
      <stop offset="100%" stop-color="rgba(124,225,217,0)" />
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)" />
  <rect width="1200" height="630" fill="url(#glow)" />
  <rect x="54" y="54" width="1092" height="522" rx="26" fill="rgba(8,8,8,0.44)" stroke="rgba(124,225,217,0.35)" />
  <text x="84" y="112" font-family="'IBM Plex Sans', 'Segoe UI', sans-serif" font-size="30" fill="#7ce1d9" letter-spacing="2">АЛЬТЕРНАТИВНАЯ ИСТОРИЯ</text>
  ${renderSvgLines(titleLines, 84, titleY, 70, 58, "#f6f9f9", 800)}
  ${renderSvgLines(subtitleLines, 84, subtitleY, 36, 42, "rgba(235,245,245,0.92)", 600)}
  ${renderSvgLines(snippetLines, 84, snippetY, 30, 36, "rgba(235,245,245,0.84)", 500)}
  <text x="84" y="570" font-family="'IBM Plex Sans', 'Segoe UI', sans-serif" font-size="26" fill="#7ce1d9">butterfly-history.ru</text>
</svg>`;
}

function renderSvgLines(lines, x, startY, fontSize, lineHeight, color, weight) {
  return lines
    .map(
      (line, index) =>
        `<text x="${x}" y="${startY + index * lineHeight}" font-family="'IBM Plex Sans', 'Segoe UI', sans-serif" font-size="${fontSize}" font-weight="${weight}" fill="${color}">${escapeXml(line)}</text>`
    )
    .join("\n  ");
}

async function readShareLinks() {
  try {
    const raw = await fsp.readFile(SHARE_LINKS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch (error) {
    if (error?.code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

async function writeShareLinks(store) {
  await fsp.mkdir(SHARE_LINKS_DIR, { recursive: true });
  const tempPath = `${SHARE_LINKS_FILE}.tmp`;
  await fsp.writeFile(tempPath, JSON.stringify(store), "utf-8");
  await fsp.rename(tempPath, SHARE_LINKS_FILE);
}

function findExistingShareId(store, scenario) {
  for (const [id, entry] of Object.entries(store || {})) {
    if (entry?.scenario === scenario) {
      return id;
    }
  }
  return "";
}

function generateShortShareId(store) {
  let id = "";
  do {
    id = crypto.randomBytes(5).toString("base64url");
  } while (store[id]);
  return id;
}

function normalizeShortId(value) {
  const id = String(value || "").trim();
  if (!id) return "";
  if (!/^[A-Za-z0-9_-]{4,32}$/.test(id)) return "";
  return id;
}

function decodeScenarioPayload(encoded) {
  const value = String(encoded || "").trim();
  if (!value || value.length > 8000) return null;

  const safe = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (safe.length % 4)) % 4);

  try {
    const json = Buffer.from(safe + padding, "base64").toString("utf-8");
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function oneLine(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function firstSentence(value) {
  const text = oneLine(value);
  if (!text) return "";
  const sentence = text.match(/[^.!?]+[.!?]/)?.[0];
  return sentence ? sentence.trim() : text;
}

function truncate(value, maxLength) {
  const text = oneLine(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

function wrapText(value, maxChars, maxLines) {
  const text = oneLine(value);
  if (!text) return [];
  const words = text.split(" ");
  const lines = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
      continue;
    }
    if (current) {
      lines.push(current);
    } else {
      lines.push(word.slice(0, maxChars));
    }
    current = word;
    if (lines.length >= maxLines - 1) break;
  }

  if (lines.length < maxLines && current) {
    lines.push(current);
  }

  if (lines.length > maxLines) {
    return lines.slice(0, maxLines);
  }

  if (lines.length === maxLines && words.length > 0) {
    const joined = lines.join(" ");
    if (joined.length < text.length) {
      lines[maxLines - 1] = truncate(lines[maxLines - 1], Math.max(6, maxChars - 1));
      if (!lines[maxLines - 1].endsWith("…")) {
        lines[maxLines - 1] = `${lines[maxLines - 1]}…`;
      }
    }
  }

  return lines;
}

function escapeHtmlAttr(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeJsString(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
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
    case ".xml":
      return "application/xml; charset=utf-8";
    case ".txt":
      return "text/plain; charset=utf-8";
    case ".webmanifest":
      return "application/manifest+json; charset=utf-8";
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

function getSiteUrl(req) {
  if (SITE_URL) return SITE_URL;
  const forwardedProto = req.headers["x-forwarded-proto"];
  const proto = typeof forwardedProto === "string" && forwardedProto.trim()
    ? forwardedProto.split(",")[0].trim()
    : "http";
  const host = req.headers.host || "localhost";
  return `${proto}://${host}`;
}

async function collectSitemapUrls(siteUrl) {
  const entries = await fsp.readdir(PUBLIC_DIR, { withFileTypes: true });
  const htmlFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".html"))
    .map((entry) => entry.name);

  const urls = [];
  for (const fileName of htmlFiles) {
    const isIndex = fileName.toLowerCase() === "index.html";
    const routePath = isIndex ? "/" : `/${fileName.replace(/\.html$/i, "")}`;
    const filePath = path.join(PUBLIC_DIR, fileName);
    let lastmod = null;
    try {
      const stats = await fsp.stat(filePath);
      lastmod = stats.mtime.toISOString().slice(0, 10);
    } catch {
      lastmod = null;
    }
    urls.push({ loc: `${siteUrl}${routePath}`, lastmod });
  }

  if (urls.length === 0) {
    urls.push({ loc: siteUrl, lastmod: null });
  }

  return urls;
}

function buildSitemapXml(urls) {
  const body = urls
    .map((entry) => {
      const lastmod = entry.lastmod
        ? `\n    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`
        : "";
      return `  <url>\n    <loc>${escapeXml(entry.loc)}</loc>${lastmod}\n  </url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${body}\n</urlset>\n`;
}

async function handleSitemap(req, res) {
  const siteUrl = getSiteUrl(req);
  const urls = await collectSitemapUrls(siteUrl);
  const xml = buildSitemapXml(urls);
  res.writeHead(200, { "Content-Type": "application/xml; charset=utf-8" });
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  res.end(xml);
}

function handleRobots(req, res) {
  const siteUrl = getSiteUrl(req);
  const content = `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`;
  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  res.end(content);
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
