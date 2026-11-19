// Leitura de inventário CS2 público da Steam.
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
