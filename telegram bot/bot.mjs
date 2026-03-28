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
  if (!branches?.length) return {};
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

/** Highlights 4-digit years in a string using <code> tags */
function highlightYears(text) {
  return h(text).replace(/\b(1[0-9]{3}|20[0-9]{2}|2100)\b/g, '<code>$1</code>');
}

/** Formats remaining requests with emoji */
function remainingLabel(n) {
  if (n <= 0) return '0 запросов';
  return `${n} ${n === 1 ? 'запрос' : n < 5 ? 'запроса' : 'запросов'}`;
}

/** Builds the text message shown below the card image */
function buildNarrativeMessage(scenario, remaining) {
  const title   = h(scenario.event || scenario.shareCard?.title || '');
  const mode    = h(MODE_LABELS[scenario.mode] || '');
  const narr    = highlightYears(scenario.narrative || '');
  const rem     = remainingLabel(remaining);

  return `<b>${title}</b> ${mode}\n\n${narr}\n\n<i>Осталось запросов: ${rem}</i>`;
}

/** Builds the welcome/start message */
async function buildWelcomeText(userId) {
  const user = await getUser(userId);
  const remaining = (user.freeLeft || 0) + (user.paid || 0);
  return (
    `👋 Добро пожаловать в <b>Эффект Бабочки</b>!\n\n` +
    `Напишите вопрос в формате <b>«Что если...»</b> — и ИИ построит альтернативную ветку истории с таймлайном и карточкой-картинкой.\n\n` +
    `<b>У вас ${remainingLabel(remaining)} бесплатно.</b>\n` +
    `После этого — за ⭐️ Звёзды Telegram.\n\n` +
    `Команды:\n` +
    `/status — остаток запросов\n` +
    `/buy — купить больше запросов\n` +
    `/help — справка`
  );
}

// ─── Bot setup ────────────────────────────────────────────────────────────────

const bot = new Telegraf(BOT_TOKEN);

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
    `3. Получите карточку-картинку и полный текст.\n` +
    `4. Выберите ветку продолжения или задайте новый вопрос.\n\n` +
    `<b>Квота:</b> ${FREE_REQUESTS} запроса бесплатно, затем — ⭐ Звёзды.\n` +
    `/status — ваш баланс\n` +
    `/buy — купить запросы`
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
  let consumed = false;

  try {
    // Deduct quota BEFORE generation so it can't be spammed
    consumed = await consumeRequest(userId);
    if (!consumed) {
      await ctx.editMessageText('У вас закончились запросы. /buy');
      return;
    }

    scenario = await generateScenario({ event: eventText, mode: modeId });
  } catch (error) {
    console.error('Generation error:', error?.message);
    // Refund on failure
    if (consumed) await refundRequest(userId);
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
  const caption   = buildNarrativeMessage(scenario, remaining);
  const keyboard  = buildBranchKeyboard(scenario.branches, scenarioId);

  // Delete loading message
  try { await ctx.deleteMessage(); } catch { /* ignore */ }

  // Send card image (or text only if image failed)
  if (cardBuffer) {
    await ctx.replyWithPhoto(
      { source: cardBuffer, filename: 'scenario.png' },
      { caption: `<b>${h(scenario.event || eventText)}</b>`, parse_mode: 'HTML' }
    );
  }

  // Send narrative + branch keyboard
  await ctx.replyWithHTML(caption, keyboard);

  pendingEvents.delete(userId);

  // Nudge to buy if running low
  if (remaining === 1) {
    await ctx.replyWithHTML(
      `⚠️ У вас остался <b>1 запрос</b>. Пополните баланс, чтобы не прерываться. /buy`,
      { disable_notification: true }
    );
  } else if (remaining === 0) {
    await ctx.replyWithHTML(
      `⭐️ Запросы закончились. Купите ещё, чтобы продолжить. /buy`,
      { disable_notification: true }
    );
  }
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
  let consumed = false;

  try {
    consumed = await consumeRequest(userId);
    if (!consumed) {
      await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id).catch(() => {});
      return sendPaywall(ctx);
    }

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
    const caption   = buildNarrativeMessage(scenario, remaining);
    const keyboard  = buildBranchKeyboard(scenario.branches, newScenarioId);

    await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id).catch(() => {});

    if (cardBuffer) {
      await ctx.replyWithPhoto(
        { source: cardBuffer, filename: 'scenario.png' },
        { caption: `<b>${h(scenario.event || cached.event)}</b>`, parse_mode: 'HTML' }
      );
    }

    await ctx.replyWithHTML(caption, keyboard);

    if (remaining === 0) {
      await ctx.replyWithHTML(`⭐️ Запросы закончились. /buy`, { disable_notification: true });
    }

  } catch (error) {
    console.error('Branch generation error:', error?.message);
    if (consumed) await refundRequest(userId);
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
  const pkg   = STAR_PACKAGES.find((p) => p.id === pkgId);
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

bot.on('pre_checkout_query', (ctx) => ctx.answerPreCheckoutQuery(true));

// ─── Successful payment ───────────────────────────────────────────────────────

bot.on('message', async (ctx, next) => {
  const payment = ctx.message?.successful_payment;
  if (!payment) return next();

  let payload = {};
  try { payload = JSON.parse(payment.invoice_payload); } catch { /* ignore */ }

  const userId  = payload.userId ?? ctx.from.id;
  const pkgId   = payload.pkgId;
  const pkg     = STAR_PACKAGES.find((p) => p.id === pkgId);
  const count   = pkg?.requests ?? 10;

  await addPaidRequests(userId, count);

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

bot.launch().then(() => {
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


