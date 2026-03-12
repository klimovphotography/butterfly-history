const form = document.getElementById("event-form");
const input = document.getElementById("event-input");
const button = document.getElementById("submit-btn");
const messages = document.getElementById("messages");
const historyList = document.getElementById("history-list");
const clearHistoryButton = document.getElementById("clear-history-btn");
const collectionsGrid = document.getElementById("collections-grid");
const refreshPromptsButton = document.getElementById("refresh-prompts-btn");
const sharePanel = document.getElementById("share-panel");
const shareCardTemplate = document.getElementById("share-card-template");
const storyCardEvent = document.getElementById("story-card-event");
const storyCardTheses = document.getElementById("story-card-theses");
const storyStage = document.getElementById("story-stage");
const storyViewCard = document.getElementById("story-view-card");
const storyViewEyebrow = storyViewCard?.querySelector(".story-view-eyebrow");
const storyViewTitle = document.getElementById("story-view-title");
const storyViewText = document.getElementById("story-view-text");
const storyViewTheses = document.getElementById("story-view-theses");
const storyViewFooterCta = document.getElementById("story-view-footer-cta");
const storyFooterCta = document.getElementById("story-footer-cta");
const storyLoadingIndicator = document.getElementById("story-loading-indicator");
const storyLoadingText = document.getElementById("story-loading-text");
const globalLoadingIndicator = document.getElementById("global-loading-indicator");
const globalLoadingText = document.getElementById("global-loading-text");
const storyActions = document.getElementById("story-actions");
const storyDownloadButton = document.getElementById("story-download-btn");
const storyShareButton = document.getElementById("story-share-btn");
const localeButtons = document.querySelectorAll(".locale-btn");

const eyebrowText = document.getElementById("eyebrow-text");
const heroTitle = document.getElementById("hero-title");
const subtitleText = document.getElementById("subtitle-text");
const collectionsTitle = document.getElementById("collections-title");
const collectionsSubtitle = document.getElementById("collections-subtitle");
const historyTitle = document.getElementById("history-title");
const noteText = document.getElementById("note-text");

const HISTORY_KEY = "butterfly_history_v3";
const LOCALE_KEY = "butterfly_locale_v1";
const HISTORY_LIMIT = 20;
const CURRENT_YEAR = new Date().getFullYear();
const POPULAR_PROMPTS_VISIBLE = 8;

const I18N = {
  ru: {
    htmlLang: "ru",
    pageTitle: "эффект бабочки",
    eyebrow: "альтернативная история",
    heroTitle: "эффект бабочки",
    subtitle: "Измени одну деталь и посмотри, как перевернется история",
    placeholder:
      "Например: Что если Карибский кризис в 1962 году не удалось бы деэскалировать?",
    submitIdle: "Смоделировать",
    submitLoading: "Думаю...",
    collectionsTitle: "Популярные запросы",
    collectionsSubtitle: "Выберите идею и начните в один клик.",
    collectionsRefresh: "Обновить идеи",
    storyEyebrow: "что если?",
    storyDownload: "Скачать PNG",
    storyShareLink: "Поделиться ссылкой",
    storyLoading: "Формирую карточку альтернативной истории",
    storyNoScenario: "Введите событие и запустите моделирование",
    storyNoScenarioLeft: "Выберите событие и получите подробный разбор по годам.",
    storyNoScenarioCard: "яркая сводка для сторис",
    storyError: "Не удалось получить сценарий",
    storyLoadPhase1: "анализ развилки...",
    storyLoadPhase2: "пересчет событий...",
    storyLoadPhase3: "построение архива...",
    historyTitle: "История запросов",
    historyClear: "Очистить",
    note: "Важно: это творческая историческая гипотеза, а не установленные факты.",
    loading: "Моделирую альтернативную ветку...",
    errorPrefix: "Ошибка",
    errorUnknown: "неизвестная ошибка.",
    errorNetwork: "Ошибка сети. Проверьте, что сервер запущен.",
    errorParse: "Не удалось разобрать ответ ИИ.",
    badgeUser: "Вы",
    badgeAssistant: "ИИ",
    timelineTitle: "Таймлайн по годам",
    branchTitle: "Что делаем дальше?",
    branchUserPrefix: "Что делаем дальше:",
    historyEmpty: "Пока пусто. Первый сценарий появится здесь.",
    historyOpen: "Открыть в чате",
    historyRerun: "Повторить запрос",
    shareScenario: "Поделиться сценарием",
    shareTitle: "Поделиться сценарием",
    shareHint: "Красивая карточка и ссылка для отправки друзьям",
    shareLinkLabel: "Ссылка",
    shareActionDownload: "Скачать PNG",
    shareActionShare: "Поделиться",
    shareCopy: "Копировать",
    shareOpen: "Открыть",
    shareClose: "Закрыть",
    shareCopied: "Ссылка скопирована",
    shareShared: "Готово к отправке",
    shareCopyFail: "Не удалось скопировать, скопируйте вручную",
    shareCardTitle: "Альтернативная история",
    shareAltLabel: "Что дальше?",
    shareAltFallback: "Выберите следующий шаг сценария и запустите новую симуляцию.",
    sharedLoaded: "Загружен сценарий по ссылке.",
    shareStoryDownload: "Скачать для сторис",
    shareStoryRendering: "Готовлю карточку...",
    shareStoryReady: "Карточка сохранена в PNG",
    shareStoryError: "Не удалось создать карточку",
    shareStoryNoLib: "Инструмент карточки не загрузился",
    storyFooterCta: "смоделировать свою ветку реальности ↗",
    fallbackNarrative: "Гипотеза построена, но текстовое описание оказалось неполным.",
    fallbackTimeline1Title: "точка запуска",
    fallbackTimeline1Details: "Ключевые центры власти принимают решение, которое меняет траекторию страны.",
    fallbackTimeline2Title: "первый откат",
    fallbackTimeline2Details: "Внутри системы начинается жесткая борьба за контроль над ресурсами и институтами.",
    fallbackTimeline3Title: "системный сдвиг",
    fallbackTimeline3Details: "Крупные державы перестраивают союзы и санкционные режимы под новую реальность.",
    fallbackTimeline4Title: "долгая реальность",
    fallbackTimeline4Details: "Через двадцать лет формируется устойчивая альтернативная конфигурация мира.",
    fallbackBranch1: "Усилить международные союзы",
    fallbackBranch2: "Сделать ставку на технологический рывок",
    fallbackBranch3: "Сфокусироваться на внутренних реформах",
  },
  en: {
    htmlLang: "en",
    pageTitle: "butterfly effect",
    eyebrow: "alternative history",
    heroTitle: "butterfly effect",
    subtitle: "Change one detail and watch history turn upside down",
    placeholder:
      "For example: What if the Cuban Missile Crisis in 1962 had escalated?",
    submitIdle: "Simulate",
    submitLoading: "Thinking...",
    collectionsTitle: "Popular prompts",
    collectionsSubtitle: "Pick one idea and start in one click.",
    collectionsRefresh: "Refresh ideas",
    storyEyebrow: "what if?",
    storyDownload: "Download PNG",
    storyShareLink: "Share link",
    storyLoading: "Generating your alternative history card",
    storyNoScenario: "Enter an event and run simulation",
    storyNoScenarioLeft: "Choose an event to get a detailed year by year breakdown.",
    storyNoScenarioCard: "quick highlights for stories",
    storyError: "Could not generate scenario",
    storyLoadPhase1: "analyzing branch...",
    storyLoadPhase2: "recalculating events...",
    storyLoadPhase3: "building archive...",
    historyTitle: "Scenario History",
    historyClear: "Clear",
    note: "Important: this is a creative historical hypothesis, not established fact.",
    loading: "Modeling an alternative branch...",
    errorPrefix: "Error",
    errorUnknown: "unknown error.",
    errorNetwork: "Network error. Check that the server is running.",
    errorParse: "Failed to parse model response.",
    badgeUser: "You",
    badgeAssistant: "AI",
    timelineTitle: "Timeline by years",
    branchTitle: "What do we do next?",
    branchUserPrefix: "What next:",
    historyEmpty: "No scenarios yet. Your first one will appear here.",
    historyOpen: "Open in chat",
    historyRerun: "Run again",
    shareScenario: "Share scenario",
    shareTitle: "Share scenario",
    shareHint: "Beautiful card and link to send to your friends",
    shareLinkLabel: "Link",
    shareActionDownload: "Download PNG",
    shareActionShare: "Share",
    shareCopy: "Copy",
    shareOpen: "Open",
    shareClose: "Close",
    shareCopied: "Link copied",
    shareShared: "Ready to share",
    shareCopyFail: "Could not copy, please copy manually",
    shareCardTitle: "Alternative History",
    shareAltLabel: "What next?",
    shareAltFallback: "Pick the next branch and run a new simulation.",
    sharedLoaded: "Scenario loaded from a shared link.",
    shareStoryDownload: "Download for stories",
    shareStoryRendering: "Rendering story card...",
    shareStoryReady: "Story card downloaded as PNG",
    shareStoryError: "Could not generate story card",
    shareStoryNoLib: "Story card tool is not available",
    storyFooterCta: "try your own history scenario",
    fallbackNarrative: "A hypothesis was generated, but the narrative text is incomplete.",
    fallbackTimeline1Title: "starting point",
    fallbackTimeline1Details: "Power centers make a high risk decision that changes the national trajectory.",
    fallbackTimeline2Title: "first fallout",
    fallbackTimeline2Details: "A fierce internal contest begins for control of institutions and resources.",
    fallbackTimeline3Title: "structural shift",
    fallbackTimeline3Details: "Major powers rebuild alliances and pressure tools around the new reality.",
    fallbackTimeline4Title: "long horizon",
    fallbackTimeline4Details: "By year x plus twenty, a stable alternative world order takes shape.",
    fallbackBranch1: "Strengthen international alliances",
    fallbackBranch2: "Bet on a technological leap",
    fallbackBranch3: "Focus on domestic reforms",
  },
};

