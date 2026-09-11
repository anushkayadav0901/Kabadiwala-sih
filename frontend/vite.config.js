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
        // Chrome on Android needs real 192px and 512px icons before it offers
        // "Install app". Maskable versions keep the logo inside the safe zone
        // so Android's circular crop doesn't cut it off.
        icons: [
          { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/brand/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/brand/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      }
    })
  ],
  server: {
    port: 3000,
    host: true,
  },
});
