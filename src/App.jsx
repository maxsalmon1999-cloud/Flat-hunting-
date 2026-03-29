import { useState, useCallback, useRef } from 'react';
import MapView from './components/MapView.jsx';
import Sidebar from './components/Sidebar.jsx';
import { geocodeAddress } from './services/geocoding.js';
import { getOSRMRoute } from './services/osrm.js';
import { getTransitRoute } from './services/googleTransit.js';
import { SOURCE_COLORS } from './utils/colors.js';

let _id = 1;
const uid = () => _id++;

export default function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gmaps_key') || '');

  const [sources, setSources] = useState([
    { id: uid(), label: 'Location A', address: '', latlng: null, colorIdx: 0 },
    { id: uid(), label: 'Location B', address: '', latlng: null, colorIdx: 1 },
  ]);

  const [destinations, setDestinations] = useState([]);
  const [mode, setMode] = useState('transit');

  // routes keyed by `${srcId}_${destId}`
  // value: { bestRoute, allRoutes, selectedRouteIdx }
  const [routes, setRoutes] = useState({});
  const [routeLoading, setRouteLoading] = useState({});
  const [routeErrors, setRouteErrors] = useState({});
  const [geoLoading, setGeoLoading] = useState({});
  const [geoErrors, setGeoErrors] = useState({});

  const [addingDest, setAddingDest] = useState(false);

  // --- API Key ---
  const saveApiKey = (key) => {
    setApiKey(key);
    localStorage.setItem('gmaps_key', key);
  };

  // --- Sources ---
  const addSource = () => {
    const colorIdx = sources.length % SOURCE_COLORS.length;
    setSources((prev) => [
      ...prev,
      { id: uid(), label: `Location ${String.fromCharCode(65 + prev.length)}`, address: '', latlng: null, colorIdx },
    ]);
  };

  const removeSource = (id) => {
    setSources((prev) => prev.filter((s) => s.id !== id));
    setRoutes((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => { if (k.startsWith(`${id}_`)) delete next[k]; });
      return next;
    });
  };

  const updateSourceLabel = (id, label) => {
    setSources((prev) => prev.map((s) => (s.id === id ? { ...s, label } : s)));
  };

  const geocodeSource = async (id, address) => {
    if (!address.trim()) return;
    setGeoLoading((p) => ({ ...p, [id]: true }));
    setGeoErrors((p) => ({ ...p, [id]: null }));
    try {
      const loc = await geocodeAddress(address);
      setSources((prev) => prev.map((s) => (s.id === id ? { ...s, address, latlng: loc } : s)));
    } catch (e) {
      setGeoErrors((p) => ({ ...p, [id]: e.message }));
    } finally {
      setGeoLoading((p) => ({ ...p, [id]: false }));
    }
  };

  // --- Destinations ---
  const addDestinationByClick = (latlng) => {
    const id = uid();
    setDestinations((prev) => [
      ...prev,
      { id, latlng, label: `Destination ${prev.length + 1}`, address: `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}` },
    ]);
    setAddingDest(false);
  };

  const addDestinationByAddress = async (address) => {
    setGeoLoading((p) => ({ ...p, newDest: true }));
    setGeoErrors((p) => ({ ...p, newDest: null }));
    try {
      const loc = await geocodeAddress(address);
      const id = uid();
      setDestinations((prev) => [
        ...prev,
        { id, latlng: loc, label: `Destination ${prev.length + 1}`, address: loc.short || address },
      ]);
    } catch (e) {
      setGeoErrors((p) => ({ ...p, newDest: e.message }));
    } finally {
      setGeoLoading((p) => ({ ...p, newDest: false }));
    }
  };

  const removeDestination = (id) => {
    setDestinations((prev) => prev.filter((d) => d.id !== id));
    setRoutes((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => { if (k.endsWith(`_${id}`)) delete next[k]; });
      return next;
    });
  };

  const updateDestLabel = (id, label) => {
    setDestinations((prev) => prev.map((d) => (d.id === id ? { ...d, label } : d)));
  };

  // --- Routing ---
  const calculateRoutes = useCallback(
    async (overrideMode) => {
      const useMode = overrideMode || mode;
      const validSources = sources.filter((s) => s.latlng);
      if (!validSources.length || !destinations.length) return;

      for (const src of validSources) {
        for (const dest of destinations) {
          const key = `${src.id}_${dest.id}`;
          setRouteLoading((p) => ({ ...p, [key]: true }));
          setRouteErrors((p) => ({ ...p, [key]: null }));

          try {
            let allRoutes;
            if (useMode === 'transit') {
              if (!apiKey.trim()) throw new Error('Enter a Google Maps API key to use Transit mode');
              allRoutes = await getTransitRoute(src.latlng, dest.latlng, apiKey.trim());
            } else {
              const r = await getOSRMRoute(src.latlng, dest.latlng, useMode);
              allRoutes = [r];
            }
            setRoutes((p) => ({
              ...p,
              [key]: { allRoutes, selectedIdx: 0, bestRoute: allRoutes[0] },
            }));
          } catch (e) {
            setRouteErrors((p) => ({ ...p, [key]: e.message }));
          } finally {
            setRouteLoading((p) => ({ ...p, [key]: false }));
          }
        }
      }
    },
    [sources, destinations, mode, apiKey]
  );

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setRoutes({});
    setRouteErrors({});
  };

  const selectAlternativeRoute = (key, idx) => {
    setRoutes((prev) => {
      const entry = prev[key];
      if (!entry) return prev;
      return { ...prev, [key]: { ...entry, selectedIdx: idx, bestRoute: entry.allRoutes[idx] } };
    });
  };

  return (
    <div className="app-layout">
      <Sidebar
        apiKey={apiKey}
        onApiKeyChange={saveApiKey}
        sources={sources}
        destinations={destinations}
        mode={mode}
        routes={routes}
        routeLoading={routeLoading}
        routeErrors={routeErrors}
        geoLoading={geoLoading}
        geoErrors={geoErrors}
        addingDest={addingDest}
        onAddSource={addSource}
        onRemoveSource={removeSource}
        onGeocodeSource={geocodeSource}
        onUpdateSourceLabel={updateSourceLabel}
        onModeChange={handleModeChange}
        onCalculate={calculateRoutes}
        onStartAddDest={() => setAddingDest(true)}
        onCancelAddDest={() => setAddingDest(false)}
        onAddDestByAddress={addDestinationByAddress}
        onRemoveDestination={removeDestination}
        onUpdateDestLabel={updateDestLabel}
        onSelectAlternative={selectAlternativeRoute}
      />
      <MapView
        sources={sources}
        destinations={destinations}
        routes={routes}
        mode={mode}
        addingDest={addingDest}
        onMapClick={addingDest ? addDestinationByClick : null}
      />
    </div>
  );
}
