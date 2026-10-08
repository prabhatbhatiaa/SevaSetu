import { useEffect, useRef, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { LocateFixed, MapPin, Search } from 'lucide-react';
import { Button, Input } from '../ui';
import { DEFAULT_CENTER } from '../../lib/constants';
import { TILE_ATTRIBUTION, TILE_URL, createPin, reverseGeocode, searchPlace, toLatLng } from './leaflet';

const pin = createPin();

function ClickToPlace({ onPick }) {
  useMapEvents({ click: (event) => onPick(event.latlng.lat, event.latlng.lng) });
  return null;
}

/** Pans the map whenever the chosen point changes. */
function FollowPosition({ position }) {
  const map = useMap();
  const lastKey = useRef('');

  useEffect(() => {
    const key = position.join(',');
    if (key === lastKey.current) return;
    lastKey.current = key;
    map.flyTo(position, Math.max(map.getZoom(), 14), { duration: 0.8 });
  }, [position, map]);

  return null;
}

/**
 * Lets someone choose a location by searching, using their device location,
 * or clicking the map.
 *
 * value / onChange: { coordinates: [lng, lat], address, city, state, pincode }
 */
export function MapPicker({ value, onChange, height = 260 }) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [notice, setNotice] = useState('');

  const position = value?.coordinates ? toLatLng(value.coordinates) : DEFAULT_CENTER;

  const placeAt = async (lat, lng) => {
    setNotice('');
    onChange({ ...value, coordinates: [lng, lat] });
    const details = await reverseGeocode(lat, lng);
    onChange({ coordinates: [lng, lat], ...details });
  };

  const runSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const place = await searchPlace(query);
      if (place) await placeAt(place.lat, place.lng);
      else setNotice('We couldn’t find that place. Try a nearby landmark or area name.');
    } catch {
      setNotice('Search is unavailable right now. You can still click the map.');
    } finally {
      setSearching(false);
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setNotice('Your browser doesn’t share location. Search or click the map instead.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (result) => {
        setLocating(false);
        placeAt(result.coords.latitude, result.coords.longitude);
      },
      () => {
        setLocating(false);
        setNotice('Location permission was denied. Search or click the map instead.');
      },
      { timeout: 10000 },
    );
  };

  const summary = [value?.address, value?.city].filter(Boolean).join(' · ');

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            icon={Search}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                runSearch();
              }
            }}
            placeholder="Search an area, street or landmark"
          />
        </div>
        <Button onClick={runSearch} loading={searching} className="h-11">
          Search
        </Button>
        <Button
          size="icon"
          onClick={useMyLocation}
          loading={locating}
          className="h-11 w-11"
          aria-label="Use my current location"
        >
          {!locating && <LocateFixed className="h-4 w-4" />}
        </Button>
      </div>

      <div style={{ height }} className="relative z-0 overflow-hidden rounded-xl border">
        <MapContainer center={position} zoom={13} scrollWheelZoom={false} className="h-full w-full">
          <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
          <ClickToPlace onPick={placeAt} />
          <Marker position={position} icon={pin} />
          <FollowPosition position={position} />
        </MapContainer>
      </div>

      <p className={notice ? 'text-xs text-danger' : 'flex items-center gap-1.5 text-xs text-muted'}>
        {notice || (
          <>
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {summary || 'Click anywhere on the map to drop the pin.'}
          </>
        )}
      </p>
    </div>
  );
}

export default MapPicker;
