# Архитектура проекта N.ECO Part Storage

Документ описывает актуальную архитектуру приложения, систему лицензирования, механизм гибридных обновлений и инструкции для разработчиков и ИИ-агентов.

---

## 1. Общий стек и концепция приложения

Приложение построено по гибридной архитектуре **Offline-First SPA**:
* **Клиентский фреймворк:** [Nuxt 3](https://nuxt.com/) (в режиме SPA `ssr: false`) + Vue 3 Composition API + Pinia.
* **UI-библиотека:** Nuxt UI + Tailwind CSS + Lucide Icons (полностью упакованы офлайн в клиентский JS-бандл).
* **Мобильная среда:** [Capacitor 6](https://capacitorjs.com/) (Android / iOS).
* **Локальная база данных (Offline-first):** SQLite (`@capacitor-community/sqlite`). Все данные каталога, остатков (новые / б/у), категорий и истории операций хранятся локально на устройстве и не зависят от интернета. Приложение полноценно работает на складах без связи.
* **Облачный бэкенд (Auth & Updates):** [PocketBase](https://pocketbase.io/) на VPS (VDSina). Отвечает за учет пользователей, валидацию лицензий и раздачу OTA-обновлений.

---

## 2. Система монетизации и лицензирования

### 2.1. Модель доступа
1. **Регистрация:** Пользователь регистрируется через приложение ([`AuthModal.vue`](file:///c:/Users/pumpu/Desktop/n.eco-part-storage/components/AuthModal.vue)).
2. **Бесплатный триал на 30 дней:**
   * При создании записи пользователя в PocketBase (`users`) автоматически выставляется:
     * `valid_until = now() + 30 days`
     * `license_status = 'trial'`
     * `device_id` (получается через `@capacitor/device`).
3. **Офлайн-кэширование лицензии:**
   * Статус лицензии сохраняется в `localStorage` (`neco_auth_user`, `neco_auth_token`).
   * При отсутствии сети пользователь продолжает работать с закэшированной датой окончания лицензии.
4. **Защита от перевода часов (Anti-Tamper):**
   * При каждом запуске и операции приложение фиксирует метку времени `neco_last_seen_ts`.
   * Если текущее системное время устройства меньше зафиксированного в прошлом, приложение выставляет флаг `timeTampered = true` и блокирует изменение данных до синхронизации с сервером.
5. **Мягкий Read-Only режим (Paywall):**
   * Если лицензия/триал истекли, склад **не блокируется полностью** и данные **никогда не удаляются**.
   * Пользователь всегда может:
     * Просматривать каталог и остатки.
     * Искать детали и просматривать историю.
     * Делать экспорт в Excel (.xlsx) и бэкап в JSON.
   * Блокируются только операции изменения данных (приход, списание, редактирование позиций, сброс базы). При попытке записи открывается [`PaywallModal.vue`](file:///c:/Users/pumpu/Desktop/n.eco-part-storage/components/PaywallModal.vue) с контактами для продления лицензии.

---

## 3. Система выпуска и доставки обновлений

> [!IMPORTANT]
> **Статус OTA:** В версии v1.1.6 плагин `@capgo/capacitor-updater` был удален из-за бага бесконечной перезагрузки Android. Все обновления приложения в настоящее время осуществляются через **In-App APK Update** (сборка в GitHub Actions + скачивание APK внутри приложения).  
> Подробная история, анализ причин и статус: см. отдельный документ [`docs/OTA_UPDATES_STATUS_AND_POSTMORTEM.md`](file:///c:/Users/pumpu/Desktop/n.eco-part-storage/docs/OTA_UPDATES_STATUS_AND_POSTMORTEM.md).

```
                               ┌─────────────────────────────────────────┐
                               │            Внесение изменений           │
                               │        (в UI, базу, логику или Android) │
                               └────────────────────┬────────────────────┘
                                                    │
                                                    ▼
                                         git tag vX.Y.Z && git push
                                                    │
                                                    ▼
                                            GitHub Actions CI
                                    (.github/workflows/build-apk.yml)
                                                    │
                                                    ▼
                                       Сборка и подпись APK-файла
                                                    │
                                                    ▼
                                       Релиз APK на GitHub Releases
                                                    │
                                                    ▼
                                     Загрузка APK в PocketBase (VPS)
                                                    │
                                                    ▼
                                   Обновление в 1 клик внутри приложения
                                        (с сохранением всех данных)
```

### 3.1. Механизм In-App APK Updates
* **Компоненты:** [`composables/useAppUpdater.ts`](file:///c:/Users/pumpu/Desktop/n.eco-part-storage/composables/useAppUpdater.ts), [`components/AppUpdateModal.vue`](file:///c:/Users/pumpu/Desktop/n.eco-part-storage/components/AppUpdateModal.vue).
* **Как работает:**
  1. При запуске или через Настройки клиент запрашивает актуальный релиз с сервера PocketBase (`app_updates`) или GitHub Releases API.
  2. Если обнаружена версия новее текущей с прикрепленным `apk_file`, пользователю показывается окно с описанием релиза.
  3. По нажатию кнопки «Скачать и обновить» файл `.apk` скачивается через `@capacitor/filesystem` в кэш устройства и открывается через `@capacitor-community/file-opener`.
  4. Обновление устанавливается поверх существующего приложения без удаления данных SQLite / IndexedDB и без потери сессии авторизации.

### 3.2. Сборка нативного APK (GitHub Actions)
* **CI-конфиг:** [`.github/workflows/build-apk.yml`](file:///c:/Users/pumpu/Desktop/n.eco-part-storage/.github/workflows/build-apk.yml).
* **Скрипт конфигурирования:** [`scripts/configure_android.py`](file:///c:/Users/pumpu/Desktop/n.eco-part-storage/scripts/configure_android.py).
* **Когда выполняется:** При каждом пуше тега `v*` (например, `git tag -a v1.1.9 -m "Описание" && git push origin v1.1.9`).
* **Особенности Android-конфигурации:**
  * `minSdkVersion = 23`, `compileSdkVersion = 35`, Java 17, Gradle 8.
  * Постоянный ключ подписи: `keystore/release.keystore` (пароль `necopart2026`, алиас `necopart`).
  * Обход ограничений WebView HTTP/MixedContent:
    * `server: { androidScheme: 'http', cleartext: true }` в `capacitor.config.ts`.
    * `CapacitorHttp: { enabled: true }` — перенаправляет fetch через нативный стек OkHttp.
    * `android:networkSecurityConfig="@xml/network_security_config"` — явное разрешение трафика для IP сервера.
    * `WebSettings.MIXED_CONTENT_ALWAYS_ALLOW` в `MainActivity.java`.
  * Виджеты рабочего стола Android:
    * Компактный информационный виджет (`NecoPartsWidgetProvider`).
    * Функциональный виджет быстрых действий (`NecoQuickActionWidgetProvider`): Поиск, Списание, Приход, Дефицит.

---

## 4. Серверная часть (PocketBase на VPS)

* **Хостинг:** VPS VDSina, ОС Linux (Ubuntu/Debian).
* **Расположение бинарника:** `/opt/pocketbase/pocketbase`.
* **URL:** `http://195.209.213.115:8090` (Админка: `http://195.209.213.115:8090/_/`).
* **Структура коллекций:**
  * `users` (Auth-коллекция):
    * `id`, `email`
    * `valid_until` (Date) — дата окончания лицензии/триала
    * `license_status` (Select: `trial`, `active`, `expired`)
    * `device_id` (Text)
    * `last_login` (Date) — дата и время последнего захода/активности в приложении
    * `createRule = ""` (публичная регистрация разрешена).
  * `app_updates` (Base-коллекция):
    * `version` (Text, например `v1.1.4`)
    * `build_number` (Number, timestamp)
    * `bundle_zip` (File, max 50 MB, zip) — архив для OTA
    * `apk_file` (File, max 100 MB) — опциональный APK
    * `changelog` (Text)
    * `is_mandatory` (Bool)
    * `listRule = ""`, `viewRule = ""` (публичное чтение разрешено).

---

## 5. Важная инструкция для ИИ-агентов (AI Assistant Guide)

> [!IMPORTANT]
> **Учетные данные и доступ к серверу:**
> Если ИИ-агенту для решения задач (деплой, миграция схемы базы, управление службами на VPS, настройка доменов/HTTPS, выпуск сертификатов) требуются актуальные пароли или учетные записи от:
> 1. PocketBase Superuser (админки);
> 2. SSH/Root доступа на VPS VDSina;
> 3. GitHub токенов или секретов репозитория;
>
> **Агент ОБЯЗАН прямо запросить эти данные у пользователя в диалоге.**
> Запрещается пытаться угадывать, генерировать фиктивные пароли или выполнять потенциально деструктивные команды без подтверждения пользователя.
