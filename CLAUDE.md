# CLAUDE.md – Tá Ligado?

Guia para o Claude Code trabalhar neste repositório.

## Projeto

**Tá Ligado?** é um app mobile para registrar denúncias de queda de energia em **Marabá-PA** e acompanhar o andamento. Trabalho final de **Desenvolvimento Mobile (UNIFESSPA)**: escopo **enxuto**, MVP acadêmico. Na dúvida, escolha a opção **mais simples** e registre a escolha na documentação.

- Figma: <https://www.figma.com/design/XiDKX3D8j02JggOwKPDdGp/Mobile---T%C3%A1-ligado-?node-id=0-1>
- Idioma: **pt-BR** em documentação, textos da interface, mensagens de erro e comentários de domínio. Identificadores de código podem ser em português (domínio) ou inglês (infraestrutura), mantendo a consistência do módulo.

## Como o sistema funciona

Dois perfis: **Cidadão** (app) e **Operador** (Painel Web, simula a Equatorial Pará). Fluxo: cidadão envia a denúncia → API salva → painel recebe em tempo real (Socket.IO) → operador atualiza o status → app recebe por WebSocket e push. A integração real com a Equatorial é **trabalho futuro** ([ADR-0001](docs/adr/0001-integracao-simulada-com-operadora.md)).

Status da denúncia: `RECEBIDA → EM_ATENDIMENTO → RESOLVIDA`, ou `IMPROCEDENTE` (com justificativa), ou `CANCELADA` (pelo autor, só em `RECEBIDA`). Tipos: `SEM_ENERGIA` e `OSCILACAO`. Status do bairro: calculado (Sem luz > Oscilação > Normal). Um cidadão tem **no máximo 1 denúncia em aberto**.

## Estrutura do repositório (monorepo, npm workspaces)

```
apps/
├── mobile/   # Expo + React Native + TypeScript + Expo Router (cidadão)
├── painel/   # React + Vite + TypeScript + Leaflet (operadora)
└── api/      # Node.js + Express + Prisma + PostgreSQL + Socket.IO
docs/         # toda a documentação
.github/      # templates de issue/PR e CI
```

Status atual: documentação pronta; **Fase 0 concluída e validada na branch `feature/setup-inicial`** (ver `CHANGELOG.md`; falta só testar no Expo Go em um celular). Rotas do app em `apps/mobile/src/app/`. Próximo passo: validar a Fase 0 e seguir para a Fase 1 (`docs/14-roadmap-e-backlog.md`). Não faça merge na `develop` sem aprovação do usuário. **A Fase 1 inteira é feita na branch `feature/fase-1`, com um único PR** (S-42).

## Onde fica cada documento

| Preciso de… | Arquivo |
|---|---|
| Escopo, personas, **suposições (S-xx) e pendências (PEN-xx)** | `docs/01-visao-e-escopo.md` |
| Requisitos funcionais (RF) | `docs/02-requisitos/requisitos-funcionais.md` |
| Requisitos não funcionais (RNF) | `docs/02-requisitos/requisitos-nao-funcionais.md` |
| Regras de negócio (RN) | `docs/02-requisitos/regras-de-negocio.md` |
| Histórias de usuário (US) com Gherkin | `docs/03-historias-de-usuario.md` |
| Casos de uso (UC) | `docs/04-casos-de-uso.md` |
| Telas, nodes do Figma, navegação, **telas a criar** | `docs/05-telas-e-fluxos.md` |
| Tokens e componentes | `docs/06-design-system.md` |
| Arquitetura, pastas, estado, offline, sequência em tempo real | `docs/07-arquitetura.md` |
| Tecnologias e justificativas | `docs/08-tecnologias.md` |
| Modelo de dados (ER) | `docs/09-modelo-de-dados.md` |
| Endpoints e **eventos WebSocket** | `docs/10-api.md` |
| Segurança e LGPD | `docs/11-seguranca-e-lgpd.md` |
| Acessibilidade (WCAG 2.2 AA) | `docs/12-acessibilidade.md` |
| Testes e cobertura | `docs/13-estrategia-de-testes.md` |
| Roadmap e backlog (B-xxx) | `docs/14-roadmap-e-backlog.md` |
| Glossário | `docs/15-glossario.md` |
| Plano de implementação da Fase 1 (PRs, tarefas, testes) | `docs/16-plano-fase-1.md` |
| Textos legais (rascunho acadêmico) | `docs/legal/` |
| Decisões (ADR) | `docs/adr/` |

## Convenções

