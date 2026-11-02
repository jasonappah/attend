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
  NODE_OPTIONS=--import=orez-lite/cloudflare/node-wasm-loader \
  bun run build
```

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
