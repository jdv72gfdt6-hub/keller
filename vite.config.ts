import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Relativer base-Pfad: funktioniert auf GitHub Pages (/<repo>/), im lokalen Netz und auf jedem anderen Host.
export default defineConfig({
  base: './',
  define: {
    // Build-Zeitpunkt als Versionsanzeige unter "Mehr"
    __APP_VERSION__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ')),
  },
  // Der 3D-Teil (Three.js) ist ein eigener, nachgeladener Chunk von ca. 1 MB – das ist gewollt.
  build: { chunkSizeWarningLimit: 1200 },
  plugins: [
    react(),
    VitePWA({
      // "prompt": neue Versionen werden erst nach Tippen auf "Aktualisieren" aktiv,
      // damit nie mitten in einer Eingabe neu geladen wird.
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Keller – Inventar',
        short_name: 'Keller',
        description: 'Was liegt wo im Keller? Offline-Inventar mit QR-Codes.',
        lang: 'de',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#070b12',
        theme_color: '#070b12',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Alles vorab cachen, damit die App im Keller komplett ohne Netz läuft.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,json}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
    }),
  ],
});
