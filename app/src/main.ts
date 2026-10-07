import { createApp } from 'vue'
import { registerSW } from 'virtual:pwa-register'
import '@fontsource/fredoka/400.css'
import '@fontsource/fredoka/500.css'
import '@fontsource/fredoka/600.css'
import '@fontsource/fredoka/700.css'
import './style.css'
import App from './app.vue'

registerSW({ immediate: true })

createApp(App).mount('#app')
