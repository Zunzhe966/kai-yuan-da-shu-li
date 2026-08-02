import {
  cloudflareTest,
  readD1Migrations,
} from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig(async () => ({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        bindings: {
          TEST_MIGRATIONS: await readD1Migrations("./migrations"),
        },
        d1Databases: ["RESTORE_DB", "NONEMPTY_RESTORE_DB"],
      },
    }),
  ],
  test: {
    deps: {
      optimizer: {
        ssr: {
          enabled: true,
          include: ["ajv", "ajv/dist/2020", "ajv-formats"],
        },
      },
    },
  },
}));
