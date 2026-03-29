import express from 'express';
import cors from 'cors';
import { readFile, writeFile, access } from 'fs/promises';
import { constants } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { scrapeSpareRoom } from './scrapers/spareroom.js';
import { scrapeRightmove } from './scrapers/rightmove.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SAVED_PATH = join(__dirname, 'saved-listings.json');

const app = express();
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:4173'] }));
app.use(express.json({ limit: '2mb' }));

// ─── Isochrone proxy ──────────────────────────────────────────────────────────
app.post('/api/isochrone', async (req, res) => {
  const { sources, mode, travelTimeSecs, departureTime, apiKey } = req.body;

  if (!apiKey?.trim()) {
    return res.status(400).json({
      error: 'TravelTime API key required. Get a free key at traveltime.com, then enter it as APP_ID:API_KEY',
    });
  }

  const colonIdx = apiKey.indexOf(':');
  if (colonIdx < 1) {
    return res.status(400).json({ error: 'API key must be in format APP_ID:API_KEY' });
  }

  const appId = apiKey.slice(0, colonIdx).trim();
  const apiKeyStr = apiKey.slice(colonIdx + 1).trim();

  const body = {
    departure_searches: sources.map((s) => ({
      id: s.id,
      coords: { lat: s.lat, lng: s.lng },
      transportation: { type: mode },
      departure_time: departureTime,
      travel_time: travelTimeSecs,
    })),
  };

  try {
    const ttRes = await fetch('https://api.traveltimeapp.com/v4/time-map', {
      method: 'POST',
      headers: {
        'X-Application-Id': appId,
        'X-Api-Key': apiKeyStr,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!ttRes.ok) {
      const errText = await ttRes.text();
      return res.status(ttRes.status).json({ error: `TravelTime API error (${ttRes.status}): ${errText}` });
    }

    const data = await ttRes.json();

    const isochrones = data.results.map((result) => {
      const src = sources.find((s) => s.id === result.search_id);
      return {
        id: result.search_id,
        colorIdx: src?.colorIdx ?? 0,
        shapes: result.shapes,
      };
    });

    res.json({ isochrones });
  } catch (e) {
    res.status(500).json({ error: `Failed to reach TravelTime API: ${e.message}` });
  }
});

// ─── Listings scraper ─────────────────────────────────────────────────────────
app.post('/api/listings', async (req, res) => {
  const { minPrice, maxPrice, amenities } = req.query;
  const { drawnArea } = req.body;
  const amenityList = amenities ? amenities.split(',').filter(Boolean) : [];

  const [srResult, rmResult] = await Promise.allSettled([
    scrapeSpareRoom({ minPrice: minPrice || 600, maxPrice: maxPrice || 2500 }),
    scrapeRightmove({ minPrice: minPrice || 600, maxPrice: maxPrice || 2500 }),
  ]);

  let listings = [
    ...(srResult.status === 'fulfilled' ? srResult.value : []),
    ...(rmResult.status === 'fulfilled' ? rmResult.value : []),
  ];

  // Filter by drawn polygon if provided
  if (drawnArea?.geometry?.coordinates?.length) {
    const ring = drawnArea.geometry.coordinates[0]; // [[lng, lat], ...]
    listings = listings.filter((l) => {
      if (!l.latlng) return true; // include if no coords available
      return pointInPolygon([l.latlng.lng, l.latlng.lat], ring);
    });
  }

  res.json({
    listings,
    errors: {
      spareroom: srResult.status === 'rejected' ? srResult.reason?.message : null,
      rightmove: rmResult.status === 'rejected' ? rmResult.reason?.message : null,
    },
  });
});

// Ray-casting point-in-polygon (GeoJSON ring: [[lng, lat], ...])
function pointInPolygon([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

// ─── Saved listings ───────────────────────────────────────────────────────────
async function readSaved() {
  try {
    await access(SAVED_PATH, constants.F_OK);
    const raw = await readFile(SAVED_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeSaved(items) {
  await writeFile(SAVED_PATH, JSON.stringify(items, null, 2), 'utf8');
}

app.get('/api/saved', async (_req, res) => {
  try {
    res.json({ saved: await readSaved() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/saved', async (req, res) => {
  try {
    const { listing } = req.body;
    const saved = await readSaved();
    if (!saved.find((s) => s.id === listing.id)) {
      saved.unshift({ ...listing, savedAt: new Date().toISOString() });
      await writeSaved(saved);
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/saved/:id', async (req, res) => {
  try {
    const saved = await readSaved();
    await writeSaved(saved.filter((s) => s.id !== req.params.id));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(3001, () => {
  console.log('Flat-hunting server running at http://localhost:3001');
});
