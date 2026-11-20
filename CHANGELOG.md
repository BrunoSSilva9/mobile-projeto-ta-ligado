# Changelog

Todas as mudanças relevantes deste projeto serão documentadas neste arquivo.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto adota o [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Não lançado]

### Adicionado (Fase 1, branch `feature/fase-1`)
- **Passo 1 – domínio da API** (`apps/api/src/domain`): status do bairro, transições de status (inclui cancelamento, justificativa e resolução em lote), limite de uma denúncia em aberto, permissões e projeção pública anonimizada, previsão de reparo, protocolo, prioridade, bairro mais próximo (Haversine) e taxa de resolução. 190 testes unitários novos, com cobertura de 100% do domínio e limiar de 90% exigido no `vitest.config.ts`.

- **Passo 2 – autenticação da API:** `POST /api/v1/auth/register`, `POST /api/v1/auth/login` e `GET /api/v1/me`; JWT (HS256) com validade de 7 dias para o cidadão e 8 horas para o operador; senhas com bcrypt; middlewares `autenticar` (confirma o usuário no banco) e `exigirPapel` (RBAC); validação com Zod em português; limite de 100 requisições/min por IP e de 5 logins com falha/min por IP e e-mail. O cadastro público só cria cidadão, grava o consentimento e não coleta CPF nem data de nascimento.
- **Testes de integração com banco separado (`taligado_test`):** criado e migrado automaticamente pelo `globalSetup`, com trava que recusa qualquer banco cujo nome não termine em `_test`. 68 testes novos (cadastro, login, `/me`, limites de tentativas, RBAC e token).

- **Passo 3 – denúncias e bairros na API:** `POST /api/v1/denuncias`, `GET /api/v1/denuncias/minhas`, `GET /api/v1/denuncias/:id`, `GET /api/v1/bairros` e `GET /api/v1/bairros/proximo`.
  - O registro roda numa transação: confere o bairro e o limite de **uma denúncia em aberto** (RN-006), gera o protocolo `TL-AAAA-NNNNNN` com sequência atômica por ano (nova tabela `ProtocoloSequencia`, migration `protocolo_sequencia`), cria a denúncia `RECEBIDA` e o primeiro registro do histórico. A corrida entre duas requisições do mesmo autor é barrada pelo índice único parcial do banco (409 `DENUNCIA_EM_ABERTO`, com o id da denúncia em aberto em `erro.dados`), e a tentativa que falha não consome número de protocolo.
  - O detalhe só é do autor (outro usuário e id inexistente respondem igual, 404). O histórico mostra "Você" e "Equatorial Pará", sem o nome do operador.
  - Esqueleto do `Publicador` de eventos em tempo real, chamado depois do commit (o Passo 4 liga o Socket.IO); uma falha ao publicar não desfaz a denúncia.
  - 75 testes de integração novos. Um teste de mutação (remover o índice do banco) confirmou que o teste de corrida realmente falha sem a proteção.

- **Passo 4 – tempo real (Socket.IO):** autenticação por JWT no *handshake* (o usuário é confirmado no banco; sem token válido a conexão é recusada com `NAO_AUTENTICADO`), salas decididas pelo servidor (`papel:OPERADOR`; `cidadaos` e `usuario:{id}`) e os quatro eventos do `docs/10-api.md`: `denuncia:criada` (operadores, dados completos), `denuncia:status-atualizado` (autor e operadores), `ocorrencia:atualizada` (cidadãos, **anonimizada**) e `bairro:status-atualizado` (cidadãos, recalculado no banco). Os eventos saem depois do commit; o servidor não escuta nenhum evento do cliente.
  - `criarServidor` monta Express + Socket.IO + publicador num só lugar, usado pelo `server.ts` e pelos testes.
  - `obterStatusDoBairro` (status, contagem em aberto e menor previsão futura) já fica pronto para o `GET /bairros/status` do Passo 11.
  - 23 testes de tempo real com clientes `socket.io-client`, incluindo latência abaixo de 2 s (RNF-002). Dois testes de mutação (emitir a denúncia completa para todos; vazar o protocolo na versão pública) foram pegos pelos testes certos. Em teste manual contra o servidor real, o painel recebeu a denúncia 134 ms após o envio.

