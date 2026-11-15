// node render.js <html> shots <outdir> <i,j,...|all> [quality]   |   node render.js <html> pdf <out.pdf>
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const [file, mode, out, which, q] = process.argv.slice(2);
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1536, height: 864 } });
  await pg.goto('file://' + path.resolve(file)); await pg.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}.progress,.rail,.laser-pointer{display:none!important}html{scroll-behavior:auto!important}' }); await pg.waitForTimeout(1500);
  if (mode === 'pdf') {
    await pg.pdf({ path: out, width: '16in', height: '9in', printBackground: true });
  } else {
    const n = await pg.evaluate(() => document.querySelectorAll('.slide').length);
    const idx = which === 'all' ? [...Array(n).keys()] : which.split(',').map(Number);
    for (const i of idx) {
      await pg.evaluate(i => document.getElementById('s' + i).scrollIntoView(), i); await pg.waitForTimeout(120);
      await pg.screenshot({ path: `${out}/${String(i + 1).padStart(2, '0')}.png` });
    }
  }
  await b.close();
})();
