import fs from "node:fs";
import fsp from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

loadEnvFile();

const PORT = Number(process.env.PORT || 3000);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_BASE_URL =
  process.env.GEMINI_BASE_URL ||
  "https://generativelanguage.googleapis.com/v1beta/openai";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL =
  process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
const OPENROUTER_MODELS = uniqueStrings([
  process.env.OPENROUTER_MODEL_PRIMARY || "google/gemini-2.0-flash:free",
  process.env.OPENROUTER_MODEL_FALLBACK || "meta-llama/llama-3.3-70b:free",
  process.env.OPENROUTER_MODEL_SAFE || "meta-llama/llama-3.3-70b-instruct:free",
  process.env.OPENROUTER_MODEL_RESCUE || "stepfun/step-3.5-flash:free",
]);

const rateLimits = new Map();
const RATE_LIMIT_WINDOW = 60000;
const MAX_REQUESTS = 5;

function isRateLimited(ip) {
  const now = Date.now();
  const user = rateLimits.get(ip) || { count: 0, time: now };

  if (now > user.time + RATE_LIMIT_WINDOW) {
    user.count = 1;
    user.time = now;
  } else {
    user.count += 1;
  }

  rateLimits.set(ip, user);
  return user.count > MAX_REQUESTS;
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, user] of rateLimits.entries()) {
    if (now > user.time + RATE_LIMIT_WINDOW) {
      rateLimits.delete(ip);
    }
  }
}, 60000);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, "public");

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);

    if (req.method === "POST" && url.pathname === "/api/alt-history") {
      const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
      if (isRateLimited(ip)) {
        sendJson(res, 429, { error: "Слишком много запросов. Подождите минуту перед новой генерацией." });
        return;
      }
      await handleAltHistory(req, res);
      return;
    }

    if (req.method === "GET") {
      await serveStaticFile(url.pathname, res);
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
  const locale = normalizeLocale(body.locale);
  const context = normalizeContext(body.context);
  const currentYear = new Date().getFullYear();
  const eventYear = extractEventYear(event);

  if (!event) {
    sendJson(res, 400, { error: "Введите историческое событие." });
    return;
  }

  if (!GEMINI_API_KEY && !OPENROUTER_API_KEY) {
    sendJson(res, 500, {
      error:
        "Не найдены GEMINI_API_KEY и OPENROUTER_API_KEY. Добавьте хотя бы один ключ в .env.",
    });
    return;
  }

  const systemPrompt = buildSystemPrompt(locale);
  const userPrompt = buildUserPrompt({
    event,
    branch,
    context,
    currentYear,
    eventYear,
    locale,
  });
  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  try {
    const primary = await requestGemini(messages);
    let selected = primary;

    if (!primary.ok && shouldUseOpenRouterFallback(primary.status)) {
      const fallback = await requestOpenRouter(messages);
      if (fallback.ok) {
        selected = fallback;
      } else {
        console.warn(
          "OpenRouter fallback failed:",
          fallback.error || "unknown error"
        );
      }
    }

    if (!selected.ok) {
      sendJson(res, selected.status || 502, {
        error: selected.error || "Не удалось получить ответ от модели.",
      });
      return;
    }

    const scenario = parseScenarioResponse(
      selected.modelText,
      currentYear,
      locale,
      eventYear
    );
    scenario.images = [];
    scenario.provider = selected.provider;
    scenario.model = selected.model;
    scenario.locale = locale;

    sendJson(res, 200, { scenario });
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: "Не удалось получить ответ от модели." });
  }
}

