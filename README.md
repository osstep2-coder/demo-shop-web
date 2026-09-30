# GadgetPoint — сайт для Demo Shop API

[![CI](https://github.com/osstep2-coder/demo-shop-web/actions/workflows/ci.yml/badge.svg)](https://github.com/osstep2-coder/demo-shop-web/actions/workflows/ci.yml)

Интернет-магазин с собственным API: каталог, карточка товара, корзина с промокодами, оформление, оплата картой, личный кабинет с заказами и возвратами, панель менеджера и администратора.

Стек: React 19, TypeScript, Vite, Tailwind CSS 4, React Router, TanStack Query. API — FastAPI и SQLite в папке `api/`.

## Запуск

Нужны Node.js 22+ и Python 3.10+.

```bash
./start.sh   # или npm start
```

Скрипт собирает сайт и поднимает один сервер на http://127.0.0.1:8000: он отдаёт и сайт, и API (Swagger — `/docs`). При первом запуске создаётся `api/.venv`, база — `api/.data/shop.db`. Затем в соседнем терминале заполните демо-данные:

```bash
npm run seed
```

### Разработка

```bash
./dev.sh
```

API на http://127.0.0.1:8000 и Vite с горячей перезагрузкой на http://localhost:5173. В API нет CORS, поэтому Vite проксирует `/api` и `/health` на API. Другой адрес API задаётся так: `SHOP_API_URL=http://127.0.0.1:8010 npm run dev` (для `npm run seed` — та же переменная).

### Настройки API

| Переменная                                | По умолчанию                  | Что задаёт                                                    |
| ----------------------------------------- | ----------------------------- | ------------------------------------------------------------- |
| `PORT`                                    | `8000`                        | порт сервера                                                  |
| `SHOP_DB_PATH`                            | `api/.data/shop.db`           | файл базы SQLite                                              |
| `SHOP_WEB_DIST`                           | `dist`                        | папка собранного сайта; если её нет, сервер отдаёт только API |
| `SHOP_ADMIN_EMAIL`, `SHOP_ADMIN_PASSWORD` | `admin@shop.test`, `admin123` | администратор, которого API создаёт при старте                |
| `SHOP_PAYMENT_TTL_MINUTES`                | `15`                          | через сколько минут неоплаченный заказ отменяется             |
| `SHOP_RETURN_PERIOD_DAYS`                 | `14`                          | срок возврата после доставки                                  |
| `SHOP_BUGS`                               | —                             | намеренные баги для демо через запятую, например `oversell`   |

Postman-коллекция и окружение — в `api/postman/`.

## Проверки и CI

```bash
npm run lint          # Oxlint, предупреждения тоже считаются ошибками
npm run lint:fix      # автоисправление того, что линтер умеет чинить сам
npm run format        # Prettier
npm run typecheck     # tsc
npm run check         # всё вместе, то же, что проверяет CI
```

Пайплайн `.github/workflows/ci.yml` запускается на push в `main`, на каждый pull request и вручную:

| Job              | Что делает                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------- |
| Lint & format    | `oxlint` (ошибки подсвечиваются прямо в diff PR) и `prettier --check`                                   |
| Typecheck        | `tsc --noEmit`                                                                                          |
| Dependency audit | `npm audit` по production-зависимостям, падает на high и critical                                       |
| API smoke        | поднимает API, проверяет `/health` и `/api/v1/products` и что у каждой ручки в OpenAPI описан ответ     |
| Build            | `vite build` после lint и typecheck, размер бандла в summary, `dist` сохраняется как артефакт на 7 дней |

Dependabot раз в неделю предлагает обновления npm-пакетов (minor и patch одним PR) и GitHub Actions.

Линтер — Oxlint, а не ESLint: проект на TypeScript 7, у которого нет JS API, и typescript-eslint с ним не работает. Правила — в `.oxlintrc.json`.

## Демо-данные

```bash
npm run seed
```

Скрипт создаёт менеджера, двух покупателей, заказы во всех статусах (включая отклонённый платёж и возврат) и кладёт товары в корзину Анны. Если заказы уже есть, он их не дублирует (`npm run seed -- --force` добавит ещё). Заказ «Ожидает оплаты» API само отменит через 15 минут, поэтому seed лучше запускать прямо перед съёмкой.

Аккаунты, тестовые карты и промокоды — в [TEST_DATA.md](TEST_DATA.md).

## Устройство

- `api/server` — FastAPI-приложение (`app.py`) и схема базы с демо-каталогом (`db.py`).
- `src/api` — клиент (разворачивает конверт `{success, data, error, meta}`, подставляет Bearer-токен) и по функции на каждый эндпоинт.
- `src/catalog` — SVG-иллюстрации и описания товаров по SKU: в API нет картинок. Для новых товаров показывается нейтральная коробка в цветах категории.
- `src/components` — UI-кит, макет, общие блоки магазина и состояния страниц (`states.tsx`).
- `src/pages` — страницы витрины, `account/` — личный кабинет, `admin/` — панель управления.
- Деньги в API — целые копейки; `lib/money.ts` форматирует их и переводит рубли из форм обратно в копейки.
