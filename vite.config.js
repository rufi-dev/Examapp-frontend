import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Production API. Used as a FALLBACK so a build that forgot to set
// VITE_BACKEND_URL (e.g. a CI/host env var not configured) still ships a working
// app instead of calling "undefined/api/..." and breaking everything.
const DEFAULT_BACKEND_URL = 'https://api.bunkermath.az'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendUrl = env.VITE_BACKEND_URL || DEFAULT_BACKEND_URL
  return {
  // Force a defined value for the backend URL even if the env var is missing,
  // so `import.meta.env.VITE_BACKEND_URL` is never `undefined` in the bundle.
  define: {
    'import.meta.env.VITE_BACKEND_URL': JSON.stringify(backendUrl),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon-64.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'BunkerMath',
        short_name: 'BunkerMath',
        description: 'Riyaziyyat sınaq imtahanları, nəticələr və statistika.',
        lang: 'az',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#f6f7fb',
        theme_color: '#f6f7fb',
        categories: ['education'],
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precache the app shell so it opens offline; SPA routes fall back to
        // index.html. The API lives on another origin, so the SW never touches
        // it (the denylist is just a safety net).
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webp,woff2}'],
        // Don't precache the heavy ADMIN-ONLY chunks onto every student's device:
        // the structured-question builder bundles MathLive (~800KB) and the
        // results PDF export bundles @react-pdf (~1.3MB). Staff load them on
        // demand over the network instead; students never download them.
        globIgnores: [
          '**/StructuredBuilder-*.js',
          '**/ResultsPdfExport-*.js',
          '**/ResultsExcelExport-*.js',
          '**/exceljs*.js',
        ],
        // Disable the default cache-first NavigationRoute (app-shell). It served
        // the precached shell first, which during a deploy's SW-swap window pointed
        // at just-purged chunk hashes → "site can't be reached" (ERR_FAILED). The
        // network-first navigation route below handles all navigations instead.
        navigateFallback: null,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        navigationPreload: true,
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024, // include the pdf.js worker chunk
        runtimeCaching: [
          {
            // Page navigations: ALWAYS try the live network first so users get the
            // freshest index.html (with the current hashed-chunk names) right after
            // a deploy. The old behaviour served the precached app shell first —
            // which, during the brief SW-update window, pointed at chunk hashes that
            // had just been purged, surfacing as "site can't be reached"
            // (ERR_FAILED) until it self-healed. Falling back to cache only when the
            // network truly fails keeps it working offline.
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-navigations',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  }
})