function buildSystemPrompt(locale) {
  if (locale === "en") {
    return `
Role: You are a brilliant alternative history analyst and a viral digital editor.
Language: English.
Task: Return a strict JSON. 

JSON Format strictly required:
{
  "narrative": "Deep analytical paragraph describing concrete changes. No fluff.",
  "timeline": [
    {
      "year": 2022,
      "title": "viral short hook",
      "details": "One punchy sentence about the consequences."
    }
  ],
  "branches": ["Option 1", "Option 2"]
}

Rules:
1. "year": Identify the EXACT real historical year of the event. Start Point 1 in that year.
2. "title": Viral hook for social media. Max 5 words. Lowercase.
3. "details": Specific factual alternative history. NO generic phrases.
4. "timeline" MUST have exactly 4 items moving forward in time.
5. "narrative" MUST NOT be empty.
`.trim();
  }

  return `
Role: You are a brilliant alternative history analyst and a viral digital editor.
Language: Russian.
Task: Return a strict JSON.

JSON Format strictly required:
{
  "narrative": "Глубокий аналитический абзац. Описывает конкретные изменения. Никакой воды.",
  "timeline": [
    {
      "year": 2022,
      "title": "хлесткий заголовок",
      "details": "Одно емкое предложение о последствиях."
    }
  ],
  "branches": ["Вариант 1", "Вариант 2"]
}

Rules:
1. "year": Identify the EXACT real historical year of the event. Start Point 1 in that year.
2. "title": Viral hook for social media. Max 5 words. Lowercase.
3. "details": Specific factual alternative history. NO generic phrases like глобальный эффект.
4. "timeline" MUST have exactly 4 items moving forward in time.
5. "narrative" MUST NOT be empty.
`.trim();
}

