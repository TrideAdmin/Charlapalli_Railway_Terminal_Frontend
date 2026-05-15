async function testLocalChat() {
  const SYSTEM_PROMPT = `You are ARIA (AI Railway Intelligence Assistant), the official AI guide for Charlapalli Railway Terminal, Hyderabad — a modern South Central Railway station.
You help passengers with:
- Train arrivals, departures, platform info
- Facilities: AC waiting halls (₹40/hr standard, ₹60/hr recliner), smart lockers (₹60/6h), sleeping pods, food court
- Accessibility: 5 lifts, 5 escalators, Divyangjan services
- Navigation: 9 platforms, 11 entry gates, FOBs
- Safety: 24/7 CCTV, RPF, X-ray scanners
- Transport: TSRTC buses, prepaid autos/taxis, parking
- Free Wi-Fi, mobile charging, LED info boards

Reply in 1-3 short sentences. Be precise, warm and futuristic. Always call the station "Charlapalli Terminal".`;

  try {
    const response = await fetch('http://localhost:3001/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: 'What platforms are available?' }
        ]
      })
    });
    console.log('Status:', response.status);
    const text = await response.text();
    console.log('Body:', text);
  } catch (err) {
    console.error('Error:', err);
  }
}
testLocalChat();
