# User avatars

All `/users/me/avatar` mutations require the existing verified Bearer session.
They return `200 { user }` using `publicUserSelect`, never `avatarPublicId` or
password data. The authenticated user ID is always taken from the JWT.

- `PATCH`: JSON `{ "avatarUrl": "/avatars/default-male.svg" }` or
  `{ "avatarUrl": "/avatars/default-female.svg" }`. Unknown fields and arbitrary
  URLs are rejected with 400. Local defaults have `avatarPublicId: null` and do
  not contact Cloudinary unless an old custom image needs deletion.
- `POST`: multipart containing exactly one `avatar` file, maximum 5 MiB.
  JPEG/PNG/WebP content is decoded by sharp, bounded to 20 million input pixels,
  auto-rotated and converted to metadata-free 256x256 WebP before Cloudinary
  upload. User-supplied SVG/GIF and corrupt images are rejected. Oversized files
  return 413; unsupported formats 415; malformed requests/images 400.
- `DELETE`: removes the current default/custom avatar; deleting an empty avatar
  is also successful. Custom storage is cleaned after the database update.

Replacements compare the previous URL, public ID and update timestamp inside a
transaction. A conflicting upload returns 409 and cleans only its own new file,
not a newer avatar. Storage upload failure returns 503 and preserves current data.

Deletion is retried once. If old-file cleanup still fails after a successful
replacement, the response includes `cleanupWarning: true`; the UI shows a warning
and the server logs the public ID without provider errors/secrets. There is no
durable cleanup queue: operators must retry these logged orphan deletions after a
storage outage. Failed rollback cleanup is likewise logged. Do not delete an ID
that is currently referenced by a user. Cloudinary and PostgreSQL cannot share an
atomic transaction.

Configure `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and
`CLOUDINARY_API_SECRET` for custom uploads. Local defaults work without them.
Apply the existing `20261023125048_add_avatar_public_id` migration and regenerate
Prisma Client before deployment. No database reset is required.

Frontend state comes exclusively from `auth.user`. The avatar store holds only
operation/loading/error state and rejects stale responses after session changes.
The shared `UserAvatar.svelte` supplies initials when there is no usable image.

Run backend `npm run typecheck`, `npm run build`, and `npm test`. Avatar tests
use real PostgreSQL in disposable schemas and real sharp processing, but inject
Cloudinary upload/removal functions. They never remove production images.
Live Cloudinary delivery still requires a separate configured-service smoke test.
