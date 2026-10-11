# StudyFlow Architecture

StudyFlow is split into a SvelteKit frontend and a Fastify API backend. The app should keep a small number of predictable patterns instead of creating a new approach for every feature.

## Frontend API Layer

- API modules live in `frontend/src/lib/api`.
- One feature should have one API file, for example `subjects.ts`, `tasks.ts`, or `settings.ts`.
- API functions should call `apiFetch` instead of calling `fetch` directly from stores or pages.
- Protected requests must receive the current JWT token explicitly and pass it to `apiFetch`.
- API response types should match the backend response shape exactly, for example `{ subject }`, `{ subjects }`, `{ task }`, `{ tasks }`, or `{ settings }`.
- API modules should not update Svelte stores or browser state.
- API modules should export request and response types near the functions that use them.
- Use `fetcher?: typeof fetch` only for route-level SvelteKit loads that need SvelteKit's provided `fetch`.

## Frontend Stores

- Stores live in `frontend/src/lib/stores`.
- Stores own feature state: data, loading state, loaded state, and user-visible error state.
- Stores may call API modules, but pages should not duplicate the same loading request if a parent layout already loads the data.
- Async mutations should reset loading state in `finally`.
- Failed async mutations should restore optimistic UI changes when the feature uses optimistic updates.
- Stores that hold account-specific data must expose `clear()` and must be cleared on logout.
- When stale async work can finish after logout or a newer request, use a session/version guard before mutating store state.
- Use `createAsyncGate()` from `frontend/src/lib/stores/store-utils.ts` for ordinary load/mutation stale-response protection.
- Use `getErrorMessage()` from `frontend/src/lib/stores/store-utils.ts` instead of repeating `err instanceof Error ? err.message : ...`.
- `tasks` currently has two independent load channels (`loadAll` and subject-scoped `load`), so it keeps local versions for those channels while still using `getErrorMessage()`.
- Stores should throw async mutation errors after setting store error state when the caller needs to prevent navigation or close/reopen UI.

## Pages And Components

- Pages should focus on route params, form state, navigation, and rendering.
- Shared UI belongs in `frontend/src/lib/components`.
- User-facing strings should use the existing i18n dictionary instead of hardcoded text.
- Pages should distinguish loading, failed loading, and genuinely missing data.
- If a page catches a store mutation error, the catch block must not be empty. The store should already expose the visible error, so returning from the catch is acceptable.
- Use `resolve()` from `$app/paths` for navigation targets used by `goto()`.

## Backend Routes

- Backend routes live in `server/src/routes`.
- Route files should register related endpoints and keep validation close to the endpoint.
- Protected endpoints must use `preHandler: authenticate`.
- Request bodies and params should be validated with Zod before touching Prisma.
- Invalid params or bodies should return `400`.
- Missing or foreign user-owned resources should return `404`, not `403`, so resource existence is not leaked.
- Successful deletes should return `204`.
- Route handlers should select only fields that the frontend needs.
- Shared repeated route constants, such as Prisma `select` objects, should be local constants in the route file unless they are reused across modules.
- Do not trust `userId` from the frontend. Use `request.user.id`.

## Ownership And Security

- The frontend must never send `userId` as trusted ownership data.
- The backend should derive ownership from `request.user.id` after JWT verification.
- Queries for user-owned resources should include `userId` or verify the parent resource belongs to the current user.
- Secrets and real connection strings belong in `.env`, not in committed files.
- `.env.example` should document required variables with safe placeholder values.

## Tests

- Frontend unit tests live next to the tested module as `*.test.ts`.
- Backend route tests live in `server/src` as `*.test.ts`.
- Tests should verify behavior, not implementation details.
- Current fast tests cover store async guards, error message normalization, auth protection, and request-body validation that happens before database access.
- Tests that require database writes should create isolated test data and clean up after themselves. Do not add destructive database operations to quality checks.

## Checks Before Commit

- Preferred full command from the repository root: `npm run quality`.
- Frontend checks: `npm --prefix frontend run check`, `npm --prefix frontend run lint`, `npm --prefix frontend run build`, `npm --prefix frontend run test`.
- Backend checks: `npm --prefix server run typecheck`, `npm --prefix server run build`, `npm --prefix server run test`.
- Review `git diff --check` before committing.
- Keep unrelated user changes out of commits.