const POPULAR_PROMPTS = {
  ru: [
    {
      label: "Карибский кризис",
      event: "Что если Карибский кризис 1962 года перешел в прямой военный конфликт?",
    },
    {
      label: "Падение Константинополя",
      event: "Что если Византия удержала Константинополь в 1453 году?",
    },
    {
      label: "Ватерлоо",
      event: "Что если Наполеон выиграл битву при Ватерлоо в 1815 году?",
    },
    {
      label: "Распад СССР",
      event: "Что если СССР не распался в 1991 году?",
    },
    {
      label: "Высадка в Нормандии",
      event: "Что если высадка в Нормандии в 1944 году провалилась?",
    },
    {
      label: "Юлий Цезарь",
      event: "Что если Юлий Цезарь не был убит в 44 году до н.э.?",
    },
    {
      label: "Рим и Карфаген",
      event: "Что если Карфаген победил во Второй Пунической войне?",
    },
    {
      label: "Революция 1917",
      event:
        "Что если Февральская революция привела к устойчивой парламентской республике в России?",
    },
    {
      label: "Берлинская стена",
      event: "Что если Берлинская стена не была построена в 1961 году?",
    },
    {
      label: "Космическая гонка",
      event: "Что если полет Гагарина в 1961 году не состоялся?",
    },
    {
      label: "Интернет",
      event: "Что если глобальный интернет появился на 20 лет позже?",
    },
    {
      label: "Библиотека Александрии",
      event: "Что если Александрийская библиотека сохранилась до наших дней?",
    },
  ],
  en: [
    {
      label: "Cuban Missile Crisis",
      event: "What if the Cuban Missile Crisis in 1962 had escalated into open war?",
    },
    {
      label: "Constantinople",
      event: "What if Byzantium had held Constantinople in 1453?",
    },
    {
      label: "Waterloo",
      event: "What if Napoleon had won the Battle of Waterloo in 1815?",
    },
    {
      label: "USSR in 1991",
      event: "What if the Soviet Union had not collapsed in 1991?",
    },
    {
      label: "D-Day",
      event: "What if the Normandy landings in 1944 had failed?",
    },
    {
      label: "Julius Caesar",
      event: "What if Julius Caesar had not been assassinated in 44 BCE?",
    },
    {
      label: "Rome vs Carthage",
      event: "What if Carthage had won the Second Punic War?",
    },
    {
      label: "Russian Revolution",
      event:
        "What if the February Revolution of 1917 had led to a stable parliamentary republic in Russia?",
    },
    {
      label: "Berlin Wall",
      event: "What if the Berlin Wall had never been built in 1961?",
    },
    {
      label: "Space Race",
      event: "What if Gagarin's 1961 spaceflight had never happened?",
    },
    {
      label: "The Internet",
      event: "What if the global Internet had arrived 20 years later?",
    },
    {
      label: "Library of Alexandria",
      event: "What if the Library of Alexandria had survived to modern times?",
    },
  ],
};

let currentLocale = readLocale();
let history = readHistory();
let activeScenario = null;
let isLoading = false;
let activeStoryPayload = null;
let currentSharePayload = null;
let currentShareAnchor = null;
let popularSelection = { ru: [], en: [] };
let storyLoadingTimer = null;
let storyLoadingStep = 0;

init();

function init() {
  popularSelection.ru = buildPopularSelection("ru");
  popularSelection.en = buildPopularSelection("en");
  if (sharePanel.parentElement !== document.body) {
    document.body.append(sharePanel);
  }
  closeSharePanel();
  bindEvents();
  applyLocale(currentLocale);
  renderStoryPlaceholder();
  renderHistory();
  void hydrateSharedScenarioFromUrl();
}

