module.exports = {
  apps: [
    {
      name: 'minya-landfill',
      cwd: __dirname,
      script: 'scripts/start-server.js',
      interpreter: 'node',
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 3000,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