- **Passo 5 – API do painel da operadora** (só `OPERADOR`; cidadão recebe 403): `GET /api/v1/painel/denuncias` (filtros por status, tipo, bairro e prioritárias; ordem de prioridade da RN-015; paginação), `GET /api/v1/painel/denuncias/:id` (detalhe completo, com autor, telefone e histórico com quem alterou) e `PATCH /api/v1/painel/denuncias/:id/status`.
  - O `PATCH` usa `validarTransicao`, exige justificativa para improcedência, aceita a previsão de reparo (só enquanto a denúncia está em aberto) e grava status e histórico **na mesma transação**. A gravação é condicional ao status que o operador viu, então mudanças simultâneas resultam em um único vencedor e `422 TRANSICAO_INVALIDA` para os demais (S-29). O evento `denuncia:status-atualizado` sai depois do commit.
  - 68 testes de integração novos, incluindo atomicidade (um gatilho no banco simula falha ao gravar o histórico e o status não muda), concorrência (seis requisições simultâneas, só uma vence) e o ciclo completo cidadão ↔ operador. Testes de mutação confirmaram que a proteção de concorrência e a exigência do papel `OPERADOR` são realmente exercitadas.

- **Passo 6 – app: base e autenticação** (T-01 Cadastro, T-02 Login, T-08 Perfil mínimo):
  - **Infraestrutura:** cliente HTTP com tempo limite de 15 s e erros em português (`SEM_CONEXAO`, `TEMPO_ESGOTADO`, mensagens do servidor); sessão em Zustand com o token no `expo-secure-store` (valida o que lê do aparelho e descarta o que estiver corrompido); TanStack Query (só repete leituras em falha de rede ou 5xx; envios nunca repetem sozinhos); um 401 `NAO_AUTENTICADO` com sessão derruba a sessão e limpa o cache.
  - **Componentes:** `Button`, `TextField` (com mostrar/ocultar senha), `Checkbox`, `TopAuthBar`, `AuthLayout` e os estados `LoadingState`, `EmptyState` e `ErrorState`, todos com alvo de toque de 48 dp e rótulos para leitores de tela.
  - **Telas:** cadastro (sem CPF e sem nascimento; botão desabilitado até aceitar os Termos; erros do servidor vão para o campo certo) e login (sem "Esqueci a senha" e sem Google); conta de operador é recusada no app com instrução para usar o painel. Termos de Uso e Política de Privacidade abrem no app, em sincronia com `docs/legal/` (um teste confere os títulos e a versão).
  - **Navegação protegida** com `Stack.Protected`: sem sessão só existe o login; com sessão só existem as abas. Perfil mínimo com "Sair" (RF-004).
  - **189 testes** em 12 suítes (HTTP, sessão, schemas, API de autenticação, textos legais, componentes, telas de cadastro, login e perfil, e a navegação real com o `renderRouter`). O app empacota para Android e iOS.
  - **Defeito encontrado e corrigido pelos testes:** sem sessão o app mostrava "Unmatched Route" em vez do login (a rota `/` só existe dentro de `(app)`); o grupo protegido agora tem `redirectTo="/login"`. Um problema de acessibilidade também foi corrigido: o papel de alerta do `ErrorState` ficava num `View` não acessível.

