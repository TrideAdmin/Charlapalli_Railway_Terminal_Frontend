/**
 * mapRenderer.js
 * ──────────────────────────────────────────────────────────────────────────
 * Manages the Google Maps instance:
 *   • Initialises the map in a given DOM container
 *   • Draws / updates the live-user marker (smooth, rotating)
 *   • Draws / updates the route polyline
 *   • Places a destination pin
 *   • Keeps camera centred on the user (or the full route)
 *
 * Designed to be loaded AFTER the Google Maps JS script is ready.
 * ──────────────────────────────────────────────────────────────────────────
 */
import { STATION_ANCHOR } from './stationGeo.js';

export default class MapRenderer {
  /**
   * @param {string|HTMLElement} containerIdOrEl  – div to render the map into
   * @param {object} [opts]
   * @param {number} [opts.initialZoom=18]
   * @param {string} [opts.mapId]                 – Google Cloud Map ID for cloud styling
   */
  constructor(containerIdOrEl, opts = {}) {
    this._container = typeof containerIdOrEl === 'string'
      ? document.getElementById(containerIdOrEl)
      : containerIdOrEl;

    this._opts = {
      initialZoom: opts.initialZoom ?? 18,
      mapId:       opts.mapId ?? null,
      ...opts,
    };

    this._map           = null;
    this._userMarker    = null;
    this._destMarker    = null;
    this._routePoly     = null;
    this._walkedPoly    = null;  // already-walked segment (grey)
    this._animFrame     = null;
    this._currentBearing = 0;
    this._targetBearing  = 0;
    this._currentPos     = null;
    this._targetPos      = null;
  }

  /**
   * Initialise the Google Map.
   * Must be called after window.google is available.
   * @param {{ lat, lng }} center
   */
  init(center) {
    if (!window.google?.maps) {
      console.error('[MapRenderer] Google Maps JS API not loaded.');
      return;
    }

    const mapOptions = {
      center,
      zoom:             this._opts.initialZoom,
      mapTypeId:        'hybrid',
      disableDefaultUI: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl:       false,
      gestureHandling:  'greedy',
      clickableIcons:   false,
      styles: this._getMapStyles(),
    };

    if (this._opts.mapId) {
      mapOptions.mapId = this._opts.mapId;
    }

    this._map = new google.maps.Map(this._container, mapOptions);
    this._initUserMarker(center);
    this._startAnimation();
    return this._map;
  }

  /**
   * Update the user's live position.
   * Smoothly animates the marker.
   * @param {{ lat, lng }} newPos
   * @param {number} [bearingDeg=0]
   */
  updateUserPosition(newPos, bearingDeg = 0) {
    if (!this._map) return;

    this._targetPos     = newPos;
    this._targetBearing = bearingDeg;

    // If first position, jump immediately
    if (!this._currentPos) {
      this._currentPos    = { ...newPos };
      this._currentBearing = bearingDeg;
      this._map.panTo(newPos);
    }
  }

  /**
   * Draw / redraw the route polyline.
   * @param {Array<{lat,lng}>} polyline
   * @param {number} [walkedUpToIndex=0]  – segments before this are "walked"
   */
  drawRoute(polyline, walkedUpToIndex = 0) {
    if (!this._map || !polyline?.length) return;

    // Remove old polylines
    this._routePoly?.setMap(null);
    this._walkedPoly?.setMap(null);

    // Full route (blue dashed)
    this._routePoly = new google.maps.Polyline({
      path:          polyline,
      geodesic:      true,
      strokeColor:   '#1a73e8',
      strokeOpacity: 0,
      strokeWeight:  6,
      icons: [{
        icon:   { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 4, strokeColor: '#1a73e8' },
        offset: '0',
        repeat: '20px',
      }],
    });
    this._routePoly.setMap(this._map);

    // Already-walked segment (grey, solid)
    if (walkedUpToIndex > 0) {
      const walked = polyline.slice(0, walkedUpToIndex + 1);
      this._walkedPoly = new google.maps.Polyline({
        path:          walked,
        geodesic:      true,
        strokeColor:   '#94a3b8',
        strokeOpacity: 0.5,
        strokeWeight:  5,
      });
      this._walkedPoly.setMap(this._map);
    }

    // Fit map to route
    const bounds = new google.maps.LatLngBounds();
    polyline.forEach(p => bounds.extend(p));
    this._map.fitBounds(bounds, { top: 100, right: 60, bottom: 160, left: 60 });
  }

