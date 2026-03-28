/**
 * ai.mjs — вызывает основной сервер butterfly-history для генерации сценария.
 *
 * Переменные окружения:
 *   BUTTERFLY_API_URL  — базовый URL сервера (по умолчанию http://localhost:3000)
 */

const API_BASE = (process.env.BUTTERFLY_API_URL || 'http://localhost:3000').replace(/\/+$/, '');

/**
 * Генерирует сценарий альтернативной истории.
 *
 * @param {object} opts
 * @param {string} opts.event      — вопрос «Что если...»
 * @param {string} [opts.mode]     — режим: realism | dark | prosperity | madness | humor
 * @param {string} [opts.branch]   — выбранная ветка продолжения (пустая = первый шаг)
 * @param {Array}  [opts.context]  — массив предыдущих шагов (до 4)
 * @param {string} [opts.modelId]  — id конкретной модели (необязательно)
 * @returns {Promise<object>}      — объект scenario из API
 */
export async function generateScenario({ event, mode = 'realism', branch = '', context = [], modelId = '' }) {
  const url = `${API_BASE}/api/alt-history`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, mode, branch, context, modelId }),
  });

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(`Сервер вернул не-JSON ответ (HTTP ${response.status})`);
  }

  if (!response.ok) {
    throw new Error(data?.error || `Ошибка API: HTTP ${response.status}`);
  }

  if (!data?.scenario) {
    throw new Error('Пустой ответ от сервера генерации');
  }

  return data.scenario;
}
