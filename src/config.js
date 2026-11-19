const num = (v, d) => (v !== undefined && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : d);

export const config = {
  youpinToken: process.env.YOUPIN_TOKEN || '',
  youpinDeviceId: process.env.YOUPIN_DEVICE_ID || '',
  youpinBaseUrl: (process.env.YOUPIN_BASE_URL || 'https://api.youpin898.com').replace(/\/$/, ''),
  priceSource: (process.env.PRICE_SOURCE || 'csgotrader').toLowerCase(),
  csgotraderUrls: (process.env.CSGOTRADER_URL ? [process.env.CSGOTRADER_URL] : ['https://prices.csgotrader.app/latest/youpin898.json', 'https://prices.csgotrader.app/latest/youpin.json']),
  cnyBrlRate: num(process.env.CNY_BRL_RATE, null),
  usdBrlRate: num(process.env.USD_BRL_RATE, null),
  priceFactor: num(process.env.PRICE_FACTOR, 1),
  allowedNumbers: (process.env.ALLOWED_NUMBERS || '').split(',').map((s) => s.trim()).filter(Boolean),
  prefix: process.env.PREFIX || '!',
  cacheTtlMs: num(process.env.CACHE_TTL_MINUTES, 15) * 60_000,
};
