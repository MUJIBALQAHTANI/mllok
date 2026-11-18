/* Runs in GitHub CI with isolated Playwright, never against player accounts. */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {quoteTraining, decodeTraining} from './training-engine.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const docs = path.join(root, 'docs');
await mkdir(docs, {recursive: true});
const results = [];
const check = (name, condition) => {
  assert.ok(condition, name);
  results.push({name, pass: true});
};
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = path.resolve(root, '.' + (pathname === '/' ? '/training.html' : pathname));
    if (!file.startsWith(root + path.sep)) throw new Error('path');
    const bytes = await readFile(file);
    res.setHeader('Content-Type', file.endsWith('.mjs') ? 'text/javascript'
      : file.endsWith('.css') ? 'text/css'
      : file.endsWith('.html') ? 'text/html' : 'application/octet-stream');
    res.end(bytes);
  } catch { res.statusCode = 404; res.end('Not found'); }
});
await new Promise(resolve => server.listen(4174, '127.0.0.1', resolve));
const browser = await chromium.launch();
let failure = null;
const widths = [320, 390, 428, 1280];

async function setInputs(page, {unitId, count, forge, buildingLevel}) {
  await page.locator('#unitSelect').selectOption(unitId);
  await page.locator('#buildingLevel').selectOption(String(buildingLevel));
  await page.locator('#forgeLevel').selectOption(String(forge));
  await page.locator('#trainCount').fill(String(count));
  await page.locator('#calculateTraining').click();
}

async function field(page, key) {
  if (key === 'resource-total') {
    return page.locator('#resourceCosts [data-resource]').evaluateAll(elements =>
      elements.reduce((sum, element) => sum + Number(element.dataset.value), 0));
  }
  const selectors = {
    'clay-total': '#resourceCosts [data-resource="clay"]',
    'iron-total': '#resourceCosts [data-resource="iron"]',
    'attack-unit': '#combatPerUnit [data-stat="attack"]',
    gold: '#goldValue', seconds: '#timeValue', batches: '#batchCount',
  };
  // Locked resource fields are intentionally absent from the training UI.
  if ((key === 'clay-total' || key === 'iron-total') && await page.locator(selectors[key]).count() === 0) return 0;
  const raw = await page.locator(selectors[key]).getAttribute(key === 'seconds' ? 'data-seconds' : 'data-value');
  assert.notEqual(raw, null, `Missing data-value on ${key}`);
  return Number(raw);
}

async function exportQuote(page) {
  const ready = page.waitForEvent('download');
  await page.locator('#downloadQuote').click();
  const download = await ready;
  return JSON.parse(await readFile(await download.path(), 'utf8'));
}

