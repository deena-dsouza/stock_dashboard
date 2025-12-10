
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
 import tailwindcss from '@tailwindcss/vite'
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),tailwindcss()],
  base: './',          // Ensures relative paths, important for Firebase Hosting
  build: {
    outDir: 'dist',    // Firebase public folder
    assetsDir: 'assets', // Keep JS/CSS inside assets/
  }
})
