require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3001;

// ── CORS ────────────────────────────────────────────────────────────────────
// In production set FRONTEND_ORIGIN in your environment / docker-compose.
// Multiple origins are comma-separated: "https://a.com,https://b.com"
const allowedOrigins = process.env.FRONTEND_ORIGIN
  ? process.env.FRONTEND_ORIGIN.split(',').map(o => o.trim())
  : null; // null → allow all (dev mode)

app.use(cors({
  origin: (origin, cb) => {
    // Allow server-to-server calls (no Origin header) and same-origin
    if (!origin) return cb(null, true);
    if (!allowedOrigins) return cb(null, true); // dev: allow all
    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
// Respond to preflight requests immediately
app.options('*', cors());
app.use(express.json());

// Rate limiting
// Enable if you're behind a reverse proxy (Heroku, Render, Nginx, etc)
app.set('trust proxy', 1);
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500 });
app.use(limiter);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api', require('./routes/api'));
app.use('/', require('./routes/api')); // fallback to allow routes without /api prefix

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// 404 – JSON only (no HTML rendering)
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});


app.listen(PORT, () => {
  console.log(`CT Enhanced API running at http://localhost:${PORT}`);
});
