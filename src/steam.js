// Leitura de inventário CS2 da Steam (público ou, via link de troca, a janela de troca).
import { config } from './config.js';

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';

/** Aceita link de troca, SteamID64, link /profiles/ID, link /id/vanity ou só o vanity. Devolve SteamID64. */
export async function resolveSteamId(input, fetchImpl = fetch) {
  const raw = String(input || '').trim();
  // Link de troca: partner = accountid (32 bits); SteamID64 = partner + 76561197960265728
  const trade = raw.match(/steamcommunity\.com\/tradeoffer\/new\/?\?[^\s]*?\bpartner=(\d+)/i);
  if (trade) return (BigInt(trade[1]) + 76561197960265728n).toString();
  let m = raw.match(/\b(7656119\d{10})\b/);
  if (m) return m[1];
  m = raw.match(/steamcommunity\.com\/id\/([^/?#\s]+)/i);
  const vanity = m ? m[1] : /^[\w-]{2,32}$/.test(raw) ? raw : null;
  if (!vanity) throw new Error('Não entendi o perfil. Envie o SteamID64 ou o link do perfil Steam.');
  const res = await fetchImpl(`https://steamcommunity.com/id/${encodeURIComponent(vanity)}/?xml=1`, {
    headers: { 'user-agent': UA },
  });
  const xml = await res.text();
  const id = xml.match(/<steamID64>(\d+)<\/steamID64>/);
  if (!id) throw new Error(`Perfil "${vanity}" não encontrado.`);
  return id[1];
}

/** Retorna [{ name, count }] só com itens negociáveis no mercado, agrupados por market_hash_name. */
export async function fetchInventory(steamId, fetchImpl = fetch) {
  const items = new Map();
  let start = '';
  for (let page = 0; page < 10; page++) {
    const url = `https://steamcommunity.com/inventory/${steamId}/730/2?l=english&count=2000${start ? `&start_assetid=${start}` : ''}`;
    const res = await fetchImpl(url, { headers: { 'user-agent': UA } });
    if (res.status === 403) throw new Error('Inventário privado. Deixe o inventário público e tente de novo.');
    if (res.status === 429) throw new Error('A Steam limitou as consultas. Tente de novo em alguns minutos.');
    if (!res.ok) throw new Error(`Steam respondeu ${res.status}.`);
    const data = await res.json();
    if (!data || !data.assets) {
      if (page === 0) throw new Error('Inventário vazio ou privado.');
      break;
    }
    const desc = new Map();
    for (const d of data.descriptions || []) desc.set(`${d.classid}_${d.instanceid}`, d);
    for (const a of data.assets) {
      const d = desc.get(`${a.classid}_${a.instanceid}`);
      if (!d || !d.marketable || !d.market_hash_name) continue;
      const qty = Number(a.amount || 1);
      items.set(d.market_hash_name, (items.get(d.market_hash_name) || 0) + qty);
    }
    if (!data.more_items) break;
    start = data.last_assetid;
  }
  return [...items].map(([name, count]) => ({ name, count }));
}

/** Extrai a URL de troca (https://steamcommunity.com/tradeoffer/new/?partner=..&token=..) de um texto. */
export function findTradeUrl(text) {
  const m = String(text || '').match(/https?:\/\/steamcommunity\.com\/tradeoffer\/new\/?\?[^\s]*partner=\d+[^\s]*/i);
  return m ? m[0] : null;
}

/**
 * Lê o inventário como a página do link de troca faz (/tradeoffer/new/partnerinventory/).
 * Mostra itens recém-recebidos antes do inventário público e funciona com inventário privado,
 * mas exige uma sessão Steam logada (STEAM_SESSIONID + STEAM_LOGIN_SECURE) e só lista itens negociáveis.
 */
export async function fetchTradeInventory(tradeUrl, fetchImpl = fetch, cfg = config) {
  if (!cfg.steamSessionId || !cfg.steamLoginSecure) {
    throw new Error('Para consultar pelo link de troca, configure STEAM_SESSIONID e STEAM_LOGIN_SECURE no .env (cookies de uma conta Steam logada).');
  }
  const partner = BigInt(new URL(tradeUrl).searchParams.get('partner')) + 76561197960265728n;
  const items = new Map();
  let start = 0;
  for (let page = 0; page < 20; page++) {
    const url = `https://steamcommunity.com/tradeoffer/new/partnerinventory/?sessionid=${encodeURIComponent(cfg.steamSessionId)}&partner=${partner}&appid=730&contextid=2${start ? `&start=${start}` : ''}`;
    const res = await fetchImpl(url, {
      headers: {
        'user-agent': UA,
        referer: tradeUrl,
        'x-requested-with': 'XMLHttpRequest',
        cookie: `sessionid=${cfg.steamSessionId}; steamLoginSecure=${cfg.steamLoginSecure}`,
      },
    });
    if (res.status === 429) throw new Error('A Steam limitou as consultas. Tente de novo em alguns minutos.');
    if (res.status === 401 || res.status === 403) throw new Error('Steam recusou a sessão (cookies expirados?). Atualize STEAM_LOGIN_SECURE.');
    if (!res.ok) throw new Error(`Steam respondeu ${res.status}.`);
    const data = await res.json().catch(() => null);
    if (!data || data.success === false || (!data.rgInventory && page === 0)) {
      throw new Error('A Steam não devolveu o inventário pelo link de troca (link/token inválido ou sessão expirada).');
    }
    const inv = Array.isArray(data.rgInventory) ? data.rgInventory : Object.values(data.rgInventory || {});
    const desc = data.rgDescriptions || {};
    for (const a of inv) {
      const d = desc[`${a.classid}_${a.instanceid}`];
      if (!d || !d.market_hash_name) continue;
      if (Number(d.marketable) === 0 && !d.tradable) continue;
      items.set(d.market_hash_name, (items.get(d.market_hash_name) || 0) + Number(a.amount || 1));
    }
    if (!data.more) break;
    start = data.more_start;
  }
  return [...items].map(([name, count]) => ({ name, count }));
}
