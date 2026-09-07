import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /\/AI_Model\/.*/,
            handler: 'CacheFirst',
            options: { cacheName: 'ai-model', expiration: { maxEntries: 10, maxAgeSeconds: 30 * 24 * 3600 } }
          },
          {
            urlPattern: /\/api\/prices/,
            handler: 'NetworkFirst',
            options: { cacheName: 'price-data', expiration: { maxEntries: 50, maxAgeSeconds: 3600 } }
          },
          {
            urlPattern: /\/api\/recyclers/,
            handler: 'NetworkFirst',
            options: { cacheName: 'recycler-data', expiration: { maxEntries: 50, maxAgeSeconds: 3600 } }
          }
        ]
      },
      manifest: {
        name: 'Kabadiwala Connect',
        short_name: 'Kabadiwala',
        description: 'Fair pricing and formal recycling for scrap collectors',
        theme_color: '#3A34D4',
        background_color: '#F8F9FB',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/brand/icon-180.png', sizes: '180x180', type: 'image/png', purpose: 'any maskable' },
          { src: '/brand/logo-mark.png', sizes: '512x512', type: 'image/png', purpose: 'any' }
        ]
      }
    })
  ],
  server: {
    port: 3000,
    host: true,
  },
});
