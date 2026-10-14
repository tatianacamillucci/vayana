module.exports = {
  apps: [{
    name: 'vayana-api',
    script: 'dist/src/main.js',
    cwd: '/home/vayana/vayana/vayana-api',
    instances: 1,
    autorestart: true,
    watch: false,
    env: {
      NODE_ENV: 'production',
    },
  }],
};
