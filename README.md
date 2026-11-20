# Tá Ligado?

Aplicativo mobile para **registrar denúncias de queda de energia elétrica** em Marabá-PA e acompanhar a situação em tempo real. O cidadão informa que está sem luz, a ocorrência é registrada (localização, horário e detalhes) e chega **em tempo real à operadora (Equatorial Pará)**, que atualiza o status e a previsão de reparo. A integração com a operadora é **simulada** por um Painel Web (ver [ADR-0001](docs/adr/0001-integracao-simulada-com-operadora.md)).

> Projeto final da disciplina de **Desenvolvimento Mobile (UNIFESSPA)**.
> **Status:** documentação concluída; **Fase 0 (setup inicial) e Fase 1 (MVP: denunciar, acompanhar em tempo real e visão pública) implementadas**; falta o ensaio manual no Expo Go (ver o `CHANGELOG.md` e o roteiro abaixo).

- **Protótipo (Figma):** <https://www.figma.com/design/XiDKX3D8j02JggOwKPDdGp/Mobile---T%C3%A1-ligado-?node-id=0-1>

## Visão geral

| Aplicação | Pasta | Para quem | Tecnologias |
|---|---|---|---|
| App do cidadão | `apps/mobile` | Cidadão | React Native, Expo, TypeScript, Expo Router, React Native Maps, Expo Location, Image Picker, Notifications, socket.io-client |
| Painel da operadora | `apps/painel` | Operador (Equatorial, simulada) | React, Vite, TypeScript, Leaflet, socket.io-client |
| API | `apps/api` | Os dois clientes | Node.js, Express, Prisma, PostgreSQL, Socket.IO, JWT |

