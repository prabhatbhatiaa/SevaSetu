import { useEffect, useRef, useState } from 'react';
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import {
  Crosshair,
  Loader2,
  LocateFixed,
  MapPin,
  Maximize2,
  Minimize2,
  Navigation,
  Search,
  X,
} from 'lucide-react';
import { Button } from '../ui';
import { DEFAULT_CENTER } from '../../lib/constants';
import {
  AutoInvalidateSize,
  TILE_ATTRIBUTION,
  TILE_URL,
  createPin,
  reverseGeocode,
  searchLocations,
  toLatLng,
} from './leaflet';

const defaultPin = createPin('#ea580c', 28);

/**
 * Controller inside MapContainer to expose map instance and handle programmatic navigation.
 */
function MapController({ setMapInstance, onMapClick }) {
  const map = useMap();

  useEffect(() => {
    if (map) setMapInstance(map);
  }, [map, setMapInstance]);

  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });

  return null;
}

/**
 * Modern interactive Map Picker with draggable marker,
 * live autocomplete, high-zoom fly-to, geolocation, and precise coordinate binding.
 *
 * value / onChange: { coordinates: [lng, lat], address, city, state, pincode }
 */
export function MapPicker({ value, onChange, height = 340 }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [locating, setLocating] = useState(false);
  const [notice, setNotice] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [isGeocoding, setIsGeocoding] = useState(false);

  const mapInstanceRef = useRef(null);
  const containerRef = useRef(null);
  const searchDebounceRef = useRef(null);
  const suppressDropdownRef = useRef(false);

  // Position on map: [lat, lng]
  const position = value?.coordinates ? toLatLng(value.coordinates) : DEFAULT_CENTER;
  const hasCoordinates = Boolean(value?.coordinates && value.coordinates.length === 2);

  // Sync initial or updated address to search query if search query is empty
  useEffect(() => {
    if (value?.address && !query) {
      setQuery(value.address);
    }
  }, [value?.address]);

  // Debounced search autocomplete
  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    if (suppressDropdownRef.current) {
      suppressDropdownRef.current = false;
      return;
    }

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      setSearching(false);
      return;
    }

    setSearching(true);
    searchDebounceRef.current = setTimeout(async () => {
      const results = await searchLocations(trimmed);
      setSuggestions(results);
      setShowDropdown(results.length > 0);
      setActiveSuggestionIndex(-1);
      setSearching(false);
    }, 250);

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Place marker and update parent state
  const placeAt = async (lat, lng, knownDetails = null, fly = false) => {
    setNotice('');
    setShowDropdown(false);

    if (fly && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], 16.5, { duration: 1.1 });
    }

    if (knownDetails) {
      setQuery(knownDetails.name || knownDetails.address || '');
      onChange({
        coordinates: [lng, lat],
        address: knownDetails.address || '',
        city: knownDetails.city || '',
        state: knownDetails.state || '',
        pincode: knownDetails.pincode || '',
      });
      return;
    }

    // Temporary update coordinates immediately
    onChange({ ...(value || {}), coordinates: [lng, lat] });

    setIsGeocoding(true);
    try {
      const details = await reverseGeocode(lat, lng);
      if (details.address) {
        setQuery(details.address);
      }
      onChange({ coordinates: [lng, lat], ...details });
    } finally {
      setIsGeocoding(false);
    }
  };

  // User clicked a search suggestion item
  const selectSuggestion = (item) => {
    suppressDropdownRef.current = true;
    setQuery(item.name);
    setShowDropdown(false);
    placeAt(
      item.lat,
      item.lng,
      {
        name: item.name,
        address: item.address,
        city: item.city,
        state: item.state,
        pincode: item.pincode,
      },
      true, // Fly smoothly to selected place at high-zoom (16.5)
    );
  };

  // Keyboard navigation inside dropdown
  const handleKeyDown = (event) => {
    if (!showDropdown || suggestions.length === 0) {
      if (event.key === 'Enter') {
        event.preventDefault();
        manualSearch();
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveSuggestionIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveSuggestionIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (activeSuggestionIndex >= 0 && suggestions[activeSuggestionIndex]) {
        selectSuggestion(suggestions[activeSuggestionIndex]);
      } else if (suggestions.length > 0) {
        selectSuggestion(suggestions[0]);
      }
    } else if (event.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const manualSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const results = await searchLocations(query.trim());
      if (results.length > 0) {
        selectSuggestion(results[0]);
      } else {
        setNotice('Could not find that location. Try typing a sector, area, or landmark.');
      }
    } catch {
      setNotice('Search service temporarily unavailable. You can still click or drag on the map.');
    } finally {
      setSearching(false);
    }
  };

  // Handle marker dragging
  const handleMarkerDragEnd = (event) => {
    const marker = event.target;
    if (marker) {
      const newPos = marker.getLatLng();
      placeAt(newPos.lat, newPos.lng, null, false);
    }
  };

  // Geolocation button
  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setNotice('Geolocation is not supported by your browser.');
      return;
    }

    setLocating(true);
    setNotice('');

    const handleSuccess = (pos) => {
      setLocating(false);
      placeAt(pos.coords.latitude, pos.coords.longitude, null, true);
    };

    const handleFailure = (err) => {
      // If high-accuracy times out, fallback to network IP location
      if (err.code === 3 || err.code === 2) {
        navigator.geolocation.getCurrentPosition(
          handleSuccess,
          () => {
            setLocating(false);
            setNotice('Could not detect your current location. Please search for your area above.');
          },
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
        );
      } else if (err.code === 1) {
        setLocating(false);
        setNotice('Location permission was denied. Please allow location access or search above.');
      } else {
        setLocating(false);
        setNotice('Unable to acquire current location. Please search or pick on map.');
      }
    };

    navigator.geolocation.getCurrentPosition(handleSuccess, handleFailure, {
      enableHighAccuracy: true,
      timeout: 6000,
      maximumAge: 0,
    });
  };

  const recenter = () => {
    if (mapInstanceRef.current && hasCoordinates) {
      mapInstanceRef.current.flyTo(position, 16.5, { duration: 0.9 });
    }
  };

  const actualHeight = isExpanded ? Math.max(height + 160, 480) : height;
  const locationLabel = [value?.address, value?.city, value?.state].filter(Boolean).join(', ');

  return (
    <div ref={containerRef} className="space-y-3">
      {/* Search Bar & Map Controls */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted">
              {searching ? (
                <Loader2 className="h-4 w-4 animate-spin text-ink" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </div>

            <input
              type="text"
              value={query}
              onChange={(e) => {
                suppressDropdownRef.current = false;
                setQuery(e.target.value);
              }}
              onFocus={() => {
                if (suggestions.length > 0 && !suppressDropdownRef.current) {
                  setShowDropdown(true);
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search place, college, shop, sector, or area..."
              className="h-11 w-full rounded-xl border border-line bg-surface pl-10 pr-9 text-sm text-ink placeholder:text-muted focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
            />

            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setSuggestions([]);
                  setShowDropdown(false);
                }}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted hover:text-ink"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <Button
            type="button"
            variant="secondary"
            onClick={manualSearch}
            loading={searching}
            className="h-11 px-4 text-xs font-medium"
          >
            Search
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={useMyLocation}
            loading={locating}
            className="h-11 w-11 shrink-0"
            title="Use my current location"
            aria-label="Use my current location"
          >
            {!locating && <LocateFixed className="h-4 w-4 text-ink" />}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="hidden h-11 w-11 shrink-0 sm:flex"
            title={isExpanded ? 'Collapse map' : 'Expand map view'}
            aria-label={isExpanded ? 'Collapse map' : 'Expand map view'}
          >
            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>

        {/* Autocomplete Suggestions Menu */}
        {showDropdown && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-xl border border-line bg-surface p-1.5 shadow-xl backdrop-blur-md">
            <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
              Matching Locations ({suggestions.length})
            </div>
            {suggestions.map((item, idx) => (
              <button
                key={item.id || idx}
                type="button"
                onClick={() => selectSuggestion(item)}
                onMouseEnter={() => setActiveSuggestionIndex(idx)}
                className={`flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                  activeSuggestionIndex === idx
                    ? 'bg-ink/5 text-ink dark:bg-white/10'
                    : 'text-ink hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{item.name}</p>
                  <p className="truncate text-[11px] text-muted">{item.secondary}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map Canvas */}
      <div
        style={{ height: actualHeight }}
        className="relative z-0 overflow-hidden rounded-2xl border border-line shadow-sm transition-all duration-300"
      >
        <MapContainer
          center={position}
          zoom={15}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <AutoInvalidateSize />
          <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
          <MapController
            setMapInstance={(map) => {
              mapInstanceRef.current = map;
            }}
            onMapClick={(lat, lng) => placeAt(lat, lng, null, false)}
          />

          {hasCoordinates && (
            <Marker
              position={position}
              icon={defaultPin}
              draggable={true}
              eventHandlers={{
                dragend: handleMarkerDragEnd,
              }}
            >
              <Tooltip permanent direction="top" offset={[0, -18]} className="font-sans text-xs">
                {isGeocoding ? (
                  <span className="flex items-center gap-1 text-muted">
                    <Loader2 className="h-3 w-3 animate-spin" /> Locating...
                  </span>
                ) : (
                  <span className="font-medium text-ink">
                    {value?.address || 'Drag or click to adjust'}
                  </span>
                )}
              </Tooltip>
            </Marker>
          )}
        </MapContainer>

        {/* Floating Controls Overlay */}
        <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-[400] flex items-center justify-between">
          <div className="flex items-center gap-1.5 rounded-full border border-line/60 bg-surface/90 px-3 py-1 text-[11px] font-medium text-muted shadow-sm backdrop-blur-sm">
            <Navigation className="h-3 w-3 text-amber-500" />
            Click or drag pin to fine-tune
          </div>

          {hasCoordinates && (
            <button
              type="button"
              onClick={recenter}
              className="pointer-events-auto flex items-center gap-1 rounded-full border border-line/60 bg-surface/90 px-2.5 py-1 text-[11px] font-medium text-ink shadow-sm hover:bg-surface backdrop-blur-sm"
              title="Re-center on selected pin"
            >
              <Crosshair className="h-3 w-3 text-amber-500" />
              Re-center
            </button>
          )}
        </div>
      </div>

      {/* Error or Notice Alert */}
      {notice && (
        <p className="text-xs text-rose-500 flex items-center gap-1.5 font-medium">
          <span>•</span> {notice}
        </p>
      )}

      {/* Selected Location Summary Card */}
      <div className="flex flex-col gap-2 rounded-xl border border-line/70 bg-surface/60 p-3 text-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2 min-w-0">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div className="min-w-0">
            <span className="font-medium text-ink">Selected Location:</span>{' '}
            <span className="text-muted">
              {locationLabel || (hasCoordinates ? `${position[0].toFixed(4)}, ${position[1].toFixed(4)}` : 'None chosen yet')}
            </span>
            {value?.city && (
              <span className="ml-2 inline-flex items-center rounded bg-ink/5 px-1.5 py-0.5 text-[10px] font-semibold text-ink dark:bg-white/10">
                {value.city}
              </span>
            )}
          </div>
        </div>

        {hasCoordinates && (
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <span className="text-[11px] font-mono text-muted">
              [{value.coordinates[1].toFixed(4)}, {value.coordinates[0].toFixed(4)}]
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default MapPicker;
