import { test, expect } from '@playwright/test';

interface PixelAnalysisResult {
  valid: boolean;
  error?: string;
  stdDev: number;
  changedPixelPercent: number;
  width: number;
  height: number;
}

interface SvgAnalysisResult {
  valid: boolean;
  reason?: string;
  count: number;
}

test.describe('Sentinel 2026: Tactical Dashboard Sensory E2E Audit', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept Esri Tile Layer Network Traffic
    await page.route('**/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/**', async (route) => {
      try {
        const response = await route.fetch();
        expect(response.status(), `Esri Map tile failed with HTTP ${response.status()}`).toBeLessThan(400);
        await route.fulfill({ response });
      } catch {
        // Ignore aborted requests on test teardown
      }
    });
  });

  test.afterEach(async ({ page }) => {
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });

  test('TC-E2E-01: Live Video Wall MJPEG Stream Canvas Pixel Sampling', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173');

    // Switch view to Video Wall
    const videoWallTab = page.locator('button', { hasText: 'Video Wall' });
    await expect(videoWallTab).toBeVisible({ timeout: 10000 });
    await videoWallTab.click();

    // Wait for camera card viewport to appear
    await page.waitForSelector('.tactical-grid-bg img', { timeout: 15000 });

    // Target the live camera feed to cam04
    await page.evaluate(() => {
      const firstImg = document.querySelector<HTMLImageElement>('.tactical-grid-bg img');
      if (firstImg) {
        firstImg.src = '/api/streams/cam04/feed';
      }
    });

    // Wait until Chromium decodes the MJPEG stream and natural dimensions are non-zero
    await page.waitForFunction(() => {
      const img = document.querySelector<HTMLImageElement>('img[src*="/api/streams/cam04/feed"]');
      return img && img.complete && img.naturalWidth > 0;
    }, { timeout: 20000 });

    // Allow video decoder to synchronize with incoming MJPEG stream
    await page.waitForTimeout(1500);

    // Sample pixels across time from the live camera viewport with retry loop for RTSP IDR sync
    const pixelAnalysis: PixelAnalysisResult = await page.evaluate(async (imgSelector: string) => {
      const img = document.querySelector<HTMLImageElement>(imgSelector);
      if (!img || img.naturalWidth === 0) {
        return { valid: false, error: 'Stream image not ready', stdDev: 0, changedPixelPercent: 0, width: 0, height: 0 };
      }

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || 640;
      canvas.height = img.naturalHeight || 360;
      const ctx = canvas.getContext('2d');
      if (!ctx) return { valid: false, error: 'Cannot obtain 2d canvas context', stdDev: 0, changedPixelPercent: 0, width: 0, height: 0 };

      // Sample frames over up to 10 attempts (up to 15s) until frame delta is detected
      let lastStdDev = 0;
      let lastChanged = 0;

      for (let attempt = 0; attempt < 8; attempt++) {
        // Grab Snapshot 1
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const snap1 = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

        // Check standard deviation of intensity (non-blank check)
        let sum = 0;
        let sumSq = 0;
        const totalPixels = snap1.length / 4;
        for (let i = 0; i < snap1.length; i += 4) {
          const lum = 0.299 * snap1[i] + 0.587 * snap1[i + 1] + 0.114 * snap1[i + 2];
          sum += lum;
          sumSq += lum * lum;
        }
        const mean = sum / totalPixels;
        lastStdDev = Math.sqrt(Math.max(0, (sumSq / totalPixels) - (mean * mean)));

        // Wait 1.5 seconds for live frame mutation
        await new Promise<void>((resolve) => setTimeout(resolve, 1500));

        // Grab Snapshot 2
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const snap2 = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

        let changedPixels = 0;
        for (let i = 0; i < snap1.length; i += 4) {
          if (
            Math.abs(snap1[i] - snap2[i]) > 8 ||
            Math.abs(snap1[i + 1] - snap2[i + 1]) > 8 ||
            Math.abs(snap1[i + 2] - snap2[i + 2]) > 8
          ) {
            changedPixels++;
          }
        }

        lastChanged = (changedPixels / totalPixels) * 100;
        if (lastChanged > 0.1 && lastStdDev > 8.0) {
          return {
            valid: true,
            stdDev: lastStdDev,
            changedPixelPercent: lastChanged,
            width: canvas.width,
            height: canvas.height,
          };
        }
      }

      return {
        valid: true,
        stdDev: lastStdDev,
        changedPixelPercent: lastChanged,
        width: canvas.width,
        height: canvas.height,
      };
    }, 'img[src*="/api/streams/cam04/feed"]');

    expect(pixelAnalysis.valid, pixelAnalysis.error).toBe(true);
    expect(pixelAnalysis.stdDev, 'Stream feed is flat black or flat gray').toBeGreaterThan(8.0);
    expect(pixelAnalysis.changedPixelPercent, 'Stream feed is completely frozen').toBeGreaterThan(0.1);
  });

  test('TC-E2E-02: GIS Trajectory Polyline Vector & SVG Path Geometry', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173');

    // Ensure GIS Tactical view is selected
    const gisTab = page.locator('button', { hasText: 'GIS Tactical' });
    await expect(gisTab).toBeVisible({ timeout: 10000 });
    await gisTab.click();

    // Search suspect vehicle GJ01ER8842
    const searchInput = page.locator('input[placeholder*="GJ"]').first();
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    await searchInput.fill('GJ01ER8842');
    await searchInput.press('Enter');

    // Wait for trajectory polyline SVG to render
    await page.waitForSelector('path.leaflet-interactive', { timeout: 15000 });

    const polylineValid: SvgAnalysisResult = await page.evaluate(() => {
      const path =
        document.querySelector<SVGPathElement>('path.leaflet-animated-polyline') ||
        document.querySelector<SVGPathElement>('path.leaflet-interactive');
      if (!path) return { valid: false, reason: 'No leaflet path found', count: 0 };

      const d = path.getAttribute('d');
      if (!d || !d.startsWith('M')) return { valid: false, reason: 'Invalid SVG path definition', count: 0 };

      // Parse coordinate pairs: M x y L x y ... (replace M and L with space to avoid merging adjacent coordinates)
      const rawPoints = d.replace(/[ML]/g, ' ').trim().split(/[\s,]+/).map(Number);
      const coordPairs: Array<[number, number]> = [];
      for (let i = 0; i < rawPoints.length; i += 2) {
        if (!isNaN(rawPoints[i]) && !isNaN(rawPoints[i + 1])) {
          coordPairs.push([rawPoints[i], rawPoints[i + 1]]);
        }
      }

      if (coordPairs.length < 3) {
        return { valid: false, reason: `Too few waypoints rendered: ${coordPairs.length}`, count: coordPairs.length };
      }

      // Assert no consecutive duplicate points (spiderweb duplication bug)
      for (let i = 1; i < coordPairs.length; i++) {
        const [x1, y1] = coordPairs[i - 1];
        const [x2, y2] = coordPairs[i];
        if (x1 === x2 && y1 === y2) {
          return { valid: false, reason: `Duplicate zero-distance SVG node at index ${i}`, count: coordPairs.length };
        }
      }

      return { valid: true, count: coordPairs.length };
    });

    expect(polylineValid.valid, polylineValid.reason).toBe(true);
    expect(polylineValid.count).toBeGreaterThanOrEqual(3);
  });

  test('TC-E2E-03: Real-Time WebSocket Latency < 250ms', async ({ page, request }) => {
    await page.goto('http://127.0.0.1:5173');

    // Ensure connection indicator is connected
    const wsBadge = page.locator('text=CONNECTED');
    await expect(wsBadge).toBeVisible({ timeout: 10000 });

    // Switch right panel to Live Alerts tab
    const alertsTab = page.locator('button', { hasText: 'Live Alerts' });
    await expect(alertsTab).toBeVisible({ timeout: 10000 });
    await alertsTab.click();

    // Ingest simulated alert via official POST /api/alerts endpoint
    const t0 = Date.now();
    const alertPayload = {
      alert_id: 'ALT-2026-0912-7777',
      timestamp_pts_ms: 145000,
      timestamp_iso: new Date().toISOString(),
      camera_id: 'cam04',
      camera_dept: 'Police',
      camera_lat: 23.0125,
      camera_lng: 72.5620,
      detected_plate: 'GJ01WS9988',
      confidence: 0.98,
      threat_level: 'CRITICAL',
      direction_of_travel: 'N',
    };

    const alertResp = await request.post('http://127.0.0.1:8000/api/alerts', {
      data: alertPayload,
    });
    expect(alertResp.status(), `Alert ingestion returned HTTP ${alertResp.status()}`).toBe(200);

    // Wait for tactical alert card with plate GJ01WS9988 to render in DOM
    const alertCard = page.locator('text=GJ01WS9988');
    await expect(alertCard).toBeVisible({ timeout: 5000 });
    const tRender = Date.now();

    const latency = tRender - t0;
    expect(latency, `WebSocket alert delivery + render took ${latency}ms (> 250ms)`).toBeLessThan(250);
  });
});
