import fs from "node:fs/promises";
import path from "node:path";
import { Buffer } from "node:buffer";
import { fileURLToPath } from "node:url";
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
  const header = [
    `Режим: ${getModeLabel(scenario.mode)}`,
    meta?.provider ? `Провайдер: ${meta.provider}` : "",
    meta?.model ? `Модель: ${meta.model}` : "",
    "",
    `Событие: ${scenario.event}`,
    "",
    scenario.narrative,
  ]
    .filter(Boolean)
    .join("\n");

  await sendMessage(chatId, header);
  await sendMessage(chatId, formatTimeline(scenario.timeline));
  await sendBranchPicker(chatId, scenario.branches);

  if (Array.isArray(scenario.images) && scenario.images.length > 0) {
    for (const [index, image] of scenario.images.entries()) {
      await sendChatAction(chatId, "upload_photo");
      await sendPhoto(chatId, image.src, {
        caption:
          index === 0
            ? "Иллюстрация альтернативного мира"
            : "Еще одна иллюстрация этой ветки",
      });
    }
  }
}

async function sendWelcome(chatId, currentMode) {
  const meta = getDefaultModelMeta();
  const lines = [
    "Я бот сайта «Эффект Бабочки».",
    "Просто отправьте вопрос в формате: Что если ...?",
    "",
    `Текущий режим: ${getModeLabel(currentMode)}`,
    meta.provider ? `Сейчас по умолчанию доступен провайдер: ${meta.provider}` : "",
    meta.model ? `Модель: ${meta.model}` : "",
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

function formatTimeline(timeline) {
  const lines = ["Таймлайн:"];

  for (const point of timeline || []) {
    lines.push(`• ${point.year} — ${point.title}`);
    lines.push(point.details || "Ключевой поворот истории.");
    lines.push("");
  }

  return lines.join("\n").trim();
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
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
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