  /**
   * Place / move the destination pin.
   * @param {{ lat, lng }} pos
   * @param {string} [label='']
   */
  setDestinationMarker(pos, label = '') {
    if (!this._map) return;

    if (this._destMarker) {
      this._destMarker.setPosition(pos);
    } else {
      this._destMarker = new google.maps.Marker({
        position: pos,
        map:      this._map,
        title:    label,
        icon: {
          url: this._buildDestIcon(),
          scaledSize: new google.maps.Size(36, 48),
          anchor:     new google.maps.Point(18, 48),
        },
        zIndex: 10,
      });
    }
  }

  /**
   * Centre map on the user's current location, following mode.
   */
  followUser(zoom = 18) {
    if (!this._map || !this._currentPos) return;
    this._map.panTo(this._currentPos);
    this._map.setZoom(zoom);
  }

  /**
   * Destroy markers and polylines.
   */
  clear() {
    this._routePoly?.setMap(null);
    this._walkedPoly?.setMap(null);
    this._destMarker?.setMap(null);
    this._routePoly  = null;
    this._walkedPoly = null;
    this._destMarker = null;

    if (this._entityMarkers) {
      this._entityMarkers.forEach(m => m.setMap(null));
      this._entityMarkers = [];
    }
  }

  destroy() {
    this.clear();
    if (this._animFrame) cancelAnimationFrame(this._animFrame);
  }

  // ── Private ──────────────────────────────────────────────────────────────

  /** Create the blue GPS "you are here" marker */
  _initUserMarker(center) {
    this._userMarker = new google.maps.Marker({
      position: center,
      map:      this._map,
      icon: {
        url:       this._buildUserIcon(0),
        scaledSize: new google.maps.Size(40, 40),
        anchor:     new google.maps.Point(20, 20),
      },
      title:  'Your location',
      zIndex: 100,
      optimized: false, // allow icon updates
    });
    this._currentPos = { ...center };
  }

  /**
   * rAF loop: smoothly interpolate marker position & bearing.
   */
  _startAnimation() {
    const ALPHA_POS = 0.12;   // position smoothing (lower = smoother, laggier)
    const ALPHA_BRG = 0.18;   // bearing smoothing

    const tick = () => {
      if (this._targetPos && this._userMarker) {
        const cp = this._currentPos;
        const tp = this._targetPos;

        const newLat = cp.lat + ALPHA_POS * (tp.lat - cp.lat);
        const newLng = cp.lng + ALPHA_POS * (tp.lng - cp.lng);
        this._currentPos = { lat: newLat, lng: newLng };

        // Smooth bearing — handle wrap-around (359° → 1°)
        let db = this._targetBearing - this._currentBearing;
        if (db > 180)  db -= 360;
        if (db < -180) db += 360;
        this._currentBearing = (this._currentBearing + ALPHA_BRG * db + 360) % 360;

        this._userMarker.setPosition(this._currentPos);
        // Update icon rotation (SVG data URI)
        this._userMarker.setIcon({
          url:        this._buildUserIcon(this._currentBearing),
          scaledSize: new google.maps.Size(40, 40),
          anchor:     new google.maps.Point(20, 20),
        });

        // Keep map centred if in follow mode
        // (navigator UI sets _following flag)
        if (this._following) {
          this._map.panTo(this._currentPos);
        }
      }

      this._animFrame = requestAnimationFrame(tick);
    };

    this._animFrame = requestAnimationFrame(tick);
  }

  set following(v) { this._following = v; }
  get following()  { return this._following; }

