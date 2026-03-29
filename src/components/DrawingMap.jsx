import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import { SOURCE_COLORS } from '../utils/colors.js';

function DrawControl({ onAreaDrawn, existingArea }) {
  const map = useMap();
  // Use a ref so the event handler closure never goes stale
  const callbackRef = useRef(onAreaDrawn);
  useEffect(() => { callbackRef.current = onAreaDrawn; }, [onAreaDrawn]);

  useEffect(() => {
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    // Restore existing drawn area
    if (existingArea) {
      try {
        const layer = L.geoJSON(existingArea, {
          style: { color: '#4f46e5', fillOpacity: 0.15, weight: 2 },
        });
        layer.eachLayer((l) => drawnItems.addLayer(l));
      } catch (_) {}
    }

    const drawControl = new L.Control.Draw({
      position: 'topright',
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
          shapeOptions: { color: '#4f46e5', fillOpacity: 0.15, weight: 2 },
          guideLayers: [],
          snapDistance: 15,
        },
        rectangle: false,
        circle: false,
        marker: false,
        circlemarker: false,
        polyline: false,
      },
      edit: {
        featureGroup: drawnItems,
        remove: true,
      },
    });
    map.addControl(drawControl);

    const onCreate = (e) => {
      drawnItems.clearLayers();
      drawnItems.addLayer(e.layer);
      callbackRef.current(e.layer.toGeoJSON());
    };

    const onDeleted = () => callbackRef.current(null);

    const onEdited = () => {
      const layers = drawnItems.getLayers();
      if (layers.length > 0) {
        callbackRef.current(layers[0].toGeoJSON());
      }
    };

    map.on(L.Draw.Event.CREATED, onCreate);
    map.on(L.Draw.Event.DELETED, onDeleted);
    map.on(L.Draw.Event.EDITED, onEdited);

    return () => {
      map.removeControl(drawControl);
      map.removeLayer(drawnItems);
      map.off(L.Draw.Event.CREATED, onCreate);
      map.off(L.Draw.Event.DELETED, onDeleted);
      map.off(L.Draw.Event.EDITED, onEdited);
    };
  }, [map]); // intentionally omit existingArea — only restore on mount

  return null;
}

export default function DrawingMap({ isochrones, drawnArea, onAreaDrawn }) {
  return (
    <div className="map-wrapper">
      <div className="map-hint-banner">
        ✏️ Use the polygon tool (top right) to draw your search zone
      </div>
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

        {/* Background isochrones from Tab 1 */}
        {isochrones.map((iso) => {
          const color = SOURCE_COLORS[iso.colorIdx]?.bg || '#4f46e5';
          return iso.shapes.map((shape, si) => (
            <Polygon
              key={`bg-${iso.id}-${si}`}
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

        <DrawControl onAreaDrawn={onAreaDrawn} existingArea={drawnArea} />
      </MapContainer>
    </div>
  );
}
