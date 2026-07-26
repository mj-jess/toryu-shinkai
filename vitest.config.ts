import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // DB-touching tests spin up a fresh PGlite instance and run every migration
    // in beforeAll; under parallel workers on a loaded machine that can exceed
    // the 10s default, so give the hooks room as the migration count grows.
    hookTimeout: 60_000,
    testTimeout: 20_000,
  },
});
