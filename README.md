# Эффект Бабочки

Сайт про альтернативную историю: пользователь пишет вопрос в формате `Что если...`, выбирает настроение генерации, а ИИ строит альтернативную ветку истории и собирает из ответа красивую карточку для просмотра и шеринга.

Этот `README` написан не только для людей, но и для других LLM. Цель: быстро понять, как проект устроен сейчас, где что менять и какие важные связки нельзя сломать.

## Коротко о проекте

- Стек очень простой: `Node.js + server.mjs + чистый HTML/CSS/JS`.
- Фронтенд без React, без сборщика, без TypeScript.
- Сервер тоже без Express: используется встроенный `node:http`.
- Генерация текста идёт через OpenAI-совместимые `chat/completions` API разных провайдеров.
- Карточка сценария рендерится на клиенте и может открываться как `PNG`.
- Сценарии можно шарить:
  - через полный payload в `?scenario=...`
  - или через короткую ссылку `?s=...`
- Для шаринга уже есть динамические `OG meta` (превью для соцсетей) и динамические `OG image` картинки.

## Что уже изменено в текущей версии

Ниже не планы, а фактическое текущее состояние кода.

- Заголовок share-card теперь принудительно равен исходному вопросу пользователя.
- `buildUserPrompt()` уже подталкивает модель писать текст ярче и более “репостно”.
- Системные промпты (`buildSystemMessage`) переписаны под эмоциональные режимы:
  - `realism`
  - `dark`
  - `prosperity`
  - `madness`
  - `humor`
- Основной текст карточки больше не режется по старым жёстким лимитам символов.
- Блок `Ключевые даты` убран из самой share-card.
- Годы внутри narrative подсвечиваются прямо в тексте.
- Сценарий можно восстановить из URL:
  - `?scenario=<base64url payload>`
  - `?s=<short id>`
- Сервер умеет:
  - сохранять короткие ссылки,
  - подмешивать payload в `index.html`,
  - генерировать динамические meta-теги,
  - отдавать `OG PNG/SVG`.
- В тулбаре карточки сейчас оставлена только кнопка `Открыть PNG`.
  Функции копирования текста и нативного шеринга в коде ещё есть, но их кнопки сейчас не выводятся в UI.

## Что нужно для запуска

- `Node.js 18+`
- хотя бы один API ключ для текстовой модели

Поддерживаемые переменные окружения:

- `WORMSOFT_API_KEY`
- `WORMSOFT_MODEL`
- `WORMSOFT_BASE_URL`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `GEMINI_BASE_URL`
- `GROQ_API_KEY`
- `GROQ_MODEL`
- `GROQ_BASE_URL`
- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`
- `OPENROUTER_BASE_URL`
- `OPENROUTER_SITE_URL`
- `OPENROUTER_APP_NAME`
- `MISTRAL_API_KEY`
- `MISTRAL_MODEL`
- `MISTRAL_BASE_URL`
- `HUGGINGFACE_API_KEY`
- `HUGGINGFACE_MODEL`
- `HUGGINGFACE_BASE_URL`
- `AIPRODUCTIV_API_KEY`
- `AIPRODUCTIV_MODEL`
- `AIPRODUCTIV_BASE_URL`
- `FAILOVER_ORDER`
- `SITE_URL`
- `PORT`
- `DATA_DIR`

## Быстрый запуск

```bash
cd "/Users/vasilijklimov/Documents/Codex project"
npm install
```

Создайте `.env`, например так:

```env
WORMSOFT_API_KEY=ваш_ключ
WORMSOFT_MODEL=openai/gpt-5.2
WORMSOFT_BASE_URL=https://ai.wormsoft.ru/api/gpt

GEMINI_API_KEY=ваш_ключ
GEMINI_MODEL=gemini-2.5-flash

GROQ_API_KEY=ваш_ключ
OPENROUTER_API_KEY=ваш_ключ
MISTRAL_API_KEY=ваш_ключ
HUGGINGFACE_API_KEY=ваш_ключ
AIPRODUCTIV_API_KEY=ваш_ключ