Fluxo resumido: **cidadão envia → API salva → painel recebe em tempo real → operador atualiza o status → app recebe (WebSocket e push)**. Diagrama em [docs/07-arquitetura.md](docs/07-arquitetura.md#2-fluxo-em-tempo-real).

## Como rodar o projeto

**Pré-requisitos:** Node.js 22 LTS ou superior (testado com 24), npm 10+, Docker (PostgreSQL) e o app **Expo Go** no celular (Android ou iOS). Reserve **pelo menos 4 GB livres em disco** para `node_modules` e para a imagem do Docker.

```bash
# 1. Dependências (monorepo com npm workspaces)
npm install

# 2. Variáveis de ambiente (copie os exemplos; os .env não vão para o Git)
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/painel/.env.example apps/painel/.env
cp apps/mobile/.env.example apps/mobile/.env   # ajuste EXPO_PUBLIC_API_URL com o IP da sua máquina

# 3. Banco de dados (PostgreSQL 17)
npm run db:up

# 4. Esquema e dados iniciais (primeira migration + seed de bairros e operador de teste)
npm run db:migrate
npm run db:seed

# 5. Subir tudo (API, painel e Expo) com um comando...
npm run dev
#    ...ou cada app separado:
npm run dev:api      # http://localhost:3000  (GET /health)
npm run dev:painel   # http://localhost:5173
npm run dev:mobile   # abre o Expo; escaneie o QR code com o Expo Go
```

**Conta Expo (obrigatória):** o Expo Go exige que o Expo CLI do computador e o app Expo Go do celular estejam **logados na mesma conta Expo** (gratuita, em <https://expo.dev/signup>). No computador rode `npx expo login` (confira com `npx expo whoami`) e entre com a mesma conta no Expo Go. Sem isso, o celular mostra "You need to be signed in to Expo Go and Expo CLI". O celular e o computador também precisam estar na mesma rede; em redes que isolam aparelhos (como o Wi-Fi da universidade), use `npx expo start --tunnel` em `apps/mobile`.

**Operador de teste (somente desenvolvimento):** `operador@taligado.local` / `operador-dev-123` (definido em `apps/api/.env`).

**Verificações:** `npm run lint`, `npm run typecheck` e `npm test` na raiz rodam todos os apps. Para a cobertura da API: `npm run test:coverage -w apps/api`.

**Banco de teste:** os testes de integração da API usam o banco `taligado_test` (o mesmo servidor do Docker), **criado e migrado automaticamente** na primeira execução. Eles apagam as tabelas desse banco a cada teste, então **nunca** apontam para o banco de desenvolvimento: o `vitest.config.ts` troca o nome do banco para `*_test` e o `globalSetup` recusa qualquer banco cujo nome não termine em `_test`. Rode `npm run db:up` antes de `npm test`.

**Dados de demonstração (opcional):** `npm run db:seed:demo -w apps/api` cria 3 contas de cidadão de exemplo (`demo1@taligado.local`, `demo2@taligado.local` e `demo3@taligado.local`, senha `demo-12345`) e 5 denúncias em estados variados (recebida, em atendimento, oscilação, resolvida e improcedente), para a Home, as Ocorrências e o painel não ficarem vazios. Pode rodar várias vezes (só recria as denúncias dessas contas) e **nunca roda em produção**.

## Roteiro de demonstração

Teste ponta a ponta, com os três lados ao mesmo tempo (API, painel no navegador e app no celular):

1. `npm run db:up`, `npm run db:seed` e `npm run dev` (API em `:3000`, painel em `:5173` e Expo).
2. **Painel:** entre como `operador@taligado.local` (senha em `apps/api/.env`). Abra a aba **Lista** e clique em **Ativar som**.
3. **Celular (Expo Go):** **cadastre** uma conta de cidadão e entre. Na Início, confira "Olá, {nome}!", o selo **Rede Estável** e o mini-mapa.
4. **Denunciar:** toque em "Registre sua denúncia", escolha **Sem energia**, confira o bairro sugerido pelo GPS e **envie**. Anote o protocolo (`TL-AAAA-NNNNNN`).
5. **Painel, sem recarregar:** em até 2 s a denúncia aparece na lista com o alerta "Nova denúncia" e o som.
6. **Painel:** filtre por status, veja a denúncia no **Mapa**, abra o detalhe e clique em **Iniciar atendimento** (com previsão de reparo).
7. **App:** o detalhe e "Minhas denúncias" mostram **Em atendimento** em até 2 s, com o histórico e a previsão. Em Início e Ocorrências o selo muda para **Rede Instável**, e o círculo do bairro fica vermelho.
8. **Painel:** marque como **Resolvida**. O app atualiza, o bairro volta a **Normal** (círculo verde) e a ocorrência aparece em "Restabelecidos".
9. **Limite:** com a denúncia em aberto, tente enviar uma segunda: o app avisa e leva à que está aberta (409). Depois de resolvida, é possível enviar outra.
10. **Improcedente:** no painel, o botão exige a justificativa (10 a 500 caracteres); ela aparece para o cidadão no detalhe.
11. **Offline:** desligue a internet do celular. As telas continuam com os dados salvos e o aviso "Sem conexão" com a data da última atualização; o formulário guarda o rascunho. Religue: tudo atualiza sozinho.

**Observações**
- No Expo Go o mapa funciona **sem chave** do Google Maps; no painel o mapa usa Leaflet com OpenStreetMap (também sem chave). `GOOGLE_MAPS_API_KEY` e as credenciais de push (FCM/APNs) ficam nos `.env.example` **sem valor** e só serão necessárias no *development build* (pendência PEN-04).
- Push remoto não funciona no Expo Go: é o último item do roadmap e exige *development build* (decisão D-03).
- O celular não enxerga `localhost`: use o IP da máquina na rede local em `EXPO_PUBLIC_API_URL` (ex.: `http://192.168.0.10:3000`).
- Os bairros do seed são **dados aproximados para fins de demonstração** (`apps/api/prisma/seed-data/bairros.ts`).

## Documentação

| Documento | Conteúdo |
|---|---|
| [01 – Visão e escopo](docs/01-visao-e-escopo.md) | Problema, objetivo, personas, escopo do MVP, **suposições e pendências** |
| [02 – Requisitos funcionais](docs/02-requisitos/requisitos-funcionais.md) | RF-001 a RF-036 |
| [02 – Requisitos não funcionais](docs/02-requisitos/requisitos-nao-funcionais.md) | RNF-001 a RNF-025 (ISO/IEC 25010) |
| [02 – Regras de negócio](docs/02-requisitos/regras-de-negocio.md) | RN-001 a RN-025 |
| [03 – Histórias de usuário](docs/03-historias-de-usuario.md) | US-001 a US-019 com Gherkin |
| [04 – Casos de uso](docs/04-casos-de-uso.md) | UC-01 a UC-09 |
| [05 – Telas e fluxos](docs/05-telas-e-fluxos.md) | Telas do Figma, links, navegação e **telas a criar** |
| [06 – Design system](docs/06-design-system.md) | Cores, tipografia, espaçamentos, componentes |
| [07 – Arquitetura](docs/07-arquitetura.md) | Visão geral, tempo real, pastas, estado e offline |
| [08 – Tecnologias](docs/08-tecnologias.md) | Tecnologias, justificativas e alternativas |
| [09 – Modelo de dados](docs/09-modelo-de-dados.md) | Entidades e diagrama ER |
| [10 – API](docs/10-api.md) | Endpoints, erros, **eventos WebSocket**, OpenAPI |
| [11 – Segurança e LGPD](docs/11-seguranca-e-lgpd.md) | Dados pessoais, bases legais, direitos, antiabuso |
| [12 – Acessibilidade](docs/12-acessibilidade.md) | Metas WCAG 2.2 AA |
| [13 – Estratégia de testes](docs/13-estrategia-de-testes.md) | Unitários, integração, E2E e cobertura |
| [14 – Roadmap e backlog](docs/14-roadmap-e-backlog.md) | Fases e backlog priorizado |
| [15 – Glossário](docs/15-glossario.md) | Termos do domínio |
| [16 – Plano da Fase 1](docs/16-plano-fase-1.md) | PRs, tarefas, testes e critérios do MVP |
| [ADRs](docs/adr/) | [0001 integração simulada](docs/adr/0001-integracao-simulada-com-operadora.md) · [0002 Socket.IO](docs/adr/0002-socketio-para-tempo-real.md) · [0003 monorepo](docs/adr/0003-monorepo-com-tres-aplicacoes.md) · [0004 JWT + RBAC](docs/adr/0004-autenticacao-jwt-com-rbac.md) · [0005 offline simples](docs/adr/0005-estrategia-offline-simples.md) |

## Contribuindo

Veja [CONTRIBUTING.md](CONTRIBUTING.md) (branches, Conventional Commits e Pull Requests) e o [CHANGELOG](CHANGELOG.md).

## Licença

[MIT](LICENSE)
