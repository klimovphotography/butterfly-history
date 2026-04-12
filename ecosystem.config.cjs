module.exports = {
  apps: [
    {
      name: "butterfly",
      script: "server.mjs",
      cwd: "/root/butterfly",
      interpreter: "node",
      env: {
        DATA_DIR: "/root/butterfly-runtime",
      },
      autorestart: true,
      watch: false,
    },
    {
      name: "butterfly-bot",
      script: "bot.mjs",
      cwd: "/root/butterfly/telegram bot",
      interpreter: "node",
      autorestart: true,
      watch: false,
    },
  ],
};
