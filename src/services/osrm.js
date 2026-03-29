const BASE = 'https://router.project-osrm.org/route/v1';
const PROFILE = { bike: 'bike', walk: 'foot', car: 'driving' };

export async function getOSRMRoute(origin, dest, mode) {
  const profile = PROFILE[mode] || 'driving';
  const url =
    `${BASE}/${profile}/${origin.lng},${origin.lat};${dest.lng},${dest.lat}` +
    `?overview=full&geometries=geojson`;

  const res = await fetch(url);
  if (!res.ok) throw new Error('Routing service unavailable');
  const data = await res.json();
  if (data.code !== 'Ok') throw new Error('No route found between these points');

  const route = data.routes[0];
  return {
    duration: route.duration,
    distance: route.distance,
    segments: [
      {
        coords: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
        color: null, // caller fills in source colour
        isTransit: false,
        isWalking: false,
      },
    ],
    transitLines: [],
  };
}
