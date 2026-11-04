# Attend

Attend tracks class attendance on web and React Native. It uses the Takeout stack: One, Tamagui, Better Auth, SQLite, Lime Sync/Zero, and tRPC for calendar and room imports.

## Development

Use Bun 1.4 and Node 24, then run:

```sh
bun install --frozen-lockfile
bun dev
```

Open http://localhost:4200. In development, **Login as Demo User** provides a shared test account and sample classes without credentials. Do not put personal data in that account. Google sign-in requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`; the provider must allow the server's Better Auth callback URL. Calendar import also requires `CONCEPT3D_API_KEY` to load UTD rooms.

`PORT_OFFSET=100 bun dev` moves the app and its companion services together. Only one dev instance should use a given `.orez/application-sql` database at a time.

```sh
bun run typecheck
bun run lint
bun run lint:fix
bun test features/attendance/infer.test.ts
bun run build
bun run generate
```

For Android, start the dev server and run `bunx one run:android` with an emulator or device connected. For iOS use `bunx one run:ios`. Native identity is configured through `APP_VARIANT=development|preview|production`; production uses the existing `me.jasonaa.attend` identifier and the `attend` URL scheme.

Release APKs are built for `armeabi-v7a` only, which is what the Galaxy A13 4G (SM-A135U1) needs. Build one locally with `bun run release:android`; set `ANDROID_ABIS` (or pass `-PreactNativeArchitectures=...` to Gradle) to target an emulator or a 64-bit device.

## Existing PostgreSQL data

The starter's SQLite database does **not** automatically contain the old PostgreSQL data. `scripts/import-attend-postgres.ts` copies users, linked accounts, calendars, rooms, courses, and attendance into a new SQLite file. It reads PostgreSQL in a read-only snapshot and refuses to overwrite an existing file:

```sh
ATTEND_POSTGRES_URL="$DATABASE_URL" bun scripts/import-attend-postgres.ts /absolute/path/to/new-attend.sqlite
```

Stop all app and sync processes before a cutover. Back up both databases, verify counts, account identities, timestamps, and attendance in the new file, and rehearse the complete login and sync flow before replacing any live database. The import does not transfer old login sessions; users must sign in again. Do not print the connection URL or share the database file: both may contain private information.

## Deployment

The current production build targets Cloudflare, but this repository does not automatically deploy on `main`. The copied starter's deployment is not configured for Attend. Before deploying, choose and configure your own worker, sync worker, storage, auth secrets, and origin. `scripts/deploy-cloudflare.ts` requires explicit Attend worker and bucket variables; it must not be used against the starter's resources. A Node-hosted Lime Sync deployment would require separate production hosting work.
