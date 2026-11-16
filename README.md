# Pet System

Gestão de pet shop: caixa, estoque, clientes e seus pets, equipe e relatórios.

**Teste sem cadastro:** a página inicial tem um botão que abre uma loja de demonstração com 60 dias de vendas. Ela volta ao estado original todo dia às 4h.

## Antes e depois

O Pet System foi meu primeiro projeto (2022): HTML, CSS e JavaScript puros, com os dados salvos no navegador. A versão 2 refaz o produto como um sistema completo:

| | v1 (2022) | v2 |
| --- | --- | --- |
| Arquitetura | páginas HTML soltas | monorepo pnpm + Turborepo: `apps/web`, `apps/api`, `packages/contracts` |
| Front | HTML, CSS e JavaScript puros + Bootstrap | Vue 3, TypeScript, Pinia, Vite |
| Dados | `localStorage` (senha em texto puro) | API NestJS + Prisma + Postgres |
| Login | comparação de senha no navegador | argon2id, JWT de 15 min e refresh rotativo com detecção de reuso |
| Multiloja | não | cada conta tem a própria loja; nada vaza entre lojas (testado) |
| Estoque | podia ficar negativo | baixa atômica com UPDATE condicional, mesmo com vendas simultâneas |
| Relatórios | gráfico do Highcharts (licença comercial) | gráficos próprios em SVG/CSS, export CSV seguro contra injeção de fórmula |
| Testes | nenhum | Vitest (unitários) + e2e da API em Postgres real + testes de componentes |
| Mídia | vídeo de 17,8 MB | 922 KB |

## Estrutura

```
apps/
  api/        NestJS 12 + Prisma 7 + Postgres (auth, produtos, clientes, vendas, relatórios, demo)
  web/        Vue 3 + Vite (landing, login, painel, caixa, produtos, clientes, equipe, relatórios)
packages/
  contracts/  schemas Zod e tipos compartilhados entre API e web
  eslint-config/, tsconfig/
```

Os contratos (`packages/contracts`) são a fonte da verdade: a API valida a entrada com os mesmos schemas que o front usa para tipar as chamadas.

## Rodando localmente

Requisitos: Node 24, pnpm (via `corepack enable`) e Docker.

```bash
cp .env.example .env               # escolha uma senha para o Postgres local
cp apps/api/.env.example apps/api/.env   # preencha DATABASE_URL e JWT_ACCESS_SECRET
pnpm install
pnpm db:up                         # Postgres em 127.0.0.1:5545
pnpm --filter @petsystem/api db:deploy
pnpm --filter @petsystem/api db:seed   # cria a loja de demonstração
pnpm dev                           # API em :3340 e web em :8082
```

Verificação completa (o mesmo que o CI roda):

```bash
pnpm verify    # lint + tipos + testes + build + e2e da API + varredura de segurança
```

## Segurança

- Toda rota da API nasce protegida (guard global); a loja vem do banco, nunca do corpo da requisição.
- Senhas com argon2id (parâmetros da OWASP); login com tempo constante para não revelar e-mails cadastrados.
- Refresh token opaco, salvo só como hash, rotativo; reusar um token antigo encerra a sessão inteira.
- Rate limit por IP (geral e mais rígido no login), helmet, CORS por lista, logs sem corpo de requisição e com dados sensíveis mascarados.
- Ambiente validado na subida (a API não sobe sem segredo forte); varredura de segredos e `pnpm audit` no CI, gitleaks no histórico.

## Deploy

- **Web:** Netlify (`netlify.toml`), publica `apps/web/dist`. Links da versão antiga redirecionam para a nova.
- **API:** container (`apps/api/Dockerfile`, build a partir da raiz) atrás de proxy reverso com HTTPS.

Feito por [Pedro Lopes](https://www.pedrolopes.tech).
