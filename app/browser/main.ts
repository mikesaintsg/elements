import { createApp } from 'vue'
// Plain-CSS entry: layer order, Tailwind import, @source directives. Stays
// CSS so Sass never sees Tailwind's `@import 'tailwindcss'` (which would
// trigger Dart-Sass-3.0 deprecation warnings on every reload).
import './styles/main.css'
// Framework SCSS bundle — Vite's Sass plugin compiles it; the result is
// post-processed by `@tailwindcss/postcss` along with main.css.
import '../../src/styles/index.scss'
// Showcase chrome — sidebar drawer / mobile banner / TOC layout / page
// scaffolding. Framework-driven; Tailwind utilities remain available as
// per-page escape hatches but are not used here.
import './styles/showcase.scss'
import App from './App.vue'

createApp(App).mount('#app')
