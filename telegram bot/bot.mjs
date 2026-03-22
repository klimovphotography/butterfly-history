import fs from "node:fs/promises";
import path from "node:path";
import { Buffer } from "node:buffer";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import {
  buildAltHistoryScenario,
  getAvailableModes,
  getDefaultModelMeta,
  getModeLabel,
  getRandomExample,
  hasAnyEnabledModels,
  missingModelMessage,
} from "./lib/alt-history-core.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "data");
const STATE_FILE = path.join(DATA_DIR, "state.json");

const BOT_TOKEN =
  process.env.TELEGRAM_BOT_TOKEN ||
  process.env.BOT_TOKEN ||
  "";
const TELEGRAM_DISABLE_POLLING = process.env.TELEGRAM_DISABLE_POLLING === "1";

const MODE_MENU = getAvailableModes();
const pendingChats = new Set();

const baseState = {
  lastUpdateId: 0,
  chats: {},
};

let state = await readState();

if (TELEGRAM_DISABLE_POLLING) {
  console.log("Telegram polling disabled by TELEGRAM_DISABLE_POLLING=1");
} else if (!BOT_TOKEN) {
  console.error("Не найден TELEGRAM_BOT_TOKEN в .env");
  process.exit(1);
} else {
  if (!hasAnyEnabledModels()) {
    console.error(missingModelMessage());
    process.exit(1);
  }

  console.log("Telegram bot started");
  void startPolling();
}

async function startPolling() {
  while (true) {
    try {
      const updates = await telegramCall("getUpdates", {
        offset: state.lastUpdateId + 1,
        timeout: 25,
        allowed_updates: ["message", "callback_query"],
      });

      for (const update of updates) {
        await handleUpdate(update);
        state.lastUpdateId = Math.max(state.lastUpdateId, Number(update.update_id) || 0);
        await writeState(state);
      }
    } catch (error) {
      console.error("Polling error:", error?.message || error);
      await delay(3000);
    }
  }
}

async function handleUpdate(update) {
  if (update?.message) {
    await handleMessage(update.message);
    return;
  }

  if (update?.callback_query) {
    await handleCallback(update.callback_query);
  }
}

async function handleMessage(message) {
  const chatId = message?.chat?.id;
  const text = typeof message?.text === "string" ? message.text.trim() : "";

  if (!chatId) {
    return;
  }

  if (!text) {
    await sendMessage(
      chatId,
      "Я понимаю только текст. Просто напишите событие в стиле: Что если СССР не распался в 1991 году?"
    );
    return;
  }

  const session = getChatSession(chatId);

  if (text === "/start") {
    session.currentEvent = "";
    session.context = [];
    session.lastScenario = null;
    await writeState(state);
    await sendWelcome(chatId, session.mode);
    return;
  }

  if (text === "/help") {
    await sendHelp(chatId, session.mode);
    return;
  }

  if (text === "/mode") {
    await sendModePicker(chatId, session.mode);
    return;
  }

  if (text === "/reset") {
    session.currentEvent = "";
    session.context = [];
    session.lastScenario = null;
    await writeState(state);
    await sendMessage(
      chatId,
      `Контекст очищен. Режим остался: ${getModeLabel(session.mode)}.\n\nТеперь просто пришлите новый вопрос в формате "Что если ...?"`
    );
    return;
  }

  if (text === "/random") {
    const example = getRandomExample();
    await sendMessage(chatId, `Пробуем случайный пример:\n\n${example}`);
    await startNewScenario(chatId, example);
    return;
  }

  if (text.startsWith("/")) {
    await sendHelp(chatId, session.mode);
    return;
  }

  await startNewScenario(chatId, text);
}

