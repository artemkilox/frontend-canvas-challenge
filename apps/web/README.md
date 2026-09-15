# Фронтенд `@canvas/web`

Next.js App Router, React Flow (`@xyflow/react`), CSS Modules с именами БЭМ, свой HTTP-клиент.

Запуск из корня репозитория описан в [корневом README](../../README.md). Только фронт: `npm run dev:web`. Сборка: `npm run build -w @canvas/web`, `npm run start:web`.

## Слои

- `src/api/client.ts` — единственный `fetch`
- `src/api/resources/*` — пути и тела запросов
- `src/api/poll.ts` — опрос генерации
- `src/domain` — связи, лимиты, проекция графа, выбор последней генерации
- `src/features/canvas` — очередь сохранения, ноды, экран
- `app` — маршруты `/` и `/spaces/[spaceId]`
