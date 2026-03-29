export async function geocodeAddress(address) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&addressdetails=1`;
  const res = await fetch(url, {
    headers: {
      'Accept-Language': 'en-GB,en',
      'User-Agent': 'TravelTimeComparisonMap/1.0 (flat-hunting)',
    },
  });
  if (!res.ok) throw new Error('Geocoding service unavailable');
  const data = await res.json();
  if (!data.length) throw new Error(`Could not find "${address}"`);
  const item = data[0];
  return {
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
    display: item.display_name,
    short:
      item.address?.road ||
      item.address?.suburb ||
      item.address?.city ||
      item.display_name.split(',')[0],
  };
}
