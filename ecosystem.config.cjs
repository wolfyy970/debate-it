module.exports = {
  apps: [
    {
      name: 'debater-server',
      script: './server/index.ts',
      interpreter: 'tsx',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
      log_file: './logs/server.log',
      out_file: './logs/server-out.log',
      error_file: './logs/server-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
    {
      name: 'debater-client',
      script: 'vite',
      args: 'preview --port 5173',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
      log_file: './logs/client.log',
      out_file: './logs/client-out.log',
      error_file: './logs/client-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
};