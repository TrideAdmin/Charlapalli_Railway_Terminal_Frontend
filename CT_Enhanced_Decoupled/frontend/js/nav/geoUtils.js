/**
 * geoUtils.js
 * ──────────────────────────────────────────────────────────────────────────
 * Pure geometry utilities for real-world GPS navigation.
 * No external dependencies.  All coords: {lat, lng} or {latitude, longitude}.
 * ──────────────────────────────────────────────────────────────────────────
 */

const R = 6371000; // Earth radius in metres

/** Degrees → Radians */
export function toRad(d) { return d * Math.PI / 180; }

/** Radians → Degrees */
export function toDeg(r) { return r * 180 / Math.PI; }

/**
 * Haversine distance between two lat/lng points (metres).
 * Accepts {lat,lng} OR {latitude,longitude}.
 */
export function haversineDistance(a, b) {
  const lat1 = toRad(a.lat ?? a.latitude);
  const lat2 = toRad(b.lat ?? b.latitude);
  const dLat = lat2 - lat1;
  const dLng = toRad((b.lng ?? b.longitude) - (a.lng ?? a.longitude));
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Initial bearing from point A → B (degrees, 0 = north, clockwise).
 */
export function bearing(a, b) {
  const lat1 = toRad(a.lat ?? a.latitude);
  const lat2 = toRad(b.lat ?? b.latitude);
  const dLng = toRad((b.lng ?? b.longitude) - (a.lng ?? a.longitude));
  const x = Math.sin(dLng) * Math.cos(lat2);
  const y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(x, y)) + 360) % 360;
}

/**
 * Perpendicular distance from point P to segment AB (metres).
 * Returns { dist, closestPoint: {lat,lng}, fraction }
 */
export function distanceToSegment(p, a, b) {
  const pLat = p.lat ?? p.latitude, pLng = p.lng ?? p.longitude;
  const aLat = a.lat ?? a.latitude, aLng = a.lng ?? a.longitude;
  const bLat = b.lat ?? b.latitude, bLng = b.lng ?? b.longitude;

  const dx = bLng - aLng, dy = bLat - aLat;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    // segment is a point
    return { dist: haversineDistance(p, a), closestPoint: { lat: aLat, lng: aLng }, fraction: 0 };
  }

  let t = ((pLng - aLng) * dx + (pLat - aLat) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const closestLat = aLat + t * dy;
  const closestLng = aLng + t * dx;
  const closestPoint = { lat: closestLat, lng: closestLng };
  const dist = haversineDistance(p, closestPoint);
  return { dist, closestPoint, fraction: t };
}

/**
 * Minimum distance from point P to a polyline (array of {lat,lng}).
 * Returns { dist, segmentIndex, closestPoint, fraction }
 */
export function distanceToPolyline(p, polyline) {
  if (!polyline || polyline.length < 2) return { dist: Infinity, segmentIndex: -1 };

  let best = { dist: Infinity, segmentIndex: 0, closestPoint: polyline[0], fraction: 0 };

  for (let i = 0; i < polyline.length - 1; i++) {
    const r = distanceToSegment(p, polyline[i], polyline[i + 1]);
    if (r.dist < best.dist) {
      best = { ...r, segmentIndex: i };
    }
  }
  return best;
}

/**
 * Find how far along the polyline the user has progressed.
 * Returns the index of the nearest upcoming waypoint.
 */
export function nearestUpcomingWaypoint(currentPos, polyline) {
  const { segmentIndex } = distanceToPolyline(currentPos, polyline);
  return segmentIndex;
}

/**
 * Total length of a polyline in metres.
 */
export function polylineLength(polyline) {
  let total = 0;
  for (let i = 0; i < polyline.length - 1; i++) {
    total += haversineDistance(polyline[i], polyline[i + 1]);
  }
  return total;
}

/**
 * Remaining distance along polyline from nearestSegment onwards.
 */
export function remainingDistance(polyline, fromSegment) {
  let total = 0;
  for (let i = fromSegment; i < polyline.length - 1; i++) {
    total += haversineDistance(polyline[i], polyline[i + 1]);
  }
  return total;
}

/**
 * Interpolate a position along a polyline by distance (metres from start).
 */
export function interpolatePolyline(polyline, distanceFromStart) {
  let travelled = 0;
  for (let i = 0; i < polyline.length - 1; i++) {
    const segLen = haversineDistance(polyline[i], polyline[i + 1]);
    if (travelled + segLen >= distanceFromStart) {
      const frac = (distanceFromStart - travelled) / segLen;
      return {
        lat: polyline[i].lat + frac * (polyline[i + 1].lat - polyline[i].lat),
        lng: polyline[i].lng + frac * (polyline[i + 1].lng - polyline[i].lng),
      };
    }
    travelled += segLen;
  }
  return polyline[polyline.length - 1];
}

/**
 * Smooth GPS position using exponential moving average.
 * alpha: 0 = no update, 1 = jump instantly.
 */
export function smoothPosition(prev, next, alpha = 0.25) {
  if (!prev) return { lat: next.lat ?? next.latitude, lng: next.lng ?? next.longitude };
  return {
    lat: prev.lat + alpha * ((next.lat ?? next.latitude) - prev.lat),
    lng: prev.lng + alpha * ((next.lng ?? next.longitude) - prev.lng),
  };
}

/**
 * Format metres into human-readable string.
 */
export function formatDistance(metres) {
  if (metres < 10)   return `${Math.round(metres)} m`;
  if (metres < 100)  return `${Math.round(metres / 10) * 10} m`;
  if (metres < 1000) return `${Math.round(metres / 10) * 10} m`;
  return `${(metres / 1000).toFixed(1)} km`;
}

/**
 * Estimate walking ETA.  Average walking speed: 1.4 m/s.
 */
export function estimateETA(metres, speedMps = 1.4) {
  const secs = metres / speedMps;
  if (secs < 60)  return `< 1 min`;
  if (secs < 3600) return `${Math.ceil(secs / 60)} min`;
  return `${(secs / 3600).toFixed(1)} hr`;
}

/**
 * Decode a Google Maps encoded polyline string into [{lat,lng}].
 */
export function decodePolyline(encoded) {
  const coords = [];
  let idx = 0, lat = 0, lng = 0;
  while (idx < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(idx++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0; result = 0;
    do { b = encoded.charCodeAt(idx++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coords.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return coords;
}

/**
 * Densify an array of {lat,lng} waypoints so consecutive points are no more
 * than `stepMeters` metres apart.  Dense paths = smooth animation when the
 * GPS simulator fires once per tick.
 *
 * @param {Array<{lat,lng}>} points
 * @param {number} [stepMeters=2]
 * @returns {Array<{lat,lng}>}
 */
export function densifyLatLngPath(points, stepMeters = 2) {
  if (!points || points.length < 2) return points ?? [];
  const out = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    out.push({ lat: a.lat, lng: a.lng });
    const segLen = haversineDistance(a, b);
    const steps  = Math.floor(segLen / stepMeters);
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      out.push({
        lat: a.lat + t * (b.lat - a.lat),
        lng: a.lng + t * (b.lng - a.lng),
      });
    }
  }
  out.push({ lat: points[points.length - 1].lat, lng: points[points.length - 1].lng });
  return out;
}
