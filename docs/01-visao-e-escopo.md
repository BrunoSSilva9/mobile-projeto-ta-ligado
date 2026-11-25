# 01 – Visão e escopo

> **Tá Ligado?** é um aplicativo mobile para registrar denúncias de queda de energia elétrica em Marabá-PA e acompanhar a situação em tempo real. Projeto final da disciplina de **Desenvolvimento Mobile (UNIFESSPA)**.

- Protótipo (Figma): <https://www.figma.com/design/XiDKX3D8j02JggOwKPDdGp/Mobile---T%C3%A1-ligado-?node-id=0-1>
- Convenção de rastreabilidade: requisitos `RF-xxx`, `RNF-xxx`, regras `RN-xxx`, histórias `US-xxx`, casos de uso `UC-xxx`, telas `T-xx` (app) e `P-xx` (painel), decisões `S-xx`, pendências `PEN-xx`.
- Regra do projeto: **escopo enxuto e viável para um MVP acadêmico**. Na dúvida, escolheu-se a opção mais simples e a escolha foi registrada (ver seção 8).

## 1. Problema

Quando falta energia em um bairro de Marabá, o morador não tem um canal simples para avisar a operadora, nem sabe se os vizinhos já avisaram, se há equipe a caminho ou quando a luz volta. A informação fica dispersa em grupos de mensagens e ligações para a central.

## 2. Objetivo

1. Permitir que o **cidadão** registre uma queda ou oscilação de energia em poucos passos, com localização, horário e detalhes.
2. Fazer a denúncia **chegar em tempo real à operadora (Equatorial Pará)**, que é quem resolve o problema.
3. Permitir que o cidadão **acompanhe** o andamento (status, previsão de reparo, histórico) e veja o panorama público dos bairros.
4. Dar ao **operador** um painel web para receber, priorizar e atualizar o status das denúncias.

### Integração com a operadora (decisão de escopo)

A Equatorial não possui API pública para esse fim. No MVP a integração é **simulada**: existe um segundo perfil, o **Operador**, e um **Painel Web da Operadora** onde as denúncias chegam por WebSocket e o status é atualizado. Cada mudança de status volta em tempo real ao app do cidadão (WebSocket + push). Num cenário real, o painel seria substituído por uma integração via API com o sistema da Equatorial: ver [ADR-0001](adr/0001-integracao-simulada-com-operadora.md) e [07 – Arquitetura](07-arquitetura.md).

## 3. Público-alvo

| Público | Descrição |
|---|---|
| Cidadão | Morador de Marabá-PA com smartphone Android ou iOS. |
| Operador | Funcionário (simulado) da Equatorial Pará que usa o painel web em computador. |

Avaliadores da disciplina também são usuários diretos da demonstração.

## 4. Personas

**Maria, 34 anos, moradora da Nova Marabá (cidadã).** Cuida da mãe idosa, que usa inalador. Quando a luz cai, quer avisar rápido, saber se é só na casa dela e quando volta. Usa o celular o dia todo, mas com internet móvel instável.

**Carlos, 41 anos, atendente de operações da concessionária (operador).** Recebe muitas ligações sobre o mesmo problema. Quer ver as ocorrências em mapa e lista, agrupadas por bairro, priorizar casos com risco à saúde e informar o andamento sem repetir a mesma resposta por telefone.

## 5. Escopo do MVP

### Dentro do escopo

**App do cidadão (React Native/Expo)**
- Cadastro e login com e-mail e senha (T-01, T-02).
- Home com status do bairro, banner de denúncia e painel comunitário dos últimos 30 dias (T-03).
- Aba Ocorrências: mapa com zonas por status, filtros e lista pública anonimizada (T-04).
- Registro de denúncia com GPS, tipo (Sem energia / Oscilação), fotos opcionais, pessoas afetadas e necessidade especial (T-05) e tela de sucesso com protocolo (T-06).
- Detalhe da denúncia com histórico de status (T-07).
- Perfil, "Minhas denúncias", cancelamento de denúncia recebida e exclusão de conta (T-08, T-09).
- Atualização em tempo real (WebSocket) e notificações push (Expo Notifications).

**Painel web da operadora (React + Vite)**
- Login do operador, recebimento de denúncias em tempo real com alerta visual e sonoro, lista e mapa com filtros, detalhe completo, atualização de status, justificativa de improcedência, previsão de reparo, agrupamento por bairro com resolução em lote e destaque de prioritárias (P-01 a P-03).

