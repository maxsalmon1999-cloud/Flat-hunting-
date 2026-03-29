import { useEffect, useMemo, useState } from 'react';
import {
  CircleMarker,
  MapContainer,
  Polygon,
  Polyline,
  TileLayer,
  useMapEvents,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { SOURCE_COLORS } from '../utils/colors.js';

const LONDON_CENTER = [51.505, -0.118];
const MIN_POINTS = 3;

function toLatLngPairs(area) {
  const ring = area?.geometry?.coordinates?.[0];
  if (!Array.isArray(ring) || ring.length < 4) return [];
  return ring.slice(0, -1).map(([lng, lat]) => [lat, lng]);
}

function toGeoJsonPolygon(points) {
  const ring = points.map(([lat, lng]) => [lng, lat]);
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [[...ring, ring[0]]],
    },
  };
}

function DrawingClicks({ enabled, onAddPoint }) {
  useMapEvents({
    click(event) {
      if (!enabled) return;
      onAddPoint([event.latlng.lat, event.latlng.lng]);
    },
  });

  return null;
}

export default function DrawingMap({ isochrones, drawnArea, onAreaDrawn }) {
  const savedPoints = useMemo(() => toLatLngPairs(drawnArea), [drawnArea]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [draftPoints, setDraftPoints] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!drawnArea) {
      setDraftPoints([]);
      setIsDrawing(false);
    }
  }, [drawnArea]);

  const beginDrawing = () => {
    setError(null);
    setDraftPoints([]);
    setIsDrawing(true);
  };

  const addPoint = (point) => {
    setError(null);
    setDraftPoints((prev) => [...prev, point]);
  };

  const undoPoint = () => {
    setDraftPoints((prev) => prev.slice(0, -1));
    setError(null);
  };

  const cancelDrawing = () => {
    setDraftPoints([]);
    setIsDrawing(false);
    setError(null);
  };

  const finishDrawing = () => {
    if (draftPoints.length < MIN_POINTS) {
      setError(`Add at least ${MIN_POINTS} boundary points before saving the area.`);
      return;
    }
    onAreaDrawn(toGeoJsonPolygon(draftPoints));
    setDraftPoints([]);
    setIsDrawing(false);
    setError(null);
  };

  const clearArea = () => {
    setDraftPoints([]);
    setIsDrawing(false);
    setError(null);
    onAreaDrawn(null);
  };

  const statusText = error
    ? error
    : isDrawing
      ? `${draftPoints.length} point${draftPoints.length === 1 ? '' : 's'} added. Click the map to keep tracing the boundary.`
      : drawnArea
        ? 'Search area saved. Clear it to redraw a different boundary.'
        : 'Click "Start Area Selection", then click around the map to trace the flat-search boundary.';

  return (
    <div className="map-wrapper">
      <div className={`map-hint-banner${error ? ' map-hint-banner--error' : drawnArea && !isDrawing ? ' map-hint-banner--ready' : ''}`}>
        {statusText}
      </div>

      <div className="map-draw-toolbar">
        {!isDrawing ? (
          <button className="btn btn-primary btn-sm" onClick={beginDrawing}>
            {drawnArea ? 'Redraw Area' : 'Start Area Selection'}
          </button>
        ) : (
          <>
            <button className="btn btn-primary btn-sm" onClick={finishDrawing}>
              Save Area
            </button>
            <button className="btn btn-ghost btn-sm" onClick={undoPoint} disabled={draftPoints.length === 0}>
              Undo Point
            </button>
            <button className="btn btn-ghost btn-sm" onClick={cancelDrawing}>
              Cancel
            </button>
          </>
        )}

        {(drawnArea || draftPoints.length > 0) && (
          <button className="btn btn-ghost btn-sm" onClick={clearArea}>
            Clear
          </button>
        )}
      </div>

      <MapContainer
        center={LONDON_CENTER}
        zoom={11}
        style={{ height: '100%', width: '100%' }}
        zoomControl
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxZoom={19}
        />

        <DrawingClicks enabled={isDrawing} onAddPoint={addPoint} />

        {isochrones.map((iso) => {
          const color = SOURCE_COLORS[iso.colorIdx]?.bg || '#4f46e5';
          return iso.shapes.map((shape, si) => (
            <Polygon
              key={`bg-${iso.id}-${si}`}
              interactive={false}
              positions={[
                shape.shell.map((p) => [p.lat, p.lng]),
                ...shape.holes.map((h) => h.map((p) => [p.lat, p.lng])),
              ]}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.08,
                weight: 1.5,
                opacity: 0.45,
                dashArray: '6 4',
              }}
            />
          ));
        })}

        {!isDrawing && savedPoints.length >= MIN_POINTS && (
          <Polygon
            positions={savedPoints}
            pathOptions={{ color: '#4f46e5', fillColor: '#4f46e5', fillOpacity: 0.16, weight: 2.5 }}
          />
        )}

        {draftPoints.length >= 2 && (
          <Polyline
            positions={draftPoints}
            pathOptions={{ color: '#4f46e5', weight: 3, opacity: 0.95 }}
          />
        )}

        {draftPoints.length >= MIN_POINTS && (
          <Polygon
            positions={draftPoints}
            pathOptions={{ color: '#4f46e5', fillColor: '#4f46e5', fillOpacity: 0.14, weight: 2.5 }}
          />
        )}

        {draftPoints.map((point, index) => (
          <CircleMarker
            key={`${point[0]}-${point[1]}-${index}`}
            center={point}
            radius={5}
            pathOptions={{
              color: '#312e81',
              weight: 2,
              fillColor: '#ffffff',
              fillOpacity: 1,
            }}
          />
        ))}
      </MapContainer>
    </div>
  );
}
