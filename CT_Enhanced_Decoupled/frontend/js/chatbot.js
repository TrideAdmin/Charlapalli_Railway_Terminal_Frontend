/**
 * ============================================================
 *  CHARLAPALLI RAILWAY — FUTURISTIC AI ASSISTANT
 *  File: frontend/js/chatbot.js
 *  Drop this file in: frontend/js/chatbot.js
 * ============================================================
 *
 *  SETUP:
 *    1. Replace SARVAM_API_KEY below with your real Sarvam key.
 *    2. In every HTML page (index.html, pages/*.html), add
 *       BEFORE the closing </body>:
 *
 *         <script src="/js/chatbot.js"></script>
 *
 *       layout.js already runs first, so this is safe anywhere
 *       after the layout script.
 *
 *  SARVAM API USED:  POST https://api.sarvam.ai/v1/chat/completions
 *  MODEL:            sarvam-m
 * ============================================================
 */

(function () {
  'use strict';

  /* ── CONFIG ──────────────────────────────────────────── */
  const API_ENDPOINT = (window.CT_API_BASE || 'https://charlapalli-railway-terminal-api.tride.live/api') + '/chat';
  const TRAINS_ENDPOINT = (window.CT_API_BASE || 'https://charlapalli-railway-terminal-api.tride.live/api') + '/trains';

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

  const WELCOME_MSG = "Hi! I'm ARIA, your AI guide for Charlapalli Terminal. How can I assist you today?";

  /* ── STATE ───────────────────────────────────────────── */
  let isOpen = false;
  let isTyping = false;
  let hasGreeted = false;
  const history = [];          // [{role, content}]
  let dynamicSystemPrompt = SYSTEM_PROMPT;

  /* ── DOM INJECTION ───────────────────────────────────── */
  function injectHTML() {
    const el = document.createElement('div');
    el.id = 'ct-chatbot-root';
    el.innerHTML = /* html */ `

      <!-- ── FLOATING AVATAR BUTTON ── -->
      <button id="ct-avatar-btn" aria-label="Open AI Assistant" title="Chat with ARIA">
        <div class="ct-avatar-ring"></div>
        <div class="ct-avatar-core">
          <svg class="ct-avatar-face" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Hair Buns -->
            <circle cx="8" cy="28" r="7" fill="url(#ct-head-grad)" />
            <circle cx="48" cy="28" r="7" fill="url(#ct-head-grad)" />
            <circle cx="8" cy="28" r="3.5" fill="#e05a1a" />
            <circle cx="48" cy="28" r="3.5" fill="#e05a1a" />
            
            <!-- Head -->
            <circle cx="28" cy="28" r="22" fill="url(#ct-head-grad)" />
            
            <!-- Hair bangs / swoop overlay -->
            <path d="M 10 22 C 14 10, 42 10, 46 22 C 38 14, 18 14, 10 22 Z" fill="#e05a1a" />
            
            <!-- Visor -->
            <rect x="14" y="20" width="28" height="11" rx="5.5" fill="url(#ct-visor-grad)" opacity="0.95"/>
            <!-- Eyes glow -->
            <ellipse cx="22" cy="25.5" rx="3.5" ry="3" fill="#ff8534" class="ct-eye-l"/>
            <ellipse cx="34" cy="25.5" rx="3.5" ry="3" fill="#ff8534" class="ct-eye-r"/>
            <!-- Mouth bar -->
            <rect x="19" y="34" width="18" height="3" rx="1.5" fill="url(#ct-mouth-grad)" class="ct-mouth"/>
            <!-- Wave hand (hidden at rest, shown on wave anim) -->
            <g class="ct-wave-hand">
              <rect x="42" y="20" width="6" height="14" rx="3" fill="#ff8534" transform="rotate(-15 45 27)"/>
            </g>
            <defs>
              <linearGradient id="ct-head-grad" x1="6" y1="6" x2="50" y2="50" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#1a2e4a"/>
                <stop offset="100%" stop-color="#0a1628"/>
              </linearGradient>
              <linearGradient id="ct-visor-grad" x1="14" y1="20" x2="42" y2="31" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#1e3a5f"/>
                <stop offset="100%" stop-color="#0d2240"/>
              </linearGradient>
              <linearGradient id="ct-mouth-grad" x1="19" y1="35" x2="37" y2="35" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#e05a1a"/>
                <stop offset="50%" stop-color="#ff8534"/>
                <stop offset="100%" stop-color="#e05a1a"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        <span class="ct-badge">ARIA</span>
        <span class="ct-pulse-ring"></span>
      </button>

      <!-- ── CHAT WINDOW ── -->
      <div id="ct-chat-window" aria-hidden="true">
        <div class="ct-chat-header">
          <div class="ct-header-avatar">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="6" cy="20" r="5" fill="#0d1a2e"/>
              <circle cx="34" cy="20" r="5" fill="#0d1a2e"/>
              <circle cx="6" cy="20" r="2.5" fill="#e05a1a"/>
              <circle cx="34" cy="20" r="2.5" fill="#e05a1a"/>
              <circle cx="20" cy="20" r="16" fill="#0d1a2e"/>
              <path d="M 8 16 C 12 6, 28 6, 32 16 C 26 10, 14 10, 8 16 Z" fill="#e05a1a" />
              <rect x="9" y="14" width="22" height="8" rx="4" fill="#1a3a5c"/>
              <ellipse cx="15" cy="17.5" rx="2.5" ry="2" fill="#ff8534"/>
              <ellipse cx="25" cy="17.5" rx="2.5" ry="2" fill="#ff8534"/>
              <rect x="14" y="24" width="12" height="2" rx="1" fill="#e05a1a"/>
            </svg>
          </div>
          <div class="ct-header-info">
            <span class="ct-header-name">ARIA</span>
            <span class="ct-header-sub">
              <span class="ct-status-dot"></span> AI Railway Assistant
            </span>
          </div>
          <button class="ct-close-btn" aria-label="Close chat">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
              stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div class="ct-messages" id="ct-messages"></div>

        <div class="ct-quick-chips" id="ct-chips">
          <button class="ct-chip" data-q="What platforms are available?">Platforms</button>
          <button class="ct-chip" data-q="Tell me about waiting hall charges">Waiting Halls</button>
          <button class="ct-chip" data-q="How do I find my train?">Find Train</button>
          <button class="ct-chip" data-q="Is there free Wi-Fi?">Wi-Fi</button>
          <button class="ct-chip" data-q="Locker prices and sizes">Lockers</button>
        </div>

        <div class="ct-input-row">
          <input id="ct-input" type="text" placeholder="Ask about trains, facilities…" autocomplete="off" maxlength="300"/>
          <button id="ct-send-btn" aria-label="Send">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(el);
  }

  /* ── INJECT CSS ──────────────────────────────────────── */
  function injectCSS() {
    const style = document.createElement('style');
    style.textContent = /* css */ `
      /* ── ROOT ── */
      #ct-chatbot-root {
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        z-index: 9999;
        font-family: 'Inter', -apple-system, sans-serif;
      }

      /* ── AVATAR BUTTON ── */
      #ct-avatar-btn {
        position: relative;
        width: 130px;
        height: 130px;
        border-radius: 50%;
        border: none;
        background: transparent;
        cursor: pointer;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        outline: none;
        animation: ct-float 3.5s ease-in-out infinite;
        filter: drop-shadow(0 8px 24px rgba(224,90,26,0.35));
        transition: filter 0.3s ease;
      }
      #ct-avatar-btn:hover {
        filter: drop-shadow(0 8px 32px rgba(224,90,26,0.6));
        animation: ct-float 3.5s ease-in-out infinite, ct-hover-scale 0.3s forwards;
      }

      .ct-avatar-ring {
        position: absolute;
        inset: -4px;
        border-radius: 50%;
        border: 2px solid rgba(224,90,26,0.5);
        animation: ct-ring-spin 4s linear infinite;
        background: conic-gradient(from 0deg, #e05a1a 0%, transparent 60%, #e05a1a 100%);
        -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 2px), black calc(100% - 2px));
        mask: radial-gradient(farthest-side, transparent calc(100% - 2px), black calc(100% - 2px));
      }

      .ct-avatar-core {
        width: 64px;
        height: 64px;
        background: linear-gradient(135deg, #1a2e4a, #0a1628);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        z-index: 2;
        border: 1.5px solid rgba(224,90,26,0.4);
      }

      .ct-avatar-face {
        width: 50px;
        height: 50px;
      }

      /* Eye idle blink */
      .ct-eye-l, .ct-eye-r {
        animation: ct-blink 4s ease-in-out infinite;
      }
      .ct-eye-r { animation-delay: 0.1s; }

      /* Mouth synth-speak (toggled by JS class) */
      .ct-mouth { transform-origin: center; }
      #ct-chatbot-root.ct-speaking .ct-mouth {
        animation: ct-lip-sync 0.18s ease-in-out infinite alternate;
      }

      /* Wave hand on load */
      .ct-wave-hand {
        transform-origin: 45px 30px;
        opacity: 0;
      }
      #ct-chatbot-root.ct-waving .ct-wave-hand {
        opacity: 1;
        animation: ct-wave 1s ease-in-out 3;
      }

      .ct-badge {
        position: absolute;
        bottom: -8px;
        left: 50%;
        transform: translateX(-50%);
        background: #e05a1a;
        color: #fff;
        font-size: 0.55rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        padding: 2px 7px;
        border-radius: 20px;
        z-index: 3;
        white-space: nowrap;
      }

      .ct-pulse-ring {
        position: absolute;
        inset: 0;
        border-radius: 50%;
        border: 2px solid rgba(224,90,26,0.6);
        animation: ct-pulse 2.5s ease-out infinite;
        pointer-events: none;
      }

      /* ── CHAT WINDOW ── */
      #ct-chat-window {
        position: absolute;
        bottom: 90px;
        right: 0;
        width: 400px;
        max-height: 580px;
        display: flex;
        flex-direction: column;
        border-radius: 20px;
        overflow: hidden;
        background: rgba(10, 22, 40, 0.82);
        backdrop-filter: blur(24px) saturate(180%);
        -webkit-backdrop-filter: blur(24px) saturate(180%);
        border: 1px solid rgba(224, 90, 26, 0.25);
        box-shadow:
          0 32px 80px rgba(0,0,0,0.5),
          0 0 0 1px rgba(255,255,255,0.04),
          inset 0 1px 0 rgba(255,255,255,0.08);
        transform: scale(0.85) translateY(16px);
        opacity: 0;
        pointer-events: none;
        transform-origin: bottom right;
        transition: transform 0.32s cubic-bezier(0.34,1.56,0.64,1),
                    opacity   0.22s ease;
      }
      #ct-chat-window.ct-open {
        transform: scale(1) translateY(0);
        opacity: 1;
        pointer-events: all;
      }

      /* header */
      .ct-chat-header {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 14px 16px 12px;
        background: linear-gradient(135deg, rgba(26,46,74,0.95), rgba(10,22,40,0.98));
        border-bottom: 1px solid rgba(224,90,26,0.18);
        flex-shrink: 0;
      }
      .ct-header-avatar {
        width: 38px; height: 38px; flex-shrink: 0;
        border-radius: 50%;
        border: 1.5px solid rgba(224,90,26,0.5);
        overflow: hidden;
        box-shadow: 0 0 12px rgba(224,90,26,0.3);
      }
      .ct-header-avatar svg { width: 100%; height: 100%; }
      .ct-header-info { flex: 1; min-width: 0; }
      .ct-header-name { display: block; color: #fff; font-size: 0.88rem; font-weight: 700; letter-spacing: 0.04em; }
      .ct-header-sub  { display: flex; align-items: center; gap: 5px; color: rgba(255,255,255,0.55); font-size: 0.72rem; }
      .ct-status-dot  { width: 6px; height: 6px; background: #10b981; border-radius: 50%;
        box-shadow: 0 0 6px #10b981; animation: ct-status-blink 2s ease-in-out infinite; }
      .ct-close-btn {
        background: rgba(255,255,255,0.07); border: none; color: rgba(255,255,255,0.6);
        width: 30px; height: 30px; border-radius: 50%; cursor: pointer; display: flex;
        align-items: center; justify-content: center; transition: background 0.2s, color 0.2s;
        flex-shrink: 0;
      }
      .ct-close-btn:hover { background: rgba(224,90,26,0.3); color: #fff; }

      /* messages */
      .ct-messages {
        flex: 1;
        overflow-y: auto;
        padding: 14px 14px 8px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        scroll-behavior: smooth;
      }
      .ct-messages::-webkit-scrollbar { width: 4px; }
      .ct-messages::-webkit-scrollbar-track { background: transparent; }
      .ct-messages::-webkit-scrollbar-thumb { background: rgba(224,90,26,0.35); border-radius: 4px; }

      /* bubbles */
      .ct-msg {
        max-width: 88%;
        padding: 9px 13px;
        border-radius: 14px;
        font-size: 0.83rem;
        line-height: 1.5;
        word-break: break-word;
        animation: ct-msg-in 0.25s cubic-bezier(0.34,1.56,0.64,1) both;
      }
      .ct-msg-bot {
        align-self: flex-start;
        background: rgba(255,255,255,0.07);
        border: 1px solid rgba(224,90,26,0.18);
        color: rgba(255,255,255,0.9);
        border-bottom-left-radius: 4px;
      }
      .ct-msg-user {
        align-self: flex-end;
        background: linear-gradient(135deg, #e05a1a, #c94d10);
        color: #fff;
        border-bottom-right-radius: 4px;
        box-shadow: 0 4px 12px rgba(224,90,26,0.35);
      }

      /* typing indicator */
      .ct-typing-dots {
        display: flex;
        gap: 4px;
        padding: 4px 2px;
      }
      .ct-typing-dots span {
        width: 6px; height: 6px;
        background: rgba(224,90,26,0.7);
        border-radius: 50%;
        animation: ct-dot-bounce 1.2s ease-in-out infinite;
      }
      .ct-typing-dots span:nth-child(2) { animation-delay: 0.2s; }
      .ct-typing-dots span:nth-child(3) { animation-delay: 0.4s; }

      /* quick chips */
      .ct-quick-chips {
        padding: 6px 12px 8px;
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        flex-shrink: 0;
        border-top: 1px solid rgba(255,255,255,0.05);
      }
      .ct-chip {
        background: rgba(224,90,26,0.1);
        border: 1px solid rgba(224,90,26,0.3);
        color: rgba(255,255,255,0.75);
        font-size: 0.72rem;
        padding: 4px 10px;
        border-radius: 20px;
        cursor: pointer;
        transition: background 0.2s, border-color 0.2s, color 0.2s;
        white-space: nowrap;
      }
      .ct-chip:hover { background: rgba(224,90,26,0.25); border-color: #e05a1a; color: #fff; }

      /* input row */
      .ct-input-row {
        display: flex;
        gap: 8px;
        padding: 10px 12px 14px;
        flex-shrink: 0;
        border-top: 1px solid rgba(255,255,255,0.06);
        background: rgba(10,22,40,0.5);
      }
      #ct-input {
        flex: 1;
        background: rgba(255,255,255,0.07);
        border: 1px solid rgba(224,90,26,0.2);
        border-radius: 12px;
        color: #fff;
        font-size: 0.82rem;
        padding: 9px 13px;
        outline: none;
        transition: border-color 0.2s, box-shadow 0.2s;
        font-family: inherit;
      }
      #ct-input::placeholder { color: rgba(255,255,255,0.35); }
      #ct-input:focus { border-color: rgba(224,90,26,0.6); box-shadow: 0 0 0 3px rgba(224,90,26,0.12); }
      #ct-send-btn {
        width: 38px; height: 38px;
        background: linear-gradient(135deg, #e05a1a, #c94d10);
        border: none; border-radius: 12px; color: #fff;
        cursor: pointer; display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
        box-shadow: 0 4px 12px rgba(224,90,26,0.4);
        transition: transform 0.15s, box-shadow 0.15s;
      }
      #ct-send-btn:hover  { transform: scale(1.06); box-shadow: 0 6px 18px rgba(224,90,26,0.55); }
      #ct-send-btn:active { transform: scale(0.96); }
      #ct-send-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

      /* ── KEYFRAMES ── */
      @keyframes ct-float {
        0%, 100% { transform: translateY(0); }
        50%       { transform: translateY(-7px); }
      }
      @keyframes ct-hover-scale {
        to { transform: scale(1.08) translateY(-7px); }
      }
      @keyframes ct-ring-spin {
        to { transform: rotate(360deg); }
      }
      @keyframes ct-pulse {
        0%   { transform: scale(1); opacity: 0.7; }
        100% { transform: scale(1.55); opacity: 0; }
      }
      @keyframes ct-blink {
        0%, 90%, 100% { transform: scaleY(1); }
        95% { transform: scaleY(0.1); }
      }
      @keyframes ct-lip-sync {
        from { transform: scaleY(0.5); }
        to   { transform: scaleY(1.6); }
      }
      @keyframes ct-wave {
        0%   { transform: rotate(0deg); }
        25%  { transform: rotate(25deg); }
        75%  { transform: rotate(-10deg); }
        100% { transform: rotate(0deg); }
      }
      @keyframes ct-dot-bounce {
        0%, 80%, 100% { transform: translateY(0); }
        40%           { transform: translateY(-6px); }
      }
      @keyframes ct-msg-in {
        from { opacity: 0; transform: translateY(8px) scale(0.97); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes ct-status-blink {
        0%, 100% { opacity: 1; }
        50%      { opacity: 0.4; }
      }

      /* ── RESPONSIVE ── */
      @media (max-width: 480px) {
        #ct-chat-window { width: calc(100vw - 3rem); right: -0.5rem; }
        #ct-chatbot-root { bottom: 1.25rem; right: 1.25rem; }
      }
    `;
    document.head.appendChild(style);
  }

  /* ── API CALL ─────────────────────────────────── */
  async function callSarvam(userMessage) {
    history.push({ role: 'user', content: userMessage });

    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: dynamicSystemPrompt },
          ...history
        ]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`API error ${response.status}: ${err}`);
    }

    const data = await response.json();
    const reply = data.reply || "I'm sorry, I couldn't process that. Please try again.";

    history.push({ role: 'assistant', content: reply });
    return reply;
  }

  /* ── CHAT UI HELPERS ─────────────────────────────────── */
  const root = () => document.getElementById('ct-chatbot-root');
  const msgsList = () => document.getElementById('ct-messages');

  function addMessage(text, role /* 'bot' | 'user' */) {
    const div = document.createElement('div');
    div.className = `ct-msg ct-msg-${role}`;
    div.textContent = text;
    msgsList().appendChild(div);
    msgsList().scrollTop = msgsList().scrollHeight;
    return div;
  }

  function showTyping() {
    const div = document.createElement('div');
    div.className = 'ct-msg ct-msg-bot';
    div.id = 'ct-typing-indicator';
    div.innerHTML = '<div class="ct-typing-dots"><span></span><span></span><span></span></div>';
    msgsList().appendChild(div);
    msgsList().scrollTop = msgsList().scrollHeight;
  }

  function hideTyping() {
    const el = document.getElementById('ct-typing-indicator');
    if (el) el.remove();
  }

  function setSpeaking(on) {
    if (on) root().classList.add('ct-speaking');
    else root().classList.remove('ct-speaking');
  }

  /* crude speaking duration estimate (100 chars ≈ 1s) */
  function speakFor(text) {
    const ms = Math.min(Math.max(text.length * 10, 800), 4000);
    setSpeaking(true);
    setTimeout(() => setSpeaking(false), ms);
  }

  /* ── SEND LOGIC ──────────────────────────────────────── */
  async function sendMessage(text) {
    text = (text || '').trim();
    if (!text || isTyping) return;

    isTyping = true;
    document.getElementById('ct-send-btn').disabled = true;
    document.getElementById('ct-input').value = '';

    // Hide chips after first real interaction
    const chips = document.getElementById('ct-chips');
    if (chips) chips.style.display = 'none';

    addMessage(text, 'user');
    showTyping();

    try {
      const reply = await callSarvam(text);
      hideTyping();
      addMessage(reply, 'bot');
      speakFor(reply);
    } catch (e) {
      hideTyping();
      console.error('[ARIA]', e);
      addMessage("Sorry, I'm having trouble connecting right now. Please try again shortly.", 'bot');
    } finally {
      isTyping = false;
      document.getElementById('ct-send-btn').disabled = false;
      document.getElementById('ct-input').focus();
    }
  }

  /* ── OPEN / CLOSE ────────────────────────────────────── */
  function openChat() {
    isOpen = true;
    const win = document.getElementById('ct-chat-window');
    win.classList.add('ct-open');
    win.setAttribute('aria-hidden', 'false');
    document.getElementById('ct-input').focus();

    if (!hasGreeted) {
      hasGreeted = true;
      setTimeout(() => {
        addMessage(WELCOME_MSG, 'bot');
        speakFor(WELCOME_MSG);
      }, 300);
    }
  }

  function closeChat() {
    isOpen = false;
    const win = document.getElementById('ct-chat-window');
    win.classList.remove('ct-open');
    win.setAttribute('aria-hidden', 'true');
  }

  /* ── CONTEXT FETCH ───────────────────────────────────── */
  async function fetchTrainsContext() {
    try {
      const res = await fetch(TRAINS_ENDPOINT);
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.data && data.data.length > 0) {
        let trainText = '\\n\\nCurrent Train Schedule:\\n';
        data.data.forEach(t => {
          trainText += `- ${t.number} ${t.name} (from ${t.from} to ${t.to}) | Arr: ${t.arrives}, Dep: ${t.departs} | PF: ${t.platform} | Status: ${t.status}\\n`;
        });
        dynamicSystemPrompt = SYSTEM_PROMPT + trainText;
      }
    } catch (err) {
      console.error('[ARIA] Failed to fetch trains context', err);
    }
  }

  /* ── BOOT ────────────────────────────────────────────── */
  function init() {
    fetchTrainsContext();
    injectCSS();
    injectHTML();

    /* Waving greeting on page load */
    setTimeout(() => {
      root().classList.add('ct-waving');
      setTimeout(() => root().classList.remove('ct-waving'), 3500);
    }, 1200);

    /* Events */
    document.getElementById('ct-avatar-btn').addEventListener('click', () => {
      isOpen ? closeChat() : openChat();
    });
    document.querySelector('.ct-close-btn').addEventListener('click', closeChat);

    document.getElementById('ct-send-btn').addEventListener('click', () => {
      sendMessage(document.getElementById('ct-input').value);
    });
    document.getElementById('ct-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(document.getElementById('ct-input').value);
      }
    });

    /* Quick chips */
    document.querySelectorAll('.ct-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        if (!isOpen) openChat();
        setTimeout(() => sendMessage(chip.dataset.q), 250);
      });
    });
  }

  /* run after DOM is ready */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
