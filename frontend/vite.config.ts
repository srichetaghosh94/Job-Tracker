import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In dev, requests to /api are forwarded to the Go backend. The address is
// 127.0.0.1 rather than "localhost" because the backend listens on IPv4 only and
// some systems resolve "localhost" to IPv6 first.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8080",
        changeOrigin: true,
      },
    },
  },
});
