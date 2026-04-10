module.exports = {
  apps: [
    {
      name: 'ctc-task',
      cwd: '/root/.openclaw/workspace/ctc-task/ctc-task-main',
      script: 'npm',
      args: 'run start:prod',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        DB_PATH: '/root/.openclaw/workspace/ctc-task/ctc-task-main/backend/database.sqlite'
      }
    }
  ]
};
