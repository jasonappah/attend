# Deployment

Attend is deployed to Cloudflare Workers at `https://attend.jasonaa.me`.

## Production resources

| Resource          | Value                                                              |
| ----------------- | ------------------------------------------------------------------ |
| Account           | JasonAA (`1b64a8c4eff655773684dc27044290ac`)                       |
| App worker        | `attend` → `https://attend.jasonaa.workers.dev`                    |
| Sync worker       | `attend-sync` → `https://attend-sync.jasonaa.workers.dev`          |
| R2 bucket         | `attend-files` (public)                                            |
| Public files URL  | `https://attend-static.jasonaa.me`                                 |
| Production origin | `https://attend.jasonaa.me`                                        |
| DNS               | `attend.jasonaa.me` → CNAME `attend.jasonaa.workers.dev` (proxied) |

## Build & deploy

The deploy script lives at `scripts/deploy-cloudflare.ts`. It bundles the One app into a Cloudflare worker, builds the Orez sync worker, binds the R2 bucket, runs Zero migrations, and deploys both via wrangler.

Required environment variables (also set as GitHub Actions secrets for CI):

| Variable                | Value                                                                  |
| ----------------------- | ---------------------------------------------------------------------- |
| `ATTEND_CF_WORKER_NAME` | `attend`                                                               |
| `ATTEND_CF_BUCKET_NAME` | `attend-files`                                                         |
| `ATTEND_CF_FILES_URL`   | `https://attend-static.jasonaa.me`                                     |
| `ONE_SERVER_URL`        | `https://attend.jasonaa.me`                                            |
| `CLOUDFLARE_ACCOUNT_ID` | `1b64a8c4eff655773684dc27044290ac`                                     |
| `CLOUDFLARE_API_TOKEN`  | (CI token with Workers Scripts, Workers Routes, R2 Storage, Zone read) |

Build:

```sh
NODE_ENV=production \
  APP_VARIANT=production \
  VITE_WEB_HOSTNAME=attend.jasonaa.me \
  NODE_OPTIONS=--import=orez-lite/cloudflare/node-wasm-loader \
  bun run build
```

`VITE_WEB_HOSTNAME` supplies the production OTA origin. Native release builds
also require it (or an explicit variant-suffixed `UPDATES_URL`); production
refuses an implicit localhost or plain-HTTP feed.

Deploy:

```sh
bun run scripts/deploy-cloudflare.ts
```

The script deploys `dist/worker/wrangler.json` (app worker) and `dist/orez-sync/wrangler.json` (sync worker). Both must be deployed; the app worker binds the sync worker as a service, so deploy the app worker first without the `SYNC` binding, then the sync worker, then re-add the binding and redeploy the app worker if doing it manually.

## Secrets configured on the `attend` worker

Set via `wrangler secret put`:

- `BETTER_AUTH_SECRET` — generated auth secret
- `GOOGLE_CLIENT_ID` — reused from local `.env`
- `GOOGLE_CLIENT_SECRET` — reused from local `.env`
- `CONCEPT3D_API_KEY` — reused from local `.env`

The Google OAuth callback `https://attend.jasonaa.me/api/auth/callback/google` is registered in the Google Cloud Console project.

## Notes

- `wrangler.jsonc` is merged into `dist/worker/wrangler.json` during the build; `scripts/deploy-cloudflare.ts` then adds the sync service binding, R2 bucket binding, and production vars.
- `NODE_ENV` must be `production` for the build — otherwise `@o/env` bakes in `localhost:4200` dev values into the client bundle.
- The R2 bucket `attend-files` has public access enabled and is bound to the custom domain `attend-static.jasonaa.me`.
- DNS for `attend.jasonaa.me` is managed in the Cloudflare dashboard for zone `jasonaa.me`.

## Version sources

There is one software version and one native identity:

| File                                   | Meaning                                                                          |
| -------------------------------------- | -------------------------------------------------------------------------------- |
| `package.json` `version`               | Software release semver. It advances only through a release PR.                  |
| `release.json` `native.version`        | Marketing version stamped into the installed binary.                             |
| `release.json` `native.build`          | Monotonic Android `versionCode` / iOS build number. It is independent of semver. |
| `release.json` `native.runtimeVersion` | The OTA compatibility line. Only a native change advances it.                    |
| `release.json` `candidate`             | The release PR's base commit, included commit, aggregated type, and native flag. |

`release.json` `bootstrapCommit` is the last `main` commit before this policy.
Commits at or before it are never aggregated. The initial native baseline
(`1.1.371`, build `1`) comes from the published `v0.0.2` APK, which has signer
SHA-256 `9a34d0a09078dff2a36257175e349e877359eac686c7d5e16c8cfa8aa4e67955`.
The first release under this system must be native-required: existing APKs were
built before One's OTA launcher was integrated and cannot receive OTA updates.

