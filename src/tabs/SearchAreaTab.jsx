import DrawingMap from '../components/DrawingMap.jsx';

const AMENITY_OPTIONS = [
  { id: 'dishwasher', label: 'Dishwasher' },
  { id: 'dryer', label: 'Dryer / Tumble dryer' },
  { id: 'washing_machine', label: 'Washing machine' },
  { id: 'living_room', label: 'Living room' },
  { id: 'garden', label: 'Garden / Outdoor space' },
  { id: 'parking', label: 'Parking' },
  { id: 'bills_included', label: 'Bills included' },
  { id: 'furnished', label: 'Furnished' },
  { id: 'ensuite', label: 'Ensuite bathroom' },
  { id: 'gym', label: 'Gym access' },
];

export default function SearchAreaTab({
  isochrones,
  drawnArea,
  setDrawnArea,
  criteria,
  setCriteria,
  onSearch,
}) {
  const hasArea = Boolean(drawnArea);
  const priceRangeInvalid = criteria.maxPrice > 0 && criteria.minPrice > criteria.maxPrice;
  const selectedAmenitiesLabel = criteria.amenities.length === 0
    ? 'No must-have amenities selected'
    : `${criteria.amenities.length} must-have amenit${criteria.amenities.length === 1 ? 'y' : 'ies'} selected`;

  const toggleAmenity = (id) => {
    setCriteria((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(id)
        ? prev.amenities.filter((a) => a !== id)
        : [...prev.amenities, id],
    }));
  };

  const handleSearch = () => {
    if (!hasArea || priceRangeInvalid) {
      return;
    }
    onSearch();
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>Search Zone</h1>
          <p className="sidebar-subtitle">Draw your search area and set requirements</p>
        </div>

        {/* Drawing instructions */}
        <section className="section">
          <h2 className="section-title">Search Area</h2>
          {!hasArea ? (
            <div className="draw-instructions">
              <p>Click <strong>Start Area Selection</strong>, then click around the map to trace your search zone.</p>
              <p style={{ marginTop: 6 }}>
                {isochrones.length > 0
                  ? 'The dashed coloured areas show your isochrones from Tab 1.'
                  : 'Tip: calculate isochrones in Tab 1 first to use as a reference.'}
              </p>
            </div>
          ) : (
            <div className="draw-done">
              <span className="draw-done__icon">✓</span>
              <div>
                <strong>Search zone drawn</strong>
                <p style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                  Use Redraw Area or Clear on the map if you want to change it.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Price range */}
        <section className="section">
          <h2 className="section-title">Monthly Rent</h2>
          <div className="price-range-row">
            <div className="price-field">
              <label className="price-label">Min £</label>
              <input
                type="number"
                className="input"
                value={criteria.minPrice}
                min={0}
                step={50}
                onChange={(e) => setCriteria((p) => ({ ...p, minPrice: Number(e.target.value) }))}
                placeholder="600"
              />
            </div>
            <span className="price-dash">–</span>
            <div className="price-field">
              <label className="price-label">Max £</label>
              <input
                type="number"
                className="input"
                value={criteria.maxPrice}
                min={0}
                step={50}
                onChange={(e) => setCriteria((p) => ({ ...p, maxPrice: Number(e.target.value) }))}
                placeholder="2000"
              />
            </div>
          </div>
          {priceRangeInvalid && (
            <p className="error-text">Max rent must be greater than or equal to min rent.</p>
          )}
        </section>

        {/* Bedrooms */}
        <section className="section">
          <h2 className="section-title">Bedrooms</h2>
          <div className="bedroom-options">
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                className={`bedroom-btn${criteria.minBedrooms === n ? ' bedroom-btn--active' : ''}`}
                onClick={() => setCriteria((p) => ({ ...p, minBedrooms: n }))}
              >
                {n === 4 ? '4+' : n}
              </button>
            ))}
          </div>
          <p className="hint-text" style={{ marginTop: 6 }}>Minimum number of bedrooms</p>
        </section>

        {/* Amenity checklist */}
        <section className="section">
          <h2 className="section-title">Must-Have Amenities</h2>
          <p className="empty-hint">Listings mentioning these will be flagged with chips.</p>
          <div className="amenity-list">
            {AMENITY_OPTIONS.map((opt) => {
              const checked = criteria.amenities.includes(opt.id);
              return (
                <label key={opt.id} className={`amenity-option${checked ? ' amenity-option--checked' : ''}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleAmenity(opt.id)}
                    style={{ display: 'none' }}
                  />
                  <span className="amenity-check">{checked ? '✓' : ''}</span>
                  {opt.label}
                </label>
              );
            })}
          </div>
        </section>

        <section className="section">
          <h2 className="section-title">Ready To Search</h2>
          <div className="search-summary">
            <div className={`search-summary__item${hasArea ? ' search-summary__item--done' : ''}`}>
              <span className="search-summary__icon">{hasArea ? '✓' : '1'}</span>
              <div>
                <strong>{hasArea ? 'Area selected' : 'Draw a search area'}</strong>
                <p>{hasArea ? 'Your polygon is saved on the map.' : 'Start area selection on the map, then click points around the boundary.'}</p>
              </div>
            </div>
            <div className={`search-summary__item${!priceRangeInvalid ? ' search-summary__item--done' : ''}`}>
              <span className="search-summary__icon">{priceRangeInvalid ? '2' : '✓'}</span>
              <div>
                <strong>{priceRangeInvalid ? 'Fix the rent range' : 'Filters look good'}</strong>
                <p>
                  £{criteria.minPrice || 0} to £{criteria.maxPrice || 0} · {criteria.minBedrooms === 4 ? '4+' : criteria.minBedrooms} bed minimum
                </p>
              </div>
            </div>
            <div className="search-summary__item search-summary__item--muted">
              <span className="search-summary__icon">i</span>
              <div>
                <strong>Amenities</strong>
                <p>{selectedAmenitiesLabel}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Search button */}
        <section className="section section--no-border">
          <button
            className="btn btn-primary btn-block"
            onClick={handleSearch}
            disabled={!hasArea || priceRangeInvalid}
          >
            🏠 Find Flats In This Area
          </button>
          {!hasArea && <p className="hint-text">Draw a search zone on the map first.</p>}
          {hasArea && !priceRangeInvalid && (
            <p className="hint-text">This will switch to Listings and start the search immediately.</p>
          )}
        </section>
      </aside>

      <DrawingMap
        isochrones={isochrones}
        drawnArea={drawnArea}
        onAreaDrawn={setDrawnArea}
      />
    </div>
  );
}
