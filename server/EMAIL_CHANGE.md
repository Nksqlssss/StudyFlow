# Email changes

Both endpoints require `Authorization: Bearer <accessToken>` and JSON bodies.
The JWT must belong to an existing user with a verified primary email. Missing,
invalid or expired JWTs return 401; unverified accounts return 403 with
`EMAIL_NOT_VERIFIED`, using the existing authentication middleware.

## POST /users/me/email/change

```json
{ "newEmail": "new@example.com", "currentPassword": "the-current-password" }
```

The new email is trimmed and lowercased. It must be valid, at most 320 characters,
different from the current address and not owned by another user. A current
password is verified with bcrypt. Alternatively, provide a one-time email
reauthentication token for `change_email` instead of `currentPassword`:

```json
{ "newEmail": "new@example.com", "reauthToken": "64-lowercase-hex-characters" }
```

These methods are mutually exclusive. See [REAUTH.md](REAUTH.md) to obtain the
token. Passwordless accounts must use email reauthentication; accounts with a
password can choose either method. JWT possession alone is not enough.
Unknown body fields are rejected. No password or token is returned.

Success: **200**

```json
{ "message": "Confirmation email sent", "expiresIn": 1800 }
```

The primary email and its verification status remain unchanged. A cryptographically
random 32-byte token is sent to the new address; only its SHA-256 hash is stored.
It expires after 30 minutes. A new successful request replaces the previous token.
Concurrent requests can deliver emails out of order: only the latest stored token
is valid. A delivery failure invalidates that request's token without deleting a
newer one; an earlier replaced token is not restored.

| Status | Code | Meaning |
| --- | --- | --- |
| 400 | VALIDATION_ERROR | Invalid body, email or password format |
| 400 | EMAIL_UNCHANGED | Address equals the current email |
| 403 | REAUTHENTICATION_REQUIRED | No usable password and no reauthentication token |
| 403 | INVALID_CURRENT_PASSWORD | Password verification failed |
| 403 | INVALID_REAUTH_TOKEN | Expired, reused, foreign or wrong-purpose/session/email proof |
| 409 | EMAIL_ALREADY_TAKEN | New email already belongs to a user |
| 409 | EMAIL_CHANGE_CONFLICT | Account changed during verification or transaction retries exhausted |
| 429 | Fastify rate-limit response | More than 3 requests per minute per IP |
| 503 | EMAIL_DELIVERY_FAILED | Confirmation email could not be sent |

Application errors use `{ "code": "...", "message": "..." }`. Unexpected server
errors use the existing Fastify 500 response. Rate limiting runs before body/password
validation and can take precedence over other responses.

## POST /users/me/email/confirm

```json
{ "token": "64-lowercase-hexadecimal-characters" }
```

The token must belong to the user identified by the Bearer JWT. A different user's
token, expired token, replaced token and already consumed token all receive the
same error. Unknown body fields are rejected.

Success: **200**, `{ "user": <publicUserSelect> }`, the same public user projection
used by `/auth/me`. The response never includes `passwordHash` or token hashes.

| Status | Code | Meaning |
| --- | --- | --- |
| 400 | VALIDATION_ERROR | Missing or malformed token |
| 400 | INVALID_EMAIL_CHANGE_TOKEN | Unknown, foreign, expired, replaced or reused token |
| 409 | EMAIL_ALREADY_TAKEN | Address was claimed before confirmation |
| 409 | EMAIL_CHANGE_CONFLICT | Transaction retries exhausted |
| 429 | Fastify rate-limit response | More than 10 requests per minute per IP |

A serializable Prisma transaction takes a per-user advisory lock, checks ownership/expiry and
uniqueness again, consumes exactly one token, updates `User.email` and
`emailVerifiedAt`, and removes old registration-verification tokens. Conflicts
retry at most twice; unique-email conflicts return 409. Failed updates roll back
token consumption. Confirming a new address also invalidates outstanding email
reauthentication codes and grants. No existing user data is deleted.

## Frontend integration

The email link points to the existing profile route:

```text
<FRONTEND_URL>/app/profile#emailChangeToken=<token>
```

Read `emailChangeToken` from the URL fragment, retain it only for confirmation,
remove it from browser history, and send it in the JSON body to the confirmation
endpoint with the user's Bearer JWT. Do not send it as a query parameter, log it,
or place it in analytics. If no session exists, sign in to the same account first
using its current email/password or its linked Google account. The pending change
must survive that sign-in flow on the client; do not put the token in a server URL.
The root layout removes the fragment before the authenticated layout can redirect.
The pending token stays only in a Svelte store in the current tab. Password login
returns to Profile; Google login uses a popup so the original tab retains that
memory. The popup sends only a completion notification, never a token, and its
origin and window identity are checked. Reloading the login page loses the pending
confirmation: reopen the original email link. The backend has no GET confirmation.

After success, replace frontend auth.user with the returned public user. Existing
JWTs remain valid because their identity is userId, not email. Login with the old
primary email no longer works. No refresh-token/session redesign is introduced.

## Google and password-setting safety

Changing the primary email does not update `OAuthAccount.email`. Google sign-in
continues to look up the identity by `(provider, providerAccountId)`; a matching
email alone never links accounts. Reauthentication via Google is not implemented.

`POST /auth/password` requires an email reauthentication token for `set_password`
before installing a first password. Without proof it returns **403**
`REAUTHENTICATION_REQUIRED`; for an existing password it returns **409**
`PASSWORD_ALREADY_SET`. Consumption is atomic with password installation.
Existing password login and password change are unchanged. See [REAUTH.md](REAUTH.md).

## Database and verification

Use `20261021121640_add_email_change_tokens` and
`20261023120000_add_email_reauthentication`. Do not reset
the database. Apply pending migrations using the project's normal deployment flow
before deploying these endpoints (`npx prisma migrate deploy`).

Tests use a newly created PostgreSQL schema via `test/test-database.ts`, apply all
migrations there and remove only that schema afterward. Email sending is injected
and captured in memory; tests never send real mail. Run `npm run typecheck`,
`npm run build`, `npx prisma validate` and `npm test` from `server`.

The existing Resend sender uses `onboarding@resend.dev`; production delivery to
arbitrary recipients requires a verified sender/domain configured in Resend.
