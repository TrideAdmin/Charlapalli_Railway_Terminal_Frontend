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

import GPSTracker from './gpsTracker.js';
import NavigationEngine from './navigationEngine.js';
import MapRenderer from './mapRenderer.js';
import Announcer from './announcer.js';
import { formatDistance, estimateETA } from './geoUtils.js';

// ── Station coords (centre of Charlapalli Terminal) ───────────────────────
import { STATION_ANCHOR } from './stationGeo.js';
const STATION = STATION_ANCHOR;

// ── Google Maps API key (set in navigate.html before this script loads) ───
// window.GOOGLE_MAPS_API_KEY = 'YOUR_KEY_HERE';

// ─────────────────────────────────────────────────────────────────────────
class LiveNavController {
  constructor() {
    this._tracker = null;
    this._engine = null;
    this._renderer = null;
    this._announcer = new Announcer({ voice: true, lang: 'en-IN' });

    this._mode = 'indoor'; // 'indoor' | 'outdoor'
    this._dest = null;     // {lat, lng, label}
    this._active = false;
    this._simRoute = null;       // densified {lat,lng}[] from indoor path, or null
    this._arrivalTimer = null;   // auto-stop timer set by _onArrival()

    // DOM refs (created by _buildUI)
    this._panel = null;
    this._mapDiv = null;
    this._etaEl = null;
    this._distEl = null;
    this._stepEl = null;
    this._stepBar = null;
    this._startBtn = null;
    this._stopBtn = null;
    this._modeToggle = null;

    this._injectStyles();
    this._buildUI();

    const savedMode = localStorage.getItem('ct-map-view') || 'indoor';
    this.setMapViewMode(savedMode);
  }

  // ── PUBLIC API ────────────────────────────────────────────────────────────

  /**
   * Set the destination (lat/lng) for outdoor GPS navigation.
   * Called programmatically, e.g. from navigate.html when user selects a dest.
   */
  setDestination(lat, lng, label = 'Destination') {
    this._dest = { lat, lng, label };
    // NOTE: do NOT reset _simRoute here — setSimulationRoute() is called
    // immediately after by the BLOCK 3 bridge, and we must not wipe it.
    if (this._destLabelEl) this._destLabelEl.textContent = label;
    if (this._startBtn) {
      this._startBtn.disabled = false;
      this._startBtn.title = 'Start live GPS navigation';
      this._startBtn.style.display = 'flex'; // show floating start button
    }
    const sideBtn = document.getElementById('sidebar-start-nav-btn');
    if (sideBtn) sideBtn.disabled = false;
  }

  /**
   * Supply a densified indoor lat/lng polyline so that startNavigation()
   * runs a simulated walk instead of waiting for real device GPS.
   * Called from BLOCK 3 in navigate.html after the user picks S → D.
   * @param {Array<{lat,lng}>} latlngArray
   */
  setSimulationRoute(latlngArray) {
    this._simRoute = Array.isArray(latlngArray) && latlngArray.length > 1
      ? latlngArray
      : null;
    if (this._simRoute && this._startBtn) {
      this._startBtn.title = 'Preview walking route (indoor simulation)';
    }
  }

