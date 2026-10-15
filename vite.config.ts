import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { GOATCOUNTER_CODE } from './src/store/usage';

/**
 * Content-Security-Policy for the production build. GitHub Pages can't send headers, so it goes in a
 * <meta> tag; dev is left alone because Vite's dev server relies on inline scripts.
 * style-src needs 'unsafe-inline' for the emoji picker, which injects its CSS at runtime.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  'font-src https://fonts.gstatic.com',
  "img-src 'self' data:",
  `connect-src 'self'${GOATCOUNTER_CODE ? ` https://${GOATCOUNTER_CODE}.goatcounter.com` : ''}`,
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

const csp = (): Plugin => ({
  name: 'csp',
  apply: 'build',
  transformIndexHtml: () => [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' }],
});

export default defineConfig({
  base: './',
  plugins: [react(), csp()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
