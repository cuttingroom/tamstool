import { defineConfig } from "vite";
import path from 'path';
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: '/tamstool/',
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: "@",
        replacement: path.resolve(__dirname, "./src"),
      },
    ],
  },
});
