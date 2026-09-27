// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: false },

  // Mobile apps run in SPA mode inside Capacitor WebView
  ssr: false,

  modules: [
    '@nuxt/ui',
    '@pinia/nuxt',
    '@vueuse/nuxt'
  ],

  // Generate directly to 'dist' directory for Capacitor
  nitro: {
    output: {
      publicDir: 'dist'
    }
  },

  colorMode: {
    preference: 'dark',
    fallback: 'dark',
    classSuffix: ''
  },

  app: {
    head: {
      htmlAttrs: {
        class: 'dark'
      },
      bodyAttrs: {
        class: 'dark bg-zinc-950 text-zinc-100'
      },
      title: 'N.ECO PART STORAGE',
      meta: [
        { charset: 'utf-8' },
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
        },
        { name: 'theme-color', content: '#09090b' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' }
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap' },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'apple-touch-icon', href: '/icon.png' }
      ]
    }
  },

  vue: {
    compilerOptions: {
      // Support jeep-sqlite custom element in dev web mode
      isCustomElement: (tag) => tag.startsWith('jeep-')
    }
  },

  css: [
    '~/assets/css/main.css'
  ]
})
