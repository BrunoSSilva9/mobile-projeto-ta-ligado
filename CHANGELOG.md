# Changelog

Todas as mudanças relevantes deste projeto serão documentadas neste arquivo.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto adota o [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Não lançado]

### Adicionado (planejamento da Fase 1)
- `docs/16-plano-fase-1.md`: plano detalhado em 13 PRs (fatia vertical primeiro), com tarefas, arquivos, testes, critérios de aceite, cronograma, roteiro de demonstração e riscos. Decisões propostas S-33 a S-41 (a confirmar).
- `.vite/` no `.gitignore`.

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

### Validado (2026-11-18)
- `docker compose up -d` sobe o PostgreSQL 17 (healthy); `npm install` (923 pacotes) e `package-lock.json` gerados.
- **Migration `init`** aplicada, com o índice único parcial (RN-006) e dois `CHECK` (RN-010 e RN-015) em SQL; as três violações foram recusadas pelo banco em teste manual. **Seed:** 17 bairros aproximados e o operador de teste.
- `GET /health` responde `{"status":"ok","db":"up"}`; o painel acessa a API pelo proxy do Vite.
- `npm run lint`, `typecheck`, `test` (API 9, painel 2, app 13 testes) e `format:check` passam na raiz; o painel compila (`vite build`).
- O app gera o bundle Android (`expo export`) e o Metro serve o manifesto do SDK 58; `npm run dev` sobe API, painel e Expo juntos. `expo-doctor`: 19 de 20 verificações (a restante depende da rede do Expo).
- **Não verificado:** abrir o app no Expo Go em um celular (a equipe deve testar) e a execução do workflow no GitHub Actions.

### Corrigido após o primeiro CI
- O job da API falhava no seed com "@prisma/client did not initialize yet": o `prisma migrate deploy` não gera o client. Adicionados o script `postinstall` (`prisma generate`) em `apps/api` e um passo explícito de geração no workflow. Isso também evita o mesmo erro em clones novos do repositório.

### Corrigido durante a validação
- Tipo da cor do ícone das abas (`ColorValue` no SDK 58) e formatação do Prettier em 3 arquivos.

### Adicionado (documentação)
- Documentação inicial do projeto em `docs/`: visão e escopo, requisitos (RF, RNF, RN), histórias de usuário, casos de uso, telas e fluxos, design system, arquitetura, tecnologias, modelo de dados, API, segurança e LGPD, acessibilidade, estratégia de testes, roadmap e glossário.
- Cinco ADRs: integração simulada com a operadora, Socket.IO, monorepo, JWT com RBAC e estratégia offline simples.
- Arquivos da raiz: `README.md`, `CONTRIBUTING.md`, `LICENSE` (MIT), `.gitignore`, `.editorconfig` e `CLAUDE.md`.
- Templates de issue e de Pull Request e rascunho de workflow de CI em `.github/`.
