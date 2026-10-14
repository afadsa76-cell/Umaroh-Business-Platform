import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    base: './',
    json: {
      stringify: true,
    },
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.DATABASE_MODE': JSON.stringify(env.DATABASE_MODE || env.VITE_DATABASE_MODE || ''),
      'process.env.ACTIVE_DATABASE': JSON.stringify(env.ACTIVE_DATABASE || env.VITE_ACTIVE_DATABASE || ''),
      'process.env.FIRESTORE_DATABASE_ID': JSON.stringify(env.FIRESTORE_DATABASE_ID || env.VITE_FIRESTORE_DATABASE_ID || ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        'react': path.resolve(__dirname, 'node_modules/react'),
        'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      },
    },
    build: {
      target: 'esnext',
      sourcemap: false,
      minify: false,
      cssMinify: false,
      reportCompressedSize: false,
      rollupOptions: {
        cache: false,
        maxParallelFileOps: 1,
        treeshake: true,
      }
    },
    optimizeDeps: {
      entries: ['index.html'],
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true,
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
