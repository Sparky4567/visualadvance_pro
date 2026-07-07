import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize, resolve, sep } from 'node:path'
import process from 'node:process'
import { fileURLToPath, URL } from 'node:url'

function externalBiosPlugin(env) {
  const biosRoot = env.VITE_BIOS_FS_PATH ? resolve(env.VITE_BIOS_FS_PATH) : ''

  function middleware(req, res, next) {
    if (!biosRoot || !req.url?.startsWith('/external-bios/')) {
      next()
      return
    }

    const requestPath = decodeURIComponent(req.url.split('?')[0].replace('/external-bios/', ''))
    const filePath = normalize(join(biosRoot, requestPath))
    const insideRoot = filePath === biosRoot || filePath.startsWith(`${biosRoot}${sep}`)

    if (!insideRoot || !existsSync(filePath) || !statSync(filePath).isFile()) {
      res.statusCode = 404
      res.end()
      return
    }

    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
    res.setHeader('Content-Type', extname(filePath) === '.json' ? 'application/json' : 'application/octet-stream')

    if (req.method === 'HEAD') {
      res.statusCode = 200
      res.end()
      return
    }

    createReadStream(filePath).pipe(res)
  }

  return {
    name: 'external-bios',
    configureServer(server) {
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware)
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const biosBaseUrl = env.VITE_BIOS_BASE_URL || (env.VITE_BIOS_FS_PATH ? '/external-bios/' : undefined)

  return {
    plugins: [react(), externalBiosPlugin(env)],
    define: {
      'import.meta.env.VITE_BIOS_BASE_URL': JSON.stringify(biosBaseUrl),
    },
    resolve: {
      alias: {
        pngjs: fileURLToPath(new URL('./src/shims/pngjs.js', import.meta.url)),
      },
    },
    server: {
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
    },
    preview: {
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
    },
  }
})
