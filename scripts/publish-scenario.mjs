#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const QUALITY_LABELS = {
  slug: "Нужен чистый slug (латиница, цифры и дефисы).",
  title: "Заголовок слишком короткий.",
  narrative: "Текст сценария слишком короткий для отдельной страницы.",
  paragraphs: "Нужно хотя бы 3 смысловых абзаца.",
  summary: "Нужно нормальное summary (краткое описание) хотя бы на 90 символов.",
  description: "Нужно осмысленное description (описание) хотя бы на 90 символов.",
  countries: "Для public-страницы укажи хотя бы одну страну или регион.",
  era: "Для public-страницы укажи эпоху.",
  themes: "Для public-страницы укажи хотя бы одну тему.",
};

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || !args.shareId) {
    printHelp();
    process.exit(args.help ? 0 : 1);
  }

  const manifestFile = args.manifestFile
    ? path.resolve(process.cwd(), args.manifestFile)
    : path.join(repoRoot, "data", "public-scenarios.json");
  const shareStoreFile = args.shareStoreFile
    ? path.resolve(process.cwd(), args.shareStoreFile)
    : await resolveShareStoreFile(repoRoot);

  const manifest = await readArrayJson(manifestFile);
  const shareStore = await readObjectJson(shareStoreFile);
  const shareId = normalizeShortId(args.shareId);

  if (!shareId) {
    fail("Неверный share id. Используй короткий id из ссылки вида `?s=...`.");
  }

  const storeEntry = shareStore[shareId];
  if (!storeEntry?.scenario) {
    fail(`Не нашел сценарий с share id "${shareId}" в ${shareStoreFile}.`);
  }

  const parsed = decodeScenarioPayload(storeEntry.scenario);
  if (!parsed) {
    fail("Сценарий найден, но не удалось разобрать его payload.");
  }

  const existingIndex = manifest.findIndex(
    (entry) => entry?.shareId === shareId || (args.slug && entry?.slug === args.slug)
  );
  const existing = existingIndex >= 0 ? manifest[existingIndex] : null;
  const status = normalizePublicationStatus(args.status || existing?.status || "public");
  const lang = normalizeLanguage(existing?.lang || parsed.lang || parsed.language);
  const title = oneLine(args.title || existing?.title || parsed.event || parsed.title || "");
  const subtitle = oneLine(
    args.subtitle ||
      existing?.subtitle ||
      parsed.subtitle ||
      parsed.share_card?.subtitle ||
      parsed.shareCard?.subtitle ||
      ""
  );
  const narrative = oneLine(parsed.narrative || "");
  const summary = truncate(
    args.summary || existing?.summary || subtitle || firstSentence(narrative),
    220
  );
  const description = truncate(
    args.description || existing?.description || summary || firstSentence(narrative),
    180
  );
  const slug = oneLine(args.slug || existing?.slug || slugify(title));
  const countries = args.countries.length
    ? uniqueList(args.countries)
    : normalizeTagList(existing?.countries);
  const themes = args.themes.length
    ? uniqueList(args.themes)
    : normalizeTagList(existing?.themes);
  const relatedSlugs = args.relatedSlugs.length
    ? uniqueList(args.relatedSlugs)
    : normalizeTagList(existing?.relatedSlugs);
  const era = oneLine(args.era || existing?.era || "");
  const tone = oneLine(args.tone || existing?.tone || getModeLabelForLang(parsed.mode, lang));
  const featured =
    args.featured === null ? Boolean(existing?.featured) : Boolean(args.featured);
  const popularity = Number(
    args.popularity ?? existing?.popularity ?? (status === "public" ? 70 : 0)
  );
  const publishedAt = normalizePublishedAt(
    status,
    args.publishedAt || existing?.publishedAt || storeEntry.createdAt
  );
  const paragraphs = splitNarrativeIntoParagraphs(narrative);
  const quality = buildScenarioQualityReport({
    slug,
    title,
    summary,
    description,
    narrative,
    paragraphs,
    countries,
    era,
    themes,
  });

  const conflictingSlug = manifest.find(
    (entry) => entry?.slug === slug && entry?.shareId !== shareId
  );
  if (conflictingSlug) {
    fail(`Slug "${slug}" уже занят другим сценарием (${conflictingSlug.shareId}).`);
  }

  if (status === "public" && !quality.isPublicReady) {
    printQualityFailure("public", quality);
    process.exit(1);
  }

  if (status === "share-only" && !quality.isRoutable) {
    printQualityFailure("share-only", quality);
    process.exit(1);
  }

  const nextEntry = cleanupManifestEntry({
    ...(existing || {}),
    slug,
    shareId,
    status,
    featured,
    publishedAt,
    popularity: Number.isFinite(popularity) ? popularity : 0,
    summary,
    countries,
    era,
    themes,
    tone,
    relatedSlugs,
    ...(args.title || existing?.title ? { title } : {}),
    ...(args.subtitle || existing?.subtitle ? { subtitle } : {}),
    ...(args.description || existing?.description ? { description } : {}),
    ...(lang === "en" ? { lang } : {}),
  });

  const nextManifest = [...manifest];
  if (existingIndex >= 0) {
    nextManifest[existingIndex] = nextEntry;
  } else {
    nextManifest.push(nextEntry);
  }

  printResult({
    mode: args.dryRun ? "preview" : "write",
    manifestFile,
    shareStoreFile,
    shareId,
    status,
    slug,
    quality,
    url:
      status === "draft"
        ? "(нет публичного URL)"
        : `/scenario/${encodeURIComponent(slug)}`,
    title,
    summary,
    countries,
    era,
    themes,
  });

  if (args.dryRun) {
    return;
  }

  await fs.mkdir(path.dirname(manifestFile), { recursive: true });
  await writeJsonAtomic(manifestFile, nextManifest);
  console.log(`\nСохранено в ${manifestFile}`);
}