async function handleCallback(query) {
  const chatId = query?.message?.chat?.id;
  const data = typeof query?.data === "string" ? query.data : "";

  if (!chatId || !data) {
    await answerCallbackQuery(query?.id);
    return;
  }

  const session = getChatSession(chatId);

  if (data.startsWith("mode:")) {
    const modeId = data.slice("mode:".length);
    if (!MODE_MENU.some((entry) => entry.id === modeId)) {
      await answerCallbackQuery(query.id, "Неизвестный режим");
      return;
    }

    session.mode = modeId;
    await writeState(state);
    await answerCallbackQuery(query.id, `Режим: ${getModeLabel(modeId)}`);
    await sendMessage(
      chatId,
      `Режим переключен на "${getModeLabel(modeId)}".\n\nТеперь отправьте событие или нажмите /random.`
    );
    return;
  }

  if (data === "menu:mode") {
    await answerCallbackQuery(query.id);
    await sendModePicker(chatId, session.mode);
    return;
  }

  if (data === "random") {
    const example = getRandomExample();
    await answerCallbackQuery(query.id, "Выбрал случайный сценарий");
    await sendMessage(chatId, `Пробуем случайный пример:\n\n${example}`);
    await startNewScenario(chatId, example);
    return;
  }

  if (data.startsWith("branch:")) {
    const index = Number.parseInt(data.slice("branch:".length), 10);
    const branch = session.lastScenario?.branches?.[index];

    if (!branch || !session.currentEvent || !session.lastScenario) {
      await answerCallbackQuery(query.id, "Сначала создайте новый сценарий");
      return;
    }

    await answerCallbackQuery(query.id, "Продолжаю выбранную ветку");
    await continueScenario(chatId, branch);
    return;
  }

  await answerCallbackQuery(query.id);
}

async function startNewScenario(chatId, event) {
  const session = getChatSession(chatId);
  session.currentEvent = event;
  session.context = [];
  session.lastScenario = null;
  await writeState(state);

  await generateAndSendScenario(chatId, {
    event,
    branch: "",
    context: [],
  });
}

async function continueScenario(chatId, branch) {
  const session = getChatSession(chatId);
  if (!session.currentEvent || !session.lastScenario) {
    await sendMessage(chatId, "Сначала пришлите новый вопрос в формате: Что если ...?");
    return;
  }

  const contextForCall = [
    ...session.context,
    scenarioToContextEntry(session.lastScenario),
  ].slice(-4);

  await generateAndSendScenario(chatId, {
    event: session.currentEvent,
    branch,
    context: contextForCall,
  });
}

async function generateAndSendScenario(chatId, payload) {
  if (pendingChats.has(chatId)) {
    await sendMessage(chatId, "Я уже считаю предыдущий сценарий. Подождите пару секунд.");
    return;
  }

  pendingChats.add(chatId);
  const session = getChatSession(chatId);

  try {
    await sendChatAction(chatId, "typing");

    const result = await buildAltHistoryScenario({
      event: payload.event,
      branch: payload.branch,
      context: payload.context,
      mode: session.mode,
    });

    const scenario = {
      ...result.scenario,
      selectedBranch: payload.branch || "",
    };

    if (payload.branch) {
      session.context = payload.context.slice(-4);
    } else {
      session.context = [];
    }

    session.currentEvent = payload.event;
    session.lastScenario = scenario;
    await writeState(state);

    await sendScenario(chatId, scenario, result);
  } catch (error) {
    const message =
      error && typeof error.message === "string"
        ? error.message
        : "Не удалось построить сценарий.";
    await sendMessage(chatId, `Ошибка:\n${message}`);
  } finally {
    pendingChats.delete(chatId);
  }
}

async function sendScenario(chatId, scenario, meta) {
  const cardSent = await sendScenarioCard(chatId, scenario, meta);
  if (!cardSent) {
    throw new Error("Не удалось собрать карточку сценария.");
  }

  await sendBranchPicker(chatId, scenario.branches);

  if (Array.isArray(scenario.images) && scenario.images.length > 0) {
    for (const [index, image] of scenario.images.entries()) {
      try {
        await sendChatAction(chatId, "upload_photo");
        await sendPhoto(chatId, image.src, {
          caption:
            index === 0
              ? "Иллюстрация альтернативного мира"
              : "Еще одна иллюстрация этой ветки",
        });
      } catch (error) {
        console.warn("Image send skipped:", error?.message || error);
      }
    }
  }
}

async function sendWelcome(chatId, currentMode) {
  const lines = [
    "Я бот сайта «Эффект Бабочки».",
    "Просто отправьте вопрос в формате: Что если ...?",
    "",
    "Команды:",
    "/mode - выбрать стиль ответа",
    "/random - случайный пример",
    "/reset - очистить текущую ветку",
    "/help - короткая помощь",
  ];

  await sendMessage(chatId, lines.filter(Boolean).join("\n"));
  await sendModePicker(chatId, currentMode);
}

