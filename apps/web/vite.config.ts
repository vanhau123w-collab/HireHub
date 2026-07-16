import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("@mantine") || id.includes("@floating-ui"))
            return "mantine";
          if (id.includes("react") || id.includes("i18next"))
            return "react-vendor";
          if (
            id.includes("@tanstack") ||
            id.includes("zustand") ||
            id.includes("zod")
          )
            return "data-vendor";
          if (id.includes("lucide-react")) return "icons";
        },
      },
    },
  },
});