function bindEvents() {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await startScenario(input.value);
  });

  input.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    if (event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.isComposing) return;
    event.preventDefault();
    if (typeof form.requestSubmit === "function") {
      form.requestSubmit();
      return;
    }
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });

  clearHistoryButton.addEventListener("click", () => {
    history = [];
    saveHistory(history);
    renderHistory();
  });

  refreshPromptsButton.addEventListener("click", () => {
    const locale = normalizeLocale(currentLocale);
    popularSelection[locale] = buildPopularSelection(locale);
    renderCollections();
  });

  storyDownloadButton.addEventListener("click", async () => {
    if (!activeStoryPayload) return;
    const result = await downloadStoryCard(activeStoryPayload);
    if (result !== "ok") return;
  });

  storyShareButton.addEventListener("click", () => {
    if (!activeStoryPayload) return;
    openSharePanel(activeStoryPayload, storyShareButton);
  });

  sharePanel.addEventListener("click", (event) => {
    if (event.target === sharePanel) {
      closeSharePanel();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !sharePanel.hidden) {
      closeSharePanel();
    }
  });

  window.addEventListener("resize", () => {
    if (!sharePanel.hidden && currentSharePayload) {
      positionSharePanel(currentShareAnchor);
    }
  });
  window.addEventListener(
    "scroll",
    () => {
      if (!sharePanel.hidden && currentSharePayload) {
        positionSharePanel(currentShareAnchor);
      }
    },
    { passive: true }
  );

  for (const btn of localeButtons) {
    btn.addEventListener("click", () => {
      const locale = btn.dataset.locale;
      if (!locale || locale === currentLocale) return;
      switchLocale(locale);
    });
  }
}

function switchLocale(locale) {
  currentLocale = normalizeLocale(locale);
  saveLocale(currentLocale);
  applyLocale(currentLocale);
}

function applyLocale(locale) {
  const dict = I18N[locale] || I18N.ru;
  document.documentElement.lang = dict.htmlLang;
  document.title = dict.pageTitle;

  eyebrowText.textContent = dict.eyebrow;
  heroTitle.textContent = dict.heroTitle;
  subtitleText.textContent = dict.subtitle;
  input.placeholder = dict.placeholder;
  collectionsTitle.textContent = dict.collectionsTitle;
  collectionsSubtitle.textContent = dict.collectionsSubtitle;
  refreshPromptsButton.textContent = dict.collectionsRefresh;
  if (storyViewEyebrow) storyViewEyebrow.textContent = dict.storyEyebrow;
  if (storyViewFooterCta) storyViewFooterCta.textContent = dict.storyFooterCta;
  if (storyFooterCta) storyFooterCta.textContent = dict.storyFooterCta;
  storyDownloadButton.textContent = dict.storyDownload;
  storyShareButton.textContent = dict.storyShareLink;
  historyTitle.textContent = dict.historyTitle;
  clearHistoryButton.textContent = dict.historyClear;
  noteText.textContent = dict.note;

  setUiBusy(isLoading);
  renderLocaleButtons();
  renderCollections();
  renderHistory();
  if (!activeStoryPayload) {
    renderStoryPlaceholder();
  }

  if (!sharePanel.hidden && currentSharePayload) {
    renderSharePanel(currentSharePayload);
  }
  updateStoryLoadingCopy();
}

function renderLocaleButtons() {
  for (const btn of localeButtons) {
    btn.classList.toggle("is-active", btn.dataset.locale === currentLocale);
  }
}

function renderCollections() {
  collectionsGrid.innerHTML = "";
  const locale = normalizeLocale(currentLocale);
  if (!popularSelection[locale] || popularSelection[locale].length === 0) {
    popularSelection[locale] = buildPopularSelection(locale);
  }
  const prompts = popularSelection[locale];

  for (const item of prompts) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "collection-btn";
    btn.textContent = item.label;
    btn.addEventListener("click", () => {
      input.value = item.event;
      input.focus();
    });
    collectionsGrid.append(btn);
  }
}

function buildPopularSelection(locale) {
  const source = [...(POPULAR_PROMPTS[locale] || POPULAR_PROMPTS.ru)];
  if (source.length <= POPULAR_PROMPTS_VISIBLE) {
    return source;
  }
  for (let i = source.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [source[i], source[j]] = [source[j], source[i]];
  }
  return source.slice(0, POPULAR_PROMPTS_VISIBLE);
}

async function startScenario(rawText) {
  const eventText = String(rawText || "").trim();
  if (!eventText || isLoading) return;

  activeScenario = {
    rootEvent: eventText,
    locale: currentLocale,
    steps: [],
  };

  form.reset();
  if (!sharePanel.hidden) {
    closeSharePanel();
  }

  await requestScenario({
    event: eventText,
    branch: "",
    context: [],
    locale: currentLocale,
  });
}

async function requestScenario(payload) {
  isLoading = true;
  setUiBusy(true);
  renderStoryLoading(payload.event);

  try {
    const response = await fetch("/api/alt-history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        locale: normalizeLocale(payload.locale || currentLocale),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      renderStoryError(`${t("storyError")}: ${data.error || t("errorUnknown")}`);
      return;
    }

    const scenario = normalizeScenario(data, payload.event);
    if (!scenario) {
      renderStoryError(t("errorParse"));
      return;
    }

    if (activeScenario) {
      activeScenario.steps.push({
        branch: payload.branch || "start",
        narrative: scenario.narrative,
        timeline: scenario.timeline,
      });
    }

    const sourceEvent = payload.event || activeScenario?.rootEvent || "";
    renderStoryResult(scenario, sourceEvent);

    pushHistory({
      event: payload.branch ? `${payload.event} ${payload.branch}` : payload.event,
      rootEvent: payload.event,
      branch: payload.branch || "",
      locale: currentLocale,
      scenario: toHistoryScenario(scenario),
      createdAt: new Date().toISOString(),
    });
  } catch {
    renderStoryError(t("errorNetwork"));
  } finally {
    isLoading = false;
    setUiBusy(false);
    input.focus();
  }
}

function renderStoryPlaceholder() {
  storyStage.hidden = false;
  storyActions.hidden = true;
  setStoryLoadingState(false);
  storyViewCard.classList.remove("story-enter");
  storyViewTitle.textContent = "";
  renderStoryViewMessage("");
  activeStoryPayload = null;
}

function renderStoryLoading(eventText) {
  storyStage.hidden = false;
  storyActions.hidden = true;
  storyViewTitle.textContent = buildStoryEventTitle(eventText || t("shareCardTitle"));
  setStoryLoadingState(true);
  activeStoryPayload = null;
}

function renderStoryError(message) {
  storyStage.hidden = false;
  storyActions.hidden = true;
  setStoryLoadingState(false);
  storyViewCard.classList.remove("story-enter");
  storyViewTitle.textContent = t("storyEyebrow");
  renderStoryViewMessage(formatStoryText(message || t("storyError"), 220));
  activeStoryPayload = null;
}

