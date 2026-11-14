/**
 * Intelligent Location Search Controller
 * Aggregates Verified Landmark/POI Index, Wikipedia Institutional Geo-Data,
 * and OpenStreetMap (Photon/Nominatim) for comprehensive search resolution.
 */

const cache = new Map();
const MAX_CACHE = 500;

function setCache(key, value) {
  if (cache.size >= MAX_CACHE) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  cache.set(key, { data: value, timestamp: Date.now() });
}

function getCache(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > 3600000) {
    cache.delete(key);
    return null;
  }
  return item.data;
}

// 0. Verified Local Landmark & Business Index
const VERIFIED_POIS = [
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
  {
    id: 'poi-kr-mangalam-vikaspuri',
    name: 'K.R. Mangalam World School, Vikaspuri',
    aliases: ['kr mangalam vikaspuri'],
    secondary: 'H-Block, Behind PVR Sonia Complex, Vikaspuri, New Delhi - 110018',
    display_name: 'K.R. Mangalam World School, Vikaspuri, New Delhi 110018',
    lat: 28.6436,
    lng: 77.0731,
    city: 'New Delhi',
    state: 'Delhi',
    pincode: '110018',
    address: 'K.R. Mangalam World School, Vikaspuri, New Delhi',
  },
];

function searchVerifiedPOIs(term) {
  const clean = term.toLowerCase().trim().replace(/[-.,]/g, ' ').replace(/\s+/g, ' ');
  const hits = [];

  for (const poi of VERIFIED_POIS) {
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

// 1. Wikipedia Geocoding (Institutions, Universities, Colleges, Heritage Landmarks)
async function searchWikipedia(term) {
  try {
    const sUrl = `https://en.wikipedia.org/w/api.php?action=query&origin=*&list=search&srsearch=${encodeURIComponent(term)}&format=json&utf8=1`;
    const sRes = await fetch(sUrl, { signal: AbortSignal.timeout(3000) });
    if (!sRes.ok) return [];
    const sData = await sRes.json();
    const hits = (sData.query?.search || []).slice(0, 3);
    if (!hits.length) return [];

    const titles = hits.map((h) => h.title).join('|');
    const cUrl = `https://en.wikipedia.org/w/api.php?action=query&origin=*&prop=coordinates|pageprops|extracts&exintro=1&explaintext=1&exchars=140&titles=${encodeURIComponent(titles)}&format=json&utf8=1`;
    const cRes = await fetch(cUrl, { signal: AbortSignal.timeout(3000) });
    if (!cRes.ok) return [];
    const cData = await cRes.json();

    const results = [];
    for (const pid of Object.keys(cData.query?.pages || {})) {
      const page = cData.query.pages[pid];
      if (page.coordinates?.[0]) {
        const c = page.coordinates[0];
        const desc = page.pageprops?.['wikibase-shortdesc'] || page.extract?.slice(0, 90) || 'Institution / Landmark';
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

// 2. Photon (OpenStreetMap areas, sectors, colonies, stations, roads)
async function fetchPhoton(q, limit = 5) {
  try {
    const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=${limit}`, {
      signal: AbortSignal.timeout(3500),
    });
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

// 3. Nominatim fallback
async function fetchNominatim(q, limit = 5) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=${limit}`,
      {
        signal: AbortSignal.timeout(3500),
        headers: { 'Accept-Language': 'en', 'User-Agent': 'SevaSetu-App/1.0' },
      },
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map((item) => {
      const addr = item.address || {};
      const name = item.name || addr.road || addr.suburb || addr.neighbourhood || item.display_name.split(',')[0];
      const secondary = item.display_name.split(',').slice(1, 4).join(',').trim();
      const city = addr.city || addr.town || addr.village || addr.suburb || addr.city_district || addr.state_district || addr.county || '';
      return {
        id: String(item.place_id),
        name: name.trim(),
        secondary: secondary || item.display_name,
        display_name: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        city,
        state: addr.state || '',
        pincode: addr.postcode || '',
        address: name + (secondary ? ', ' + secondary : ''),
      };
    });
  } catch {
    return [];
  }
}

/**
 * Controller: Search Locations
 * GET /api/locations/search?q=...
 */
const search = async (req, res, next) => {
  try {
    const rawQuery = req.query.q || '';
    const clean = rawQuery.trim();

    if (!clean || clean.length < 2) {
      return res.status(200).json({ success: true, results: [] });
    }

    const cached = getCache(clean.toLowerCase());
    if (cached) {
      return res.status(200).json({ success: true, results: cached });
    }

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

    // 1. Check verified POIs first (instant match for known community spots & businesses)
    const verifiedMatches = searchVerifiedPOIs(clean);
    for (const vm of verifiedMatches) {
      add(vm, true);
    }

    // Preposition detection (e.g. "X in Y")
    const prepRegex = /\s+(in|near|at|around|opp|opposite|behind)\s+/i;
    const commaRegex = /\s*,\s*/;

    let venue = '';
    let area = '';

    const prepMatch = clean.match(prepRegex);
    if (prepMatch) {
      venue = clean.substring(0, prepMatch.index).trim();
      area = clean.substring(prepMatch.index + prepMatch[0].length).trim();
    } else if (commaRegex.test(clean)) {
      const parts = clean.split(commaRegex);
      if (parts.length >= 2 && parts[0].length > 2 && parts[1].length > 2) {
        venue = parts[0].trim();
        area = parts.slice(1).join(', ').trim();
      }
    }

    const normArea = area ? area.replace(/-(\d+)/g, ' $1').trim() : '';
    const normClean = clean.replace(/-(\d+)/g, ' $1').trim();

    // Run parallel fetches across Wikipedia and Photon
    const [wikiHits, directPhoton] = await Promise.all([
      searchWikipedia(clean),
      fetchPhoton(normClean, 5),
    ]);

    // 2. Add Wikipedia matches (Universities, Colleges, Hospitals)
    for (const wh of wikiHits) {
      add(wh, true);
    }

    // 3. If area was explicitly specified, search area landmarks
    if (normArea) {
      const areaResults = await fetchPhoton(normArea, 4);
      if (areaResults.length > 0) {
        const topArea = areaResults[0];

        if (venue && verifiedMatches.length === 0) {
          add(
            {
              id: `venue-${Date.now()}`,
              name: venue,
              secondary: `${topArea.name}${topArea.secondary ? ', ' + topArea.secondary : ''}`,
              display_name: `${venue}, ${topArea.name}, ${topArea.secondary || ''}`,
              lat: topArea.lat,
              lng: topArea.lng,
              city: topArea.city || topArea.state,
              state: topArea.state || '',
              pincode: topArea.pincode || '',
              address: `${venue}, ${topArea.name}${topArea.city ? ', ' + topArea.city : ''}`,
            },
            true,
          );
        }

        for (const ar of areaResults) {
          add(ar);
        }
      }
    }

    // 4. Add direct Photon matches
    for (const hit of directPhoton) {
      add(hit);
    }

    // 5. Nominatim fallback if still under 3 results
    if (results.length < 3) {
      const nomHits = await fetchNominatim(normClean, 3);
      for (const nh of nomHits) {
        add(nh);
      }
    }

    const finalResults = results.slice(0, 8);
    setCache(clean.toLowerCase(), finalResults);

    res.status(200).json({
      success: true,
      results: finalResults,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  search,
};
