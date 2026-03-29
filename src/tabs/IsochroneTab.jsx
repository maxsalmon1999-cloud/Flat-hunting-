import { useState, useRef } from 'react';
import IsochroneMap from '../components/IsochroneMap.jsx';
import { geocodeAddress } from '../services/geocoding.js';
import { fetchIsochrones } from '../services/traveltime.js';
import { SOURCE_COLORS, TRANSPORT_MODES } from '../utils/colors.js';

const ISO_MODES = TRANSPORT_MODES.filter((m) => m.id !== 'car');

let _id = 1;
const uid = () => ++_id;

export default function IsochroneTab({
  sources, setSources,
  mode, setMode,
  timeLimit, setTimeLimit,
  isochrones, setIsochrones,
  apiKey, setApiKey,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [geoLoading, setGeoLoading] = useState({});
  const [geoErrors, setGeoErrors] = useState({});
  const [keyVisible, setKeyVisible] = useState(!apiKey);

  const saveApiKey = (key) => {
    setApiKey(key);
    localStorage.setItem('tt_key', key);
  };

  const addSource = () => {
    const colorIdx = sources.length % SOURCE_COLORS.length;
    setSources((prev) => [
      ...prev,
      { id: uid(), label: `Location ${String.fromCharCode(65 + prev.length)}`, address: '', latlng: null, colorIdx },
    ]);
  };

  const removeSource = (id) => {
    setSources((prev) => prev.filter((s) => s.id !== id));
    setIsochrones((prev) => prev.filter((iso) => iso.id !== String(id)));
  };

  const updateLabel = (id, label) =>
    setSources((prev) => prev.map((s) => (s.id === id ? { ...s, label } : s)));

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

  const handleCalculate = async () => {
    const valid = sources.filter((s) => s.latlng);
    if (!valid.length) return;
    if (mode === 'transit' && !apiKey.trim()) {
      setError('Enter your TravelTime APP_ID:API_KEY above to use transit isochrones.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const results = await fetchIsochrones(valid, mode, timeLimit * 60, apiKey);
      setIsochrones(results);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const validSources = sources.filter((s) => s.latlng);
  const timeTicks = [10, 20, 30, 40, 50, 60];

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>Isochrone Map</h1>
          <p className="sidebar-subtitle">Where can you reach in N minutes?</p>
        </div>

        {/* Transport mode */}
        <section className="section">
          <h2 className="section-title">Transport Mode</h2>
          <div className="mode-tabs">
            {ISO_MODES.map((m) => (
              <button
                key={m.id}
                className={`mode-tab${mode === m.id ? ' mode-tab--active' : ''}`}
                onClick={() => { setMode(m.id); setIsochrones([]); }}
                title={m.desc}
              >
                <span className="mode-icon">{m.icon}</span>
                <span className="mode-label">{m.label}</span>
              </button>
            ))}
          </div>

          {mode === 'transit' && (
            <div className="api-key-section" style={{ marginTop: 8 }}>
              <div className="api-key-header" onClick={() => setKeyVisible((v) => !v)}>
                <span className={`api-dot ${apiKey ? 'api-dot--ok' : 'api-dot--missing'}`} />
                <span className="api-key-label">
                  {apiKey ? 'TravelTime key set' : 'TravelTime API key required'}
                </span>
                <span className="api-key-toggle">{keyVisible ? '▲' : '▼'}</span>
              </div>
              {keyVisible && (
                <div className="api-key-body">
                  <input
                    type="password"
                    className="input"
                    placeholder="APP_ID:API_KEY"
                    value={apiKey}
                    onChange={(e) => saveApiKey(e.target.value)}
                  />
                  <p className="api-key-hint">
                    Free key at <strong>traveltime.com</strong>. Format: <code>yourAppId:yourApiKey</code>
                  </p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Time limit slider */}
        <section className="section">
          <div className="time-slider-header">
            <h2 className="section-title">Travel Time Limit</h2>
            <span className="time-slider-value">{timeLimit} min</span>
          </div>
          <input
            type="range"
            min="10"
            max="60"
            step="5"
            value={timeLimit}
            onChange={(e) => { setTimeLimit(Number(e.target.value)); setIsochrones([]); }}
            className="time-slider"
          />
          <div className="time-slider-ticks">
            {timeTicks.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        </section>

        {/* Employment locations */}
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">Employment Locations</h2>
            <button
              className="btn btn-ghost btn-sm"
              onClick={addSource}
              disabled={sources.length >= 6}
            >
              + Add
            </button>
          </div>
          <div className="source-list">
            {sources.map((src) => (
              <SourceRow
                key={src.id}
                src={src}
                loading={geoLoading[src.id]}
                error={geoErrors[src.id]}
                onGeocode={(addr) => geocodeSource(src.id, addr)}
                onLabelChange={(lbl) => updateLabel(src.id, lbl)}
                onRemove={() => removeSource(src.id)}
                canRemove={sources.length > 1}
              />
            ))}
          </div>
        </section>

        {/* Calculate */}
        <section className="section section--no-border">
          <button
            className="btn btn-primary btn-block"
            onClick={handleCalculate}
            disabled={loading || validSources.length === 0}
          >
            {loading ? (
              <span className="btn-loading">Calculating isochrones…</span>
            ) : (
              '🗺 Show Isochrones'
            )}
          </button>
          {validSources.length === 0 && (
            <p className="hint-text">Enter at least one location address above.</p>
          )}
          {error && <p className="error-text" style={{ marginTop: 8 }}>{error}</p>}
        </section>

        {/* Results summary */}
        {isochrones.length > 0 && (
          <section className="section">
            <h2 className="section-title">Coverage</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              {isochrones.map((iso) => {
                const src = sources.find((s) => String(s.id) === iso.id);
                const col = SOURCE_COLORS[iso.colorIdx];
                return (
                  <div key={iso.id} className="iso-result-row">
                    <span
                      className="source-dot"
                      style={{ background: col?.bg, borderColor: col?.border }}
                    />
                    <span style={{ fontSize: 12, color: '#374151' }}>
                      <strong>{src?.label || iso.id}</strong>: reachable in {timeLimit} min
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="hint-text" style={{ marginTop: 8 }}>
              Switch to <strong>Search Zone</strong> to draw your flat search area.
            </p>
          </section>
        )}
      </aside>

      <IsochroneMap sources={sources} isochrones={isochrones} />
    </div>
  );
}

function SourceRow({ src, loading, error, onGeocode, onLabelChange, onRemove, canRemove }) {
  const col = SOURCE_COLORS[src.colorIdx];
  const [addr, setAddr] = useState(src.address);

  return (
    <div className="source-row">
      <div className="source-dot" style={{ background: col.bg, borderColor: col.border }} />
      <div className="source-fields">
        <input
          className="input input--label"
          value={src.label}
          onChange={(e) => onLabelChange(e.target.value)}
          placeholder="Label"
        />
        <form
          className="addr-row"
          onSubmit={(e) => { e.preventDefault(); onGeocode(addr); }}
        >
          <input
            className="input"
            placeholder="Enter address…"
            value={addr}
            onChange={(e) => setAddr(e.target.value)}
            disabled={loading}
          />
          <button className="btn btn-ghost btn-sm" type="submit" disabled={loading || !addr.trim()}>
            {loading ? '…' : src.latlng ? '↻' : 'Go'}
          </button>
        </form>
        {error && <p className="error-text">{error}</p>}
        {src.latlng && (
          <p className="geocoded-text">
            📍 {src.latlng.short || src.latlng.display?.split(',')[0]}
          </p>
        )}
      </div>
      {canRemove && (
        <button className="btn-icon remove-btn" onClick={onRemove} title="Remove">✕</button>
      )}
    </div>
  );
}
