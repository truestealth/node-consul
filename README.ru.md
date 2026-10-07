# @truestealth/consul

[English](README.md) · [Переход на новую версию](MIGRATION.ru.md)

Клиент HTTP API Consul для Node.js: привычные разделы API, методы с Promise и
типы TypeScript в самом пакете. Это самостоятельный проект на основе
`silas/node-consul`, а не надстройка с DNS-резолвером или внешним хранилищем.

## Что нужно для работы

- **Node.js 24 или новее**. В CI проверяются версии 24 и 26. Состояние веток
  можно сверить с [таблицей Node.js](https://nodejs.org/en/about/previous-releases).
- Проект использует **нативный ESM**. Отдельной CommonJS-сборки нет.
- Версия `1.0.0-beta.1` — промежуточная версия для проверки перехода, не финальный
  выпуск 1.0.0. Формат модулей уже новый, HTTP-слой пока работает через Papi.
  Отказ от Papi, AbortSignal и Config Entries относятся к следующим этапам.

Если у вас стоит `consul@2.x` или `@truestealth/consul@0.1.x`, сначала прочитайте
[инструкцию миграции](MIGRATION.ru.md): менять только номер версии недостаточно.

## Первый запрос

```sh
npm install @truestealth/consul@1.0.0-beta.1
```

Пример можно сохранить в `.mjs`. Для обычных `.js` задайте `"type": "module"` в
`package.json` приложения.

```js
import Consul from "@truestealth/consul";

const consul = new Consul({
  host: "127.0.0.1",
  port: 8500,
  defaults: { token: process.env.CONSUL_HTTP_TOKEN },
});

try {
  await consul.kv.set("example/greeting", "hello");
  const item = await consul.kv.get("example/greeting");
  // item?.Value уже содержит строку "hello", не base64.
  await consul.kv.del("example/greeting");
} finally {
  consul.destroy();
}
```

Импорт не загружает `.env`, не запускает workers и не подключается к Redis или
Consul. Откуда брать настройки и секреты, решает приложение; клиент получает их
через параметры.

## Подключение и общие параметры

Без настроек клиент обращается к `http://127.0.0.1:8500/v1`.

| Параметр клиента | Для чего нужен                                                                           |
| ---------------- | ---------------------------------------------------------------------------------------- |
| `host`, `port`   | Адрес и порт агента Consul                                                               |
| `secure: true`   | HTTPS вместо HTTP                                                                        |
| `defaults`       | Общие параметры запросов; конкретный вызов может их переопределить                       |
| `agent`          | Собственный `http.Agent` или `https.Agent`; по умолчанию клиент создает keep-alive agent |

HTTP-слой также принимает `baseUrl`, `headers`, `socketPath` и параметры TLS,
включая `ca`, `cert`, `key` и `servername`. Типы этой промежуточной версии еще не
описывают все расширенные настройки подключения. Для внутреннего центра
сертификации передавайте его CA, а не отключайте проверку сертификатов.

В параметрах методов доступны `token`, `dc`, `partition`, `consistent`, `stale`,
`filter`, `near`, `index`, `wait` и `timeout`. Поддержка конкретного параметра
зависит от endpoint: сверяйтесь с
[HTTP API Consul](https://developer.hashicorp.com/consul/api-docs). Числовой
`timeout` задается в миллисекундах; можно передать и строку, например `"2s"`.

Blocking query ждет изменения индекса. Таймаут клиента должен позволять серверу
закончить ожидание:

```js
const item = await consul.kv.get({
  key: "example/greeting",
  index: "12345",
  wait: "30s",
  timeout: "35s",
});
```

Для больших индексов используйте строку или bigint, иначе можно потерять точность
JavaScript number. Параметры Enterprise не добавляют соответствующие функции
серверу Community Edition.

## KV: значения, бинарные данные и CAS

Обычный `get()` возвращает запись с метаданными. `Value` уже декодирован.
Для файла или другого бинарного содержимого явно выберите Buffer:

```js
const item = await consul.kv.get("example/greeting");
const binaryItem = await consul.kv.get({
  key: "example/binary",
  buffer: true,
});
const bytes = await consul.kv.get({ key: "example/binary", raw: true });
const items = await consul.kv.get({ key: "example/", recurse: true });
const keys = await consul.kv.keys("example/");

const created = await consul.kv.set({
  key: "example/created-once",
  value: "hello",
  cas: 0,
});
// false — условие записи не выполнено; это не успешная запись.
```

| Вызов                         | Что возвращается                                            |
| ----------------------------- | ----------------------------------------------------------- |
| `get(key)`                    | Одна запись со строковым `Value` или `undefined`            |
| `get({ key, buffer: true })`  | Одна запись с `Value: Buffer` или `undefined`               |
| `get({ key, raw: true })`     | Только значение как Buffer, без метаданных, или `undefined` |
| `get({ key, recurse: true })` | Массив записей; отсутствующий префикс дает `undefined`      |
| `keys(key)`                   | Массив имен ключей без значений                             |

`Value` может быть `null`, если так ответил Consul. При записи принимаются строка,
Buffer и `null` для пустого значения. `set()` и `del()` возвращают boolean от
сервера: проверяйте его при CAS и блокировках через session. `delete()` — еще одно
имя метода `del()`.

Для создания только отсутствующего ключа нужен `cas: 0`. При удалении нулевой CAS
имеет другой смысл: подробности в
[документации KV](https://developer.hashicorp.com/consul/api-docs/kv).

## Другие разделы

API не ограничивается KV. Сохраняются следующие разделы и способы вызова:

| Раздел        | Примеры методов                                                             |
| ------------- | --------------------------------------------------------------------------- |
| `agent`       | `self()`, `members()`, `service.register()`, `check.register()`             |
| `health`      | `node({ node })`, `service({ service, passing: true })`, `state({ state })` |
| `catalog`     | `datacenters()`, `node.list()`, `service.nodes({ service })`                |
| `session`     | `create()`, `renew({ id })`, `destroy({ id })`                              |
| `query`       | `create()`, `get()`, `execute()`, `destroy()` для prepared queries          |
| `event`       | `fire({ name, payload })`, `list()`                                         |
| `status`      | `leader()`, `peers()`                                                       |
| `transaction` | `create(operations)`                                                        |
| `acl`         | `bootstrap()`, `replication()` и унаследованный раздел `legacy`             |

Методы асинхронные и возвращают Promise. Параметры и результаты можно посмотреть
в декларациях пакета; ограничения сервера и необходимые ACL описаны в
[документации Consul](https://developer.hashicorp.com/consul/api-docs). Наличие
`acl.legacy` в клиенте не означает, что старые endpoint доступны в вашей версии
Consul.

## Подписка на изменения и завершение работы

Watch выполняет blocking reads и повторяет неудачные чтения с ограниченной
экспоненциальной задержкой. Обработчик `error` обязателен. При завершении сначала
остановите watch, затем освободите клиент:

```js
const watch = consul.watch({
  method: consul.kv.get,
  options: { key: "example/greeting", wait: "30s" },
  backoffFactor: 1000,
  backoffMax: 30000,
  maxAttempts: 5,
});

watch.on("change", (item) => {
  // Обновите настройки приложения; не отправляйте секреты в журнал.
});
watch.on("error", () => {
  // Передайте сбой в обработчик ошибок приложения.
});

// Когда приложение завершает работу:
watch.end();
consul.destroy();
```

Пока `destroy()` закрывает и переданный пользователем agent: не делите его с
другими клиентами. Отмена запроса в этой версии выполняется через EventEmitter
`ctx` и событие `"cancel"`; AbortSignal появится на следующем этапе. Типы
`ctx.includeResponse: true` сейчас корректно описаны только для KV.

## Проверки проекта

Версия pnpm закреплена в `package.json`. Основные команды:

```sh
pnpm install --frozen-lockfile
npm test
npm run types
git diff --check
npm pack --dry-run
```

Unit-тесты работают с HTTP mocks. Acceptance-тесты требуют локальный executable
Consul и подготовленную loopback-сеть; без этого `npm run acceptance` запускать
не нужно. Отдельной сборки нет: пакет содержит исходные модули и декларации.

## Происхождение и лицензии

Исходная база — [silas/node-consul](https://github.com/silas/node-consul), commit
`542f4ef61d500019460105356ab7b732262b5bdc`. Сейчас проект развивается независимо.
Авторство исходного кода и обязательные уведомления сохранены в
[LICENSE](LICENSE) и [NOTICE](NOTICE). Код распространяется по MIT; сведения о
заимствованной документации Consul находятся в `NOTICE`.
