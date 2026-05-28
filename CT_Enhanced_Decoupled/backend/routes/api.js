const express = require('express');
const router = express.Router();

// Simulated live wait time data
const generateWaitTime = () => {
  const options = ['0–5 min', '5–10 min', '10–20 min'];
  return options[Math.floor(Math.random() * options.length)];
};

const gates = [
  { id: 1, name: 'Main Entry Gate (North)', type: 'entry' },
  { id: 2, name: 'South Entry Gate', type: 'entry' },
  { id: 3, name: 'FOB Entry', type: 'entry' },
  { id: 4, name: 'Platform 1 Entry', type: 'entry' },
  { id: 5, name: 'Baggage Scanner (North)', type: 'security' },
  { id: 6, name: 'Baggage Scanner (South)', type: 'security' },
  { id: 7, name: 'Unreserved Ticket Counter', type: 'ticket' },
  { id: 8, name: 'Reserved Ticket Counter', type: 'ticket' },
  { id: 9, name: 'General Waiting Hall', type: 'waiting' },
];

router.get('/wait-times', (req, res) => {
  const data = gates.map(g => ({
    ...g,
    waitTime: generateWaitTime(),
    status: Math.random() > 0.2 ? 'open' : 'closed',
  }));
  res.json({ success: true, data, updatedAt: new Date().toISOString() });
});

// ── irctc-connect Train Board for Charlapalli (CHZ) ──────────────────────────
// Directly integrates the irctc-connect package.
// We configure it using the API key from .env.
const { configure, liveAtStation, getTrainInfo } = require('irctc-connect');

const apiKey = process.env.IRCTC_API_KEY;
if (apiKey) {
  configure(apiKey);
} else {
  console.error("❌ Error: IRCTC_API_KEY is not defined in your backend .env file!");
}

router.get('/trains', async (req, res) => {
  const { type = 'arrivals', q = '' } = req.query;

  try {
    // Single call — get all trains at CHZ right now
    const json = await liveAtStation('CHZ');

    // irctc-connect liveAtStation returns { success, data: [...] }
    // Each item: { i, trainno, trainname, source, dest, timeat }
    if (!json.success) throw new Error(json.error || 'liveAtStation failed');

    const raw = Array.isArray(json.data) ? json.data : [];

    // Normalise each train into a consistent shape
    let result = raw.map(t => {
      const timeat = t.timeat || t.time || '—';
      const isArr = t.type === 'A' || !t.type; // irctc-connect marks type 'A'/'D'
      const isEnd = t.dest && (t.dest.toUpperCase().includes('CHZ') || t.dest.toUpperCase().includes('CHARLAPALLI'));
      const isStart = t.source && (t.source.toUpperCase().includes('CHZ') || t.source.toUpperCase().includes('CHARLAPALLI'));

      return {
        number: String(t.trainno || t.number || ''),
        name: t.trainname || t.name || 'Unknown',
        from: t.source || t.from || '—',
        to: t.dest || t.to || '—',
        arrives: (!isStart) ? timeat : '—',
        departs: (!isEnd) ? timeat : '—',
        status: t.status || 'On Time',
        platform: t.platform || t.pf || '—',
        type: t.trainType || t.type_desc || 'EXPRESS',
        coachInfo: {},
        journeyDate: '',
      };
    });

    // Tab filter — arrivals have a real arrival time; departures have a real departure time
    if (type === 'arrivals') {
      result = result.filter(t => t.arrives && t.arrives !== '—');
      result.sort((a, b) => (a.arrives > b.arrives ? 1 : -1));
    } else {
      result = result.filter(t => t.departs && t.departs !== '—');
      result.sort((a, b) => (a.departs > b.departs ? 1 : -1));
    }

    // Search filter — works on number, name, from, to
    if (q) {
      const query = q.toLowerCase().trim();
      result = result.filter(t =>
        t.number.includes(query) ||
        t.name.toLowerCase().includes(query) ||
        t.from.toLowerCase().includes(query) ||
        t.to.toLowerCase().includes(query)
      );
    }

    res.json({
      success: true,
      data: result,
      type,
      source: 'irctc-connect',
      station: 'CHZ – Charlapalli',
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Trains API Error]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch live trains data' });
  }
});

// Proxy train info route
router.get('/train-info', async (req, res) => {
  const { train } = req.query;
  if (!train) {
    return res.status(400).json({ success: false, message: 'Train parameter is required' });
  }
  try {
    const json = await getTrainInfo(train);
    res.json(json);
  } catch (err) {
    console.error('[Train Info API Error]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch train details from IRCTC' });
  }
});

// Locker availability
router.get('/lockers', (req, res) => {
  const sizes = ['M', 'L', 'XL'];
  const data = sizes.map(size => ({
    size,
    available: Math.floor(Math.random() * 10),
    total: 10,
    price6h: size === 'M' ? 60 : size === 'L' ? 90 : 150,
    price24h: size === 'M' ? 120 : size === 'L' ? 170 : 300,
  }));
  res.json({ success: true, data });
});

// Parking availability
router.get('/parking', (req, res) => {
  res.json({
    success: true,
    data: {
      twoWheeler: { available: Math.floor(Math.random() * 50 + 20), total: 100, rate: '₹15 for 2hrs, ₹10/hr after' },
      fourWheeler: { available: Math.floor(Math.random() * 30 + 10), total: 80, rate: '₹20 for 2hrs, ₹10/hr after' },
    }
  });
});

// Sleeping pods
router.get('/pods', (req, res) => {
  res.json({
    success: true,
    data: {
      ladies: { available: Math.floor(Math.random() * 5), total: 8 },
      gents: { available: Math.floor(Math.random() * 5), total: 8 },
    }
  });
});

// Contact / lost found submission
router.post('/lost-found', (req, res) => {
  const { name, contact, description, date, location } = req.body;
  if (!name || !contact || !description) {
    return res.status(400).json({ success: false, message: 'Required fields missing' });
  }
  const ticket = `LF${Date.now().toString().slice(-6)}`;
  res.json({ success: true, ticket, message: 'Your report has been registered. Keep your ticket number for reference.' });
});

router.post('/contact', (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: 'All fields required' });
  }
  res.json({ success: true, message: 'Message received. We will respond within 24 hours.' });
});

// Chatbot proxy
const SARVAM_API_KEY = process.env.SARVAM_API_KEY;
const SARVAM_ENDPOINT = 'https://api.sarvam.ai/v1/chat/completions';
const MODEL = 'sarvam-m';

router.post('/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    const payload = {
      model: MODEL,
      messages: messages,
      max_tokens: 800,
      temperature: 0.7
    };

    const response = await fetch(SARVAM_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': SARVAM_API_KEY
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Sarvam API error ${response.status}: ${err}`);
    }

    const data = await response.json();
    let reply = data?.choices?.[0]?.message?.content?.trim()
      || "I'm sorry, I couldn't process that. Please try again.";

    reply = reply.replace(/<think>[\s\S]*?(?:<\/think>|$)/g, '').trim();

    res.json({ success: true, reply });
  } catch (err) {
    console.error('[Chat API Error]', err);
    res.status(500).json({ success: false, message: 'Chatbot service unavailable.' });
  }
});

module.exports = router;