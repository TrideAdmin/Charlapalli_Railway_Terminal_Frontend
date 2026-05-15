/**
 * index.js — Charlapalli Terminal · Backend API Server
 * ─────────────────────────────────────────────────────
 * Express REST API consumed by the frontend.
 * Mirrors the live API at charlapalli-railway-terminal-api.tride.live
 *
 * Usage:
 *   npm install
 *   node src/index.js
 *   PORT=4000 node src/index.js
 */

const express = require('express');
const cors    = require('cors');

const app  = express();
const PORT = process.env.PORT || 4000;

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',  // restrict to frontend origin in production
  methods: ['GET', 'POST'],
}));

// ── Helpers ────────────────────────────────────────────────────────────────
const rand  = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick  = arr => arr[Math.floor(Math.random() * arr.length)];
const ts    = () => new Date().toISOString();

// ── Routes ─────────────────────────────────────────────────────────────────

/** Health check */
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: ts(), service: 'charlapalli-terminal-api' });
});

/** Live wait times — Help Desk, ATVMs, Booking counters */
app.get('/api/wait-times', (_req, res) => {
  res.json([
    { id: 'help-desk',     label: 'Help Desk',           waitMins: rand(1, 8),  queue: rand(2, 15), status: 'open'  },
    { id: 'atvm-1',        label: 'ATVM #1 (Platform 1)', waitMins: rand(0, 3),  queue: rand(0, 6),  status: 'open'  },
    { id: 'atvm-2',        label: 'ATVM #2 (Platform 9)', waitMins: rand(0, 4),  queue: rand(0, 8),  status: 'open'  },
    { id: 'booking-new',   label: 'Booking — New Bldg',   waitMins: rand(2, 12), queue: rand(3, 20), status: 'open'  },
    { id: 'booking-old',   label: 'Booking — Old Bldg',   waitMins: rand(1, 10), queue: rand(1, 18), status: pick(['open','busy']) },
    { id: 'uts-counter',   label: 'UTS Counter',           waitMins: rand(1, 6),  queue: rand(1, 12), status: 'open'  },
  ]);
});

/** Train schedule */
app.get('/api/trains', (req, res) => {
  const { direction, platform } = req.query;
  const trains = [
    { trainNo: '12728', name: 'Godavari SF Express',    platform: 1, scheduledDep: '06:10', status: 'On Time',  delay: 0,  direction: 'departure' },
    { trainNo: '17064', name: 'Ajanta Express',          platform: 2, scheduledDep: '06:45', status: 'On Time',  delay: 0,  direction: 'departure' },
    { trainNo: '12703', name: 'Falaknuma Express',       platform: 3, scheduledDep: '07:30', status: 'Delayed', delay: 12, direction: 'departure' },
    { trainNo: '18501', name: 'Visakha Express',         platform: 5, scheduledDep: '08:15', status: 'On Time',  delay: 0,  direction: 'departure' },
    { trainNo: '12727', name: 'Godavari SF Express',    platform: 1, scheduledArr: '09:00', status: 'On Time',  delay: 0,  direction: 'arrival'   },
    { trainNo: '17019', name: 'Hyderabad Express',       platform: 4, scheduledArr: '09:45', status: 'On Time',  delay: 0,  direction: 'arrival'   },
    { trainNo: '12604', name: 'Chennai Mail',            platform: 6, scheduledDep: '10:20', status: 'On Time',  delay: 0,  direction: 'departure' },
    { trainNo: '57477', name: 'Secunderabad Passenger',  platform: 7, scheduledDep: '11:00', status: 'On Time',  delay: 0,  direction: 'departure' },
    { trainNo: '57478', name: 'Kazipet Passenger',       platform: 9, scheduledArr: '11:35', status: 'Delayed', delay: 5,  direction: 'arrival'   },
    { trainNo: '12748', name: 'Palnadu SF Express',      platform: 2, scheduledDep: '13:00', status: 'On Time',  delay: 0,  direction: 'departure' },
  ];

  let filtered = trains;
  if (direction) filtered = filtered.filter(t => t.direction === direction);
  if (platform)  filtered = filtered.filter(t => t.platform  === Number(platform));

  res.json({ timestamp: ts(), trains: filtered });
});

/** Smart locker availability */
app.get('/api/lockers', (_req, res) => {
  const zones = ['A', 'B', 'C'];
  const sizes  = ['small', 'medium', 'large'];
  res.json(zones.flatMap(zone =>
    sizes.map(size => ({
      id:        `${zone}-${size}`,
      zone,
      size,
      total:     size === 'small' ? 20 : size === 'medium' ? 12 : 6,
      available: rand(0, size === 'small' ? 20 : size === 'medium' ? 12 : 6),
      pricePerHr: size === 'small' ? 10 : size === 'medium' ? 20 : 35,
    }))
  ));
});

/** Parking availability */
app.get('/api/parking', (_req, res) => {
  res.json([
    { zone: 'P1', label: '2-Wheeler Parking', total: 120, available: rand(10, 80),  fee: '₹10 / 4 hrs' },
    { zone: 'P2', label: '4-Wheeler Parking', total: 60,  available: rand(5, 40),   fee: '₹30 / 4 hrs' },
    { zone: 'P3', label: 'Auto / Cab Drop',   total: 30,  available: rand(0, 20),   fee: 'Free (15 min)' },
    { zone: 'P4', label: 'Differently Abled', total: 10,  available: rand(0, 8),    fee: 'Free' },
  ]);
});

/** Sleeping pods */
app.get('/api/pods', (_req, res) => {
  res.json([
    { id: 'pod-1', type: 'Standard', floor: 1, available: rand(0, 4) > 0, pricePerHr: 80  },
    { id: 'pod-2', type: 'Standard', floor: 1, available: rand(0, 4) > 0, pricePerHr: 80  },
    { id: 'pod-3', type: 'Premium',  floor: 2, available: rand(0, 3) > 0, pricePerHr: 120 },
    { id: 'pod-4', type: 'Premium',  floor: 2, available: rand(0, 3) > 0, pricePerHr: 120 },
    { id: 'pod-5', type: 'Standard', floor: 1, available: rand(0, 4) > 0, pricePerHr: 80  },
    { id: 'pod-6', type: 'Premium',  floor: 2, available: rand(0, 2) > 0, pricePerHr: 120 },
  ]);
});

/** Lost & Found submission */
app.post('/api/lost-found', (req, res) => {
  const { name, phone, description, date } = req.body || {};
  if (!name || !phone || !description) {
    return res.status(400).json({ error: 'name, phone, and description are required' });
  }
  res.json({
    success:  true,
    refId:    `LF-${Date.now()}`,
    message:  'Your report has been submitted. Our staff will contact you within 24 hours.',
    submitted: ts(),
  });
});

/** Contact form submission */
app.post('/api/contact', (req, res) => {
  const { name, email, subject, message } = req.body || {};
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'name, email, and message are required' });
  }
  res.json({
    success: true,
    ticketId: `CT-${Date.now()}`,
    message: 'Thank you for reaching out. We will respond within 48 hours.',
    submitted: ts(),
  });
});

// ── 404 fallback ────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// ── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('─────────────────────────────────────────────');
  console.log('  Charlapalli Terminal — Backend API');
  console.log(`  http://localhost:${PORT}/api`);
  console.log('─────────────────────────────────────────────');
});