  /** Build a rotating arrow SVG for the user marker */
  _buildUserIcon(bearingDeg) {
    const r = bearingDeg;
    const svg = `
<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="s" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.35"/>
    </filter>
  </defs>
  <g transform="rotate(${r},20,20)" filter="url(#s)">
    <!-- Accuracy circle glow -->
    <circle cx="20" cy="20" r="18" fill="rgba(26,115,232,0.15)" stroke="rgba(26,115,232,0.3)" stroke-width="1"/>
    <!-- Body circle -->
    <circle cx="20" cy="20" r="10" fill="#1a73e8" stroke="#fff" stroke-width="2.5"/>
    <!-- Direction arrow -->
    <polygon points="20,4 15,18 20,15 25,18" fill="#fff" opacity="0.95"/>
  </g>
</svg>`.trim();
    return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
  }

  /** Red pin for destination */
  _buildDestIcon() {
    const svg = `
<svg width="36" height="48" viewBox="0 0 36 48" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="s2"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-opacity="0.4"/></filter>
  </defs>
  <g filter="url(#s2)">
    <path d="M18 2C10.3 2 4 8.3 4 16c0 9.6 14 30 14 30S32 25.6 32 16C32 8.3 25.7 2 18 2z" fill="#1a73e8"/>
    <circle cx="18" cy="16" r="7" fill="#fff"/>
    <circle cx="18" cy="16" r="4" fill="#1a73e8"/>
  </g>
</svg>`.trim();
    return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
  }

  /** Dark mode–friendly map style */
  _getMapStyles() {
    // Return [] for default Google Maps style
    // Swap for a custom style array if you have one
    return [];
  }

  /**
   * Render station entities as small neutral circular markers on the hybrid map.
   * Also draws STATION_ANCHOR itself as a distinct red marker.
   * @param {Array<{ lat, lng, label }>} entities
   */
  renderStationEntities(entities) {
    if (!this._map) return;

    if (this._entityMarkers) {
      this._entityMarkers.forEach(m => m.setMap(null));
    }
    this._entityMarkers = [];

    const infoWindow = new google.maps.InfoWindow();

    // 1. Draw verified STATION_ANCHOR marker
    if (STATION_ANCHOR && typeof STATION_ANCHOR.lat === 'number' && typeof STATION_ANCHOR.lng === 'number') {
      const anchorMarker = new google.maps.Marker({
        position: STATION_ANCHOR,
        map:      this._map,
        title:    'STATION ANCHOR (Verified)',
        icon: {
          url: this._buildAnchorIcon(),
          scaledSize: new google.maps.Size(20, 20),
          anchor:     new google.maps.Point(10, 10),
        },
        zIndex: 20,
      });

      anchorMarker.addListener('click', () => {
        infoWindow.setContent(`<div style="color:#dc2626;font-family:sans-serif;font-size:13px;font-weight:700;padding:2px 4px;">STATION ANCHOR (Verified)</div>`);
        infoWindow.open(this._map, anchorMarker);
      });

      this._entityMarkers.push(anchorMarker);
    }

    // 2. Draw other entities
    if (entities?.length) {
      const iconUrl = this._buildEntityIcon();
      entities.forEach(ent => {
        if (typeof ent.lat !== 'number' || typeof ent.lng !== 'number') return;
        const marker = new google.maps.Marker({
          position: { lat: ent.lat, lng: ent.lng },
          map:      this._map,
          title:    ent.label,
          icon: {
            url: iconUrl,
            scaledSize: new google.maps.Size(14, 14),
            anchor:     new google.maps.Point(7, 7),
          },
          zIndex: 5,
        });

        marker.addListener('click', () => {
          infoWindow.setContent(`<div style="color:#0f1318;font-family:sans-serif;font-size:13px;font-weight:600;padding:2px 4px;">${ent.label}</div>`);
          infoWindow.open(this._map, marker);
        });

        this._entityMarkers.push(marker);
      });
    }
  }

  /** Build a 14px neutral dot SVG for entity markers */
  _buildEntityIcon() {
    const svg = `
<svg width="14" height="14" viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg">
  <circle cx="7" cy="7" r="5" fill="#5a6478" stroke="#fff" stroke-width="1.5"/>
</svg>`.trim();
    return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
  }

  /** Build a 20px red dot SVG for the verified station anchor */
  _buildAnchorIcon() {
    const svg = `
<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
  <circle cx="10" cy="10" r="7" fill="#dc2626" stroke="#fff" stroke-width="2"/>
  <circle cx="10" cy="10" r="3" fill="#fff"/>
</svg>`.trim();
    return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
  }
}
