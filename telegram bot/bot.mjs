/**
 * bot.mjs — Telegram-бот «Эффект Бабочки»
 *
 * Переменные окружения (из родительского .env или своего):
 *   BOT_TOKEN          — токен бота от @BotFather (обязательно)
 *   BUTTERFLY_API_URL  — URL основного сервера (по умолчанию http://localhost:3000)
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url'; // handles spaces and special chars in paths
import { Telegraf, Markup } from 'telegraf';

import {
  getUser,
  getRemainingRequests,
  canMakeRequest,
  consumeRequest,
  refundRequest,
  addPaidRequests,
  getStoreStats,
  FREE_REQUESTS,
} from './store.mjs';
import { generateScenario } from './ai.mjs';
import { generateCardPng } from './card.mjs';

// ─── Env loading ─────────────────────────────────────────────────────────────

loadEnv();

// ─── Config ───────────────────────────────────────────────────────────────────

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('❌  BOT_TOKEN не задан. Добавьте его в .env.');
  process.exit(1);
}

const ADMIN_USER_IDS = new Set(
  String(process.env.ADMIN_USER_IDS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
);
const SUPPORT_USERNAME = normalizeTelegramUsername(process.env.SUPPORT_USERNAME);
const SUPPORT_EMAIL = String(process.env.SUPPORT_EMAIL || 'klimovphotography@ya.ru').trim();
const SUPPORT_URL = String(process.env.SUPPORT_URL || '').trim();
const TERMS_URL = String(process.env.TERMS_URL || '').trim();

const MODE_LABELS = {
  realism:    '⚡ Реализм',
  dark:       '🌑 Мрачная хроника',
  prosperity: '🌟 Процветание',
  madness:    '🌀 Безумие',
  humor:      '😄 Юмор',
};

// Stars packages: { id, label, requests, stars }
const STAR_PACKAGES = [
  { id: 'pkg10',  label: '10 сценариев',  requests: 10,  stars: 50  },
  { id: 'pkg50',  label: '50 сценариев',  requests: 50,  stars: 200 },
];

const PUBLIC_BOT_COMMANDS = [
  { command: 'start',      description: 'Начать заново' },
  { command: 'help',       description: 'Как пользоваться ботом' },
  { command: 'status',     description: 'Мой баланс запросов' },
  { command: 'buy',        description: 'Купить запросы' },
  { command: 'support',    description: 'Поддержка' },
  { command: 'paysupport', description: 'Вопросы по оплате' },
  { command: 'terms',      description: 'Условия использования' },
];

// ─── In-memory state ──────────────────────────────────────────────────────────

/**
 * pendingEvents: userId → eventText
 * Stores what the user just wrote before selecting a mode.
 */
const pendingEvents = new Map();

/**
 * scenarioCache: scenarioId → { event, mode, context }
 * Used for branch continuation when user clicks a branch button.
 * Auto-cleaned after 2 hours.
 */
const scenarioCache = new Map();

function cacheScenario(event, mode, context) {
  const id = crypto.randomBytes(5).toString('hex');
  scenarioCache.set(id, { event, mode, context, ts: Date.now() });

  // Lazy cleanup: remove entries older than 2 hours
  for (const [key, val] of scenarioCache) {
    if (Date.now() - val.ts > 2 * 60 * 60 * 1000) scenarioCache.delete(key);
  }

  return id;
}

function normalizeTelegramUsername(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw.startsWith('@') ? raw : `@${raw}`;
}

// ─── Keyboards ───────────────────────────────────────────────────────────────

const MODE_KEYBOARD = Markup.inlineKeyboard([
  [
    Markup.button.callback('⚡ Реализм',         'mode:realism'),
    Markup.button.callback('🌑 Мрачная хроника', 'mode:dark'),
  ],
  [
    Markup.button.callback('🌟 Процветание',     'mode:prosperity'),
    Markup.button.callback('🌀 Безумие',         'mode:madness'),
  ],
  [Markup.button.callback('😄 Юмор',            'mode:humor')],
]);

function buildBuyKeyboard() {
  return Markup.inlineKeyboard(
    STAR_PACKAGES.map((pkg) => [
      Markup.button.callback(
        `${pkg.label} — ${pkg.stars} ⭐`,
        `buy:${pkg.id}`
      ),
    ])
  );
}

