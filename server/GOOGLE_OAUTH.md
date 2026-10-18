# Google OAuth backend

## Setup

Keep the existing `.env`; fill in `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
`GOOGLE_REDIRECT_URI`, `FRONTEND_URL`, `DATABASE_URL`, and the existing JWT settings.
All three Google values must be present together. If none is configured, Google
start/callback/exchange return 503; password authentication still works.

In Google Cloud, create a Web application OAuth client, configure the consent
screen/test users, and register the exact `GOOGLE_REDIRECT_URI`, for example
`http://localhost:3000/auth/google/callback`. Production requires HTTPS for both
frontend and callback. HTTP is permitted only for loopback during development.

The optional `GOOGLE_FRONTEND_CALLBACK_URL` defaults to
`<FRONTEND_URL origin>/auth/google/callback`; it must have that same origin and no
query, fragment, or URL credentials. No return URL is accepted from API callers.

Apply pending migrations and regenerate the client before running the backend:

```sh
npx prisma migrate deploy
npx prisma generate
npm run typecheck
npm run build
```

The existing `add_oauth_accounts` migration makes `passwordHash` nullable and adds
both account uniqueness constraints. The new migration adds the provider email,
temporary state/exchange tables, expiry indexes, and cascading foreign keys.
Existing user data is preserved. Migrations are not applied to the application
database by the test suite.

## API contract

| Method | Endpoint | Authentication / request | Response |
| --- | --- | --- | --- |
| GET | `/auth/google` | Public, top-level browser navigation | 302 to Google; signed flow cookies |
| GET | `/auth/google/callback` | Google query `state` plus `code` or `error`, matching browser cookies | 302 to fixed frontend callback; invalid/missing/replayed state: 400 JSON |
| POST | `/auth/google/exchange` | JSON `{ "code": "..." }`, exchange cookie, exact frontend `Origin` | 200 `{ accessToken, user }`; invalid/expired/replayed code: 400 |
| POST | `/auth/google/link` | Existing StudyFlow Bearer JWT; browser fetch with credentials | 200 `{ authorizationUrl }`; signed flow cookies |
| DELETE | `/auth/google/link` | Existing StudyFlow Bearer JWT | 204; Google-only account: 409 `LAST_LOGIN_METHOD` |
| GET | `/auth/methods` | Existing StudyFlow Bearer JWT | `{ hasPassword, providers: { google: { connected, email } } }` |

Authentication middleware still rejects unverified accounts. `hasPassword` means
a password hash exists; it never exposes the hash. A missing provider email is
`null` (for example, an old account not yet used with the new code).

OAuth JSON errors follow `{ message, code }`. Callback results use only a fragment:

- Login success: `#code=<short-lived single-use code>`.
- Link success: `#linked=google`; it does not log in as another user or issue a JWT.
- Failure: `#error=<stable code>`.

Important error codes include `GOOGLE_EMAIL_CONFLICT`, `GOOGLE_ACCOUNT_IN_USE`,
`GOOGLE_ALREADY_LINKED`, `GOOGLE_IDENTITY_INVALID`, `GOOGLE_ACCESS_DENIED`,
`GOOGLE_CODE_MISSING`, `GOOGLE_UNAVAILABLE`, `INVALID_OAUTH_STATE`,
`INVALID_EXCHANGE_CODE`, `INVALID_ORIGIN`, `EMAIL_NOT_VERIFIED`.
`GOOGLE_EMAIL_CONFLICT` means: sign in with the existing method, verify email if
needed, then explicitly link Google in account settings. No email-based merge
is ever performed.

## Identity and account rules

Google ID tokens are verified with `google-auth-library`: signature, Google
issuer, audience, expiration, issued-at, authorized party when present, nonce,
`sub`, and verified email. Google `sub`, not email, is the provider identity.

A new identity with a free email creates User, default UserSettings, and
OAuthAccount atomically. Its email is verified immediately and no verification
email is sent. Returning identities retain the StudyFlow user's primary email;
the provider email is refreshed separately. Google access/refresh tokens are
neither persisted nor returned.

Linking starts only with an authenticated JWT. The stored state contains the
target user ID; callback parameters cannot override it. Re-linking the same
Google account to the same user is idempotent. Another Google account for that
user, or a Google account owned by another user, produces 409. Serializable
transactions with bounded retries and unique indexes enforce this under races.

Unlinking requires a password and verified primary email. It deletes only the
Google relation and pending Google exchange codes. User, settings, subjects,
tasks, and existing StudyFlow JWTs remain intact. A password-setting API is not
introduced here: until that separate feature exists, Google-only users cannot
unlink their last method.

