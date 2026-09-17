# Rhythm Map Search

A little desktop widget for 4-key (4K) mania: search osu! and Quaver mapsets from one place, browse maps you've already downloaded in Quaver, and play a practice mode with real charts and audio. It lives as a small floating icon docked in the corner of your screen — hover it to expand.

## Download

Grab the latest build for your OS from the [Releases page](https://github.com/Paul2556/rhythm-map-search/releases/latest).

- **macOS**: download the `.dmg`, open it, and drag the app to Applications. The app isn't signed with an Apple Developer certificate, so Gatekeeper will call it "unidentified developer" the first time — right-click (or Control-click) the app and choose **Open** to bypass that once.
- **Windows**: download the installer `.exe` and run it. SmartScreen may warn about an "unrecognized app" since it isn't signed — click **More info > Run anyway**.
- **Linux**: download the `.AppImage`, `chmod +x` it, and run it.

Once it's open, hover the small icon docked in the corner of your screen to expand it.

### osu! search setup

Quaver search works immediately with no setup. osu! search needs your own OAuth app, since that credential can't be safely bundled into a public app:

1. Create one at [osu.ppy.sh/home/account/edit#oauth](https://osu.ppy.sh/home/account/edit#oauth) (any callback URL works — only the `client_credentials` grant is used).
2. Open the app's Settings and paste the client ID/secret in under "osu! account".

Credentials are stored locally on your machine and only ever sent to osu!'s API.

## Development

Use `nub` (not `npm`) for installing dependencies and running scripts — see `AGENTS.md`.

```bash
nub install
nub run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the search/maps/settings UI on its own. To run it as the actual floating desktop widget during development:

```bash
nub run dev:electron
```

Without osu! credentials configured (via `.env.local`, copied from `.env.example`, or the in-app Settings), osu! search shows an error but Quaver results still work.

## Building an installer

```bash
nub run dist
```

This builds the production Next.js server, stages it for packaging, and runs `electron-builder` to produce an installer for your current OS in `dist/`. Pushing a `v*` tag (e.g. `git tag v0.1.0 && git push --tags`) runs the same thing on GitHub Actions for macOS, Windows, and Linux, and attaches the results to a GitHub Release automatically (see `.github/workflows/release.yml`).