function buildBranchKeyboard(branches, scenarioId) {
  if (!branches?.length) return null;
  const buttons = branches
    .slice(0, 3)
    .map((b, i) => [Markup.button.callback(`↪ ${b}`, `branch:${scenarioId}:${i}`)]);
  buttons.push([Markup.button.callback('🔄 Новый вопрос', 'new')]);
  return Markup.inlineKeyboard(buttons);
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

/** Escapes characters reserved in HTML parse_mode */
function h(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function ha(text) {
  return h(text).replace(/"/g, '&quot;');
}

/** Highlights 4-digit years in a string using <code> tags */
function highlightYears(text) {
  return h(text).replace(/\b(1[0-9]{3}|20[0-9]{2}|2100)\b/g, '<code>$1</code>');
}

/** Formats remaining requests with emoji */
function remainingLabel(n) {
  const count = Math.max(0, Number(n) || 0);
  const mod10 = count % 10;
  const mod100 = count % 100;

  let word = 'запросов';
  if (mod10 === 1 && mod100 !== 11) {
    word = 'запрос';
  } else if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) {
    word = 'запроса';
  }

  return `${count} ${word}`;
}

/** Builds the fallback text message when image generation fails */
function buildNarrativeMessage(scenario, remaining) {
  const title   = h(scenario.event || scenario.shareCard?.title || '');
  const mode    = h(MODE_LABELS[scenario.mode] || '');
  const narr    = highlightYears(scenario.narrative || '');
  const rem     = remainingLabel(remaining);

  return `<b>${title}</b> ${mode}\n\n${narr}\n\n<i>Осталось запросов: ${rem}</i>`;
}

function buildPhotoReplyOptions(keyboard) {
  if (!keyboard?.reply_markup) return {};
  return { reply_markup: keyboard.reply_markup };
}

function isAdmin(userId) {
  return ADMIN_USER_IDS.has(String(userId));
}

function findStarPackage(pkgId) {
  return STAR_PACKAGES.find((pkg) => pkg.id === pkgId) || null;
}

function parseInvoicePayload(rawPayload) {
  try {
    const parsed = JSON.parse(rawPayload);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function validatePayment(rawPayload, currency, totalAmount) {
  const payload = parseInvoicePayload(rawPayload);
  const pkg = findStarPackage(payload.pkgId);
  if (!pkg) {
    return { ok: false, reason: 'Пакет оплаты не найден.', payload, pkg: null };
  }
  if (currency !== 'XTR') {
    return { ok: false, reason: 'Неверная валюта оплаты.', payload, pkg };
  }
  if (totalAmount !== pkg.stars) {
    return { ok: false, reason: 'Сумма оплаты не совпадает с пакетом.', payload, pkg };
  }
  return { ok: true, reason: '', payload, pkg };
}

async function sendScenarioResponse(ctx, { scenario, remaining, keyboard, cardBuffer }) {
  if (cardBuffer) {
    await ctx.replyWithPhoto(
      { source: cardBuffer, filename: 'scenario.png' },
      buildPhotoReplyOptions(keyboard)
    );
    return;
  }

  await ctx.replyWithHTML(buildNarrativeMessage(scenario, remaining), keyboard || undefined);
}

function buildSupportText() {
  const contacts = [];

  if (SUPPORT_USERNAME) {
    contacts.push(`Telegram: <code>${h(SUPPORT_USERNAME)}</code>`);
  }
  if (SUPPORT_EMAIL) {
    contacts.push(`Email: <code>${h(SUPPORT_EMAIL)}</code>`);
  }
  if (SUPPORT_URL) {
    contacts.push(`Ссылка: <a href="${ha(SUPPORT_URL)}">${h(SUPPORT_URL)}</a>`);
  }

  if (contacts.length === 0) {
    return (
      `🛟 <b>Поддержка</b>\n\n` +
      `Контакты поддержки пока не настроены.\n` +
      `Добавьте в .env хотя бы один из параметров: ` +
      `<code>SUPPORT_USERNAME</code>, <code>SUPPORT_EMAIL</code> или <code>SUPPORT_URL</code>.`
    );
  }

  return (
    `🛟 <b>Поддержка</b>\n\n` +
    `Если есть вопросы по оплате, зачислению запросов или работе бота, пишите сюда:\n\n` +
    `${contacts.join('\n')}`
  );
}

function buildTermsText() {
  let text =
    `📄 <b>Условия использования</b>\n\n` +
    `1. Бот генерирует альтернативные исторические сценарии по вашему запросу.\n` +
    `2. Покупка в боте даёт пакет запросов, а не подписку.\n` +
    `3. Запрос считается использованным после успешной генерации ответа.\n` +
    `4. Если произошла техническая ошибка и запрос списался зря, напишите в поддержку.\n` +
    `5. Сгенерированный контент носит творческий и информационный характер.`;

  if (TERMS_URL) {
    text += `\n\nПолная версия: <a href="${ha(TERMS_URL)}">${h(TERMS_URL)}</a>`;
  }

  return text;
}

/** Builds the welcome/start message */
async function buildWelcomeText(userId) {
  const user = await getUser(userId);
  const remaining = (user.freeLeft || 0) + (user.paid || 0);
  return (
    `👋 Добро пожаловать в <b>Эффект Бабочки</b>!\n\n` +
    `Напишите вопрос в формате <b>«Что если...»</b> — и ИИ построит альтернативную ветку истории с таймлайном и карточкой-картинкой.\n\n` +
    `<b>Сейчас доступно: ${remainingLabel(remaining)}.</b>\n` +
    `Стартовый пакет: ${remainingLabel(FREE_REQUESTS)} бесплатно, дальше — за ⭐️ Звёзды Telegram.\n\n` +
    `Команды:\n` +
    `/status — остаток запросов\n` +
    `/buy — купить больше запросов\n` +
    `/support — поддержка\n` +
    `/terms — условия\n` +
    `/help — справка`
  );
}

// ─── Bot setup ────────────────────────────────────────────────────────────────

const bot = new Telegraf(BOT_TOKEN);

async function syncTelegramCommands() {
  await bot.telegram.setMyCommands(PUBLIC_BOT_COMMANDS);
  await bot.telegram.setChatMenuButton({
    menuButton: { type: 'commands' },
  });

  for (const adminId of ADMIN_USER_IDS) {
    const chatId = Number(adminId);
    if (!Number.isFinite(chatId)) continue;

    await bot.telegram.setMyCommands(PUBLIC_BOT_COMMANDS, {
      scope: { type: 'chat', chat_id: chatId },
    });
  }
}

// ─── /start ───────────────────────────────────────────────────────────────────

bot.start(async (ctx) => {
  const text = await buildWelcomeText(ctx.from.id);
  await ctx.replyWithHTML(text);
});

// ─── /help ────────────────────────────────────────────────────────────────────

bot.command('help', async (ctx) => {
  await ctx.replyWithHTML(
    `<b>Как пользоваться ботом:</b>\n\n` +
    `1. Напишите вопрос — например:\n` +
    `<i>«Что если Гитлер поступил в Венскую академию художеств?»</i>\n\n` +
    `2. Выберите режим генерации:\n` +
    `  ⚡ <b>Реализм</b> — правдоподобный анализ\n` +
    `  🌑 <b>Мрачная хроника</b> — катастрофический сценарий\n` +
    `  🌟 <b>Процветание</b> — оптимистичный мир\n` +
    `  🌀 <b>Безумие</b> — неожиданные повороты\n` +
    `  😄 <b>Юмор</b> — сатирическая история\n\n` +
    `3. Получите карточку-картинку с полным текстом.\n` +
    `4. Выберите ветку продолжения или задайте новый вопрос.\n\n` +
    `<b>Квота:</b> ${remainingLabel(FREE_REQUESTS)} бесплатно, затем — ⭐ Звёзды.\n` +
    `/status — ваш баланс\n` +
    `/buy — купить запросы\n` +
    `/support — поддержка\n` +
    `/terms — условия`
  );
});

// ─── /status ─────────────────────────────────────────────────────────────────

bot.command('status', async (ctx) => {
  const user = await getUser(ctx.from.id);
  const free    = user.freeLeft || 0;
  const paid    = user.paid || 0;
  const total   = user.totalGenerated || 0;
  const remaining = free + paid;

  let text = `📊 <b>Ваш баланс</b>\n\n`;
  text += `Бесплатных: <b>${free}</b>\n`;
  text += `Купленных: <b>${paid}</b>\n`;
  text += `Всего доступно: <b>${remainingLabel(remaining)}</b>\n`;
  text += `Всего сгенерировано: ${total}\n`;

  if (remaining === 0) {
    text += `\n💫 Закончились запросы? Купите ещё! /buy`;
  }

  await ctx.replyWithHTML(text);
});

bot.command('myid', async (ctx) => {
  await ctx.replyWithHTML(
    `🪪 <b>Ваш Telegram ID</b>\n\n` +
    `<code>${ctx.from.id}</code>\n\n` +
    `Если хотите открыть доступ к <code>/admin_stats</code>, добавьте этот ID в <code>ADMIN_USER_IDS</code> и перезапустите бота.`
  );
});

bot.command('admin_stats', async (ctx) => {
  if (!isAdmin(ctx.from.id)) {
    return ctx.replyWithHTML(
      `Эта команда доступна только админу.\n\n` +
      `Ваш Telegram ID: <code>${ctx.from.id}</code>\n` +
      `Добавьте его в <code>ADMIN_USER_IDS</code> и перезапустите бота.`
    );
  }

  const stats = await getStoreStats();
  const text =
    `🛠 <b>Статистика бота</b>\n\n` +
    `Пользователей: <b>${stats.totalUsers}</b>\n` +
    `Новых за 7 дней: <b>${stats.newUsers7d}</b>\n` +
    `Плативших пользователей: <b>${stats.usersWithPurchases}</b>\n` +
    `Всего генераций: <b>${stats.totalGenerated}</b>\n` +
    `Всего покупок: <b>${stats.totalPayments}</b>\n` +
    `Куплено запросов: <b>${stats.totalPurchasedRequests}</b>\n` +
    `Осталось бесплатных: <b>${stats.totalFreeLeft}</b>\n` +
    `Осталось платных: <b>${stats.totalPaidLeft}</b>`;

  await ctx.replyWithHTML(text);
});

bot.command('support', async (ctx) => {
  await ctx.replyWithHTML(buildSupportText());
});

bot.command('paysupport', async (ctx) => {
  await ctx.replyWithHTML(buildSupportText());
});

bot.command('terms', async (ctx) => {
  await ctx.replyWithHTML(buildTermsText());
});

// ─── /buy ─────────────────────────────────────────────────────────────────────

bot.command('buy', async (ctx) => {
  const text =
    `⭐️ <b>Купить запросы за Звёзды Telegram</b>\n\n` +
    `Выберите пакет. Оплата мгновенная, запросы зачисляются сразу.\n\n` +
    `1 ⭐ ≈ $0.013. Без подписок, разовая покупка.`;
  await ctx.replyWithHTML(text, buildBuyKeyboard());
});

// ─── Text messages ────────────────────────────────────────────────────────────

bot.on('text', async (ctx) => {
  // Skip commands
  if (ctx.message.text.startsWith('/')) return;

  const eventText = ctx.message.text.trim();
  if (!eventText || eventText.length < 4) {
    return ctx.reply('Напишите вопрос в формате «Что если...» — минимум 4 символа.');
  }
  if (eventText.length > 500) {
    return ctx.reply('Слишком длинный вопрос. Сократите до 500 символов.');
  }

  // Store the pending question
  pendingEvents.set(ctx.from.id, eventText);

  const remaining = await getRemainingRequests(ctx.from.id);
  if (remaining <= 0) {
    return sendPaywall(ctx);
  }

  const preview = eventText.length > 80 ? `${eventText.slice(0, 77)}…` : eventText;
  await ctx.replyWithHTML(
    `📝 <b>${h(preview)}</b>\n\nВыберите режим генерации:`,
    MODE_KEYBOARD
  );
});

// ─── Mode selection callback ─────────────────────────────────────────────────

bot.action(/^mode:(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();

  const modeId  = ctx.match[1];
  const userId  = ctx.from.id;
  const eventText = pendingEvents.get(userId);

  if (!eventText) {
    return ctx.editMessageText('⏳ Сессия истекла. Напишите вопрос заново.');
  }

  // Double-check quota before deducting
  const canMake = await canMakeRequest(userId);
  if (!canMake) {
    pendingEvents.delete(userId);
    await ctx.editMessageText('У вас закончились запросы.');
    return sendPaywall(ctx);
  }

  // Show loading state
  await ctx.editMessageText(
    `⏳ Моделирую альтернативную ветку...\n\n<b>${h(eventText)}</b>\n\n` +
    `Режим: ${h(MODE_LABELS[modeId] || modeId)}`,
    { parse_mode: 'HTML' }
  );

  let scenario;
  let consumedSource = null;

  try {
    // Deduct quota BEFORE generation so it can't be spammed
    const consumeResult = await consumeRequest(userId);
    if (!consumeResult.ok) {
      await ctx.editMessageText('У вас закончились запросы. /buy');
      return;
    }
    consumedSource = consumeResult.source;

    scenario = await generateScenario({ event: eventText, mode: modeId });
  } catch (error) {
    console.error('Generation error:', error?.message);
    // Refund on failure
    if (consumedSource) await refundRequest(userId, consumedSource);
    await ctx.editMessageText(
      `❌ Ошибка генерации: ${h(error?.message || 'неизвестная ошибка')}.\n\nПопробуйте ещё раз или выберите другой режим.`
    );
    return;
  }

  // Cache scenario for branch continuation
  const initialContext = [];
  const scenarioId = cacheScenario(eventText, modeId, initialContext);

  // Store branches in cache for later use
  const cachedEntry = scenarioCache.get(scenarioId);
  if (cachedEntry) {
    cachedEntry.branches = scenario.branches || [];
    cachedEntry.narrative = scenario.narrative;
  }

  // Generate card image
  let cardBuffer;
  try {
    cardBuffer = await generateCardPng({
      title:     scenario.event || eventText,
      subtitle:  scenario.shareCard?.subtitle || '',
      narrative: scenario.narrative || '',
      modeId,
      modeLabel: MODE_LABELS[modeId]?.replace(/^[^ ]+ /, '') || 'Реализм',
    });
  } catch (imgErr) {
    console.error('Card generation error:', imgErr?.message);
    // If image fails, still send text
  }

  const remaining = await getRemainingRequests(userId);
  const keyboard  = buildBranchKeyboard(scenario.branches, scenarioId);

  // Delete loading message
  try { await ctx.deleteMessage(); } catch { /* ignore */ }

  await sendScenarioResponse(ctx, { scenario, remaining, keyboard, cardBuffer });

  pendingEvents.delete(userId);
});

// ─── Branch continuation callback ────────────────────────────────────────────

bot.action(/^branch:([a-f0-9]+):(\d+)$/, async (ctx) => {
  await ctx.answerCbQuery('Продолжаю историю…');

  const [, scenarioId, branchIdx] = ctx.match;
  const userId = ctx.from.id;

  const cached = scenarioCache.get(scenarioId);
  if (!cached) {
    return ctx.reply('⏳ Эта история уже недоступна (бот был перезапущен). Задайте вопрос заново.');
  }

  const branchText = (cached.branches || [])[Number(branchIdx)];
  if (!branchText) {
    return ctx.reply('Ветка не найдена. Попробуйте другую.');
  }

  // Check quota
  const canMake = await canMakeRequest(userId);
  if (!canMake) {
    return sendPaywall(ctx);
  }

  // Disable the branch buttons so user can't double-click
  try { await ctx.editMessageReplyMarkup({ inline_keyboard: [] }); } catch { /* ignore */ }

  const loadingMsg = await ctx.replyWithHTML(
    `⏳ <b>Развиваю ветку:</b>\n<i>${h(branchText)}</i>`
  );

  let scenario;
  let consumedSource = null;

  try {
    const consumeResult = await consumeRequest(userId);
    if (!consumeResult.ok) {
      await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id).catch(() => {});
      return sendPaywall(ctx);
    }
    consumedSource = consumeResult.source;

    // Build context from cache
    const context = [
      ...(cached.context || []),
      {
        branch:    cached.branches?.[Number(branchIdx)] || '',
        narrative: cached.narrative || '',
        timeline:  [],
      },
    ].slice(-4); // keep last 4 steps

    scenario = await generateScenario({
      event:   cached.event,
      mode:    cached.mode,
      branch:  branchText,
      context,
    });

    // Cache new state for further branching
    const newScenarioId = cacheScenario(cached.event, cached.mode, context);
    const newEntry = scenarioCache.get(newScenarioId);
    if (newEntry) {
      newEntry.branches = scenario.branches || [];
      newEntry.narrative = scenario.narrative;
    }

    // Generate card
    let cardBuffer;
    try {
      cardBuffer = await generateCardPng({
        title:     scenario.event || cached.event,
        subtitle:  scenario.shareCard?.subtitle || branchText,
        narrative: scenario.narrative || '',
        modeId:    cached.mode,
        modeLabel: MODE_LABELS[cached.mode]?.replace(/^[^ ]+ /, '') || 'Реализм',
      });
    } catch { /* fallback to text only */ }

    const remaining = await getRemainingRequests(userId);
    const keyboard  = buildBranchKeyboard(scenario.branches, newScenarioId);

    await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id).catch(() => {});

    await sendScenarioResponse(ctx, { scenario, remaining, keyboard, cardBuffer });

  } catch (error) {
    console.error('Branch generation error:', error?.message);
    if (consumedSource) await refundRequest(userId, consumedSource);
    await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id).catch(() => {});
    await ctx.replyWithHTML(`❌ Ошибка: ${h(error?.message || 'неизвестная ошибка')}. Попробуйте ещё раз.`);
  }
});

// ─── "New question" button ────────────────────────────────────────────────────

bot.action('new', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.replyWithHTML(
    '📝 Напишите новый вопрос в формате <b>«Что если...»</b>'
  );
});

