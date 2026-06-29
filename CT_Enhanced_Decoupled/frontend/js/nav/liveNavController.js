/**
 * liveNavController.js
 * ──────────────────────────────────────────────────────────────────────────
 * THE MAIN COORDINATOR for the GPS navigation upgrade.
 *
 * This file is the ONLY one you import into navigate.html.
 * It wires together:
 *   GPSTracker → NavigationEngine → MapRenderer + Announcer → DOM UI
 *
 * It deliberately avoids modifying the existing station canvas / route SVG
 * so the indoor-map view still works.
 *
 * TWO MODES:
 *  A) INDOOR MODE  — user is inside the station (no GPS needed).
 *                    Existing canvas + SVG route still works exactly as before.
 *  B) OUTDOOR MODE — user is outside/approaching the station.
 *                    Google Maps live navigation panel appears.
 *
 * Usage: This file is loaded as a module by navigate.html via
 *   <script type="module" src="/js/nav/liveNavController.js"></script>
 * ──────────────────────────────────────────────────────────────────────────
 */

import GPSTracker       from './gpsTracker.js';
import NavigationEngine from './navigationEngine.js';
import MapRenderer      from './mapRenderer.js';
import Announcer        from './announcer.js';
import { formatDistance, estimateETA } from './geoUtils.js';
import SIM_ROUTE        from './simRoute.js';

// ── Station coords (centre of Charlapalli Terminal) ───────────────────────
const STATION = { lat: 17.4116, lng: 78.5888 };

// ── Google Maps API key (set in navigate.html before this script loads) ───
// window.GOOGLE_MAPS_API_KEY = 'YOUR_KEY_HERE';

// ─────────────────────────────────────────────────────────────────────────
class LiveNavController {
  constructor() {
    this._tracker  = null;
    this._engine   = null;
    this._renderer = null;
    this._announcer = new Announcer({ voice: true, lang: 'en-IN' });

    this._mode      = 'indoor'; // 'indoor' | 'outdoor'
    this._dest      = null;     // {lat, lng, label}
    this._active    = false;

    // DOM refs (created by _buildUI)
    this._panel     = null;
    this._mapDiv    = null;
    this._etaEl     = null;
    this._distEl    = null;
    this._stepEl    = null;
    this._stepBar   = null;
    this._startBtn  = null;
    this._stopBtn   = null;
    this._modeToggle = null;

    this._injectStyles();
    this._buildUI();
    this._bindExistingSelect();
  }

  // ── PUBLIC API ────────────────────────────────────────────────────────────

  /**
   * Set the destination (lat/lng) for outdoor GPS navigation.
   * Called programmatically, e.g. from navigate.html when user selects a dest.
   */
  setDestination(lat, lng, label = 'Destination') {
    this._dest = { lat, lng, label };
    if (this._destLabelEl) this._destLabelEl.textContent = label;
    if (this._startBtn)    this._startBtn.disabled = false;
  }

  /**
   * Begin live GPS navigation.
   */
  startNavigation() {
    if (this._active) return;
    if (!this._dest)  { alert('Please select a destination first.'); return; }

    this._active = true;
    this._panel.classList.add('lnc--active');
    this._startBtn.style.display = 'none';
    this._stopBtn.style.display  = 'flex';
    this._announcer.announce('Navigation started. Acquiring GPS signal…', 'info');

    // Initialise engine
    this._engine = new NavigationEngine({
      onStepChange: (step, idx, total) => this._onStepChange(step, idx, total),
      onReroute:    (route)            => this._onReroute(route),
      onArrival:    ()                 => this._onArrival(),
      onProgress:   (p)               => this._onProgress(p),
      onAnnounce:   (txt)             => this._announcer.announce(txt, 'info'),
      onError:      (err)             => this._announcer.announce(err.message, 'warn'),
    });

    // Initialise GPS tracker
    this._tracker = new GPSTracker({
      onUpdate: async gps => {
        // First fix → init engine + map
        if (!this._renderer && window.google?.maps) {
          this._initMap({ lat: gps.lat, lng: gps.lng });
          await this._engine.startNavigation(
            { lat: gps.lat, lng: gps.lng },
            this._dest,
          );
        } else if (this._renderer) {
          this._renderer.updateUserPosition({ lat: gps.lat, lng: gps.lng }, gps.bearing);
          this._engine.onGPSUpdate(gps);
        }
      },
      onError: err => {
        this._announcer.announce(err.message, 'warn');
        this._setStep('⚠ ' + err.message);
      },
      smoothingAlpha: 0.3,
      minDistanceM:   2,
      maxAccuracyM:   60,
    });

    this._tracker.start();
  }