async function sendHelp(chatId, currentMode) {
  await sendMessage(
    chatId,
    [
      `Текущий режим: ${getModeLabel(currentMode)}`,
      "",
      "Как пользоваться:",
      "1. Пишите событие в формате: Что если СССР не распался в 1991 году?",
      "2. Бот пришлет текст, таймлайн и кнопки продолжения.",
      "3. Нажимайте на кнопки, чтобы развивать именно эту ветку.",
      "",
      "Команды:",
      "/mode - сменить режим",
      "/random - случайный пример",
      "/reset - начать с чистого листа",
    ].join("\n")
  );
}

async function sendModePicker(chatId, currentMode) {
  const rows = [];
  for (let index = 0; index < MODE_MENU.length; index += 2) {
    const row = MODE_MENU.slice(index, index + 2).map((mode) => ({
      text: mode.id === currentMode ? `• ${mode.label}` : mode.label,
      callback_data: `mode:${mode.id}`,
    }));
    rows.push(row);
  }

  rows.push([
    { text: "Случайный пример", callback_data: "random" },
  ]);

  await sendMessage(chatId, "Выберите режим ответа:", {
    reply_markup: {
      inline_keyboard: rows,
    },
  });
}

async function sendBranchPicker(chatId, branches) {
  const keyboard = branches.slice(0, 3).map((branch, index) => [
    {
      text: shorten(branch, 56),
      callback_data: `branch:${index}`,
    },
  ]);

  keyboard.push([
    { text: "Сменить режим", callback_data: "menu:mode" },
  ]);

  await sendMessage(chatId, "Что делаем дальше?", {
    reply_markup: {
      inline_keyboard: keyboard,
    },
  });
}

function scenarioToContextEntry(scenario) {
  return {
    branch: scenario?.selectedBranch || "",
    narrative: scenario?.narrative || "",
    timeline: Array.isArray(scenario?.timeline) ? scenario.timeline : [],
  };
}

function getChatSession(chatId) {
  const id = String(chatId);
  if (!state.chats[id]) {
    state.chats[id] = {
      mode: "realism",
      currentEvent: "",
      context: [],
      lastScenario: null,
    };
  }
  return state.chats[id];
}

async function readState() {
  try {
    const raw = await fs.readFile(STATE_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return {
      lastUpdateId: Number(parsed?.lastUpdateId) || 0,
      chats: parsed?.chats && typeof parsed.chats === "object" ? parsed.chats : {},
    };
  } catch (error) {
    if (error?.code === "ENOENT") {
      return structuredClone(baseState);
    }
    throw error;
  }
}

async function writeState(nextState) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tempPath = `${STATE_FILE}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(nextState, null, 2), "utf-8");
  await fs.rename(tempPath, STATE_FILE);
}

async function telegramCall(method, payload) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;
  const options = {
    method: "POST",
  };

  if (payload instanceof FormData) {
    options.body = payload;
  } else {
    options.headers = { "Content-Type": "application/json" };
    options.body = JSON.stringify(payload || {});
  }

  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data?.ok) {
    const description =
      data?.description ||
      `${response.status} ${response.statusText}`.trim() ||
      "Telegram API error";
    throw new Error(description);
  }

  return data.result;
}

async function sendMessage(chatId, text, extra = {}) {
  const chunks = splitMessage(text, 3800);
  for (let index = 0; index < chunks.length; index += 1) {
    const isLast = index === chunks.length - 1;
    await telegramCall("sendMessage", {
      chat_id: chatId,
      text: chunks[index],
      disable_web_page_preview: true,
      ...extra,
      reply_markup: isLast ? extra.reply_markup : undefined,
    });
  }
}

async function sendPhoto(chatId, source, options = {}) {
  if (typeof source !== "string" || !source.trim()) {
    return;
  }

  if (source.startsWith("data:image/")) {
    const { mimeType, buffer } = decodeDataImage(source);
    const form = new FormData();
    form.set("chat_id", String(chatId));
    form.set(
      "photo",
      new Blob([buffer], { type: mimeType }),
      `scenario.${mimeType.split("/")[1] || "png"}`
    );

    if (options.caption) {
      form.set("caption", shorten(options.caption, 1000));
    }

    await telegramCall("sendPhoto", form);
    return;
  }

  await telegramCall("sendPhoto", {
    chat_id: chatId,
    photo: source,
    caption: options.caption ? shorten(options.caption, 1000) : undefined,
  });
}

async function sendScenarioCard(chatId, scenario, meta) {
  try {
    const pngBuffer = renderScenarioCardPng(scenario);
    const form = new FormData();
    form.set("chat_id", String(chatId));
    form.set(
      "photo",
      new Blob([pngBuffer], { type: "image/png" }),
      "scenario-card.png"
    );

    const caption = [
      `Режим: ${getModeLabel(scenario.mode)}`,
      meta?.provider ? `Провайдер: ${meta.provider}` : "",
      meta?.model ? `Модель: ${meta.model}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    if (caption) {
      form.set("caption", shorten(caption, 1000));
    }

    await telegramCall("sendPhoto", form);
    return true;
  } catch (error) {
    console.error("Card render error:", error?.message || error);
    return false;
  }
}

