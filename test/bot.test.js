import test from 'node:test';
import assert from 'node:assert/strict';
import { parse, handle } from '../src/commands.js';
import { quoteItems, clearCache } from '../src/quote.js';
import { chunk } from '../src/format.js';
import { createYoupin } from '../src/youpin.js';

test('parse modos', () => {
  assert.deepEqual(parse('!cotar 7656119000000000 compra'), { cmd: 'cotar', mode: 'compra', rest: '7656119000000000' });
  assert.equal(parse('!cotar x').mode, 'menor');
  assert.equal(parse('!compra x').mode, 'compra');
  assert.equal(parse('!preco AK-47 | Redline (Field-Tested) compra').rest, 'AK-47 | Redline (Field-Tested)');
  assert.equal(parse('oi'), null);
});

const provider = {
  currency: 'USD',
  lowestListing: async (n) => ({ A: 10, B: 5 })[n] ?? null,
  highestBuyOrder: async (n) => ({ A: 8, B: 4 })[n] ?? null,
};

test('quoteItems soma e ordena, separa sem preço', async () => {
  clearCache();
  const q = await quoteItems({ items: [{ name: 'A', count: 2 }, { name: 'B', count: 1 }, { name: 'C', count: 1 }], mode: 'menor', provider, rate: 0.8, factor: 1 });
  assert.equal(q.totalSrc, 25);
  assert.equal(q.totalBrl, 20);
  assert.equal(q.rows[0].name, 'A');
  assert.equal(q.missing[0].name, 'C');
  clearCache();
  const c = await quoteItems({ items: [{ name: 'A', count: 1 }], mode: 'compra', provider, rate: 1, factor: 0.5 });
  assert.equal(c.totalSrc, 4);
});

test('falha total propaga erro', async () => {
  clearCache();
  const bad = { lowestListing: async () => { throw new Error('token'); } };
  await assert.rejects(quoteItems({ items: [{ name: 'A', count: 1 }], mode: 'menor', provider: bad, rate: 1 }), /token/);
});

test('fluxo completo com Steam e FX simulados', async () => {
  clearCache();
  process.env.USD_BRL_RATE = '';
  const fetchImpl = async (url) => {
    if (url.includes('/inventory/')) return { ok: true, status: 200, json: async () => ({
      assets: [{ classid: '1', instanceid: '0', amount: '1' }, { classid: '1', instanceid: '0', amount: '1' }],
      descriptions: [{ classid: '1', instanceid: '0', marketable: 1, market_hash_name: 'A' }],
    }) };
    return { ok: true, status: 200, json: async () => ({ USDBRL: { bid: '0.75' } }) };
  };
  const out = await handle('!cotar 76561190000000000 compra', { provider, fetchImpl });
  assert.match(out[0], /Maior ordem de compra/);
  assert.match(out[0], /US\$16\.00/);
});

test('youpin: menor anúncio e maior compra com respostas simuladas', async () => {
  const fetchImpl = async (url) => ({ ok: true, status: 200, json: async () =>
    url.includes('GetCsGoPagedList')
      ? { Data: { CommodityList: [{ CommodityName: 'A', Price: '12.5', TemplateId: 9 }, { CommodityName: 'A', Price: '11.0', TemplateId: 9 }, { CommodityName: 'A (StatTrak)', Price: '1' }] } }
      : { Data: { response: [{ unitPrice: 9 }, { unitPrice: 9.5 }] } } });
  const y = createYoupin({ fetchImpl, cfg: { youpinBaseUrl: 'x', youpinToken: 't' } });
  assert.equal(await y.lowestListing('A'), 11);
  assert.equal(await y.highestBuyOrder('A'), 9.5);
});

test('chunk respeita limite', () => {
  const parts = chunk(Array(100).fill('linha de teste').join('\n'), 200);
  assert.ok(parts.every((p) => p.length <= 200));
});

import { createCsgotrader } from '../src/csgotrader.js';
test('csgotrader: menor anúncio e maior ordem', async () => {
  const fetchImpl = async () => ({ ok: true, status: 200, json: async () => ({ A: { starting_at: { price: 3.5 }, highest_order: { price: 2.9 } }, B: { starting_at: { price: 1 } } }) });
  const c = createCsgotrader({ fetchImpl, cfg: { csgotraderUrls: ['u'], cacheTtlMs: 1000 } });
  assert.equal(await c.lowestListing('A'), 3.5);
  assert.equal(await c.highestBuyOrder('A'), 2.9);
  assert.equal(await c.highestBuyOrder('B'), null);
  assert.equal(await c.lowestListing('Z'), null);
});

import { resolveSteamId } from '../src/steam.js';
test('link de troca vira SteamID64', async () => {
  assert.equal(await resolveSteamId('https://steamcommunity.com/tradeoffer/new/?partner=1&token=abc'), '76561197960265729');
  assert.equal(await resolveSteamId('https://steamcommunity.com/tradeoffer/new/?partner=123456789&token=xyz'), '76561198083722517');
});

import { fetchTradeInventory } from '../src/steam.js';
test('inventário pela janela de troca', async () => {
  const cfg = { steamSessionId: 's', steamLoginSecure: 'l' };
  let seen;
  const fetchImpl = async (url, opts) => { seen = { url, opts }; return { ok: true, status: 200, json: async () => ({
    success: true, rgInventory: { 1: { id: '1', classid: '5', instanceid: '0', amount: '1' }, 2: { id: '2', classid: '5', instanceid: '0', amount: '1' } },
    rgDescriptions: { '5_0': { market_hash_name: 'A', tradable: 1, marketable: 1 } }, more: false }) }; };
  const url = 'https://steamcommunity.com/tradeoffer/new/?partner=1&token=abc';
  assert.deepEqual(await fetchTradeInventory(url, fetchImpl, cfg), [{ name: 'A', count: 2 }]);
  assert.match(seen.url, /partner=76561197960265729/);
  assert.equal(seen.opts.headers.referer, url);
  await assert.rejects(fetchTradeInventory(url, fetchImpl, {}), /STEAM_SESSIONID/);
});
