import cors from '@fastify/cors'
import Fastify from 'fastify'
import { prisma } from './lib/prisma.js'

export function buildApp() {
  const app = Fastify({
    logger: true
  });

  app.register(cors, {
    origin: true
  });

  app.get('/health', async () => {
    return {
      status: 'ok',
      service: 'studyflow-api'
    };
  });

  app.get('/db-health', async () => {
    await prisma.$queryRaw`SELECT 1`;

    return {
      status: 'ok',
      database: 'connected'
    };
  });

  return app;
}