import { defineConfig } from "vitest/config"
import { fileURLToPath } from "node:url"

// Tests unitaires (logique pure + store localStorage via jsdom).
// Lancer : npm test   |   npm run test:watch
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["node_modules", ".next", ".netlify"],
  },
})
