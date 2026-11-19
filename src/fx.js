import { config } from './config.js';

const cache = {};

/** Cotação CURRENCY -> BRL. Usa *_BRL_RATE do .env se definido; senão AwesomeAPI (cache de 1h). */
export async function getRate(currency = 'CNY', fetchImpl = fetch) {
  const fixed = currency === 'USD' ? config.usdBrlRate : config.cnyBrlRate;
  if (fixed) return fixed;
  const c = cache[currency];
  if (c && Date.now() - c.at < 3_600_000) return c.rate;
  const res = await fetchImpl(`https://economia.awesomeapi.com.br/json/last/${currency}-BRL`);
  if (!res.ok) throw new Error(`Não consegui obter a cotação ${currency}→BRL. Defina ${currency}_BRL_RATE no .env.`);
  const j = await res.json();
  const rate = Number(j?.[`${currency}BRL`]?.bid);
  if (!rate) throw new Error(`Cotação ${currency}→BRL inválida.`);
  cache[currency] = { rate, at: Date.now() };
  return rate;
}
