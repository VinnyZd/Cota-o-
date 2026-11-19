import { config } from './config.js';

let cached = { rate: null, at: 0 };

/** Cotação CNY -> BRL. Usa CNY_BRL_RATE se definido; senão AwesomeAPI (cache de 1h). */
export async function getCnyBrl(fetchImpl = fetch) {
  if (config.cnyBrlRate) return config.cnyBrlRate;
  if (cached.rate && Date.now() - cached.at < 3_600_000) return cached.rate;
  const res = await fetchImpl('https://economia.awesomeapi.com.br/json/last/CNY-BRL');
  if (!res.ok) throw new Error('Não consegui obter a cotação CNY→BRL. Defina CNY_BRL_RATE no .env.');
  const j = await res.json();
  const rate = Number(j?.CNYBRL?.bid);
  if (!rate) throw new Error('Cotação CNY→BRL inválida.');
  cached = { rate, at: Date.now() };
  return rate;
}
