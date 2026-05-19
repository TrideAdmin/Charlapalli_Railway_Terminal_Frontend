require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: ['https://charlapalli-railway-terminal.tride.live', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));
app.use(express.json());

// Rate limiting
// Enable if you're behind a reverse proxy (Heroku, Render, Nginx, etc)
app.set('trust proxy', 1); 
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500 });
app.use(limiter);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api', require('./routes/api'));

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
