import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Relative asset paths work on GitHub Pages project sites and alternate hosts.
  base: './',
  plugins: [react()],
})
