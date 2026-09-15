const { chromium } = require('../frontend/node_modules/@playwright/test');
const fs = require('fs');
const path = require('path');

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  
  const svgPath = path.resolve(__dirname, '../docs/hld/sentinel_architecture_workflow.svg');
  const svg = fs.readFileSync(svgPath, 'utf8');
  const base64 = Buffer.from(svg).toString('base64');
  
  await page.setContent(`<!DOCTYPE html><html><body style="margin:0;padding:0;background:#030712;"><img src="data:image/svg+xml;base64,${base64}" width="1200" height="900" style="display:block;" /></body></html>`);
  
  const outPath = path.resolve(__dirname, '../docs/hld/sentinel_architecture_workflow.png');
  await page.screenshot({ path: outPath });
  await browser.close();
  console.log('PNG_SAVED_AT: ' + outPath);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
