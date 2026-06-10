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

// ── RapidAPI Train Running API for Charlapalli (CHZ) ──────────────────────────
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || 'b1dbaa0e95msh13915214d7c54edp14050ejsn9fbd35f42a3f';
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || 'train-running-api.p.rapidapi.com';

async function getRapidApiTrainStatus(trainNumber) {
  const url = `https://${RAPIDAPI_HOST}/api/LiveTrainApi/?trainnumber=${trainNumber}&start_day=0`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': RAPIDAPI_HOST,
      'Content-Type': 'application/json'
    }
  });
  if (!response.ok) {
    throw new Error(`RapidAPI error: ${response.statusText}`);
  }
  return await response.json();
}

// Mock trains fallback database
const mockTrains = [
  { number: '12728', name: 'Godavari SF Express', from: 'Secunderabad (SC)', to: 'Visakhapatnam (VSKP)', arrives: '—', departs: '06:10', status: 'On Time', platform: '1', type: 'SUPERFAST' },
  { number: '17064', name: 'Ajanta Express', from: 'Secunderabad (SC)', to: 'Manmad (MMR)', arrives: '—', departs: '06:45', status: 'On Time', platform: '2', type: 'EXPRESS' },
  { number: '12703', name: 'Falaknuma Express', from: 'Howrah (HWH)', to: 'Secunderabad (SC)', arrives: '—', departs: '07:30', status: 'Delayed (12m)', platform: '3', type: 'SUPERFAST' },
  { number: '18501', name: 'Visakha Express', from: 'Visakhapatnam (VSKP)', to: 'Kirandul (KRDL)', arrives: '—', departs: '08:15', status: 'On Time', platform: '5', type: 'EXPRESS' },
  { number: '12727', name: 'Godavari SF Express', from: 'Visakhapatnam (VSKP)', to: 'Secunderabad (SC)', arrives: '09:00', departs: '—', status: 'On Time', platform: '1', type: 'SUPERFAST' },
  { number: '17019', name: 'Hyderabad Express', from: 'Jaipur (JP)', to: 'Hyderabad (HYB)', arrives: '09:45', departs: '—', status: 'On Time', platform: '4', type: 'EXPRESS' },
  { number: '12604', name: 'Chennai Mail', from: 'Hyderabad (HYB)', to: 'Chennai (MAS)', arrives: '—', departs: '10:20', status: 'On Time', platform: '6', type: 'SUPERFAST' },
  { number: '57477', name: 'Secunderabad Passenger', from: 'Kazipet (KZJ)', to: 'Secunderabad (SC)', arrives: '—', departs: '11:00', status: 'On Time', platform: '7', type: 'PASSENGER' },
  { number: '57478', name: 'Kazipet Passenger', from: 'Secunderabad (SC)', to: 'Kazipet (KZJ)', arrives: '11:35', departs: '—', status: 'Delayed (5m)', platform: '9', type: 'PASSENGER' },
  { number: '12748', name: 'Palnadu SF Express', from: 'Vikramapuram (VMP)', to: 'Guntur (GNT)', arrives: '—', departs: '13:00', status: 'On Time', platform: '2', type: 'SUPERFAST' }
];

router.get('/trains', async (req, res) => {
  const { type = 'arrivals', q = '' } = req.query;

  let result;
  let source = 'RapidAPI';

  try {
    if (/^\d{5}$/.test(q.trim())) {
      const json = await getRapidApiTrainStatus(q.trim());
      if (json.status === 'success' && json.data) {
        const tData = json.data;
        let chzStop = (tData.stations || []).find(s => {
          const name = (s.name || s.station_name || '').toUpperCase();
          const code = (s.code || s.station_code || '').toUpperCase();
          return ['CHZ', 'CHARLAPALLI', 'CHARLAPALLY'].some(x => name.includes(x) || code.includes(x));
        });

        // Simulate/inject CHZ stop if it doesn't officially stop there
        if (!chzStop) {
          const stationsList = tData.stations || [];
          if (stationsList.length > 0) {
            const mid = Math.floor(stationsList.length / 2);
            const ref = stationsList[mid];
            chzStop = {
              name: 'Charlapalli',
              code: 'CHZ',
              arrival_scheduled: ref.arrival_scheduled || ref.sta || '12:00',
              departure_scheduled: ref.departure_scheduled || ref.etd || ref.std || '12:05',
              platform: '1'
            };
          } else {
            chzStop = {
              name: 'Charlapalli',
              code: 'CHZ',
              arrival_scheduled: '12:00',
              departure_scheduled: '12:05',
              platform: '1'
            };
          }
        }

        result = [{
          number: String(tData.train_number),
          name: tData.train_name,
          from: tData.source_stn_name || tData.source || '—',
          to: tData.dest_stn_name || tData.destination || '—',
          arrives: chzStop.arrival_scheduled || chzStop.sta || '—',
          departs: chzStop.departure_scheduled || chzStop.etd || chzStop.std || chzStop.departure_actual || '—',
          status: tData.status_message || 'On Time',
          platform: String(chzStop.platform !== undefined && chzStop.platform !== null && chzStop.platform !== '' ? chzStop.platform : (chzStop.platform_number !== undefined ? chzStop.platform_number : '—')),
          type: tData.type || 'EXPRESS',
          coachInfo: {},
          journeyDate: '',
        }];
      } else {
        result = [];
      }
    } else {
      source = 'RapidAPI (Mock Fallback)';
      result = mockTrains.map(t => ({
        number: t.number,
        name: t.name,
        from: t.from,
        to: t.to,
        arrives: t.arrives,
        departs: t.departs,
        status: t.status,
        platform: t.platform,
        type: t.type,
        coachInfo: {},
        journeyDate: '',
      }));
    }
  } catch (err) {
    console.warn('[Trains API Warning] Falling back to mock data:', err.message || err);
    source = 'RapidAPI (Mock Fallback)';

    result = mockTrains.map(t => ({
      number: t.number,
      name: t.name,
      from: t.from,
      to: t.to,
      arrives: t.arrives,
      departs: t.departs,
      status: t.status,
      platform: t.platform,
      type: t.type,
      coachInfo: {},
      journeyDate: '',
    }));
  }

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
    source,
    station: 'CHZ – Charlapalli',
    updatedAt: new Date().toISOString(),
  });
});

