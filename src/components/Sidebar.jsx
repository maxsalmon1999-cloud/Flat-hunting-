import { useState, useRef } from 'react';
import { SOURCE_COLORS, TRANSPORT_MODES, formatDuration, formatDistance } from '../utils/colors.js';

export default function Sidebar({
  apiKey,
  onApiKeyChange,
  sources,
  destinations,
  mode,
  routes,
  routeLoading,
  routeErrors,
  geoLoading,
  geoErrors,
  addingDest,
  onAddSource,
  onRemoveSource,
  onGeocodeSource,
  onUpdateSourceLabel,
  onModeChange,
  onCalculate,
  onStartAddDest,
  onCancelAddDest,
  onAddDestByAddress,
  onRemoveDestination,
  onUpdateDestLabel,
  onSelectAlternative,
}) {
  const [keyVisible, setKeyVisible] = useState(!apiKey);
  const [destInput, setDestInput] = useState('');
  const destInputRef = useRef(null);

  const anyLoading = Object.values(routeLoading).some(Boolean);
  const validSources = sources.filter((s) => s.latlng);

  const handleDestSubmit = async (e) => {
    e.preventDefault();
    if (!destInput.trim()) return;
    await onAddDestByAddress(destInput.trim());
    setDestInput('');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1>Travel Time Map</h1>
        <p className="sidebar-subtitle">Compare journey times across locations</p>
      </div>

      {/* ── Transport modes ── */}
      <section className="section">
        <h2 className="section-title">Transport</h2>
        <div className="mode-tabs">
          {TRANSPORT_MODES.map((m) => (
            <button
              key={m.id}
              className={`mode-tab${mode === m.id ? ' mode-tab--active' : ''}`}
              onClick={() => onModeChange(m.id)}
              title={m.desc}
            >
              <span className="mode-icon">{m.icon}</span>
              <span className="mode-label">{m.label}</span>
            </button>
          ))}
        </div>

        {mode === 'transit' && (
          <div className="api-key-section">
            <div className="api-key-header" onClick={() => setKeyVisible((v) => !v)}>
              <span className={`api-dot ${apiKey ? 'api-dot--ok' : 'api-dot--missing'}`} />
              <span className="api-key-label">
                {apiKey ? 'Google Maps API key set' : 'API key required for transit'}
              </span>
              <span className="api-key-toggle">{keyVisible ? '▲' : '▼'}</span>
            </div>
            {keyVisible && (
              <div className="api-key-body">
                <input
                  type="password"
                  className="input"
                  placeholder="Paste Google Maps API key"
                  value={apiKey}
                  onChange={(e) => onApiKeyChange(e.target.value)}
                />
                <p className="api-key-hint">
                  Needs <em>Maps JavaScript API</em> + <em>Directions API</em> enabled.
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Your locations (sources) ── */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Your Locations</h2>
          <button className="btn btn-ghost btn-sm" onClick={onAddSource} disabled={sources.length >= 6}>
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
              onGeocode={(addr) => onGeocodeSource(src.id, addr)}
              onLabelChange={(lbl) => onUpdateSourceLabel(src.id, lbl)}
              onRemove={() => onRemoveSource(src.id)}
              canRemove={sources.length > 1}
            />
          ))}
        </div>
      </section>

      {/* ── Destinations ── */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Destinations</h2>
        </div>

        {destinations.length === 0 && !addingDest && (
          <p className="empty-hint">Add places you want to check travel times to.</p>
        )}

        <div className="dest-list">
          {destinations.map((dest) => (
            <DestRow
              key={dest.id}
              dest={dest}
              onLabelChange={(lbl) => onUpdateDestLabel(dest.id, lbl)}
              onRemove={() => onRemoveDestination(dest.id)}
            />
          ))}
        </div>

        <form className="dest-add-row" onSubmit={handleDestSubmit}>
          <input
            ref={destInputRef}
            className="input"
            placeholder="Search address…"
            value={destInput}
            onChange={(e) => setDestInput(e.target.value)}
            disabled={geoLoading.newDest}
          />
          <button className="btn btn-primary btn-sm" type="submit" disabled={geoLoading.newDest || !destInput.trim()}>
            {geoLoading.newDest ? '…' : 'Add'}
          </button>
        </form>
        {geoErrors.newDest && <p className="error-text">{geoErrors.newDest}</p>}

        <button
          className={`btn btn-outline btn-block mt-2${addingDest ? ' btn-outline--active' : ''}`}
          onClick={addingDest ? onCancelAddDest : onStartAddDest}
        >
          {addingDest ? '✕ Cancel — click map to place' : '📍 Click map to add destination'}
        </button>
      </section>

      {/* ── Calculate button ── */}
      <section className="section section--no-border">
        <button
          className="btn btn-primary btn-block"
          onClick={() => onCalculate()}
          disabled={anyLoading || validSources.length === 0 || destinations.length === 0}
        >
          {anyLoading ? (
            <span className="btn-loading">Calculating routes…</span>
          ) : (
            '⚡ Calculate Routes'
          )}
        </button>
        {validSources.length === 0 && (
          <p className="hint-text">Enter at least one location address above.</p>
        )}
        {destinations.length === 0 && (
          <p className="hint-text">Add at least one destination.</p>
        )}
      </section>

      {/* ── Results table ── */}
      {destinations.length > 0 && validSources.length > 0 && (
        <section className="section results-section">
          <h2 className="section-title">Results</h2>
          <ResultsTable
            sources={sources}
            destinations={destinations}
            routes={routes}
            routeLoading={routeLoading}
            routeErrors={routeErrors}
            mode={mode}
            onSelectAlternative={onSelectAlternative}
          />
        </section>
      )}
    </aside>
  );
}

/* ── Source row ── */
function SourceRow({ src, loading, error, onGeocode, onLabelChange, onRemove, canRemove }) {
  const col = SOURCE_COLORS[src.colorIdx];
  const [addr, setAddr] = useState(src.address);

  const handleSubmit = (e) => {
    e.preventDefault();
    onGeocode(addr);
  };

  return (
    <div className="source-row">
      <div
        className="source-dot"
        style={{ background: col.bg, borderColor: col.border }}
      />
      <div className="source-fields">
        <input
          className="input input--label"
          value={src.label}
          onChange={(e) => onLabelChange(e.target.value)}
          placeholder="Label"
        />
        <form className="addr-row" onSubmit={handleSubmit}>
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
        <button className="btn-icon remove-btn" onClick={onRemove} title="Remove">
          ✕
        </button>
      )}
    </div>
  );
}

