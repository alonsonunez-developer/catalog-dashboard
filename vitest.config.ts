import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { dedupe: ['vue', 'zod'] },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
})