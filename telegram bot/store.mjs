import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORE_FILE = path.join(__dirname, 'data', 'users.json');

export const FREE_REQUESTS = 3;

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

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Returns user record, creating one with free quota if it doesn't exist.
 */
export async function getUser(userId) {
  const store = await readStore();
  const id = String(userId);
  if (!store[id]) {
    store[id] = {
      freeLeft: FREE_REQUESTS,
      paid: 0,
      totalGenerated: 0,
      createdAt: new Date().toISOString(),
    };
    await writeStore(store);
  }
  return store[id];
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
  const store = await readStore();
  const id = String(userId);
  if (!store[id]) {
    store[id] = { freeLeft: FREE_REQUESTS, paid: 0, totalGenerated: 0, createdAt: new Date().toISOString() };
  }
  const user = store[id];

  if ((user.freeLeft || 0) > 0) {
    user.freeLeft -= 1;
  } else if ((user.paid || 0) > 0) {
    user.paid -= 1;
  } else {
    return false;
  }

  user.totalGenerated = (user.totalGenerated || 0) + 1;
  store[id] = user;
  await writeStore(store);
  return true;
}

/**
 * Refunds one request (used when generation fails after deduction).
 */
export async function refundRequest(userId) {
  const store = await readStore();
  const id = String(userId);
  if (!store[id]) return;
  store[id].paid = (store[id].paid || 0) + 1;
  await writeStore(store);
}

/**
 * Adds paid requests after a successful Stars payment.
 */
export async function addPaidRequests(userId, count) {
  const store = await readStore();
  const id = String(userId);
  if (!store[id]) {
    store[id] = { freeLeft: FREE_REQUESTS, paid: 0, totalGenerated: 0, createdAt: new Date().toISOString() };
  }
  store[id].paid = (store[id].paid || 0) + count;

  if (!store[id].payments) store[id].payments = [];
  store[id].payments.push({ count, addedAt: new Date().toISOString() });

  await writeStore(store);
  return store[id];
}
