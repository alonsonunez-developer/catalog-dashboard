import { createApp } from 'vue'
import './style.css'
import 'catalog-kit/style.css'
import App from './App.vue'
import router from './router'
import { initSession } from './lib/session'

async function bootstrap() {
  await initSession()
  createApp(App).use(router).mount('#app')
}
bootstrap()