try {
  for (const width of widths) {
    const context = await browser.newContext({
      viewport: {width, height: 900}, permissions: ['clipboard-read', 'clipboard-write'],
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:4174/');
    await page.locator('#unitSelect option').first().waitFor({state: 'attached'});
    check(`page fits viewport ${width}`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));

    const rosterCounts = [];
    for (const building of ['barracks', 'stable', 'workshop']) {
      await page.locator(`[data-building="${building}"]`).click();
      rosterCounts.push(await page.locator('#unitSelect option').count());
    }
    check(`rosters filtered 3/4/2 ${width}`, rosterCounts.join('/') === '3/4/2');

    await page.locator('[data-building="stable"]').click();
    const cavalry = {unitId: 'LightCavalry', count: 100, forge: 3, buildingLevel: 4};
    await setInputs(page, cavalry);
    check(`cavalry below5 uses wheat wood only ${width}`,
      await field(page, 'clay-total') === 0 && await field(page, 'iron-total') === 0
      && await page.locator('#resourceCosts [data-resource]').count() === 2);
    check(`forge3 attack143 ${width}`, await field(page, 'attack-unit') === 143);
    const budget = await field(page, 'resource-total');
    await setInputs(page, {...cavalry, buildingLevel: 5});
    check(`level5 adds clay only ${width}`,
      await field(page, 'clay-total') > 0 && await field(page, 'iron-total') === 0
      && await page.locator('#resourceCosts [data-resource]').count() === 3);
    await setInputs(page, {...cavalry, buildingLevel: 10});
    check(`level10 all four resources and conserved budget ${width}`,
      await field(page, 'clay-total') > 0 && await field(page, 'iron-total') > 0
      && await field(page, 'resource-total') === budget
      && await page.locator('#resourceCosts [data-resource]').count() === 4);

    const advanced = {...cavalry, forge: 20, buildingLevel: 10};
    const expected = quoteTraining(advanced);
    await setInputs(page, advanced);
    check(`forge20 strength and actual training price ${width}`,
      await field(page, 'attack-unit') === 253.5
      && await field(page, 'gold') === expected.totalGold
      && await field(page, 'seconds') === expected.seconds);
    check(`training quote contains no cargo or movement speed ${width}`,
      !/الحمولة|سرعة الحركة|سرعة التحرك/.test(await page.locator('#quotePanel').innerText()));

    await page.locator('#unitDetails').click();
    await page.locator('#unitDialog[open]').waitFor();
    check(`unit strength details fit ${width}`,
      await page.locator('#unitDialog').evaluate(el => el.scrollWidth <= el.clientWidth));
    await page.locator('[data-close="unitDialog"]').click();

    await page.locator('#allLevels > summary').click();
    check(`building axis has30 levels ${width}`, await page.locator('#levelsGrid details').count() === 30);
    await page.locator('#levelsAxis').selectOption('forge');
    await page.locator('#levelsGrid details').first().locator('summary').click();
    check(`forge axis30 and expanded row fit ${width}`,
      await page.locator('#levelsGrid details').count() === 30
      && await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.locator('#allLevels > summary').click();

    await page.locator('#shareTraining').click();
    const url = await page.locator('#shareOutput').inputValue();
    const params = decodeTraining(new URL(url).hash.replace(/^#t=/, ''));
    const shared = await context.newPage();
    shared.on('pageerror', error => errors.push(error.message));
    await shared.goto(url);
    await shared.locator('#unitSelect option').first().waitFor({state: 'attached'});
    check(`shared training preserves all selections ${width}`,
      params.unitId === advanced.unitId && params.forge === advanced.forge
      && params.buildingLevel === advanced.buildingLevel && params.count === advanced.count
      && await shared.locator('#unitSelect').inputValue() === advanced.unitId
      && await shared.locator('#forgeLevel').inputValue() === String(advanced.forge)
      && await shared.locator('#buildingLevel').inputValue() === String(advanced.buildingLevel)
      && await shared.locator('#trainCount').inputValue() === String(advanced.count));
    await shared.close();

    const exported = await exportQuote(page);
    const savedQuote = exported.quote ?? exported;
    check(`export matches calculated quantities resources gold ${width}`,
      savedQuote.count === expected.count && savedQuote.unitId === expected.unitId
      && savedQuote.totalGold === expected.totalGold && savedQuote.seconds === expected.seconds
      && JSON.stringify(savedQuote.resources) === JSON.stringify(expected.resources));

    await page.locator('[data-building="barracks"]').click();
    await setInputs(page, {unitId: 'LightInfantry', count: 1000, forge: 1, buildingLevel: 1});
    check(`capacity100 produces ten real batches and1000gold ${width}`,
      await field(page, 'batches') === 10 && await field(page, 'gold') === 1000);

    await page.locator('#trainCount').fill('0');
    await page.locator('#calculateTraining').click();
    check(`invalid count clears usable quote and blocks sharing ${width}`,
      await page.locator('#trainingError').isVisible()
      && await page.locator('#shareTraining').isDisabled()
      && await page.locator('#downloadQuote').isDisabled()
      && await page.locator('#goldValue').count() === 0);

    await setInputs(page, {unitId: 'LightInfantry', count: 500, forge: 5, buildingLevel: 10});
    check(`final page fits and no JS exceptions ${width}`,
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth) && errors.length === 0);
    if (width === 390) {
      await page.screenshot({path: path.join(docs, 'training-mobile-390.png'), fullPage: true});
      await page.locator('#quotePanel').scrollIntoViewIfNeeded();
      await page.screenshot({path: path.join(docs, 'training-costs-mobile.png')});
    }
    if (width === 1280) await page.screenshot({path: path.join(docs, 'training-desktop.png'), fullPage: true});
    await context.close();
  }

  if (process.env.PUBLIC_TRAINING_URL) {
    const page = await browser.newPage({viewport: {width: 390, height: 900}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.env.PUBLIC_TRAINING_URL);
    await page.locator('#unitSelect option').first().waitFor({state: 'attached'});
    await page.locator('[data-building="stable"]').click();
    await setInputs(page, {unitId: 'LightCavalry', count: 100, forge: 20, buildingLevel: 4});
    check('published cavalry below5 has no locked resource costs',
      await field(page, 'clay-total') === 0 && await field(page, 'iron-total') === 0
      && await field(page, 'attack-unit') === 253.5);
    await setInputs(page, {unitId: 'LightCavalry', count: 100, forge: 20, buildingLevel: 10});
    check('published full-era quote and mobile layout',
      await field(page, 'clay-total') === 15000 && await field(page, 'iron-total') === 30000
      && await field(page, 'gold') === 579
      && await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
      && errors.length === 0);
    await page.locator('#quotePanel').scrollIntoViewIfNeeded();
    await page.screenshot({path: path.join(docs, 'training-published-mobile.png')});
    await page.close();
  }
} catch (error) {
  failure = error;
  console.error(error);
} finally {
  await writeFile(path.join(docs, 'training-browser-verification.json'), JSON.stringify({
    status: failure ? 'FAIL' : 'PASS', checks: results.length, widths,
    engine: 'Chromium viewport emulation, not physical iPhone',
    generatedAt: new Date().toISOString(), results, error: failure?.stack ?? null,
  }, null, 2));
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
if (failure) process.exit(1);
console.log(`TRAINING_BROWSER_PASS ${results.length} checks`);
