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

## Sobre a extensão CS2 Trader
A extensão roda dentro do navegador e não pode ser acionada por um bot. Este bot consulta a mesma fonte
(YouPin898) diretamente, com as duas métricas que você pediu (menor anúncio / maior ordem de compra).

## Pontos de atenção
- **O YouPin não tem API pública oficial.** Os endpoints em `src/youpin.js` são os do site web e exigem o
  token da sua conta (`YOUPIN_TOKEN`: copie o header `authorization` em DevTools > Network, logado em youpin898.com).
  Eles podem mudar e o token expira. Os testes cobrem a lógica com respostas simuladas; **não foram validados
  contra o YouPin real**. Se algo vier vazio, ajuste os caminhos/campos no topo e em `listings()` de `youpin.js`.
- Nomes de itens precisam ser os do Mercado Steam em inglês; o YouPin pode listar nomes em outro formato, e itens sem correspondência aparecem como "Sem preço".
- `PRICE_FACTOR` aplica um desconto/ágio sobre o valor; `ALLOWED_NUMBERS` restringe quem usa o bot.
- Usar `whatsapp-web.js` (conta pessoal automatizada) vai contra os termos do WhatsApp e pode levar a banimento; prefira um número dedicado.
