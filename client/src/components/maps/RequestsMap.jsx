import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { DEFAULT_CENTER } from '../../lib/constants';
import { TILE_ATTRIBUTION, TILE_URL, pinForUrgency, toLatLng } from './leaflet';

function FitToPoints({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) return;
    map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 14 });
  }, [points, map]);

  return null;
}

/**
 * Plots service requests, coloured by urgency.
 * `linkTo(request)` decides where each popup links to.
 */
export function RequestsMap({ requests, height = 420, linkTo = (request) => `/requests/${request._id}` }) {
  const mappable = useMemo(() => requests.filter((request) => request.location?.coordinates?.length === 2), [requests]);
  const points = useMemo(() => mappable.map((request) => toLatLng(request.location.coordinates)), [mappable]);

  return (
    <div style={{ height }} className="relative z-0 overflow-hidden rounded-2xl border">
      <MapContainer center={points[0] ?? DEFAULT_CENTER} zoom={11} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        <FitToPoints points={points} />

        {mappable.map((request, index) => (
          <Marker key={request._id} position={points[index]} icon={pinForUrgency(request.urgency)}>
            <Popup>
              <div className="w-52">
                <p className="text-[11px] uppercase tracking-wider text-muted">{request.category}</p>
                <p className="mt-1 text-sm font-medium leading-snug">{request.title}</p>
                {request.location.city && <p className="mt-1 text-xs text-muted">{request.location.city}</p>}
                <Link
                  to={linkTo(request)}
                  className="mt-3 inline-block text-xs font-medium text-ink underline underline-offset-4"
                >
                  View request
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export default RequestsMap;
