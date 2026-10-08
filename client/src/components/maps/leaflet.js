import L from 'leaflet';

export const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

const URGENCY_COLORS = {
  low: '#8f8f97',
  medium: '#60a5fa',
  high: '#e3b341',
  critical: '#f06262',
};

/** A simple round marker; colour defaults to the brand saffron. */
export function createPin(color = '#f0a23b', size = 16) {
  return L.divIcon({
    className: '',
    html: `<div class="map-pin" style="width:${size}px;height:${size}px;background:${color}"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

export function pinForUrgency(urgency) {
  return createPin(URGENCY_COLORS[urgency] ?? URGENCY_COLORS.medium, 18);
}

/** GeoJSON stores [lng, lat]; Leaflet wants [lat, lng]. */
export function toLatLng(coordinates) {
  return [coordinates[1], coordinates[0]];
}

/** Looks up a readable address for a point using OpenStreetMap Nominatim. */
export async function reverseGeocode(lat, lng) {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
    const result = await response.json();
    const address = result.address ?? {};

    return {
      address: (result.display_name ?? '').split(',').slice(0, 3).join(',').trim(),
      city: address.city || address.town || address.village || address.county || address.state_district || '',
      state: address.state ?? '',
      pincode: address.postcode ?? '',
    };
  } catch {
    return {};
  }
}

export async function searchPlace(query) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
  );
  const [place] = await response.json();
  return place ? { lat: Number(place.lat), lng: Number(place.lon) } : null;
}