  /**
   * Start navigation in simulation mode (dev/testing only).
   */
  startSimulation() {
    if (this._active) return;
    if (!this._dest)  { alert('Please select a destination on the map first.'); return; }

    this._active = true;
    this._panel.classList.add('lnc--active');
    this._startBtn.style.display = 'none';
    this._stopBtn.style.display  = 'flex';
    if (this._simBtn) this._simBtn.style.display = 'none';
    this._announcer.announce('Simulation mode started.', 'info');

    this._engine = new NavigationEngine({
      onStepChange: (step, idx, total) => this._onStepChange(step, idx, total),
      onReroute:    (route)            => this._onReroute(route),
      onArrival:    ()                 => this._onArrival(),
      onProgress:   (p)               => this._onProgress(p),
      onAnnounce:   (txt)             => this._announcer.announce(txt, 'info'),
      onError:      (err)             => this._announcer.announce(err.message, 'warn'),
    });

    this._tracker = new GPSTracker({
      onUpdate: async gps => {
        if (!this._renderer && window.google?.maps) {
          this._initMap({ lat: gps.lat, lng: gps.lng });
          await this._engine.startNavigation({ lat: gps.lat, lng: gps.lng }, this._dest);
        } else if (this._renderer) {
          this._renderer.updateUserPosition({ lat: gps.lat, lng: gps.lng }, gps.bearing);
          this._engine.onGPSUpdate(gps);
        }
      },
      onError: err => this._announcer.announce(err.message, 'warn'),
      simulationMode:  true,
      simulationRoute: SIM_ROUTE,
    });

    // Show mode bar and switch to outdoor view
    const modeBar = document.getElementById('lnc-mode-bar');
    if (modeBar) modeBar.style.display = 'flex';
    this.setMode('outdoor');
    this._tracker.start();
  }

  /**
   * Stop navigation.
   */
  stopNavigation() {
    this._active = false;
    this._tracker?.stop();
    this._engine?.stop();
    this._renderer?.clear();
    this._panel.classList.remove('lnc--active');
    this._startBtn.style.display = 'flex';
    this._stopBtn.style.display  = 'none';
    if (this._simBtn) this._simBtn.style.display = 'flex';
    this._setStep('Navigation stopped.');
    this._setETA('--', '--');
    // Hide mode bar unless indoor route is active
    const rr = document.getElementById('route-result');
    const modeBar = document.getElementById('lnc-mode-bar');
    if (modeBar && rr && !rr.classList.contains('show')) {
      modeBar.style.display = 'none';
    }
  }

  // ── CALLBACKS FROM ENGINE ─────────────────────────────────────────────────

  _onStepChange(step, idx, total) {
    if (!step) return;
    const icon = this._maneuverIcon(step.maneuver);
    this._setStep(`${icon} ${step.instruction}`);
    this._announcer.announce(step.instruction, 'info');

    // Step progress bar
    if (this._stepBar) {
      this._stepBar.style.width = `${Math.round(((idx + 1) / total) * 100)}%`;
    }
    if (this._stepNumEl) {
      this._stepNumEl.textContent = `Step ${idx + 1} / ${total}`;
    }
  }

  _onReroute(route) {
    this._announcer.announce('Route updated.', 'info');
    if (this._renderer) {
      this._renderer.drawRoute(route.polyline, 0);
      this._renderer.setDestinationMarker(this._dest, this._dest.label);
    }
  }

  _onArrival() {
    this._announcer.announce('You have arrived!', 'success');
    this._setStep('✅ You have arrived at ' + this._dest.label + '!');
    this._setETA('Arrived', '0 m');
    this._renderer?.following && (this._renderer.following = false);
  }

  _onProgress({ distRemainingText, eta, offRoute }) {
    this._setETA(eta, distRemainingText);
    if (offRoute && this._offRouteEl) {
      this._offRouteEl.style.display = 'flex';
    } else if (this._offRouteEl) {
      this._offRouteEl.style.display = 'none';
    }
  }

  // ── MAP INIT ──────────────────────────────────────────────────────────────

