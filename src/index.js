import { config } from './config.js';
import { createYoupin } from './youpin.js';
import { createCsgotrader } from './csgotrader.js';
import { handle } from './commands.js';

const { default: wweb } = await import('whatsapp-web.js');
const { default: qrcode } = await import('qrcode-terminal');
const { Client, LocalAuth } = wweb;

const provider = (config.priceSource === 'youpin' ? createYoupin() : createCsgotrader());
// PAIR_PHONE=5511999999999 → vincula por código de 8 dígitos (útil em servidor, sem escanear QR).
const pairPhone = (process.env.PAIR_PHONE || '').replace(/\D/g, '');
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: process.env.SESSION_DIR || '.wwebjs_auth' }),
  ...(pairPhone ? { pairWithPhoneNumber: { phoneNumber: pairPhone, showNotification: true } } : {}),
  puppeteer: {
    headless: true,
    executablePath: process.env.CHROME_PATH || undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  },
});

client.on('code', (code) => console.log(`Código de vinculação: ${code}\nWhatsApp > Aparelhos conectados > Conectar um aparelho > Conectar com número de telefone.`));

client.on('qr', (qr) => {
  if (pairPhone) return; console.log('Escaneie o QR code no WhatsApp (Aparelhos conectados):'); qrcode.generate(qr, { small: true }); });
client.on('ready', () => console.log('Bot pronto. Envie !ajuda'));
client.on('auth_failure', (m) => console.error('Falha de autenticação:', m));

client.on('message_create', async (msg) => {
  const text = msg.body || '';
  if (!text.startsWith(config.prefix)) return;
  // Evita laço: ignora mensagens do bot que não sejam comandos (respostas não começam com o prefixo).
  const number = (msg.fromMe ? msg.to : msg.from).split('@')[0];
  if (config.allowedNumbers.length && !config.allowedNumbers.includes(number)) return;
  const chatId = msg.fromMe ? msg.to : msg.from;
  const out = await handle(text, { provider, prefix: config.prefix, reply: (t) => client.sendMessage(chatId, t) });
  for (const part of out) await client.sendMessage(chatId, part);
});

client.initialize();