**API (Node.js + Express + Prisma + PostgreSQL + Socket.IO)**
- Autenticação JWT com RBAC (`CIDADAO`, `OPERADOR`), regras de negócio, eventos em tempo real e armazenamento local de fotos.

### Fora do escopo do MVP (vai para o backlog, ver [14](14-roadmap-e-backlog.md))

- "Esqueci a senha" e login com Google.
- Integração real com sistemas da Equatorial Pará.
- Envio de avisos por WhatsApp.
- Confirmação de denúncias por vizinhos.
- Vídeos como anexo.
- Fila de envio offline (o MVP guarda rascunho e exige internet para enviar).
- Modo escuro.
- Cadastro público de operadores.
- Abrangência fora de Marabá-PA.
- Polígonos geográficos reais de bairros (usa-se o centro do bairro).

## 6. Premissas

- O app é usado em Marabá-PA e a lista de bairros e folhas é fixa (seed no banco).
- Operadores são criados por seed; o painel não tem cadastro público.
- Os dados exibidos nos indicadores vêm do próprio banco do projeto, não da Equatorial.
- O avaliador consegue rodar o projeto localmente (Docker Compose + Expo) ou em uma demonstração hospedada.
- O cidadão concede permissão de localização; sem ela, o envio continua possível com endereço digitado.

## 7. Restrições

- Projeto acadêmico, equipe pequena e prazo da disciplina.
- Stack definida: React Native + Expo + TypeScript (app), React + Vite (painel), Node.js + Express + Prisma + PostgreSQL (API). Ver [08](08-tecnologias.md).
- Notificações push remotas exigem *development build* (não funcionam apenas no Expo Go em Android recentes). Ver [ADR-0002](adr/0002-socketio-para-tempo-real.md) e [08](08-tecnologias.md).
- Fotos em armazenamento local do servidor (sem serviço de nuvem).
- LGPD: coleta mínima de dados e consentimento explícito ([11](11-seguranca-e-lgpd.md)).

## 8. Decisões e pendências

### 8.1 Decisões (lista de rastreabilidade)

Nos documentos, cada decisão aparece como "(decisão S-xx)". **S-01 a S-21 foram aprovadas** pela equipe em 2026-11-18 e são tratadas como decisões firmes. **S-22 a S-43 são decisões adicionais** tomadas durante a documentação para manter o escopo simples e **aguardam confirmação**.

