import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 1215,
    proxy: {
      "/api/google-proxy": {
        target: "https://script.google.com/macros/s/AKfycbzgUs3RXLEvcjqh2Z-U1Izb91V3rCqtKCYmkzwWtSpeyYFtykZZVMMn6rOr-YMNP3fkDg/exec",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/google-proxy/, "")
      }
    }
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
