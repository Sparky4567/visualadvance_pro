# VisualAdvance Universal

Universal React emulator app powered by `@emulatorjs/emulatorjs`.

The repo contains three targets:

- Web/PWA through Vite.
- Desktop through Tauri.
- Android through Capacitor.

The app supports EmulatorJS cores for many classic systems, two game controllers through the browser/Gamepad API, automatic core detection by ROM extension, and optional BIOS discovery.

## Requirements

- Node.js and npm.
- Rust toolchain for Tauri desktop builds.
- Tauri system dependencies for your OS.
- Android Studio/SDK for Android builds.
- Wrangler credentials only if deploying to Cloudflare Pages.

On Linux, Tauri also needs WebKit/GTK development packages. Install the package set recommended by the Tauri documentation for your distribution before running desktop builds.

## First Launch

Install dependencies:

```sh
npm install
```

`postinstall` runs `scripts/sync-emulatorjs.mjs`. That copies EmulatorJS runtime files and core `.data` files from `node_modules` into:

```text
public/emulatorjs/data/
```

Start the web app:

```sh
npm run dev
```

Open the local URL printed by Vite, usually:

```text
http://localhost:5173/
```

Load a ROM from the app UI. If the extension is recognized, the app selects the matching EmulatorJS core automatically. If not, select the system manually before loading the ROM.

## BIOS Files

This project does not include or download proprietary BIOS files. Use only BIOS files you are legally allowed to use.

Default web location:

```text
public/bios/
```

The app probes known filenames before launching a game and passes the first match to EmulatorJS. See `public/bios/README.md` for the current filename list.

## External BIOS Folder For Web Dev

Browsers cannot read arbitrary system paths directly. For local Vite dev/preview, this project can expose an external folder through the dev server.

Create a `.env` file:

```sh
cp .env.example .env
```

Set:

```sh
VITE_BIOS_FS_PATH=/absolute/path/to/bios
```

Then run:

```sh
npm run dev
```

Vite serves that folder at:

```text
/external-bios/
```

For hosted web builds, use a real web-accessible BIOS URL instead:

```sh
VITE_BIOS_BASE_URL=https://example.com/bios/
```

## Tauri Desktop

The Tauri app lives in `src-tauri/`. Unlike the web target, it can use a native filesystem path for BIOS files. The Rust side reads the configured folder and returns matching BIOS files to the React app as data URLs.

Run desktop dev:

```sh
VISUALADVANCE_BIOS_PATH=/absolute/path/to/bios npm run tauri:dev
```

Build desktop packages:

```sh
VISUALADVANCE_BIOS_PATH=/absolute/path/to/bios npm run tauri:build
```

If `VISUALADVANCE_BIOS_PATH` is not set, the Tauri app falls back to the same URL-based BIOS probing as the web app.

Check only the Rust side:

```sh
cd src-tauri
cargo check
```

## Web Build

Run lint:

```sh
npm run lint
```

Create a production web build:

```sh
npm run build
```

Preview the production build:

```sh
npm run preview
```

The production output is written to:

```text
dist/
```

## Cloudflare Pages Deploy

Build and deploy with Wrangler:

```sh
npm run pages:deploy
```

This runs `npm run build` and deploys `dist/`.

## Android Build

Sync the Capacitor Android project:

```sh
npm run cap:sync
```

Open Android Studio:

```sh
npm run android
```

The Android project is in:

```text
android/
```

## EmulatorJS Assets

Do not edit `public/emulatorjs/data/` manually. It is generated from installed npm packages by:

```sh
node scripts/sync-emulatorjs.mjs
```

Run that script again after changing EmulatorJS versions or reinstalling dependencies.

## Supported Systems

The UI includes common EmulatorJS systems such as:

- Game Boy, Game Boy Color, and Game Boy Advance
- NES and SNES
- Nintendo 64 and Nintendo DS
- PlayStation
- Sega Master System, Game Gear, Genesis/Mega Drive, 32X, CD, and Saturn
- Atari 2600, 5200, 7800, Lynx, and Jaguar
- PC Engine/TurboGrafx-16 and PC-FX
- Neo Geo Pocket, WonderSwan, ColecoVision, Commodore 64, and Arcade

Actual compatibility depends on the EmulatorJS core, the ROM format, required BIOS files, and whether a disc/archive game is packaged with all companion files.

## Useful Scripts

```sh
npm run dev          # Vite web dev server
npm run lint         # ESLint
npm run build        # Production web build
npm run preview      # Preview dist/
npm run pages:deploy # Cloudflare Pages deploy
npm run cap:sync     # Build and sync Capacitor Android
npm run android      # Build and open Android Studio
npm run tauri:dev    # Tauri desktop dev
npm run tauri:build  # Tauri desktop build
```

## Troubleshooting

If a ROM does not boot, confirm the selected system/core, file extension, and required BIOS file.

If a BIOS is not detected, check the filename in `public/bios/README.md` and confirm the app shows it in the Game panel after loading a ROM.

If Tauri cannot build on Linux, install the required WebKit/GTK development packages for your distribution.

If EmulatorJS files are missing, run:

```sh
npm install
```

or:

```sh
node scripts/sync-emulatorjs.mjs
```
