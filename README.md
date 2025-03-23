# attend

This project is a React Native app built with [One](https://one.dev) and [Zero](https://zero.dev).

For running on Android...
- you'll want this: https://gist.github.com/zetavg/93adf1ac8e0ec881ab65cf7f7fa2fbd4
- then in the same build.gradle file, add `autolinkLibrariesWithApp()` into the react block. seems to be needed for op-sqlite, couldn't figure out how to manually specify it and have the build work. got the idea from https://github.com/OP-Engineering/op-sqlite/blob/ec509dfa2ecbeac195ca79f54cba0fb5fbc0d0d8/example/android/app/build.gradle#L10

*Original README below:*

---

## Install

Install packages with yarn:

```sh
yarn
```

For login, we have set up Github auth with [Better Auth](https://www.better-auth.com/) as an example.

1. [Create a new Github App](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app##registering-a-github-app)
2. Copy `.env.example` to `.env`
3. Fill in `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`

## Run

in three separate tabs:

```
yarn docker up
yarn zero
yarn dev
```

to run tauri you can run this instead of `yarn dev`:

```
yarn dev:tauri
```

to reset all your data:

```
yarn docker:start:clean
```

### Tauri

Getting Tauri to handle auth in a sane way takes a bit of work, but we've set up most of it here for you. If you're using OAuth, you don't want to force your users to login via the Tauri window, as they will lack all saved credentials and be forced to memorize their password / not use passkeys, etc.

So instead we open the login link using target="_blank" so it opens in their default browser, making for a smooth login experience. But that means you need to pass back the credentials to Tauri once logged in.

To do this, we added the deep-link plugin to Tuari, allowing for `attend://domain` style URLs to open with your native Tuari app. This allows for really nice hand-off.

On Mac though, you can't use deep links in dev mode. So you'll need to make a production build, drag it to your Applications folder, and run your app from there. We set up the production build to hit your same development server for now, so you can actually just use that built app as your main dev driver. It includes dev tools as you'd normally want, too. Once you set this up development is easy, and login has great UX.
