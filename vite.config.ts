import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// `base` is set from an env var so the same build works on GitHub Pages
// (served from /<repo>/) and on a domain root or local preview.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
