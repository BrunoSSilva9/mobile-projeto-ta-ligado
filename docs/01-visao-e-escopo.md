# 01 – Visão e escopo

> **Tá Ligado?** é um aplicativo mobile para registrar denúncias de queda de energia elétrica em Marabá-PA e acompanhar a situação em tempo real. Projeto final da disciplina de **Desenvolvimento Mobile (UNIFESSPA)**.

- Protótipo (Figma): <https://www.figma.com/design/XiDKX3D8j02JggOwKPDdGp/Mobile---T%C3%A1-ligado-?node-id=0-1>
- Convenção de rastreabilidade: requisitos `RF-xxx`, `RNF-xxx`, regras `RN-xxx`, histórias `US-xxx`, casos de uso `UC-xxx`, telas `T-xx` (app) e `P-xx` (painel), suposições `S-xx`, pendências `PEN-xx`.
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

## 8. Suposições e pendências

### 8.1 Suposições (marcadas como **[SUPOSIÇÃO]** nos documentos)

| ID | Suposição |
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

### 8.2 Pendências (precisam de resposta ou insumo)

| ID | Pendência |
|---|---|
| PEN-01 | **ACGM** (rodapé de T-01): `[PREENCHER: nome da equipe ou significado da sigla]`. |
| PEN-02 | Telefones oficiais da Ouvidoria e da Central, e horário de funcionamento. Hoje são placeholders (`(00) 0000-0000`, `0000 000 0000`), centralizados em `apps/mobile/src/config/constants.ts`. |
| PEN-03 | Textos jurídicos finais de **Termos de Uso** e **Política de Privacidade**, e contato do encarregado/controlador. |
| PEN-04 | Chave de API do Google Maps (builds Android) e credenciais de push (FCM/APNs). |
| PEN-05 | Nome do repositório e visibilidade (público/privado). |
| PEN-06 | Telas do Figma que **não existem**: Login, Perfil, Minhas denúncias, Detalhe, Sucesso e todo o Painel (ver [05](05-telas-e-fluxos.md#telas-a-criar-no-protótipo)), além dos estados vazio/carregando/erro. |
| PEN-07 | Lista real de bairros e folhas de Marabá com coordenadas do centro (o seed inicial usa exemplos do protótipo). |
| PEN-08 | Nome/holder do copyright do `LICENSE` (hoje "Equipe Tá Ligado?"). |
| PEN-09 | Ícone e *splash screen* finais do app (o Figma traz o logo e o ícone 64/96 px). |
| PEN-10 | Confirmar o Expo SDK e as versões das dependências na criação do projeto. |
