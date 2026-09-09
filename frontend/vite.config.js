import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    // Same-origin fetches from the UI (/jobs, /applications, ...)
    // get forwarded to Express so we don't fight CORS during local demo
    proxy: {
      "/jobs": "http://localhost:3000",
      "/applications": "http://localhost:3000",
      "/candidates": "http://localhost:3000",
    },
  },
});
