# Цели Яндекс.Метрики

Дата: 2026-04-12

## Что важно

Сайт теперь отправляет события `ym(..., "reachGoal", ...)`.

Чтобы они появились в интерфейсе Яндекс.Метрики как обычные цели, нужно создать JavaScript-цели с точно такими именами:

- `bh_generation_started`
- `bh_generation_completed`
- `bh_archive_page_viewed`
- `bh_scenario_page_viewed`
- `bh_scenario_png_opened`
- `bh_scenario_share_clicked`
- `bh_donation_clicked`
- `bh_telegram_clicked`

## Что означает каждая цель

- `bh_generation_started`
  - пользователь запустил новую генерацию сценария
- `bh_generation_completed`
  - генерация успешно вернула готовый сценарий
- `bh_archive_page_viewed`
  - пользователь открыл страницу `/scenarios`
- `bh_scenario_page_viewed`
  - пользователь открыл страницу сценария
  - сюда входят и публичные страницы, и страницы только по ссылке
- `bh_scenario_png_opened`
  - пользователь открыл или скачал PNG-карточку сценария
- `bh_scenario_share_clicked`
  - пользователь нажал кнопку шаринга (sharing, поделиться)
- `bh_donation_clicked`
  - пользователь нажал кнопку доната
- `bh_telegram_clicked`
  - пользователь нажал ссылку на Telegram

## Какие параметры еще отправляются

Сайт также может передавать короткие служебные параметры:

- `page_kind` — тип страницы
- `language` — язык
- `mode` — режим генерации
- `provider` — провайдер модели
- `model` — модель
- `format` — формат карточки
- `network` — источник шаринга
- `has_filters` — есть ли активные фильтры в архиве

Текст сценария и пользовательский запрос в эти параметры не отправляются.
