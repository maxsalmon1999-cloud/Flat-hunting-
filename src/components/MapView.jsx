import { useMemo, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Polyline,
  useMapEvents,
  useMap,
  CircleMarker,
  Marker,
  Popup,
  Tooltip,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { SOURCE_COLORS, formatDuration } from '../utils/colors.js';

// Fix Leaflet's bundled icon paths broken by Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function DestinationIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:28px;height:28px;
      background:#1a1a2e;
      border:3px solid ${color};
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      box-shadow:0 2px 6px rgba(0,0,0,.4)
    "></div>`,
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
}

function ClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      if (onMapClick) onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function FitBounds({ sources, destinations }) {
  const map = useMap();
  const points = useMemo(() => {
    const pts = [];
    sources.forEach((s) => s.latlng && pts.push([s.latlng.lat, s.latlng.lng]));
    destinations.forEach((d) => pts.push([d.latlng.lat, d.latlng.lng]));
    return pts;
  }, [sources, destinations]);

  useEffect(() => {
    if (points.length >= 2) {
      map.fitBounds(L.latLngBounds(points), { padding: [50, 50], maxZoom: 14 });
    } else if (points.length === 1) {
      map.setView(points[0], 14);
    }
  }, [points, map]);

  return null;
}

export default function MapView({ sources, destinations, routes, mode, addingDest, onMapClick }) {
  const defaultCenter = [51.505, -0.118]; // London

  return (
    <div className={`map-wrapper${addingDest ? ' map-adding' : ''}`}>
      {addingDest && (
        <div className="map-hint-banner">
          📍 Click anywhere on the map to place a destination
        </div>
      )}
      <MapContainer
        center={defaultCenter}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxZoom={19}
        />

        <ClickHandler onMapClick={onMapClick} />
        <FitBounds sources={sources} destinations={destinations} />

        {/* Route polylines */}
        {Object.entries(routes).map(([key, entry]) => {
          if (!entry?.bestRoute) return null;
          const srcId = parseInt(key.split('_')[0], 10);
          const src = sources.find((s) => s.id === srcId);
          if (!src) return null;

          const srcColor = SOURCE_COLORS[src.colorIdx].bg;
          const { segments } = entry.bestRoute;

          return segments.map((seg, i) => {
            if (!seg.coords?.length) return null;
            const color = seg.isTransit ? seg.color : srcColor;
            const weight = seg.isWalking ? 2 : mode === 'bike' ? 3 : 4;
            const opacity = seg.isWalking ? 0.45 : 0.85;
            const dash = seg.isWalking ? '5 5' : undefined;

            return (
              <Polyline
                key={`${key}_${i}`}
                positions={seg.coords}
                pathOptions={{ color, weight, opacity, dashArray: dash }}
              >
                {seg.isTransit && seg.lineName && (
                  <Tooltip sticky>
                    <strong>{seg.lineName}</strong>
                    {seg.vehicleType && ` · ${vehicleEmoji(seg.vehicleType)}`}
                    {seg.departureStop && (
                      <>
                        <br />
                        {seg.departureStop} → {seg.arrivalStop}
                      </>
                    )}
                    {seg.numStops && <><br />{seg.numStops} stops</>}
                  </Tooltip>
                )}
                {!seg.isTransit && !seg.isWalking && (
                  <Tooltip sticky>
                    {src.label} → {formatDuration(entry.bestRoute.duration)}
                  </Tooltip>
                )}
              </Polyline>
            );
          });
        })}

        {/* Source markers */}
        {sources
          .filter((s) => s.latlng)
          .map((src) => {
            const col = SOURCE_COLORS[src.colorIdx];
            return (
              <CircleMarker
                key={src.id}
                center={[src.latlng.lat, src.latlng.lng]}
                radius={13}
                pathOptions={{
                  color: col.border,
                  fillColor: col.bg,
                  fillOpacity: 1,
                  weight: 3,
                }}
              >
                <Popup>
                  <strong>{src.label}</strong>
                  <br />
                  {src.address}
                </Popup>
                <Tooltip permanent direction="top" offset={[0, -14]}>
                  <span style={{ fontSize: 11, fontWeight: 700 }}>{src.label}</span>
                </Tooltip>
              </CircleMarker>
            );
          })}

        {/* Destination markers */}
        {destinations.map((dest, idx) => (
          <Marker
            key={dest.id}
            position={[dest.latlng.lat, dest.latlng.lng]}
            icon={DestinationIcon('#e94560')}
          >
            <Popup>
              <strong>{dest.label}</strong>
              <br />
              {dest.address}
              {/* Show travel times from each source */}
              {sources
                .filter((s) => s.latlng)
                .map((src) => {
                  const key = `${src.id}_${dest.id}`;
                  const entry = routes[key];
                  const col = SOURCE_COLORS[src.colorIdx];
                  if (!entry?.bestRoute) return null;
                  return (
                    <div key={src.id} style={{ marginTop: 4, display: 'flex', gap: 4, alignItems: 'center' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: col.bg,
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontSize: 12 }}>
                        {src.label}: <strong>{formatDuration(entry.bestRoute.duration)}</strong>
                      </span>
                    </div>
                  );
                })}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

function vehicleEmoji(type) {
  const map = {
    SUBWAY: '🚇',
    RAIL: '🚆',
    TRAM: '🚊',
    BUS: '🚌',
    FERRY: '⛴️',
    CABLE_CAR: '🚡',
    GONDOLA: '🚠',
    FUNICULAR: '🚞',
    HEAVY_RAIL: '🚆',
    COMMUTER_TRAIN: '🚆',
    HIGH_SPEED_TRAIN: '🚄',
    LONG_DISTANCE_TRAIN: '🚄',
    INTERCITY_BUS: '🚌',
    TROLLEYBUS: '🚎',
    MONORAIL: '🚝',
  };
  return map[type] || '🚌';
}
