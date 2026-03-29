import { useState, useRef } from 'react';

const SWIPE_THRESHOLD = 90;

export default function PropertyCard({ listing, onLike, onDislike, style }) {
  const [imgIdx, setImgIdx] = useState(0);
  const [drag, setDrag] = useState({ active: false, startX: 0, dx: 0 });
  const cardRef = useRef(null);

  const images = listing.images?.slice(0, 4) || [];

  const onPointerDown = (e) => {
    // Ignore clicks on buttons/links
    if (e.target.closest('button, a')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ active: true, startX: e.clientX, dx: 0 });
  };

  const onPointerMove = (e) => {
    if (!drag.active) return;
    setDrag((d) => ({ ...d, dx: e.clientX - d.startX }));
  };

  const onPointerUp = () => {
    if (!drag.active) return;
    if (drag.dx > SWIPE_THRESHOLD) onLike(listing);
    else if (drag.dx < -SWIPE_THRESHOLD) onDislike(listing);
    setDrag({ active: false, startX: 0, dx: 0 });
  };

  const rotation = drag.active ? drag.dx * 0.055 : 0;
  const cardTransform = drag.active
    ? `translateX(${drag.dx}px) rotate(${rotation}deg)`
    : 'none';
  const cardTransition = drag.active ? 'none' : 'transform 0.3s ease, opacity 0.3s ease';
  const cardOpacity = drag.active ? Math.max(0.6, 1 - Math.abs(drag.dx) / 350) : 1;

  const showLike = drag.active && drag.dx > 25;
  const showNope = drag.active && drag.dx < -25;

  const prevImg = (e) => {
    e.stopPropagation();
    setImgIdx((i) => Math.max(0, i - 1));
  };
  const nextImg = (e) => {
    e.stopPropagation();
    setImgIdx((i) => Math.min(images.length - 1, i + 1));
  };

  return (
    <div
      ref={cardRef}
      className="property-card"
      style={{ transform: cardTransform, transition: cardTransition, opacity: cardOpacity, ...style }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {showLike && <div className="card-indicator card-indicator--like">LIKE</div>}
      {showNope && <div className="card-indicator card-indicator--nope">NOPE</div>}

      {/* Image gallery */}
      <div className="card-images">
        {images.length > 0 ? (
          <img
            src={images[imgIdx]}
            alt="Property"
            className="card-img"
            draggable={false}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div className="card-img-placeholder">No photos available</div>
        )}

        {images.length > 1 && (
          <div className="card-img-dots">
            {images.map((_, i) => (
              <button
                key={i}
                className={`img-dot${i === imgIdx ? ' img-dot--active' : ''}`}
                onClick={(e) => { e.stopPropagation(); setImgIdx(i); }}
              />
            ))}
          </div>
        )}

        {imgIdx > 0 && (
          <button className="card-img-arrow card-img-arrow--left" onClick={prevImg}>‹</button>
        )}
        {imgIdx < images.length - 1 && (
          <button className="card-img-arrow card-img-arrow--right" onClick={nextImg}>›</button>
        )}

        <div className="card-source-badge">{listing.source}</div>
      </div>

      {/* Details */}
      <div className="card-details">
        <div className="card-title">{listing.title}</div>
        <div className="card-price">
          {listing.price ? `£${listing.price.toLocaleString()}/mo` : 'Price on request'}
        </div>
        <div className="card-location">{listing.area}</div>

        {listing.amenities?.length > 0 && (
          <div className="card-amenities">
            {listing.amenities.map((a) => (
              <span key={a} className="amenity-chip">{a}</span>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="card-actions">
        <button className="card-btn card-btn--dislike" onClick={() => onDislike(listing)} title="Skip">
          ✕
        </button>
        <a
          href={listing.url}
          target="_blank"
          rel="noopener noreferrer"
          className="card-btn card-btn--view"
          title="Open original listing"
        >
          ↗
        </a>
        <button className="card-btn card-btn--like" onClick={() => onLike(listing)} title="Save">
          ♥
        </button>
      </div>
    </div>
  );
}
