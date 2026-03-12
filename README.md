# Sistema de Presença da Loja

Aplicação web para controle de irmãos do quadro, sessões, presenças, visitantes, relatórios e calendário.

## Vercel + Banco de Dados

Este projeto está preparado para deploy na Vercel com banco Postgres usando a variável `DATABASE_URL`.

### Estrutura de persistência

- Em produção na Vercel: usa banco Postgres via `DATABASE_URL`.
- Sem `DATABASE_URL`: usa o arquivo local [data/store.json](D:\donwload2024\CODEX\MACONARIA\data\store.json) como fallback.

### Como configurar na Vercel

1. Crie um projeto na Vercel apontando para esta pasta.
2. Adicione um banco Postgres pela integração/marketplace da Vercel.
3. Confirme que a variável `DATABASE_URL` foi criada no projeto.
4. Faça o deploy.

As tabelas são criadas automaticamente pela API no primeiro acesso.

## Rodando localmente

1. Rode `node server.js`.
2. Abra `http://localhost:3000`.

Localmente, se `DATABASE_URL` não estiver definida, o sistema grava no arquivo JSON local.

## Endpoints usados pelo frontend

- `GET /api/store`
- `POST /api/brothers`
- `PUT /api/brothers/:id`
- `DELETE /api/brothers/:id`
- `POST /api/sessions`
- `PUT /api/sessions/:id`
- `DELETE /api/sessions/:id`

## Arquivos principais

- [api/store.js](D:\donwload2024\CODEX\MACONARIA\api\store.js): leitura consolidada dos dados.
- [api/brothers/index.js](D:\donwload2024\CODEX\MACONARIA\api\brothers\index.js): criação de irmãos.
- [api/brothers/[id].js](D:\donwload2024\CODEX\MACONARIA\api\brothers\[id].js): edição e exclusão de irmãos.
- [api/sessions/index.js](D:\donwload2024\CODEX\MACONARIA\api\sessions\index.js): criação de sessões.
- [api/sessions/[id].js](D:\donwload2024\CODEX\MACONARIA\api\sessions\[id].js): edição e exclusão de sessões.
- [lib/store.js](D:\donwload2024\CODEX\MACONARIA\lib\store.js): persistência em Postgres ou arquivo.
- [app.js](D:\donwload2024\CODEX\MACONARIA\app.js): frontend.
- [server.js](D:\donwload2024\CODEX\MACONARIA\server.js): servidor local para desenvolvimento.