function parseArgs(argv) {
  const result = {
    shareId: "",
    status: "",
    slug: "",
    title: "",
    subtitle: "",
    summary: "",
    description: "",
    era: "",
    tone: "",
    publishedAt: "",
    popularity: null,
    featured: null,
    countries: [],
    themes: [],
    relatedSlugs: [],
    dryRun: false,
    help: false,
    manifestFile: "",
    shareStoreFile: "",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    switch (arg) {
      case "--share-id":
        result.shareId = String(next || "");
        i += 1;
        break;
      case "--status":
        result.status = String(next || "");
        i += 1;
        break;
      case "--slug":
        result.slug = String(next || "");
        i += 1;
        break;
      case "--title":
        result.title = String(next || "");
        i += 1;
        break;
      case "--subtitle":
        result.subtitle = String(next || "");
        i += 1;
        break;
      case "--summary":
        result.summary = String(next || "");
        i += 1;
        break;
      case "--description":
        result.description = String(next || "");
        i += 1;
        break;
      case "--country":
        result.countries.push(String(next || ""));
        i += 1;
        break;
      case "--theme":
        result.themes.push(String(next || ""));
        i += 1;
        break;
      case "--related-slug":
        result.relatedSlugs.push(String(next || ""));
        i += 1;
        break;
      case "--era":
        result.era = String(next || "");
        i += 1;
        break;
      case "--tone":
        result.tone = String(next || "");
        i += 1;
        break;
      case "--published-at":
        result.publishedAt = String(next || "");
        i += 1;
        break;
      case "--popularity":
        result.popularity = Number(next || "");
        i += 1;
        break;
      case "--featured":
        result.featured = true;
        break;
      case "--no-featured":
        result.featured = false;
        break;
      case "--dry-run":
        result.dryRun = true;
        break;
      case "--manifest-file":
        result.manifestFile = String(next || "");
        i += 1;
        break;
      case "--share-store-file":
        result.shareStoreFile = String(next || "");
        i += 1;
        break;
      case "--help":
      case "-h":
        result.help = true;
        break;
      default:
        fail(`Неизвестный аргумент: ${arg}`);
    }
  }

  return result;
}

async function resolveShareStoreFile(rootDir) {
  const configured = String(process.env.DATA_DIR || "").trim();
  const runtimeDir = configured
    ? path.isAbsolute(configured)
      ? configured
      : path.resolve(process.cwd(), configured)
    : path.join(rootDir, ".runtime");
  const runtimeFile = path.join(runtimeDir, "share-links.json");
  const legacyFile = path.join(rootDir, "data", "share-links.json");

  if (await fileExists(runtimeFile)) {
    return runtimeFile;
  }
  return legacyFile;
}

