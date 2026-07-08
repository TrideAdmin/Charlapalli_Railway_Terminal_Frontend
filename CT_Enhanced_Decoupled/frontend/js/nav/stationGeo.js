/**
 * ══════════════════════════════════════════════════════════════════════════════
 *  !!! TODO / SURVEY VERIFICATION BLOCK !!!
 * ══════════════════════════════════════════════════════════════════════════════
 *  1. TODO: verify/replace STATION_ANCHOR
 *     Current: { lat: 17.456984, lng: 78.607641 }
 *     Verified by right-clicking the actual station building in Google Maps satellite view.
 * 
 *  2. TODO: verify/replace PLATFORM_LENGTH_M
 *     Current: 120
 *     This represents the physical width of the platform stack (from PF1 to PF9).
 * 
 *  3. TODO: verify STATION_BEARING_DEG
 *     Current: 78.3
 *     Compass bearing (in degrees) of the platform's long axis (West to East direction).
 * 
 *  Note: STATION_ANCHOR_CANVAS must be the canvas (x,y) of whichever DESTINATIONS 
 *  entry visually corresponds to the same real point as STATION_ANCHOR.
 *  We pick the 'terminal' building entry (x: 449, y: 604) as it is closest to the 
 *  true centre of the station building.
 * ══════════════════════════════════════════════════════════════════════════════
 */

// Verified real-world constants
export const STATION_ANCHOR = { lat: 17.456984, lng: 78.607641 }; // TODO: verify/replace
export const STATION_ANCHOR_CANVAS = { x: 449, y: 604 }; // Visually corresponds to 'terminal' (Terminal Building)
export const PLATFORM_LENGTH_M = 120; // TODO: verify/replace
export const STATION_BEARING_DEG = 78.3; // TODO: verify

// Verified real-world GPS coordinates for each Foot Over Bridge.
// Fill these in by right-clicking the actual bridge structure in
// Google Maps satellite view — do NOT rely on the canvasToLatLng()
// rotation for these; it drifts too much at this distance from
// STATION_ANCHOR and will cause the simulated route to cut diagonally
// across the platform roofs instead of passing through the real bridge.
//
// How to verify:
//   1. Open Google Maps → satellite view → zoom to the station.
//   2. Locate the bridge structure physically crossing the tracks.
//   3. Right-click its mid-point → the popup shows the coordinates.
//   4. Paste lat/lng here, replacing the 0 placeholders.
export const FOB_GPS_OVERRIDES = {
  'FOB-Terminal': { lat: 17.458614, lng: 78.606785 },
  'KZJ-2':        { lat: 17.457687, lng: 78.604884 },
};

/**
 * Convert canvas coordinates (x, y) to a GPS lat/lng pair.
 * Uses proper metre-based geodesy.
 * 
 * Formula:
 *   1. Compute canvas offsets in px:
 *      dx_px = x - STATION_ANCHOR_CANVAS.x
 *      dy_px = y - STATION_ANCHOR_CANVAS.y
 *   2. Determine pixels per metre using the canvas y-span of platforms 1 and 9:
 *      px_per_metre = |pf9.y - pf1.y| / PLATFORM_LENGTH_M
 *   3. Convert canvas offsets to metre offsets:
 *      dx_m = dx_px / px_per_metre
 *      dy_m = dy_px / px_per_metre (where dy_m is positive-downward)
 *   4. Rotate by STATION_BEARING_DEG using a 2D rotation matrix. Canvas
 *      "down" (dy) maps onto the platform's real-world bearing; canvas
 *      "right" (dx) maps onto (bearing − 90°):
 *      east_m  = -dx_m * cos(theta) + dy_m * sin(theta)
 *      north_m =  dx_m * sin(theta) + dy_m * cos(theta)
 *   5. Convert metre offsets to latitude/longitude degree offsets:
 *      dLat = north_m / 111320
 *      dLng = east_m / (111320 * cos(STATION_ANCHOR.lat * PI / 180))
 * 
 * @param {number} x
 * @param {number} y
 * @returns {{ lat: number, lng: number }}
 */
export function canvasToLatLng(x, y) {
  // 1. Compute canvas-space offset (in px) from STATION_ANCHOR_CANVAS.
  const dx_px = x - STATION_ANCHOR_CANVAS.x;
  const dy_px = y - STATION_ANCHOR_CANVAS.y;

  // 2. Compute canvas pixels-per-metre using PLATFORM_LENGTH_M and the actual pixel distance 
  //    between the two platform-end entities already in DESTINATIONS (e.g. pf1 and pf9's canvas y-span).
  const dests = window.DESTINATIONS || (typeof DESTINATIONS !== 'undefined' ? DESTINATIONS : null);
  const pf1_y = dests?.['pf1']?.y ?? 150;
  const pf9_y = dests?.['pf9']?.y ?? 542;
  const px_dist = Math.abs(pf9_y - pf1_y);
  const px_per_metre = px_dist / PLATFORM_LENGTH_M;

  // 3. Convert the pixel offset to a metre offset (dx_m, dy_m).
  const dx_m = dx_px / px_per_metre;
  const dy_m = dy_px / px_per_metre;

  // 4. Rotate (dx_m, dy_m) by STATION_BEARING_DEG (canvas "down" points along
  //    the platform's real-world bearing; canvas "right" is 90° clockwise
  //    from "up", i.e. (bearing - 90)) to get (east_m, north_m).
  const theta = (STATION_BEARING_DEG * Math.PI) / 180;
  const east_m  = -dx_m * Math.cos(theta) + dy_m * Math.sin(theta);
  const north_m =  dx_m * Math.sin(theta) + dy_m * Math.cos(theta);

  // 5. Convert metre offsets to degree offsets
  const dLat = north_m / 111320;
  const dLng = east_m / (111320 * Math.cos((STATION_ANCHOR.lat * Math.PI) / 180));

  // 6. Return { lat, lng }
  return {
    lat: STATION_ANCHOR.lat + dLat,
    lng: STATION_ANCHOR.lng + dLng
  };
}

