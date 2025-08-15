// ecosystem.config.js - PM2 配置文件
module.exports = {
    apps: [{
      name: 'llog-server',
      script: './server.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        LLOG_DATA_DIR: process.env.LLOG_DATA_DIR || '../data'
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3001,
        LLOG_DATA_DIR: '../data'
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000
    }]
  };