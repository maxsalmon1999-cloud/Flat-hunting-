import { useEffect, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Polygon,
  CircleMarker,
  Tooltip,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { SOURCE_COLORS } from '../utils/colors.js';

// Fix Leaflet icon paths broken by Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function AutoFit({ sources }) {
  const map = useMap();
  const points = useMemo(
    () => sources.filter((s) => s.latlng).map((s) => [s.latlng.lat, s.latlng.lng]),
    [sources]
  );

  useEffect(() => {
    if (points.length >= 2) {
      map.fitBounds(L.latLngBounds(points), { padding: [60, 60], maxZoom: 13 });
    } else if (points.length === 1) {
      map.setView(points[0], 12);
    }
  }, [points, map]);

  return null;
}

export default function IsochroneMap({ sources, isochrones }) {
  return (
    <div className="map-wrapper">
      <MapContainer
        center={[51.505, -0.118]}
        zoom={11}
        style={{ height: '100%', width: '100%' }}
        zoomControl
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxZoom={19}
        />

        <AutoFit sources={sources} />

        {/* Isochrone polygons — one per source, possibly multiple shapes */}
        {isochrones.map((iso) => {
          const color = SOURCE_COLORS[iso.colorIdx]?.bg || '#4f46e5';
          return iso.shapes.map((shape, si) => {
            const outerRing = shape.shell.map((p) => [p.lat, p.lng]);
            const holes = shape.holes.map((h) => h.map((p) => [p.lat, p.lng]));
            return (
              <Polygon
                key={`${iso.id}-${si}`}
                positions={[outerRing, ...holes]}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.18,
                  weight: 2,
                  opacity: 0.75,
                }}
              />
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
                radius={11}
                pathOptions={{
                  color: col.border,
                  fillColor: col.bg,
                  fillOpacity: 1,
                  weight: 3,
                }}
              >
                <Tooltip permanent direction="top" offset={[0, -12]}>
                  <span style={{ fontSize: 11, fontWeight: 700 }}>{src.label}</span>
                </Tooltip>
              </CircleMarker>
            );
          })}
      </MapContainer>
    </div>
  );
}
