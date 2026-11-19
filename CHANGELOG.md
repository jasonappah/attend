# Changelog

## 1.1.379

- fix: gate history and courses lists by attendance screen mode (#75) (bd02abb)
- fix: tighten timeline present heuristic and store attendance source (#77) (855bbae)
- feat: add temporary production SQLite ops door (#78) (c9139dd)

## 1.1.378

- refactor(attendance): drive attendance screens through QueryMap (#70) (313ba20)
- chore: set up RNRepo for faster native builds (#72) (7449e46)
- fix: configure Android background task scheduling (#73) (1c5887b)
- fix: accept release trailers before co-author appendages (#74) (f881317)
- fix(ci): publish the release receipt and resolve the Cloudflare account (#69) (e33e2ea)

## 1.1.377

- fix: accept secure-prefixed session cookie on Google sign-in (#67) (8689ca0)

## 1.1.376

- fix: retain freed root space for Android builds (16a8567)

## 1.1.375

- fix: reclaim runner space for Android releases (c9132f0)

## 1.1.374

- fix: install Android 37 SDK package (fc64335)

## 1.1.373

- fix: prevent release runner disk exhaustion (1fb4805)

## 1.1.372

- fix(release): move bootstrap boundary to current main HEAD (3ee8b5b)
- fix(release): drop verifyMainIntents from prepare.ts (254e7af)
- fix(release): name metadata job 'Release metadata' (d8cfede)
- fix(release): remove commit_message_pattern from ruleset (e509175)
- fix: resolve Android startup migrations (da66c4d)