function renderStoryResult(scenario, sourceEvent) {
  const event = formatStoryText(sourceEvent || t("shareCardTitle"), 100);
  const timeline = normalizeTimeline(scenario?.timeline, sourceEvent);
  const branches = normalizeBranches(scenario?.branches);
  const narrativeSource = String(scenario?.narrative || "");
  
  const detailedTimeline = buildDetailedNarrativeTimeline(timeline);
  
  const theses = buildStoryTheses({
    narrative: narrativeSource,
    timeline,
  }, sourceEvent);

  storyStage.hidden = false;
  storyActions.hidden = false;
  setStoryLoadingState(false);
  storyViewTitle.textContent = buildStoryEventTitle(event);
  renderStoryViewScenario(theses, detailedTimeline, narrativeSource);

  // Restart entry animation each time a new scenario arrives.
  storyViewCard.classList.remove("story-enter");
  void storyViewCard.offsetWidth;
  storyViewCard.classList.add("story-enter");
  storyStage.scrollIntoView({ behavior: "smooth", block: "start" });

  activeStoryPayload = {
    event,
    locale: currentLocale,
    scenario: {
      narrative: narrativeSource,
      timeline,
      branches,
    },
  };
}

function buildStoryEventTitle(eventText) {
  const raw = formatStoryText(eventText || "", 120);
  if (!raw) return t("shareCardTitle");

  let clean = String(raw)
    .replace(/^[\s?!.:,;]+/g, "")
    .replace(/^\s*что\s+если\b[:\s?]*/i, "")
    .replace(/^\s*what\s+if\b[:\s?]*/i, "")
    .replace(/^[\s?!.:,;]+/g, "")
    .trim();

  if (!clean) {
    clean = raw.replace(/^[\s?!.:,;]+/g, "").trim();
  }

  return clean || t("shareCardTitle");
}

function getStoryLoadingPhases() {
  return [t("storyLoadPhase1"), t("storyLoadPhase2"), t("storyLoadPhase3")].filter(Boolean);
}

function updateStoryLoadingCopy() {
  const phases = getStoryLoadingPhases();
  if (phases.length === 0) {
    if (storyLoadingText) storyLoadingText.textContent = "";
    if (globalLoadingText) globalLoadingText.textContent = "";
    return;
  }
  const value = phases[storyLoadingStep % phases.length];
  if (storyLoadingText) storyLoadingText.textContent = value;
  if (globalLoadingText) globalLoadingText.textContent = value;
}

function setStoryLoadingState(active) {
  if (!storyViewCard || !storyLoadingIndicator) return;

  if (!active) {
    storyViewCard.classList.remove("is-loading");
    storyLoadingIndicator.hidden = true;
    if (globalLoadingIndicator) {
      globalLoadingIndicator.hidden = true;
    }
    if (storyLoadingTimer) {
      clearInterval(storyLoadingTimer);
      storyLoadingTimer = null;
    }
    return;
  }

  storyViewCard.classList.add("is-loading");
  storyLoadingIndicator.hidden = false;
  if (globalLoadingIndicator) {
    globalLoadingIndicator.hidden = false;
  }
  storyLoadingStep = 0;
  updateStoryLoadingCopy();

  if (storyLoadingTimer) {
    clearInterval(storyLoadingTimer);
  }
  storyLoadingTimer = setInterval(() => {
    storyLoadingStep += 1;
    updateStoryLoadingCopy();
  }, 1200);
}

function renderStoryViewMessage(text) {
  if (storyViewTheses) {
    storyViewTheses.hidden = true;
    storyViewTheses.innerHTML = "";
  }
  storyViewText.hidden = false;
  storyViewText.innerHTML = "";
  storyViewText.textContent = String(text || "");
}

function renderStoryViewScenario(theses, detailedTimeline = [], narrativeText = "") {
  storyViewText.hidden = false;
  renderStoryNarrativeTimeline(detailedTimeline, narrativeText);

  if (storyViewTheses) {
    storyViewTheses.hidden = false;
    storyViewTheses.innerHTML = "";

    for (let index = 0; index < theses.length; index += 1) {
      const item = theses[index];
      const li = document.createElement("li");
      li.className = "story-view-thesis";
      li.style.setProperty("--story-delay", `${index * 200}ms`);
      li.style.marginBottom = "14px";
      li.style.lineHeight = "1.4";

      const year = document.createElement("strong");
      year.className = "story-view-thesis-year";
      year.textContent = `${item.year}: `;

      const title = document.createElement("strong");
      title.textContent = `${item.title}. `;

      const text = document.createElement("span");
      text.className = "story-view-thesis-text";
      text.textContent = item.details;

      li.append(year, title, text);
      storyViewTheses.append(li);
    }
  }
}

function renderStoryNarrativeTimeline(items, narrativeText) {
  storyViewText.innerHTML = "";
  
  if (narrativeText) {
    const intro = document.createElement("p");
    intro.className = "story-view-detail-text";
    intro.style.marginBottom = "24px";
    intro.style.paddingBottom = "18px";
    intro.style.borderBottom = "1px solid var(--line)";
    intro.textContent = narrativeText;
    storyViewText.append(intro);
  }

  const timelineItems = Array.isArray(items) ? items.filter(Boolean) : [];
  if (timelineItems.length === 0) {
    storyViewText.textContent = t("fallbackNarrative");
    return;
  }

  const list = document.createElement("ol");
  list.className = "story-view-detail-list";

  for (const item of timelineItems) {
    const row = document.createElement("li");
    row.className = "story-view-detail-item";

    const year = document.createElement("p");
    year.className = "story-view-detail-year";
    year.textContent = String(item.year || "");

    const title = document.createElement("h3");
    title.className = "story-view-detail-title";
    title.textContent = String(item.title || "");

    const text = document.createElement("p");
    text.className = "story-view-detail-text";
    text.textContent = String(item.fullText || "");

    row.append(year, title, text);
    list.append(row);
  }

  storyViewText.append(list);
}

function buildDetailedNarrativeTimeline(timeline) {
  return (Array.isArray(timeline) ? timeline : [])
    .slice(0, 4)
    .map((point) => {
      const year = parseYear(point?.year) ?? CURRENT_YEAR;
      const title = formatStoryHeading(point?.title || "", 84) || "Этап";
      return {
        year,
        title,
        fullText: String(point?.details || "").trim() || t("fallbackNarrative"),
      };
    });
}

