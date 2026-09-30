# GadgetPoint — сайт для Demo Shop API

[![CI](https://github.com/osstep2-coder/demo-shop-web/actions/workflows/ci.yml/badge.svg)](https://github.com/osstep2-coder/demo-shop-web/actions/workflows/ci.yml)

Интернет-магазин поверх [Demo Shop API](../demo-shop-api): каталог, карточка товара, корзина с промокодами, оформление, оплата картой, личный кабинет с заказами и возвратами, панель менеджера и администратора.

Стек: React 19, TypeScript, Vite, Tailwind CSS 4, React Router, TanStack Query.

## Запуск

Проект ожидает API в соседней папке `../demo-shop-api`.

```bash
./dev.sh
```

Скрипт поднимает API на http://127.0.0.1:8000 и сайт на http://localhost:5173. Если API лежит в другом месте: `SHOP_API_DIR=/path/to/demo-shop-api ./dev.sh`. По отдельности:

```bash
../demo-shop-api/run.sh   # API
npm install && npm run dev  # сайт
```

В API нет CORS, поэтому Vite проксирует `/api` и `/health` на API. Другой адрес API задаётся так: `SHOP_API_URL=http://127.0.0.1:8010 npm run dev` (для `npm run seed` — та же переменная).

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

- `src/api` — клиент (разворачивает конверт `{success, data, error, meta}`, подставляет Bearer-токен) и по функции на каждый эндпоинт.
- `src/catalog` — SVG-иллюстрации и описания товаров по SKU: в API нет картинок. Для новых товаров показывается нейтральная коробка в цветах категории.
- `src/components` — UI-кит, макет, общие блоки магазина и состояния страниц (`states.tsx`).
- `src/pages` — страницы витрины, `account/` — личный кабинет, `admin/` — панель управления.
- Деньги в API — целые копейки; `lib/money.ts` форматирует их и переводит рубли из форм обратно в копейки.
