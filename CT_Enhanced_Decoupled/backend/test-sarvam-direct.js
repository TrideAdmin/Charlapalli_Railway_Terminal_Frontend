const SARVAM_API_KEY  = 'sk_mfn0ypuj_A39Nk3V7vukPkUyqmvKGLJp2';
const SARVAM_ENDPOINT = 'https://api.sarvam.ai/v1/chat/completions';
const MODEL           = 'sarvam-m';

async function test() {
  try {
    const payload = {
      model: MODEL,
      messages: [
        { role: 'system', content: 'You are an AI' },
        { role: 'assistant', content: 'Hi' },
        { role: 'user', content: 'What platforms are available?' }
      ],
      max_tokens: 50,
      temperature: 0.7
    };

    console.log('Sending request to Sarvam...');
    const startTime = Date.now();
    const response = await fetch(SARVAM_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': SARVAM_API_KEY
      },
      body: JSON.stringify(payload)
    });
    
    console.log(`Response received in ${Date.now() - startTime}ms. Status:`, response.status);

    if (!response.ok) {
      const err = await response.text();
      console.log(`Sarvam API error ${response.status}: ${err}`);
    } else {
      const data = await response.json();
      console.log('Success!', data.choices?.[0]?.message?.content);
    }
  } catch (e) {
    console.error('Network/Fetch error:', e);
  }
}

test();