- **Passo 7 – app: registrar denúncia** (T-05 Registrar Denúncia, T-06 Denúncia enviada; T-07 ainda é um marcador de tela):
  - **T-05:** tipo (Sem energia / Oscilação), logradouro, bairro (seletor em tela cheia com busca sem diferenciar acentos), CEP opcional, ponto de referência e descrição de até 500 caracteres, com os erros do servidor levados ao campo certo. Fotos, pessoas afetadas e necessidade especial ficam para a Fase 2 (S-38).
  - **GPS (RF-008):** pede a permissão "ao usar o app", mostra o mini-mapa com o pino que o usuário pode arrastar (S-23), sugere o logradouro (geocodificação reversa) e o bairro mais próximo (RN-025) **sem sobrescrever o que o usuário já escolheu**. Com a permissão negada, o GPS desligado ou sem sinal, a tela avisa e o envio continua sem coordenadas (RN-012). O mapa fica numa barreira de erro: se o módulo nativo falhar, só as coordenadas aparecem em texto.
  - **Rascunho (RNF-008):** o que foi digitado fica salvo por usuário no `AsyncStorage` e só é apagado quando o servidor confirma; sem internet nada se perde e o usuário reenvia sem redigitar. As coordenadas não entram no rascunho.
  - **Envio:** o botão fica ocupado enquanto envia (um segundo toque não duplica); `409 DENUNCIA_EM_ABERTO` mostra o aviso e leva ao detalhe da denúncia em aberto; sucesso leva à T-06, que mostra o protocolo `TL-AAAA-NNNNNN` e permite copiá-lo.
  - **Dependências fixadas:** `expo-location ~58.0.22`, `react-native-maps 1.29.11`, `@react-native-async-storage/async-storage 2.2.0`, `expo-clipboard ~58.0.4`. O plugin do `expo-location` no `app.config.ts` traz o texto da permissão.
  - **84 testes novos** (273 no total, 18 suítes): schemas, API, rascunho, localização e as telas T-05 e T-06; o teste de navegação real agora abre a T-05 de verdade. Os módulos nativos (mapa, GPS, área de transferência) são simulados nos testes (`jest.setup.js`); o comportamento real no Expo Go precisa ser conferido em um celular.

- **Passo 8 – app: acompanhamento em tempo real** (T-07 Detalhe, T-09 Minhas denúncias, T-08 com "Minhas denúncias"):
  - **Tempo real:** `SocketProvider` abre o Socket.IO com o token da sessão (só WebSocket) enquanto há login e o fecha ao sair ou trocar de conta. O evento `denuncia:status-atualizado` é validado e aplicado ao cache do TanStack Query: o detalhe e a lista mudam sozinhos, sem recarregar (RF-024). Eventos fora de ordem e repetidos são ignorados, e uma mudança só de previsão não cria linha no histórico. Ao **reconectar**, as consultas de denúncias são refeitas (RNF-009); se o servidor recusar o token, a sessão é encerrada. Uma faixa "Reconectando…" avisa quando o tempo real caiu.
  - **T-09:** lista com protocolo, tipo, bairro, data e selo de status; estado vazio com botão "Fazer denúncia", carregando e erro com "Tentar novamente"; puxar para atualizar.
  - **T-07:** selo de status, local, descrição, previsão de reparo (só enquanto está em aberto), justificativa quando improcedente e **histórico em linha do tempo** ("Você" / "Equatorial Pará"). Denúncia de outro usuário aparece como "não encontrada". Sem botão de cancelar (Fase 2, B-036).
  - **Perfil:** item "Minhas denúncias" com o número de denúncias em aberto.
  - **Componentes:** `StatusBadge` (ponto colorido + nome, a cor nunca é a única pista), `StatusTimeline`, `ComplaintListItem`, `CabecalhoDeTela`, `AvisoDeConexao`. Datas sempre no horário de Marabá (UTC−3), formatadas à mão.
  - **Dependência fixada:** `socket.io-client 4.8.4` (mesma versão do servidor).
  - **57 testes novos** (330 no total, 21 suítes): reducers do cache, validação de eventos, status e datas, `SocketProvider` (conexão, evento, reconexão, token recusado, troca de conta) e as telas T-07, T-09 e Perfil, incluindo "mudança do painel aparece na tela aberta sem recarregar". O WebSocket real e o teste com os dois lados continuam sendo manuais.

