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

// Train schedules (mock)
const trains = [
  { number: '12723', name: 'Telangana Express', from: 'Hyderabad', to: 'New Delhi', arrives: '06:15', departs: '06:30', platform: '1', status: 'On Time' },
  { number: '17643', name: 'Circar Express', from: 'Secunderabad', to: 'Kakinada', arrives: '07:45', departs: '08:00', platform: '3', status: 'On Time' },
  { number: '22693', name: 'Rajdhani Express', from: 'Bangalore', to: 'New Delhi', arrives: '09:20', departs: '09:25', platform: '2', status: 'Delayed 10 min' },
  { number: '12728', name: 'Godavari Express', from: 'Visakhapatnam', to: 'Hyderabad', arrives: '10:05', departs: '10:15', platform: '5', status: 'On Time' },
  { number: '17031', name: 'Mumbai Express', from: 'Hyderabad', to: 'Mumbai', arrives: '11:30', departs: '11:45', platform: '4', status: 'On Time' },
  { number: '57477', name: 'Passenger Special', from: 'Kazipet', to: 'Secunderabad', arrives: '12:00', departs: '12:10', platform: '7', status: 'On Time' },
  { number: '18519', name: 'Visakha Express', from: 'Visakhapatnam', to: 'LTT Mumbai', arrives: '13:50', departs: '14:00', platform: '6', status: 'On Time' },
  { number: '12703', name: 'Falaknuma Express', from: 'Secunderabad', to: 'Chennai', arrives: '15:20', departs: '15:30', platform: '2', status: 'Delayed 5 min' },
];

router.get('/trains', (req, res) => {
  const { type = 'arrivals', q = '' } = req.query;
  let result = trains;
  if (type === 'arrivals') {
    result = trains.filter(t => !['Hyderabad', 'Secunderabad'].includes(t.from));
  } else if (type === 'departures') {
    result = trains.filter(t => !['Hyderabad', 'Secunderabad'].includes(t.to));
  }

  if (q) {
    const query = q.toLowerCase();
    result = result.filter(t =>
      t.number.includes(query) || t.name.toLowerCase().includes(query) ||
      t.from.toLowerCase().includes(query) || t.to.toLowerCase().includes(query)
    );
  }
  res.json({ success: true, data: result, type, updatedAt: new Date().toISOString() });
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
  // In production, save to DB
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
const SARVAM_API_KEY  = process.env.SARVAM_API_KEY;
const SARVAM_ENDPOINT = 'https://api.sarvam.ai/v1/chat/completions';
const MODEL           = 'sarvam-m';

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
    
    // Strip <think> blocks generated by reasoning models
    reply = reply.replace(/<think>[\s\S]*?(?:<\/think>|$)/g, '').trim();

    res.json({ success: true, reply });
  } catch (err) {
    console.error('[Chat API Error]', err);
    res.status(500).json({ success: false, message: 'Chatbot service unavailable.' });
  }
});

module.exports = router;
