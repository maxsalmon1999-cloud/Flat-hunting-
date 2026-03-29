import { useState, useEffect, useCallback } from 'react';
import PropertyCard from '../components/PropertyCard.jsx';
import { fetchListings, fetchSaved, saveListing, unsaveListing } from '../services/listings.js';

export default function ListingsTab({
  drawnArea,
  criteria,
  listings,
  setListings,
  savedListings,
  setSavedListings,
  searchNonce,
}) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState(null);
  const [showSaved, setShowSaved] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const loadSaved = useCallback(async () => {
    try {
      const saved = await fetchSaved();
      setSavedListings(saved);
    } catch { /* server may not be running yet */ }
  }, [setSavedListings]);

  useEffect(() => {
    loadSaved();
  }, [loadSaved]);

  const runSearch = useCallback(async () => {
    if (!drawnArea) {
      setErrors({ general: 'Draw a search zone in the Search Zone tab before searching.' });
      setHasFetched(false);
      return;
    }

    setLoading(true);
    setErrors(null);
    setCurrentIdx(0);
    setHasFetched(true);
    try {
      const result = await fetchListings({
        minPrice: criteria.minPrice,
        maxPrice: criteria.maxPrice,
        minBedrooms: criteria.minBedrooms,
        amenities: criteria.amenities,
        drawnArea,
      });
      setListings(result.listings || []);
      if (result.errors && (result.errors.spareroom || result.errors.rightmove)) {
        setErrors(result.errors);
      }
    } catch (e) {
      setErrors({ general: e.message });
    } finally {
      setLoading(false);
    }
  }, [criteria, drawnArea, setListings]);

  useEffect(() => {
    if (searchNonce > 0) {
      runSearch();
    }
  }, [searchNonce, runSearch]);

  const handleLike = async (listing) => {
    try {
      await saveListing(listing);
      setSavedListings((prev) =>
        prev.find((s) => s.id === listing.id)
          ? prev
          : [{ ...listing, savedAt: new Date().toISOString() }, ...prev]
      );
    } catch { /* best-effort */ }
    advance();
  };

  const handleDislike = () => advance();

  const advance = () => {
    setCurrentIdx((i) => i + 1);
  };

  const handleUnsave = async (id) => {
    try {
      await unsaveListing(id);
      setSavedListings((prev) => prev.filter((s) => s.id !== id));
    } catch { /* best-effort */ }
  };

  const remaining = listings.slice(currentIdx);
  const current = remaining[0];
  const next = remaining[1];
  const done = hasFetched && !loading && remaining.length === 0;

  return (
    <div className="listings-layout">
      {/* ── Main card area ── */}
      <div className="card-area">
        <div className="card-area__toolbar">
          <div className="card-area__stats">
            {!loading && hasFetched && (
              <span className="listings-count">
                {remaining.length > 0
                  ? `${remaining.length} listing${remaining.length !== 1 ? 's' : ''} remaining`
                  : 'No more listings'}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={runSearch} disabled={loading}>
              {loading ? <span className="btn-loading">Searching…</span> : '↻ Search'}
            </button>
            <button
              className={`btn btn-sm${showSaved ? ' btn-primary' : ' btn-ghost'}`}
              onClick={() => setShowSaved((v) => !v)}
            >
              ♥ Saved ({savedListings.length})
            </button>
          </div>
        </div>

        {/* Scraper errors */}
        {errors && (
          <div className="scraper-errors">
            {errors.general && <p>⚠ {errors.general}</p>}
            {errors.spareroom && <p>SpareRoom: {errors.spareroom}</p>}
            {errors.rightmove && <p>Rightmove: {errors.rightmove}</p>}
          </div>
        )}

        <div className="card-stack-wrapper">
          {loading && (
            <div className="card-loading-state">
              <div className="card-loading-spinner" />
              <p>Searching listings…</p>
              <p className="hint-text">This may take 30–60 seconds while we scrape the sites.</p>
            </div>
          )}

          {!loading && !hasFetched && (
            <div className="card-empty-state">
              <p style={{ fontSize: 32 }}>🏠</p>
              <p style={{ fontWeight: 700, fontSize: 18, marginTop: 8 }}>Ready to search</p>
              <p className="hint-text" style={{ maxWidth: 280, textAlign: 'center', marginTop: 8 }}>
                {drawnArea
                  ? 'Click Search to find flats in your drawn area.'
                  : 'Draw a search zone in the Search Zone tab first, then come back here.'}
              </p>
              <button
                className="btn btn-primary"
                style={{ marginTop: 16 }}
                onClick={runSearch}
                disabled={loading || !drawnArea}
              >
                🔍 Search Now
              </button>
            </div>
          )}

          {!loading && done && (
            <div className="card-empty-state">
              <p style={{ fontSize: 32 }}>✓</p>
              <p style={{ fontWeight: 700, fontSize: 18, marginTop: 8 }}>All done!</p>
              <p className="hint-text" style={{ marginTop: 6 }}>
                You've reviewed all {listings.length} listings.
              </p>
              <p className="hint-text">
                {savedListings.length} saved.
              </p>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={runSearch}>
                ↻ Search Again
              </button>
            </div>
          )}

          {!loading && current && (
            <div className="card-stack">
              {/* Next card peeking behind */}
              {next && (
                <div className="card-stack__behind">
                  <PropertyCard
                    key={`behind-${next.id}`}
                    listing={next}
                    onLike={() => {}}
                    onDislike={() => {}}
                    style={{ pointerEvents: 'none' }}
                  />
                </div>
              )}
              {/* Active card */}
              <div className="card-stack__front">
                <PropertyCard
                  key={current.id}
                  listing={current}
                  onLike={handleLike}
                  onDislike={handleDislike}
                />
              </div>
            </div>
          )}
        </div>

        {/* Keyboard hint */}
        {current && !loading && (
          <p className="hint-text" style={{ textAlign: 'center', marginTop: 12 }}>
            Drag or use the buttons below the card · ↗ opens original listing
          </p>
        )}
      </div>

      {/* ── Saved panel ── */}
      {showSaved && (
        <div className="saved-panel">
          <div className="saved-panel__header">
            ♥ Saved listings
            <button
              className="btn-icon"
              style={{ marginLeft: 'auto' }}
              onClick={() => setShowSaved(false)}
            >
              ✕
            </button>
          </div>
          {savedListings.length === 0 ? (
            <div style={{ padding: 20, color: '#94a3b8', fontSize: 13 }}>
              No saved listings yet. Like a card to save it here.
            </div>
          ) : (
            <div className="saved-panel__list">
              {savedListings.map((l) => (
                <SavedItem key={l.id} listing={l} onUnsave={() => handleUnsave(l.id)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SavedItem({ listing, onUnsave }) {
  return (
    <div className="saved-item">
      {listing.images?.[0] ? (
        <img
          src={listing.images[0]}
          alt=""
          className="saved-item__thumb"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      ) : (
        <div className="saved-item__thumb saved-item__thumb--empty" />
      )}
      <div className="saved-item__info">
        <div className="saved-item__title">{listing.title}</div>
        <div className="saved-item__price">
          {listing.price ? `£${listing.price.toLocaleString()}/mo` : '—'}
        </div>
        <div className="saved-item__area">{listing.area}</div>
        <div className="saved-item__actions">
          <a
            href={listing.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost btn-sm"
            style={{ fontSize: 11, padding: '3px 8px' }}
          >
            View ↗
          </a>
          <button
            className="btn-icon"
            onClick={onUnsave}
            title="Remove from saved"
            style={{ color: '#ef4444' }}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
