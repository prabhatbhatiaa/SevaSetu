import L from 'leaflet';
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import api from '../../lib/api';

export const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors';

const URGENCY_COLORS = {
  low: '#8f8f97',
  medium: '#3b82f6',
  high: '#f59e0b',
  critical: '#ef4444',
};

// Client-side instant POI dictionary
const CLIENT_POIS = [
  {
    id: 'poi-elegant-kar',
    name: 'Elegant Kar Accessories',
    aliases: [
      'elegant kar',
      'elegant car accessories',
      'elegant car',
      'elegant kar accessories lajpat nagar',
      'elegant car accessories lajpat nagar',
    ],
    secondary: 'B-38, Lajpat Nagar-II, New Delhi, Delhi - 110024',
    display_name: 'Elegant Kar Accessories, B-38, Lajpat Nagar-II, New Delhi, Delhi 110024',
    lat: 28.5683,
    lng: 77.2484,
    city: 'New Delhi',
    state: 'Delhi',
    pincode: '110024',
    address: 'Elegant Kar Accessories, B-38, Lajpat Nagar-II, New Delhi',
  },
  {
    id: 'poi-kr-mangalam-univ',
    name: 'K.R. Mangalam University',
    aliases: [
      'kr mangalam university',
      'kr mangalam',
      'k.r. mangalam',
      'k.r. mangalam university gurugram',
      'kr mangalam sohna road',
      'kr mangalam gurgaon',
    ],
    secondary: 'Sohna Road, Gurugram, Haryana - 122103',
    display_name: 'K.R. Mangalam University, Sohna Road, Gurugram, Haryana 122103',
    lat: 28.2712,
    lng: 77.0679,
    city: 'Gurugram',
    state: 'Haryana',
    pincode: '122103',
    address: 'K.R. Mangalam University, Sohna Road, Gurugram, Haryana',
  },
  {
    id: 'poi-kr-mangalam-gk',
    name: 'K.R. Mangalam World School, GK-II',
    aliases: ['kr mangalam world school', 'k.r. mangalam school gk', 'kr mangalam gk'],
    secondary: 'S-Block, Greater Kailash-II, New Delhi - 110048',
    display_name: 'K.R. Mangalam World School, S-Block, Greater Kailash-II, New Delhi, Delhi 110048',
    lat: 28.5398,
    lng: 77.2411,
    city: 'New Delhi',
    state: 'Delhi',
    pincode: '110048',
    address: 'K.R. Mangalam World School, Greater Kailash-II, New Delhi',
  },
  {
    id: 'poi-kr-mangalam-gurugram',
    name: 'K.R. Mangalam World School, Gurugram',
    aliases: ['kr mangalam school gurgaon', 'kr mangalam south city', 'kr mangalam sector 41'],
    secondary: 'South City 1, Sector 41, Gurugram, Haryana - 122001',
    display_name: 'K.R. Mangalam World School, South City 1, Sector 41, Gurugram, Haryana 122001',
    lat: 28.4682,
    lng: 77.0865,
    city: 'Gurugram',
    state: 'Haryana',
    pincode: '122001',
    address: 'K.R. Mangalam World School, South City 1, Gurugram',
  },
];

function matchClientPOIs(term) {
  const clean = term.toLowerCase().trim().replace(/[-.,]/g, ' ').replace(/\s+/g, ' ');
  const hits = [];

  for (const poi of CLIENT_POIS) {
    const poiName = poi.name.toLowerCase().replace(/[-.,]/g, ' ').replace(/\s+/g, ' ');
    if (poiName.includes(clean) || clean.includes(poiName)) {
      hits.push(poi);
      continue;
    }
    const matchedAlias = poi.aliases.some((alias) => {
      const a = alias.toLowerCase().replace(/[-.,]/g, ' ').replace(/\s+/g, ' ');
      return a.includes(clean) || clean.includes(a);
    });
    if (matchedAlias) {
      hits.push(poi);
    }
  }
  return hits;
}

