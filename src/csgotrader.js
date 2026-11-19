// Fonte de preços da extensão CS2 Trader (csgotrader.app): o mesmo JSON que a extensão baixa.
// Formato esperado por item: { starting_at: { price }, highest_order: { price } }
// (starting_at = menor anúncio, highest_order = maior ordem de compra). Valores em USD.
// Parser tolerante: aceita também número puro ou { price }.
import { config } from './config.js';

const toNum = (v) => {
  const n = Number(typeof v === 'object' && v !== null ? v.price : v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

export function createCsgotrader({ fetchImpl = fetch, cfg = config } = {}) {
  let data = null;
  let at = 0;

  async function load() {
    if (data && Date.now() - at < cfg.cacheTtlMs) return data;
    let lastErr;
    for (const url of cfg.csgotraderUrls) {
      try {
        const res = await fetchImpl(url, { headers: { 'user-agent': 'Mozilla/5.0 cota-o-bot' } });
        if (!res.ok) throw new Error(`${url} respondeu ${res.status}`);
        data = await res.json();
        at = Date.now();
        return data;
      } catch (e) { lastErr = e; }
    }
    throw new Error(`Não consegui baixar os preços do CS2 Trader: ${lastErr?.message}. Ajuste CSGOTRADER_URL.`);
  }

  const field = (key) => async (name) => {
    const d = await load();
    const item = d[name] ?? d.items_list?.[name];
    if (item === undefined) return null;
    return toNum(item?.[key] ?? (key === 'starting_at' ? item : null));
  };

  return {
    currency: 'USD',
    lowestListing: field('starting_at'),
    highestBuyOrder: field('highest_order'),
  };
}
