/**
 * AI Brain Server Entrypoint
 */

import dotenv from 'dotenv';
dotenv.config();

import { createBrainApp } from './server';

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

const app = createBrainApp();

const server = app.listen(PORT, HOST, () => {
  console.log(`=======================================================`);
  console.log(`🧠 AI Brain Server (Bilingual Sinhala + English Engine)`);
  console.log(`📡 Listening on http://${HOST}:${PORT}`);
  console.log(`🌐 Live Dashboard: http://${HOST}:${PORT}/`);
  console.log(`📚 Health status:  http://${HOST}:${PORT}/health`);
  console.log(`=======================================================`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
