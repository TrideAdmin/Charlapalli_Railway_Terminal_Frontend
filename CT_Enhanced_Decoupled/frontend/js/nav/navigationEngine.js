/**
 * navigationEngine.js
 * ──────────────────────────────────────────────────────────────────────────
 * Central navigation state machine.
 * Receives GPS updates → decides if we need to:
 *   • Advance to next step
 *   • Recalculate route (off-route)
 *   • Announce an upcoming turn
 *   • Declare arrival
 *
 * Emits clean events via callbacks so the UI layer stays decoupled.
 * ──────────────────────────────────────────────────────────────────────────
 */

import {
  distanceToPolyline,
  haversineDistance,
  remainingDistance,
  formatDistance,
  estimateETA,
} from './geoUtils.js';
import { fetchRoute } from './routingService.js';

/**
 * Config constants (tuneable).
 */
const CFG = {
  OFF_ROUTE_THRESHOLD_M:   30,    // metres before triggering reroute
  STEP_COMPLETE_M:         18,    // metres from step end to count it done
  ARRIVAL_THRESHOLD_M:     15,    // metres from dest to declare arrival
  ANNOUNCE_TURN_M:         40,    // metres before step end to read next instruction
  REROUTE_COOLDOWN_MS:   8000,    // minimum ms between reroute calls
  WALK_SPEED_MPS:          1.4,   // for ETA
};

export default class NavigationEngine {
  /**
   * @param {object} opts
   * @param {function} opts.onStepChange   - (step, stepIndex, totalSteps) => void
   * @param {function} opts.onReroute      - ({ polyline, steps, totalDist }) => void
   * @param {function} opts.onArrival      - () => void
   * @param {function} opts.onProgress     - ({ distRemaining, eta, stepDistRemaining, offRoute }) => void
   * @param {function} [opts.onAnnounce]   - (text) => void  — voice / toast hint
   * @param {function} [opts.onError]      - (err) => void
   */
  constructor(opts = {}) {
    this._cb = {
      onStepChange : opts.onStepChange  || (() => {}),
      onReroute    : opts.onReroute     || (() => {}),
      onArrival    : opts.onArrival     || (() => {}),
      onProgress   : opts.onProgress   || (() => {}),
      onAnnounce   : opts.onAnnounce   || (() => {}),
      onError      : opts.onError      || console.error,
    };

    // Route state
    this._route          = null;   // full RouteResult from routingService
    this._polyline       = [];     // current remaining polyline (may be trimmed after reroute)
    this._destination    = null;   // {lat, lng, label}
    this._stepIndex      = 0;
    this._arrived        = false;
    this._rerouting      = false;
    this._lastRerouteAt  = 0;
    this._announced      = new Set(); // step indices already announced

    // Exposed so GPSTracker can call this
    this.onGPSUpdate = this.onGPSUpdate.bind(this);
  }

  /**
   * Start navigation to a destination.
   * Called once when the user selects Y and GPS is active.
   *
   * @param {{ lat: number, lng: number }} currentPos
   * @param {{ lat: number, lng: number, label: string }} destination
   */
  async startNavigation(currentPos, destination) {
    this._destination = destination;
    this._stepIndex   = 0;
    this._arrived     = false;
    this._announced.clear();

    await this._fetchAndApplyRoute(currentPos, destination);
  }

