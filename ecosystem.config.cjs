const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 3000),
  DEV_DIAGNOSTICS: process.env.DEV_DIAGNOSTICS || 'false'
};

if (process.env.OPENAI_API_KEY) {
  env.OPENAI_API_KEY = process.env.OPENAI_API_KEY;
}

if (process.env.OPENAI_BASE_URL) {
  env.OPENAI_BASE_URL = process.env.OPENAI_BASE_URL;
}

module.exports = {
  apps: [
    {
      name: 'rockecho',
      script: 'npx',
      args: 'wrangler pages dev dist --d1=rockecho-production --local --ip 0.0.0.0 --port 3000',
      env,
      watch: false,
      instances: 1,
      exec_mode: 'fork'
    }
  ]
};