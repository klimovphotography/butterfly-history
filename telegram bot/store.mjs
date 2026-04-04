import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORE_FILE = path.join(__dirname, 'data', 'users.json');

export const FREE_REQUESTS = 3;

let storeMutationChain = Promise.resolve();

// ─── Low-level JSON store ────────────────────────────────────────────────────

async function readStore() {
  try {
    const raw = await fsp.readFile(STORE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function writeStore(data) {
  await fsp.mkdir(path.dirname(STORE_FILE), { recursive: true });
  const tmp = `${STORE_FILE}.tmp`;
  await fsp.writeFile(tmp, JSON.stringify(data, null, 2), 'utf-8');
  await fsp.rename(tmp, STORE_FILE);
}

function createUserRecord() {
  return {
    freeLeft: FREE_REQUESTS,
    paid: 0,
    totalGenerated: 0,
    createdAt: new Date().toISOString(),
  };
}

function ensureUserRecord(store, id) {
  if (!store[id]) {
    store[id] = createUserRecord();
  }
  return store[id];
}

function runStoreMutation(task) {
  const run = storeMutationChain.then(task, task);
  storeMutationChain = run.catch(() => {});
  return run;
}

async function waitForPendingStoreMutations() {
  await storeMutationChain.catch(() => {});
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Returns user record, creating one with free quota if it doesn't exist.
 */
export async function getUser(userId) {
  const id = String(userId);
  await waitForPendingStoreMutations();
  const store = await readStore();
  if (store[id]) {
    return store[id];
  }

  return runStoreMutation(async () => {
    const latestStore = await readStore();
    const user = ensureUserRecord(latestStore, id);
    await writeStore(latestStore);
    return user;
  });
}

/**
 * Returns total remaining requests (free + paid).
 */
export async function getRemainingRequests(userId) {
  const user = await getUser(userId);
  return (user.freeLeft || 0) + (user.paid || 0);
}

/**
 * Returns true if user can make a request (has quota).
 */
export async function canMakeRequest(userId) {
  return (await getRemainingRequests(userId)) > 0;
}

/**
 * Deducts one request from the user's quota.
 * Returns true on success, false if no quota left.
 */
export async function consumeRequest(userId) {
  return runStoreMutation(async () => {
    const store = await readStore();
    const id = String(userId);
    const user = ensureUserRecord(store, id);

    let source = null;
    if ((user.freeLeft || 0) > 0) {
      user.freeLeft -= 1;
      source = 'free';
    } else if ((user.paid || 0) > 0) {
      user.paid -= 1;
      source = 'paid';
    } else {
      return { ok: false, source: null };
    }

    user.totalGenerated = (user.totalGenerated || 0) + 1;
    store[id] = user;
    await writeStore(store);

    return { ok: true, source };
  });
}

/**
 * Refunds one request (used when generation fails after deduction).
 */
export async function refundRequest(userId, source = 'paid') {
  return runStoreMutation(async () => {
    const store = await readStore();
    const id = String(userId);
    const user = ensureUserRecord(store, id);

    if (source === 'free') {
      user.freeLeft = (user.freeLeft || 0) + 1;
    } else {
      user.paid = (user.paid || 0) + 1;
    }

    user.totalGenerated = Math.max(0, (user.totalGenerated || 0) - 1);
    store[id] = user;
    await writeStore(store);

    return user;
  });
}

/**
 * Adds paid requests after a successful Stars payment.
 */
export async function addPaidRequests(userId, count, paymentMeta = {}) {
  return runStoreMutation(async () => {
    const store = await readStore();
    const id = String(userId);
    const user = ensureUserRecord(store, id);

    const telegramChargeId = String(paymentMeta.telegramChargeId || '').trim();
    const providerChargeId = String(paymentMeta.providerChargeId || '').trim();
    const hasDuplicatePayment = telegramChargeId &&
      Array.isArray(user.payments) &&
      user.payments.some((payment) => payment?.telegramChargeId === telegramChargeId);

    if (hasDuplicatePayment) {
      return { user, added: false };
    }

    user.paid = (user.paid || 0) + count;
    if (!user.payments) user.payments = [];
    user.payments.push({
      count,
      addedAt: new Date().toISOString(),
      telegramChargeId,
      providerChargeId,
    });

    store[id] = user;
    await writeStore(store);
    return { user, added: true };
  });
}

/**
 * Aggregated bot stats for admin usage.
 */
export async function getStoreStats() {
  await waitForPendingStoreMutations();
  const store = await readStore();
  const users = Object.values(store);
  const now = Date.now();

  return users.reduce((acc, user) => {
    const payments = Array.isArray(user?.payments) ? user.payments : [];
    const createdAt = Date.parse(user?.createdAt || '');

    acc.totalUsers += 1;
    acc.totalGenerated += Number(user?.totalGenerated || 0);
    acc.totalFreeLeft += Number(user?.freeLeft || 0);
    acc.totalPaidLeft += Number(user?.paid || 0);
    acc.usersWithPurchases += payments.length > 0 ? 1 : 0;
    acc.totalPayments += payments.length;
    acc.totalPurchasedRequests += payments.reduce(
      (sum, payment) => sum + Number(payment?.count || 0),
      0
    );

    if (Number.isFinite(createdAt) && now - createdAt <= 7 * 24 * 60 * 60 * 1000) {
      acc.newUsers7d += 1;
    }

    return acc;
  }, {
    totalUsers: 0,
    newUsers7d: 0,
    usersWithPurchases: 0,
    totalGenerated: 0,
    totalPayments: 0,
    totalPurchasedRequests: 0,
    totalFreeLeft: 0,
    totalPaidLeft: 0,
  });
}