/**
 * High-visibility visual pin with glowing pulse and high-contrast core.
 */
export function createPin(color = '#ea580c', size = 26) {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="position:relative;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;width:100%;height:100%;border-radius:9999px;background:${color};opacity:0.35;animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
        <div style="position:relative;width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:2.5px solid #ffffff;box-shadow:0 4px 12px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">
          <div style="width:7px;height:7px;border-radius:9999px;background:#ffffff;"></div>
        </div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

export function pinForUrgency(urgency) {
  return createPin(URGENCY_COLORS[urgency] ?? URGENCY_COLORS.medium, 24);
}

/** GeoJSON stores [lng, lat]; Leaflet wants [lat, lng]. */
export function toLatLng(coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length < 2) return [28.4595, 77.0266];
  return [Number(coordinates[1]), Number(coordinates[0])];
}

// Client Wikipedia Geocoder for institutions, universities, landmarks
async function searchWikipediaClient(term) {
  try {
    const sUrl = `https://en.wikipedia.org/w/api.php?action=query&origin=*&list=search&srsearch=${encodeURIComponent(term)}&format=json&utf8=1`;
    const sRes = await fetch(sUrl);
    if (!sRes.ok) return [];
    const sData = await sRes.json();
    const hits = (sData.query?.search || []).slice(0, 3);
    if (!hits.length) return [];

    const titles = hits.map((h) => h.title).join('|');
    const cUrl = `https://en.wikipedia.org/w/api.php?action=query&origin=*&prop=coordinates|pageprops|extracts&exintro=1&explaintext=1&exchars=140&titles=${encodeURIComponent(titles)}&format=json&utf8=1`;
    const cRes = await fetch(cUrl);
    if (!cRes.ok) return [];
    const cData = await cRes.json();

    const results = [];
    for (const pid of Object.keys(cData.query?.pages || {})) {
      const page = cData.query.pages[pid];
      if (page.coordinates?.[0]) {
        const c = page.coordinates[0];
        const desc = page.pageprops?.['wikibase-shortdesc'] || page.extract?.slice(0, 90) || 'Landmark / Institution';
        results.push({
          id: `wiki-${page.pageid}`,
          name: page.title,
          secondary: desc,
          display_name: `${page.title}, ${desc}`,
          lat: c.lat,
          lng: c.lon,
          city: '',
          state: '',
          pincode: '',
          address: `${page.title}, ${desc}`,
        });
      }
    }
    return results;
  } catch {
    return [];
  }
}

