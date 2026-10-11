import { defineConfig } from "vite";
export default defineConfig({
  base: process.env.BASE_PATH || "/jugada-clara/",
  build: { target: "es2022" },
});
