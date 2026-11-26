import env from './config/env.js';
import { initializeDatabase } from './config/db.js';
import { createApp } from './app.js';

const app = createApp();

async function startServer() {
  try {
    await initializeDatabase();
    app.listen(env.port, '0.0.0.0', () => {
      console.log(`Mali Audio API running on http://0.0.0.0:${env.port}`);
    });
  } catch (error) {
    console.error('Database initialization failed:', error.message);
    process.exit(1);
  }
}

startServer();
