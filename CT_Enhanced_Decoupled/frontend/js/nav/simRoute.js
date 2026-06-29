/**
 * simRoute.js
 * ──────────────────────────────────────────────────────────────────────────
 * A test walking route from ~200m outside Charlapalli Railway Station
 * toward the main entrance.
 *
 * Use this to test GPS navigation without going outside.
 * Import and pass as simulationRoute to GPSTracker.
 *
 * How to enable:
 *   In liveNavController.js, change:
 *     this._tracker = new GPSTracker({ ... });
 *   to:
 *     import SIM_ROUTE from './simRoute.js';
 *     this._tracker = new GPSTracker({ ..., simulationMode: true, simulationRoute: SIM_ROUTE });
 * ──────────────────────────────────────────────────────────────────────────
 */

/**
 * 15-point walk from 200m north of station → main gate.
 * Charlapalli Railway Station: 17.4116° N, 78.5888° E
 */
const SIM_ROUTE = [
  { lat: 17.41310, lng: 78.58870 }, // Start: ~200m north of station
  { lat: 17.41280, lng: 78.58875 },
  { lat: 17.41250, lng: 78.58878 },
  { lat: 17.41220, lng: 78.58880 },
  { lat: 17.41195, lng: 78.58882 }, // turning onto access road
  { lat: 17.41175, lng: 78.58884 },
  { lat: 17.41160, lng: 78.58884 },
  { lat: 17.41150, lng: 78.58883 },
  { lat: 17.41140, lng: 78.58882 },
  { lat: 17.41132, lng: 78.58882 },
  { lat: 17.41124, lng: 78.58883 },
  { lat: 17.41118, lng: 78.58883 },
  { lat: 17.41112, lng: 78.58883 },
  { lat: 17.41108, lng: 78.58884 },
  { lat: 17.41100, lng: 78.58885 }, // Arrives at main gate (Gate 2A area)
];

export default SIM_ROUTE;
