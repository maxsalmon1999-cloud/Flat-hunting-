import puppeteer from 'puppeteer';

export async function scrapeSpareRoom({ minPrice = 600, maxPrice = 2500 } = {}) {
  const searchUrl = new URL('https://www.spareroom.co.uk/flatshare/london');
  searchUrl.searchParams.set('min_price', String(minPrice));
  searchUrl.searchParams.set('max_price', String(maxPrice));
  searchUrl.searchParams.set('per', 'pcm');
  searchUrl.searchParams.set('search_type', 'flatshare');
  searchUrl.searchParams.set('max_per_page', '20');
  searchUrl.searchParams.set('sort_by', 'last_updated');
  searchUrl.searchParams.set('rooms_for', '1');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
    ],
  });

  try {
    const page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    );
    await page.setViewport({ width: 1280, height: 900 });

    // Remove webdriver flag
    await page.evaluateOnNewDocument(() => {
      delete Object.getPrototypeOf(navigator).webdriver;
    });

    await page.goto(searchUrl.toString(), { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Dismiss cookie banner if present
    try {
      await page.waitForSelector('#onetrust-accept-btn-handler', { timeout: 4000 });
      await page.click('#onetrust-accept-btn-handler');
      await new Promise((r) => setTimeout(r, 800));
    } catch { /* no banner */ }

    // Wait for listings to appear
    await page.waitForSelector('.listing-result, article[data-listing-id]', { timeout: 10000 }).catch(() => {});

    const listings = await page.evaluate(() => {
      // Try modern selector first, fall back to legacy
      const items = [
        ...document.querySelectorAll('article[data-listing-id]'),
        ...document.querySelectorAll('.listing-result'),
      ];

      const seen = new Set();
      const results = [];

      items.forEach((item) => {
        const id = item.dataset.listingId || item.dataset.id;
        const uniqueKey = id || item.querySelector('a')?.href;
        if (!uniqueKey || seen.has(uniqueKey)) return;
        seen.add(uniqueKey);

        const titleEl =
          item.querySelector('[class*="listing-result__title"]') ||
          item.querySelector('h2, h3, .title');
        const priceEl =
          item.querySelector('[class*="price"] strong') ||
          item.querySelector('[class*="price"] span') ||
          item.querySelector('[class*="price"]');
        const locationEl =
          item.querySelector('[class*="location"]') ||
          item.querySelector('[class*="area"]') ||
          item.querySelector('address');
        const linkEl = item.querySelector('a[href*="flatshare"], a[href*="room"]') || item.querySelector('a');

        const imgs = [...item.querySelectorAll('img')]
          .map((img) => img.src || img.dataset.src || img.dataset.lazySrc)
          .filter((src) => src && !src.includes('data:') && src.startsWith('http'));

        const priceText = priceEl?.textContent?.trim() || '';
        const priceMatch = priceText.match(/[\d,]+/);
        const price = priceMatch ? parseInt(priceMatch[0].replace(/,/g, ''), 10) : null;

        // Try to extract lat/lng from data attributes
        const lat = parseFloat(item.dataset.lat || item.dataset.latitude || '');
        const lng = parseFloat(item.dataset.lng || item.dataset.lon || item.dataset.longitude || '');

        results.push({
          id: `sr_${id || Math.random().toString(36).slice(2)}`,
          source: 'SpareRoom',
          title: titleEl?.textContent?.trim() || 'Flat share listing',
          price,
          area: locationEl?.textContent?.trim() || 'London',
          url: linkEl
            ? new URL(linkEl.getAttribute('href'), 'https://www.spareroom.co.uk').href
            : '',
          images: imgs.slice(0, 4),
          amenities: [],
          latlng: !isNaN(lat) && !isNaN(lng) ? { lat, lng } : null,
        });
      });

      return results;
    });

    return listings.filter((l) => l.url);
  } finally {
    await browser.close();
  }
}
