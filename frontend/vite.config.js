import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    exclude: ["pdfjs-dist"],   // 🚀 prevents worker optimization error
  },
  build: {
    commonjsOptions: {
      include: [/pdfjs-dist/, /node_modules/], // ensures pdfjs works in prod too
    },
  },
});