async function sendChatAction(chatId, action) {
  try {
    await telegramCall("sendChatAction", {
      chat_id: chatId,
      action,
    });
  } catch {
    // not critical
  }
}

async function answerCallbackQuery(callbackQueryId, text = "") {
  if (!callbackQueryId) return;
  try {
    await telegramCall("answerCallbackQuery", {
      callback_query_id: callbackQueryId,
      text: text || undefined,
      show_alert: false,
    });
  } catch {
    // not critical
  }
}

function splitMessage(text, maxLength) {
  const normalized = String(text || "").trim();
  if (!normalized) {
    return ["Пустой ответ."];
  }

  if (normalized.length <= maxLength) {
    return [normalized];
  }

  const chunks = [];
  let rest = normalized;

  while (rest.length > maxLength) {
    let slicePoint = rest.lastIndexOf("\n\n", maxLength);
    if (slicePoint < maxLength * 0.4) {
      slicePoint = rest.lastIndexOf("\n", maxLength);
    }
    if (slicePoint < maxLength * 0.4) {
      slicePoint = rest.lastIndexOf(" ", maxLength);
    }
    if (slicePoint < maxLength * 0.4) {
      slicePoint = maxLength;
    }

    chunks.push(rest.slice(0, slicePoint).trim());
    rest = rest.slice(slicePoint).trim();
  }

  if (rest) {
    chunks.push(rest);
  }

  return chunks;
}

function decodeDataImage(dataUrl) {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+)(?:;charset=[^;,]+)?;base64,(.+)$/);
  if (!match) {
    throw new Error("Некорректный data URL картинки.");
  }

  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
}

function shorten(value, maxLength) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function renderScenarioCardPng(scenario) {
  const svg = buildScenarioCardSvg(scenario);
  const resvg = new Resvg(svg, {
    fitTo: {
      mode: "width",
      value: 1080,
    },
  });
  return resvg.render().asPng();
}