// ─── Buy package callback (show invoice) ─────────────────────────────────────

bot.action(/^buy:(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();

  const pkgId = ctx.match[1];
  const pkg   = findStarPackage(pkgId);
  if (!pkg) return ctx.reply('Пакет не найден.');

  // Telegraf 4: replyWithInvoice takes a single object, not positional args
  await ctx.replyWithInvoice({
    title:       pkg.label,
    description: `Получите ${pkg.requests} сценариев в боте «Эффект Бабочки».`,
    payload:     JSON.stringify({ userId: ctx.from.id, pkgId }),
    currency:    'XTR',
    prices:      [{ label: pkg.label, amount: pkg.stars }],
  });
});

// ─── Pre-checkout: always approve ────────────────────────────────────────────

bot.on('pre_checkout_query', (ctx) => {
  const query = ctx.update.pre_checkout_query;
  const validation = validatePayment(
    query.invoice_payload,
    query.currency,
    query.total_amount
  );

  if (!validation.ok) {
    console.error('Pre-checkout validation failed:', validation.reason);
    return ctx.answerPreCheckoutQuery(false, validation.reason);
  }

  return ctx.answerPreCheckoutQuery(true);
});

// ─── Successful payment ───────────────────────────────────────────────────────

bot.on('message', async (ctx, next) => {
  const payment = ctx.message?.successful_payment;
  if (!payment) return next();

  const validation = validatePayment(
    payment.invoice_payload,
    payment.currency,
    payment.total_amount
  );
  if (!validation.ok || !validation.pkg) {
    console.error('Successful payment validation failed:', validation.reason);
    await ctx.replyWithHTML(
      `⚠️ Оплата пришла, но пакет не удалось подтвердить автоматически.\n` +
      `Проверьте платёж вручную и при необходимости зачислите запросы сами.`
    );
    return;
  }

  const userId = validation.payload.userId ?? ctx.from.id;
  const count = validation.pkg.requests;

  const paymentResult = await addPaidRequests(userId, count, {
    telegramChargeId: payment.telegram_payment_charge_id,
    providerChargeId: payment.provider_payment_charge_id,
  });
  if (!paymentResult.added) {
    await ctx.replyWithHTML(
      `ℹ️ Этот платёж уже был обработан раньше. Повторно ничего не зачисляю.`
    );
    return;
  }

  const remaining = await getRemainingRequests(userId);
  await ctx.replyWithHTML(
    `✅ Оплата прошла! Зачислено <b>${count} запросов</b>.\n` +
    `Теперь у вас <b>${remainingLabel(remaining)}</b>.\n\n` +
    `Задавайте вопросы 🚀`
  );
});

