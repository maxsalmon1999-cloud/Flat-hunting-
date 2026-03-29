// Rightmove embeds JSON data in a script tag as window.jsonModel.
// This avoids needing Puppeteer for Rightmove (they server-render initial state).

const LONDON_REGION = 'REGION%5E87490'; // London region identifier

export async function scrapeRightmove({ minPrice = 600, maxPrice = 2500, minBedrooms = 1 } = {}) {
  const url =
    `https://www.rightmove.co.uk/property-to-rent/find.html` +
    `?locationIdentifier=${LONDON_REGION}` +
    `&minPrice=${minPrice}` +
    `&maxPrice=${maxPrice}` +
    `&minBedrooms=${minBedrooms}` +
    `&propertyTypes=flat` +
    `&includeLetAgreed=false` +
    `&sortType=6`; // most recent

  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-GB,en;q=0.9',
      'Cache-Control': 'no-cache',
    },
  });

  if (!res.ok) {
    throw new Error(`Rightmove returned HTTP ${res.status}`);
  }

  const html = await res.text();

  // Rightmove stores property data in window.jsonModel inside a <script> block
  const jsonModelMatch = html.match(/window\.jsonModel\s*=\s*(\{[\s\S]*?\});\s*<\/script>/);
  if (!jsonModelMatch) {
    // Try alternate pattern used in some Rightmove pages
    const altMatch = html.match(/"properties"\s*:\s*(\[[\s\S]*?\])\s*,\s*"resultCount"/);
    if (!altMatch) {
      throw new Error('Could not extract property data from Rightmove — their HTML format may have changed');
    }
    const props = JSON.parse(altMatch[1]);
    return props.slice(0, 20).map(mapRightmoveProp);
  }

  const model = JSON.parse(jsonModelMatch[1]);
  const properties = model.properties || [];
  return properties.slice(0, 20).map(mapRightmoveProp);
}

function mapRightmoveProp(p) {
  const images = (p.propertyImages?.images || [])
    .slice(0, 4)
    .map((img) => img.srcUrl || img.url)
    .filter(Boolean);

  // Rightmove price is sometimes in pence (pricePencePerMonth) or pounds (price.amount)
  let price = p.price?.amount || null;
  if (!price && p.displayPrices) {
    const monthly = p.displayPrices.find((dp) => dp.displayPrice?.includes('pcm'));
    if (monthly) {
      const match = monthly.displayPrice.match(/[\d,]+/);
      if (match) price = parseInt(match[0].replace(/,/g, ''), 10);
    }
  }

  const area =
    p.displayAddress?.split(',').slice(1).join(',').trim() ||
    p.displayAddress ||
    'London';

  return {
    id: `rm_${p.id}`,
    source: 'Rightmove',
    title: p.displayAddress || p.propertySubType || 'Flat to rent',
    price,
    area,
    url: p.propertyUrl
      ? `https://www.rightmove.co.uk${p.propertyUrl}`
      : `https://www.rightmove.co.uk/properties/${p.id}`,
    images,
    amenities: extractRightmoveAmenities(p),
    latlng:
      p.location?.latitude && p.location?.longitude
        ? { lat: p.location.latitude, lng: p.location.longitude }
        : null,
  };
}

function extractRightmoveAmenities(p) {
  const amenities = [];
  const desc = (p.summary || p.displayAddress || '').toLowerCase();
  if (desc.includes('dishwasher')) amenities.push('Dishwasher');
  if (desc.includes('washing machine') || desc.includes('washer')) amenities.push('Washing machine');
  if (desc.includes('dryer') || desc.includes('tumble')) amenities.push('Dryer');
  if (desc.includes('living room') || desc.includes('reception')) amenities.push('Living room');
  if (desc.includes('garden') || desc.includes('terrace') || desc.includes('balcony')) amenities.push('Outdoor space');
  if (desc.includes('parking')) amenities.push('Parking');
  if (desc.includes('bills')) amenities.push('Bills included');
  if (desc.includes('furnished')) amenities.push('Furnished');
  return amenities;
}
