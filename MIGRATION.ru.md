# Переход на 1.0

[English](MIGRATION.md) · [Документация клиента](README.ru.md)

Инструкция для проектов с `consul@2.x` и `@truestealth/consul@0.1.x`. В
`1.0.0-beta.1` первым шагом меняется формат модулей. Новый HTTP-слой и расширение
API идут следующими этапами; beta пока не равна будущему стабильному 1.0.0.

## Сначала среда и имя пакета

Обновите приложение до Node.js 24 или новее. Основную проверку приложения
проводите на 24; сам клиент также проверяется в CI на 26.

```sh
npm uninstall consul
npm install @truestealth/consul@1.0.0-beta.1
```

Если scoped-пакет уже используется, удалять `consul` не требуется. Проверьте
алиасы зависимостей, mocks и пути импорта: прежнее имя само не заменится.

## Затем подключение

Было:

```js
const Consul = require("consul");
const consul = new Consul();
```

Стало:

```js
import Consul from "@truestealth/consul";
const consul = new Consul();
```

Пакет теперь ESM-only. Для приложения можно выбрать `.mjs` или добавить
`"type": "module"` в его `package.json`. Второй вариант затронет все `.js` в
области действия package, а не только файл с клиентом: проверьте конфиги,
скрипты и тесты. Файлы, которым еще нужен CommonJS, переименуйте в `.cjs`.

Если весь проект переводить на ESM пока рано, используйте асинхронный импорт
внутри существующего CommonJS-кода:

```js
async function start() {
  const { default: Consul } = await import("@truestealth/consul");
  const consul = new Consul();
  try {
    return await consul.status.leader();
  } finally {
    consul.destroy();
  }
}
```

Не рассчитывайте на прежний результат `require()` — конструктор напрямую.
Отдельной CommonJS-сборки нет. Подключайте корень пакета, а не внутренние файлы
`lib/`: доступные entry points закреплены в `exports`.

## Настройки TypeScript

Для Node.js задайте `module: "NodeNext"` и `moduleResolution: "NodeNext"`.
Исходники приложения должны определяться как ESM: через package с
`"type": "module"` или расширение `.mts`. Вместо
`import Consul = require("consul")` используйте default import из примера выше.
Типы уже входят в клиент; отдельный `@types/consul` не нужен.

## Что проверить в своем коде

Функциональные разделы остаются прежними: `kv`, `agent`, `health`, `catalog`,
`session`, `query`, `event`, `status`, `transaction`, `acl` и `watch`.
Методы по-прежнему возвращают Promise, но старые неточности типов не стоит
переносить в приложение:

- Отсутствующий ключ или префикс KV возвращает `undefined`. Это не `null` и не
  пустой массив. У существующей записи само поле `Value` может быть `null`.
- В обычном KV read значение уже строка. Для бинарных данных нужен
  `buffer: true`; `raw: true` дает Buffer без метаданных независимо от `buffer`.
- Результат CAS проверяется явно: `false` означает, что запись не применена.
- Для `health.node()` передавайте `{ node: "node-name" }`, не `{ name: ... }`.
- При завершении приложения остановите каждую подписку через `watch.end()`,
  после этого вызовите `consul.destroy()`.

Унаследованные legacy endpoint требуют отдельной проверки с вашей версией
сервера: наличие метода в клиенте не гарантирует поддержку со стороны Consul.

## Границы этой beta

В `1.0.0-beta.1` запросы еще выполняются через Papi. Нативного AbortSignal,
Config Entries и управления service-intentions через Config Entries пока нет.
Отмена доступна через событие `"cancel"` у EventEmitter `ctx`. Для
`ctx.includeResponse: true` типы результата корректны пока только в KV.

Старое поведение `destroy()` также сохраняется: закрывается даже переданный
пользователем agent. Не используйте один agent совместно с другими клиентами.

Перед переходом прогоните свои сценарии на настоящем Consul: ACL, HTTPS,
бинарные значения, отказ CAS, blocking queries и завершение watch. Для
Enterprise проверьте используемые namespace и partition отдельно.