# необязательно, но полезно для продакшена
SITE_URL=https://butterfly-history.ru
FAILOVER_ORDER=wormsoft-gpt-5.2,gemini-2.5-flash,groq-llama-3.1-70b

# папка для живых данных сайта вне git-репозитория
DATA_DIR=/root/butterfly-runtime
```

Запуск:

```bash
npm start
```

Режим разработки:

```bash
npm run dev
```

Открыть:

- [http://localhost:3000](http://localhost:3000)

## Как сайт работает

### 1. Пользовательский поток

1. Пользователь вводит событие в `textarea`.
2. Или жмёт `Рандомный сценарий`, чтобы вставить один из готовых примеров.
3. Выбирает режим:
   - `Реализм`
   - `Мрачная хроника`
   - `Эпоха процветания`
   - `Безумие`
   - `Юмор`
4. Фронтенд отправляет `POST /api/alt-history`.
5. Сервер выбирает модель и при необходимости делает failover (переключение на запасной провайдер).
6. Модель возвращает JSON со сценарием.
7. Сервер нормализует ответ и отправляет фронтенду единый объект `scenario`.
8. Фронтенд строит share-card.
9. После генерации фронтенд пытается синхронизировать URL с короткой ссылкой.

### 2. Что приходит с сервера

Нормальная форма ответа:

```json
{
  "scenario": {
    "narrative": "Основной текст сценария",
    "timeline": [
      { "year": 1924, "title": "Перелом", "details": "..." }
    ],
    "branches": ["...", "..."],
    "images": [],
    "shareCard": {
      "title": "Что если ...?",
      "subtitle": "Короткий хук",
      "items": [
        { "year": 1924, "text": "..." }
      ],
      "footer": "butterfly-history.ru\nсмоделировать свою ветку реальности"
    },
    "event": "Что если ...?",
    "mode": "realism"
  }
}
```

Важно:

- `timeline` всё ещё есть в данных, хотя на карточке он больше не выводится отдельной секцией.
- `shareCard.items` тоже всё ещё сохраняется как запасной формат и для совместимости.
- Главный видимый контент карточки сейчас строится из:
  - `shareCard.title`
  - `shareCard.subtitle`
  - `narrative`

## API / endpoint-ы

### `GET /api/meta`

Возвращает информацию о доступной модели для UI:

- текущий провайдер
- подпись модели
- список моделей для интерфейса

### `POST /api/alt-history`

Основной endpoint генерации.

Тело запроса:

```json
{
  "event": "Что если Белое движение победило в Гражданской войне?",
  "branch": "",
  "context": [],
  "mode": "realism",
  "modelId": "wormsoft-gpt-5.2"
}
```

Особенности:

- `event` обязателен.
- `branch` используется для продолжения уже выбранной ветки.
- `context` хранит до 4 прошлых шагов.
- `mode` влияет и на температуру, и на текст промпта.

### `POST /api/share-link`

Создаёт или переиспользует короткую ссылку для сценария.

Вход:

```json
{
  "scenario": "<base64url payload>"
}
```

Выход:

```json
{
  "id": "abc123",
  "url": "https://site/?s=abc123"
}
```

### `GET /api/share-link/:id`

Возвращает сохранённый payload по короткому id.

### `GET /og/scenario.svg?scenario=...`

Генерирует динамическую SVG-картинку для шаринга.

### `GET /og/scenario.png?scenario=...`

Генерирует PNG через `@resvg/resvg-js`.
Если PNG не удалось собрать, сервер делает redirect на SVG-версию.

### `GET /sitemap.xml`

Собирается динамически из HTML-файлов в `public`.

### `GET /robots.txt`

Тоже собирается динамически и подставляет актуальный домен.

## Логика генерации текста

### Режимы

Режимы задаются в `server.mjs`:

- `realism`
- `dark`
- `prosperity`
- `madness`
- `humor`

Для каждого режима есть:

- свой `temperature`
- свой системный промпт

### Важные функции на сервере

- `buildUserPrompt(...)`
  - добавляет событие, ветку, контекст
  - уже просит модель писать “ярко и репостно”
- `buildSystemMessage(...)`
  - задаёт стиль режима
  - требует JSON-формат ответа
- `parseScenarioResponse(...)`
  - разбирает ответ модели
- `normalizeTimeline(...)`
  - чинит timeline, даже если модель вернула мусор или неполный массив
- `normalizeShareCard(...)`
  - принудительно ставит заголовок карточки из исходного `event`

## Логика фронтенда

### Что важно знать

- Всё на чистом DOM API.
- Источник правды для UI — `public/app.js`.
- История сообщений живёт только в DOM, не в базе.
- После генерации отображается одна большая карточка вместо отдельного narrative + timeline списка.

### Важные функции в `public/app.js`

- `startScenario(...)`
  - стартует первый запрос
- `requestScenario(...)`
  - отправляет `POST /api/alt-history`
- `normalizeScenario(...)`
  - приводят ответ сервера к безопасному виду на клиенте
- `addScenarioMessage(...)`
  - вставляет карточку в чат
- `buildShareCard(...)`
  - собирает тулбар и фрейм карточки
- `buildShareCardFrame(...)`
  - строит видимую карточку
- `buildStoryParagraphs(...)`
  - делит narrative на абзацы
- `appendNarrativeWithYearHighlights(...)`
  - подсвечивает годы прямо внутри текста
- `buildScenarioHash(...)` / `parseScenarioHash(...)`
  - кодируют и декодируют payload сценария
- `syncScenarioHash(...)`
  - обновляет URL после генерации
- `hydrateScenarioFromUrl(...)`
  - восстанавливает карточку из `?scenario=` или `?s=`
- `openShareCardImage(...)`
  - открывает карточку как PNG через `html2canvas`

### Важный нюанс по кнопкам

В коде всё ещё есть:

- `buildShareCardText(...)`
- `buildShareTeaser(...)`
- `resolveShareUrl(...)`
- `shareScenarioCard(...)`
- `copyTextToClipboard(...)`

Но в текущем UI в тулбаре остаётся только:

- выбор формата (`Авто`, `9:16`, `1:1`, `16:9`)
- `Открыть PNG`

Если кто-то будет “чистить код”, не надо слепо удалять share-функции:
они всё ещё используются для логики URL и могут понадобиться при возврате кнопок шеринга.

## Share-ссылки и payload сценария

### Формат payload

Клиент кодирует в base64url JSON примерно такой формы:

```json
{
  "v": 1,
  "event": "Что если ...?",
  "mode": "realism",
  "title": "Что если ...?",
  "subtitle": "Короткий хук",
  "narrative": "Основной текст"
}
```

### Критически важная связка

Если менять формат payload, нужно обновлять сразу в двух местах:

- клиент:
  - `buildScenarioHash(...)`
  - `parseScenarioHash(...)`
  - `hydrateScenarioFromUrl(...)`
- сервер:
  - `decodeScenarioPayload(...)`
  - `buildScenarioMeta(...)`
  - `handleScenarioOgImage(...)`
  - `handleScenarioOgPng(...)`

Если поменять только одну сторону, сломаются:

- короткие ссылки
- восстановление сценария из URL
- OG-превью для соцсетей

## Динамические OG meta и OG image

Сервер не отдаёт `index.html` как есть.

Он делает две вещи:

### 1. Bootstrap сценария в HTML

В `public/index.html` есть маркер:

- `<!-- SCENARIO_BOOTSTRAP -->`

Сервер заменяет его на:

- пустой payload
- или `window.__SCENARIO_PAYLOAD__ = "..."`

### 2. Подмена meta-тегов

В `public/index.html` есть маркер:

- `<!-- SOCIAL_META_START --> ... <!-- SOCIAL_META_END -->`

Сервер может подменить блок на scenario-specific meta-теги:

- `title`
- `description`
- `og:title`
- `og:description`
- `og:url`
- `og:image`
- `twitter:*`

### Важно

Не удаляйте эти HTML-комментарии-маркеры без обновления серверной логики.
Они нужны для SSR-подобной подстановки меты на лету.

## Хранилище коротких ссылок

Короткие ссылки хранятся не в базе данных, а в JSON-файле:

- по умолчанию локально: `.runtime/share-links.json`
- в продакшене лучше задавать через `DATA_DIR`
- пример для VPS:
  - папка: `/root/butterfly-runtime/`
  - файл: `/root/butterfly-runtime/share-links.json`

Файл создаётся автоматически при первом сохранении ссылки.

Если раньше проект хранил ссылки в `data/share-links.json`, сервер при первом запуске сам перенесёт их в новую runtime-папку.

Это означает:

- в свежем репозитории `.runtime/` может не быть
- это нормально
- её создаёт сервер

## Публикация сценариев

Теперь у сценариев есть 3 статуса:

- `draft`
  - это черновик
  - у него нет публичного URL
- `share-only`
  - у него есть clean URL (`/scenario/<slug>`)
  - но он не попадает в архив и поиск
- `public`
  - попадает в архив
  - попадает в `sitemap.xml`
  - может индексироваться

### Проверка перед публикацией

Ничего не записывает, только показывает, пройдет ли сценарий quality gate:

```bash
npm run review:scenario -- --share-id FopiMOU
```

### Публикация в архив

Пример публикации хорошего сценария:

```bash
npm run publish:scenario -- --share-id FopiMOU --status public --country Россия --era "XIX век" --theme геополитика --theme империи --featured
```

### Публикация как share-only

Если нужен clean URL без индексации:

```bash
npm run publish:scenario -- --share-id FopiMOU --status share-only
```

### Где хранится публикация

- runtime-сценарии:
  - `.runtime/share-links.json`
  - или `DATA_DIR/share-links.json` на VPS
- кураторский manifest публикаций:
  - `data/public-scenarios.json`

## VPS и деплой

Для безопасного деплоя на VPS важно разделять:

- код из Git-репозитория
- живые данные сайта, которые меняются во время работы

Теперь для этого используется `DATA_DIR`.

Рекомендуемая схема:

1. Код лежит в `/root/butterfly`
2. Живые данные лежат в `/root/butterfly-runtime`
3. `pm2` запускает сайт с `DATA_DIR=/root/butterfly-runtime`

Если вы деплоите через `git pull`, это защищает короткие ссылки от случайного конфликта с Git.

Пример команд на VPS:

```bash
cd /root/butterfly
git pull
npm install
pm2 restart ecosystem.config.cjs --only butterfly --update-env
```

Проверить, что runtime-папка используется:

```bash
pm2 show butterfly
ls -la /root/butterfly-runtime
```

## Карта файлов

### Корневые файлы

- `server.mjs`
  - весь backend
  - роуты
  - failover моделей
  - генерация OG-картинок
  - хранение коротких ссылок
- `package.json`
  - скрипты запуска
  - единственная зависимость: `@resvg/resvg-js`
- `README.md`
  - эта документация

### Папка `public/`

- `public/index.html`
  - одна страница сайта
  - содержит маркеры для серверной подстановки payload/meta
  - содержит Yandex Metrika
- `public/app.js`
  - весь фронтенд
  - запросы к API
  - сборка карточки
  - восстановление сценария из URL
- `public/style.css`
  - весь визуал сайта и карточки
- `public/robots.txt`
  - статическая версия в репозитории, но сервер отдаёт динамическую
- `public/sitemap.xml`
  - статическая версия в репозитории, но сервер отдаёт динамическую
- `public/site.webmanifest`
  - manifest PWA-стиля
- `public/logo.png`, `public/favicon.*`, `public/apple-touch-icon.png`, `public/android-chrome-*.png`
  - брендинг и иконки
- `public/random.png`
  - статический ассет
- `public/google30e00dc0b9c24de4.html`
  - подтверждение Google

## Важные ограничения для другого LLM

Если вы вносите изменения, помните:

- Это не React-проект. Не тащите сюда сборщик без явной необходимости.
- Не ломайте plain HTML + plain JS архитектуру, если задача этого не требует.
- Не удаляйте `timeline` из API-ответа, даже если он не показывается на карточке.
  Он всё ещё участвует в нормализации и совместимости.
- Не заменяйте `shareCard.title` на “красивое название” без запроса владельца проекта.
  Сейчас бизнес-правило такое: заголовок карточки = исходный вопрос пользователя.
- Не удаляйте `?scenario=` / `?s=` логику, иначе сломается шаринг.
- Не удаляйте HTML-маркеры `SCENARIO_BOOTSTRAP` и `SOCIAL_META_START/END`.
- Если меняете структуру narrative или shareCard, проверьте обе стороны:
  - серверную нормализацию
  - клиентскую нормализацию
- Если меняете дизайн карточки, проверьте все форматы:
  - `portrait`
  - `square`
  - `landscape`

## Что сейчас выглядит странно, но это не баг

- В репозитории есть статические `robots.txt` и `sitemap.xml`, но реальные ответы сервер собирает динамически.
- В коде есть функции для копирования и нативного шеринга, но кнопки сейчас скрыты из UI.
- В `site.webmanifest` поля `name` и `short_name` пустые.
- Для изображений используется только Gemini-провайдер. Остальные провайдеры дают только текст.

## Где править разные типы задач

### Если нужно изменить стиль текста

Править:

- `server.mjs`
  - `buildUserPrompt(...)`
  - `buildSystemMessage(...)`

### Если нужно изменить вид карточки

Править:

- `public/app.js`
  - `buildShareCardFrame(...)`
  - `buildStoryParagraphs(...)`
  - `appendNarrativeWithYearHighlights(...)`
- `public/style.css`

### Если нужно изменить механику шеринга

Править:

- `public/app.js`
  - `buildScenarioHash(...)`
  - `parseScenarioHash(...)`
  - `resolveShareUrl(...)`
  - `hydrateScenarioFromUrl(...)`
- `server.mjs`
  - `handleCreateShareLink(...)`
  - `handleGetShareLink(...)`
  - `decodeScenarioPayload(...)`

### Если нужно изменить превью для соцсетей

Править:

- `server.mjs`
  - `injectScenarioMeta(...)`
  - `buildScenarioMeta(...)`
  - `buildScenarioOgSvg(...)`

## Проверка после изменений

Минимальный ручной чек-лист:

1. `npm start`
2. Открыть главную страницу
3. Сгенерировать сценарий в одном из режимов
4. Проверить, что карточка строится без ошибок
5. Проверить, что в заголовке карточки стоит исходный вопрос
6. Проверить, что URL после генерации меняется на `?s=` или `?scenario=`
7. Обновить страницу и убедиться, что сценарий восстановился
8. Открыть `PNG`
9. Проверить `/og/scenario.png?scenario=...`
10. Проверить `/api/meta`, `/api/alt-history`, `/api/share-link`

## Скрипты

```bash
npm start
npm run dev
```

## Итог

Сейчас проект уже не просто “генератор текста”, а маленькая share-first система:

- генерация альтернативной истории
- визуальная карточка
- короткие ссылки
- восстановление сценария из URL
- динамическое превью для соцсетей

Если другой LLM будет продолжать работу, ему в первую очередь нужно понимать три главные оси проекта:

1. `server.mjs` — это и API, и OG, и short-link storage.
2. `public/app.js` — это весь фронтенд и вся логика карточки.
3. Формат scenario payload должен быть совместим одновременно между клиентом, сервером и OG-механикой.