## Flow security and temporary storage

- `@fastify/oauth2` performs authorization-code exchange and PKCE S256.
- A 256-bit state is tied to a separate 256-bit browser secret, a PKCE challenge,
  nonce, intent, target user, and a 10-minute expiry in PostgreSQL.
- The database atomically consumes state before contacting Google. Only one
  callback proceeds, including across server instances. Cancellation consumes
  state too; token exchange failures require starting a new flow.
- Signed HttpOnly state/verifier/browser cookies use SameSite=Lax on localhost.
  Production uses SameSite=None so the authenticated link-start fetch can set
  cookies across sites, plus Secure, Path=/, and the `__Host-` prefix with no Domain.
  Browser binding, signed cookies, PKCE, nonce and atomic server-side state
  consumption protect callbacks; cookie SameSite is not the CSRF control.
- Cookie signatures use a key derived from the existing JWT secret using a
  purpose-specific HMAC label. All backend instances must share JWT_SECRET.
- Exchange codes have 60-second TTL, are stored only as hashes, and are bound to
  the originating browser. Consumption is atomic. Deleting the OAuth relation
  cascades to its exchange codes; a pending code cannot restore a removed link.
- The exchange browser cookie is HttpOnly, signed, Secure/SameSite=None in
  production (Lax on localhost). Its endpoint requires the exact frontend Origin
  and a JSON body. CORS allows credentials only for that frontend origin.
- No StudyFlow JWT is placed in any URL. Codes use URL fragments so they do not
  appear in frontend HTTP request URLs. API responses use no-store/no-referrer.
- Application request logs omit query strings; callback errors are logged only
  as fixed messages, without Google/Gaxios errors, codes, tokens, or credentials.
  Configure reverse proxy/CDN access logs to omit OAuth query strings as well.
- Expired temporary rows are deleted at new flow starts and every minute by an
  unref'ed cleanup timer, closed on server shutdown. The authoritative state is
  always in PostgreSQL, not in a process-local Map. If all servers stop, expired
  rows remain until the next start/cleanup but are never accepted.

One pending login/link flow is supported per browser cookie jar. Starting another
flow replaces its cookies; the earlier callback safely fails. This is deliberate;
the user can restart a cancelled or superseded flow.

## Future SvelteKit integration

1. Login: navigate the browser to `<API>/auth/google`.
2. Implement the frontend callback route (not part of this backend task). Read
   `location.hash`, remove it immediately with `history.replaceState`, and POST
   `{ code }` to `/auth/google/exchange` with `credentials: 'include'`. Let the
   browser send Origin; do not put the JWT into a redirect URL or query string.
3. Store the returned JWT/user through the app's existing auth lifecycle and
   clear/reload account stores as with normal login. Handle callback error codes
   with translated UI, especially the existing-email conflict instructions.
4. Linking: fetch POST `/auth/google/link` with Bearer JWT and
   `credentials: 'include'`, then navigate to `authorizationUrl`. On
   `#linked=google`, retain the current StudyFlow JWT and refresh `/auth/methods`.
5. Unlink using authenticated DELETE and refresh `/auth/methods`.

Use the same hostname consistently in development (`localhost` vs `127.0.0.1`
are different cookie hosts). Browser third-party-cookie restrictions can block
cross-site exchange cookies even with SameSite=None: prefer frontend/API custom
domains on the same site or a same-site reverse proxy. Do not remove the browser
binding to work around that restriction.

## Tests

```sh
npm test
npm run typecheck
npm run build
npm audit
```

Tests use Node's built-in test runner through the installed tsx, locally generated
RSA test keys, actual google-auth-library signature checks, the installed OAuth2
plugin against a local fake token endpoint, and PostgreSQL transactions. They
do not contact Google or use Google Client Secret. No mail is sent by regression
tests. Production dependency injection defaults to the existing Prisma client,
Google verifier, authentication middleware and email sender.

`TEST_DATABASE_URL` is optional. Otherwise the tests use DATABASE_URL and create
a randomly named `sf_oauth_test_*` schema, apply all migrations there, then drop
only that schema. The database role needs CREATE SCHEMA permission. These tests
exercise isolated database state; they never clear application tables. Live
Google consent/redirects and real browser cookie policies require a separate
manual end-to-end test with the configured Google OAuth client.

References: [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect)
and [Fastify OAuth2](https://github.com/fastify/fastify-oauth2).
