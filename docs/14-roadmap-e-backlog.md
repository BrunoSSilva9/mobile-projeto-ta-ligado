# 14 – Roadmap e backlog

Priorização por **MoSCoW** e por dependência técnica. O prazo inicial de uma semana (a partir de 2026-11-18) foi **estendido**: as fases avançam por ordem de dependência, uma etapa por vez, sem datas fixas. Esforço: **P** (≤ 1 dia), **M** (2 a 3 dias), **G** (≥ 4 dias), estimativa inicial.

## Roadmap

```mermaid
flowchart LR
  F0["Fase 0<br/>Fundação"] --> F1["Fase 1<br/>MVP (Must)"] --> RD["Redesign<br/>design system v2"] --> F2["Fase 2<br/>MVP+ (Should)"] --> F3["Fase 3<br/>Polimento (Could)"] --> FUT["Futuro<br/>(fora do MVP)"]
```

| Fase | Objetivo | Entrega observável |
|---|---|---|
| **0 – Fundação** | Monorepo, ambiente, CI, banco, tema | `docker compose up` + apps abrindo, CI verde |
| **1 – MVP (Must)** | Ciclo completo cidadão → operadora → cidadão | Demonstração: cadastra, denuncia, painel recebe em tempo real, operador atualiza, app reflete |
| **Redesign do app (v2)** | Novo design system (azul para tocar, situação da energia sempre com ícone e texto, Atkinson Hyperlegible) e telas novas, só em `apps/mobile` | App no novo visual, com o mesmo comportamento da Fase 1 ([17](17-plano-redesign.md)) |
| **2 – MVP+ (Should)** | Completar experiência e conformidade, **por camada** (API, painel e app) | Cancelar, pessoas e necessidade especial (com consentimento e retenção), fotos, perfil e exclusão de conta, previsão, lote e indicadores no painel; **push condicional, por último** ([18](18-plano-fase-2.md)) |
| **3 – Polimento (Could)** | Refinos | Busca, mapa em tela cheia, alterar endereço, E2E |
| **Futuro** | Evolução | Itens da seção "Fora do MVP" |