/**
 * Surveyed real-world GPS coordinates for named canvas entities.
 * Entities NOT listed here fall back to the computed canvasToLatLng() projection.
 */
export const ENTITY_GPS_OVERRIDES = {
  'busbay':        { lat: 17.455678, lng: 78.605289 }, // Bus Bay
  'divyang_w':     { lat: 17.457538, lng: 78.608394 }, // Divyangjan Parking W (surveyed)
  'booking_w':     { lat: 17.457083, lng: 78.607636 }, // Booking Counters
  'gate1crowd':    { lat: 17.457083, lng: 78.607636 }, // Gate 1 Booking Counter
  'parking':       { lat: 17.457826, lng: 78.609082 }, // Parking 2/4W + Cabs
  'parcel':        { lat: 17.456253, lng: 78.605045 }, // Parcel Office
  'terminal_e':    { lat: 17.456767, lng: 78.607521 }, // Terminal Entrance
  'pf1':           { lat: 17.456611, lng: 78.605567 },
  'pf2':           { lat: 17.456795, lng: 78.605712 },
  'pf3':           { lat: 17.457521, lng: 78.607033 },
  'pf4':           { lat: 17.457258, lng: 78.606245 },
  'pf5':           { lat: 17.457420, lng: 78.606384 },
  'pf6':           { lat: 17.457386, lng: 78.605680 },
  'pf7':           { lat: 17.457887, lng: 78.606407 },
  'pf8':           { lat: 17.457575, lng: 78.605270 },
  'pf9':           { lat: 17.457756, lng: 78.605102 },
  'terminal':      { lat: 17.458350, lng: 78.606263 }, // Terminal Building
  'bldg_entrance': { lat: 17.458716, lng: 78.607096 }, // Gate 2 + Baggage Scanner
  'exit_gate':     { lat: 17.458726, lng: 78.607124 },
  'southblock':    { lat: 17.457598, lng: 78.604606 }, // South Block
  'circulating':   { lat: 17.457349, lng: 78.604133 }, // Circulating / Holding Area
};

/**
 * Resolve the real-world lat/lng for a canvas entity.
 * Prefers a surveyed ENTITY_GPS_OVERRIDES entry; falls back to the
 * computed canvasToLatLng() projection for anything not listed
 * (e.g. amenity_*, custom_point, divyang_e).
 *
 * @param {string} id  – entity id as used in DESTINATIONS
 * @param {number} x   – canvas x coordinate
 * @param {number} y   – canvas y coordinate
 * @returns {{ lat: number, lng: number }}
 */
export function resolveEntityLatLng(id, x, y) {
  const override = ENTITY_GPS_OVERRIDES[id];
  if (override && (override.lat !== 0 || override.lng !== 0)) {
    return override;
  }
  return canvasToLatLng(x, y);
}

/**
 * Convert GPS lat/lng to canvas coordinates (x, y).
 * Inverse of canvasToLatLng.
 * 
 * @param {number} lat
 * @param {number} lng
 * @returns {{ x: number, y: number }}
 */
export function latLngToCanvas(lat, lng) {
  // Convert degree offsets to metre offsets
  const dLat = lat - STATION_ANCHOR.lat;
  const dLng = lng - STATION_ANCHOR.lng;

  const north_m = dLat * 111320;
  const east_m = dLng * (111320 * Math.cos((STATION_ANCHOR.lat * Math.PI) / 180));

  // Retrieve platform y-span to calculate pixels per metre
  const dests = window.DESTINATIONS || (typeof DESTINATIONS !== 'undefined' ? DESTINATIONS : null);
  const pf1_y = dests?.['pf1']?.y ?? 150;
  const pf9_y = dests?.['pf9']?.y ?? 542;
  const px_dist = Math.abs(pf9_y - pf1_y);
  const px_per_metre = px_dist / PLATFORM_LENGTH_M;

  // Inverse rotation of (east_m, north_m) by STATION_BEARING_DEG — the exact
  // algebraic inverse of the matrix used in canvasToLatLng.
  const theta = (STATION_BEARING_DEG * Math.PI) / 180;
  const dx_m = -east_m * Math.cos(theta) + north_m * Math.sin(theta);
  const dy_m =  east_m * Math.sin(theta) + north_m * Math.cos(theta);

  // Convert metre offset back to pixel offset
  const dx_px = dx_m * px_per_metre;
  const dy_px = dy_m * px_per_metre;

  return {
    x: STATION_ANCHOR_CANVAS.x + dx_px,
    y: STATION_ANCHOR_CANVAS.y + dy_px
  };
}