async function readArrayJson(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error?.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function readObjectJson(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return parsed;
  } catch (error) {
    if (error?.code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

async function writeJsonAtomic(filePath, value) {
  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
  await fs.rename(tempPath, filePath);
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function buildScenarioQualityReport({
  slug,
  title,
  summary,
  description,
  narrative,
  paragraphs,
  countries,
  era,
  themes,
}) {
  const routeIssues = [];
  const publicIssues = [];
  const normalizedSlug = String(slug || "").trim();
  const paragraphList = Array.isArray(paragraphs) ? paragraphs.filter(Boolean) : [];
  const wordCount = countWords(narrative);

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedSlug)) {
    routeIssues.push("slug");
  }
  if (title.length < 12) {
    routeIssues.push("title");
  }
  if (wordCount < 140) {
    routeIssues.push("narrative");
  }
  if (paragraphList.length < 3) {
    routeIssues.push("paragraphs");
  }

  if (summary.length < 90) {
    publicIssues.push("summary");
  }
  if (description.length < 90) {
    publicIssues.push("description");
  }
  if (!countries.length) {
    publicIssues.push("countries");
  }
  if (!era) {
    publicIssues.push("era");
  }
  if (!themes.length) {
    publicIssues.push("themes");
  }

  return {
    wordCount,
    paragraphCount: paragraphList.length,
    routeIssues,
    publicIssues,
    isRoutable: routeIssues.length === 0,
    isPublicReady: routeIssues.length === 0 && publicIssues.length === 0,
  };
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

function normalizeShortId(value) {
  const id = String(value || "").trim();
  if (!id) return "";
  if (!/^[A-Za-z0-9_-]{4,32}$/.test(id)) return "";
  return id;
}

function normalizePublicationStatus(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "public") return "public";
  if (raw === "share-only" || raw === "share_only" || raw === "shareonly") {
    return "share-only";
  }
  return "draft";
}

function normalizeLanguage(value) {
  return String(value || "").trim().toLowerCase() === "en" ? "en" : "ru";
}

function normalizePublishedAt(status, value) {
  if (status === "draft") {
    return normalizeIsoDate(value);
  }
  return normalizeIsoDate(value) || new Date().toISOString().slice(0, 10);
}

function normalizeTagList(values) {
  if (Array.isArray(values)) {
    return values.map((value) => oneLine(value)).filter(Boolean);
  }
  const single = oneLine(values);
  return single ? [single] : [];
}

function uniqueList(values) {
  return [...new Set(values.map((value) => oneLine(value)).filter(Boolean))];
}

function cleanupManifestEntry(entry) {
  const next = { ...entry };

  if (!next.title) delete next.title;
  if (!next.subtitle) delete next.subtitle;
  if (!next.description) delete next.description;
  if (!next.summary) delete next.summary;
  if (!Array.isArray(next.countries) || next.countries.length === 0) delete next.countries;
  if (!Array.isArray(next.themes) || next.themes.length === 0) delete next.themes;
  if (!Array.isArray(next.relatedSlugs) || next.relatedSlugs.length === 0) delete next.relatedSlugs;
  if (!next.era) delete next.era;
  if (!next.tone) delete next.tone;
  if (!next.publishedAt) delete next.publishedAt;
  if (!next.lang || next.lang === "ru") delete next.lang;
  if (!next.popularity && next.popularity !== 0) delete next.popularity;

  return next;
}

function slugify(value) {
  return oneLine(value)
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-")
    .replace(/[а-яё]/gi, transliterateRussian)
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function transliterateRussian(char) {
  const map = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ё: "e",
    ж: "zh",
    з: "z",
    и: "i",
    й: "y",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "h",
    ц: "ts",
    ч: "ch",
    ш: "sh",
    щ: "sch",
    ъ: "",
    ы: "y",
    ь: "",
    э: "e",
    ю: "yu",
    я: "ya",
  };
  return map[char.toLowerCase()] || "";
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

function printResult(result) {
  console.log(`Режим: ${result.mode === "preview" ? "preview" : "запись"}`);
  console.log(`Share id: ${result.shareId}`);
  console.log(`Статус: ${result.status}`);
  console.log(`URL: ${result.url}`);
  console.log(`Slug: ${result.slug}`);
  console.log(`Слова: ${result.quality.wordCount}`);
  console.log(`Абзацы: ${result.quality.paragraphCount}`);
  console.log(`Заголовок: ${result.title}`);
  console.log(`Summary: ${result.summary}`);
  console.log(`Страны/регионы: ${result.countries.join(", ") || "не заданы"}`);
  console.log(`Эпоха: ${result.era || "не задана"}`);
  console.log(`Темы: ${result.themes.join(", ") || "не заданы"}`);
  console.log(`Manifest: ${result.manifestFile}`);
  console.log(`Share store: ${result.shareStoreFile}`);
}

function printQualityFailure(targetStatus, quality) {
  console.error(`Нельзя сохранить статус "${targetStatus}". Не пройден quality gate:\n`);
  const issues = [
    ...quality.routeIssues.map((code) => `- ${QUALITY_LABELS[code] || code}`),
    ...quality.publicIssues.map((code) => `- ${QUALITY_LABELS[code] || code}`),
  ];
  for (const line of issues) {
    console.error(line);
  }
  console.error("\nПодсказка:");
  console.error("- Для черновика используй `--status draft`.");
  console.error("- Для clean URL без индексации используй `--status share-only`.");
  console.error("- Для `public` добавь эпоху, страны/регионы, темы и нормальное summary.");
}

function printHelp() {
  console.log(`Публикация сценария без ручного редактирования JSON

Примеры:
  npm run review:scenario -- --share-id FopiMOU
  npm run publish:scenario -- --share-id FopiMOU --status public --country Россия --era "XIX век" --theme геополитика --theme империи --featured
  npm run publish:scenario -- --share-id OXzqfag --status share-only

Основные аргументы:
  --share-id <id>           share id из ссылки ?s=...
  --status <draft|share-only|public>
  --slug <slug>             свой slug, если не подходит автогенерация
  --country <value>         можно указывать несколько раз
  --theme <value>           можно указывать несколько раз
  --era <value>
  --summary <text>
  --featured / --no-featured
  --dry-run                 только показать, что будет записано

Служебные аргументы:
  --manifest-file <path>    альтернативный manifest для тестов
  --share-store-file <path> альтернативный share store для тестов
`);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exit(1);
});
