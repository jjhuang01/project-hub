module.exports = {
  apps : [{
    name   : "project-hub-ui",
    script : "npm",
    args   : "start -- -p 8888",
    cwd    : "./",
    instances: 1,
    autorestart: true,
    watch: false,
    env: {
      NODE_ENV: "production",
      PORT: "8888"
    }
  }]
}
