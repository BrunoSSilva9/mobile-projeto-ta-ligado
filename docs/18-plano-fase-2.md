# 18 – Plano de implementação da Fase 2 (MVP+)

> **Estado:** plano **aprovado em 2026-11-25**, com a ordem da seção 4 e os ajustes das decisões S-49, S-51 e S-55 a S-60 (seção 5). Execução na branch `feature/fase-2`, a partir da F2-0.
> **Escopo:** **API, painel e app**, por camada. Os contratos de [10 – API](10-api.md) mudam **só onde este plano diz** (seção 5), e cada mudança é registrada no `docs/10` na etapa que a implementa.
> **Push (B-030):** **fora desta rodada.** Fica como a **última etapa, separada e condicional** (F2-9): só começa com *development build* e credenciais FCM/APNs (PEN-04). **Nenhuma etapa depende dele**; o acompanhamento em tempo real continua por WebSocket.
> **Como será feito:** uma branch, **`feature/fase-2`**, criada a partir da `develop` (que já tem o redesign, PR #5, commit `4610ec7`). **Uma etapa por vez.** Ao fim de cada uma: `lint`, `typecheck` e `test` de **todos os workspaces afetados**, a mensagem de commit com a lista de arquivos e um checklist de verificação no **celular (Expo Go)** e no **painel no navegador**, quando a etapa mexer nele. A etapa seguinte só começa depois do "ok" de Bruno.

## 1. Objetivo e critério de pronto

**Entrega:** a experiência completa do MVP+ (Should) nas três camadas: cancelar denúncia, perfil e exclusão de conta, pessoas no local e necessidade especial (com consentimento específico e retenção curta), fotos, previsão de reparo editável, resolução em lote por bairro e indicadores para a operadora.

**A Fase 2 está pronta quando (sem o push):**

- [ ] O autor cancela uma denúncia `RECEBIDA` no app; o painel vê "Cancelada" em tempo real e o limite de uma denúncia em aberto é liberado.
- [ ] O passo 3 do Denunciar tem pessoas no local, necessidade especial (Sim/Não) com consentimento específico, e até 3 fotos.
- [ ] A necessidade especial some do banco quando a denúncia termina (Resolvida, Improcedente ou Cancelada).
- [ ] As fotos chegam reduzidas e **sem EXIF** (no app e de novo no servidor) e só o autor e o operador conseguem abri-las.
- [ ] O cidadão edita nome e telefone e exclui a conta; o painel mostra "Conta excluída" nas denúncias dela.
- [ ] O operador altera a previsão de reparo enquanto a denúncia está aberta, resolve todas as denúncias de um bairro de uma vez e vê os indicadores dos últimos 30 dias.
- [ ] `npm run lint`, `typecheck`, `test` e `format:check` passam na raiz; o app empacota para Android e iOS; a cobertura de `apps/api/src/domain` continua ≥ 90%.
- [ ] O roteiro de demonstração do README cobre os itens novos.

## 2. Escopo

**Entra:** B-036 (cancelar), B-032 (pessoas e necessidade especial), B-033 (prioridade no painel, o que falta), B-031 (fotos), B-037 (perfil e exclusão de conta), B-034 (previsão de reparo), B-035 (lote), B-038 (indicadores), B-039 (acessibilidade, só o que o redesign não cobriu).

**Condicional, no fim:** B-030 (push), etapa F2-9.

**Could, depois de tudo:** B-045 (alinhar as cores de situação do painel com as do app), seção 10.

**Não entra:**

| Item | Por quê |
|---|---|
| Indicadores no app | Decisão S-52: só no painel. O app não volta a ter o painel de números da Início; os chips do Mapa já mostram as contagens atuais |
| Texto livre de necessidade especial | Decisão S-46: só Sim/Não (minimização de dado de saúde) |
| Novo visual do painel | As telas novas seguem o **tema atual do painel** (S-53); o alinhamento é o Could B-045 |
| Armazenamento de fotos em nuvem | Fotos ficam no disco do servidor (`UPLOADS_DIR`); nuvem é o item futuro B-109 |
| "Esqueci a senha", login com Google, refresh token | Fora do MVP (B-100, B-101, B-111) |

## 3. Diagnóstico do estado atual (develop, 2026-11-25)

### 3.1 Banco (`apps/api/prisma/schema.prisma`)

| O que já existe | Situação para a Fase 2 |
|---|---|
| `Denuncia.faixaPessoas` (enum `ATE_3`, `DE_4_A_8`, `DE_9_A_20`, `RUA_TODA`) | Pronto; só falta o app enviar |
| `Denuncia.necessidadeEspecial Boolean @default(false)` | **Muda:** passa a `Boolean?` (nulo = não informado ou já apagado pela retenção, RN-026) |
| `Denuncia.detalheNecessidade String?` | **Sai** (S-46: sem texto livre). Migration apaga a coluna |
| — | **Novo:** `Denuncia.consentimentoNecessidadeEm DateTime?` (prova do consentimento específico, apagada junto com a resposta) |
| `DenunciaFoto` (`arquivo`, `mimeType`, `tamanhoBytes`, `onDelete: Cascade`) | Pronto |
| `PushToken` (`onDelete: Cascade`) | Pronto; usado só na F2-9 |
| `Denuncia.autorId` com `onDelete: SetNull`; `HistoricoStatus.alteradoPorId` com `SetNull` | Pronto: apagar o `Usuario` já anonimiza denúncias e histórico |
| `Denuncia.previsaoReparo`, `finalizadaEm` | Prontos |
| `HistoricoStatus` (só mudanças de status) | **Muda na F2-5:** ganha `evento` (`STATUS` ou `PREVISAO`, padrão `STATUS`) e `previsaoReparo`, para registrar a definição, a troca e a remoção da previsão (S-60) |
| `.env.example` com `UPLOADS_DIR=uploads` | Pronto; a pasta entra no `.gitignore` na F2-3 |

### 3.2 API

| Rota de `docs/10` | Situação |
|---|---|
| `GET /me` | **Existe** |
| `PATCH /me`, `DELETE /me` | **Faltam** (F2-4) |
| `POST /denuncias` (JSON) | Existe; já aceita `faixaPessoas`, `necessidadeEspecial` e `detalheNecessidade` (este sai na F2-2). `multipart` com fotos falta (F2-3) |
| `POST /denuncias/{id}/cancelar` | **Falta** (F2-1) |
| `GET /denuncias/{id}/fotos/{fotoId}` | **Falta** (F2-3) |
| `GET /painel/denuncias` com `prioritarias` e ordem de RN-015 | **Existe** (Fase 1). Atenção: com a coluna anulável, a ordem precisa de `nulls: 'last'` (seção 11) |
| `PATCH /painel/denuncias/{id}/status` com `previsaoReparo` (S-39) | **Existe** |
| `PATCH /painel/denuncias/{id}/previsao` | **Falta** (F2-5) |
| `GET /painel/bairros`, `POST /painel/bairros/{id}/resolver` | **Faltam** (F2-6) |
| `GET /indicadores` (cidadão) | **Não existe e não será feita**: vira `GET /painel/indicadores` (S-52, F2-7) |
| `PUT/DELETE /me/push-token` | Faltam; só na F2-9 |

**Autenticação:** o middleware confere o usuário no banco a cada requisição e o Socket.IO no *handshake*, então o token de uma conta excluída passa a receber `401` sem nada novo.

### 3.3 Domínio (`apps/api/src/domain`, funções puras com testes)

Já prontos e testados na Fase 1: `validarTransicao` (inclui `CANCELADA` só pelo autor em `RECEBIDA`, RN-005, e a exceção do lote, RN-016), `acoesDisponiveis`, `validarPrevisao` e `menorPrevisaoFutura` (RN-009), `ordenarPorPrioridade` (RN-015), `taxaResolucao` (RN-017), `podeVerDenuncia` (RN-014). Faltam as regras novas da seção 6 (necessidade especial, retenção, fotos, resumo por bairro, janela dos indicadores).

### 3.4 Painel (`apps/painel`)

Já existe: selo "Prioritária", filtro "Só prioritárias", prioritárias no topo e com pino maior no mapa; previsão de reparo ao "Iniciar atendimento"; bloco "Ocorrência" no detalhe mostrando necessidade especial e detalhe. Faltam: "Conta excluída" no lugar do autor, a galeria de fotos, a faixa de pessoas, editar a previsão depois, a aba **Por bairro** com o lote e os **indicadores**.

### 3.5 App (`apps/mobile`, design system v2)

Já existe: o Denunciar em 3 passos (`components/denuncia/PassoDetalhes.tsx` é onde entram os campos novos), o Perfil mínimo (dados, Minhas denúncias, Sair), o Detalhe (T-07) e a lista (T-09) com tempo real. Faltam: "Cancelar denúncia", pessoas e necessidade especial, fotos (escolher, reduzir, miniaturas e envio `multipart`), mostrar as fotos no detalhe, editar perfil e excluir conta. Dependências novas: `expo-image-picker` e `expo-image-manipulator` (funcionam no Expo Go).

### 3.6 Documentação que diverge das decisões novas (corrigida junto com este plano)

| Onde | Antes | Agora |
|---|---|---|
| RN-015, RF-010, US-004, `docs/11` | Detalhe da necessidade especial obrigatório | Só Sim/Não, com consentimento específico (S-46) |
| RN-024, `docs/10` (`DELETE /me`) | Denúncias em aberto são canceladas na exclusão | Continuam abertas e anonimizadas (S-50) |
| RF-018, RN-017, US-012, `docs/10` | Indicadores na Início do app (cidadão) | Só no painel da operadora (S-52) |
| `docs/14` | Cronograma de uma semana | Ordem da Fase 2 deste plano |

`docs/10`, `docs/09` e `docs/05` são atualizados **na etapa que implementa** cada mudança (mesmo protocolo do redesign).

## 4. Ordem das etapas e por que mudou

Bruno propôs: cancelar → perfil e exclusão → pessoas e necessidade → fotos → prioridade → previsão → lote → indicadores → acessibilidade → push. **Proponho dois ajustes:**

1. **Exclusão de conta depois de necessidade especial e fotos.** A exclusão precisa apagar a resposta de necessidade especial e os **arquivos** das fotos. Se vier antes, a etapa teria de ser reaberta duas vezes (na F2-2 e na F2-3). Fazendo depois, ela é escrita uma vez, já com tudo o que existe, e o teste de integração confere tudo de uma vez.
2. **Prioridade no painel (B-033) entra na etapa de necessidade especial.** O que a B-033 pedia (destaque, ordenação, filtro) **já foi entregue na Fase 1**. O que falta depende diretamente da mudança de necessidade especial: ordenar com a coluna agora anulável, mostrar a faixa de pessoas e tirar o "detalhe" do painel. Fica mais seguro fazer na mesma etapa e com o mesmo teste.

| Etapa | Itens | Camadas | Depende de |
|---|---|---|---|
| **F2-0** Preparação | Plano, branch, documentação base | docs | — |
| **F2-1** Cancelar denúncia | B-036 | API, app, painel (verificação) | — |
| **F2-2** Pessoas, necessidade especial e prioridade | B-032, B-033 | API (migration), app, painel | — |
| **F2-3** Fotos | B-031 | API, app, painel | — |
| **F2-4** Perfil e exclusão de conta | B-037 | API, app, painel | F2-2, F2-3 |
| **F2-5** Previsão de reparo | B-034 | API, painel | — |
| **F2-6** Resolução em lote | B-035 | API, painel | F2-2 (retenção) |
| **F2-7** Indicadores | B-038 | API, painel | — |
| **F2-8** Acessibilidade e fechamento | B-039 | app, painel, docs | todas |
| **F2-9** Push (condicional) | B-030 | API, app | PEN-04 + *development build* |
| Could | B-045 | painel | — |

## 5. Decisões

**Definidas por Bruno em 2026-11-25** (registradas em [01](01-visao-e-escopo.md), seção 8):

| ID | Decisão |
|---|---|
| S-45 | Fase 2 por camada (API, painel e app). Push fora desta rodada: última etapa, condicional (development build + PEN-04); nenhuma etapa depende dele. Lote com a menor prioridade entre os itens do painel |
| S-46 | Necessidade especial **só Sim/Não**, sem texto livre. Pergunta: "Alguém no local depende de aparelho elétrico, como respirador ou geladeira de remédios, ou tem necessidade especial?". Com "Sim", aparece um **consentimento específico e destacado**, separado dos Termos (LGPD, art. 11): a informação vai para a Equatorial só para priorizar o atendimento. **Sem o aceite, o campo não é enviado** |
| S-47 | **Retenção curta:** a resposta de necessidade especial (e o registro do consentimento) é apagada quando a denúncia fica Resolvida, Improcedente ou Cancelada (RN-026) |
| S-48 | Pessoas no local: faixas do protótipo (1 a 3, 4 a 8, 9 a 20, Rua toda), opcionais. Pessoas e necessidade entram no **passo 3** do Denunciar |
| S-49 | Fotos: `expo-image-picker` (câmera e galeria, permissões em linguagem simples); o app **sempre converte para JPEG** e reduz a imagem (lado maior ≈ 1600 px) com o `expo-image-manipulator`, o que **remove o EXIF**, inclusive nas fotos da galeria. A API aceita **somente JPEG**, conferido pelo **conteúdo** (assinatura `FF D8 FF`), nunca pela extensão nem pelo `Content-Type`; remove o EXIF de novo; grava com nome aleatório fora de qualquer rota pública e só serve por rota autenticada ao autor e ao operador. Miniaturas com "Remover" (com texto) |
| S-50 | Exclusão de conta (RN-024, S-11): numa transação, **apaga** nome, e-mail, telefone, hash da senha, tokens de push, fotos (arquivos e registros) e a resposta de necessidade especial; **mantém** as denúncias e o histórico, sem vínculo. **Denúncia em aberto continua aberta e anonimizada** (o operador só perde o contato). O painel mostra "Conta excluída". O app pede confirmação clara e depois volta ao login |
| S-52 | Indicadores (RF-018, RN-017) **só no painel da operadora** |
| S-53 | As telas novas do painel seguem o **tema atual do painel**; o alinhamento de cores é o Could B-045 |
| S-54 | Fase 2 em **uma branch (`feature/fase-2`)**, com o mesmo protocolo do redesign (uma etapa por vez, verificação em todos os workspaces afetados, "ok" de Bruno entre etapas) |

**Propostas neste plano e aprovadas por Bruno em 2026-11-25, com ajustes:**

| ID | Proposta | Por quê |
|---|---|---|
| S-51 | **Confirmação da exclusão:** numa **tela própria** (nunca direto no Perfil), com o que será apagado e o que fica, o campo **"Sua senha atual"** (S-59), a caixa "Entendi que meus dados serão apagados e que isso não pode ser desfeito" e o botão **"Excluir minha conta"**, desativado até marcar a caixa e preencher a senha. Sem digitar "EXCLUIR". Acima, um `Aviso` no padrão de erro (ícone, texto e **borda**); o botão é o primário azul | Ação deliberada sem exigir que o público idoso digite uma palavra; o vermelho fica reservado à situação da energia |
| S-55 | "Cancelar denúncia" **só no detalhe (T-07)**, não em cada item da lista (T-09) | Um lugar só, com a confirmação e o contexto da denúncia; a lista já abre o detalhe com um toque. RF-015 cita só T-07 |
| S-56 | O **rascunho** (AsyncStorage) guarda pessoas no local, mas **nunca** a necessidade especial, o consentimento nem as fotos | Dado de saúde não fica no aparelho sem criptografia; as fotos ficam em cache temporário, que o sistema pode apagar |
| S-57 | API: **`multer`** (memória, limites de 5 MB e 3 arquivos), com a versão fixada por `npm view` e registrada no `docs/08`. A remoção de metadados é **uma função própria, só para JPEG**: remove os segmentos **APP1 (EXIF e XMP)** e mantém a imagem válida. Testes unitários com **uma foto de exemplo com GPS no EXIF**: depois da limpeza não sobra dado de localização e a imagem continua abrindo (decodificada nos testes pelo `jpeg-js`, só como `devDependency`) | `sharp` é nativa (binários por plataforma no CI e no Windows); a função própria é pequena, pura e testável |
| S-58 | `POST /denuncias` aceita **JSON (sem fotos) e `multipart` (com fotos)**; o app usa `multipart` só quando houver foto. Os testes atuais do JSON continuam e os do `multipart` são somados | Mantém o app e os testes atuais funcionando; o `multipart` é aditivo |
| S-59 | `DELETE /me` exige o corpo **`{ "senha": "<senha atual>" }`**. A API confere a senha antes de apagar; errada, responde **`403 SENHA_INCORRETA`** com a mensagem "Senha incorreta.", sem mais nada. A rota tem o **mesmo limite de tentativas do login** (5 falhas por minuto, por IP e por conta, S-18) | Protege contra exclusão com um token roubado ou esquecido aberto. É `403` e não `401` porque, numa rota com sessão, o app trata `401` como sessão expirada e desconectaria a pessoa |
| S-60 | O operador pode **definir, trocar e remover** a previsão de reparo (`previsaoReparo: null`) enquanto a denúncia estiver aberta, e **cada mudança da previsão vai para o histórico**, como as mudanças de status (RN-011) | RF-033 diz "editável a qualquer momento"; o histórico mantém a auditoria completa |

## 6. Regras de negócio novas e alteradas

| Regra | Mudança |
|---|---|
| **RN-015** | Necessidade especial é só Sim/Não, exige o consentimento específico; **sem detalhe** (S-46) |
| **RN-024** | A exclusão **não cancela** as denúncias em aberto; apaga também a resposta de necessidade especial (S-50) |
| **RN-017** | Os indicadores são exibidos só no painel (S-52) |
| **RN-026** (nova) | Retenção da necessidade especial: apagada (nula) ao entrar em status final, em qualquer caminho (operador, lote ou cancelamento pelo autor) (S-47) |

**Funções puras novas em `apps/api/src/domain`** (com testes unitários, escritos **antes** do código das rotas):

| Arquivo | Função | Regra |
|---|---|---|
| `necessidade.ts` | `validarNecessidade({ necessidadeEspecial, consentimento })` → só aceita `true` com consentimento; `false` e ausente passam; `ehPrioritaria(valor)` (só `true`) | RN-015 |
| `necessidade.ts` | `camposSensiveisAoMudarStatus(para)` → `{ necessidadeEspecial: null, consentimentoNecessidadeEm: null }` quando `para` é final, senão `{}` | RN-026 |
| `fotos.ts` | `ehJpeg(bytes)` (assinatura `FF D8 FF`); `validarFotos(lista)` → até 3 fotos de até 5 MB, só JPEG | RN-013 |
| `lote.ts` | `resumirPorBairro(denuncias)` → contagem por tipo e status, em aberto e prioritárias por bairro | RN-016 |
| `indicadores.ts` | `inicioDaJanela(agora, dias = 30)` (soma ao `taxaResolucao` que já existe) | RN-017 |

A remoção de metadados (S-57, só JPEG, segmentos APP1) fica em `apps/api/src/modules/fotos/metadados.ts` (é infraestrutura de arquivo, não regra de negócio), com testes unitários sobre a foto de exemplo com GPS.

**RN-011 (histórico)** passa a registrar também as mudanças da previsão de reparo (S-60), na F2-5.

## 7. Etapas

### F2-0 · Preparação (P, 1 h)

- Branch `feature/fase-2` a partir da `develop` atualizada.
- Este plano, as S-45 a S-60, os RF e RN afetados (seção 3.6), `docs/11`, o rascunho de `docs/legal/` e o `docs/14` com a nova ordem (commit `65fe733`).
- Ajustes da aprovação (2026-11-25): S-49 (só JPEG), S-51 (tela própria com senha), S-57 (APP1, foto de exemplo com GPS), S-59 (senha no `DELETE /me`, `403 SENHA_INCORRETA`, limite de tentativas) e S-60 (previsão no histórico), refletidos neste plano, no `docs/01`, no `docs/10` (`DELETE /me`), no `docs/11`, na RN-011 e na US-010.

**Pronto quando:** o plano e as decisões estão aprovados e registrados (feito).

### F2-1 · Cancelar denúncia (P, 4 h) · B-036, RF-015, RN-005

| Camada | Tarefas | Arquivos |
|---|---|---|
| API | `POST /denuncias/{id}/cancelar` (só autor): `validarTransicao` com `ator.ehAutor`, gravação condicional ao status lido (como o `PATCH` do painel; conflito → `422 TRANSICAO_INVALIDA`), histórico com `papelAutor: CIDADAO`, `finalizadaEm`. Emite `denuncia:status-atualizado` (autor e operadores), `ocorrencia:atualizada` e `bairro:status-atualizado`. **Sem push** (RN-019) | `modules/denuncias/{routes,service}.ts` |
| App | No detalhe (T-07), botão secundário "Cancelar denúncia" só em `RECEBIDA`. Confirmação acessível ("Cancelar esta denúncia? A operadora deixa de receber o seu aviso.", "Sim, cancelar" / "Não, voltar"). Sucesso: o cache da denúncia e de "Minhas denúncias" é atualizado e aparece "Denúncia cancelada". Erro 422 (a operadora já começou): mensagem clara e recarrega | `app/(app)/denuncia/[id].tsx`, `features/acompanhamento/{api,hooks}.ts` |
| Painel | Só verificação: o evento já atualiza a linha para "Cancelada"; teste novo | `tests/tempo-real.test.tsx` |
| Docs | `docs/05` (T-07), RF-015 (S-55), `docs/10` (rota pronta) | |

**Testes:** integração (autor cancela `RECEBIDA` → 200 e histórico; `EM_ATENDIMENTO` → 422; outro cidadão → 403/404; operador na rota do cidadão → 403; após cancelar, criar outra denúncia → 201; eventos emitidos nas salas certas); app (botão só em Recebida, confirmação, "Não" não chama a API, sucesso, 422).

**Pronto quando:** cancelar no app reflete no painel em até 2 s e libera nova denúncia.

### F2-2 · Pessoas no local, necessidade especial e prioridade (M, 8 h) · B-032, B-033, RF-010, RF-035, RN-015, RN-026

| Camada | Tarefas | Arquivos |
|---|---|---|
| API (banco) | Migration: `necessidadeEspecial` passa a `Boolean?` (sem padrão); **apaga a coluna `detalheNecessidade` e os dados dela**; cria `consentimentoNecessidadeEm`; **anula** a resposta das denúncias já finalizadas (aplica RN-026 ao que existe). Isso fica dito com destaque na mensagem de commit e no `CHANGELOG`. O `seed-demo.ts` deixa de gravar `detalheNecessidade` e passa a gravar o consentimento; `db:seed` e `db:seed:demo` são rodados na verificação | `prisma/schema.prisma`, nova migration, `prisma/seed-demo.ts` |
| API | `POST /denuncias`: aceita `necessidadeEspecial` (opcional) e `consentimentoNecessidade` (obrigatório e `true` quando a resposta é Sim; senão `400 VALIDACAO_ERRO` no campo). Grava `consentimentoNecessidadeEm`. **Toda** transição para status final aplica `camposSensiveisAoMudarStatus` na mesma gravação (painel e cancelamento; o lote usa o mesmo caminho na F2-6). Ordem do painel com `{ sort: 'desc', nulls: 'last' }`. `prioritaria = necessidadeEspecial === true` em listas, detalhe e eventos | `modules/denuncias/{schemas,service,snapshot}.ts`, `modules/painel/service.ts`, `domain/necessidade.ts` |
| App | No passo 3: "Quantas pessoas estão no local? (opcional)" com chips de rádio (1 a 3, 4 a 8, 9 a 20, Rua toda; tocar de novo desmarca) e a pergunta de necessidade especial com dois `CartaoDeEscolha` (Sim / Não). Com "Sim", um `Aviso` informativo e a caixa de consentimento: "Autorizo enviar essa informação à Equatorial, só para dar prioridade ao atendimento. Ela é apagada quando a denúncia termina." Sem marcar, o "Sim" **não é enviado** e o resumo diz "Necessidade especial: não enviada (sem autorização)". O resumo "O que será enviado" mostra pessoas e necessidade. O rascunho guarda só pessoas (S-56) | `components/denuncia/PassoDetalhes.tsx`, `features/denuncia/{schemas,passos,rascunho,api}.ts` |
| App (detalhe) | T-07 mostra pessoas no local e "Necessidade especial: informada" enquanto a denúncia estiver aberta | `app/(app)/denuncia/[id].tsx` |
| Painel | Bloco "Ocorrência": faixa de pessoas em texto, "Necessidade especial: Sim (autorizado em …)" e, depois da retenção, "Informação apagada ao encerrar a denúncia". Tira o "detalhe". O alerta de nova denúncia diz "Nova denúncia prioritária" quando for o caso | `pages/DetalhePage.tsx`, `components/AlertaNovaDenuncia.tsx`, `features/denuncias/tipos.ts` |
| Docs | `docs/10` (corpo do `POST`, detalhe), `docs/09` (colunas), `docs/05` (T-05 passo 3, T-07, P-03). O texto legal do app (`apps/mobile/src/legal/conteudo.ts`) é sincronizado com o rascunho de `docs/legal/` (a versão continua `2026-11`: o texto ainda é rascunho, PEN-03) | |

**Testes:** domínio (`validarNecessidade`, `camposSensiveisAoMudarStatus` para os 5 status, `ehPrioritaria` com nulo); integração (Sim sem consentimento → 400; Sim com consentimento → prioritária; resolver, improcedente e cancelar anulam a resposta e o consentimento; ordem com nulos; filtro "só prioritárias"; a ocorrência pública continua sem pessoas nem necessidade); app (chips, Sim/Não, consentimento, "não enviada", corpo enviado, rascunho sem necessidade); painel (texto da retenção, alerta prioritário).

**Pronto quando:** uma denúncia com "Sim" e consentimento aparece no topo do painel com "Prioritária" e, ao ser resolvida, o banco não guarda mais a resposta.

### F2-3 · Fotos (G, 14 h) · B-031, RF-009, RN-013, RNF-015

**Implementada.** Ajustes em relação ao plano: a `foto de exemplo com GPS` é gerada por `tests/fixtures/gerar-foto-com-gps.ts` (EXIF com GPS e XMP montados à mão sobre um JPEG do `jpeg-js`) e commitada como `foto-com-gps.jpg`; o app usa `manipulateAsync` (API estável do `expo-image-manipulator`); a galeria usa o seletor do sistema, que não pede permissão de acesso às fotos (só a câmera pede, ao tocar em "Tirar foto").

**Aprovado (2026-11-25):** `jpeg-js` **só como `devDependency` da API**, com a versão fixada por `npm view` e registrada no `docs/08`, na parte de ferramentas de teste.

| Camada | Tarefas | Arquivos |
|---|---|---|
| API | `POST /denuncias` em `multipart` (S-58) com `multer` em memória (limites: 3 arquivos, 5 MB cada → `413 ARQUIVO_INVALIDO` e `422 LIMITE_FOTOS`). **Só JPEG**, conferido pela assinatura do conteúdo (`FF D8 FF`), nunca pela extensão nem pelo `Content-Type`; outro formato → `415 ARQUIVO_INVALIDO`. Remove os segmentos APP1 (S-57). Grava em `UPLOADS_DIR/{denunciaId}/{uuid}.jpg` **depois** de validar tudo; se a transação falhar, apaga os arquivos. `GET /denuncias/{id}/fotos/{fotoId}` para autor e operador (`podeVerDenuncia`), com `Content-Type: image/jpeg`, `Cache-Control: private, no-store` e `X-Content-Type-Options: nosniff`. O detalhe (cidadão e painel) passa a listar `fotos: [{ id, url }]`. `UPLOADS_DIR` no `.gitignore`; a pasta nunca é servida por `express.static`. Dependências: `multer` (e `@types/multer`) e `jpeg-js` (só nos testes), versões fixadas com `npm view` | `modules/fotos/{metadados,armazenamento,routes}.ts`, `modules/denuncias/{routes,service}.ts`, `domain/fotos.ts`, `config/env.ts`, `package.json` |
| App | No passo 3, "Fotos (opcional)": "Tirar foto" e "Escolher da galeria" (com texto), permissão pedida **na hora**, com explicação simples se negada. **Toda** foto, da câmera ou da galeria (inclusive PNG ou HEIC), é convertida para **JPEG** e reduzida (lado maior 1600 px, qualidade 0,7) com o `expo-image-manipulator`, o que descarta o EXIF. Miniaturas com "Remover"; "N de 3 fotos"; com 3, os botões ficam desativados com o motivo. Envio `multipart` só com foto. T-07 mostra as fotos (a imagem é pedida com o cabeçalho `Authorization`) | `components/denuncia/{PassoDetalhes,SeletorDeFotos}.tsx`, `features/denuncia/{fotos,api}.ts`, `services/http.ts`, `app.config.ts` (textos de permissão) |
| Painel | Galeria no detalhe (P-03): busca cada foto com o token e mostra por `URL.createObjectURL` (liberada ao sair); texto alternativo "Foto 1 de 3 enviada pelo cidadão" | `pages/DetalhePage.tsx`, `features/denuncias/api.ts` |
| Docs | `docs/10` (multipart, erros, rota da foto), `docs/08` (bibliotecas e versões fixadas), `docs/05` (T-05, T-07, P-03), `docs/11` (fotos) | |

**Testes:** unitários (assinatura: JPEG aceito; PNG, GIF, texto e um PNG renomeado `.jpg` recusados; remoção dos segmentos APP1 com a **foto de exemplo com GPS no EXIF** em `tests/fixtures/`: depois da limpeza não há segmento APP1 nem as marcas `Exif` e `GPS`, e o `jpeg-js` decodifica a imagem com a mesma largura e altura; um JPEG sem EXIF sai igual); integração (1 a 3 fotos → 201 e arquivos no disco sem EXIF; 4 fotos → 422; 6 MB → 413; PNG ou GIF, mesmo com `Content-Type: image/jpeg` → 415; os testes atuais do `POST` em JSON continuam; falha no banco não deixa arquivo órfão; autor e operador baixam; outro cidadão → 403/404; sem token → 401); app (adicionar, remover, limite, permissão negada, conversão para JPEG chamada para a galeria e a câmera, corpo `FormData`, sem foto continua JSON); painel (galeria e alternativa de texto).

**Pronto quando:** uma foto tirada no celular aparece no painel, e o arquivo gravado não tem EXIF.

### F2-4 · Perfil e exclusão de conta (M, 8 h) · B-037, RF-005, RF-006, RN-024

**Implementada.** Ajustes em relação ao plano: o aviso "Sua conta foi excluída." passa pela store `aviso-de-entrada` (ao encerrar a sessão o roteador troca de tela sozinho e os parâmetros da rota se perderiam); o painel passou a escrever "Conta excluída" (antes "Conta removida"); o publicador ganhou o método opcional `desconectarUsuario`; os textos da exclusão ficam em `features/auth/exclusao.ts`.

| Camada | Tarefas | Arquivos |
|---|---|---|
| API | `PATCH /me` (nome e telefone, com as regras do cadastro; e-mail só leitura, S-22). `DELETE /me` com **`{ "senha": "…" }`** (S-59): confere a senha com o bcrypt; errada → `403 SENHA_INCORRETA` ("Senha incorreta."), com o **limite de tentativas do login** (5 falhas por minuto, por IP e por conta). Certa, numa transação: anula `necessidadeEspecial` e `consentimentoNecessidadeEm` das denúncias da conta, apaga os registros de `DenunciaFoto` e o `Usuario` (o `SetNull` desvincula denúncias e histórico; o `Cascade` apaga os tokens). **Depois** do commit, apaga os arquivos das fotos (erro de disco vira log sem dado pessoal). Desconecta os sockets do usuário. Denúncia em aberto **continua aberta** (S-50). Resposta `204` | `modules/auth/{routes,service,schemas}.ts` (ou `modules/conta/`), `shared/rate-limit.ts`, `realtime/socket.ts` |
| App | Perfil: "Editar meus dados" (tela com nome e telefone, e-mail só leitura, "Salvar") e "Excluir minha conta", que abre a **tela própria** de exclusão (S-51): o que é apagado e o que fica, `Aviso` de erro com ícone, texto e borda, o campo **"Sua senha atual"**, a caixa "Entendi…" e o botão primário "Excluir minha conta" (desativado até marcar e preencher). Senha errada: mensagem no campo, sem desconectar. Sucesso: limpa sessão, cache e rascunhos e volta ao login com "Sua conta foi excluída." | `app/(app)/(tabs)/perfil.tsx`, novas rotas `app/(app)/perfil/{editar,excluir}.tsx` (regenerar `typedRoutes`), `features/auth/{api,hooks,schemas}.ts`, `components/Aviso.tsx` (borda no tom de erro) |
| Painel | Autor nulo → bloco "Autor" mostra "Conta excluída" (sem nome nem telefone) | `pages/DetalhePage.tsx` |
| Docs | `docs/10` (`DELETE /me` sem cancelar), `docs/05` (T-08), `docs/11` (direito de eliminação) | |

**Testes:** integração da exclusão conferindo **o que é apagado** (usuário, tokens, fotos no banco e no disco, necessidade e consentimento) e **o que é mantido** (denúncias com `autorId` nulo, histórico com `alteradoPorId` nulo, denúncia aberta ainda `RECEBIDA` e visível no painel com autor nulo); token antigo → 401; socket antigo é desconectado; **senha errada → 403 e nada é apagado**; sem senha → 400; a 6ª tentativa errada em um minuto → 429; operador não usa `DELETE /me` → 403. `PATCH /me` (válido, telefone inválido, e-mail ignorado). App (editar, validação, botão desativado até marcar e preencher a senha, senha errada mostra a mensagem e não desconecta, sucesso volta ao login e limpa tudo, erro de rede). Painel ("Conta excluída").

**Pronto quando:** excluir a conta no celular deixa a denúncia aberta no painel como "Conta excluída" e o login antigo deixa de funcionar.

### F2-5 · Previsão de reparo editável (P, 4 h) · B-034, RF-033, RN-009

**Implementada.** Regra pura nova: `validarMudancaDePrevisao` (`domain/previsao.ts`). Ajustes em relação ao plano: pedir o mesmo valor que já está salvo é um `200` sem registro e sem evento (evita ruído no histórico); a previsão informada junto com "Iniciar atendimento" fica **no próprio registro `STATUS`** (campo `previsaoReparo`), e não num registro à parte; o app acrescenta a entrada `PREVISAO` ao histórico em cache quando o evento chega com o mesmo status e uma previsão diferente. O teste do app "só a previsão mudou: atualiza sem criar linha no histórico" foi trocado pelo comportamento novo (agora cria a entrada), como combinado.

**Condições aprovadas (2026-11-25):** a migration dá `evento = STATUS` a todos os registros de histórico que já existem, sem perder nada; os payloads dos eventos WebSocket e as respostas de `docs/10` continuam compatíveis (só **somam** campos); se algum precisar mudar, o `docs/10` e os testes do painel e do app mudam na mesma etapa; o **painel** também mostra as mudanças de previsão no histórico do detalhe, não só o app.

| Camada | Tarefas | Arquivos |
|---|---|---|
| API | Migration: `HistoricoStatus` ganha `evento` (`STATUS` \| `PREVISAO`, padrão `STATUS`) e `previsaoReparo`. `PATCH /painel/denuncias/{id}/previsao` com `{ "previsaoReparo": "ISO" \| null }` (S-60), só com a denúncia em aberto (senão `422 TRANSICAO_INVALIDA`), data futura (`PREVISAO_NO_PASSADO`). Cada definição, troca ou remoção grava uma entrada no histórico (`evento: PREVISAO`, status igual antes e depois) na mesma transação; a previsão informada junto com "Iniciar atendimento" também. O histórico na API passa a trazer `evento` e `previsaoReparo`. Emite `denuncia:status-atualizado` (mesma forma, status igual) e `bairro:status-atualizado` | `prisma/schema.prisma`, nova migration, `modules/painel/{routes,schemas,service}.ts`, `modules/denuncias/service.ts` |
| Painel | No detalhe de uma denúncia aberta: campo "Previsão de reparo" com "Salvar previsão" e "Remover previsão" | `pages/DetalhePage.tsx` |
| App | T-07 e o cartão da Início já mostram a previsão e atualizam pelo evento (teste de regressão). O histórico (`StatusTimeline`) mostra as entradas de previsão: "Previsão de reparo: 19/11/2026 às 17:00" ou "Previsão de reparo removida", com ícone de relógio e texto | `components/StatusTimeline.tsx`, `features/acompanhamento/api.ts` |

**Testes:** integração (definir, alterar, remover, data passada, denúncia finalizada, eventos, **uma entrada de histórico por mudança**, inclusive a remoção); painel (salvar, remover, erro, histórico com as entradas de previsão); app (evento com nova previsão atualiza T-07 e o cartão; o histórico mostra a previsão definida e a removida).

### F2-6 · Resolução em lote por bairro (M, 6 h) · B-035, RF-034, RN-016

| Camada | Tarefas | Arquivos |
|---|---|---|
| API | `GET /painel/bairros` (por bairro: em aberto por tipo e status, prioritárias), via `resumirPorBairro`. `POST /painel/bairros/{bairroId}/resolver` com `{ "confirmacao": true }`: numa transação, cada denúncia em aberto passa a `RESOLVIDA` (`validarTransicao` com `lote: true`), com histórico próprio e a retenção de RN-026; depois emite os eventos de cada uma e um `bairro:status-atualizado`. Resposta `{ "resolvidas": n }` | `modules/painel/*`, `domain/lote.ts` |
| Painel | Aba **Por bairro**: cartões com nome, contagens e "Resolver todas do bairro", que abre um diálogo de confirmação ("Resolver as 4 denúncias em aberto de Cidade Nova?") com foco gerenciado; resultado anunciado em `aria-live` | `pages/PainelPage.tsx`, `components/PorBairro.tsx`, `components/DialogoConfirmacao.tsx` |
| Docs | `docs/10`, `docs/05` (P-02) | |

**Testes:** domínio (`resumirPorBairro`); integração (resolve só as abertas do bairro, `RECEBIDA → RESOLVIDA` só no lote, histórico por denúncia, retenção aplicada, outro bairro intacto, sem confirmação → 400, cidadão → 403, eventos); painel (cartões, diálogo, cancelar não chama a API, resultado).

### F2-7 · Indicadores no painel (P, 4 h) · B-038, RF-018, RN-017

| Camada | Tarefas | Arquivos |
|---|---|---|
| API | `GET /painel/indicadores` (só operador): usuários cadastrados (cidadãos), denúncias registradas nos últimos 30 dias, em atendimento agora, resolvidas nos últimos 30 dias (pelo histórico `statusNovo = RESOLVIDA`) e `taxaResolucao` | `modules/painel/*`, `domain/indicadores.ts` |
| Painel | Faixa de 4 indicadores no topo de P-02, atualizada ao receber eventos (refaz a consulta) | `components/Indicadores.tsx`, `pages/PainelPage.tsx` |
| Docs | `docs/10` (rota nova, `GET /indicadores` removida), `docs/05` (P-02; T-03 sem indicadores) | |

**Testes:** domínio (`inicioDaJanela`); integração (contagens com datas fixas pelo relógio injetável, denúncia de 31 dias fora, cidadão → 403); painel (valores e formatação "85%").

### F2-8 · Acessibilidade e fechamento (M, 4 h) · B-039, RNF-024

Só o que o redesign não cobriu:

- **App:** TalkBack e fonte em 200% nas telas novas (passo 3 com pessoas, necessidade e fotos; confirmação de cancelar; editar perfil; excluir conta). Miniatura de foto com rótulo "Foto 1 de 3" e "Remover foto 1" (botão com texto). A caixa de consentimento é `checkbox` com texto completo.
- **Painel:** navegação só por teclado nas telas novas (aba Por bairro, diálogo do lote, edição da previsão, galeria), foco visível, `aria-live` nos resultados e texto alternativo nas fotos.
- **Fechamento:** README (roteiro de demonstração com cancelar, fotos, necessidade especial, lote e indicadores), `CHANGELOG`, `CLAUDE.md` (status), `docs/12` e `docs/14` (itens concluídos).

### F2-9 · Push (condicional) (G, 10 h) · B-030, RF-025, RN-019

**Só começa quando:** houver *development build* (EAS) e credenciais FCM/APNs (PEN-04). Sem isso, a Fase 2 termina na F2-8.

| Camada | Tarefas |
|---|---|
| API | `PUT/DELETE /me/push-token`; envio com `expo-server-sdk` quando o **operador** muda o status (inclusive no lote), nunca no cancelamento pelo autor; token inválido (`DeviceNotRegistered`) é apagado; falha de envio não derruba a mudança de status |
| App | `expo-notifications`: pede permissão depois da primeira denúncia (não na abertura), registra o token, remove no "Sair"; tocar na notificação abre T-07 |
| Docs | `docs/08` (bibliotecas), `docs/10`, README (como gerar o *development build*) |

## 8. Testes

| Camada | O que muda |
|---|---|
| **Domínio** (`apps/api/tests/domain`) | Testes novos **antes** das rotas: `necessidade`, `fotos`, `lote`, `indicadores` (janela). Meta: cobertura ≥ 90% |
| **Integração** (`apps/api/tests/integration`, banco `*_test`) | Cancelar; necessidade com e sem consentimento e a retenção nos 3 caminhos; fotos (limite, tamanho, tipo pelo conteúdo, EXIF removido, acesso negado a terceiros, arquivo órfão); `PATCH /me` e `DELETE /me` (apagado × mantido); previsão; lote; indicadores |
| **App** (Jest + RNTL v14) | Convenção atual (`await` em tudo, `configurarCacheParaTestes`, `src/testing/`); `expo-image-picker` e `expo-image-manipulator` simulados em cada teste; o teste de regras do tema vale para todo código novo |
| **Painel** (Vitest + Testing Library) | `findBy*`/`waitFor` depois de eventos; `fetch` falso por endereço; `URL.createObjectURL` simulado no `tests/setup.ts` |
| **Que não devem mudar** | Os testes da Fase 1 e do redesign. Se um deles mudar, é para trocar `detalheNecessidade` (que sai) ou o tipo `boolean` → `boolean \| null`, e isso é dito no relatório da etapa |

## 9. Segurança e LGPD

| Risco | Mitigação |
|---|---|
| **Dado de saúde** (necessidade especial) | Só Sim/Não (S-46); consentimento específico e destacado, separado dos Termos (art. 11, I), com data gravada; apagado no fim da denúncia (RN-026); nunca no rascunho do aparelho (S-56); nunca na visão pública nem em logs |
| **Localização exata nas fotos** (EXIF/GPS) | Removida no app (conversão para JPEG com o `expo-image-manipulator`, inclusive da galeria) **e** no servidor (segmentos APP1, S-57), testado com a foto de exemplo com GPS |
| **Arquivo malicioso** (tipo falso, imagem gigante) | **Só JPEG**, conferido pela assinatura do conteúdo; 5 MB por arquivo, 3 por denúncia, `multer` em memória com limites; nome aleatório; `nosniff`; nunca servido como estático; rota sempre autenticada (RNF-015) |
| **Foto vista por terceiros** | `podeVerDenuncia` na rota da foto; testes de acesso negado (outro cidadão, sem token) |
| **Arquivo órfão** (transação falhou) ou **sobra de arquivo** (conta excluída) | Grava no disco só depois de validar; apaga se o banco falhar; na exclusão, apaga depois do commit e registra falhas sem dado pessoal |
| **Exclusão acidental ou por token roubado** | Tela própria de confirmação (S-51) e **senha atual** conferida pela API (S-59), com limite de tentativas igual ao do login; senha errada não apaga nada |
| **Conta excluída com sessão aberta** | O middleware confere o usuário no banco (401); os sockets do usuário são desconectados |
| **Lote resolvendo denúncias de outro bairro** | Filtro por `bairroId` e status em aberto na mesma transação; teste dedicado |
| **Ordem do painel com valores nulos** | `nulls: 'last'` (sem isso, no PostgreSQL, as nulas viriam antes das prioritárias), com teste |

## 10. Itens Could (depois da Fase 2)

| Item | Observação |
|---|---|
| **B-045** Alinhar as cores de situação do painel com as do app | `tokens.css` do painel com os mesmos valores de situação do app (Sem energia, Oscilando, Normal), sempre com ícone e texto |
| B-042 Mapa em tela cheia | Sem mudança |
| B-043 E2E (Playwright e Maestro) | Sem mudança |
| B-044 Revisão de segurança | Ganha peso com as fotos: revisar limites, cabeçalhos e o fluxo de upload |

## 11. Riscos

| Risco | Mitigação |
|---|---|
| `multipart` no React Native (forma do `FormData`, `Content-Type` com *boundary*) | Não definir `Content-Type` à mão; teste com o corpo `FormData`; verificação em aparelho já na F2-3 |
| Permissões de câmera e galeria diferentes no Android e no iOS | Textos de permissão no `app.config.ts`; teste nos dois sistemas no Expo Go |
| Migration da coluna `necessidadeEspecial` quebrar a ordenação ou os filtros | `nulls: 'last'` e testes de ordem com nulos; a migration anula só as denúncias já finalizadas |
| Exclusão de conta com fotos grandes demorar | Arquivos apagados depois do commit, sem segurar a transação |
| Lote gerar muitos eventos de uma vez | Eventos emitidos depois do commit; o painel já refaz as consultas em lote |
| Push sem credenciais | Etapa condicional (F2-9), fora do caminho crítico |
| Volume de trabalho maior que o do redesign (três camadas) | Uma etapa por vez, com "ok" entre elas; o corte, se preciso, segue a seção 12 |

## 12. Estimativa e ordem

| Etapa | Estimativa |
|---|---|
| F2-0 Preparação | P (1 h) |
| F2-1 Cancelar denúncia | P (4 h) |
| F2-2 Pessoas, necessidade especial e prioridade | M (8 h) |
| F2-3 Fotos | G (14 h) |
| F2-4 Perfil e exclusão de conta | M (8 h) |
| F2-5 Previsão de reparo | P (4 h) |
| F2-6 Resolução em lote | M (6 h) |
| F2-7 Indicadores no painel | P (4 h) |
| F2-8 Acessibilidade e fechamento | M (4 h) |
| **Total sem push** | **≈ 53 h** (cerca de 7 dias de trabalho de uma pessoa, mais a verificação no celular e no navegador a cada etapa) |
| F2-9 Push (condicional) | G (10 h) → **≈ 63 h** com o push |
| B-045 (Could) | P (3 h) |

**Se for preciso cortar**, nesta ordem: B-045, F2-9 (push), F2-6 (lote), F2-7 (indicadores). Cancelar, necessidade especial, fotos e exclusão de conta não são cortados (conformidade e o fluxo principal do cidadão).

## 13. Sequência de commits sugerida

0. `docs: adiciona plano da Fase 2 e atualiza regras, requisitos e backlog` (F2-0)
1. `feat: cancelar denúncia recebida no app` (F2-1: API, app e teste do painel)
2. `feat: pessoas no local e necessidade especial com consentimento e retenção` (F2-2)
3. `feat: fotos na denúncia com redução e remoção de metadados` (F2-3)
4. `feat: editar perfil e excluir conta com anonimização` (F2-4)
5. `feat(painel): editar e remover previsão de reparo` (F2-5)
6. `feat(painel): resolver denúncias em lote por bairro` (F2-6)
7. `feat(painel): indicadores dos últimos 30 dias` (F2-7)
8. `docs: acessibilidade e roteiro de demonstração da Fase 2` (F2-8)
9. `feat: notificações push de mudança de status` (F2-9, condicional)

Cada commit inclui os testes e a documentação da etapa.

## 14. Decisões

Todas as decisões S-45 a S-60 foram **aprovadas em 2026-11-25** (seção 5), com os ajustes de S-49, S-51, S-57, S-59 e S-60. Pendências de produto que **não bloqueiam**: textos finais dos Termos e da Política (PEN-03) e credenciais de push (PEN-04).
