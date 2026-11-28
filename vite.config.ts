import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Shown in the Sync screen so you can tell which version a device is running.
const APP_VERSION = `${new Date().toISOString().slice(0, 10)} · ${(process.env.GITHUB_SHA ?? 'dev').slice(0, 7)}`;

export default defineConfig({
  base: '/TimeLedger/',
  define: { __APP_VERSION__: JSON.stringify(APP_VERSION) },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        id: '/TimeLedger/',
        name: 'Hourwell — Focus Timer',
        short_name: 'Hourwell — Focus Timer',
        description: 'One tap to focus. Track reading, homework, and deep work by day, week, and month.',
        theme_color: '#090908',
        background_color: '#090908',
        display: 'standalone',
        orientation: 'any',
        start_url: '/TimeLedger/',
        scope: '/TimeLedger/',
        lang: 'en',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,webmanifest}'],
        navigateFallback: 'index.html',
      },
      devOptions: { enabled: false },
    }),
  ],
  server: { host: '0.0.0.0', port: 5173, strictPort: true },
  preview: { host: '0.0.0.0', port: 4173, strictPort: true },
});
