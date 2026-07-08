/**
 * gpsTracker.js
 * ──────────────────────────────────────────────────────────────────────────
 * Wraps the browser Geolocation API (watchPosition).
 * Exposes a simple pub/sub interface so the rest of the nav system can
 * subscribe to cleaned GPS updates.
 *
 * Usage:
 *   import GPSTracker from './gpsTracker.js';
 *   const tracker = new GPSTracker({ onUpdate, onError });
 *   tracker.start();
 *   tracker.stop();
 * ──────────────────────────────────────────────────────────────────────────
 */

import { smoothPosition, bearing, haversineDistance } from './geoUtils.js';

export default class GPSTracker {
  /**
   * @param {object} opts
   * @param {function} opts.onUpdate  - called with { lat, lng, accuracy, bearing, speed, raw }
   * @param {function} [opts.onError] - called with Error
   * @param {number}   [opts.smoothingAlpha=0.3]  - EMA alpha (0–1)
   * @param {number}   [opts.minDistanceM=1.5]    - ignore updates < this many metres
   * @param {number}   [opts.maxAccuracyM=50]     - ignore fixes worse than this
   */
  constructor(opts = {}) {
    this._onUpdate       = opts.onUpdate || (() => {});
    this._onError        = opts.onError  || console.warn;
    this._alpha          = opts.smoothingAlpha ?? 0.3;
    this._minDist        = opts.minDistanceM   ?? 1.5;
    this._maxAccuracy    = opts.maxAccuracyM   ?? 50;

    this._watchId        = null;
    this._smoothed       = null; // {lat, lng}
    this._lastEmitted    = null;
    this._prevBearing    = null;
    this._started        = false;
  }

  /**
   * Start watching GPS position.
   */
  start() {
    if (this._started) return;
    this._started = true;

    if (!navigator.geolocation) {
      this._onError(new Error('Geolocation is not supported by this browser.'));
      return;
    }

    this._watchId = navigator.geolocation.watchPosition(
      pos => this._handleRaw(pos),
      err => this._handleGeoError(err),
      {
        enableHighAccuracy: true,
        timeout:            10000,
        maximumAge:         0,
      }
    );
  }

  /**
   * Stop watching.
   */
  stop() {
    this._started = false;
    if (this._watchId !== null) {
      navigator.geolocation.clearWatch(this._watchId);
      this._watchId = null;
    }
  }

  /**
   * Force a manual position update (e.g. from a QR scan or fallback).
   */
  injectPosition(lat, lng, accuracy = 10) {
    this._process({ lat, lng, accuracy });
  }

  /** @private */
  _handleRaw(pos) {
    const { latitude, longitude, accuracy } = pos.coords;

    if (accuracy > this._maxAccuracy) {
      // Poor fix — still smooth but don't jump
      console.debug(`[GPS] Low accuracy fix ignored (${accuracy.toFixed(0)}m)`);
      return;
    }

    this._process({ lat: latitude, lng: longitude, accuracy });
  }

  /** @private */
  _process({ lat, lng, accuracy }) {
    const raw = { lat, lng, accuracy };

    // Smooth
    const smoothed = smoothPosition(this._smoothed, raw, this._alpha);
    this._smoothed  = smoothed;

    // Minimum distance gate — avoids GPS noise while standing still
    if (
      this._lastEmitted &&
      haversineDistance(this._lastEmitted, smoothed) < this._minDist
    ) return;

    // Bearing from previous emitted position
    let hdg = this._prevBearing ?? 0;
    if (this._lastEmitted) {
      hdg = bearing(this._lastEmitted, smoothed);
      this._prevBearing = hdg;
    }

    this._lastEmitted = { ...smoothed };

    this._onUpdate({
      lat:      smoothed.lat,
      lng:      smoothed.lng,
      accuracy,
      bearing:  hdg,
      raw,
    });
  }

  /** @private */
  _handleGeoError(err) {
    const msgs = {
      1: 'Location permission denied. Please allow location access.',
      2: 'Position unavailable. Check GPS signal.',
      3: 'Location request timed out.',
    };
    this._onError(new Error(msgs[err.code] || err.message));
  }

  /** Expose the latest smoothed position */
  get currentPosition() { return this._smoothed; }
}
