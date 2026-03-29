/* Google Maps transit routing.
 *
 * We load the Maps JS API once (lazily) when an API key is provided,
 * then use DirectionsService for transit routes that include real
 * tube-line colours, vehicle types, stop names, etc.
 */

let mapsAPIPromise = null;
let currentKey = null;

export function loadGoogleMapsAPI(apiKey) {
  // If key changed, reset so we can reload
  if (currentKey && currentKey !== apiKey) {
    mapsAPIPromise = null;
  }
  if (mapsAPIPromise) return mapsAPIPromise;

  currentKey = apiKey;
  mapsAPIPromise = new Promise((resolve, reject) => {
    if (window.google?.maps?.DirectionsService) {
      resolve(window.google.maps);
      return;
    }

    // Unique callback name to avoid collisions
    const cbName = '__gmapsInit_' + Date.now();
    window[cbName] = () => {
      delete window[cbName];
      resolve(window.google.maps);
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&callback=${cbName}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      mapsAPIPromise = null;
      reject(new Error('Failed to load Google Maps API — check your API key and that Maps JS API is enabled.'));
    };
    document.head.appendChild(script);
  });

  return mapsAPIPromise;
}

export async function getTransitRoute(origin, dest, apiKey) {
  const maps = await loadGoogleMapsAPI(apiKey);
  const svc = new maps.DirectionsService();

  return new Promise((resolve, reject) => {
    svc.route(
      {
        origin: { lat: origin.lat, lng: origin.lng },
        destination: { lat: dest.lat, lng: dest.lng },
        travelMode: maps.TravelMode.TRANSIT,
        provideRouteAlternatives: true,
        transitOptions: {
          routingPreference: maps.TransitRoutePreference.FEWER_TRANSFERS,
        },
      },
      (result, status) => {
        if (status !== 'OK') {
          reject(new Error(friendlyStatus(status)));
          return;
        }

        const routes = result.routes.map((route) => {
          const leg = route.legs[0];
          const segments = [];
          const transitLines = [];

          for (const step of leg.steps) {
            const coords = step.path.map((ll) => [ll.lat(), ll.lng()]);

            if (step.travel_mode === 'TRANSIT' && step.transit) {
              const td = step.transit;
              const lineColor = td.line.color || '#666666';
              const shortName = td.line.short_name || td.line.name || '?';

              transitLines.push({
                name: shortName,
                fullName: td.line.name,
                color: lineColor,
                textColor: td.line.text_color || '#ffffff',
                vehicleType: td.line.vehicle?.type || 'RAIL',
                vehicleName: td.line.vehicle?.name || 'Transit',
                departureStop: td.departure_stop.name,
                arrivalStop: td.arrival_stop.name,
                numStops: td.num_stops,
                durationSec: step.duration?.value || 0,
              });

              segments.push({
                coords,
                color: lineColor,
                lineName: shortName,
                vehicleType: td.line.vehicle?.type || 'RAIL',
                numStops: td.num_stops,
                departureStop: td.departure_stop.name,
                arrivalStop: td.arrival_stop.name,
                isTransit: true,
                isWalking: false,
              });
            } else {
              // Walking transfer
              segments.push({
                coords,
                color: '#888888',
                isTransit: false,
                isWalking: true,
              });
            }
          }

          return {
            duration: leg.duration.value,
            distance: leg.distance?.value || 0,
            durationText: leg.duration.text,
            segments,
            transitLines,
            warnings: route.warnings || [],
          };
        });

        resolve(routes);
      }
    );
  });
}

function friendlyStatus(status) {
  const map = {
    NOT_FOUND: 'Origin or destination not found by Google Maps.',
    ZERO_RESULTS: 'No transit route found between these points.',
    MAX_WAYPOINTS_EXCEEDED: 'Too many waypoints.',
    INVALID_REQUEST: 'Invalid request — check your inputs.',
    REQUEST_DENIED: 'API key denied — ensure the Directions API is enabled.',
    OVER_DAILY_LIMIT: 'Google Maps API daily quota exceeded.',
    OVER_QUERY_LIMIT: 'Too many requests — try again shortly.',
    UNKNOWN_ERROR: 'Google Maps returned an unknown error.',
  };
  return map[status] || `Directions request failed: ${status}`;
}
