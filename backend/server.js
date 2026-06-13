require('dotenv').config();
const express = require('express');
const helmet  = require('helmet');
const cors    = require('cors');
const path    = require('path');
const connectDB   = require('./config/db');
const { logger }  = require('./config/logger');
const { apiLimiter } = require('./middleware/rateLimiter');
const { startJobs }  = require('./jobs/scheduler');

const app = express();

app.use(helmet());

// CORS — allow localhost:3000 always
const normalizeOrigin = (value = '') => value.trim().replace(/\/+$/, '').toLowerCase();
const ALLOWED_ORIGINS = new Set(
  [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5000',
  ]
    .filter(Boolean)
    .map(normalizeOrigin)
);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const normalizedOrigin = normalizeOrigin(origin);
    if (normalizedOrigin.endsWith('.trycloudflare.com')) return callback(null, true);
    if (normalizedOrigin.endsWith('.railway.app')) return callback(null, true);
    if (ALLOWED_ORIGINS.has(normalizedOrigin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-setup-key'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api/', apiLimiter);

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Routes ──────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/vault',     require('./routes/vault'));
app.use('/api/nominees',  require('./routes/nominees'));
app.use('/api/deadman',   require('./routes/deadman'));
app.use('/api/death',     require('./routes/death'));
app.use('/api/messages',  require('./routes/messages'));
app.use('/api/test',      require('./routes/test'));
app.use('/api/admin',     require('./routes/admin'));

app.get('/api/health', (req, res) => res.json({
  success: true, message: 'Estate Vault API running', version: '4.0.0',
  timestamp: new Date().toISOString(),
}));

app.use('*', (req, res) => res.status(404).json({ success: false, error: 'Route not found.' }));
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal server error.' });
});

const PORT = process.env.PORT || 5000;
const start = async () => {
  await connectDB();
  startJobs();
  app.listen(PORT, () => logger.info(`🔐 Estate Vault API v4 → http://localhost:${PORT}`));
};
start();
