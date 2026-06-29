/**
 * routingService.js
 * ──────────────────────────────────────────────────────────────────────────
 * Wraps the Google Maps Directions API.
 * Fetches walking routes, decodes polylines, returns structured step objects.
 *
 * If the real API key is missing / quota exceeded, falls back to a straight-
 * line mock route so the rest of the navigation still works.
 * ──────────────────────────────────────────────────────────────────────────
 */

import { decodePolyline, polylineLength } from './geoUtils.js';

/**
 * Resolve the base URL for the backend API.
 * Mirrors the same logic used in navigate.html (window.CT_API_BASE).
 */
const getApiBase = () =>
  window.CT_API_BASE ||
  ((['localhost', '127.0.0.1'].includes(location.hostname) || location.protocol === 'file:')
    ? 'http://localhost:3001/api'
    : 'https://charlapalli-railway-terminal-api.tride.live/api');

/**
 * Fetch a walking route from the Google Maps Directions API.
 *
 * @param {{ lat: number, lng: number }} origin
 * @param {{ lat: number, lng: number }} destination
 * @param {object} [opts]
 * @param {string} [opts.language='en']
 * @returns {Promise<RouteResult>}
 *
 * RouteResult:
 * {
 *   polyline:    [{lat,lng}],   // full route path
 *   steps:       [Step],        // turn-by-turn steps
 *   totalDist:   number,        // metres
 *   totalTime:   number,        // seconds
 *   summary:     string,
 *   source:      'google'|'fallback'
 * }
 *
 * Step:
 * {
 *   instruction: string,        // HTML stripped
 *   distance:    number,        // metres
 *   duration:    number,        // seconds
 *   startLocation: {lat,lng},
 *   endLocation:   {lat,lng},
 *   polyline:    [{lat,lng}],   // this step's sub-polyline
 *   maneuver:    string,        // 'turn-left','turn-right',etc.
 * }
 */
export async function fetchRoute(origin, destination, opts = {}) {
  const url = buildDirectionsUrl(origin, destination, opts);

  try {
    const res  = await fetch(url);
    const json = await res.json();

    if (json.status !== 'OK' || !json.routes?.length) {
      console.warn('[RoutingService] Directions API returned:', json.status, '— using fallback route.');
      return buildFallbackRoute(origin, destination);
    }

    return parseDirectionsResponse(json);
  } catch (err) {
    console.error('[RoutingService] Fetch error:', err);
    return buildFallbackRoute(origin, destination);
  }
}

// ── Internal helpers ──────────────────────────────────────────────────────

function buildDirectionsUrl(origin, dest, opts = {}) {
  // Route through our backend proxy — avoids the CORS restriction that blocks
  // direct browser calls to maps.googleapis.com/maps/api/directions/json.
  const params = new URLSearchParams({
    origin:      `${origin.lat},${origin.lng}`,
    destination: `${dest.lat},${dest.lng}`,
    mode:        'walking',
    language:    opts.language || 'en',
  });
  return `${getApiBase()}/maps/directions?${params}`;
}

function parseDirectionsResponse(json) {
  const route = json.routes[0];
  const leg   = route.legs[0];

  // Full overview polyline
  const polyline = decodePolyline(route.overview_polyline.points);

  // Per-step breakdown
  const steps = leg.steps.map(s => ({
    instruction:   stripHtml(s.html_instructions),
    distance:      s.distance.value,
    duration:      s.duration.value,
    startLocation: s.start_location,
    endLocation:   s.end_location,
    polyline:      decodePolyline(s.polyline.points),
    maneuver:      s.maneuver || 'straight',
  }));

  return {
    polyline,
    steps,
    totalDist: leg.distance.value,
    totalTime: leg.duration.value,
    summary:   route.summary,
    source:    'google',
  };
}

/**
 * Straight-line fallback when API is unavailable.
 * Generates a simple 2-point polyline and a single walk step.
 */
function buildFallbackRoute(origin, dest) {
  const polyline = [
    { lat: origin.lat, lng: origin.lng },
    { lat: dest.lat,   lng: dest.lng   },
  ];
  const dist = polylineLength(polyline);
  return {
    polyline,
    steps: [{
      instruction:   'Walk straight to destination',
      distance:      dist,
      duration:      Math.round(dist / 1.4),
      startLocation: origin,
      endLocation:   dest,
      polyline,
      maneuver:      'straight',
    }],
    totalDist: dist,
    totalTime: Math.round(dist / 1.4),
    summary:   'Direct route',
    source:    'fallback',
  };
}

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
