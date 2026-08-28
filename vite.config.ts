import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves this at https://<user>.github.io/buringplan/, so assets
// need the repo name as a base path in production builds.
const base = process.env.GITHUB_PAGES ? '/buringplan/' : '/'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as {
  version: string
}

let commit = 'local'
try {
  commit = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
    .toString()
    .trim()
} catch {
  // Not a git checkout (e.g. a source tarball) — keep the placeholder.
}

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_COMMIT__: JSON.stringify(commit),
    __APP_BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
  plugins: [
    react(),
    VitePWA({
      // autoUpdate: the new service worker skips waiting and claims open pages,
      // so a client on an old build upgrades itself with no user action. We
      // register it by hand (see src/lib/appUpdate.ts) to add a one-time reload
      // when the new worker takes control — held back while a drive is being
      // tracked so nobody loses a live session.
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'buringplan — tow trip planner',
        short_name: 'buringplan',
        description: 'Truck + trailer camping trip planner: Stillwater to Gerlach',
        theme_color: '#17140f',
        background_color: '#17140f',
        display: 'standalone',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Keep the app shell installable/offline-capable; live GPS tracking works
        // offline regardless (Geolocation + IndexedDB don't need network), only the
        // map tiles themselves need connectivity.
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        // Always try the network for the page document so a reopened app on a
        // stale shell pulls the current index.html (and its hashed assets) when
        // online; the precache still covers offline.
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: { cacheName: 'app-shell', networkTimeoutSeconds: 3 },
          },
        ],
      },
    }),
  ],
})
