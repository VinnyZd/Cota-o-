// Monta a cotação: busca o preço de cada item (com cache e concorrência limitada) e soma.
import { config } from './config.js';

export const MODES = {
  menor: { label: 'Menor anúncio (YouPin898)', method: 'lowestListing' },
  compra: { label: 'Maior ordem de compra (YouPin898)', method: 'highestBuyOrder' },
};

const cache = new Map(); // `${mode}|${name}` -> { cny, at }

export function clearCache() { cache.clear(); }

async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    }),
  );
  return out;
}

export async function priceOf(provider, mode, name, ttl = config.cacheTtlMs) {
  const key = `${mode}|${name}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit.cny;
  const cny = await provider[MODES[mode].method](name);
  cache.set(key, { cny, at: Date.now() });
  return cny;
}

/**
 * items: [{name,count}]; retorna linhas com preço CNY/BRL e totais.
 * factor multiplica o valor (ex. 0.9). Itens sem preço vão em `missing`.
 */
export async function quoteItems({ items, mode, provider, rate, currency = provider.currency || 'CNY', factor = config.priceFactor, concurrency = 3 }) {
  if (!MODES[mode]) throw new Error(`Modo inválido: ${mode}`);
  const failures = [];
  const priced = await pool(items, concurrency, async (it) => {
    try {
      const cny = await priceOf(provider, mode, it.name);
      return { ...it, src: cny };
    } catch (e) {
      failures.push(e);
      return { ...it, src: null };
    }
  });
  // Se tudo falhou, é problema de acesso (token etc.), não de itens sem preço.
  if (items.length && failures.length === items.length) throw failures[0];
  const rows = priced
    .filter((r) => r.src)
    .map((r) => {
      const unitSrc = r.src * factor;
      return { name: r.name, count: r.count, unitSrc, unitBrl: unitSrc * rate, totalSrc: unitSrc * r.count, totalBrl: unitSrc * rate * r.count };
    })
    .sort((a, b) => b.totalBrl - a.totalBrl);
  const missing = priced.filter((r) => !r.src).map((r) => ({ name: r.name, count: r.count }));
  return {
    mode, rate, currency, factor, rows, missing,
    totalSrc: rows.reduce((s, r) => s + r.totalSrc, 0),
    totalBrl: rows.reduce((s, r) => s + r.totalBrl, 0),
    totalItems: rows.reduce((s, r) => s + r.count, 0),
  };
}
