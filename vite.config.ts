import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { DEFAULT_API_PORT, DEFAULT_VITE_DEV_PORT } from './server/lib/constants';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiPort = Number(env.PORT) || DEFAULT_API_PORT;
  const devPort = Number(env.VITE_DEV_PORT) || DEFAULT_VITE_DEV_PORT;

  return {
    plugins: [react()],
    server: {
      port: devPort,
      proxy: {
        '/api': {
          target: `http://127.0.0.1:${apiPort}`,
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: devPort,
    },
  };
});
