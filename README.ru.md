# @truestealth/consul

[English](README.md) · [Переход на новую версию](MIGRATION.ru.md)

Клиент HTTP API HashiCorp Consul для Node.js: привычные разделы API, методы с
Promise и типы TypeScript в самом пакете. Это самостоятельный общественный
проект, не официальный клиент HashiCorp. DNS-резолвер и внешнее хранилище ему
не нужны.

## Что нужно для работы

- **Node.js 24 или новее**. В CI проверяются версии 24 и 26. Состояние веток
  можно сверить с [таблицей Node.js](https://nodejs.org/en/about/previous-releases).
- Проект использует **нативный ESM**. Отдельной CommonJS-сборки нет.
- Runtime-зависимостей нет: запросы выполняются через стандартные `http` и
  `https` Node.js.
- В `1.0.0-beta.2` проверяются новый HTTP-слой и управление ресурсами. Config
  Entries идут следующим этапом. Финальный 1.0.0 появится после acceptance и
  проверок выпуска.

Если у вас стоит `consul@2.x` или `@truestealth/consul@0.1.x`, сначала прочитайте
[инструкцию миграции](MIGRATION.ru.md): менять только номер версии недостаточно.

## Первый запрос

```sh
npm install @truestealth/consul@1.0.0-beta.2
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

| Параметр клиента | Для чего нужен                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------- |
| `host`, `port`   | Адрес и порт агента Consul                                                                                          |
| `secure: true`   | HTTPS вместо HTTP                                                                                                   |
| `defaults`       | Общие параметры запросов; конкретный вызов может их переопределить                                                  |
| `agent`          | Ваш `http.Agent` или `https.Agent`; `false` отключает пул, по умолчанию клиент создает собственный keep-alive agent |

В конструкторе также доступны `baseUrl`, `headers`, `socketPath` и параметры TLS:
`ca`, `cert`, `key`, `servername` и другие настройки Node.js. Для внутреннего
центра сертификации передавайте его CA, а не отключайте проверку сертификатов.
Если передаете свой agent, его настройка и окончательное закрытие остаются за вами.

```js
import { readFile } from "node:fs/promises";

const consul = new Consul({
  host: "consul.internal",
  port: 8501,
  secure: true,
  ca: await readFile("./certs/ca.pem"),
  cert: await readFile("./certs/client.pem"),
  key: await readFile("./certs/client-key.pem"),
});
```

В параметрах методов доступны `token`, `dc`, `ns`, `partition`, `consistent`,
`stale`, `filter`, `near`, `index`, `wait`, `timeout` и `signal`. Поддержка конкретного параметра
зависит от endpoint: сверяйтесь с
[HTTP API Consul](https://developer.hashicorp.com/consul/api-docs). Числовой
`timeout` задается в миллисекундах; можно передать и строку, например `"2s"`.
Это ограничение на весь запрос, включая чтение ответа: по истечении срока
клиент прерывает запрос, а не оставляет его работать в фоне.

Для отмены передайте AbortSignal. Его можно задать и в `defaults`, если одной
отменой нужно остановить несколько запросов:

```js
const controller = new AbortController();
const pending = consul.kv.get({
  key: "example/greeting",
  signal: controller.signal,
});
controller.abort();
await pending.catch((error) => {
  // Здесь обрабатывается отмена; сам запрос уже остановлен.
});
```

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

`watch.end()` прерывает текущий blocking read и убирает таймер повторного
запроса. `consul.destroy()` останавливает все свои watch и незавершенные запросы,
а затем закрывает собственный agent. Переданный пользователем agent остается
работать. После `destroy()` клиент больше не принимает запросы: нужен новый
экземпляр.

Старый способ отмены через EventEmitter `ctx` и событие `"cancel"` сохраняется.
С `ctx.includeResponse: true` возвращается `[response, result]`; если результата
нет, второй элемент может отсутствовать. `response` — Node.js `IncomingMessage`.

Обычные запросы, в том числе записи, не повторяются автоматически. Сетевой сбой
не доказывает, что Consul не успел применить запись. Перед повтором выясните
состояние или используйте CAS, а не отправляйте неидемпотентную операцию вслепую.

## Проверки проекта

Версия pnpm закреплена в `package.json`. Основные команды:

```sh
pnpm install --frozen-lockfile
npm test
npm run types
npm run package:check
git diff --check
npm pack --dry-run
```

В `npm test` есть и Nock-проверки API, и настоящие локальные HTTP/HTTPS-серверы:
на них проверяются TLS и отмена запросов. `npm run package:check` устанавливает
реальный npm-архив без сети и проверяет импорт, HTTP-вызовы и типы NodeNext.

Acceptance запускает три агента HashiCorp Consul на `127.0.0.1`–`127.0.0.3`.
Подготовьте эти loopback-адреса; если `consul` отсутствует в `PATH`, укажите путь
к нему в `CONSUL_BIN`. После этого можно запускать `npm run acceptance`.
Тестовый кластер включает Connect и использует BoltDB для Raft, чтобы работать
и на Windows. Повторять эти настройки в своем окружении не требуется.
Отдельной сборки нет: пакет содержит исходные модули и декларации.

## Происхождение и лицензии

Исходная база — [silas/node-consul](https://github.com/silas/node-consul), commit
`542f4ef61d500019460105356ab7b732262b5bdc`. Сейчас проект развивается независимо.
Авторство исходного кода и обязательные уведомления сохранены в
[LICENSE](LICENSE) и [NOTICE](NOTICE). Код распространяется по MIT; сведения о
заимствованной документации Consul находятся в `NOTICE`.
