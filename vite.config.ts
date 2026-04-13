import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/ts-diagram/',
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    // Force Vite to handle these specifically
    include: ['react-plotly.js', 'plotly.js-dist-min', 'gsw-js'],
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
    },
  },
})
