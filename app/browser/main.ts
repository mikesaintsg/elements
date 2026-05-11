import { createApp } from 'vue'
// Single CSS entry — owns the `@layer` order, the Tailwind import, the
// framework SCSS bundle, and the `@source` directives. Vite's Sass
// plugin handles the cross-format `@import` of `index.scss`; the
// compiled CSS is then post-processed by `@tailwindcss/postcss`.
import './styles/main.css'

import App from './App.vue'

createApp(App).mount('#app')
