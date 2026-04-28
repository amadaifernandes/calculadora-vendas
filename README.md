# Calculadora de Vendas

Calculadora de vendas para equipe — permite digitar quantidades vendidas por produto e calcular o valor total de forma rápida.

## Funcionalidades

- Produtos organizados por marca com seções recolhíveis
- Busca de produto por nome ou marca
- Validação de pedido mínimo (3 produtos diferentes e 100 unidades no total)

## Acesso

O site está disponível via GitHub Pages. Nenhuma instalação é necessária — basta acessar pelo browser.

## Atualização dos dados

Os dados de produtos ficam codificados em `data.duty` (base64 de JSON). Para atualizar preços, produtos ou marcas, gere novamente esse arquivo a partir da planilha Excel com o script `build-data.js`.

### O que o script entrega

A saída padrão é o próprio `data.duty`, no formato esperado pelo frontend:

- `base(JSON.stringify({ marcas: [...] }))`
- consumo no app via `JSON.parse(atob(raw))`

Opcionalmente, você pode gerar também um JSON legível para inspeção/diff.

### Fluxo de uso

```bash
npm install                                    # primeira vez
node build-data.js BASE.xlsx                  # gera data.duty
node build-data.js BASE.xlsx data.duty --json # gera também data.json para inspeção
```

Quando rodar com o `.xlsx` real (com fórmulas), os preços saem com precisão completa (ex.: `12.80625` em vez de `12.81`), mantendo o cálculo do frontend alinhado com a base.

### Cache do navegador

O `app.js` guarda o conteúdo de `data.duty` no `sessionStorage` usando uma chave versionada (`CACHE_KEY`, atualmente `vd_cache_v5`).

Sempre que atualizar `data.duty`, incremente essa versão para forçar recarga dos dados na sessão atual dos usuários:

```js
const CACHE_KEY = 'vd_cache_v6'; // bump quando trocar data.duty
```