// ─── Paywall helper ───────────────────────────────────────────────────────────

async function sendPaywall(ctx) {
  await ctx.replyWithHTML(
    `⭐️ <b>Бесплатные запросы закончились</b>\n\n` +
    `Купите пакет за Звёзды Telegram — оплата мгновенная, без подписки:`,
    buildBuyKeyboard()
  );
}

// ─── Error handling ───────────────────────────────────────────────────────────

bot.catch((err, ctx) => {
  console.error(`Bot error for ${ctx.updateType}:`, err?.message ?? err);
});

// ─── Launch ───────────────────────────────────────────────────────────────────

bot.launch().then(async () => {
  try {
    await syncTelegramCommands();
    console.log('✅ Команды Telegram обновлены.');
  } catch (error) {
    console.error('⚠️ Не удалось обновить команды Telegram:', error?.message ?? error);
  }

  console.log(`🦋 Butterfly Bot запущен (@${bot.botInfo?.username ?? '?'})`);
});

process.once('SIGINT',  () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

// ─── .env loader ─────────────────────────────────────────────────────────────

function loadEnv() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  // Try parent .env first, then local .env
  const candidates = [
    path.join(__dirname, '..', '.env'),
    path.join(__dirname, '.env'),
  ];

  for (const envPath of candidates) {
    if (!fs.existsSync(envPath)) continue;

    const lines = fs.readFileSync(envPath, 'utf-8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;

      const key = trimmed.slice(0, eq).trim();
      let val   = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = val;
    }
  }
}
