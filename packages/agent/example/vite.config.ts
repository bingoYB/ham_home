import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'ai-sdk-demo': resolve(__dirname, '../src/index.ts'),
    },
  },
  server: {
    port: 8888,
  },
})