| ID | Decisão |
|---|---|
| S-01 | Transições de status permitidas: `RECEBIDA → EM_ATENDIMENTO`, `RECEBIDA → IMPROCEDENTE`, `EM_ATENDIMENTO → RESOLVIDA`, `EM_ATENDIMENTO → IMPROCEDENTE`. A resolução em lote por bairro é a única exceção e permite `RECEBIDA → RESOLVIDA` (RN-004, RN-016). |
| S-02 | "Rede Estável" na Home = bairro com status Normal; "Instável" = Sem luz ou Oscilação (RN-008). |
| S-03 | A "previsão de reparo" exibida por bairro é a **menor previsão futura** entre as denúncias em aberto do bairro (RN-009). |
| S-04 | O card "3 denúncias no raio de 500 m hoje" vira "N denúncias em aberto no seu bairro", pois não há validação de raio (RN-012). |
| S-05 | `Bairro` guarda nome, folha (opcional) e coordenadas do centro. O "bairro do usuário" é o de centro mais próximo do GPS, ou o escolhido manualmente (RN-025). |
| S-06 | Protocolo no formato `TL-AAAA-NNNNNN` (ex.: `TL-2026-000123`) (RN-023). |
| S-07 | A descrição da denúncia é opcional, com até 500 caracteres. |
| S-08 | Validade do JWT: 7 dias no app e 8 horas no painel. |
| S-09 | Fotos aceitas: JPEG e PNG, até 3 por denúncia e 5 MB cada (RN-013). |
| S-10 | Versões mínimas: Android 8.0 (API 26) e iOS 15.1 (RNF-016). Confirmar contra o Expo SDK escolhido na criação do app. |
| S-11 | Exclusão de conta remove os dados pessoais e **anonimiza** as denúncias, que permanecem para estatística (RN-024). |
| S-12 | Senha com no mínimo 8 caracteres (RN-022). |
| S-13 | O push é enviado somente quando o **operador** muda o status, e não quando o próprio cidadão cancela (RN-019). |
| S-14 | Retenção: logs de acesso por 6 meses; dados pessoais enquanto a conta existir; denúncias anonimizadas por prazo indeterminado ([11](11-seguranca-e-lgpd.md)). |
| S-15 | A busca da aba Ocorrências é por bairro ou folha; o filtro por CEP do protótipo foi retirado (RF-021). |
| S-16 | O mapa mostra círculos por bairro (cor = status do bairro) e pinos das denúncias em aberto; não há polígonos reais. |
| S-17 | O painel é desktop-first (a partir de 1024 px), com layout próprio proposto nesta documentação (P-01 a P-03). |
| S-18 | Limitação de taxa (rate limit): 100 req/min por IP; 5 tentativas de login/min por IP e e-mail. |
| S-19 | O alerta sonoro do painel exige um clique inicial do operador ("Ativar som"), por limitação dos navegadores. |
| S-20 | As versões das tecnologias em [08](08-tecnologias.md) são **versões-alvo** e serão fixadas (`npm view`) no setup. |
| S-21 | O chip "Restabelecidos" da lista pública conta ocorrências resolvidas nas últimas 24 horas (RN-007). |
| S-22 | O e-mail é somente leitura no Perfil (RF-005). *(a confirmar)* |
| S-23 | Editar o endereço mantém as coordenadas originais do GPS, salvo se o usuário mover o pino (RF-008). *(a confirmar)* |
| S-24 | O botão de detalhe da lista pública (T-04) abre um resumo anonimizado em modal, e não T-07 (exclusivo do autor). *(a confirmar)* |
| S-25 | O CEP é opcional na denúncia (T-05, `Denuncia.cep`). *(a confirmar)* |
| S-26 | Cores dos status da denúncia: Recebida `#466556`, Em atendimento âmbar, Resolvida verde, Improcedente/Cancelada cinza `#6E7A6D` ([06](06-design-system.md)). *(a confirmar)* |
| S-27 | Estilização com `StyleSheet` e tema próprio, sem biblioteca de UI. *(a confirmar)* |
| S-28 | Pinos públicos usam coordenadas arredondadas (RN-014). *(a confirmar)* |
| S-29 | Sem controle de versão otimista no `PATCH` de status; conflitos viram 422 `TRANSICAO_INVALIDA` ([10](10-api.md)). *(a confirmar)* |
| S-30 | O e-mail do autor é visível ao operador apenas quando necessário ([11](11-seguranca-e-lgpd.md)). *(a confirmar)* |
| S-31 | Portabilidade de dados atendida sob solicitação, por exportação em JSON feita pela equipe. *(a confirmar)* |
| S-32 | Tipos compartilhados ficam duplicados de forma controlada; um pacote `packages/shared` só se necessário ([ADR-0003](adr/0003-monorepo-com-tres-aplicacoes.md)). *(a confirmar)* |
| S-33 | `POST /denuncias` aceita JSON na Fase 1; o `multipart` (fotos) entra com B-031 ([16](16-plano-fase-1.md)). *(confirmada em 2026-11-19: fotos só na Fase 2)* |
| S-34 | O protocolo vem de uma tabela `ProtocoloSequencia(ano, ultimo)` com incremento atômico. *(a confirmar)* |
| S-35 | JWT com `jsonwebtoken`; validade por papel: cidadão 7 dias, operador 8 horas. *(a confirmar)* |
| S-36 | Testes de integração usam o banco separado `taligado_test`. *(a confirmar)* |
| S-37 | T-08 mínimo (dados, Minhas denúncias, Sair) entra na Fase 1; RF-004 passa a B-016. *(a confirmar)* |
| S-38 | O formulário T-05 da Fase 1 não tem fotos, pessoas afetadas nem necessidade especial. *(confirmada em 2026-11-19: fotos só na Fase 2)* |
| S-39 | O `PATCH` de status do painel já aceita `previsaoReparo`. *(a confirmar)* |
| S-40 | As regras de `domain/` recebem dados simples (sem Prisma); o *service* faz a consulta. *(a confirmar)* |
| S-41 | Rotas do app reorganizadas em `(auth)` e `(app)/(tabs)` com `Stack.Protected` (API a conferir no SDK 58). *(a confirmar)* |
| S-42 | A Fase 1 inteira é feita em **uma branch (`feature/fase-1`) e um PR**, por Bruno, sem prazos fixos ([16](16-plano-fase-1.md)). *(definida em 2026-11-19)* |
| S-43 | Banco de desenvolvimento e de testes em PostgreSQL local (Docker); um PostgreSQL hospedado gratuito é opcional e só para demonstração. *(definida em 2026-11-19)* |
| S-44 | **Redesign do app do cidadão (design system v2), aprovado em 2026-11-23:** paleta azul (azul para tocar; vermelho, laranja e verde só para a situação da energia, sempre com ícone e texto), fonte **Atkinson Hyperlegible** no lugar da Plus Jakarta Sans, letra grande (mínimo de 14), a aba "Ocorrências" passa a se chamar **"Mapa"** só no texto (a rota continua `/ocorrencias`) e o fluxo de denunciar vira um passo a passo de **3 passos**. Só `apps/mobile`: painel, API, contratos e regras de negócio não mudam. A Fase 2 vem depois ([06](06-design-system.md), [17](17-plano-redesign.md), [ADR-0006](adr/0006-redesign-design-system-v2.md)). *(definida em 2026-11-23)* |
| S-45 | **Fase 2 por camada (API, painel e app)**, plano em [18](18-plano-fase-2.md). O **push** fica fora desta rodada: última etapa, condicional (development build + PEN-04), e nenhuma etapa depende dele. O lote (B-035) tem a menor prioridade entre os itens do painel. *(definida em 2026-11-25)* |
| S-46 | **Necessidade especial só Sim/Não, sem texto livre** (minimização de dado de saúde). Pergunta: "Alguém no local depende de aparelho elétrico, como respirador ou geladeira de remédios, ou tem necessidade especial?". Com "Sim", aparece um **consentimento específico e destacado**, separado dos Termos (LGPD, art. 11): a informação vai para a Equatorial só para priorizar o atendimento. Sem o aceite, o campo não é enviado (RN-015). *(definida em 2026-11-25)* |
| S-47 | **Retenção da necessidade especial:** a resposta e o registro do consentimento são apagados quando a denúncia fica Resolvida, Improcedente ou Cancelada (RN-026). *(definida em 2026-11-25)* |
| S-48 | Pessoas no local: faixas do protótipo (1 a 3, 4 a 8, 9 a 20, Rua toda), opcionais. Pessoas e necessidade especial entram no passo 3 do Denunciar. *(definida em 2026-11-25)* |
| S-49 | **Fotos:** `expo-image-picker` (câmera e galeria, permissões em linguagem simples); o app reduz a imagem (lado maior ≈ 1600 px, JPEG) e remove o EXIF antes de enviar; a API valida o tipo pelo conteúdo, remove o EXIF de novo, grava com nome aleatório fora de qualquer rota pública e serve só por rota autenticada ao autor e ao operador. Miniaturas com "Remover" (com texto). As fotos são apagadas na exclusão da conta. *(definida em 2026-11-25)* |
| S-50 | **Exclusão de conta** (RN-024, segue a S-11), numa transação: apaga nome, e-mail, telefone, hash da senha, tokens de push, fotos (arquivos e registros) e a resposta de necessidade especial; mantém as denúncias e o histórico, sem vínculo. **Denúncia em aberto continua aberta e anonimizada** (o operador só perde o contato). O painel mostra "Conta excluída". O app pede confirmação clara e volta ao login. *(definida em 2026-11-25)* |
| S-51 | Confirmação da exclusão no app: tela com o que é apagado e o que fica, caixa "Entendi que meus dados serão apagados e que isso não pode ser desfeito" e botão "Excluir minha conta", desativado até marcar (sem digitar uma palavra) ([18](18-plano-fase-2.md)). *(a confirmar)* |
| S-52 | **Indicadores dos últimos 30 dias só no painel da operadora** (RF-018, RN-017); o app não exibe indicadores. *(definida em 2026-11-25)* |
| S-53 | As telas novas do painel na Fase 2 seguem o **tema atual do painel**; alinhar as cores de situação com o app é o Could B-045. *(definida em 2026-11-25)* |
| S-54 | A Fase 2 é feita na branch **`feature/fase-2`** (a partir da `develop`), uma etapa por vez, com lint, typecheck e testes de todos os workspaces afetados e verificação no celular e no painel. *(definida em 2026-11-25)* |
| S-55 | "Cancelar denúncia" fica só no detalhe (T-07), não em cada item da lista (T-09) (RF-015). *(a confirmar)* |
| S-56 | O rascunho do Denunciar guarda pessoas no local, mas não guarda a necessidade especial, o consentimento nem as fotos. *(a confirmar)* |
| S-57 | API: `multer` (memória, limites de 5 MB e 3 arquivos) para o `multipart`; remoção de EXIF por função própria, sem dependência nativa (JPEG: segmentos APP1 a APP15 e COM; PNG: blocos `eXIf`, `tEXt`, `iTXt`, `zTXt` e `tIME`). *(a confirmar: dependência nova)* |
| S-58 | `POST /denuncias` aceita JSON (sem fotos) e `multipart` (com fotos); o app usa `multipart` só quando houver foto. *(a confirmar)* |
| S-59 | `DELETE /me` exige o corpo `{ "confirmacao": true }`. *(a confirmar)* |
| S-60 | O operador pode remover a previsão de reparo (`previsaoReparo: null`) enquanto a denúncia estiver aberta (RF-033). *(a confirmar)* |