  /**
   * Begin live GPS navigation.
   */
  startNavigation() {
    if (this._active) return;
    if (!this._dest) { alert('Please select a destination first.'); return; }

    const usingSimulation = Array.isArray(this._simRoute) && this._simRoute.length > 1;

    this._active = true;

    // ── Switch to outdoor map IMMEDIATELY so Google Maps measures the
    //    correct (full-panel) container size when _initMap() is called
    //    later in the GPS/simulation onUpdate callback. ──────────────
    this._showOutdoorMap();

    this._startBtn.style.display = 'none';
    this._stopBtn.style.display = 'flex';
    const sideBtn = document.getElementById('sidebar-start-nav-btn');
    if (sideBtn) { sideBtn.disabled = true; sideBtn.textContent = 'Navigating…'; }
    this._announcer.announce(
      usingSimulation
        ? 'Previewing indoor walking route…'
        : 'Navigation started. Acquiring GPS signal…',
      'info'
    );

    // Initialise engine
    this._engine = new NavigationEngine({
      onStepChange: (step, idx, total) => this._onStepChange(step, idx, total),
      onReroute: (route) => this._onReroute(route),
      onArrival: () => this._onArrival(),
      onProgress: (p) => this._onProgress(p),
      onAnnounce: (txt) => this._announcer.announce(txt, 'info'),
      onError: (err) => this._announcer.announce(err.message, 'warn'),
    });

    // Keep a local snapshot of _simRoute so the async closure captures it
    const simRoute = usingSimulation ? this._simRoute.slice() : [];

    // Initialise GPS tracker
    this._tracker = new GPSTracker({
      onUpdate: async gps => {
        // First fix → init engine + map
        if (!this._renderer && window.google?.maps) {
          this._initMap({ lat: gps.lat, lng: gps.lng });
          if (usingSimulation) {
            await this._engine.startSimulatedNavigation(simRoute, this._dest);
          } else {
            await this._engine.startNavigation(
              { lat: gps.lat, lng: gps.lng },
              this._dest,
            );
          }
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
      minDistanceM: usingSimulation ? 0.5 : 2,
      maxAccuracyM: 60,
      simulationMode: usingSimulation,
      simulationRoute: simRoute,
    });

    this._tracker.start();
  }

  /**
   * Stop navigation.
   */
  stopNavigation() {
    clearTimeout(this._arrivalTimer); // prevent stale timer firing after manual stop
    this._active = false;
    this._simRoute = null; // clear indoor simulation
    this._tracker?.stop();
    this._engine?.stop();
    this._renderer?.clear();
    this._startBtn.style.display = 'none'; // hide on indoor map
    this._startBtn.title = 'Start live GPS navigation';
    this._stopBtn.style.display = 'none';
    this._setStep('Navigation stopped.');
    this._setETA('--', '--');

    const sideBtn = document.getElementById('sidebar-start-nav-btn');
    if (sideBtn) {
      sideBtn.disabled = false;
      sideBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Start Navigation';
    }

    // Return the user to the station map view cleanly
    this._showIndoorMap();
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

    // Automatically end the session after a short pause so the arrival
    // message is visible, then reset to idle so Start Nav works again
    // for the next destination without requiring a manual Stop click.
    clearTimeout(this._arrivalTimer);
    this._arrivalTimer = setTimeout(() => {
      if (this._active) this.stopNavigation();
    }, 3000);
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

    if (window.ENTITY_GPS_COORDS) {
      this._renderer.renderStationEntities(Object.values(window.ENTITY_GPS_COORDS));
    }
  }

  // ── UI BUILDERS ───────────────────────────────────────────────────────────

  _buildUI() {
    // ── Map container only — no panel bar ────────────────────────────────
    const mapDiv = document.createElement('div');
    mapDiv.id        = 'lnc-map';
    mapDiv.className = 'lnc-map-container';
    mapDiv.style.cssText = 'display:none;position:relative;';

    // Floating Stop button — overlaid on the map, bottom-left
    const stopBtn = document.createElement('button');
    stopBtn.id        = 'lnc-stop';
    stopBtn.className = 'lnc-btn lnc-btn--stop lnc-float-btn';
    stopBtn.title     = 'Stop navigation';
    stopBtn.style.display = 'none';
    stopBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12"/></svg>
      Stop
    `;
    mapDiv.appendChild(stopBtn);

    // Floating Start button — visible once a destination is chosen
    const startBtn = document.createElement('button');
    startBtn.id        = 'lnc-start';
    startBtn.className = 'lnc-btn lnc-btn--start lnc-float-btn';
    startBtn.title     = 'Start live GPS navigation';
    startBtn.disabled  = true;
    startBtn.style.display = 'none';
    startBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      Start GPS Nav
    `;
    mapDiv.appendChild(startBtn);

    // Place the map container directly into .map-panel
    const mapPanel = document.querySelector('.map-panel');
    if (mapPanel) {
      mapDiv.style.flex      = '1 1 0';
      mapDiv.style.minHeight = '0';
      mapDiv.style.width     = '100%';
      mapDiv.style.margin    = '0';
      mapPanel.appendChild(mapDiv);
    } else {
      document.body.appendChild(mapDiv);
    }

    // Cache refs — _panel === mapDiv (no wrapper bar)
    this._panel       = mapDiv;
    this._mapDiv      = mapDiv;
    this._startBtn    = startBtn;
    this._stopBtn     = stopBtn;

    // Removed elements — null them so callbacks are safe no-ops
    this._etaEl       = null;
    this._distEl      = null;
    this._stepEl      = null;
    this._stepBar     = null;
    this._stepBanner  = null;
    this._stepNumEl   = null;
    this._stepIconEl  = null;
    this._offRouteEl  = null;
    this._destLabelEl = null;
    this._gpsPill     = null;

    startBtn.addEventListener('click', () => this.startNavigation());
    stopBtn.addEventListener('click',  () => this.stopNavigation());

    // Expose globally
    window._lnc = this;
  }

  /**
   * Switch between indoor station map and outdoor GPS map.
   * Delegates to _showOutdoorMap() / _showIndoorMap().
   */
  setMode(mode) {
    this._mode = mode;
    if (mode === 'outdoor') {
      this._showOutdoorMap();
    } else {
      this._showIndoorMap();
    }
  }

  // ── Private DOM-toggle helpers ───────────────────────────────────────────

  /**
   * Hide the indoor station canvas and show the live Google Map,
   * filling the full .map-panel height.
   */
  _showOutdoorMap() {
    document.documentElement.setAttribute('data-map-view', 'outdoor');
    localStorage.setItem('ct-map-view', 'outdoor');
    const btn = document.getElementById('map-view-toggle-btn');
    if (btn) btn.title = 'Switch to Station Map';
    const mapCanvas = document.querySelector('.map-canvas');
    const mapHead   = document.querySelector('.map-head');
    if (mapCanvas) mapCanvas.style.display = 'none';
    if (mapHead)   mapHead.style.display   = 'none';
    this._mapDiv.style.display = 'block';
    if (this._renderer && window.google?.maps) {
      setTimeout(() => {
        google.maps.event.trigger(this._renderer._map, 'resize');
        if (this._renderer._currentPos) this._renderer._map.panTo(this._renderer._currentPos);
      }, 50);
    }
  }

  /**
   * Hide the live Google Map and restore the indoor station canvas.
   */
  _showIndoorMap() {
    document.documentElement.setAttribute('data-map-view', 'indoor');
    localStorage.setItem('ct-map-view', 'indoor');
    const btn = document.getElementById('map-view-toggle-btn');
    if (btn) btn.title = 'Switch to Live Location Map';
    const mapCanvas = document.querySelector('.map-canvas');
    const mapHead   = document.querySelector('.map-head');
    if (mapCanvas) mapCanvas.style.display = '';
    if (mapHead)   mapHead.style.display   = '';
    this._mapDiv.style.display = 'none';
  }

  /**
   * Toggle between indoor station map and outdoor GPS map.
   */
  toggleMapView() {
    const current = document.documentElement.getAttribute('data-map-view') || 'indoor';
    const nextMode = (current === 'outdoor') ? 'indoor' : 'outdoor';
    this.setMapViewMode(nextMode);
  }

  /**
   * Apply specific map view mode and update layout/toggle states.
   */
  async setMapViewMode(mode) {
    if (mode === 'outdoor') {
      this.setMode('outdoor');

      if (!this._renderer) {
        if (window.google?.maps) {
          await this._initOutdoorPreview();
        } else {
          // Poll for Google Maps if not loaded yet
          const checkGoogleMaps = setInterval(async () => {
            if (window.google?.maps) {
              clearInterval(checkGoogleMaps);
              if (document.documentElement.getAttribute('data-map-view') === 'outdoor' && !this._renderer) {
                await this._initOutdoorPreview();
              }
            }
          }, 100);
          setTimeout(() => clearInterval(checkGoogleMaps), 10000);
        }
      }
    } else {
      this.setMode('indoor');
    }
  }

  /**
   * Initialize outdoor location preview, centering on user position or station fallback.
   */
  async _initOutdoorPreview() {
    let center = STATION;
    if (navigator.geolocation) {
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        center = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      } catch (e) {
        console.warn("Geolocation failed or denied, using station coordinates fallback.", e);
      }
    }
    this._initMap(center);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  _setStep(text) {
    if (!this._stepEl) return;
    this._stepEl.textContent = text;
    if (this._stepBanner) this._stepBanner.style.display = 'flex';
  }

  _setETA(eta, dist) {
    if (this._etaEl) this._etaEl.textContent = eta;
    if (this._distEl) this._distEl.textContent = dist;
  }

  _maneuverIcon(maneuver = '') {
    const map = {
      'turn-left': '↰',
      'turn-right': '↱',
      'turn-slight-left': '↖',
      'turn-slight-right': '↗',
      'turn-sharp-left': '⬅',
      'turn-sharp-right': '➡',
      'uturn-left': '↩',
      'uturn-right': '↪',
      'roundabout-left': '🔄',
      'roundabout-right': '🔄',
      'straight': '↑',
      'ramp-left': '↰',
      'ramp-right': '↱',
      'merge': '⬆',
      'fork-left': '↰',
      'fork-right': '↱',
      'ferry': '⛴',
      'ferry-train': '🚢',
      'keep-left': '↰',
      'keep-right': '↱',
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
/* ── LNC Map container ──────────────────────────────────────── */
.lnc-map-container {
  flex: 1 1 0;
  min-height: 0;
  width: 100%;
  background: #0f172a;
  position: relative;
}

/* ── Floating action buttons (Start / Stop) overlaid on the map */
.lnc-float-btn {
  position: absolute;
  bottom: 80px;
  left: 16px;
  z-index: 400;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 18px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  font-family: inherit;
  transition: all 0.15s ease;
  box-shadow: 0 4px 20px rgba(0,0,0,0.4);
}
.lnc-float-btn:disabled { opacity: 0.45; cursor: not-allowed; }

.lnc-btn--start {
  background: var(--orange, #e85d26);
  color: #fff;
}
.lnc-btn--start:hover:not(:disabled) {
  background: #f06a30;
  transform: translateY(-1px);
  box-shadow: 0 6px 24px rgba(232,93,38,0.5);
}

.lnc-btn--stop {
  background: rgba(220,38,38,0.18);
  color: #f87171;
  border: 1px solid rgba(220,38,38,0.4);
  backdrop-filter: blur(8px);
}
.lnc-btn--stop:hover { background: rgba(220,38,38,0.3); }

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
