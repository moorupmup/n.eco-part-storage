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

  app: {
    head: {
      title: 'Склад Запчастей',
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
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }
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
