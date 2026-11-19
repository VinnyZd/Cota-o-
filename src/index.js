import { config } from './config.js';
import { createYoupin } from './youpin.js';
import { handle } from './commands.js';

const { default: wweb } = await import('whatsapp-web.js');
const { default: qrcode } = await import('qrcode-terminal');
const { Client, LocalAuth } = wweb;

const provider = createYoupin();
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] },
});

client.on('qr', (qr) => { console.log('Escaneie o QR code no WhatsApp (Aparelhos conectados):'); qrcode.generate(qr, { small: true }); });
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
