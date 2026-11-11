import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import healthHandler from './api/health.ts';
import carparkAvailabilityHandler from './api/carparkavailability.ts';
import busArrivalHandler from './api/busarrival.ts';
import onemapHandler from './api/onemap.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json());

  // Mount serverless endpoints
  app.all('/api/health', (req, res) => {
    return healthHandler(req, res);
  });

  app.all('/api/carparkavailability', (req, res) => {
    return carparkAvailabilityHandler(req, res);
  });

  // Alias for kebab-case
  app.all('/api/carpark-availability', (req, res) => {
    return carparkAvailabilityHandler(req, res);
  });

  app.all('/api/busarrival', (req, res) => {
    return busArrivalHandler(req, res);
  });

  app.all('/api/bus-arrival', (req, res) => {
    return busArrivalHandler(req, res);
  });

  // OneMap API proxies (search, route, revgeocode, token)
  app.all('/api/onemap*', (req, res) => {
    return onemapHandler(req, res);
  });

  if (!isProd) {
    // Development mode: Vite middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    // Production mode: Serve built static assets
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));

    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ParkSG Server] Running on http://localhost:${PORT}`);
    console.log(`[ParkSG Server] Health endpoint: http://localhost:${PORT}/api/health`);
    console.log(`[ParkSG Server] LTA Carpark endpoint: http://localhost:${PORT}/api/carparkavailability`);
  });
}

startServer().catch((err) => {
  console.error('[ParkSG Server] Startup error:', err);
  process.exit(1);
});
