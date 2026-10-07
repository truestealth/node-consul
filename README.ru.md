# @truestealth/consul

[English](README.md) · [Переход на новую версию](MIGRATION.ru.md)

Клиент HTTP API HashiCorp Consul для Node.js: привычные разделы API, методы с
Promise и типы TypeScript в самом пакете. Это самостоятельный общественный
проект, не официальный клиент HashiCorp. DNS-резолвер и внешнее хранилище ему
не нужны.

## Что нужно для работы

- **Node.js 24 или новее**. В CI проверяются 24 и 26 на Linux и Windows. Состояние веток
  можно сверить с [таблицей Node.js](https://nodejs.org/en/about/previous-releases).
- Проект использует **нативный ESM**. Node.js 24 загружает тот же модуль через `require()`; отдельной CommonJS-сборки нет.
- Runtime-зависимостей нет: запросы выполняются через стандартные `http` и
  `https` Node.js.
- Для встроенных деклараций нужен **TypeScript 5.4 или новее**.

В **1.2.2** проект переведен на pnpm 12, а npm-архив перед публикацией
проверяется через npm 12. В клиенте по-прежнему доступны
современный ACL API, типизированные Config Entry и транзакции, настройка частоты
watch и безопасная диагностика запросов из предыдущих выпусков.

Если у вас стоит `consul@2.x`, сначала прочитайте
[инструкцию миграции](MIGRATION.ru.md): менять только номер версии недостаточно.

## Первый запрос

```sh
npm install @truestealth/consul@1.2.2
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

Адрес задается через `host`, `port`, `secure` либо через HTTP(S) `baseUrl`.
Параметры Node.js `hostname` и `protocol` не используются для адресации клиента.

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

## Config Entries: конфигурация Consul

Раздел `config` читает и записывает конфигурационные записи Consul. Не путайте
параметры вызова с самим документом: снаружи используются `kind`, `name`, `cas`,
а внутри `entry` сохраняются серверные имена `Kind`, `Name`, `Protocol` и другие.

```js
const entry = {
  Kind: "service-defaults",
  Name: "example-web",
  Protocol: "http",
};
const created = await consul.config.set({ entry, cas: 0 });
const stored = await consul.config.get({ kind: entry.Kind, name: entry.Name });
const entries = await consul.config.list("service-defaults");

if (created && stored?.ModifyIndex !== undefined) {
  const removed = await consul.config.del({
    kind: entry.Kind,
    name: entry.Name,
    cas: stored.ModifyIndex,
  });
}
```

Если запись не найдена (HTTP 404), `get()` возвращает `undefined`. `list()` дает
массив; вместо строки можно передать `{ kind, dc, ns, partition, filter, index,
wait }`. `set()` и удаление с CAS сохраняют boolean от Consul. Успешное безусловное
удаление возвращает `true` вместо серверного пустого объекта; это не подтверждает,
что запись существовала. Для удаления есть и имя `delete()`.

Без `cas` операция безусловная. `set({ entry, cas: 0 })` создает запись только
при ее отсутствии. Для удаления `cas: 0` не означает «удалить в любом случае»:
существующая запись останется. Ненулевой CAS сверяется с `ModifyIndex`; `false`
нужно обработать как отказ условия, а не успех. Допускаются целое число в
безопасном диапазоне JavaScript, десятичная строка и bigint в диапазоне uint64.
Большой индекс передавайте точно,
а не превращайте уже округленный number в строку.

`ns` и `partition` передаются во всех операциях, включая запись и удаление.
Сервер должен поддерживать нужные функции Enterprise и разрешать доступ по ACL.
Mocks проверяют только передачу параметров в запросе, не поведение Enterprise.
Acceptance на Enterprise не запускался.
Ограничения по видам записей описаны в
[Config API](https://developer.hashicorp.com/consul/api-docs/config).

### Правила доступа между сервисами

Современные intentions хранятся в записи `service-intentions`. Ее `Name` —
сервис назначения, а `Sources` — источники трафика. Для источника выбирается
либо L4 `Action`, либо L7 `Permissions`; одновременно задавать оба поля нельзя.
Перед использованием L7 настройте совместимый протокол сервиса, например
`service-defaults` с `Protocol: "http"`.

```ts
import type { ServiceIntentionsEntry } from "@truestealth/consul";

await consul.config.set({
  entry: { Kind: "service-defaults", Name: "example-web", Protocol: "http" },
});

const intentions: ServiceIntentionsEntry = {
  Kind: "service-intentions",
  Name: "example-web",
  Sources: [
    { Name: "example-admin", Action: "allow" },
    {
      Name: "example-frontend",
      Permissions: [
        { Action: "allow", HTTP: { PathPrefix: "/api/", Methods: ["GET"] } },
      ],
    },
  ],
};

const applied = await consul.config.set({ entry: intentions, cas: 0 });
const storedIntentions = await consul.config.get({
  kind: "service-intentions",
  name: "example-web",
});
```

Это запись целого документа, не добавление одного правила. При изменении
существующих intentions сначала прочитайте их, сохраните нужные источники и
запишите результат с актуальным CAS. Старый CRUD intentions по ID не добавлен:
вместо него используется Config API. Типы проверяют структуру L4/L7, а полную
конфигурацию проверяет сервер. Детали протокола, mesh и редакции Consul — в
[справочнике service-intentions](https://developer.hashicorp.com/consul/docs/reference/config-entry/service-intentions).

## Управление ACL

Современный API находится в `acl.token`, `acl.policy`, `acl.role`,
`acl.authMethod` и `acl.bindingRule`. В каждом разделе есть создание
`create({ entry })`, обновление `update({ id, entry })`, чтение `get(id)`,
список `list()` и удаление `del(id)`. Для auth methods идентификатор — `name`.
Policy и role можно прочитать через `{ name }`. Для токенов также доступны
`self()`, `clone(id)` и расширенное чтение `get({ id, expanded: true })`.

Не смешивайте документ и параметры запроса: поля Consul помещаются в `entry`,
а `token`, `dc`, `ns`, `partition`, `timeout` и `signal` — рядом с ним.
Например, администратор может выдать временный доступ только к настройкам:

```js
const policy = await consul.acl.policy.create({
  entry: {
    Name: "example-settings-reader",
    Rules: 'key_prefix "example/" { policy = "read" }',
  },
});
const issued = await consul.acl.token.create({
  entry: { Policies: [{ ID: policy.ID }], ExpirationTTL: "1h" },
});
try {
  const item = await consul.kv.get({
    key: "example/settings",
    token: issued.SecretID,
  });
} finally {
  await consul.acl.token.del(issued.AccessorID);
}
```

Для управления токеном нужен **AccessorID**, для авторизации — **SecretID**.
Не выводите `issued` или списки токенов в журнал: при достаточных правах список
тоже может содержать секреты. При HTTP 404 чтение дает `undefined`;
ошибка удаления отклоняет Promise. При обновлении клиент не объединяет старую
и новую запись: сохраните необходимые grants самостоятельно.

`acl.login({ authMethod, bearerToken, meta })` возвращает новый токен, но не
меняет `defaults`. Передавайте его в нужных вызовах и отзывайте через
`acl.logout({ token: issued.SecretID })`. Для входа заранее нужны auth method
и binding rule; одного bootstrap недостаточно. Права и ограничения сервера
описаны в [ACL API](https://developer.hashicorp.com/consul/api-docs/acl).

Для удаленного или неизвестного ACL-токена Consul может вернуть 403 вместо 404.
Клиент сохраняет эту ошибку, в том числе при повторном `logout` после отзыва.

Удаление auth method на сервере также удаляет связанные binding rules и
выпущенные через него токены. Это отзыв доступа, а не простая уборка настройки.

## Типы конфигурации и транзакций

Для `service-defaults`, `proxy-defaults` и `service-intentions` есть отдельные
типы; `get/list` определяют результат по литералу `kind`. Остальные виды можно
передавать через общий `ConfigEntry`. Для заранее подготовленных документов
доступны `ServiceDefaultsEntry` и `ProxyDefaultsEntry`. Типы помогают поймать
ошибку в коде, но окончательную конфигурацию проверяет Consul.

Транзакции различают операции с KV, узлом, сервисом и check. Чтобы TypeScript
не превратил сохраненный `Verb` в произвольную строку, аннотируйте массив:

```ts
import type { TransactionOperation } from "@truestealth/consul";

const operations: TransactionOperation[] = [
  { KV: { Verb: "set", Key: "example/settings", Value: "aGVsbG8=" } },
  { KV: { Verb: "check-index", Key: "example/version", Index: 10 } },
];
const result = await consul.transaction.create(operations);
```

В транзакциях KV-значения передаются и возвращаются в **base64**; в отличие от
`kv.get()`, автоматического декодирования здесь нет. Конфликт по-прежнему дает
отклонение Promise с HTTP 409, а не boolean: подробности находятся в `Errors`
тела ответа. `Results` и `Errors` могут быть `null`. Формат описан в
[Transaction API](https://developer.hashicorp.com/consul/api-docs/txn).

## Другие разделы

API не ограничивается KV. Сохраняются следующие разделы и способы вызова:

| Раздел        | Примеры методов                                                                       |
| ------------- | ------------------------------------------------------------------------------------- |
| `agent`       | `self()`, `members()`, `service.register()`, `check.register()`                       |
| `health`      | `node({ node })`, `service({ service, passing: true })`, `state({ state })`           |
| `catalog`     | `datacenters()`, `node.list()`, `service.nodes({ service })`                          |
| `session`     | `create()`, `renew({ id })`, `destroy({ id })`                                        |
| `query`       | `create()`, `get()`, `execute()`, `destroy()` для prepared queries                    |
| `event`       | `fire({ name, payload })`, `list()`                                                   |
| `status`      | `leader()`, `peers()`                                                                 |
| `transaction` | `create(operations)`                                                                  |
| `acl`         | Современные ресурсы, `login()`, `logout()`, `bootstrap()`, `replication()` и `legacy` |

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
  rateLimit: 15000,
  backoffJitter: true,
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

Частоту watch можно ограничить через `rateLimit` в миллисекундах. По умолчанию
`0` отключает ограничение. Например, `15000` разрешает два быстрых запроса,
затем при непрерывных изменениях восстанавливает один запрос каждые 15 секунд.
Обычный blocking read продолжается без дополнительной паузы, если бюджет уже
восстановился. Промежуточные изменения при задержках могут объединяться.
Повторы ошибок сохраняют экспоненциальную задержку; `backoffJitter: true`
выбирает случайное время от половины до полной расчетной задержки. По умолчанию
это `false`. Остановка watch, `destroy()` и AbortSignal убирают таймер ожидания
и прерывают запрос.

## Диагностика запросов

Событие `log` позволяет собирать статистику, не передавая в журнал сам запрос.
Запрос, переданный HTTP-слою, дает одно событие завершения:

```ts
import type { ConsulLogData } from "@truestealth/consul";

consul.on("log", (tags: string[], data: ConsulLogData) => {
  console.info(tags, data);
});
```

В данных есть имя операции, HTTP-метод, длительность `durationMs`, исход
`outcome` и, когда известны, `statusCode` и `errorCode`. Длительность учитывает
ожидание свободного сокета Agent. Различаются HTTP- и сетевой сбой, ошибка
декодирования/валидации, timeout и abort. Отсутствующий KV — успешный результат
с HTTP 404, а не ошибка клиента. Для полученного ответа сохраняются теги
`["consul", "response"]`; без ответа используются `["consul", "error"]`.
URL, ключи, заголовки, payload, секреты и текст ошибки не включаются.
Не выполняйте тяжелую работу в listener: брошенное исключение сохраняет
обычное поведение EventEmitter, а не проглатывается библиотекой.

Ошибка параметров endpoint может возникнуть до передачи запроса HTTP-слою.
В таком случае транспортное событие не создается.

## Проверки проекта

Используйте pnpm **12.10.1**, закрепленный в `package.json`. Lockfile хранит
дерево зависимостей и окружение менеджера пакетов. Если установка меняет
manifest или lockfile, CI завершается с ошибкой. Основные команды:

```sh
pnpm install --frozen-lockfile
npm test
npm run lint
npm run types
npm run package:check
git diff --check
npm pack --dry-run
```

В `npm test` есть и Nock-проверки API, и настоящие локальные HTTP/HTTPS-серверы:
на них проверяются TLS и отмена запросов. `npm run package:check` устанавливает
реальный npm-архив без сети и проверяет импорт, HTTP-вызовы и типы NodeNext.

JavaScript проверяет ESLint, оформление — Prettier. В тестах используется
встроенный `node:assert/strict`. TypeScript CLI и `expect-type` проверяют типы
результатов реальных вызовов и недопустимые параметры. Примеры потребителей
из установленного архива тоже компилируются через CLI.

Acceptance запускает три агента Consul на `127.0.0.1`–`127.0.0.3`, а для ACL
и TLS поднимает отдельные одноузловые окружения.
Подготовьте эти loopback-адреса; если `consul` отсутствует в `PATH`, укажите путь
к нему в `CONSUL_BIN`. После этого можно запускать `npm run acceptance`.
Тестовый кластер включает Connect и использует BoltDB для Raft, чтобы работать
и на Windows. Повторять эти настройки в своем окружении не требуется.
Отдельной сборки нет: пакет содержит исходные модули и декларации.

CI запускает runtime-тесты с 100% coverage, проверки типов и установку архива
на Node.js 24 и 26 под Linux и Windows. Acceptance проверяет **Consul 1.22.7
и 2.0.4 Community**: в том числе CRUD с ACL, JWT-вход и отзыв токена, HTTPS
с клиентскими сертификатами. Это не обещание работы с любым сервером:
унаследованные endpoint зависят от его версии. Для Enterprise namespace и
partition проверена передача параметров, но не поведение сервера.

## Происхождение и лицензии

Исходная база — [silas/node-consul](https://github.com/silas/node-consul), commit
`542f4ef61d500019460105356ab7b732262b5bdc`. Сейчас проект развивается независимо.
Авторство исходного кода и обязательные уведомления сохранены в
[LICENSE](LICENSE) и [NOTICE](NOTICE). Код распространяется по MIT; сведения о
заимствованной документации Consul находятся в `NOTICE`.
