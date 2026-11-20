import { defineConfig } from "vitest/config";
import base from "../../vitest.config";

export default defineConfig({
  ...base,
  test: {
    ...base.test,
    include: ["output/ollama-small-model-20261110/ollama.integration.ts"],
    testTimeout: 600_000,
  },
});
