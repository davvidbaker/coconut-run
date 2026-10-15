import { defineConfig } from "vite";

export default defineConfig({
  // Pages project sites live under /coconut-run/; local and Sites builds use /.
  base: process.env.PAGES_BASE || "/",
});
