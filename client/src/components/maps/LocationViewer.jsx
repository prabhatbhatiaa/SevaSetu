import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import { TILE_ATTRIBUTION, TILE_URL, pinForUrgency, toLatLng } from './leaflet';

/** A read-only map centred on one request. */
export function LocationViewer({ request, height = 280 }) {
  if (request.location?.coordinates?.length !== 2) return null;
  const position = toLatLng(request.location.coordinates);

  return (
    <div style={{ height }} className="relative z-0 overflow-hidden rounded-2xl border">
      <MapContainer center={position} zoom={14} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        <Marker position={position} icon={pinForUrgency(request.urgency)} />
      </MapContainer>
    </div>
  );
}

export default LocationViewer;
