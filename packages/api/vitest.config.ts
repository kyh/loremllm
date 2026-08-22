import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // `@repo/db` builds its libsql client at import time and rejects an empty
    // URL, so importing anything that reaches the db module needs one. Nothing
    // here issues a query — this is a parseable placeholder, not a database.
    env: {
      TURSO_DATABASE_URL: "http://127.0.0.1:8080",
    },
  },
});
