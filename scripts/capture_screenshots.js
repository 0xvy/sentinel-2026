const { chromium } = require('../frontend/node_modules/@playwright/test');
const fs = require('fs');
const path = require('path');

async function capture() {
  const dir = path.resolve(__dirname, '../docs/screenshots');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  console.log('Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // 1. Full Tactical Command Center
  await page.screenshot({ path: path.join(dir, '01_sentinel_command_center.png') });
  console.log('Saved 01_sentinel_command_center.png');

  // 2. Click preset button for GJ01ER8842
  const buttons = await page.$$('button');
  for (const b of buttons) {
    const text = await b.innerText();
    if (text.includes('GJ01ER8842')) {
      await b.click();
      await page.waitForTimeout(1500);
      break;
    }
  }
  await page.screenshot({ path: path.join(dir, '02_trajectory_reconstruction_GJ01ER8842.png') });
  console.log('Saved 02_trajectory_reconstruction_GJ01ER8842.png');

  // 3. Open PCR Dispatch Modal
  for (const b of buttons) {
    const text = await b.innerText();
    if (text.includes('DISPATCH') || text.includes('INTERCEPT') || text.includes('PCR')) {
      await b.click();
      await page.waitForTimeout(1000);
      break;
    }
  }
  await page.screenshot({ path: path.join(dir, '03_pcr_van_dispatch_intercept.png') });
  console.log('Saved 03_pcr_van_dispatch_intercept.png');

  // Close modal with Escape key
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // 4. Open Forensic Drawer if available
  const allButtons = await page.$$('button');
  for (const b of allButtons) {
    const text = await b.innerText();
    if (text.includes('FORENSIC') || text.includes('AUDIT') || text.includes('BSA')) {
      await b.click();
      await page.waitForTimeout(1000);
      break;
    }
  }
  await page.screenshot({ path: path.join(dir, '04_forensic_chain_of_custody_bsa2023.png') });
  console.log('Saved 04_forensic_chain_of_custody_bsa2023.png');

  await browser.close();
  console.log('ALL SCREENSHOTS CAPTURED SUCCESSFULLY!');
}

capture().catch(err => {
  console.error(err);
  process.exit(1);
});
