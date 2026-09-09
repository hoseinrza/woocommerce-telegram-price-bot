module.exports = {
  apps: [
    {
      name: 'woocommerce-telegram-price-bot',
      script: 'src/server.js',
      interpreter: 'node',
      interpreter_args: '--env-file=.env',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '400M',
      kill_timeout: 10000,
      wait_ready: false,
      listen_timeout: 10000,
      out_file: 'logs/out.log',
      error_file: 'logs/error.log',
      merge_logs: true,
      time: true,
    },
  ],
};