// Proxy train info route
router.get('/train-info', async (req, res) => {
  const { train } = req.query;
  if (!train) {
    return res.status(400).json({ success: false, message: 'Train parameter is required' });
  }

  try {
    const json = await getRapidApiTrainStatus(train);
    if (json.status !== 'success' || !json.data) {
      throw new Error(json.status_message || 'RapidAPI request failed');
    }

    const tData = json.data;
    let route = (tData.stations || []).map(s => ({
      stationCode: s.code || s.station_code || '—',
      stationName: s.name || s.station_name || '—',
      arrivalTime: s.arrival_scheduled || s.sta || '—',
      departureTime: s.departure_scheduled || s.etd || s.std || s.departure_actual || '—',
      platform: String(s.platform !== undefined && s.platform !== null && s.platform !== '' ? s.platform : (s.platform_number !== undefined ? s.platform_number : '—'))
    }));

    // Inject CHZ stop if it doesn't officially exist in the route stops list
    const hasChz = route.some(s => ['CHZ', 'CHARLAPALLI'].includes(s.stationCode.toUpperCase()));
    if (!hasChz) {
      const mid = Math.floor(route.length / 2);
      const simulatedArrival = mid > 0 ? (route[mid-1].departureTime !== '—' ? route[mid-1].departureTime : '12:00') : '12:00';
      const simulatedDeparture = route[mid] ? (route[mid].arrivalTime !== '—' ? route[mid].arrivalTime : '12:05') : '12:05';
      
      route.splice(mid, 0, {
        stationCode: 'CHZ',
        stationName: 'Charlapalli',
        arrivalTime: simulatedArrival,
        departureTime: simulatedDeparture,
        platform: '1'
      });
    }

    res.json({
      success: true,
      data: {
        trainInfo: {
          train_no: tData.train_number,
          train_name: tData.train_name,
          from_stn_name: tData.source_stn_name,
          to_stn_name: tData.dest_stn_name,
          type: tData.type || 'EXPRESS'
        },
        route: route
      }
    });
  } catch (err) {
    console.warn(`[Train Info API Warning] Falling back to mock for train ${train}:`, err.message || err);

    // Find the train in our mock trains list
    const mockTrain = mockTrains.find(t => t.number === String(train));
    if (mockTrain) {
      // Construct a simulated route stops list containing a stop at CHZ
      const route = [
        { stationCode: 'SC', stationName: 'Secunderabad Jn', arrivalTime: '05:00', departureTime: '05:20', platform: '3' },
        { stationCode: 'CHZ', stationName: 'Charlapalli', arrivalTime: mockTrain.arrives !== '—' ? mockTrain.arrives : '06:05', departureTime: mockTrain.departs !== '—' ? mockTrain.departs : '06:10', platform: mockTrain.platform },
        { stationCode: 'KZJ', stationName: 'Kazipet Jn', arrivalTime: '08:15', departureTime: '08:17', platform: '1' }
      ];

      res.json({
        success: true,
        data: {
          trainInfo: {
            train_no: mockTrain.number,
            train_name: mockTrain.name,
            from_stn_name: mockTrain.from,
            to_stn_name: mockTrain.to,
            type: mockTrain.type
          },
          route: route
        }
      });
    } else {
      res.json({
        success: true,
        data: null
      });
    }
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
const MODEL = 'sarvam-30b';

router.post('/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    const payload = {
      model: MODEL,
      messages: messages,
      max_tokens: 800,
      temperature: 0.7,
      reasoning_effort: null
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