import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/feedback": "http://localhost:8000",
      "/stats": "http://localhost:8000",
    },
  },
});
