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

## 3. Двухуровневая система обновлений

Архитектура разделяет обновления на **легковесные Live OTA** и **нативные APK-релизы**:

```
                              ┌─────────────────────────────────────────┐
                              │            Внесение изменений           │
                              └────────────────────┬────────────────────┘
                                                   │
                         ┌─────────────────────────┴─────────────────────────┐
                         ▼                                                   ▼
         [Изменения UI / JS / Vue / стилей]                  [Системные изменения Android]
                         │                                                   │
                         ▼                                                   ▼
             npm run deploy:ota                                 git tag vX.Y.Z && git push
                         │                                                   │
                         ▼                                                   ▼
            Сборка dist.zip (~1.7 МБ)                                GitHub Actions CI
                         │                                                   │
                         ▼                                                   ▼
          Загрузка в PocketBase app_updates                    Сборка и подпись APK-файла
                         │                                                   │
                         ▼                                                   ▼
         Мгновенное обновление у клиентов                     Релиз APK на GitHub Releases
           по воздуху без переустановки
```

### 3.1. Уровень 1: Live OTA Updates (по воздуху, 99% случаев)
* **Плагин:** `@capgo/capacitor-updater` (версия 6.53.0).
* **Скрипт деплоя:** [`scripts/deploy_ota.mjs`](file:///c:/Users/pumpu/Desktop/n.eco-part-storage/scripts/deploy_ota.mjs) (`npm run deploy:ota`).
* **Как работает:**
  1. Nuxt собирает SPA (`npm run generate`) в директорию `dist/`.
  2. Скрипт упаковывает файлы в `dist.zip` (~1.73 МБ).
  3. Скрипт авторизуется в PocketBase как суперпользователь и создает запись в коллекции `app_updates` с прикрепленным файлом `bundle_zip`.
  4. При открытии приложения компонент [`AppUpdateModal.vue`](file:///c:/Users/pumpu/Desktop/n.eco-part-storage/components/AppUpdateModal.vue) через [`useAppUpdater.ts`](file:///c:/Users/pumpu/Desktop/n.eco-part-storage/composables/useAppUpdater.ts) обращается к PocketBase (`getList(1, 1, { sort: '-build_number' })`).
  5. Если найден новый `build_number`, плагин скачивает zip, распаковывает в кэш приложения и перезагружает WebView.

### 3.2. Уровень 2: Полный нативный APK (GitHub Actions)
* **CI-конфиг:** [`.github/workflows/build-apk.yml`](file:///c:/Users/pumpu/Desktop/n.eco-part-storage/.github/workflows/build-apk.yml).
* **Скрипт конфигурирования:** [`scripts/configure_android.py`](file:///c:/Users/pumpu/Desktop/n.eco-part-storage/scripts/configure_android.py).
* **Когда необходим:**
  * Установка новых нативных плагинов Capacitor (`@capacitor/*`).
  * Изменение системных разрешений в `AndroidManifest.xml`.
  * Обновление иконок приложения или виджетов Android.
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
    * `id`, `email`, `name`, `company_name`
    * `valid_until` (Date) — дата окончания лицензии/триала
    * `license_status` (Select: `trial`, `active`, `expired`)
    * `device_id` (Text)
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