async function fetchPhotonClient(q, limit = 5) {
  try {
    const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=${limit}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.features || []).map((f, i) => {
      const p = f.properties || {};
      const coords = f.geometry?.coordinates || [0, 0];
      const parts = [p.street, p.district, p.city, p.state, p.country].filter(Boolean);
      const name = p.name || parts[0] || q;
      const secondary = parts.slice(0, 3).join(', ');
      return {
        id: String(p.osm_id || `ph-${coords.join(',')}-${i}`),
        name,
        secondary: secondary || [p.city, p.state].filter(Boolean).join(', '),
        display_name: [name, ...parts].filter(Boolean).join(', '),
        lat: Number(coords[1]),
        lng: Number(coords[0]),
        city: p.city || p.district || p.county || '',
        state: p.state || '',
        pincode: p.postcode || '',
        address: [name, parts[0], parts[1]].filter(Boolean).join(', ') || name,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Comprehensive hybrid location search:
 * 1. Instant client POI matching (0ms)
 * 2. Backend /api/locations/search (uses multi-source Wikipedia + POI + Photon cache)
 * 3. Client-side fallback to Wikipedia + Photon
 */
export async function searchLocations(rawQuery) {
  const clean = rawQuery?.trim();
  if (!clean || clean.length < 2) return [];

  const results = [];
  const seen = new Set();

  const add = (item, isPriority = false) => {
    if (!item || isNaN(item.lat) || isNaN(item.lng)) return;
    const key = `${item.lat.toFixed(3)},${item.lng.toFixed(3)}`;
    if (seen.has(key)) return;
    seen.add(key);
    if (isPriority) {
      results.unshift(item);
    } else {
      results.push(item);
    }
  };

  // 1. Instant check against local verified POIs (0ms, guaranteed)
  const localHits = matchClientPOIs(clean);
  for (const lh of localHits) {
    add(lh, true);
  }

  // 2. Try backend endpoint
  try {
    const response = await api.get('/locations/search', { params: { q: clean } });
    if (response.data?.success && Array.isArray(response.data?.results) && response.data.results.length > 0) {
      for (const r of response.data.results) {
        add(r);
      }
      return results.slice(0, 8);
    }
  } catch (err) {
    console.warn('Backend location search fallback:', err.message);
  }

  // 3. Client-side fallback: Wikipedia + Photon
  const normClean = clean.replace(/-(\d+)/g, ' $1').trim();

  const [wikiHits, photonHits] = await Promise.all([
    searchWikipediaClient(clean),
    fetchPhotonClient(normClean, 5),
  ]);

  for (const wh of wikiHits) {
    add(wh, true);
  }

  for (const ph of photonHits) {
    add(ph);
  }

  return results.slice(0, 8);
}

/** Legacy searchPlace helper returning top match */
export async function searchPlace(query) {
  const list = await searchLocations(query);
  return list[0] ? { lat: list[0].lat, lng: list[0].lng } : null;
}

/** Looks up readable address details for a point using Nominatim + Photon fallback */
export async function reverseGeocode(lat, lng) {
  if (lat == null || lng == null) return {};

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } },
    );
    if (response.ok) {
      const result = await response.json();
      const addr = result.address || {};
      const road = addr.road || addr.pedestrian || addr.street || addr.neighbourhood || addr.suburb || '';
      const city = addr.city || addr.town || addr.village || addr.suburb || addr.city_district || addr.state_district || addr.county || '';
      const state = addr.state || '';
      const pincode = addr.postcode || '';

      const parts = (result.display_name || '').split(',').map((s) => s.trim()).filter(Boolean);
      const shortAddress = parts.slice(0, 3).join(', ');

      return {
        address: shortAddress || road || result.name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        city: city || state || '',
        state,
        pincode,
      };
    }
  } catch (err) {
    console.warn('Nominatim reverseGeocode failed, attempting fallback:', err.message);
  }

  // Fallback to Photon reverse
  try {
    const pRes = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`);
    if (pRes.ok) {
      const pData = await pRes.json();
      const feat = pData.features?.[0];
      if (feat) {
        const props = feat.properties || {};
        const city = props.city || props.district || props.county || '';
        const name = props.name || props.street || '';
        return {
          address: [name, city, props.state].filter(Boolean).join(', ') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          city,
          state: props.state || '',
          pincode: props.postcode || '',
        };
      }
    }
  } catch {}

  return {
    address: `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
    city: '',
    state: '',
    pincode: '',
  };
}

/**
 * React-Leaflet helper to automatically resize & re-render tiles
 * whenever the container is mounted, animated, or resized.
 */
export function AutoInvalidateSize() {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();

    const t1 = setTimeout(() => map.invalidateSize(), 80);
    const t2 = setTimeout(() => map.invalidateSize(), 250);
    const t3 = setTimeout(() => map.invalidateSize(), 600);
    const t4 = setTimeout(() => map.invalidateSize(), 1200);

    const onResize = () => map.invalidateSize();
    window.addEventListener('resize', onResize);

    let ro;
    const container = map.getContainer();
    if (container && window.ResizeObserver) {
      ro = new ResizeObserver(() => map.invalidateSize());
      ro.observe(container);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      window.removeEventListener('resize', onResize);
      ro?.disconnect();
    };
  }, [map]);

  return null;
}
