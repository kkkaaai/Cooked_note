import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@cookednote/shared': path.resolve(__dirname, './src'),
    },
  },
})
