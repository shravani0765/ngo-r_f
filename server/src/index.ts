import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import apiRoutes from './routes/api.routes';
import { ApiError } from './lib/http';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 5001);

/**
 * Browser origins allowed to call this API. In development the Vite dev server
 * is permitted; in production the list must be set explicitly rather than
 * defaulting to "any site can call us with the user's token".
 */
const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    // Same-origin and non-browser clients (curl, server-to-server) send no Origin.
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`Origin ${origin} is not allowed to call this API.`));
  },
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'NGO Impact Data Commons API',
    timestamp: new Date().toISOString()
  });
});

app.use('/api', apiRoutes);

app.use('/api', (_req, res) => {
  res.status(404).json({ message: 'That endpoint does not exist.' });
});

/**
 * Turns thrown errors into clean JSON. Expected failures keep their message;
 * anything unexpected is logged in full but reported generically, so internal
 * details never leak to the browser.
 */
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ message: err.message });
  }

  // Prisma unique-constraint violations are a user error, not a crash.
  if (err?.code === 'P2002') {
    const field = Array.isArray(err?.meta?.target) ? err.meta.target.join(', ') : 'value';
    return res.status(409).json({ message: `That ${field} is already in use.` });
  }
  if (err?.code === 'P2025') {
    return res.status(404).json({ message: 'That record could not be found.' });
  }

  console.error('Unhandled server error:', err);
  return res.status(500).json({ message: 'Something went wrong on our side. Please try again.' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  NGO Impact Data Commons API`);
  console.log(`  → http://localhost:${PORT}/api/health\n`);
});
