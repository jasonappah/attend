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

## Commit release metadata

`bun install` installs the Lefthook `commit-msg` hook through the `prepare` script.
For an existing checkout, run `bun run prepare` once to install it.
Every commit must end with these two Git trailers, separated from the subject or
description by a blank line:

```text
fix: correct event sorting

Release-Type: patch
Native-Change: no
```

- `Release-Type` must be `patch`, `minor`, or `major`.
- `Native-Change` must be `yes` or `no`. Use `yes` for native code, native
  dependency, or native configuration changes that require a new binary/runtime.
- Include each trailer exactly once, with the spelling and casing shown above.
- Merge and squash commits need the same trailers in their final commit message.

These trailers record release intent. `prepare-release.yml` aggregates every
commit since the previous release and maintains one release PR containing the
computed version, changelog, and release state. The highest `Release-Type` wins,
and any `Native-Change: yes` makes the release require a new binary and OTA
runtime. Merging the release PR publishes the APK (when native) and the OTA
bundle; ordinary pushes to `main` never mint a version. See
[`docs/publishing.md`](docs/publishing.md) for the full release procedure.

`Release metadata` is a required check. It validates trailers on every commit
and the pull request's squash message with trusted `main` code, and it verifies
that the declared intent matches the diff, including native-affecting changes.
Local hooks can be bypassed; the required check is what enforces the contract.
See [`docs/publishing.md`](docs/publishing.md) for protection activation.

Run the validator tests with `bun test scripts/check-commit-message.test.ts`.

## Existing PostgreSQL data

The starter's SQLite database does **not** automatically contain the old PostgreSQL data. `scripts/import-attend-postgres.ts` copies users, linked accounts, calendars, rooms, courses, and attendance into a new SQLite file. It reads PostgreSQL in a read-only snapshot and refuses to overwrite an existing file:

```sh
ATTEND_POSTGRES_URL="$DATABASE_URL" bun scripts/import-attend-postgres.ts /absolute/path/to/new-attend.sqlite
```

Stop all app and sync processes before a cutover. Back up both databases, verify counts, account identities, timestamps, and attendance in the new file, and rehearse the complete login and sync flow before replacing any live database. The import does not transfer old login sessions; users must sign in again. Do not print the connection URL or share the database file: both may contain private information.

## Deployment

Web and backend deploy automatically from every push to `main`. Native APKs and
OTA bundles publish only when a release PR merges. The release workflow uses
`me.jasonaa.attend`, release signing, `armeabi-v7a`, and the production OTA
feed; it never regenerates the checked-in Android project. See
[`docs/publishing.md`](docs/publishing.md) for resources, secrets, release
operation, retries, and rollback.

The copied starter's deployment is not reused. `scripts/deploy-cloudflare.ts`
requires explicit Attend worker and bucket variables and must not be used
against the starter's resources.
