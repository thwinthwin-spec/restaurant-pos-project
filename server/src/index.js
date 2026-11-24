import mongoose from 'mongoose';
import app from './app.js';
import { env } from './config/env.js';

mongoose.set('strictQuery', true);

async function start() {
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 10_000 });
  const server = app.listen(env.port, () => {
    console.log(`[api] ready on http://localhost:${env.port} (${env.nodeEnv})`);
    console.log(`[db]  connected to ${env.mongoUri}`);
  });

  const shutdown = async (signal) => {
    console.log(`[server] ${signal} received, closing connections...`);
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((error) => {
  console.error('[startup] failed:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => console.error('[unhandledRejection]', reason));
process.on('uncaughtException', (error) => console.error('[uncaughtException]', error));
