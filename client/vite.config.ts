import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
  // `npm start` (vite preview) is a separate server from `npm run dev`, so it
  // needs its own proxy config - without this, a locally built+started client
  // can't reach a locally built+started server (see server/README start docs).
  preview: {
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
})
