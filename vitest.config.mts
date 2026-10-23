import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    passWithNoTests: true,
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          name: "db",
          // Requires a PostgreSQL server: TEST_DATABASE_URL=postgresql://user:pass@host:5432/postgres
          include: process.env.TEST_DATABASE_URL ? ["tests/db/**/*.test.ts"] : [],
          environment: "node",
          testTimeout: 60_000,
          hookTimeout: 120_000,
          fileParallelism: false,
        },
      },
    ],
  },
});
