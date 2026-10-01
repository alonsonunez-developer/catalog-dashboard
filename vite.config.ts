import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: { dedupe: ['vue', 'zod'] },
  server: { port: 5174 }, // el visualizador usa 5173
})