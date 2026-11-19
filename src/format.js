import { MODES } from './quote.js';

export const brl = (n) => 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const money = (n, c = 'CNY') => (c === 'USD' ? 'US$' : '¥') + n.toFixed(2);

/** Divide o texto em mensagens de até `max` caracteres, quebrando por linha. */
export function chunk(text, max = 3500) {
  const parts = [];
  let cur = '';
  for (const line of text.split('\n')) {
    if (cur && cur.length + line.length + 1 > max) { parts.push(cur); cur = ''; }
    cur += (cur ? '\n' : '') + line;
  }
  if (cur) parts.push(cur);
  return parts;
}

export function formatQuote(q, { maxRows = 40 } = {}) {
  const lines = [`🎮 *Cotação de inventário CS2*`, `📊 ${MODES[q.mode].label}`, `💱 1 ${q.currency} = ${brl(q.rate)}${q.factor !== 1 ? ` | fator ${q.factor}` : ''}`, ''];
  q.rows.slice(0, maxRows).forEach((r, i) => {
    lines.push(`${i + 1}. ${r.count > 1 ? `${r.count}x ` : ''}${r.name}`);
    lines.push(`   ${money(r.unitSrc, q.currency)} (${brl(r.unitBrl)})${r.count > 1 ? ` → ${brl(r.totalBrl)}` : ''}`);
  });
  if (q.rows.length > maxRows) {
    const rest = q.rows.slice(maxRows);
    lines.push('', `… e mais ${rest.length} itens (${brl(rest.reduce((s, r) => s + r.totalBrl, 0))})`);
  }
  if (q.missing.length) lines.push('', `⚠️ Sem preço (${q.missing.length}): ${q.missing.slice(0, 8).map((m) => m.name).join(', ')}${q.missing.length > 8 ? '…' : ''}`);
  lines.push('', `💰 *Total: ${brl(q.totalBrl)}* (${money(q.totalSrc, q.currency)}) — ${q.totalItems} itens`);
  return lines.join('\n');
}

export const HELP = (p) => `🤖 *Bot de cotação CS2 (YouPin898 via CS2 Trader)*

*${p}cotar <steam> [menor|compra]*
  Cota o inventário inteiro. Aceita SteamID64, link do perfil ou nome do perfil.
  • menor → menor anúncio no YouPin (padrão)
  • compra → maior ordem de compra no YouPin

*${p}menor <steam>* — atalho p/ menor anúncio
*${p}compra <steam>* — atalho p/ maior ordem de compra
*${p}preco <nome da skin> [compra]* — preço de um item
  ex: ${p}preco AK-47 | Redline (Field-Tested)

O inventário da Steam precisa estar público.`;
