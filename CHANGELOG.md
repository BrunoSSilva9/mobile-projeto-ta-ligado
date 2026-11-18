# Changelog

Todas as mudanças relevantes deste projeto serão documentadas neste arquivo.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto adota o [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Não lançado]

### Adicionado (Fase 0: setup inicial, branch `feature/setup-inicial`)
- Monorepo com npm workspaces (`apps/api`, `apps/painel`, `apps/mobile`), `docker-compose.yml` (PostgreSQL 17), Prettier e `.env.example` por aplicação (inclui `GOOGLE_MAPS_API_KEY` e as variáveis de FCM/APNs, **sem valor**).
- **API:** Express 5, `GET /health`, tratamento de erros no formato do `docs/10-api.md`, validação de ambiente com Zod, servidor Socket.IO (infraestrutura), testes com Vitest e Supertest.
- **Prisma 6:** esquema inicial conforme o `docs/09-modelo-de-dados.md` e seed com bairros aproximados de Marabá e um operador de teste.
- **Painel:** React + Vite com página inicial vazia, tokens CSS e indicador de status da API.
- **App:** Expo SDK 58 + Expo Router com 4 abas (Início, Ocorrências, botão central Denunciar e Perfil), tema com os tokens corrigidos (D-01, D-02), constantes com placeholders (`src/config/constants.ts`) e testes de contraste e alvos de toque.
- Rascunhos de Termos de Uso e Política de Privacidade em `docs/legal/`.
- Workflow de CI com lint, tipos, testes (com PostgreSQL de serviço), build do painel e testes do app.

### Alterado
- Documentação: decisões S-01 a S-21 aprovadas (marcação "SUPOSIÇÃO" removida; S-22 a S-32 aguardam confirmação), cronograma de uma semana, contraste (`#006E2C` e `#855300`), alvos de toque de 48 dp, versões reais em `docs/08-tecnologias.md`.
- `LICENSE` com os integrantes como titulares do copyright.

### Pendente de validação
- **A Fase 0 foi escrita, mas não validada nesta máquina:** o disco C: ficou sem espaço (`ENOSPC`) durante o `npm install` e o `docker pull`. Ainda não foram executados `npm install`, `docker compose up`, a migration inicial, o seed, `npm run lint`, `npm run typecheck` e `npm test`. A migration `init` (com o índice único parcial e os `CHECK`) também ainda não foi gerada.

### Adicionado (documentação)
- Documentação inicial do projeto em `docs/`: visão e escopo, requisitos (RF, RNF, RN), histórias de usuário, casos de uso, telas e fluxos, design system, arquitetura, tecnologias, modelo de dados, API, segurança e LGPD, acessibilidade, estratégia de testes, roadmap e glossário.
- Cinco ADRs: integração simulada com a operadora, Socket.IO, monorepo, JWT com RBAC e estratégia offline simples.
- Arquivos da raiz: `README.md`, `CONTRIBUTING.md`, `LICENSE` (MIT), `.gitignore`, `.editorconfig` e `CLAUDE.md`.
- Templates de issue e de Pull Request e rascunho de workflow de CI em `.github/`.