function buildStoryLines(narrative) {
  const cleaned = formatStoryText(narrative, 840);
  if (!cleaned) {
    return [formatStoryText(t("fallbackNarrative"), 180)];
  }

  const sentenceParts = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((line) => formatStoryLine(line))
    .filter(Boolean);

  const lines = [];
  for (const sentence of sentenceParts) {
    if (!sentence) continue;
    lines.push(sentence);
    if (lines.length === 5) break;
  }

  if (lines.length < 3) {
    const words = cleaned.split(/\s+/).filter(Boolean);
    const chunkSize = Math.ceil(words.length / 3);
    for (let i = 0; i < words.length && lines.length < 5; i += chunkSize) {
      const chunk = formatStoryLine(words.slice(i, i + chunkSize).join(" "));
      if (chunk && !lines.includes(chunk)) {
        lines.push(chunk);
      }
    }
  }

  if (lines.length === 0) {
    lines.push(formatStoryText(t("fallbackNarrative"), 180));
  }

  return lines.slice(0, 5);
}

function formatStoryLine(line) {
  const base = normalizeStoryWhitespace(line).replace(/[,:;]+$/g, "");
  if (!base) return "";
  return toNarrativeSentence(base, 170);
}

function toSingleStorySentence(text, maxLength = 112) {
  return toNarrativeSentence(text, maxLength);
}