  _initMap(center) {
    if (this._renderer) return; // already init'd
    this._renderer = new MapRenderer(this._mapDiv, { initialZoom: 18 });
    this._renderer.init(center);
    this._renderer.following = true;
    this._mapDiv.style.display = 'block';
  }

  // ── UI BUILDERS ───────────────────────────────────────────────────────────

  _buildUI() {
    // Create the outer panel injected just before the existing .layout div
    const panel = document.createElement('div');
    panel.id        = 'lnc-panel';
    panel.className = 'lnc-panel';
    panel.innerHTML = `
      <div class="lnc-header">
        <div class="lnc-header__left">
          <span class="lnc-pill lnc-pill--gps" id="lnc-gps-pill">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5"/></svg>
            GPS
          </span>
          <span class="lnc-dest" id="lnc-dest-label">Select a destination</span>
        </div>
        <div class="lnc-header__right">
          <div class="lnc-stat" title="Estimated time of arrival">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span id="lnc-eta">--</span>
          </div>
          <div class="lnc-stat" title="Remaining distance">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
            <span id="lnc-dist">--</span>
          </div>
          <button class="lnc-btn lnc-btn--start" id="lnc-start" title="Start live GPS navigation" disabled>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Start GPS Nav
          </button>
          <button class="lnc-btn lnc-btn--stop" id="lnc-stop" title="Stop navigation" style="display:none">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12"/></svg>
            Stop
          </button>
        </div>
      </div>

      <!-- Current instruction banner -->
      <div class="lnc-step-banner" id="lnc-step-banner" style="display:none">
        <div class="lnc-step-icon" id="lnc-step-icon">↑</div>
        <div class="lnc-step-text" id="lnc-step-text">Waiting for GPS…</div>
        <div class="lnc-step-meta">
          <span id="lnc-step-num"></span>
          <div class="lnc-step-bar-wrap"><div class="lnc-step-bar" id="lnc-step-bar"></div></div>
        </div>
      </div>

      <!-- Off-route warning -->
      <div class="lnc-off-route" id="lnc-off-route" style="display:none">
        ⚠ Off route — recalculating…
      </div>

      <!-- Google Map container (hidden until GPS active) -->
      <div class="lnc-map-container" id="lnc-map" style="display:none"></div>

      <!-- Mode toggle: switch between Outdoor GPS map / Indoor station map -->
      <div class="lnc-mode-bar" id="lnc-mode-bar" style="display:none">
        <button class="lnc-mode-btn active" id="lnc-btn-indoor" onclick="window._lnc.setMode('indoor')">🏛 Station Map</button>
        <button class="lnc-mode-btn"        id="lnc-btn-outdoor" onclick="window._lnc.setMode('outdoor')">🛰 Live GPS Map</button>
        <button class="lnc-mode-btn lnc-mode-btn--sim" id="lnc-btn-sim" onclick="window._lnc.startSimulation()" title="Simulate a walk for testing">Simulate</button>
      </div>
    `;

    // Inject BEFORE the .layout div
    const layout = document.querySelector('.layout');
    if (layout) {
      layout.parentNode.insertBefore(panel, layout);
    } else {
      document.body.insertBefore(panel, document.body.firstChild);
    }

    // Cache refs
    this._panel        = panel;
    this._mapDiv       = panel.querySelector('#lnc-map');
    this._etaEl        = panel.querySelector('#lnc-eta');
    this._distEl       = panel.querySelector('#lnc-dist');
    this._stepEl       = panel.querySelector('#lnc-step-text');
    this._stepBar      = panel.querySelector('#lnc-step-bar');
    this._stepBanner   = panel.querySelector('#lnc-step-banner');
    this._stepNumEl    = panel.querySelector('#lnc-step-num');
    this._stepIconEl   = panel.querySelector('#lnc-step-icon');
    this._offRouteEl   = panel.querySelector('#lnc-off-route');
    this._destLabelEl  = panel.querySelector('#lnc-dest-label');
    this._startBtn     = panel.querySelector('#lnc-start');
    this._stopBtn      = panel.querySelector('#lnc-stop');
    this._gpsPill      = panel.querySelector('#lnc-gps-pill');
    this._simBtn       = panel.querySelector('#lnc-btn-sim');

    this._startBtn.addEventListener('click', () => this.startNavigation());
    this._stopBtn.addEventListener('click',  () => this.stopNavigation());

    // Expose globally so onclick attributes in the HTML can call setMode
    window._lnc = this;
  }