  /**
   * Called on every GPS update.
   * @param {{ lat, lng, accuracy, bearing }} gpsUpdate
   */
  async onGPSUpdate(gpsUpdate) {
    if (!this._route || this._arrived) return;

    const pos = { lat: gpsUpdate.lat, lng: gpsUpdate.lng };
    const steps = this._route.steps;

    // ── 1. Arrival check ──────────────────────────────────────────────────
    const distToDest = haversineDistance(pos, this._destination);
    if (distToDest <= CFG.ARRIVAL_THRESHOLD_M) {
      this._arrived = true;
      this._cb.onArrival();
      this._cb.onAnnounce('You have arrived at your destination!');
      return;
    }

    // ── 2. Off-route check ─────────────────────────────────────────────────
    const { dist: distToPath } = distanceToPolyline(pos, this._polyline);

    if (
      distToPath > CFG.OFF_ROUTE_THRESHOLD_M &&
      !this._rerouting &&
      Date.now() - this._lastRerouteAt > CFG.REROUTE_COOLDOWN_MS
    ) {
      this._rerouting = true;
      this._cb.onProgress({ distRemaining: distToDest, eta: estimateETA(distToDest), offRoute: true });
      this._cb.onAnnounce('Recalculating route…');

      await this._fetchAndApplyRoute(pos, this._destination);
      this._rerouting = false;
      this._lastRerouteAt = Date.now();
      return;
    }

    // ── 3. Step advancement ────────────────────────────────────────────────
    if (steps.length && this._stepIndex < steps.length) {
      const step   = steps[this._stepIndex];
      const stepEnd = step.endLocation;
      const distToStepEnd = haversineDistance(pos, stepEnd);

      // Announce upcoming turn
      if (
        distToStepEnd <= CFG.ANNOUNCE_TURN_M &&
        !this._announced.has(this._stepIndex)
      ) {
        this._announced.add(this._stepIndex);
        const nextStep = steps[this._stepIndex + 1];
        if (nextStep) {
          this._cb.onAnnounce(`In ${formatDistance(distToStepEnd)}: ${nextStep.instruction}`);
        }
      }

      // Step complete
      if (distToStepEnd <= CFG.STEP_COMPLETE_M) {
        this._stepIndex = Math.min(this._stepIndex + 1, steps.length - 1);
        this._cb.onStepChange(
          steps[this._stepIndex],
          this._stepIndex,
          steps.length,
        );
      }
    }

    // ── 4. Progress update ────────────────────────────────────────────────
    // Remaining distance = sum of remaining steps
    let distRemaining = 0;
    for (let i = this._stepIndex; i < steps.length; i++) {
      distRemaining += steps[i].distance;
    }
    // add distance from current pos to start of current step end
    const step = steps[this._stepIndex];
    if (step) {
      distRemaining = haversineDistance(pos, this._destination) + 0; // rough
    }

    const eta = estimateETA(distRemaining, CFG.WALK_SPEED_MPS);

    this._cb.onProgress({
      distRemaining,
      distRemainingText: formatDistance(distRemaining),
      eta,
      stepDistRemaining: step ? haversineDistance(pos, step.endLocation) : 0,
      offRoute: distToPath > CFG.OFF_ROUTE_THRESHOLD_M,
      distToPath,
    });
  }

  /**
   * Stop navigation cleanly.
   */
  stop() {
    this._route       = null;
    this._polyline    = [];
    this._destination = null;
    this._arrived     = false;
  }

  /** @private */
  async _fetchAndApplyRoute(origin, destination) {
    try {
      const route = await fetchRoute(origin, destination);
      this._route     = route;
      this._polyline  = route.polyline;
      this._stepIndex = 0;
      this._announced.clear();

      this._cb.onReroute(route);
      if (route.steps.length) {
        this._cb.onStepChange(route.steps[0], 0, route.steps.length);
      }
    } catch (err) {
      this._cb.onError(err);
    }
  }

  /**
   * Start a simulated indoor navigation using a pre-computed lat/lng polyline.
   * Skips the network call to fetchRoute() entirely.
   *
   * @param {Array<{lat,lng}>} polyline  — densified indoor path
   * @param {{ lat, lng, label }} destination
   */
  async startSimulatedNavigation(polyline, destination) {
    this._destination = destination;
    this._stepIndex   = 0;
    this._arrived     = false;
    this._announced.clear();

    // Compute total distance along the polyline
    let totalDist = 0;
    for (let i = 0; i < polyline.length - 1; i++) {
      totalDist += haversineDistance(polyline[i], polyline[i + 1]);
    }

    const syntheticStep = {
      instruction:   `Follow the path to ${destination.label}`,
      distance:      totalDist,
      duration:      totalDist / CFG.WALK_SPEED_MPS,
      startLocation: polyline[0],
      endLocation:   destination,
      polyline,
      maneuver:      'straight',
    };

    this._route = {
      polyline,
      steps:     [syntheticStep],
      totalDist,
      totalTime: totalDist / CFG.WALK_SPEED_MPS,
      summary:   'Indoor route',
      source:    'indoor',
    };
    this._polyline = polyline;

    this._cb.onReroute(this._route);
    this._cb.onStepChange(syntheticStep, 0, 1);
  }


  // ── Getters ──────────────────────────────────────────────────────────────
  get currentStep()    { return this._route?.steps[this._stepIndex]; }
  get stepIndex()      { return this._stepIndex; }
  get totalSteps()     { return this._route?.steps.length ?? 0; }
  get hasRoute()       { return !!this._route; }
  get arrived()        { return this._arrived; }
  get route()          { return this._route; }
}