function buildScenarioCardSvg(scenario) {
  const card = scenario?.shareCard || {};
  const footer = parseShareCardFooter(card.footer);
  const modeLabel = getModeLabel(scenario?.mode);
  const titleLines = wrapText(card.title || scenario?.event || "Что если?", 24, 4);
  const subtitleLines = wrapText(
    card.subtitle || "Альтернативная история, которой хочется поделиться",
    34,
    3
  );
  const storyParagraphs = buildStoryParagraphs(scenario?.narrative || "");

  const titleBlock = renderSvgLines(
    titleLines,
    84,
    288,
    70,
    78,
    "#f5fbfb",
    800
  );

  const subtitleStartY = 288 + titleLines.length * 78 + 36;
  const subtitleBlock = renderSvgLines(
    subtitleLines,
    84,
    subtitleStartY,
    34,
    42,
    "rgba(235,245,245,0.92)",
    600
  );

  const storyStartY = subtitleStartY + subtitleLines.length * 42 + 76;
  const storyBlock = renderNarrativeParagraphs(storyParagraphs, storyStartY);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#081515" />
      <stop offset="45%" stop-color="#0f2422" />
      <stop offset="100%" stop-color="#171717" />
    </linearGradient>
    <radialGradient id="glow" cx="0.85" cy="0.1" r="0.8">
      <stop offset="0%" stop-color="rgba(124,225,217,0.34)" />
      <stop offset="100%" stop-color="rgba(124,225,217,0)" />
    </radialGradient>
    <linearGradient id="panel" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(9,13,13,0.55)" />
      <stop offset="100%" stop-color="rgba(7,7,7,0.78)" />
    </linearGradient>
  </defs>
  <rect width="1080" height="1920" fill="url(#bg)" />
  <rect width="1080" height="1920" fill="url(#glow)" />
  <rect x="42" y="42" width="996" height="1836" rx="34" fill="url(#panel)" stroke="rgba(124,225,217,0.28)" stroke-width="2" />
  <text x="84" y="116" font-family="'IBM Plex Sans', 'Segoe UI', sans-serif" font-size="28" fill="#7ce1d9" letter-spacing="2">ЧТО ЕСЛИ?</text>
  <rect x="768" y="76" width="230" height="54" rx="27" fill="rgba(124,225,217,0.14)" stroke="rgba(124,225,217,0.28)" />
  <text x="883" y="111" text-anchor="middle" font-family="'IBM Plex Sans', 'Segoe UI', sans-serif" font-size="26" font-weight="700" fill="#d7f6f3">${escapeXml(modeLabel)}</text>
  ${titleBlock}
  ${subtitleBlock}
  ${storyBlock}
  <rect x="84" y="1712" width="912" height="124" rx="28" fill="rgba(124,225,217,0.10)" stroke="rgba(124,225,217,0.22)" />
  <text x="132" y="1765" font-family="'IBM Plex Sans', 'Segoe UI', sans-serif" font-size="30" font-weight="700" fill="#f1fbfb">${escapeXml(footer.domain)}</text>
  <text x="132" y="1808" font-family="'IBM Plex Sans', 'Segoe UI', sans-serif" font-size="24" fill="rgba(235,245,245,0.82)">${escapeXml(footer.cta)}</text>
</svg>`;
}

function buildStoryParagraphs(narrative) {
  const text = String(narrative || "").replace(/\r/g, "").trim();
  if (!text) {
    return ["Гипотеза готова, но текст оказался пустым."];
  }

  const normalized = text.replace(/[ \t]+/g, " ");
  const explicitParagraphs = normalized
    .split(/\n{2,}/)
    .map((block) => block.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  if (explicitParagraphs.length > 0) {
    return explicitParagraphs.slice(0, 4);
  }

  const sentences = normalized
    .match(/[^.!?]+[.!?…]?/g)
    ?.map((sentence) => sentence.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  if (!sentences || sentences.length <= 1) {
    return [normalized];
  }

  const paragraphs = [];
  for (let index = 0; index < sentences.length; index += 2) {
    const paragraph = sentences.slice(index, index + 2).join(" ").trim();
    if (paragraph) {
      paragraphs.push(paragraph);
    }
    if (paragraphs.length >= 4) {
      break;
    }
  }

  return paragraphs;
}

function renderNarrativeParagraphs(paragraphs, startY) {
  const blocks = [];
  let currentY = startY;

  for (const paragraph of paragraphs) {
    const lines = wrapText(paragraph, 50, 6);
    blocks.push(
      renderSvgLines(lines, 84, currentY, 30, 40, "rgba(245,251,251,0.92)", 500)
    );
    currentY += lines.length * 40 + 34;
    if (currentY > 1640) {
      break;
    }
  }

  return blocks.join("\n  ");
}

function parseShareCardFooter(value) {
  const defaultDomain = "butterfly-history.ru";
  const defaultCta = "смоделировать свою ветку реальности";
  const raw = String(value || "").trim();

  if (!raw) {
    return { domain: defaultDomain, cta: defaultCta };
  }

  if (raw.includes("\n")) {
    const parts = raw
      .split("\n")
      .map((item) => String(item || "").trim())
      .filter(Boolean);
    return {
      domain: parts[0] || defaultDomain,
      cta: parts[1] || defaultCta,
    };
  }

  return {
    domain: raw,
    cta: defaultCta,
  };
}

function wrapText(value, maxChars, maxLines) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
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
    if (lines.length >= maxLines - 1) {
      break;
    }
  }

  if (lines.length < maxLines && current) {
    lines.push(current);
  }

  if (lines.length === maxLines) {
    const joined = lines.join(" ");
    if (joined.length < text.length && !lines[maxLines - 1].endsWith("…")) {
      lines[maxLines - 1] = shorten(lines[maxLines - 1], Math.max(8, maxChars - 1));
      if (!lines[maxLines - 1].endsWith("…")) {
        lines[maxLines - 1] = `${lines[maxLines - 1]}…`;
      }
    }
  }

  return lines.slice(0, maxLines);
}

function renderSvgLines(lines, x, startY, fontSize, lineHeight, color, weight) {
  return lines
    .map(
      (line, index) =>
        `<text x="${x}" y="${startY + index * lineHeight}" font-family="'IBM Plex Sans', 'Segoe UI', sans-serif" font-size="${fontSize}" font-weight="${weight}" fill="${color}">${escapeXml(line)}</text>`
    )
    .join("\n  ");
}

function escapeXml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&apos;");
}