/* ── Destination row ── */
function DestRow({ dest, onLabelChange, onRemove }) {
  const [label, setLabel] = useState(dest.label);
  return (
    <div className="dest-row">
      <span className="dest-pin">📍</span>
      <input
        className="input input--label flex-1"
        value={label}
        onChange={(e) => {
          setLabel(e.target.value);
          onLabelChange(e.target.value);
        }}
      />
      <span className="dest-address">{dest.address}</span>
      <button className="btn-icon remove-btn" onClick={onRemove} title="Remove">
        ✕
      </button>
    </div>
  );
}

/* ── Results table ── */
function ResultsTable({ sources, destinations, routes, routeLoading, routeErrors, mode, onSelectAlternative }) {
  const validSources = sources.filter((s) => s.latlng);

  return (
    <div className="results-table-wrap">
      <table className="results-table">
        <thead>
          <tr>
            <th className="results-th-dest">Destination</th>
            {validSources.map((src) => {
              const col = SOURCE_COLORS[src.colorIdx];
              return (
                <th key={src.id} className="results-th-src">
                  <span className="src-badge" style={{ background: col.bg, color: '#fff' }}>
                    {src.label}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {destinations.map((dest) => (
            <tr key={dest.id}>
              <td className="results-td-dest">{dest.label}</td>
              {validSources.map((src) => {
                const key = `${src.id}_${dest.id}`;
                const loading = routeLoading[key];
                const error = routeErrors[key];
                const entry = routes[key];
                const col = SOURCE_COLORS[src.colorIdx];

                return (
                  <td key={src.id} className="results-td">
                    {loading && <span className="cell-loading">…</span>}
                    {error && (
                      <span className="cell-error" title={error}>
                        ⚠ error
                      </span>
                    )}
                    {entry?.bestRoute && (
                      <RouteCell
                        entry={entry}
                        srcColor={col.bg}
                        mode={mode}
                        routeKey={key}
                        onSelectAlternative={onSelectAlternative}
                      />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RouteCell({ entry, srcColor, mode, routeKey, onSelectAlternative }) {
  const { bestRoute, allRoutes, selectedIdx } = entry;

  return (
    <div className="route-cell">
      {/* Primary time */}
      <div className="route-time" style={{ color: srcColor }}>
        {formatDuration(bestRoute.duration)}
      </div>

      {/* Transit lines */}
      {mode === 'transit' && bestRoute.transitLines?.length > 0 && (
        <div className="line-chips">
          {bestRoute.transitLines.map((line, i) => (
            <span
              key={i}
              className="line-chip"
              style={{
                background: line.color || '#555',
                color: line.textColor || '#fff',
              }}
              title={`${line.fullName || line.name}: ${line.departureStop} → ${line.arrivalStop} (${line.numStops} stops)`}
            >
              {vehicleEmoji(line.vehicleType)} {line.name}
            </span>
          ))}
        </div>
      )}

      {/* Distance */}
      <div className="route-distance">{formatDistance(bestRoute.distance)}</div>

      {/* Alternative routes (transit) */}
      {allRoutes?.length > 1 && (
        <div className="alt-routes">
          {allRoutes.map((alt, i) => (
            <button
              key={i}
              className={`alt-btn${selectedIdx === i ? ' alt-btn--active' : ''}`}
              style={selectedIdx === i ? { borderColor: srcColor } : {}}
              onClick={() => onSelectAlternative(routeKey, i)}
              title={`Option ${i + 1}: ${formatDuration(alt.duration)}`}
            >
              {i + 1}
            </button>
          ))}
          <span className="alt-label">options</span>
        </div>
      )}
    </div>
  );
}

function vehicleEmoji(type) {
  const map = {
    SUBWAY: '🚇', RAIL: '🚆', TRAM: '🚊', BUS: '🚌',
    FERRY: '⛴️', CABLE_CAR: '🚡', GONDOLA: '🚠', FUNICULAR: '🚞',
    HEAVY_RAIL: '🚆', COMMUTER_TRAIN: '🚆', HIGH_SPEED_TRAIN: '🚄',
    LONG_DISTANCE_TRAIN: '🚄', INTERCITY_BUS: '🚌', TROLLEYBUS: '🚎',
    MONORAIL: '🚝',
  };
  return map[type] || '🚌';
}
