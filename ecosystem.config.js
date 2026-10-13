module.exports = {
  apps: [
    {
      name: 'whatsi-dashboard',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3050,
        HOST: '0.0.0.0'
      }
    }
  ]
};
