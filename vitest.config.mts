import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Minimal Vitest setup — node environment (no DOM needed for the routes/lib
// code under test today), "@/*" alias resolved from tsconfig.json so tests
// can import route handlers and lib modules the same way the app does.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/lib/billing-fulfillment.ts", "src/app/api/paystack/webhook/route.ts"],
    },
  },
});