Installed identity and running software are deliberately separate. Settings show
`Installed app: <version> (build <n>)` from the binary and
`Running software: <version>` from the active OTA manifest. A staged update is
not the running update until the next cold launch. Runtime, update ID, variant,
and Git SHA live in diagnostics; they are not folded into one version number.

## Making a release

1. Land normal changes through pull requests. Every commit needs exactly one
   `Release-Type: patch|minor|major` and one `Native-Change: yes|no` trailer in
   its final message. The PR template carries them, and the required
   `Release metadata` check compares the PR's squash message and diff with the
   aggregated commits.
2. `prepare-release.yml` maintains the `release/next` PR. It records the
   included `main` tip, bumps `package.json`, allocates native build/runtime
   when needed, updates `CHANGELOG.md`, and leaves `release.json` committed.
3. Merge the release PR with squash. The merge commit is the release boundary.
   A stale release PR is refused rather than publishing unrelated commits.
4. `Checks` must pass and `Detect release` must confirm the push is a release
   merge; every other `main` push stops there without touching OTA state.
   `publish-release` then verifies the merge's provenance, creates the
   tag/release, builds or reuses the verified APK, publishes the OTA asset set,
   and activates the manifest last.

Web and backend deployment is independent and continues on every `main` push.
Those builds record the exact commit SHA as well as the last committed release
version. Backend changes must stay compatible with supported older runtimes.

A native change includes the checked-in `android/` or `ios/` project, native
package sources or patches, native configuration, and native dependency changes.
`bun.lock` changes are conservatively treated as native-affecting; if a lockfile
change is genuinely JavaScript-only, use `Native-Change: yes` rather than
claiming the lockfile proves compatibility. Release-state-only commits are not
native changes.

### Release credentials

`prepare-release.yml` works with `GITHUB_TOKEN` only when the repository allows
Actions to create pull requests, and PRs created by that token do not emit normal
`pull_request` workflow events. The workflow explicitly dispatches
`release-metadata.yml` and `Checks` on the release branch as a fallback. For
ordinary bot-triggered PR checks, add a narrowly scoped `RELEASE_BOT_TOKEN`
(fine-grained token or GitHub App token) with contents and pull-request write
access. Do not add an administrator bypass.

`publish-release` needs the existing `ANDROID_RELEASE_*` signing secrets,
`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `ATTEND_CF_BUCKET_NAME`, and
`ONE_SERVER_URL`. Only the protected-`main` release job receives them.

### OTA storage and publication

Feeds are isolated by variant, platform, and runtime:

```text
updates/<variant>/<platform>/<runtime>/manifest.json
updates/<variant>/<platform>/<runtime>/assets/<hash>
```

`scripts/release/publish.ts` verifies every manifest path, hash, runtime, and
release identity before writing. It archives immutable copies under
`releases/<version>/<commit>/<variant>/<platform>/`, uploads every asset before
the manifest, re-reads the current manifest immediately before activation, and
writes a native completion receipt afterwards. It refuses stale predecessors,
non-increasing timestamps, tag/version conflicts, changed artifacts, and a
dependent OTA release whose native baseline has not completed.

Native publication requires a receipt created only after the APK is attached to
the release and its application ID, version, build, signature, and ABI have been
verified. OTA-only publication requires the matching receipt in R2.

### Retries and rollback

A failed run is resumed by re-running the failed jobs. The release job reuses the
APK, `ota-android.tar.gz`, and `native-receipt.json` already attached to the tag,
so the manifest ID, timestamp, and asset hashes stay identical. Do not create a
new tag or edit the committed version to retry.

Rollback is an explicit promotion, not a retry. Prepare the known-good bundle
from its original commit with `one updates publish --metadata releaseVersion=...
--metadata gitSha=... --metadata variant=production`, then run
`scripts/release/publish.ts` with the current live manifest ID as
`--predecessor` and the same runtime. Use a fresh workflow run that owns the
production concurrency group. The new manifest needs a later timestamp; restoring
an older manifest object is not sufficient because One selects by `createdAt`.
Never run a rollback and a release concurrently.

### Enabling branch protection

The repository currently has no protection on `main`. After `Checks` and
`Release metadata` have both run successfully on `main`:

```sh
bun scripts/release/policy.ts          # preview the additive ruleset
bun scripts/release/policy.ts --apply  # requires both checks to exist and pass
```

The ruleset requires a pull request, a linear history, both checks, and the
trailer pattern, and restricts merges to squash. It refuses to overwrite an
existing `Release integrity` ruleset. Use the PR title/body as the squash
message so the trailers survive. If a future GitHub plan cannot enforce the
final message, do not claim enforcement; request a constrained merge path first.

### First rollout

1. Merge this release-policy work (with `Native-Change: yes`; it changes native
   launcher code).
2. Enable protection once both checks have run on `main`.
3. Merge the generated release PR. That builds the first OTA-capable APK and
   publishes the new runtime feed.
4. Install that APK on a real device. Later OTA-only releases appear on the next
   cold launch; a JS update cannot add the launcher to an older binary.
