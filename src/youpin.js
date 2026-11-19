// Cliente do YouPin898 (valores em CNY).
// ATENÇÃO: o YouPin não tem API pública estável; estes endpoints são os usados pelo site web
// e podem mudar. Os caminhos ficam isolados aqui para ajuste fácil. Requer YOUPIN_TOKEN.
import { config } from './config.js';

const LIST_PATH = '/api/homepage/es/commodity/GetCsGoPagedList';
const BUY_ORDER_PATH = '/api/youpin/bff/trade/purchase/order/getTemplatePurchaseOrderListPC';

const toNum = (v) => {
  const n = Number(String(v ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
};

export function createYoupin({ fetchImpl = fetch, cfg = config } = {}) {
  async function post(path, body) {
    const headers = {
      'content-type': 'application/json',
      'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
      origin: 'https://youpin898.com',
      referer: 'https://youpin898.com/',
      appversion: '5.26.0',
      platform: 'pc',
    };
    if (cfg.youpinToken) headers.authorization = `Bearer ${cfg.youpinToken.replace(/^Bearer\s+/i, '')}`;
    if (cfg.youpinDeviceId) headers.deviceid = headers.deviceuk = cfg.youpinDeviceId;
    const res = await fetchImpl(cfg.youpinBaseUrl + path, { method: 'POST', headers, body: JSON.stringify(body) });
    if (res.status === 401 || res.status === 403) throw new Error('YouPin recusou a consulta (token inválido/expirado). Atualize YOUPIN_TOKEN.');
    if (!res.ok) throw new Error(`YouPin respondeu ${res.status}.`);
    return res.json();
  }

  async function listings(name) {
    const j = await post(LIST_PATH, {
      listSortType: 1, // preço crescente
      sortType: 1,
      keyWords: name,
      pageSize: 20,
      pageIndex: 1,
      listType: 10,
      stickersIsSort: false,
      stickers: {},
    });
    const list = j?.Data?.CommodityList ?? j?.data?.commodityList ?? [];
    // Só nome idêntico, para não pegar variantes (StatTrak, Souvenir, outros desgastes).
    return list.filter((c) => (c.CommodityName ?? c.commodityName) === name);
  }

  /** Menor preço anunciado (CNY) ou null. */
  async function lowestListing(name) {
    const prices = (await listings(name)).map((c) => toNum(c.Price ?? c.price)).filter(Boolean);
    return prices.length ? Math.min(...prices) : null;
  }

  /** Maior ordem de compra (CNY) ou null. */
  async function highestBuyOrder(name) {
    const items = await listings(name);
    const templateId = items[0]?.TemplateId ?? items[0]?.templateId;
    if (!templateId) return null;
    const j = await post(BUY_ORDER_PATH, { templateId, pageIndex: 1, pageSize: 20 });
    const rows = j?.Data?.response ?? j?.data?.response ?? j?.Data?.list ?? j?.data?.list ?? [];
    const prices = rows.map((r) => toNum(r.unitPrice ?? r.price ?? r.Price ?? r.purchasePrice)).filter(Boolean);
    return prices.length ? Math.max(...prices) : null;
  }

  return { lowestListing, highestBuyOrder };
}