- **Passo 9 – painel: base** (P-01 Login do operador, P-02 parte 1: lista, filtros e mapa; P-03 ainda é um marcador de tela):
  - **Login e rotas protegidas:** só o login é público. O token fica em `sessionStorage` (some ao fechar a aba, nunca em `localStorage`, ADR-0004); token expirado ou sessão recusada pelo servidor (401) volta ao login e limpa o cache; conta de cidadão é recusada com instrução para usar o app. Não há cadastro nem "esqueci a senha".
  - **Lista (RF-028):** tabela com prioridade, protocolo, tipo, bairro/rua, status e "há X min" (atualizado a cada 30 s), mantendo a ordem da API (prioritárias no topo, RN-015); legenda e cabeçalhos de coluna para leitores de tela; carregando, vazio e erro com "Tentar novamente"; paginação de 100 em 100.
  - **Filtros (RF-029, RF-035):** status (padrão "Em aberto"), tipo, bairro e "Só prioritárias", com "Limpar"; mudar o filtro volta à primeira página.
  - **Mapa (RF-028):** Leaflet + OpenStreetMap (sem chave) com um pino por denúncia que tem coordenadas, colorido por tipo (vermelho = sem energia, âmbar = oscilação, cinza = encerrada), popup com link para o detalhe e aviso de quantas ficam só na lista. Usa a mesma lista filtrada.
  - **Dependências fixadas:** `leaflet 1.9.4`, `react-leaflet 5.0.0`, `@types/leaflet 1.9.22`, `@tanstack/react-query 5.108.1`, `zustand 5.1.0`.
  - **60 testes novos** (Vitest + Testing Library): consulta e filtros, datas, sessão, login (sucesso, erro, papel errado, validação, sem conexão), lista, filtros, paginação, mapa e rotas protegidas. O contrato foi conferido também contra a API real (login do operador e `GET /painel/denuncias` com o filtro de status). O Leaflet é simulado nos testes (o jsdom não tem layout); o mapa de verdade precisa ser visto no navegador.

- **Passo 10 – painel: tempo real e detalhe** (P-02 parte 2, P-03 Detalhe e atualização de status):
  - **Tempo real (RF-027):** `TempoRealProvider` abre o Socket.IO com o token do operador (só WebSocket) e o fecha ao sair. A denúncia nova (`denuncia:criada`) **entra na lista sem recarregar**, na posição da RN-015 (prioritárias primeiro e, em cada grupo, a mais antiga primeiro, então a nova entra no fim do seu grupo), só nas listas cujos filtros combinam e sem duplicar se o evento se repetir. A mudança de status atualiza as listas (a denúncia sai da lista "Em aberto" quando é resolvida) e o detalhe aberto busca de novo. Ao **reconectar**, as consultas são refeitas; token recusado derruba a sessão.
  - **Alerta visual e sonoro:** faixa "Nova denúncia: {tipo} em {bairro}" com "Abrir" e "Dispensar" numa região `aria-live` (some em 15 s), linha destacada por 10 s com o selo "Nova" (sem animação se o usuário pediu menos movimento). O **som** é gerado pelo navegador (`AudioContext`, dois tons, sem arquivo de áudio) e só é criado depois do clique em "Ativar som" (S-19); sem suporte a áudio, o botão não liga e o alerta visual continua.
  - **Indicador de conexão** na barra: Conectando… / Conectado / Reconectando….
  - **P-03 (RF-030 a RF-033, RF-036):** blocos Autor, Local, Ocorrência, Atualizar status e Histórico (com o nome de quem alterou e a justificativa). Os botões seguem o status (RN-004): recebida → "Iniciar atendimento" e "Improcedente"; em atendimento → "Resolver" e "Improcedente"; encerrada → nenhuma ação. "Improcedente" abre a justificativa obrigatória (10 a 500 caracteres, RN-010); "Iniciar atendimento" aceita a previsão de reparo opcional (precisa ser futura, RN-009). Conflito (422 `TRANSICAO_INVALIDA`, S-29): avisa que o status mudou e mostra a situação atual. Botões desabilitados enquanto salva (sem duplicar).
  - **Dependência fixada:** `socket.io-client 4.8.4`.
  - **78 testes novos** (138 no painel): regras de ações, filtros e inserção na ordem da RN-015, validação dos eventos, som, conexão (conectar, reconectar, recusar, sair), alerta e destaque (incluindo os temporizadores), som antes e depois do clique, mudança de status em tempo real, e o detalhe com todas as ações, justificativa, previsão, conflito e erro de rede. O WebSocket é simulado; o **teste manual com os três lados** (app, painel e API) continua sendo a validação final.

### Alterado
- Prettier com `endOfLine: "auto"`: com `core.autocrlf=true` (Windows) os arquivos ficam em CRLF localmente e o `format:check` falhava sem que houvesse erro real.

### Adicionado (planejamento da Fase 1)
- `docs/16-plano-fase-1.md`: plano detalhado em 13 passos (fatia vertical primeiro) numa única branch e num único PR, sem prazos fixos, com tarefas, arquivos, testes, critérios de aceite, marcos, roteiro de demonstração, riscos e opções de banco hospedado gratuito. Decisões S-33 a S-43.
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