  /**
   * Switch between indoor station map and outdoor GPS map.
   */
  setMode(mode) {
    this._mode = mode;
    const indoorLayout = document.querySelector('.layout');
    const lncMap       = this._mapDiv;
    const btnIn        = document.getElementById('lnc-btn-indoor');
    const btnOut       = document.getElementById('lnc-btn-outdoor');

    if (mode === 'outdoor') {
      if (indoorLayout) indoorLayout.style.display = 'none';
      lncMap.style.display = 'block';
      if (btnIn)  btnIn.classList.remove('active');
      if (btnOut) btnOut.classList.add('active');
      if (this._renderer) this._renderer.following = true;
    } else {
      if (indoorLayout) indoorLayout.style.display = '';
      lncMap.style.display = 'none';
      if (btnIn)  btnIn.classList.add('active');
      if (btnOut) btnOut.classList.remove('active');
    }
  }

  /**
   * Bind to the existing entry-select dropdown so the mode-toggle bar
   * appears whenever the indoor route is active OR GPS nav is active.
   */
  _bindExistingSelect() {
    // The existing navigate.html setDest() calls are not modified.
    // We intercept them via MutationObserver on the route-result panel.
    const observer = new MutationObserver(() => {
      const rr = document.getElementById('route-result');
      const modeBar = document.getElementById('lnc-mode-bar');
      if (rr && modeBar) {
        // Show mode bar if indoor route is selected OR if GPS nav is active
        const show = rr.classList.contains('show') || this._active;
        modeBar.style.display = show ? 'flex' : 'none';
      }
    });
    const rr = document.getElementById('route-result');
    if (rr) observer.observe(rr, { attributes: true, attributeFilter: ['class'] });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  _setStep(text) {
    if (!this._stepEl) return;
    this._stepEl.textContent = text;
    this._stepBanner.style.display = 'flex';
  }

  _setETA(eta, dist) {
    if (this._etaEl)  this._etaEl.textContent  = eta;
    if (this._distEl) this._distEl.textContent = dist;
  }

  _maneuverIcon(maneuver = '') {
    const map = {
      'turn-left':        '↰',
      'turn-right':       '↱',
      'turn-slight-left': '↖',
      'turn-slight-right':'↗',
      'turn-sharp-left':  '⬅',
      'turn-sharp-right': '➡',
      'uturn-left':       '↩',
      'uturn-right':      '↪',
      'roundabout-left':  '🔄',
      'roundabout-right': '🔄',
      'straight':         '↑',
      'ramp-left':        '↰',
      'ramp-right':       '↱',
      'merge':            '⬆',
      'fork-left':        '↰',
      'fork-right':       '↱',
      'ferry':            '⛴',
      'ferry-train':      '🚢',
      'keep-left':        '↰',
      'keep-right':       '↱',
    };
    return map[maneuver] || '↑';
  }

  // ── Styles ────────────────────────────────────────────────────────────────

  _injectStyles() {
    const id = 'lnc-styles';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
/* ── Live Nav Controller Panel ─────────────────────────────── */
.lnc-panel {
  background: var(--charcoal, #1a2437);
  border-bottom: 1px solid var(--border-gold, rgba(201,168,76,0.22));
  font-family: var(--font-body, system-ui, sans-serif);
  font-size: 13.5px;
  color: var(--text-primary, #e2eaf3);
  transition: all 0.3s ease;
  position: relative;
  z-index: 200;
}

.lnc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  gap: 12px;
  flex-wrap: wrap;
}

.lnc-header__left  { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
.lnc-header__right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

.lnc-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  flex-shrink: 0;
}
.lnc-pill--gps {
  background: rgba(5,150,105,0.15);
  border: 1px solid rgba(5,150,105,0.4);
  color: #34d399;
  animation: lnc-pulse 2.5s ease-in-out infinite;
}
.lnc-panel.lnc--active .lnc-pill--gps {
  background: rgba(5,150,105,0.25);
}

@keyframes lnc-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.6; }
}

.lnc-dest {
  font-size: 13px;
  font-weight: 600;
  color: var(--gold, #c9a84c);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 320px;
}

.lnc-stat {
  display: flex;
  align-items: center;
  gap: 5px;
  font-family: var(--font-mono, monospace);
  font-size: 13px;
  font-weight: 700;
  color: var(--text-secondary, #9ba8b8);
  background: rgba(255,255,255,0.05);
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.08);
}

.lnc-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  font-family: inherit;
  transition: all 0.15s ease;
}
.lnc-btn:disabled { opacity: 0.45; cursor: not-allowed; }

.lnc-btn--start {
  background: var(--orange, #e85d26);
  color: #fff;
  box-shadow: 0 0 16px rgba(232,93,38,0.35);
}
.lnc-btn--start:hover:not(:disabled) {
  background: #f06a30;
  box-shadow: 0 0 22px rgba(232,93,38,0.5);
}

.lnc-btn--stop {
  background: rgba(220,38,38,0.15);
  color: #f87171;
  border: 1px solid rgba(220,38,38,0.35);
}
.lnc-btn--stop:hover { background: rgba(220,38,38,0.25); }

/* Step banner */
.lnc-step-banner {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 20px;
  background: rgba(232,93,38,0.08);
  border-top: 1px solid rgba(232,93,38,0.2);
  border-bottom: 1px solid rgba(232,93,38,0.12);
}

.lnc-step-icon {
  font-size: 26px;
  width: 40px;
  text-align: center;
  flex-shrink: 0;
}

.lnc-step-text {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #e2eaf3);
  line-height: 1.45;
}

.lnc-step-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 5px;
  flex-shrink: 0;
}

#lnc-step-num {
  font-size: 11px;
  color: var(--text-muted, #617080);
  font-family: var(--font-mono, monospace);
}

.lnc-step-bar-wrap {
  width: 80px;
  height: 4px;
  background: rgba(255,255,255,0.1);
  border-radius: 2px;
  overflow: hidden;
}

.lnc-step-bar {
  height: 100%;
  background: var(--orange, #e85d26);
  border-radius: 2px;
  width: 0%;
  transition: width 0.5s ease;
}

/* Off-route warning */
.lnc-off-route {
  padding: 8px 20px;
  background: rgba(220,38,38,0.12);
  border-bottom: 1px solid rgba(220,38,38,0.3);
  color: #f87171;
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-align: center;
  animation: lnc-pulse 1s ease-in-out infinite;
}

/* Map container */
.lnc-map-container {
  width: 100%;
  height: 480px;
  background: #0f172a;
}

/* Mode bar */
.lnc-mode-bar {
  display: flex;
  justify-content: center;
  gap: 0;
  padding: 0;
  background: var(--charcoal-2, #141920);
  border-top: 1px solid var(--border, rgba(255,255,255,0.08));
}

.lnc-mode-btn {
  flex: 1;
  padding: 9px 16px;
  border: none;
  background: transparent;
  color: var(--text-secondary, #9ba8b8);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
  border-bottom: 2px solid transparent;
}
.lnc-mode-btn.active {
  color: var(--orange, #e85d26);
  border-bottom-color: var(--orange, #e85d26);
  background: rgba(232,93,38,0.06);
}
.lnc-mode-btn:hover:not(.active) {
  background: rgba(255,255,255,0.04);
  color: var(--text-primary, #e2eaf3);
}
.lnc-mode-btn--sim {
  border-left: 1px solid rgba(255,255,255,0.07);
  font-size: 12px;
  flex: 0.7;
}

/* ── Toast notifications ─────────────────────────────────────── */
#nav-toast-container {
  position: fixed;
  top: 80px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
  max-width: 320px;
}

.nav-toast {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 13.5px;
  font-weight: 600;
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  opacity: 0;
  transform: translateX(40px);
  transition: opacity 0.3s ease, transform 0.3s ease;
  pointer-events: auto;
}

.nav-toast--visible {
  opacity: 1;
  transform: translateX(0);
}

.nav-toast--info {
  background: rgba(15,23,42,0.92);
  border: 1px solid rgba(232,93,38,0.35);
  color: #e2eaf3;
}

.nav-toast--warn {
  background: rgba(60,20,10,0.92);
  border: 1px solid rgba(220,38,38,0.45);
  color: #f87171;
}

.nav-toast--success {
  background: rgba(5,30,20,0.92);
  border: 1px solid rgba(5,150,105,0.45);
  color: #34d399;
}

.nav-toast__icon { font-size: 18px; flex-shrink: 0; }
.nav-toast__text { line-height: 1.45; }
    `;
    document.head.appendChild(style);
  }
}

// ── Bootstrap ─────────────────────────────────────────────────────────────
// Wait for DOM then init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new LiveNavController());
} else {
  new LiveNavController();
}
