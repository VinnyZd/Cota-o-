# Cotação CS2 pelo WhatsApp (YouPin898)

Bot de WhatsApp que cota um inventário de CS2 com preços do **YouPin898**, em CNY e convertido para BRL.

## Comandos
| Comando | O que faz |
|---|---|
| `!cotar <steam> [menor\|compra]` | Cota o inventário todo (padrão: `menor`) |
| `!menor <steam>` | Usa o **menor anúncio** no YouPin |
| `!compra <steam>` | Usa a **maior ordem de compra** no YouPin |
| `!preco <nome exato> [compra]` | Preço de um item (ex.: `!preco AK-47 \| Redline (Field-Tested)`) |
| `!ajuda` | Lista de comandos |

`<steam>` pode ser SteamID64, link do perfil (`/profiles/...` ou `/id/...`) ou o nome do perfil. O inventário precisa estar público.

## Como rodar
```bash
npm install
cp .env.example .env     # preencha YOUPIN_TOKEN
set -a; . ./.env; set +a
npm start                # escaneie o QR em WhatsApp > Aparelhos conectados
```
Teste sem WhatsApp: `node src/cli.js "!cotar <steam> compra"`. Testes: `npm test`.

## Fonte de preços: API da extensão CS2 Trader
Por padrão (`PRICE_SOURCE=csgotrader`) o bot baixa o mesmo JSON de preços que a extensão usa
(`prices.csgotrader.app/latest/youpin898.json`), sem precisar de login. Por item:
`starting_at` = menor anúncio, `highest_order` = maior ordem de compra. Os valores vêm em USD e são
convertidos para BRL. A alternativa `PRICE_SOURCE=youpin` consulta o YouPin direto (exige `YOUPIN_TOKEN`).

## Pontos de atenção
- **A URL/formato do CS2 Trader foi escrita de memória e não foi validada**: o ambiente em que desenvolvi bloqueia o host `prices.csgotrader.app`. Teste na sua máquina: `curl -s https://prices.csgotrader.app/latest/youpin898.json | head -c 500`. Se o nome do arquivo ou os campos forem outros, defina `CSGOTRADER_URL` ou ajuste `src/csgotrader.js`.
- **No modo `youpin`, o YouPin não tem API pública oficial.** Os endpoints em `src/youpin.js` são os do site web e exigem o
  token da sua conta (`YOUPIN_TOKEN`: copie o header `authorization` em DevTools > Network, logado em youpin898.com).
  Eles podem mudar e o token expira. Os testes cobrem a lógica com respostas simuladas; **não foram validados
  contra o YouPin real**. Se algo vier vazio, ajuste os caminhos/campos no topo e em `listings()` de `youpin.js`.
- Nomes de itens precisam ser os do Mercado Steam em inglês; o YouPin pode listar nomes em outro formato, e itens sem correspondência aparecem como "Sem preço".
- `PRICE_FACTOR` aplica um desconto/ágio sobre o valor; `ALLOWED_NUMBERS` restringe quem usa o bot.
- Usar `whatsapp-web.js` (conta pessoal automatizada) vai contra os termos do WhatsApp e pode levar a banimento; prefira um número dedicado.
