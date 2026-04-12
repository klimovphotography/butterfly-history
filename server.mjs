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
    enableImages: false,
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
const DEFAULT_FAILOVER_ORDER = [
  "gemini-2.5-flash",
  "groq-llama-3.1-70b",
  "openrouter-gemma-2-9b",
  "mistral-small",
  "huggingface-llama3-8b",
  "aiproductiv-gpt-5.2",
  "wormsoft-gpt-5.2",
];
const INVALID_ASSISTANT_RESPONSES = new Set([
  "no assistant response",
  "empty assistant response",
]);

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
const REPO_DATA_DIR = path.join(__dirname, "data");
const RUNTIME_DATA_DIR = resolveRuntimeDataDir();
const LEGACY_SHARE_LINKS_FILE = path.join(REPO_DATA_DIR, "share-links.json");
const SHARE_LINKS_FILE = path.join(RUNTIME_DATA_DIR, "share-links.json");
const PUBLIC_SCENARIOS_FILE = path.join(REPO_DATA_DIR, "public-scenarios.json");

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
      if (url.pathname === "/scenarios/") {
        redirect(res, 301, "/scenarios");
        return;
      }
      if (url.pathname === "/scenarios") {
        await serveArchiveHtml(url, res, req.method, getSiteUrl(req));
        return;
      }
      if (url.pathname.startsWith("/scenario/") && url.pathname !== "/scenario/") {
        const normalizedPath = url.pathname.replace(/\/+$/, "");
        if (normalizedPath !== url.pathname) {
          const location = `${normalizedPath}${url.search}`;
          redirect(res, 301, location);
          return;
        }
        await servePublicScenarioHtml(url, res, req.method, getSiteUrl(req));
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
  const language = normalizeLanguage(body.language || body.lang);
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
  const systemMessage = buildSystemMessage(modeConfig.id, currentYear, language);
  const userPrompt = buildUserPrompt({ event, branch, context, currentYear, language });

  try {
    const { scenario, usedModel } = await generateScenario({
      requestedModelId,
      systemMessage,
      userPrompt,
      currentYear,
      event,
      language,
      temperature: modeConfig.temperature,
    });

    scenario.images = [];

    sendJson(res, 200, {
      scenario: {
        ...scenario,
        event,
        mode: modeConfig.id,
        provider: usedModel?.providerLabel || "",
        modelLabel: usedModel?.label || "",
        modelId: usedModel?.id || "",
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
  language,
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
      if (isInvalidAssistantResponse(modelText)) {
        throw new Error("Провайдер вернул служебную заглушку вместо ответа.");
      }

      return {
        scenario: parseScenarioResponse(modelText, currentYear, event, language),
        usedModel: attempt,
      };
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

function normalizeLanguage(value) {
  return String(value || "").toLowerCase() === "en" ? "en" : "ru";
}

function byLanguage(language, ruText, enText) {
  return normalizeLanguage(language) === "en" ? enText : ruText;
}

function buildOutputLanguageInstruction(language) {
  return byLanguage(
    language,
    "Отвечай только на русском языке. Английский не используй.",
    "Respond in English only. Do not use Russian. All text fields in JSON must be in English."
  );
}

function buildUserPrompt({ event, branch, context, currentYear, language }) {
  const lang = normalizeLanguage(language);
  const serializedContext =
    context.length > 0
      ? JSON.stringify(context, null, 2)
      : "[]";

  if (lang === "en") {
    if (branch) {
      return `
Initial event: ${event}
Selected branch: ${branch}
Current year: ${currentYear}
Short context from previous steps:
${serializedContext}

Continue exactly this alternate branch.
Make the text vivid and shareable, like something you'd send to a friend.
The main card title is already equal to the original question, so do not invent abstract titles.
Narrative structure: 1) core turning point, 2) chain of concrete consequences, 3) picture of the world today.
Write concretely: dates, consequences, and everyday details, without vague filler.
`.trim();
    }

    return `
Initial event: ${event}
Current year: ${currentYear}
Context from previous steps (if empty, this is the first step):
${serializedContext}

Build the first step of alternate history.
Make the text vivid and shareable, like something you'd send to a friend.
The main card title is already equal to the original question, so do not invent abstract titles.
Narrative structure: 1) core turning point, 2) chain of concrete consequences, 3) picture of the world today.
Write concretely: dates, consequences, and everyday details, without vague filler.
`.trim();
  }

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

function buildSystemMessage(modeId, currentYear, language) {
  const languageInstruction = buildOutputLanguageInstruction(language);
  switch (modeId) {
    case "dark":
      return {
        role: "system",
        content: `
Ты летописец катастроф и мрачных альтернативных миров. Пиши тревожно, тяжело, с ощущением надвигающейся катастрофы. Не скатывайся в сухую аналитику.
${languageInstruction}
Нельзя писать markdown, пояснения, префиксы или блоки кода.
Верни только корректный JSON-объект с полями:
- "narrative": строка 220-380 слов. Формат: 3 абзаца, в каждом 2-4 предложения. Первые 1-2 предложения сразу дают самый сильный эффект.
- "timeline": массив из ровно 6 объектов:
  {"year": number, "title": string, "details": string}
  Годы должны идти по возрастанию и быть конкретными числами.
  Последняя точка timeline должна быть про текущий год ${currentYear}.
- "branches": массив из 2-3 коротких вариантов продолжения (действие/развилка).
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
${languageInstruction}
Нельзя писать markdown, пояснения, префиксы или блоки кода.
Верни только корректный JSON-объект с полями:
- "narrative": строка 220-380 слов. Формат: 3 абзаца, в каждом 2-4 предложения. Первые 1-2 предложения сразу дают самый сильный эффект.
- "timeline": массив из ровно 6 объектов:
  {"year": number, "title": string, "details": string}
  Годы должны идти по возрастанию и быть конкретными числами.
  Последняя точка timeline должна быть про текущий год ${currentYear}.
- "branches": массив из 2-3 коротких вариантов продолжения (действие/развилка).
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
${languageInstruction}
Нельзя писать markdown, пояснения, префиксы или блоки кода.
Верни только корректный JSON-объект с полями:
- "narrative": строка 220-380 слов. Формат: 3 абзаца, в каждом 2-4 предложения. Первые 1-2 предложения сразу дают самый сильный эффект.
- "timeline": массив из ровно 6 объектов:
  {"year": number, "title": string, "details": string}
  Годы должны идти по возрастанию и быть конкретными числами.
  Последняя точка timeline должна быть про текущий год ${currentYear}.
- "branches": массив из 2-3 коротких вариантов продолжения (действие/развилка).
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
${languageInstruction}
Нельзя писать markdown, пояснения, префиксы или блоки кода.
Верни только корректный JSON-объект с полями:
- "narrative": строка 220-380 слов. Формат: 3 абзаца, в каждом 2-4 предложения. Первые 1-2 предложения сразу дают самый сильный эффект.
- "timeline": массив из ровно 6 объектов:
  {"year": number, "title": string, "details": string}
  Годы должны идти по возрастанию и быть конкретными числами.
  Последняя точка timeline должна быть про текущий год ${currentYear}.
- "branches": массив из 2-3 коротких вариантов продолжения (действие/развилка).
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
${languageInstruction}
Нельзя писать markdown, пояснения, префиксы или блоки кода.
Верни только корректный JSON-объект с полями:
- "narrative": строка 220-380 слов. Формат: 3 абзаца, в каждом 2-4 предложения. Первые 1-2 предложения сразу дают самый сильный эффект.
- "timeline": массив из ровно 6 объектов:
  {"year": number, "title": string, "details": string}
  Годы должны идти по возрастанию и быть конкретными числами.
  Последняя точка timeline должна быть про текущий год ${currentYear}.
- "branches": массив из 2-3 коротких вариантов продолжения (действие/развилка).
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

function parseScenarioResponse(modelText, currentYear, event, language) {
  const parsed = parseJsonFromModelText(modelText);
  const narrative = sanitizeNarrative(
    pickString(parsed?.narrative) || modelText.trim(),
    language
  );
  const timeline = normalizeTimeline(parsed?.timeline, currentYear, narrative, language);
  const branches = normalizeBranches(parsed?.branches, language);
  const shareCard = normalizeShareCard(parsed?.share_card, {
    narrative,
    timeline,
    currentYear,
    event,
    language,
  });

  return {
    narrative,
    timeline,
    branches,
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

function sanitizeNarrative(value, language) {
  const raw = stripCodeFences(String(value || ""));
  if (!raw) {
    return byLanguage(
      language,
      "Гипотеза построена, но текстовое описание оказалось неполным.",
      "The hypothesis was generated, but the text description was incomplete."
    );
  }

  const parsed = parseJsonFromModelText(raw);
  const parsedNarrative = pickString(parsed?.narrative);
  if (parsedNarrative) {
    return sanitizeNarrative(parsedNarrative, language);
  }

  const extractedNarrative = extractNarrativeField(raw);
  if (extractedNarrative) {
    return sanitizeNarrative(extractedNarrative, language);
  }

  if (looksLikeStructuredPayload(raw)) {
    return byLanguage(
      language,
      "Гипотеза построена, но модель вернула служебный JSON вместо чистого текста.",
      "The hypothesis was generated, but the model returned service JSON instead of clean text."
    );
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

function normalizeTimeline(rawTimeline, currentYear, narrative, language) {
  const defaults = buildDefaultTimeline(currentYear, narrative, language);

  if (!Array.isArray(rawTimeline)) {
    return defaults;
  }

  const cleaned = rawTimeline
    .slice(0, 8)
    .map((item, index) => ({
      year: normalizeYear(item?.year) ?? defaults[Math.min(index, defaults.length - 1)].year,
      title:
        pickString(item?.title) ||
        `${byLanguage(language, "Этап", "Phase")} ${index + 1}`,
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

function buildDefaultTimeline(currentYear, narrative, language) {
  const snippet = pickString(narrative) || byLanguage(
    language,
    "Последствия разворачиваются постепенно.",
    "Consequences unfold step by step."
  );
  return [
    {
      year: currentYear - 120,
      title: byLanguage(language, "Ранний перелом", "Early Breakpoint"),
      details: snippet.slice(0, 180),
    },
    {
      year: currentYear - 80,
      title: byLanguage(language, "Закрепление тренда", "Trend Consolidation"),
      details: byLanguage(
        language,
        "Новые политические и экономические правила начинают стабилизироваться.",
        "New political and economic rules begin to stabilize."
      ),
    },
    {
      year: currentYear - 50,
      title: byLanguage(language, "Институциональный сдвиг", "Institutional Shift"),
      details: byLanguage(
        language,
        "Изменения входят в рутину управления и становятся нормой.",
        "Changes become part of governance routines and turn into the norm."
      ),
    },
    {
      year: currentYear - 35,
      title: byLanguage(language, "Глобальный эффект", "Global Impact"),
      details: byLanguage(
        language,
        "Изменения переходят на мировой уровень и влияют на союзы и технологии.",
        "Shifts scale globally and reshape alliances and technology."
      ),
    },
    {
      year: currentYear - 15,
      title: byLanguage(language, "Эхо перемен", "Echo Of Change"),
      details: byLanguage(
        language,
        "Новые поколения живут в иной политической и культурной реальности.",
        "New generations live in a different political and cultural reality."
      ),
    },
    {
      year: currentYear,
      title: byLanguage(language, "Состояние сегодня", "Present-Day State"),
      details: byLanguage(
        language,
        "Мир приходит к альтернативной современной конфигурации.",
        "The world arrives at an alternate modern configuration."
      ),
    },
  ];
}

function normalizeBranches(rawBranches, language) {
  const defaults = [
    byLanguage(
      language,
      "Сделать ставку на технологический рывок и его последствия",
      "Double down on a technological leap and its consequences"
    ),
    byLanguage(
      language,
      "Усилить международные союзы и проверить, как меняется баланс сил",
      "Strengthen international alliances and test how the balance of power changes"
    ),
    byLanguage(
      language,
      "Сфокусироваться на внутренних реформах и реакции общества",
      "Focus on internal reforms and social response"
    ),
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

function normalizeShareCard(rawCard, { narrative, timeline, currentYear, event, language }) {
  const fallback = buildFallbackShareCard({ narrative, timeline, currentYear, event, language });
  const forcedTitle = pickString(event) || fallback.title;

  if (!rawCard || typeof rawCard !== "object") {
    return {
      ...fallback,
      title: forcedTitle,
    };
  }

  const title = forcedTitle;
  const subtitle = pickString(rawCard.subtitle) || fallback.subtitle;
  const footer = byLanguage(
    language,
    "butterfly-history.ru\nсмоделировать свою ветку реальности",
    "butterfly-history.ru\nmodel your own alternate timeline"
  );
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

function buildFallbackShareCard({ narrative, timeline, currentYear, event, language }) {
  const title = pickString(event) || byLanguage(language, "Что если?", "What if?");
  const subtitle = buildCardSubtitle(narrative, language);
  const items = timeline.slice(0, 6).map((point) => ({
    year: point.year || currentYear,
    text:
      pickString(point.title) ||
      pickString(point.details) ||
      byLanguage(language, "Ключевой поворот истории.", "Key turning point in history."),
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
      text: byLanguage(
        language,
        "Финальный эффект захватывает современность.",
        "The final effect reaches the present day."
      ),
    });
  }

  return {
    title,
    subtitle,
    items: trimmed,
    footer: byLanguage(
      language,
      "butterfly-history.ru\nсмоделировать свою ветку реальности",
      "butterfly-history.ru\nmodel your own alternate timeline"
    ),
  };
}

function buildCardSubtitle(narrative, language) {
  const text = pickString(narrative).replace(/\s+/g, " ").trim();
  if (!text) {
    return byLanguage(
      language,
      "Хроника альтернативного перелома — коротко и дерзко.",
      "A sharp snapshot of an alternate turning point."
    );
  }
  const sentence = text.split(/[.!?]/).find((part) => part.trim());
  if (!sentence) {
    return byLanguage(
      language,
      "Хроника альтернативного перелома — коротко и дерзко.",
      "A sharp snapshot of an alternate turning point."
    );
  }
  const trimmed = sentence.trim();
  return trimmed.length > 110 ? `${trimmed.slice(0, 107)}…` : trimmed;
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

function isInvalidAssistantResponse(value) {
  const normalized = String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  if (!normalized) {
    return true;
  }

  return INVALID_ASSISTANT_RESPONSES.has(normalized);
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
    const library = await loadPublicScenarioLibrary();
    const resolved = await resolveIncomingScenario(url, library);

    if (resolved.redirectTo) {
      redirect(res, 302, resolved.redirectTo);
      return;
    }

    const pageMeta = resolved.scenarioParam
      ? buildPrivateScenarioPageMeta({
        scenarioParam: resolved.scenarioParam,
        shareId: resolved.shareId,
        siteUrl,
      })
      : buildHomePageMeta(siteUrl, library);

    const html = await renderShellHtml({
      primaryHtml: renderHomeLead(),
      secondaryHtml: renderArchivePreviewSection(library),
      scenarioParam: resolved.scenarioParam,
      pageContext: {
        kind: resolved.scenarioParam ? "shared" : "home",
        allowClientTitle: !resolved.scenarioParam,
        disableScenarioHydration: false,
      },
      meta: pageMeta,
    });

    sendHtml(res, 200, html, method);
  } catch (error) {
    if (error?.code === "ENOENT") {
      sendJson(res, 404, { error: "Not found" });
      return;
    }
    throw error;
  }
}

async function serveArchiveHtml(url, res, method = "GET", siteUrl = "https://butterfly-history.ru") {
  try {
    const library = await loadPublicScenarioLibrary();
    const filters = readArchiveFilters(url);
    const filteredScenarios = filterPublicScenarios(library.scenarios, filters);
    const html = await renderShellHtml({
      primaryHtml: renderArchivePage(library, filteredScenarios, filters),
      secondaryHtml: "",
      scenarioParam: "",
      pageContext: {
        kind: "archive",
        allowClientTitle: false,
        disableScenarioHydration: true,
      },
      meta: buildArchivePageMeta(siteUrl, library, filteredScenarios, filters),
    });

    sendHtml(res, 200, html, method);
  } catch (error) {
    if (error?.code === "ENOENT") {
      sendJson(res, 404, { error: "Not found" });
      return;
    }
    throw error;
  }
}

async function servePublicScenarioHtml(url, res, method = "GET", siteUrl = "https://butterfly-history.ru") {
  try {
    const library = await loadPublicScenarioLibrary();
    const slug = decodeURIComponent(url.pathname.slice("/scenario/".length)).trim();
    const scenario = library.bySlug.get(slug);

    if (!scenario) {
      await serveNotFoundHtml(res, method, siteUrl, library);
      return;
    }

    const html = await renderShellHtml({
      primaryHtml: renderPublicScenarioPage(scenario, library),
      secondaryHtml: "",
      scenarioParam: scenario.encodedScenario,
      pageContext: {
        kind: "public-scenario",
        allowClientTitle: false,
        disableScenarioHydration: true,
        scenarioSlug: scenario.slug,
      },
      meta: buildPublicScenarioPageMeta(scenario, siteUrl),
    });

    sendHtml(res, 200, html, method);
  } catch (error) {
    if (error?.code === "ENOENT") {
      sendJson(res, 404, { error: "Not found" });
      return;
    }
    throw error;
  }
}

async function serveNotFoundHtml(res, method = "GET", siteUrl = "https://butterfly-history.ru", library = null) {
  const contentLibrary = library || await loadPublicScenarioLibrary();
  const html = await renderShellHtml({
    primaryHtml: renderNotFoundSection(),
    secondaryHtml: renderArchivePreviewSection(contentLibrary, {
      title: "Лучшие сценарии из архива",
      subtitle: "Пока эта страница не найдена, можно открыть уже опубликованные развилки.",
    }),
    scenarioParam: "",
    pageContext: {
      kind: "not-found",
      allowClientTitle: false,
      disableScenarioHydration: true,
    },
    meta: buildNotFoundPageMeta(siteUrl),
  });

  sendHtml(res, 404, html, method);
}

async function renderShellHtml({
  primaryHtml = "",
  secondaryHtml = "",
  scenarioParam = "",
  pageContext = {},
  meta,
}) {
  const filePath = path.join(PUBLIC_DIR, "index.html");
  const rawHtml = await fsp.readFile(filePath, "utf-8");
  const withContent = injectPageContent(rawHtml, { primaryHtml, secondaryHtml });
  const withBootstrap = injectPageBootstrap(withContent, { scenarioParam, pageContext });
  return injectPageMeta(withBootstrap, meta);
}

function injectPageContent(html, { primaryHtml = "", secondaryHtml = "" }) {
  return html
    .replace("<!-- PAGE_PRIMARY -->", primaryHtml)
    .replace("<!-- PAGE_SECONDARY -->", secondaryHtml);
}

function injectPageBootstrap(html, { scenarioParam = "", pageContext = {} }) {
  const scenario = String(scenarioParam || "").trim();
  const scenarioScript = `<script>window.__SCENARIO_PAYLOAD__ = "${escapeJsString(scenario)}";</script>`;
  const contextScript = `<script>window.__PAGE_CONTEXT__ = ${serializeInlineJson(pageContext)};</script>`;
  return html.replace(
    "<!-- SCENARIO_BOOTSTRAP -->",
    `${scenarioScript}\n    ${contextScript}`
  );
}

function injectPageMeta(html, meta) {
  const resolved = normalizePageMeta(meta);
  const socialBlock = [
    '<meta name="description" content="' + escapeHtmlAttr(resolved.description) + '" />',
    '<meta property="og:title" content="' + escapeHtmlAttr(resolved.title) + '" />',
    '<meta property="og:description" content="' + escapeHtmlAttr(resolved.description) + '" />',
    '<meta property="og:type" content="' + escapeHtmlAttr(resolved.ogType) + '" />',
    '<meta property="og:url" content="' + escapeHtmlAttr(resolved.ogUrl) + '" />',
    '<meta property="og:locale" content="' + escapeHtmlAttr(resolved.locale) + '" />',
    '<meta property="og:site_name" content="' + escapeHtmlAttr(resolved.siteName) + '" />',
    '<meta property="og:image" content="' + escapeHtmlAttr(resolved.imageUrl) + '" />',
    '<meta property="og:image:type" content="image/png" />',
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    '<meta property="og:image:alt" content="' + escapeHtmlAttr(resolved.imageAlt || resolved.title) + '" />',
    '<meta name="twitter:card" content="summary_large_image" />',
    '<meta name="twitter:title" content="' + escapeHtmlAttr(resolved.title) + '" />',
    '<meta name="twitter:description" content="' + escapeHtmlAttr(resolved.description) + '" />',
    '<meta name="twitter:image" content="' + escapeHtmlAttr(resolved.imageUrl) + '" />',
  ].join("\n    ");

  const structuredDataBlock = `<script type="application/ld+json">\n${serializeInlineJson(resolved.structuredData)}\n    </script>`;

  return html
    .replace(/<html\s+lang="[^"]*"/i, `<html lang="${escapeHtmlAttr(resolved.htmlLang)}"`)
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtmlAttr(resolved.title)}</title>`)
    .replace(/\s*<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/i, "")
    .replace(
      /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
      `<link rel="canonical" href="${escapeHtmlAttr(resolved.canonicalUrl)}" />\n    <meta name="robots" content="${escapeHtmlAttr(resolved.robots)}" />`
    )
    .replace(
      /<!--\s*SOCIAL_META_START\s*-->[\s\S]*?<!--\s*SOCIAL_META_END\s*-->/i,
      `<!-- SOCIAL_META_START -->\n    ${socialBlock}\n    <!-- SOCIAL_META_END -->`
    )
    .replace(/<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/i, structuredDataBlock);
}

function normalizePageMeta(meta) {
  const fallbackTitle = "Эффект Бабочки";
  const fallbackDescription =
    "Генератор и архив альтернативной истории с публичными сценариями и внутренней навигацией.";
  const siteName = "Эффект Бабочки";
  const siteUrl = "https://butterfly-history.ru";
  const title = oneLine(meta?.title || fallbackTitle);
  const description = oneLine(meta?.description || fallbackDescription);
  const canonicalUrl = String(meta?.canonicalUrl || siteUrl).trim() || siteUrl;
  const ogUrl = String(meta?.ogUrl || canonicalUrl).trim() || canonicalUrl;
  const imageUrl = String(meta?.imageUrl || `${siteUrl}/logo.png`).trim() || `${siteUrl}/logo.png`;
  const locale = String(meta?.locale || "ru_RU").trim() || "ru_RU";
  const htmlLang = String(meta?.htmlLang || (locale === "en_US" ? "en" : "ru")).trim() || "ru";
  const robots = String(meta?.robots || "index,follow").trim() || "index,follow";
  const ogType = String(meta?.ogType || "website").trim() || "website";
  const structuredData = meta?.structuredData || buildWebsiteStructuredData(siteUrl, {
    title,
    description,
  });

  return {
    title,
    description,
    canonicalUrl,
    ogUrl,
    imageUrl,
    locale,
    htmlLang,
    robots,
    ogType,
    siteName,
    imageAlt: meta?.imageAlt || title,
    structuredData,
  };
}

function buildScenarioMeta(scenarioParam, siteUrl) {
  const parsed = decodeScenarioPayload(scenarioParam);
  if (!parsed) return null;

  const lang = normalizeLanguage(parsed.lang || parsed.language);
  const title = oneLine(parsed.event || parsed.title || byLanguage(lang, "Эффект Бабочки", "Butterfly Effect"));
  const subtitle = oneLine(parsed.subtitle || "");
  const narrative = oneLine(parsed.narrative || "");
  const description = truncate(subtitle || firstSentence(narrative), 220)
    || byLanguage(
      lang,
      "Альтернативная история с неожиданной развилкой и последствиями.",
      "Alternate history with an unexpected branch and consequences."
    );
  const imageUrl = `${siteUrl}/og/scenario.png?scenario=${encodeURIComponent(scenarioParam)}`;
  return {
    title,
    description,
    imageUrl,
    subtitle,
    narrative,
    lang,
    locale: lang === "en" ? "en_US" : "ru_RU",
    siteName: byLanguage(lang, "Эффект Бабочки", "Butterfly Effect"),
  };
}

async function readPublicScenarioManifest() {
  try {
    const raw = await fsp.readFile(PUBLIC_SCENARIOS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error?.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function loadPublicScenarioLibrary() {
  const [manifest, shareStore] = await Promise.all([
    readPublicScenarioManifest(),
    readShareLinks(),
  ]);

  const scenarios = manifest
    .map((entry) => normalizePublicScenarioRecord(entry, shareStore[entry?.shareId]))
    .filter(Boolean)
    .filter((entry) => entry.status === "public")
    .sort(compareByPublishedDesc);

  const bySlug = new Map();
  const byShareId = new Map();
  const byEncodedScenario = new Map();

  for (const scenario of scenarios) {
    bySlug.set(scenario.slug, scenario);
    byShareId.set(scenario.shareId, scenario);
    byEncodedScenario.set(scenario.encodedScenario, scenario);
  }

  return {
    scenarios,
    bySlug,
    byShareId,
    byEncodedScenario,
    featured: scenarios.filter((entry) => entry.featured).sort(compareByPopularityDesc),
    recent: [...scenarios].sort(compareByPublishedDesc),
    popular: [...scenarios].sort(compareByPopularityDesc),
    facets: buildScenarioFacets(scenarios),
    totalCount: scenarios.length,
  };
}

function normalizePublicScenarioRecord(entry, storeEntry) {
  if (!entry || typeof entry !== "object" || !storeEntry?.scenario) {
    return null;
  }

  const encodedScenario = String(storeEntry.scenario || "").trim();
  const parsed = decodeScenarioPayload(encodedScenario);
  if (!parsed) {
    return null;
  }

  const lang = normalizeLanguage(entry.lang || parsed.lang || parsed.language);
  const title = oneLine(entry.title || parsed.event || parsed.title || "");
  const subtitle = oneLine(entry.subtitle || parsed.subtitle || "");
  const narrative = oneLine(parsed.narrative || "");
  const summary = truncate(
    entry.summary || subtitle || firstSentence(narrative),
    220
  );
  const description = truncate(
    entry.description || summary || firstSentence(narrative),
    180
  );
  const publishedAt = normalizeIsoDate(entry.publishedAt || storeEntry.createdAt);
  const createdAt = normalizeIsoDate(storeEntry.createdAt);
  const countries = normalizeTagList(entry.countries);
  const themes = normalizeTagList(entry.themes);
  const tone = oneLine(entry.tone || getModeLabelForLang(parsed.mode, lang));
  const era = oneLine(entry.era || "");
  const wordCount = countWords(narrative);

  return {
    slug: String(entry.slug || "").trim(),
    shareId: String(entry.shareId || "").trim(),
    status: String(entry.status || "draft").trim(),
    featured: Boolean(entry.featured),
    popularity: Number(entry.popularity || 0),
    publishedAt,
    createdAt,
    updatedAt: publishedAt || createdAt,
    lang,
    title,
    subtitle,
    summary,
    description,
    narrative,
    paragraphs: splitNarrativeIntoParagraphs(narrative),
    countries,
    era,
    themes,
    tone,
    mode: String(parsed.mode || "realism").trim() || "realism",
    relatedSlugs: normalizeTagList(entry.relatedSlugs),
    encodedScenario,
    imageUrl: "",
    url: `/scenario/${encodeURIComponent(String(entry.slug || "").trim())}`,
    wordCount,
    readingMinutes: Math.max(1, Math.round(wordCount / 170) || 1),
  };
}

async function resolveIncomingScenario(url, library) {
  const directScenario = String(url.searchParams.get("scenario") || "").trim();
  const shareId = normalizeShortId(url.searchParams.get("s"));

  if (shareId) {
    const publicScenario = library.byShareId.get(shareId);
    if (publicScenario) {
      return { redirectTo: publicScenario.url, scenarioParam: "", shareId };
    }

    const shareStore = await readShareLinks();
    const scenarioParam = String(shareStore[shareId]?.scenario || "").trim();
    const parsed = decodeScenarioPayload(scenarioParam);
    return {
      redirectTo: "",
      shareId,
      scenarioParam: parsed ? scenarioParam : "",
    };
  }

  if (directScenario) {
    const publicScenario = library.byEncodedScenario.get(directScenario);
    if (publicScenario) {
      return { redirectTo: publicScenario.url, scenarioParam: "", shareId: "" };
    }
  }

  return {
    redirectTo: "",
    shareId: "",
    scenarioParam: decodeScenarioPayload(directScenario) ? directScenario : "",
  };
}

function readArchiveFilters(url) {
  return {
    country: oneLine(url.searchParams.get("country") || ""),
    era: oneLine(url.searchParams.get("era") || ""),
    theme: oneLine(url.searchParams.get("theme") || ""),
    tone: oneLine(url.searchParams.get("tone") || ""),
    lang: normalizeOptionalLanguage(url.searchParams.get("lang") || ""),
    hasFilters:
      Boolean(oneLine(url.searchParams.get("country") || "")) ||
      Boolean(oneLine(url.searchParams.get("era") || "")) ||
      Boolean(oneLine(url.searchParams.get("theme") || "")) ||
      Boolean(oneLine(url.searchParams.get("tone") || "")) ||
      Boolean(oneLine(url.searchParams.get("lang") || "")),
  };
}

function filterPublicScenarios(scenarios, filters) {
  return scenarios.filter((scenario) => {
    if (filters.country && !scenario.countries.includes(filters.country)) {
      return false;
    }
    if (filters.era && scenario.era !== filters.era) {
      return false;
    }
    if (filters.theme && !scenario.themes.includes(filters.theme)) {
      return false;
    }
    if (filters.tone && scenario.tone !== filters.tone) {
      return false;
    }
    if (filters.lang && scenario.lang !== filters.lang) {
      return false;
    }
    return true;
  });
}

function buildScenarioFacets(scenarios) {
  return {
    countries: buildFacetList(scenarios.flatMap((entry) => entry.countries)),
    eras: buildFacetList(scenarios.map((entry) => entry.era).filter(Boolean)),
    themes: buildFacetList(scenarios.flatMap((entry) => entry.themes)),
    tones: buildFacetList(scenarios.map((entry) => entry.tone).filter(Boolean)),
    languages: buildFacetList(
      scenarios.map((entry) => (entry.lang === "en" ? "English" : "Русский"))
    ),
  };
}

function buildFacetList(values) {
  const counter = new Map();
  for (const value of values) {
    const key = oneLine(value);
    if (!key) continue;
    counter.set(key, (counter.get(key) || 0) + 1);
  }

  return [...counter.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }
      return left.label.localeCompare(right.label, "ru");
    });
}

function buildHomePageMeta(siteUrl, library) {
  const title = "Эффект Бабочки — генератор и архив альтернативной истории";
  const description = `Генератор альтернативной истории и публичный архив с ${library.totalCount} отобранными сценариями, внутренними ссылками и поисковыми страницами.`;

  return {
    title,
    description,
    canonicalUrl: `${siteUrl}/`,
    ogUrl: `${siteUrl}/`,
    imageUrl: `${siteUrl}/logo.png`,
    locale: "ru_RU",
    htmlLang: "ru",
    robots: "index,follow",
    ogType: "website",
    structuredData: buildWebsiteStructuredData(siteUrl, { title, description }),
  };
}

function buildPrivateScenarioPageMeta({ scenarioParam, shareId, siteUrl }) {
  const scenarioMeta = buildScenarioMeta(scenarioParam, siteUrl);
  if (!scenarioMeta) {
    return buildHomePageMeta(siteUrl, { totalCount: 0 });
  }

  const shareUrl = shareId
    ? `${siteUrl}/?s=${encodeURIComponent(shareId)}`
    : `${siteUrl}/?scenario=${encodeURIComponent(scenarioParam)}`;

  return {
    title: `${scenarioMeta.title} | Эффект Бабочки`,
    description: scenarioMeta.description,
    canonicalUrl: shareId ? shareUrl : `${siteUrl}/`,
    ogUrl: shareUrl,
    imageUrl: scenarioMeta.imageUrl,
    locale: scenarioMeta.locale,
    htmlLang: scenarioMeta.lang,
    robots: "noindex,follow",
    ogType: "article",
    structuredData: buildTemporaryScenarioStructuredData(shareUrl, scenarioMeta),
  };
}

function buildArchivePageMeta(siteUrl, library, filteredScenarios, filters) {
  const suffix = filters.hasFilters
    ? `: ${formatActiveFilterSummary(filters)}`
    : "";
  const title = `Архив сценариев альтернативной истории${suffix} | Эффект Бабочки`;
  const description = filters.hasFilters
    ? `Подборка из ${filteredScenarios.length} опубликованных сценариев по фильтру "${formatActiveFilterSummary(filters)}".`
    : `Публичный архив из ${library.totalCount} отобранных сценариев: политика, цивилизации, катастрофы, эволюция и неожиданные развилки мировой истории.`;

  return {
    title,
    description,
    canonicalUrl: `${siteUrl}/scenarios`,
    ogUrl: filters.hasFilters
      ? `${siteUrl}/scenarios?${buildArchiveQueryString(filters)}`
      : `${siteUrl}/scenarios`,
    imageUrl: `${siteUrl}/logo.png`,
    locale: "ru_RU",
    htmlLang: "ru",
    robots: filters.hasFilters ? "noindex,follow" : "index,follow",
    ogType: "website",
    structuredData: buildArchiveStructuredData(siteUrl, library.totalCount, title, description),
  };
}

function buildPublicScenarioPageMeta(scenario, siteUrl) {
  const canonicalUrl = `${siteUrl}${scenario.url}`;
  const imageUrl = `${siteUrl}/og/scenario.png?scenario=${encodeURIComponent(scenario.encodedScenario)}`;

  return {
    title: `${scenario.title} | Эффект Бабочки`,
    description: scenario.description,
    canonicalUrl,
    ogUrl: canonicalUrl,
    imageUrl,
    locale: scenario.lang === "en" ? "en_US" : "ru_RU",
    htmlLang: scenario.lang,
    robots: "index,follow",
    ogType: "article",
    structuredData: buildPublicScenarioStructuredData(siteUrl, scenario, imageUrl),
  };
}

function buildNotFoundPageMeta(siteUrl) {
  return {
    title: "Страница не найдена | Эффект Бабочки",
    description: "Запрошенная страница не найдена. Откройте архив сценариев альтернативной истории или запустите новый генератор.",
    canonicalUrl: `${siteUrl}/`,
    ogUrl: `${siteUrl}/`,
    imageUrl: `${siteUrl}/logo.png`,
    locale: "ru_RU",
    htmlLang: "ru",
    robots: "noindex,follow",
    ogType: "website",
    structuredData: buildWebsiteStructuredData(siteUrl, {
      title: "Эффект Бабочки",
      description: "Генератор и архив альтернативной истории.",
    }),
  };
}

function buildWebsiteStructuredData(siteUrl, { title, description }) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Эффект Бабочки",
    url: siteUrl,
    inLanguage: "ru-RU",
    description,
    publisher: {
      "@type": "Organization",
      name: "Эффект Бабочки",
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/logo.png`,
      },
    },
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/scenarios?theme={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
    headline: title,
  };
}

function buildArchiveStructuredData(siteUrl, totalCount, title, description) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: title,
    url: `${siteUrl}/scenarios`,
    description,
    inLanguage: "ru-RU",
    isPartOf: {
      "@type": "WebSite",
      name: "Эффект Бабочки",
      url: siteUrl,
    },
    about: {
      "@type": "Thing",
      name: "Альтернативная история",
    },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: totalCount,
      itemListOrder: "https://schema.org/ItemListOrderDescending",
    },
  };
}

function buildTemporaryScenarioStructuredData(url, scenarioMeta) {
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: scenarioMeta.title,
    description: scenarioMeta.description,
    url,
    inLanguage: scenarioMeta.lang === "en" ? "en-US" : "ru-RU",
    isAccessibleForFree: true,
  };
}

function buildPublicScenarioStructuredData(siteUrl, scenario, imageUrl) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Главная",
          item: `${siteUrl}/`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Архив сценариев",
          item: `${siteUrl}/scenarios`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: scenario.title,
          item: `${siteUrl}${scenario.url}`,
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: scenario.title,
      alternativeHeadline: scenario.subtitle,
      description: scenario.description,
      url: `${siteUrl}${scenario.url}`,
      inLanguage: scenario.lang === "en" ? "en-US" : "ru-RU",
      datePublished: scenario.publishedAt,
      dateModified: scenario.updatedAt,
      image: [imageUrl],
      author: {
        "@type": "Organization",
        name: "Эффект Бабочки",
      },
      publisher: {
        "@type": "Organization",
        name: "Эффект Бабочки",
        logo: {
          "@type": "ImageObject",
          url: `${siteUrl}/logo.png`,
        },
      },
      mainEntityOfPage: `${siteUrl}${scenario.url}`,
      isAccessibleForFree: true,
      articleSection: scenario.themes.join(", "),
      keywords: [...scenario.countries, scenario.era, ...scenario.themes, scenario.tone]
        .filter(Boolean)
        .join(", "),
    },
  ];
}

function renderHomeLead() {
  return `
      <section class="hero-shell" aria-labelledby="hero-title-text">
        <div class="hero">
          <p id="hero-eyebrow" class="eyebrow">Альтернативная история</p>
          <div class="hero-title">
            <h1 id="hero-title-text">Эффект Бабочки</h1>
          </div>
          <p id="hero-subtitle" class="subtitle">
            Напишите реальное историческое событие, а ИИ построит гипотезу: что было бы, если всё пошло иначе.
          </p>
          <div class="hero-actions">
            <a id="hero-primary-link" class="hero-link hero-link-primary" href="#workspace">Создать сценарий</a>
            <a id="hero-secondary-link" class="hero-link" href="#support-section">Поддержать проект</a>
          </div>
          <div class="hero-stats" aria-label="Преимущества проекта">
            <div class="hero-stat">
              <span class="hero-stat-value">5</span>
              <span id="stat-label-1" class="hero-stat-label">режимов генерации</span>
            </div>
            <div class="hero-stat">
              <span class="hero-stat-value">RU / EN</span>
              <span id="stat-label-2" class="hero-stat-label">переключение языка</span>
            </div>
            <div class="hero-stat">
              <span class="hero-stat-value">PNG</span>
              <span id="stat-label-3" class="hero-stat-label">экспорт карточек</span>
            </div>
          </div>
          <ul class="hero-features">
            <li id="hero-feature-1">Тот же генератор, но с более сильной подачей</li>
            <li id="hero-feature-2">5 режимов альтернативной истории</li>
            <li id="hero-feature-3">Готовые карточки для шаринга</li>
          </ul>
        </div>
      </section>`;
}

function renderArchivePreviewSection(library, options = {}) {
  const scenarios = (library.featured.length > 0 ? library.featured : library.recent).slice(0, 4);
  if (scenarios.length === 0) {
    return "";
  }

  const title = options.title || "Публичный архив сценариев";
  const subtitle =
    options.subtitle ||
    "Сильные сценарии теперь живут не только в чате, но и как отдельные страницы, по которым можно ходить дальше.";

  return `
      <section class="content-section" aria-labelledby="archive-preview-title">
        <div class="section-head">
          <div>
            <p class="section-eyebrow" data-page-i18n="archivePreviewEyebrow">Архив</p>
            <h2 id="archive-preview-title" class="section-heading" data-page-i18n="archivePreviewTitle">${escapeHtmlAttr(title)}</h2>
            <p class="section-copy" data-page-i18n="archivePreviewSubtitle">${escapeHtmlAttr(subtitle)}</p>
          </div>
          <a class="hero-link" href="/scenarios" data-page-i18n="archivePreviewLink">Открыть весь архив</a>
        </div>
        <div class="scenario-grid">
          ${scenarios.map((scenario) => renderScenarioCard(scenario)).join("\n")}
        </div>
      </section>`;
}

function renderArchivePage(library, filteredScenarios, filters) {
  return `
      <section class="page-lead archive-lead">
        <p class="eyebrow" data-page-i18n="archiveEyebrow">Публичный архив</p>
        <h1 data-page-i18n="archiveTitle">Сценарии альтернативной истории</h1>
        <p class="subtitle" data-page-i18n="archiveSubtitle">
          Отобранные публикации с самостоятельными URL, метаданными и внутренними переходами. Это уже не просто генератор, а библиотека развилок.
        </p>
        <div class="hero-stats archive-stats">
          <div class="hero-stat">
            <span class="hero-stat-value">${library.totalCount}</span>
            <span class="hero-stat-label" data-page-i18n="archiveStatPublished">опубликованных сценариев</span>
          </div>
          <div class="hero-stat">
            <span class="hero-stat-value">${library.facets.themes.length}</span>
            <span class="hero-stat-label" data-page-i18n="archiveStatThemes">основных тем</span>
          </div>
          <div class="hero-stat">
            <span class="hero-stat-value">${library.facets.eras.length}</span>
            <span class="hero-stat-label" data-page-i18n="archiveStatEras">эпох и периодов</span>
          </div>
        </div>
      </section>
      <section class="content-section filters-shell" aria-labelledby="archive-filters-title">
        <div class="section-head compact">
          <div>
            <p class="section-eyebrow" data-page-i18n="archiveNavigationEyebrow">Навигация</p>
            <h2 id="archive-filters-title" class="section-heading" data-page-i18n="archiveFiltersTitle">Фильтры и таксономия</h2>
            <p id="archive-filters-copy" class="section-copy">
              ${filters.hasFilters
                ? `Сейчас показаны сценарии по фильтру: ${escapeHtmlAttr(formatActiveFilterSummary(filters))}.`
                : "Фильтруйте по стране, эпохе, теме и тону, чтобы архив был удобен и людям, и поисковикам."}
            </p>
          </div>
          ${filters.hasFilters ? '<a class="hero-link" href="/scenarios" data-page-i18n="archiveResetFilters">Сбросить фильтры</a>' : ""}
        </div>
        <div class="filter-groups">
          ${renderFilterGroup("Страна", "country", library.facets.countries, filters)}
          ${renderFilterGroup("Эпоха", "era", library.facets.eras, filters)}
          ${renderFilterGroup("Тема", "theme", library.facets.themes, filters)}
          ${renderFilterGroup("Тон", "tone", library.facets.tones, filters)}
        </div>
      </section>
      <section class="content-section" aria-labelledby="archive-grid-title">
        <div class="section-head compact">
          <div>
            <p class="section-eyebrow" data-page-i18n="archiveResultsEyebrow">Результаты</p>
            <h2 id="archive-grid-title" class="section-heading" data-page-i18n="archiveResultsTitle">Доступные сценарии</h2>
            <p id="archive-results-count" class="section-copy" data-count="${filteredScenarios.length}">Найдено сценариев: ${filteredScenarios.length}.</p>
          </div>
        </div>
        ${filteredScenarios.length
          ? `<div class="scenario-grid">${filteredScenarios.map((scenario) => renderScenarioCard(scenario)).join("\n")}</div>`
          : '<div class="empty-state"><h3 data-page-i18n="archiveEmptyTitle">Под этот фильтр пока нет сценариев.</h3><p data-page-i18n="archiveEmptyCopy">Попробуйте снять часть ограничений или открыть весь архив.</p></div>'}
      </section>`;
}

function renderPublicScenarioPage(scenario, library) {
  const related = getRelatedScenarios(scenario, library.scenarios, 4);
  const recent = library.recent.filter((entry) => entry.slug !== scenario.slug).slice(0, 4);
  const popular = library.popular.filter((entry) => entry.slug !== scenario.slug).slice(0, 4);

  return `
      <section class="page-lead scenario-lead">
        <nav class="breadcrumbs" aria-label="Хлебные крошки" data-page-i18n-attr="aria-label" data-page-i18n-attr-key="breadcrumbAria">
          <a href="/" data-page-i18n="scenarioBreadcrumbHome">Главная</a>
          <span>/</span>
          <a href="/scenarios" data-page-i18n="scenarioBreadcrumbArchive">Архив сценариев</a>
          <span>/</span>
          <span>${escapeHtmlAttr(scenario.title)}</span>
        </nav>
        <p class="eyebrow" data-page-i18n="publicScenarioEyebrow">Публичный сценарий</p>
        <h1>${escapeHtmlAttr(scenario.title)}</h1>
        <p class="subtitle">${escapeHtmlAttr(scenario.subtitle || scenario.summary)}</p>
        <div class="taxonomy-pills">
          ${renderScenarioPills(scenario)}
          <span id="scenario-reading-time" class="taxonomy-pill" data-count="${scenario.readingMinutes}">${scenario.readingMinutes} мин чтения</span>
        </div>
        <div class="hero-actions">
          <a class="hero-link hero-link-primary" href="#workspace" data-page-i18n="scenarioPrimaryCta">Смоделировать свою развилку</a>
          <a class="hero-link" href="/scenarios" data-page-i18n="scenarioSecondaryCta">Вернуться в архив</a>
        </div>
      </section>
      <article class="story-card" aria-labelledby="story-title">
        <div class="story-summary">
          <p class="section-eyebrow" data-page-i18n="storyEyebrow">Краткий заход</p>
          <h2 id="story-title" class="section-heading" data-page-i18n="storyTitle">Что меняется в этой версии истории</h2>
          <p class="story-summary-copy">${escapeHtmlAttr(scenario.summary)}</p>
        </div>
        <div class="story-body">
          ${scenario.paragraphs.map((paragraph) => `<p>${escapeHtmlAttr(paragraph)}</p>`).join("\n")}
        </div>
      </article>
      <section class="content-section" aria-labelledby="discovery-title">
        <div class="section-head compact">
          <div>
            <p class="section-eyebrow" data-page-i18n="discoveryEyebrow">Что читать дальше</p>
            <h2 id="discovery-title" class="section-heading" data-page-i18n="discoveryTitle">Внутренние переходы</h2>
            <p class="section-copy" data-page-i18n="discoveryCopy">Сценарий должен вести дальше по сайту. Поэтому рядом всегда есть похожие, свежие и популярные развилки.</p>
          </div>
        </div>
        <div class="discovery-columns">
          ${renderScenarioListBlock("relatedTitle", "Похожие сценарии", "relatedCopy", "Ближайшие страницы по эпохе, теме и стране.", related)}
          ${renderScenarioListBlock("recentTitle", "Свежие публикации", "recentCopy", "Новые материалы, которые уже добавлены в архив.", recent)}
          ${renderScenarioListBlock("popularTitle", "Популярные развилки", "popularCopy", "Сценарии, которые логично ставить в верхнюю навигацию архива.", popular)}
        </div>
      </section>`;
}

function renderNotFoundSection() {
  return `
      <section class="page-lead not-found-lead">
        <p class="eyebrow">404</p>
        <h1 data-page-i18n="notFoundTitle">Эта ветка истории не найдена</h1>
        <p class="subtitle" data-page-i18n="notFoundSubtitle">
          Возможно, ссылка устарела или сценарий еще не был опубликован. Ниже можно открыть архив или запустить новую генерацию.
        </p>
        <div class="hero-actions">
          <a class="hero-link hero-link-primary" href="/scenarios" data-page-i18n="notFoundPrimaryCta">Открыть архив</a>
          <a class="hero-link" href="#workspace" data-page-i18n="notFoundSecondaryCta">Создать новый сценарий</a>
        </div>
      </section>`;
}

function getModeIdFromToneLabel(tone) {
  const normalized = String(tone || "").trim().toLowerCase();
  if (normalized === "реализм" || normalized === "realism") return "realism";
  if (normalized === "мрачная хроника" || normalized === "dark chronicle") return "dark";
  if (normalized === "эпоха процветания" || normalized === "age of prosperity") {
    return "prosperity";
  }
  if (normalized === "безумие" || normalized === "madness") return "madness";
  if (normalized === "юмор" || normalized === "humor") return "humor";
  return "";
}

function renderScenarioCard(scenario) {
  const toneModeId = getModeIdFromToneLabel(scenario.tone);
  const toneMarkup = toneModeId
    ? `<span data-mode-label="true" data-mode-id="${escapeHtmlAttr(toneModeId)}">${escapeHtmlAttr(scenario.tone)}</span>`
    : `<span>${escapeHtmlAttr(scenario.tone)}</span>`;

  return `
            <article class="scenario-card">
              <div class="scenario-card-meta">
                <span>${escapeHtmlAttr(scenario.era)}</span>
                ${toneMarkup}
              </div>
              <h3><a href="${escapeHtmlAttr(scenario.url)}">${escapeHtmlAttr(scenario.title)}</a></h3>
              <p class="scenario-card-copy">${escapeHtmlAttr(scenario.description)}</p>
              <div class="taxonomy-pills compact">
                ${renderScenarioPills(scenario)}
              </div>
              <a class="scenario-card-link" href="${escapeHtmlAttr(scenario.url)}" data-page-i18n="archiveReadLink">Читать сценарий</a>
            </article>`;
}

function renderScenarioListBlock(titleKey, title, descriptionKey, description, scenarios) {
  if (!scenarios.length) {
    return "";
  }

  return `
            <section class="list-block">
              <h3 data-page-i18n="${escapeHtmlAttr(titleKey)}">${escapeHtmlAttr(title)}</h3>
              <p data-page-i18n="${escapeHtmlAttr(descriptionKey)}">${escapeHtmlAttr(description)}</p>
              <ul>
                ${scenarios
                  .map(
                    (scenario) =>
                      `<li><a href="${escapeHtmlAttr(scenario.url)}">${escapeHtmlAttr(scenario.title)}</a><span>${escapeHtmlAttr(scenario.era)}</span></li>`
                  )
                  .join("\n")}
              </ul>
            </section>`;
}

function renderScenarioPills(scenario) {
  const pills = [
    { label: scenario.countries[0], modeId: "" },
    { label: scenario.era, modeId: "" },
    { label: scenario.themes[0], modeId: "" },
    { label: scenario.tone, modeId: getModeIdFromToneLabel(scenario.tone) },
  ].filter((entry) => entry.label);

  return pills
    .map((entry) => {
      const modeAttrs = entry.modeId
        ? ` data-mode-label="true" data-mode-id="${escapeHtmlAttr(entry.modeId)}"`
        : "";
      return `<span class="taxonomy-pill"${modeAttrs}>${escapeHtmlAttr(entry.label)}</span>`;
    })
    .join("\n");
}

function renderFilterGroup(title, key, items, filters) {
  if (!items.length) {
    return "";
  }

  const titleKeys = {
    country: "archiveFilterCountry",
    era: "archiveFilterEra",
    theme: "archiveFilterTheme",
    tone: "archiveFilterTone",
  };
  const titleKey = titleKeys[key] || "";

  return `
            <section class="filter-group" aria-label="${escapeHtmlAttr(title)}">
              <h3${titleKey ? ` data-page-i18n="${escapeHtmlAttr(titleKey)}"` : ""}>${escapeHtmlAttr(title)}</h3>
              <div class="filter-pills">
                ${items
                  .map((item) => {
                    const currentValue = key === "lang"
                      ? filters[key]
                      : filters[key];
                    const isActive = currentValue === item.label;
                    const nextFilters = {
                      ...filters,
                      [key]: isActive ? "" : item.label,
                    };
                    const href = buildArchiveHref(nextFilters);
                    const toneModeId = key === "tone" ? getModeIdFromToneLabel(item.label) : "";
                    const labelMarkup = toneModeId
                      ? `<span data-mode-label="true" data-mode-id="${escapeHtmlAttr(toneModeId)}">${escapeHtmlAttr(item.label)}</span>`
                      : escapeHtmlAttr(item.label);
                    return `<a class="filter-pill${isActive ? " is-active" : ""}" href="${escapeHtmlAttr(href)}">${labelMarkup} <span>${item.count}</span></a>`;
                  })
                  .join("\n")}
              </div>
            </section>`;
}

function buildArchiveHref(filters) {
  const query = buildArchiveQueryString(filters);
  return query ? `/scenarios?${query}` : "/scenarios";
}

function buildArchiveQueryString(filters) {
  const params = new URLSearchParams();
  if (filters.country) params.set("country", filters.country);
  if (filters.era) params.set("era", filters.era);
  if (filters.theme) params.set("theme", filters.theme);
  if (filters.tone) params.set("tone", filters.tone);
  if (filters.lang) params.set("lang", filters.lang);
  return params.toString();
}

function formatActiveFilterSummary(filters) {
  return [
    filters.country,
    filters.era,
    filters.theme,
    filters.tone,
    filters.lang === "en" ? "English" : filters.lang === "ru" ? "Русский" : "",
  ]
    .filter(Boolean)
    .join(" / ");
}

function getRelatedScenarios(currentScenario, scenarios, limit = 4) {
  const explicit = currentScenario.relatedSlugs
    .map((slug) => scenarios.find((entry) => entry.slug === slug))
    .filter(Boolean);

  const scored = scenarios
    .filter((entry) => entry.slug !== currentScenario.slug)
    .map((entry) => ({
      entry,
      score:
        overlapScore(entry.countries, currentScenario.countries) * 4 +
        overlapScore(entry.themes, currentScenario.themes) * 5 +
        Number(entry.era === currentScenario.era) * 3 +
        Number(entry.tone === currentScenario.tone) * 2 +
        Number(entry.lang === currentScenario.lang),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return compareByPopularityDesc(left.entry, right.entry);
    })
    .map((entry) => entry.entry);

  return uniqueScenarioList([...explicit, ...scored]).slice(0, limit);
}

function uniqueScenarioList(scenarios) {
  const seen = new Set();
  const result = [];
  for (const scenario of scenarios) {
    if (!scenario || seen.has(scenario.slug)) continue;
    seen.add(scenario.slug);
    result.push(scenario);
  }
  return result;
}

function overlapScore(left, right) {
  const rightSet = new Set(right);
  let score = 0;
  for (const item of left) {
    if (rightSet.has(item)) {
      score += 1;
    }
  }
  return score;
}

function getModeLabelForLang(modeId, lang) {
  const mode = String(modeId || "realism").trim();
  const labels = {
    realism: lang === "en" ? "Realism" : "Реализм",
    dark: lang === "en" ? "Dark Chronicle" : "Мрачная хроника",
    prosperity: lang === "en" ? "Age of Prosperity" : "Эпоха процветания",
    madness: lang === "en" ? "Madness" : "Безумие",
    humor: lang === "en" ? "Humor" : "Юмор",
  };
  return labels[mode] || labels.realism;
}

function normalizeTagList(values) {
  if (Array.isArray(values)) {
    return values.map((value) => oneLine(value)).filter(Boolean);
  }
  const single = oneLine(values);
  return single ? [single] : [];
}

function splitNarrativeIntoParagraphs(narrative) {
  const clean = oneLine(narrative);
  if (!clean) return [];

  const sentences = clean.match(/[^.!?]+[.!?]+/g) || [clean];
  const paragraphs = [];
  let current = "";

  for (const sentence of sentences) {
    const chunk = current ? `${current} ${sentence.trim()}` : sentence.trim();
    if (chunk.length > 420 && current) {
      paragraphs.push(current);
      current = sentence.trim();
      continue;
    }
    current = chunk;
  }

  if (current) {
    paragraphs.push(current);
  }

  return paragraphs.length > 0 ? paragraphs : [clean];
}

function countWords(text) {
  return oneLine(text).split(" ").filter(Boolean).length;
}

function normalizeIsoDate(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString().slice(0, 10);
}

function compareByPublishedDesc(left, right) {
  const leftDate = String(left?.publishedAt || left?.createdAt || "");
  const rightDate = String(right?.publishedAt || right?.createdAt || "");
  return rightDate.localeCompare(leftDate, "en");
}

function compareByPopularityDesc(left, right) {
  const score = Number(right?.popularity || 0) - Number(left?.popularity || 0);
  if (score !== 0) {
    return score;
  }
  return compareByPublishedDesc(left, right);
}

function normalizeOptionalLanguage(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "en") return "en";
  if (raw === "ru") return "ru";
  return "";
}

function serializeInlineJson(value) {
  return JSON.stringify(value, null, 2)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function resolveRuntimeDataDir() {
  const configured = String(process.env.DATA_DIR || "").trim();
  if (!configured) {
    return path.join(__dirname, ".runtime");
  }
  if (path.isAbsolute(configured)) {
    return configured;
  }
  return path.resolve(process.cwd(), configured);
}

async function handleScenarioOgImage(req, res, url) {
  const scenarioParam = String(url.searchParams.get("scenario") || "").trim();
  const parsed = decodeScenarioPayload(scenarioParam);
  const lang = normalizeLanguage(parsed?.lang || parsed?.language);
  const title = oneLine(parsed?.event || parsed?.title || byLanguage(lang, "Эффект Бабочки", "Butterfly Effect"));
  const subtitle = oneLine(
    parsed?.subtitle ||
      byLanguage(
        lang,
        "Альтернативная история, которой хочется поделиться",
        "An alternate history worth sharing"
      )
  );
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
  const lang = normalizeLanguage(parsed?.lang || parsed?.language);
  const title = oneLine(parsed?.event || parsed?.title || byLanguage(lang, "Эффект Бабочки", "Butterfly Effect"));
  const subtitle = oneLine(
    parsed?.subtitle ||
      byLanguage(
        lang,
        "Альтернативная история, которой хочется поделиться",
        "An alternate history worth sharing"
      )
  );
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
  <text x="84" y="112" font-family="'IBM Plex Sans', 'Segoe UI', sans-serif" font-size="30" fill="#7ce1d9" letter-spacing="2">ALTERNATE HISTORY</text>
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
  await ensureShareLinksStorageReady();
  const parsed = await readJsonObjectFile(SHARE_LINKS_FILE);
  return parsed || {};
}

async function writeShareLinks(store) {
  await ensureShareLinksStorageReady();
  await fsp.mkdir(RUNTIME_DATA_DIR, { recursive: true });
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

async function ensureShareLinksStorageReady() {
  if (SHARE_LINKS_FILE === LEGACY_SHARE_LINKS_FILE) {
    return;
  }

  if (await fileExists(SHARE_LINKS_FILE)) {
    return;
  }

  const legacyStore = await readJsonObjectFile(LEGACY_SHARE_LINKS_FILE);
  if (!legacyStore) {
    return;
  }

  await fsp.mkdir(RUNTIME_DATA_DIR, { recursive: true });
  const tempPath = `${SHARE_LINKS_FILE}.tmp`;
  await fsp.writeFile(tempPath, JSON.stringify(legacyStore), "utf-8");
  await fsp.rename(tempPath, SHARE_LINKS_FILE);
  console.log(
    `Migrated share links from ${LEGACY_SHARE_LINKS_FILE} to ${SHARE_LINKS_FILE}`
  );
}

async function readJsonObjectFile(filePath) {
  try {
    const raw = await fsp.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parsed;
  } catch (error) {
    if (error?.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function fileExists(filePath) {
  try {
    await fsp.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
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
    .filter((entry) => {
      if (!entry.isFile() || !entry.name.endsWith(".html")) {
        return false;
      }
      if (/^google[a-z0-9]+\.html$/i.test(entry.name)) {
        return false;
      }
      return true;
    })
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

  const library = await loadPublicScenarioLibrary();
  urls.push({
    loc: `${siteUrl}/scenarios`,
    lastmod: library.recent[0]?.updatedAt || null,
  });

  for (const scenario of library.scenarios) {
    urls.push({
      loc: `${siteUrl}${scenario.url}`,
      lastmod: scenario.updatedAt || scenario.publishedAt || null,
    });
  }

  if (urls.length === 0) {
    urls.push({ loc: siteUrl, lastmod: null });
  }

  return uniqueSitemapUrls(urls);
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

function uniqueSitemapUrls(urls) {
  const byLoc = new Map();
  for (const entry of urls) {
    if (!entry?.loc) continue;
    byLoc.set(entry.loc, entry);
  }
  return [...byLoc.values()];
}

function sendHtml(res, statusCode, html, method = "GET") {
  res.writeHead(statusCode, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": statusCode >= 400 ? "no-store, max-age=0" : "public, max-age=0, must-revalidate",
  });
  if (method === "HEAD") {
    res.end();
    return;
  }
  res.end(html);
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, max-age=0",
  });
  res.end(JSON.stringify(data));
}

function redirect(res, statusCode, location) {
  res.writeHead(statusCode, {
    Location: location,
    "Cache-Control": "no-store, max-age=0",
  });
  res.end();
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
