export async function fetchListings({ minPrice, maxPrice, amenities, drawnArea }) {
  const params = new URLSearchParams({
    minPrice: minPrice || '',
    maxPrice: maxPrice || '',
    amenities: amenities?.join(',') || '',
  });

  const res = await fetch(`/api/listings?${params}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ drawnArea }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `Server error ${res.status}`);
  }

  return res.json(); // { listings, errors }
}

export async function fetchSaved() {
  const res = await fetch('/api/saved');
  if (!res.ok) throw new Error('Failed to load saved listings');
  const data = await res.json();
  return data.saved;
}

export async function saveListing(listing) {
  await fetch('/api/saved', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ listing }),
  });
}

export async function unsaveListing(id) {
  await fetch(`/api/saved/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
