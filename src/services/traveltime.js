// Calls the backend proxy which forwards to the TravelTime Platform API.
// API key format: "APP_ID:API_KEY" (get a free key at traveltime.com)

const TT_MODE_MAP = {
  transit: 'public_transport',
  bike: 'cycling',
  walk: 'walking',
  car: 'driving',
};

function nextMondayAt9() {
  const d = new Date();
  const daysUntil = d.getDay() === 1 ? 7 : (8 - d.getDay()) % 7;
  d.setDate(d.getDate() + daysUntil);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
}

export async function fetchIsochrones(sources, mode, travelTimeSecs, apiKey) {
  const res = await fetch('/api/isochrone', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sources: sources.map((s) => ({
        id: String(s.id),
        lat: s.latlng.lat,
        lng: s.latlng.lng,
        colorIdx: s.colorIdx,
      })),
      mode: TT_MODE_MAP[mode] || 'public_transport',
      travelTimeSecs,
      departureTime: nextMondayAt9(),
      apiKey,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `Server error ${res.status}`);
  }

  const data = await res.json();
  return data.isochrones;
  // Each isochrone: { id, colorIdx, shapes: [{ shell: [{lat,lng}], holes: [[{lat,lng}]] }] }
}