function normalizeStoryWhitespace(text) {
  return String(text || "")
    .replace(/```json/gi, " ")
    .replace(/```/g, " ")
    .replace(/\bjson\b/gi, " ")
    .replace(/"narrative"\s*:/gi, " ")
    .replace(/"timeline"\s*:/gi, " ")
    .replace(/"branches"\s*:/gi, " ")
    .replace(/[{}[\]`]/g, " ")
    .replace(/[‐‑‒–—―-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cutTextAtBoundary(text, maxLength) {
  const value = String(text || "").trim();
  if (!value) return "";
  if (!Number.isFinite(maxLength) || maxLength < 1 || value.length <= maxLength) {
    return value;
  }

  const hardSlice = value.slice(0, maxLength + 1);
  const minimumCutPoint = Math.max(1, Math.floor(maxLength * 0.55));
  const punctuationIndex = Math.max(
    hardSlice.lastIndexOf("."),
    hardSlice.lastIndexOf("!"),
    hardSlice.lastIndexOf("?")
  );

  if (punctuationIndex >= minimumCutPoint) {
    return hardSlice.slice(0, punctuationIndex + 1).trim();
  }

  const wordBoundary = hardSlice.lastIndexOf(" ");
  if (wordBoundary >= minimumCutPoint) {
    return hardSlice.slice(0, wordBoundary).trim();
  }

  return hardSlice.slice(0, maxLength).trim();
}

function trimToCompleteSentence(text, maxLength) {
  const value = String(text || "").trim();
  if (!value) return "";
  if (!Number.isFinite(maxLength) || maxLength < 1) return value;

  if (value.length <= maxLength) {
    return value;
  }

  const cut = value.slice(0, maxLength).trim();
  if (!cut) return "";
  if (/[.!?]$/.test(cut)) return cut;

  const lastPunctuation = Math.max(cut.lastIndexOf("."), cut.lastIndexOf("!"), cut.lastIndexOf("?"));
  if (lastPunctuation === -1) return "";
  return cut.slice(0, lastPunctuation + 1).trim();
}

function extractSentences(text, limit = 6, maxLength = 220) {
  const normalized = normalizeStoryWhitespace(text);
  if (!normalized) return [];

  const matches = normalized.match(/[^.!?]+[.!?]/g) || [];
  const result = [];
  for (const sentence of matches) {
    const clean = toNarrativeSentence(sentence, maxLength);
    if (!clean) continue;
    result.push(clean);
    if (result.length >= limit) break;
  }
  return result;
}

function toNarrativeSentence(text, maxLength = 180) {
  const normalized = normalizeStoryWhitespace(text).replace(/[,:;]+$/g, "");
  if (!normalized) return "";

  const sentences = normalized.match(/[^.!?]+[.!?]/g) || [];
  for (const sentence of sentences) {
    const clean = normalizeStoryWhitespace(sentence);
    if (!clean) continue;
    if (clean.length <= maxLength) return clean;
    if (clean.length <= maxLength + 34) return clean;
  }

  if (sentences.length > 0) {
    return "";
  }

  if (normalized.length <= maxLength) {
    return `${normalized}.`;
  }
  return "";
}

function trimToWordBoundary(text) {
  const value = String(text || "").trim();
  if (!value) return "";
  if (/[.!?]$/.test(value)) return value;

  const lastSpace = value.lastIndexOf(" ");
  if (lastSpace > 0) {
    return value.slice(0, lastSpace).trim();
  }
  return value;
}

function removeBrokenTail(text) {
  const value = String(text || "").trim();
  if (!value) return "";
  return value.replace(/\s+[A-Za-zА-Яа-яЁё]$/u, "").trim();
}

function buildStoryTheses(scenario, sourceEvent = "") {
  const timeline = normalizeTimeline(scenario?.timeline, sourceEvent);
  const locale = normalizeLocale(currentLocale);
  const fallbackTitle = locale === "en" ? "system shift" : "системный сдвиг";

  return timeline.slice(0, 4).map(point => {
    const year = parseYear(point?.year) ?? CURRENT_YEAR;

    let title = String(point?.title || fallbackTitle).trim();
    title = locale === "en" ? title.toLowerCase() : title.toLocaleLowerCase("ru-RU");
    title = title.replace(/[.!?]+$/, "");

    let details = String(point?.details || t("fallbackNarrative")).trim();
    if (details.length > 260) {
      details = details.slice(0, 257).trim() + "…";
    }

    return { year, title, details };
  });
}

function buildCardTeaser(point, index = 0) {
  const locale = normalizeLocale(currentLocale);
  const fallbackTitle = locale === "en" ? "system shift" : "системный сдвиг";
  const fallbackDetails = t("fallbackNarrative");

  const titleRaw = formatStoryHeading(point?.title || "", 52);
  const titleBase = toCardLowercase(titleRaw, locale) || fallbackTitle;
  const detailsBase = toNarrativeSentence(point?.details || fallbackDetails, 260);
  const scrub = (value) =>
    normalizeStoryWhitespace(String(value || ""))
      .replace(/[\\-–—]/g, " ")
      .replace(/[.!?]+$/g, "")
      .trim();
  const title = scrub(titleBase);
  let details = scrub(detailsBase);
  if (details.length > 240) {
    details = details.slice(0, 240).trim();
  }

  return `${title}. ${details}`;
}

function toCardLowercase(text, locale) {
  const value = normalizeStoryWhitespace(text).replace(/[.!?]+$/g, "").trim();
  if (!value) return "";
  if (locale === "en") return value.toLowerCase();
  return value.toLocaleLowerCase("ru-RU");
}

function toCardEssence(text, locale) {
  const sentence = toNarrativeSentence(text, 120);
  if (!sentence) return "";
  const cleaned = normalizeStoryWhitespace(sentence).replace(/[.!?]+$/g, "").trim();
  if (!cleaned) return "";
  const words = cleaned.split(/\s+/).filter(Boolean).slice(0, 12).join(" ");
  if (!words) return "";
  if (locale === "en") return words.toLowerCase();
  return words.toLocaleLowerCase("ru-RU");
}

function renderStoryTheses(theses) {
  if (!storyCardTheses) return;
  storyCardTheses.innerHTML = "";

  for (const item of theses) {
    const li = document.createElement("li");
    li.className = "story-thesis-item";

    const head = document.createElement("div");
    head.className = "story-thesis-head";

    const year = document.createElement("strong");
    year.className = "story-thesis-year";
    year.textContent = `${item.year}: `;

    const title = document.createElement("span");
    title.className = "story-thesis-title";
    title.textContent = `${item.title}.`;

    head.append(year, title);

    const text = document.createElement("span");
    text.className = "story-thesis-details";
    text.textContent = item.details;

    li.append(head, text);
    storyCardTheses.append(li);
  }
}

function setUiBusy(state) {
  const label = state ? t("submitLoading") : t("submitIdle");
  button.disabled = state;
  button.textContent = "↗";
  button.setAttribute("aria-label", label);
  button.setAttribute("title", label);
  storyDownloadButton.disabled = state || !activeStoryPayload;
  storyShareButton.disabled = state || !activeStoryPayload;

  for (const branchButton of messages.querySelectorAll(".branch-btn")) {
    branchButton.disabled = state;
  }
}

function normalizeScenario(data, sourceEvent = "") {
  const raw = data?.scenario;
  if (!raw || typeof raw !== "object") {
    if (typeof data?.reply === "string") {
      return buildFallbackScenario(data.reply);
    }
    return null;
  }

  const narrative =
    typeof raw.narrative === "string" && raw.narrative.trim()
      ? raw.narrative.trim()
      : t("fallbackNarrative");

  const timeline = normalizeTimeline(raw.timeline, sourceEvent);
  const branches = normalizeBranches(raw.branches);
  return { narrative, timeline, branches };
}

function normalizeTimeline(rawTimeline, sourceEvent = "") {
  const baseYear = extractEventYear(sourceEvent) ?? deriveTimelineBaseYear(rawTimeline) ?? CURRENT_YEAR;
  const defaults = buildTimelineDefaults(baseYear);

  if (!Array.isArray(rawTimeline)) {
    return defaults;
  }

  const parsed = rawTimeline
    .slice(0, 8)
    .map((point, index) => {
      const fallback = defaults[Math.min(index, defaults.length - 1)];
      const year = Math.max(
        baseYear,
        parseYear(point?.year) ?? fallback.year
      );
      const title =
        typeof point?.title === "string" && point.title.trim()
          ? point.title.trim()
          : normalizeLocale(currentLocale) === "en"
            ? `stage ${index + 1}`
            : `этап ${index + 1}`;
      const details =
        typeof point?.details === "string" && point.details.trim()
          ? point.details.trim()
          : fallback.details;
      return { year, title, details };
    })
    .sort((a, b) => a.year - b.year);

  const dedupedByYear = dedupeTimelineByYear(parsed);
  const filtered = filterTimelineNearDuplicates(dedupedByYear, defaults, baseYear);
  const filled = fillTimelineToFour(filtered, defaults, baseYear);
  return enforceChronologicalTimeline(filled, baseYear).slice(0, 4);
}

function buildTimelineDefaults(baseYear) {
  const safeBase = Number.isFinite(baseYear) ? baseYear : CURRENT_YEAR;
  const secondYear = safeBase + 2;
  const thirdYear = safeBase + 7;
  const lastYear = safeBase + 20;

  return [
    {
      year: safeBase,
      title: t("fallbackTimeline1Title"),
      details: t("fallbackTimeline1Details"),
    },
    {
      year: secondYear,
      title: t("fallbackTimeline2Title"),
      details: t("fallbackTimeline2Details"),
    },
    {
      year: thirdYear,
      title: t("fallbackTimeline3Title"),
      details: t("fallbackTimeline3Details"),
    },
    {
      year: lastYear,
      title: t("fallbackTimeline4Title"),
      details: t("fallbackTimeline4Details"),
    },
  ];
}

function extractEventYear(text) {
  const input = String(text || "");
  const match = input.match(/\b(\d{3,4})\b/);
  if (!match) return null;
  const year = Number.parseInt(match[1], 10);
  if (!Number.isFinite(year)) return null;
  if (year < 500 || year > 4000) return null;
  return year;
}

function deriveTimelineBaseYear(rawTimeline) {
  if (!Array.isArray(rawTimeline)) return null;
  let base = null;
  for (const item of rawTimeline) {
    const year = parseYear(item?.year);
    if (year === null) continue;
    if (base === null || year < base) {
      base = year;
    }
  }
  return base;
}

function timelinePointScore(point) {
  const title = normalizeStoryWhitespace(point?.title || "");
  const details = normalizeStoryWhitespace(point?.details || "");
  return title.length * 2 + details.length;
}

function dedupeTimelineByYear(items) {
  const bestByYear = new Map();
  for (const item of items) {
    const year = parseYear(item?.year);
    if (year === null) continue;
    const candidate = {
      year,
      title: normalizeStoryWhitespace(item?.title || ""),
      details: normalizeStoryWhitespace(item?.details || ""),
    };
    const existing = bestByYear.get(year);
    if (!existing || timelinePointScore(candidate) > timelinePointScore(existing)) {
      bestByYear.set(year, candidate);
    }
  }
  return Array.from(bestByYear.values()).sort((a, b) => a.year - b.year);
}

function textSimilarityRatio(a, b) {
  const tokenize = (value) =>
    normalizeStoryWhitespace(value)
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 2);

  const tokensA = tokenize(a);
  const tokensB = tokenize(b);
  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection += 1;
  }
  const union = new Set([...setA, ...setB]).size;
  if (union === 0) return 0;
  return intersection / union;
}

function filterTimelineNearDuplicates(items, defaults, baseYear) {
  const result = [];
  for (let i = 0; i < items.length; i += 1) {
    const current = items[i];
    const previous = result[result.length - 1];

    if (!previous) {
      result.push(current);
      continue;
    }

    const prevText = `${previous.title} ${previous.details}`;
    const currText = `${current.title} ${current.details}`;
    const ratio = textSimilarityRatio(prevText, currText);

    if (ratio < 0.7) {
      result.push(current);
      continue;
    }

    const fallback = defaults[Math.min(result.length, defaults.length - 1)];
    result.push({
      year: Math.max(baseYear, previous.year + 1, fallback.year),
      title: fallback.title,
      details: fallback.details,
    });
  }
  return result;
}

function fillTimelineToFour(items, defaults, baseYear) {
  const filled = [...items];
  while (filled.length < 4) {
    const index = filled.length;
    const fallback = defaults[Math.min(index, defaults.length - 1)];
    const prevYear = filled.length > 0 ? filled[filled.length - 1].year : baseYear;
    filled.push({
      year: Math.max(baseYear, prevYear + 1, fallback.year),
      title: fallback.title,
      details: fallback.details,
    });
  }
  return filled;
}

function enforceChronologicalTimeline(items, baseYear) {
  const sorted = [...items].sort((a, b) => a.year - b.year);
  let lastYear = baseYear - 1;
  return sorted.map((item) => {
    const rawYear = parseYear(item?.year) ?? baseYear;
    const year = Math.max(baseYear, rawYear, lastYear + 1);
    lastYear = year;
    return {
      year,
      title: normalizeStoryWhitespace(item?.title || ""),
      details: normalizeStoryWhitespace(item?.details || ""),
    };
  });
}

function normalizeBranches(rawBranches) {
  const defaults = [t("fallbackBranch1"), t("fallbackBranch2"), t("fallbackBranch3")];

  if (!Array.isArray(rawBranches)) {
    return defaults.slice(0, 3);
  }

  const unique = [];
  for (const entry of rawBranches) {
    const branch = typeof entry === "string" ? entry.trim() : "";
    if (!branch || unique.includes(branch)) continue;
    unique.push(branch);
    if (unique.length >= 3) break;
  }

  while (unique.length < 2) {
    unique.push(defaults[unique.length]);
  }

  return unique.slice(0, 3);
}

function parseYear(value) {
  const year = Number.parseInt(String(value), 10);
  if (!Number.isFinite(year)) return null;
  if (year < 500 || year > 4000) return null;
  return year;
}

function buildFallbackScenario(text) {
  return {
    narrative: text.trim(),
    timeline: normalizeTimeline([], ""),
    branches: normalizeBranches([]),
  };
}

function pushHistory(entry) {
  history = [entry, ...history].slice(0, HISTORY_LIMIT);
  saveHistory(history);
  renderHistory();
}

function toHistoryScenario(scenario) {
  return {
    narrative: scenario.narrative,
    timeline: scenario.timeline,
    branches: scenario.branches,
  };
}

function renderHistory() {
  historyList.innerHTML = "";

  if (history.length === 0) {
    const empty = document.createElement("p");
    empty.className = "history-empty";
    empty.textContent = t("historyEmpty");
    historyList.append(empty);
    return;
  }

  for (const item of history) {
    const card = document.createElement("article");
    card.className = "history-item";

    const title = document.createElement("h3");
    title.textContent = item.event;

    const meta = document.createElement("p");
    meta.className = "history-meta";
    meta.textContent = formatDate(item.createdAt);

    const preview = document.createElement("p");
    preview.className = "history-preview";
    preview.textContent = shorten(item?.scenario?.narrative || "", 180);

    const actions = document.createElement("div");
    actions.className = "history-actions";

    const openButton = document.createElement("button");
    openButton.type = "button";
    openButton.className = "ghost-btn";
    openButton.textContent = t("historyOpen");
    openButton.addEventListener("click", () => {
      if (item.locale && item.locale !== currentLocale) {
        switchLocale(item.locale);
      }
      if (item?.scenario) {
        renderStoryResult(item.scenario, item.rootEvent || item.event);
        storyStage.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });

    actions.append(openButton);
    card.append(title, meta, preview, actions);
    historyList.append(card);
  }
}

function openSharePanel(payload, anchorEl = null) {
  currentSharePayload = normalizeSharePayload(payload);
  currentShareAnchor = anchorEl || null;
  renderSharePanel(currentSharePayload);
}

function closeSharePanel() {
  sharePanel.hidden = true;
  sharePanel.innerHTML = "";
  currentShareAnchor = null;
  document.body.classList.remove("share-open");
}

function renderSharePanel(payload) {
  if (!payload) return;

  const shareUrlPromise = buildShareUrl(payload);
  let shareUrl = "";
  sharePanel.hidden = false;
  document.body.classList.add("share-open");
  sharePanel.innerHTML = "";

  const card = document.createElement("article");
  card.className = "share-card";

  const top = document.createElement("div");
  top.className = "share-top";

  const title = document.createElement("h3");
  title.textContent = t("shareTitle");

  const close = document.createElement("button");
  close.type = "button";
  close.className = "ghost-btn";
  close.textContent = t("shareClose");
  close.addEventListener("click", closeSharePanel);

  top.append(title, close);

  const hint = document.createElement("p");
  hint.className = "share-hint";
  hint.textContent = t("shareHint");

  const preview = document.createElement("div");
  preview.className = "share-preview";

  const overline = document.createElement("p");
  overline.className = "share-overline";
  overline.textContent = t("shareCardTitle");

  const eventText = document.createElement("p");
  eventText.className = "share-event";
  eventText.textContent = payload.event || t("shareCardTitle");

  const summary = document.createElement("p");
  summary.className = "share-summary";
  summary.textContent = shorten(payload.scenario?.narrative || "", 220);

  preview.append(overline, eventText, summary);

  const linkLabel = document.createElement("p");
  linkLabel.className = "share-link-label";
  linkLabel.textContent = t("shareLinkLabel");

  const row = document.createElement("div");
  row.className = "share-row";

  const linkInput = document.createElement("input");
  linkInput.className = "share-input";
  linkInput.type = "text";
  linkInput.readOnly = true;
  linkInput.value = "…";

  const status = document.createElement("p");
  status.className = "share-status";
  status.textContent = "";

  const actions = document.createElement("div");
  actions.className = "share-actions";

  const downloadButton = document.createElement("button");
  downloadButton.type = "button";
  downloadButton.className = "share-action-btn share-action-primary";
  downloadButton.textContent = t("shareActionDownload");

  const shareButton = document.createElement("button");
  shareButton.type = "button";
  shareButton.className = "share-action-btn share-action-secondary";
  shareButton.textContent = t("shareActionShare");

  downloadButton.addEventListener("click", async () => {
    status.textContent = t("shareStoryRendering");
    const result = await downloadStoryCard(payload);
    if (result === "ok") {
      status.textContent = t("shareStoryReady");
      return;
    }
    status.textContent = result === "no-lib" ? t("shareStoryNoLib") : t("shareStoryError");
  });

  shareButton.addEventListener("click", async () => {
    const titleText = payload.event || t("shareCardTitle");
    const resolvedUrl = shareUrl || await shareUrlPromise;
    if (!resolvedUrl) {
      status.textContent = t("shareCopyFail");
      return;
    }

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: titleText,
          url: resolvedUrl,
        });
        status.textContent = t("shareShared");
        return;
      } catch (error) {
        if (error && typeof error === "object" && error.name === "AbortError") {
          status.textContent = "";
          return;
        }
      }
    }

    const copied = await copyToClipboard(resolvedUrl);
    status.textContent = copied ? t("shareCopied") : t("shareCopyFail");
  });

  row.append(linkInput);
  actions.append(downloadButton, shareButton);
  card.append(top, hint, preview, linkLabel, row);
  sharePanel.append(card, actions, status);
  positionSharePanel(currentShareAnchor);

  shareUrlPromise.then((url) => {
    shareUrl = url;
    linkInput.value = url || "";
  });
}

function positionSharePanel(anchorEl) {
  if (anchorEl) {
    // Anchor-based placement is disabled for full-screen overlay mode.
  }
  delete sharePanel.dataset.placement;
  sharePanel.style.left = "";
  sharePanel.style.top = "";
}

async function downloadStoryCard(payload) {
  if (!shareCardTemplate || !storyCardEvent || !storyCardTheses) {
    return "error";
  }

  const eventText = formatStoryText(payload?.event || t("shareCardTitle"), 90);
  const theses = buildStoryTheses(payload?.scenario || {}, payload?.event || "");
  storyCardEvent.textContent = eventText;
  renderStoryTheses(theses);

  return downloadCard();
}

async function downloadCard() {
  const card = document.getElementById("share-card-template");
  if (!card) {
    return "error";
  }
  if (typeof window.html2canvas !== "function") {
    return "no-lib";
  }

  const previousDisplay = card.style.display;
  card.style.display = "block";

  try {
    const canvas = await window.html2canvas(card, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#f8f8f8",
    });

    const link = document.createElement("a");
    link.download = `butterfly-history-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    return "ok";
  } catch {
    return "error";
  } finally {
    card.style.display = previousDisplay;
  }
}

function formatStoryText(text, maxLength) {
  const normalized = normalizeStoryWhitespace(text);
  if (!normalized) return "";
  if (normalized.length <= maxLength) return normalized;
  const sliced = removeBrokenTail(
    cutTextAtBoundary(normalized, maxLength).replace(/[,:;]+$/g, "")
  );
  if (!sliced) return "";
  return `${sliced}.`;
}

function formatStoryHeading(text, maxLength) {
  const normalized = normalizeStoryWhitespace(text).replace(/[.!?]+$/g, "");
  if (!normalized) return "";
  if (normalized.length <= maxLength) return normalized;
  const sliced = cutTextAtBoundary(normalized, maxLength).replace(/[.!?]+$/g, "").trim();
  return sliced;
}

function normalizeSharePayload(payload) {
  const scenario = payload?.scenario || {};
  return {
    v: 1,
    locale: normalizeLocale(payload?.locale || currentLocale),
    event: String(payload?.event || "").trim(),
    createdAt: Number(payload?.createdAt) || Date.now(),
    scenario: {
      narrative: String(scenario.narrative || "").trim(),
      timeline: normalizeTimeline(scenario.timeline, payload?.event || ""),
      branches: normalizeBranches(scenario.branches),
    },
  };
}

async function buildShareUrl(payload) {
  const url = new URL(window.location.href);
  const shareId = await storeSharePayload(payload);
  if (shareId) {
    url.searchParams.set("s", shareId);
    url.searchParams.delete("share");
    return url.toString();
  }
  const token = encodeSharePayload(payload);
  if (token) {
    url.searchParams.delete("s");
    url.searchParams.set("share", token);
    return url.toString();
  }
  return url.toString();
}

async function hydrateSharedScenarioFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const shareId = params.get("s");
  if (shareId) {
    const decoded = await fetchSharedPayload(shareId);
    if (!decoded || !decoded.scenario) return;
    const locale = normalizeLocale(decoded.locale || currentLocale);
    if (locale !== currentLocale) {
      currentLocale = locale;
      saveLocale(currentLocale);
      applyLocale(currentLocale);
    }

    renderStoryResult(
      {
        narrative: decoded.scenario.narrative || t("fallbackNarrative"),
        timeline: normalizeTimeline(decoded.scenario.timeline, decoded.event || ""),
        branches: normalizeBranches(decoded.scenario.branches),
      },
      decoded.event || t("shareCardTitle")
    );
    openSharePanel(decoded, storyShareButton);
    return;
  }

  const token = params.get("share");
  if (!token) return;

  const decoded = decodeSharePayload(token);
  if (!decoded || !decoded.scenario) return;

  const locale = normalizeLocale(decoded.locale || currentLocale);
  if (locale !== currentLocale) {
    currentLocale = locale;
    saveLocale(currentLocale);
    applyLocale(currentLocale);
  }

  renderStoryResult(
    {
      narrative: decoded.scenario.narrative || t("fallbackNarrative"),
      timeline: normalizeTimeline(decoded.scenario.timeline, decoded.event || ""),
      branches: normalizeBranches(decoded.scenario.branches),
    },
    decoded.event || t("shareCardTitle")
  );
  openSharePanel(decoded, storyShareButton);
}

