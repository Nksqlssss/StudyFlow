# Definition Of Done

A StudyFlow task is done only when the code, behavior, checks, and documentation are all in a reliable state.

## Required Before Finishing

- The requested behavior works without removing existing behavior.
- The change follows the current module patterns documented in `docs/ARCHITECTURE.md`.
- Frontend API contracts match backend response shapes.
- Protected frontend requests pass the JWT token explicitly.
- Account-specific stores are cleared on logout.
- Async store work cannot overwrite state after logout or a newer request.
- Loading, loaded, and error states are handled explicitly when the UI depends on them.
- User-facing strings use the i18n dictionary unless the text is intentionally temporary or internal.
- Backend routes validate params and bodies with Zod before Prisma writes.
- Backend routes use `request.user.id` for ownership.
- Missing or foreign resources return `404`.
- Invalid params or request bodies return `400`.

## Required Checks

Run from the repository root:

```sh
npm run quality
```

This runs:

- frontend Svelte/TypeScript check
- frontend Prettier and ESLint
- frontend production build
- frontend tests
- backend TypeScript check
- backend build
- backend tests

Also run:

```sh
git diff --check
```

## Manual Verification

For UI-facing tasks, manually verify the changed flow in the browser:

- direct page open
- F5 reload
- success path
- API error path when practical
- logout/login with another account when account data is involved
- mobile and desktop layout when the UI changed

## Commit Hygiene

- Commit only files that belong to the task.
- Keep unrelated user changes unstaged.
- Use a conventional commit message.
- Do not push until the user explicitly asks.
