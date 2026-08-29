import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  base: '/finance-assistant-mobile/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'Finance Assistant',
        short_name: 'Finance Assistant',
        description: 'Consulta das finanças pessoais do Diogo',
        lang: 'pt-PT',
        start_url: '/finance-assistant-mobile/',
        scope: '/finance-assistant-mobile/',
        display: 'standalone',
        background_color: '#fffbff',
        theme_color: '#1b6b5a',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,svg,png}'],
        // finance.db nunca é servido como asset estático: é descarregado via
        // Microsoft Graph e guardado apenas em IndexedDB.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  optimizeDeps: {
    exclude: ['sql.js'],
  },
});
