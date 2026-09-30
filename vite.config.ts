import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The API has no CORS, so the dev server proxies API calls to it.
const API_URL = process.env.SHOP_API_URL ?? "http://127.0.0.1:8000";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/api": API_URL,
      "/health": API_URL,
    },
  },
  preview: {
    proxy: {
      "/api": API_URL,
      "/health": API_URL,
    },
  },
});
