module.exports = {
  apps: [
    {
      name: 'novel-workbench',
      script: './dist/boot.js',
      cwd: '/www/wwwroot/novel-workbench',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: '17328',
        // DATABASE_URL 请在服务器上通过环境变量�?.env 文件注入
      },
    },
  ],
};