- **Rastreabilidade:** IDs `RF-xxx`, `RNF-xxx`, `RN-xxx`, `US-xxx`, `UC-xx`, `T-xx`/`P-xx` (telas), `B-xxx` (backlog), `S-xx`, `PEN-xx`. Ao mudar uma regra, atualize RF/RN/US/UC/backlog **e mantenha os IDs consistentes entre os documentos**.
- **Decisões:** registre como `S-xx` em `docs/01-visao-e-escopo.md` (seção 8). Decisões aprovadas S-01 a S-21; S-22 a S-43 aguardam confirmação, exceto S-33, S-38, S-42 e S-43, já definidas. Não invente funcionalidades que não estejam no Figma ou nas decisões documentadas.
- **Regras de negócio** vivem em `apps/api/src/domain` (funções puras, com testes unitários). Meta: ≥ 90% de cobertura nesse módulo.
- **Design:** use os tokens de `docs/06-design-system.md`; nenhuma cor ou fonte solta. Respeite acessibilidade (contraste, alvos ≥ 44/48, fontes dinâmicas).
- **Privacidade:** **não coletar CPF nem data de nascimento.** Visibilidade de dados por papel conforme RN-014. Nada de dados pessoais em logs.
- **Segredos:** nunca versionar `.env`; manter `.env.example`.
- **TypeScript** `strict`, ESLint e Prettier; `.editorconfig` na raiz.

## Git

- Branches: `main`, `develop`, `feature/*`, `fix/*`, `docs/*`. Detalhes em `CONTRIBUTING.md`.
- **Conventional Commits** (ex.: `docs: adiciona requisitos funcionais`).
- **O usuário faz os commits e pushes manualmente.** Não rode `git commit` nem `git push`. Quando houver algo para commitar, **responda com o texto exato da mensagem de commit** (e a lista de arquivos).
- **Não crie o repositório remoto nem faça push sem perguntar** (nome e visibilidade público/privado); depois use o `gh` CLI.
- Se a mudança alterar escopo ou stack, **pergunte antes** de seguir.

## Pendências conhecidas (resumo; lista completa em `docs/01-visao-e-escopo.md`)

ACGM (rodapé), telefones e horário reais da Ouvidoria/Central, textos finais de Termos e Política, chave do Google Maps e credenciais de push, lista real de bairros com coordenadas, telas que faltam no Figma (login, perfil, minhas denúncias, detalhe, sucesso, painel).

## Armadilhas já encontradas (leia antes de mexer)

- **Expo Router + sessão:** o `Stack.Protected` do grupo `(app)` precisa de `redirectTo="/login"`; sem isso o app sem sessão mostra "Unmatched Route". Há testes da navegação real em `apps/mobile/src/__tests__/guarda-de-rotas.test.tsx`.
- **Arquivos de teste fora de `src/app/`** (o Expo Router os tomaria por rotas). Auxiliares de teste ficam em `src/testing/`, nunca em `__tests__/` (o Jest os trataria como testes).
- **RNTL v14:** `render`, `rerender` e `fireEvent` são assíncronos (use `await`).
- **TanStack Query nos testes:** use `configurarCacheParaTestes()` (`gcTime: 0`); sem isso o Jest não encerra, por causa do temporizador de coleta de lixo.
- **Papel de alerta em leitores de tela:** coloque `accessibilityRole="alert"` no `Text`, não num `View` com botões dentro (um `View` acessível agrupa os filhos).
- **Prettier:** rode sempre pela raiz (`npm run format`); dentro de `apps/*` ele ignora o `.prettierignore` e reformata os `.md`.
- **Testes do mapa e do GPS:** `react-native-maps` e `@react-native-async-storage/async-storage` são simulados em `apps/mobile/jest.setup.js`; `expo-location` e `expo-clipboard` são simulados em cada teste. O mapa usa `importantForAccessibility="no-hide-descendants"`, então o pino só é achado com `getByTestId('pino', { includeHiddenElements: true })`. Um `setTimeout` pendente (ex.: GPS que nunca responde) impede o Jest de encerrar: nos testes faça o GPS responder.
- **API:** `PATCH` de status usa gravação condicional ao status lido (conflito vira 422). Testes de integração só rodam em banco `*_test`.

## Ao implementar

1. Leia o RF/RN/US/UC da tarefa e a tela correspondente em `docs/05-telas-e-fluxos.md` (o Figma é fonte visual; consulte-o com o MCP do Figma quando precisar).
2. Escreva primeiro os testes das regras de negócio.
3. Mantenha os contratos de `docs/10-api.md` (inclusive os payloads dos eventos WebSocket).
4. Fixe as versões das dependências no setup (`npm view`) e atualize `docs/08-tecnologias.md`.
