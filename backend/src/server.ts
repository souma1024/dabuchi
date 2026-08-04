import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 3000);

if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  console.error('Invalid PORT configuration.');
  process.exitCode = 1;
} else {
  const server = createApp().listen(port, () => {
    console.info(`Backend is listening on port ${port}.`);
  });

  server.on('error', (error: Error) => {
    console.error('Backend failed to start.', error);
    process.exitCode = 1;
  });
}
