// Teste sem WhatsApp: node src/cli.js "!cotar <steam> menor"
import { config } from './config.js';
import { createYoupin } from './youpin.js';
import { createCsgotrader } from './csgotrader.js';
import { handle } from './commands.js';

const text = process.argv.slice(2).join(' ');
const out = await handle(text, { provider: (config.priceSource === 'youpin' ? createYoupin() : createCsgotrader()), prefix: config.prefix, reply: async (t) => console.log(t) });
console.log(out.join('\n---\n'));
