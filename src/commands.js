import { fetchInventory, fetchTradeInventory, findTradeUrl, resolveSteamId } from './steam.js';
import { quoteItems, priceOf, MODES } from './quote.js';
import { getRate } from './fx.js';
import { formatQuote, chunk, HELP, brl, money } from './format.js';

const ALIASES = { menor: 'menor', barata: 'menor', anuncio: 'menor', anúncio: 'menor', compra: 'compra', ordem: 'compra', buy: 'compra', maior: 'compra' };

/** Interpreta "!cmd args" → { cmd, mode, rest } ou null se não for comando. */
export function parse(text, prefix = '!') {
  const t = String(text || '').trim();
  if (!t.startsWith(prefix)) return null;
  const [cmdRaw, ...args] = t.slice(prefix.length).split(/\s+/);
  const cmd = cmdRaw.toLowerCase();
  let mode = ALIASES[cmd] ?? null;
  let words = args;
  const last = args[args.length - 1]?.toLowerCase();
  if (cmd === 'cotar' || cmd === 'preco' || cmd === 'preço') {
    if (last && ALIASES[last]) { mode = ALIASES[last]; words = args.slice(0, -1); }
    mode ||= 'menor';
  }
  return { cmd, mode, rest: words.join(' ').trim() };
}

/** Executa um comando e devolve a lista de mensagens a enviar. `reply` permite avisos intermediários. */
export async function handle(text, { provider, prefix = '!', reply = async () => {}, fetchImpl = fetch } = {}) {
  const p = parse(text, prefix);
  if (!p) return [];
  const { cmd, mode, rest } = p;
  try {
    if (['ajuda', 'help', 'menu', 'start'].includes(cmd)) return [HELP(prefix)];

    if (['cotar', 'menor', 'barata', 'compra', 'ordem'].includes(cmd)) {
      if (!rest) return [`Informe o perfil Steam. Ex: ${prefix}${cmd} https://steamcommunity.com/id/seuperfil`];
      await reply('🔎 Lendo inventário e consultando o YouPin898… pode levar um pouco.');
      const tradeUrl = findTradeUrl(rest);
      const items = tradeUrl
        ? await fetchTradeInventory(tradeUrl, fetchImpl)
        : await fetchInventory(await resolveSteamId(rest, fetchImpl), fetchImpl);
      if (!items.length) return ['Nenhum item negociável encontrado nesse inventário.'];
      const rate = await getRate(provider.currency, fetchImpl);
      const q = await quoteItems({ items, mode, provider, rate });
      return chunk(formatQuote(q));
    }

    if (['preco', 'preço', 'price'].includes(cmd)) {
      if (!rest) return [`Informe o nome exato. Ex: ${prefix}preco AK-47 | Redline (Field-Tested)`];
      const rate = await getRate(provider.currency, fetchImpl);
      const v = await priceOf(provider, mode, rest);
      if (!v) return [`Não encontrei "${rest}" no YouPin. Use o nome exato do Mercado Steam (em inglês).`];
      return [`*${rest}*\n${MODES[mode].label}\n${money(v, provider.currency)} → ${brl(v * rate)}`];
    }
    return [`Comando desconhecido. Envie ${prefix}ajuda`];
  } catch (e) {
    return [`❌ ${e.message}`];
  }
}