async function storeSharePayload(payload) {
  try {
    const response = await fetch("/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) return "";
    const data = await response.json();
    return typeof data?.id === "string" ? data.id : "";
  } catch {
    return "";
  }
}

async function fetchSharedPayload(id) {
  try {
    const response = await fetch(`/api/share/${encodeURIComponent(id)}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data && typeof data === "object" ? data : null;
  } catch {
    return null;
  }
}
function encodeSharePayload(payload) {
  try {
    const json = JSON.stringify(payload);
    const bytes = new TextEncoder().encode(json);
    let binary = "";
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  } catch {
    return "";
  }
}

function decodeSharePayload(token) {
  try {
    const normalized = String(token).replace(/-/g, "+").replace(/_/g, "/");
    const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
    const binary = atob(normalized + padding);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

async function copyToClipboard(value) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    try {
      const helper = document.createElement("textarea");
      helper.value = value;
      helper.setAttribute("readonly", "");
      helper.style.position = "absolute";
      helper.style.left = "-9999px";
      document.body.append(helper);
      helper.select();
      const result = document.execCommand("copy");
      helper.remove();
      return result;
    } catch {
      return false;
    }
  }
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "";
  return new Intl.DateTimeFormat(currentLocale === "en" ? "en-US" : "ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function shorten(value, maxLength) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}

function saveHistory(value) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(value));
}

function readHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (item) =>
          typeof item?.event === "string" &&
          typeof item?.createdAt === "string" &&
          item?.scenario &&
          typeof item.scenario === "object"
      )
      .slice(0, HISTORY_LIMIT);
  } catch {
    return [];
  }
}

function readLocale() {
  return normalizeLocale(localStorage.getItem(LOCALE_KEY));
}

function saveLocale(locale) {
  localStorage.setItem(LOCALE_KEY, normalizeLocale(locale));
}

function normalizeLocale(locale) {
  return String(locale || "").toLowerCase() === "en" ? "en" : "ru";
}

function t(key) {
  const dict = I18N[currentLocale] || I18N.ru;
  return dict[key] || I18N.ru[key] || key;
}