### 8.1.1 Decisões de contraste, toque e prioridade de tokens (2026-11-18)

| ID | Decisão |
|---|---|
| D-01 | ~~Botões com texto branco usam `#006E2C`; texto âmbar usa `#855300`.~~ **Substituída pela S-44 (2026-11-23):** a paleta nova (`action` `#1D4ED8`, textos de situação) tem os contrastes verificados por teste ([06](06-design-system.md), [12](12-acessibilidade.md)). A regra "os tokens do código têm prioridade sobre o Figma" continua, e agora o app segue o documento 06, não o Figma. |
| D-02 | Alvos de toque com no mínimo **48 dp**, com `hitSlop` ou *padding* quando o elemento visual for menor ([12](12-acessibilidade.md)). |
| D-03 | Desenvolvimento com **Expo Go** (Must, tempo real por WebSocket). Push e *development build* ficam por último ([14](14-roadmap-e-backlog.md)). |
| D-04 | Telas e estados que faltam no Figma são implementados a partir do design system e de [05](05-telas-e-fluxos.md); nada é criado no Figma por enquanto. (Desde a S-44, o app do cidadão segue o design system v2.) |

### 8.2 Pendências (dependem da equipe e não bloqueiam o desenvolvimento)

| ID | Pendência | Situação |
|---|---|---|
| PEN-01 | **ACGM** (rodapé de T-01) | **Resolvida em parte.** A equipe é formada por Bruno Santos, Gustavo Borges e Marilia Francalino. O rodapé usa "© 2026 Equipe Tá Ligado?" até a sigla ACGM ser explicada |
| PEN-02 | Telefones oficiais e horário da Ouvidoria e da Central | **Aberta.** Placeholders em `apps/mobile/src/config/constants.ts` |
| PEN-03 | Termos de Uso e Política de Privacidade | **Rascunho feito** em [`docs/legal/`](legal/) (texto acadêmico). Falta o e-mail de contato: `[PREENCHER: e-mail da equipe]` |
| PEN-04 | Chave do Google Maps e credenciais de push (FCM/APNs) | **Aberta.** Variáveis previstas nos `.env.example` (sem valor). Expo Go e Leaflet/OSM não precisam de chave. Necessárias só para o *development build* |
| PEN-05 | Repositório remoto | A equipe cria no GitHub e faz o `git remote add origin` e o primeiro push (ver README) |
| PEN-06 | Telas e estados faltantes no Figma | **Aberta.** Implementadas pelo design system; o desenho no Figma fica para depois, se der tempo |
| PEN-07 | Lista real de bairros e folhas com coordenadas | **Seed aproximado** em `apps/api/prisma/seed-data/bairros.ts` ("dados aproximados para fins de demonstração"). A equipe revisa |
| PEN-08 | Titular do copyright no `LICENSE` | Preenchido com os integrantes; confirmar |
| PEN-09 | Ícone e *splash screen* finais | **Aberta.** O app usa os assets padrão do Expo |
| PEN-10 | Versões das dependências | **Resolvida na Fase 0.** Versões fixadas e registradas em [08](08-tecnologias.md) |
