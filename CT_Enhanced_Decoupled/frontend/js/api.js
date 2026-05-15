/**
 * api.js — Charlapalli Terminal · Frontend API Client
 * ─────────────────────────────────────────────────────
 * Single place to configure the backend URL.
 * Change CT_API_BASE in your HTML <script> tag or .env to point at any backend.
 *
 * Development:  window.CT_API_BASE = 'http://localhost:4000/api'
 * Production:   window.CT_API_BASE = 'https://charlapalli-railway-terminal-api.tride.live/api'
 */

const API_BASE = window.CT_API_BASE || 'https://charlapalli-railway-terminal-api.tride.live/api';

async function apiFetch(path, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(`[API] ${API_BASE}${path}`, err.message);
    throw err;
  }
}

export const api = {
  health:    ()       => apiFetch('/health'),
  waitTimes: ()       => apiFetch('/wait-times'),
  trains:    (params) => apiFetch('/trains' + (params ? '?' + new URLSearchParams(params) : '')),
  lockers:   ()       => apiFetch('/lockers'),
  parking:   ()       => apiFetch('/parking'),
  pods:      ()       => apiFetch('/pods'),
  lostFound: (body)   => apiFetch('/lost-found', { method: 'POST', body: JSON.stringify(body) }),
  contact:   (body)   => apiFetch('/contact',    { method: 'POST', body: JSON.stringify(body) }),
};
