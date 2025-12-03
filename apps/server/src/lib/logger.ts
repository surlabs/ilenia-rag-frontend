import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // Transport disabled to avoid Next.js/Turbopack worker thread issues (thread-stream)
  // For pretty printing in dev, pipe the output: npm run dev | pino-pretty
});

