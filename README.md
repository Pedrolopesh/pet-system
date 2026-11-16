# Pet System

SaaS de gestão para **pet shops, creches e clínicas veterinárias**: agenda sem conflito de horário, caixa, estoque, clientes e seus pets, equipe com permissões e relatórios.

**Teste sem cadastro:** a página inicial tem um botão que abre uma loja de demonstração (pet shop + creche + clínica) com agenda e 60 dias de vendas. Ela volta ao estado original todo dia às 4h.

## O que tem

- **Agenda** por profissional (dia e semana): banho, tosa, consulta, vacina e diária de creche, com duração do serviço. Dois atendimentos do mesmo profissional no mesmo horário não passam, nem com pedidos simultâneos. Fluxo de status: agendado → confirmado → em atendimento → pronto para buscar → concluído (ou cancelado/faltou).
- **Caixa** que cobra os atendimentos do dia junto com produtos; o atendimento fica concluído e ligado à venda.
- **Clientes e pets**, **produtos e estoque** com alerta de mínimo, **relatórios** com exportação CSV.
- **SaaS:** cada conta é uma loja isolada; teste grátis de 14 dias; planos Básico e Pro com limites (usuários, profissionais, relatórios); papéis dono, gerente e atendente; convite por link de uso único.
- **Páginas de venda** por segmento (`/pet-shop`, `/creche`, `/clinica`) e de preços, geradas estaticamente.
- **Primeiros passos** no painel para lojas novas e avisos da equipe com prioridade (inspirados no tutorial e no painel da versão antiga).

A cobrança das assinaturas ainda não está ligada: escolher um plano libera os limites sem pagamento.

## Antes e depois

O Pet System foi meu primeiro projeto (2022): HTML, CSS e JavaScript puros, com os dados salvos no navegador.

| | v1 (2022) | v2 |
| --- | --- | --- |
| Produto | ERP de uma loja só | SaaS para pet shops, creches e clínicas |
| Arquitetura | páginas HTML soltas | monorepo pnpm + Turborepo: `apps/web`, `apps/api`, `packages/contracts` |
| Front | HTML, CSS e JavaScript puros + Bootstrap | Next.js 16 (React 19), exportado como site estático |
| Dados | `localStorage` (senha em texto puro) | API NestJS + Prisma + Postgres |
| Login | comparação de senha no navegador | argon2id, JWT de 15 min e refresh rotativo com detecção de reuso |
| Agenda | não existia | por profissional, sem conflito, com fluxo de status |
| Estoque | podia ficar negativo | baixa atômica com UPDATE condicional, mesmo com vendas simultâneas |
| Testes | nenhum | unitários + 34 e2e da API em Postgres real + testes do web |
| Mídia | vídeo de 17,8 MB | 922 KB |

## Estrutura

```
apps/
  api/        NestJS 12 + Prisma 7 + Postgres (auth, contas e planos, agenda, produtos, clientes, vendas, relatórios, demo)
  web/        Next.js 16 (páginas de venda, login, painel, agenda, caixa, clientes, produtos, equipe, relatórios, configurações)
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

- Toda rota da API nasce protegida (guard global); a loja e o papel vêm do banco, nunca do corpo da requisição.
- Permissões por papel no servidor (o front só esconde botões); convites guardados só como hash e de uso único.
- Senhas com argon2id (parâmetros da OWASP); login com tempo constante para não revelar e-mails cadastrados.
- Refresh token opaco, salvo só como hash, rotativo; reusar um token antigo encerra a sessão inteira.
- Rate limit por IP (geral e mais rígido no login), helmet, CORS por lista, logs sem corpo de requisição e com dados sensíveis mascarados.
- Ambiente validado na subida (a API não sobe sem segredo forte); varredura de segredos e `pnpm audit` no CI, gitleaks no histórico.

## Deploy

- **Web:** Netlify (`netlify.toml`), publica `apps/web/out`. Links da versão antiga redirecionam para a nova.
- **API:** container (`apps/api/Dockerfile`, build a partir da raiz) atrás de proxy reverso com HTTPS.

Feito por [Pedro Lopes](https://www.pedrolopes.tech).