function buildUserPrompt({ event, branch, context, currentYear, eventYear, locale }) {
  const serializedContext = context.length > 0 ? JSON.stringify(context, null, 2) : "[]";
  const computedCurrentYear = new Date().getFullYear();
  const effectiveCurrentYear = Number.isFinite(computedCurrentYear)
    ? computedCurrentYear
    : currentYear;
  const yearStr = eventYear ? eventYear : effectiveCurrentYear;

  if (locale === "en") {
    if (branch) {
      return `
Initial event: ${event}
Event year X: ${yearStr}
Selected branch: ${branch}
Current year: ${effectiveCurrentYear}
Compact context from previous steps:
${serializedContext}

Continue THIS exact alternative history branch. Return strict JSON.
`.trim();
    }

    return `
Initial event: ${event}
Event year X: ${yearStr}
Current year: ${effectiveCurrentYear}
Context from previous steps:
${serializedContext}

Build the first step of this alternative history scenario. Return strict JSON.
`.trim();
  }

  if (branch) {
    return `
Исходное событие: ${event}
Год события X: ${yearStr}
Выбранная развилка: ${branch}
Текущий год: ${effectiveCurrentYear}
Краткий контекст прошлых шагов:
${serializedContext}

Продолжи именно эту альтернативную ветку. Верни строго JSON.
`.trim();
  }

  return `
Исходное событие: ${event}
Год события X: ${yearStr}
Текущий год: ${effectiveCurrentYear}
Контекст прошлых шагов:
${serializedContext}

Построй первый шаг альтернативной истории. Верни строго JSON.
`.trim();
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

function parseScenarioResponse(modelText, currentYear, locale, eventYear) {
  const parsed = parseJsonFromModelText(modelText);
  const parsedNarrative = pickString(parsed?.narrative);
  const narrative =
    parsedNarrative ||
    (locale === "en"
      ? "The scenario is being reconstructed from verified timeline points."
      : "Сценарий восстановлен по проверенным точкам таймлайна.");
  const timeline = normalizeTimeline(
    parsed?.timeline,
    currentYear,
    narrative,
    locale,
    eventYear
  );
  const branches = normalizeBranches(parsed?.branches, locale);

  return {
    narrative: repairNarrativeFromTimeline(narrative, timeline, locale),
    timeline,
    branches,
    images: [],
  };
}

async function requestGemini(messages) {
  if (!GEMINI_API_KEY) {
    return {
      ok: false,
      status: 500,
      error: "GEMINI_API_KEY не задан.",
    };
  }

  try {
    const response = await fetch(
      `${GEMINI_BASE_URL.replace(/\/+$/, "")}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GEMINI_API_KEY}`,
        },
        body: JSON.stringify({
          model: GEMINI_MODEL,
          messages,
          temperature: 0.85,
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: data?.error?.message || "Ошибка при обращении к Gemini API.",
      };
    }

    const modelText = extractTextFromChatCompletion(data);
    if (!modelText) {
      return {
        ok: false,
        status: 502,
        error: "Gemini вернул пустой ответ.",
      };
    }

    return {
      ok: true,
      status: 200,
      provider: "gemini",
      model: GEMINI_MODEL,
      modelText,
    };
  } catch (error) {
    return {
      ok: false,
      status: 502,
      error: `Ошибка Gemini: ${error?.message || "неизвестная ошибка"}`,
    };
  }
}

async function requestOpenRouter(messages) {
  if (!OPENROUTER_API_KEY) {
    return {
      ok: false,
      status: 500,
      error: "OpenRouter fallback недоступен: отсутствует OPENROUTER_API_KEY.",
    };
  }

  let lastError = "";
  let lastStatus = 502;

  for (const model of OPENROUTER_MODELS) {
    try {
      const response = await fetch(
        `${OPENROUTER_BASE_URL.replace(/\/+$/, "")}/chat/completions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            "HTTP-Referer": `http://localhost:${PORT}`,
            "X-Title": "Butterfly History",
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: 0.85,
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        lastStatus = response.status;
        lastError =
          data?.error?.message ||
          `OpenRouter model ${model} returned status ${response.status}`;
        continue;
      }

      const modelText = extractTextFromChatCompletion(data);
      if (!modelText) {
        lastStatus = 502;
        lastError = `OpenRouter model ${model} вернул пустой ответ.`;
        continue;
      }

      return {
        ok: true,
        status: 200,
        provider: "openrouter",
        model,
        modelText,
      };
    } catch (error) {
      lastStatus = 502;
      lastError = `OpenRouter model ${model}: ${error?.message || "unknown error"}`;
    }
  }

  return {
    ok: false,
    status: lastStatus,
    error: lastError || "Не удалось получить ответ через OpenRouter fallback.",
  };
}

function shouldUseOpenRouterFallback(status) {
  if (typeof status !== "number") {
    return true;
  }
  if (status >= 400) {
    return true;
  }
  return false;
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

function normalizeTimeline(rawTimeline, currentYear, narrative, locale, eventYear) {
  const baseYear = normalizeYear(eventYear);
  const defaults = buildDefaultTimeline(baseYear ?? currentYear, narrative, locale);

  if (!Array.isArray(rawTimeline) || rawTimeline.length === 0) {
    return defaults;
  }

  const timeline = rawTimeline.slice(0, 4).map((item, index) => ({
    year: normalizeYear(item?.year) ?? ((baseYear ?? currentYear) + index),
    title: cleanTimelineTitle(item?.title, locale),
    details: cleanTimelineDetails(item?.details, locale),
  }));

  for (let i = 1; i < timeline.length; i += 1) {
    if (timeline[i].year <= timeline[i - 1].year) {
      timeline[i].year = timeline[i - 1].year + 1;
    }
  }

  return timeline;
}

function buildDefaultTimeline(baseYear, narrative, locale) {
  const snippet =
    pickString(narrative) ||
    (locale === "en"
      ? "Consequences unfold gradually as institutions adapt to the divergence."
      : "Последствия разворачиваются постепенно.");

  if (locale === "en") {
    return [
      {
        year: baseYear,
        title: "Early Turning Point",
        details: snippet.slice(0, 180),
      },
      {
        year: baseYear + 1,
        title: "Pattern Consolidation",
        details: "New political and economic rules become stable and institutionalized.",
      },
      {
        year: baseYear + 7,
        title: "Global Impact",
        details: "The shift scales globally and reshapes alliances and technology choices.",
      },
      {
        year: baseYear + 22,
        title: "Long Term Reality",
        details: "A stable long term alternative world order emerges around this divergence.",
      },
    ];
  }

  return [
    {
      year: baseYear,
      title: "Ранний перелом",
      details: snippet.slice(0, 180),
    },
    {
      year: baseYear + 1,
      title: "Закрепление тренда",
      details: "Новые политические и экономические правила начинают стабилизироваться.",
    },
    {
      year: baseYear + 7,
      title: "Глобальный эффект",
      details: "Изменения переходят на мировой уровень и влияют на союзы и технологии.",
    },
    {
      year: baseYear + 22,
      title: "Долгая новая норма",
      details: "Формируется устойчивая долгосрочная реальность нового мирового порядка.",
    },
  ];
}

function normalizeBranches(rawBranches, locale) {
  const defaults =
    locale === "en"
      ? [
          "Push a major technology leap and trace its consequences",
          "Strengthen alliances and test how the balance of power shifts",
          "Focus on domestic reforms and social response",
        ]
      : [
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

function pickString(value) {
  if (typeof value !== "string") {
    return "";
  }
  return sanitizeModelText(value);
}

function sanitizeModelText(value) {
  const raw = String(value || "");
  if (!raw) return "";

  const cleaned = raw
    .replace(/```json/gi, " ")
    .replace(/```/g, " ")
    .replace(/\bjson\b/gi, " ")
    .replace(/^\s*json\s*/i, "")
    .replace(/"narrative"\s*:/gi, " ")
    .replace(/"timeline"\s*:/gi, " ")
    .replace(/"branches"\s*:/gi, " ")
    .replace(/[{}[\]`]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "";
  return cleaned;
}

function cleanTimelineTitle(title, locale) {
  const value = sanitizeModelText(title).replace(/[.!?]+$/g, "").trim();
  if (!value) {
    return locale === "en" ? "News turn" : "Поворот сюжета";
  }
  return value.slice(0, 80);
}

function cleanTimelineDetails(details, locale) {
  const value = sanitizeModelText(details);
  if (!value) {
    return locale === "en"
      ? "Developments accelerate and reshape the political balance."
      : "События ускоряются и меняют политический баланс.";
  }
  if (/[.!?]$/.test(value)) return value;
  return `${value}.`;
}

function repairNarrativeFromTimeline(narrative, timeline, locale) {
  const cleanNarrative = sanitizeModelText(narrative);
  if (
    cleanNarrative &&
    !/"\w+"\s*:/.test(cleanNarrative) &&
    !/^\s*json\b/i.test(cleanNarrative)
  ) {
    return cleanNarrative;
  }

  const rows = Array.isArray(timeline)
    ? timeline
        .map((item) => {
          const year = normalizeYear(item?.year);
          const details = cleanTimelineDetails(item?.details, locale);
          if (!year || !details) return "";
          return `${year}: ${details}`;
        })
        .filter(Boolean)
    : [];

  if (rows.length > 0) {
    return rows.join(" ");
  }

  return locale === "en"
    ? "A coherent alternative timeline was generated."
    : "Сформирована связная альтернативная хроника.";
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

function extractEventYear(text) {
  const input = String(text || "");
  const match = input.match(/\b(\d{3,4})\b/);
  if (!match) return null;
  return normalizeYear(match[1]);
}

function normalizeLocale(value) {
  const locale = String(value || "").trim().toLowerCase();
  return locale === "en" ? "en" : "ru";
}

function uniqueStrings(values) {
  return [
    ...new Set(
      values
        .filter((item) => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    ),
  ];
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

async function serveStaticFile(pathname, res) {
  const targetPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.resolve(PUBLIC_DIR, `.${targetPath}`);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  try {
    const content = await fsp.readFile(filePath);
    res.writeHead(200, { "Content-Type": getContentType(filePath) });
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
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".svg":
      return "image/svg+xml";
    case ".ico":
      return "image/x-icon";
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
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
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
