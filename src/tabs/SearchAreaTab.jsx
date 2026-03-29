import { useState } from 'react';
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
  const toggleAmenity = (id) => {
    setCriteria((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(id)
        ? prev.amenities.filter((a) => a !== id)
        : [...prev.amenities, id],
    }));
  };

  const handleSearch = () => {
    if (!drawnArea) {
      alert('Please draw a search zone on the map first using the polygon tool (top right of the map).');
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
          {!drawnArea ? (
            <div className="draw-instructions">
              <p>Use the <strong>polygon tool</strong> in the top-right of the map to draw your search zone.</p>
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
                  Use the edit tools on the map to adjust or delete.
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

        {/* Search button */}
        <section className="section section--no-border">
          <button
            className="btn btn-primary btn-block"
            onClick={handleSearch}
          >
            🏠 Find Flats
          </button>
          {!drawnArea && (
            <p className="hint-text">Draw a search zone on the map first.</p>
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
