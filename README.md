# Universal Emulator

React/Vite PWA wrapper for `@emulatorjs/emulatorjs`.

## BIOS Files

Some EmulatorJS cores need a BIOS file. This project does not include or
download proprietary BIOS files. By default, put legally obtained BIOS files in
`public/bios/`; the app will detect known filenames and pass the matching file
to EmulatorJS automatically when a ROM is loaded.

To keep BIOS files outside the app, set a BIOS base URL:

```sh
VITE_BIOS_BASE_URL=https://example.com/bios/
```

For local `npm run dev` or `npm run preview`, you can point Vite at a system
folder and it will serve that folder at `/external-bios/`:

```sh
VITE_BIOS_FS_PATH=/absolute/path/to/bios
```

Browsers cannot fetch arbitrary system paths directly in production; production
builds need a real web-accessible URL or server route.

## Tauri Desktop App

This repo also includes a Tauri desktop variant in `src-tauri/`. The Tauri app
can read BIOS files from a native filesystem path because the Rust side reads
the files and passes matching BIOS data to the React emulator host.

Run it with:

```sh
VISUALADVANCE_BIOS_PATH=/absolute/path/to/bios npm run tauri:dev
```

Build it with:

```sh
VISUALADVANCE_BIOS_PATH=/absolute/path/to/bios npm run tauri:build
```

If `VISUALADVANCE_BIOS_PATH` is not set, the Tauri app falls back to the same
URL-based BIOS probing as the web app.

See `public/bios/README.md` for supported filenames.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
