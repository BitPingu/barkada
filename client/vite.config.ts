import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Configure Vite for the React application.
export default defineConfig({
  plugins: [react()],
  server: {
    // Allow access from other devices on the local network.
    host: '0.0.0.0',
  },
})
