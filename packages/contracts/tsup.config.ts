import { defineConfig } from 'tsup';

// ESM + CJS: o NestJS roda em CommonJS; o Vite lê ESM.
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
});