> **Estado (2026-11-25):** Fases 0 e 1 concluídas; **redesign do app (B-046) concluído e mergeado na `develop`** (PR #5). Agora vem a **Fase 2**, por camada, com o plano em [18 – Plano da Fase 2](18-plano-fase-2.md) (decisões S-45 a S-60). O cronograma de uma semana do plano original foi **substituído** pela ordem abaixo.

## Ordem da Fase 2

Uma etapa por vez, na branch `feature/fase-2`; cada etapa só começa depois da verificação da anterior (S-54). A ordem segue as dependências: a exclusão de conta vem depois de necessidade especial e fotos, porque precisa apagar os dois; o que faltava da prioridade (B-033) entra junto com a necessidade especial.

| Etapa | Itens | Camadas | Estimativa |
|---|---|---|---|
| F2-0 Preparação | Plano, decisões, regras e backlog | docs | P (1 h) |
| F2-1 Cancelar denúncia | B-036 | API, app, painel | P (4 h) |
| F2-2 Pessoas, necessidade especial e prioridade | B-032, B-033 | API, app, painel | M (8 h) |
| F2-3 Fotos | B-031 | API, app, painel | G (14 h) |
| F2-4 Perfil e exclusão de conta | B-037 | API, app, painel | M (8 h) |
| F2-5 Previsão de reparo | B-034 | API, painel | P (4 h) |
| F2-6 Resolução em lote | B-035 | API, painel | M (6 h) |
| F2-7 Indicadores (só no painel) | B-038 | API, painel | P (4 h) |
| F2-8 Acessibilidade e fechamento | B-039 | app, painel, docs | M (4 h) |
| **Total sem push** | | | **≈ 53 h** |
| F2-9 Push (condicional: *development build* + PEN-04) | B-030 | API, app | G (10 h) |
| Could | B-045 | painel | P (3 h) |

> **Se for preciso cortar**, nesta ordem: B-045, B-030 (push), B-035 (lote), B-038 (indicadores). Cancelar, necessidade especial, fotos e exclusão de conta não são cortados.

> O **plano detalhado da Fase 1** (PRs, arquivos, testes e critérios) está em [16 – Plano de implementação da Fase 1](16-plano-fase-1.md).

## Backlog priorizado

### Fase 0 – Fundação

| ID | Item | Esforço | Requisitos |
|---|---|---|---|
| B-001 | Criar monorepo (npm workspaces), ESLint, Prettier, `.editorconfig`, commitlint | P | RNF-019, [ADR-0003](adr/0003-monorepo-com-tres-aplicacoes.md) |
| B-002 | `docker-compose.yml` com PostgreSQL; `.env.example` | P | RNF-022, RNF-023 |
| B-003 | API base (Express, config, erros, logger) + Prisma + migrations iniciais + seed (bairros e operadores) | M | RNF-021, RN-021 |
| B-004 | App Expo + Expo Router + tema/tokens + fontes + componentes base | M | [06](06-design-system.md) |
| B-005 | Painel Vite + React Router + tokens | P | [06](06-design-system.md) |
| B-006 | Workflow de CI (lint, tipos e testes) | P | RNF-019 |

### Fase 1 – MVP (Must)

| ID | Item | Esforço | Requisitos / regras |
|---|---|---|---|
| B-010 | Domínio: status do bairro, transições, limite, permissões, protocolo + **testes unitários** | M | RN-004 a RN-007, RN-023, RF-023, RF-011 |
| B-011 | Auth: cadastro, login, JWT, RBAC, middleware | M | RF-001, RF-003, RF-026, RN-001, RN-020, RN-022 |
| B-012 | Telas T-01 e T-02 (cadastro/login) com consentimento e termos | M | RF-001, RF-002, RF-003 |
| B-013 | API de denúncias: criar, minhas, detalhe, histórico (transação) | G | RF-007, RF-011, RF-013, RF-014, RF-036, RN-006, RN-011, RN-012 |
| B-014 | Socket.IO: autenticação, salas e eventos | M | RF-024, RF-027, [ADR-0002](adr/0002-socketio-para-tempo-real.md) |
| B-015 | App: tela Registrar Denúncia com GPS, tipo, bairro, validações e rascunho | G | RF-007, RF-008, RNF-008 |
| B-016 | App: sucesso (T-06), Minhas denúncias (T-09), Detalhe (T-07) com tempo real | G | RF-012, RF-013, RF-014, RF-024 |
| B-017 | API de bairros/ocorrências: status por bairro, lista pública anonimizada, bairro mais próximo | M | RF-016, RF-019, RF-020, RN-014, RN-025 |
| B-018 | App: Home (T-03) e Ocorrências (T-04) com mapa, chips e lista | G | RF-016, RF-019, RF-020, RF-023 |
| B-019 | API painel: listagem com filtros, detalhe, atualizar status | M | RF-028, RF-030, RF-031, RF-032 |
| B-020 | Painel: login (P-01), lista e filtros, mapa (P-02) | G | RF-026, RF-028, RF-029 |
| B-021 | Painel: alerta visual e sonoro em tempo real | M | RF-027, S-19 |
| B-022 | Painel: detalhe e atualização de status com justificativa (P-03) | M | RF-030, RF-031, RF-032 |
| B-023 | Estados vazio/erro/carregando/offline e cache persistido | M | RNF-006, RNF-007, RNF-009 |
| B-024 | Testes de integração da API (fluxos principais) | M | [13](13-estrategia-de-testes.md) |
| B-025 | README com roteiro de demonstração e instruções de execução | P | — |

### Fase 2 – MVP+ (Should)

| ID | Item | Esforço | Requisitos |
|---|---|---|---|
| B-030 | **Push (condicional, F2-9):** registro de token, envio com `expo-server-sdk`, abrir detalhe pelo toque; exige *development build* (D-03) e credenciais (PEN-04). Nenhuma etapa depende dele (S-45) | G | RF-025, RN-019 |
| B-031 | Anexar até 3 fotos: redução e remoção de EXIF no app e na API, tipo pelo conteúdo, rota autenticada, miniaturas (F2-3, S-49) | G | RF-009, RN-013, RNF-015 |
| B-032 | Pessoas no local e necessidade especial **só Sim/Não**, com consentimento específico e retenção até o fim da denúncia (F2-2, S-46 a S-48) | M | RF-010, RN-015, RN-026 |
| B-033 | Prioridade no painel. Destaque, ordenação e filtro **já entregues na Fase 1**; o que falta (nulos na ordem, pessoas e retenção no detalhe) entra na F2-2 | P | RF-035 |
| B-034 | Previsão de reparo editável e removível no painel; o app já mostra no detalhe e no cartão do bairro (F2-5) | P | RF-033, RN-009 |
| B-035 | Aba "Por bairro" e resolução em lote, com confirmação (F2-6; menor prioridade do painel) | M | RF-034, RN-016 |
| B-036 | Cancelar denúncia recebida, no detalhe (F2-1) | P | RF-015, RN-005 |
| B-037 | Perfil: editar nome e telefone; **excluir conta** (anonimização; denúncia aberta continua aberta) (F2-4, S-50) | M | RF-004, RF-005, RF-006, RN-024 |
| B-038 | Indicadores dos últimos 30 dias **só no painel da operadora** (F2-7, S-52) | P | RF-018, RN-017 |
| B-039 | Acessibilidade: só o que o redesign não cobriu (telas novas do app e do painel) (F2-8) | M | RNF-024, [12](12-acessibilidade.md) |

### Redesign do app (design system v2): antes da Fase 2

| ID | Item | Esforço | Referência |
|---|---|---|---|
| B-046 | Redesign completo do app do cidadão (tokens e fonte, componentes, barra inferior, Início, Mapa, Denunciar em 3 passos, Sucesso, Ajuda, ajustes nas demais telas), em `feature/redesign-v2`, **sem mudar API, painel nem regras de negócio. **Concluído e mergeado na `develop` (PR #5)** | G | [17](17-plano-redesign.md), ADR-0006 |

### Fase 3 – Polimento (Could)

| ID | Item | Esforço | Requisitos |
|---|---|---|---|
| B-040 | Alterar endereço de consulta na Home. **Feito no redesign (B-046)**, só no aparelho (AsyncStorage), sem ir para a API | P | RF-017 |
| B-041 | Busca por bairro ou folha. **Já entregue na Fase 1** (T-04); no redesign o rótulo vira "Procurar bairro ou folha" | P | RF-021 |
| B-042 | Mapa em tela cheia | P | RF-022 |
| B-043 | E2E (Playwright e Maestro) | M | [13](13-estrategia-de-testes.md) |
| B-044 | Revisão de segurança (rate limit, headers, validação de upload) e cobertura | M | RNF-014 |
| B-045 | **Painel:** alinhar as cores de situação (sem energia, oscilando, normal) e o tema do painel com o design system v2 do app. Fora do redesign de 2026-11; fica no fim da Fase 2 como Could (S-53) | P | [17](17-plano-redesign.md), [06](06-design-system.md) |

### Fora do MVP (backlog futuro)

| ID | Item | Observação |
|---|---|---|
| B-100 | "Esqueci a senha" (e-mail) | Pedido no escopo; depende de serviço de e-mail |
| B-101 | Login com Google | Pedido no escopo |
| B-102 | **Integração real com a Equatorial Pará via API**, substituindo o painel | [ADR-0001](adr/0001-integracao-simulada-com-operadora.md) |
| B-103 | Aviso por WhatsApp | Fora do escopo definido |
| B-104 | Confirmação de denúncias por vizinhos | Remove "confirmações" do texto atual |
| B-105 | Vídeo como anexo | Limite de tamanho e armazenamento |
| B-106 | Fila de envio offline com idempotência | [ADR-0005](adr/0005-estrategia-offline-simples.md) |
| B-107 | Modo escuro | Pedido no escopo |
| B-108 | Polígonos de bairros (PostGIS) | Substituir os centros |
| B-109 | Armazenamento de fotos em nuvem e escala do Socket.IO (Redis) | [07](07-arquitetura.md) |
| B-110 | Bloqueio de contas com reincidência de improcedentes; verificação de e-mail | [11](11-seguranca-e-lgpd.md) |
| B-111 | Refresh token | [ADR-0004](adr/0004-autenticacao-jwt-com-rbac.md) |
| B-112 | Exportação de dados (portabilidade) | [11](11-seguranca-e-lgpd.md) |

## Rastreabilidade RF → backlog

| RF | Backlog | RF | Backlog | RF | Backlog |
|---|---|---|---|---|---|
| RF-001 | B-011, B-012 | RF-013 | B-013, B-016 | RF-025 | B-030 |
| RF-002 | B-012 | RF-014 | B-013, B-016 | RF-026 | B-011, B-020 |
| RF-003 | B-011, B-012 | RF-015 | B-036 | RF-027 | B-014, B-021 |
| RF-004 | B-016, B-037 | RF-016 | B-017, B-018 | RF-028 | B-019, B-020 |
| RF-005 | B-037 | RF-017 | B-040 | RF-029 | B-020 |
| RF-006 | B-037 | RF-018 | B-038 | RF-030 | B-019, B-022 |
| RF-007 | B-013, B-015 | RF-019 | B-017, B-018 | RF-031 | B-019, B-022 |
| RF-008 | B-015 | RF-020 | B-017, B-018 | RF-032 | B-019, B-022 |
| RF-009 | B-031 | RF-021 | B-041 | RF-033 | B-034 |
| RF-010 | B-032 | RF-022 | B-042 | RF-034 | B-035 |
| RF-011 | B-010, B-013 | RF-023 | B-010, B-017, B-018 | RF-035 | B-033 |
| RF-012 | B-016 | RF-024 | B-014, B-016 | RF-036 | B-013, B-022 |

## Riscos do cronograma

| Risco | Mitigação |
|---|---|
| Push exige *development build* e credenciais (PEN-04) | Decisão D-03: dev no Expo Go; push é o **último** item e só entra se sobrar tempo; o Must funciona só com WebSocket |
| Mapas no Android exigem chave do Google em *builds* próprios (PEN-04) | Expo Go não precisa de chave; plano B com tiles OSM (`UrlTile`). Painel usa Leaflet + OSM (sem chave) |
| Três aplicações em um prazo curto | Fase 1 mínima; telas do painel simples; reuso dos tokens |
| Telas ausentes no Figma (PEN-06) | Descrições em [05](05-telas-e-fluxos.md#telas-a-criar-no-protótipo) como guia |
