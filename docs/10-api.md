# 10 – API

Rascunho do contrato da API (`apps/api`). Cobre os endpoints principais: cadastro/login, registrar denúncia, listar ocorrências e mapa, detalhe, minhas denúncias, cancelar, listar denúncias no painel e atualizar status, além dos **eventos WebSocket**.

- **Base:** `/api/v1` · **Formato:** JSON (e `multipart/form-data` no envio de denúncia com fotos, F2-3) · **Datas:** ISO 8601 em UTC.
- **Autenticação:** `Authorization: Bearer <JWT>` em todas as rotas, exceto `register` e `login` ([ADR-0004](adr/0004-autenticacao-jwt-com-rbac.md)).
- **Papéis:** `CIDADAO` (app) e `OPERADOR` (painel). Rotas `/painel/*` exigem `OPERADOR`.
- **Regras:** referências `RN-xxx` em [regras-de-negocio.md](02-requisitos/regras-de-negocio.md).

## Formato de erro

```json
{
  "erro": {
    "codigo": "DENUNCIA_EM_ABERTO",
    "mensagem": "Você já tem uma denúncia em aberto.",
    "detalhes": [{ "campo": "tipo", "mensagem": "Obrigatório" }],
    "dados": { "denunciaEmAbertoId": "uuid" }
  }
}
```

| HTTP | Código | Quando |
|---|---|---|
| 400 | `VALIDACAO_ERRO` | Campos inválidos ou ausentes (`detalhes` por campo) |
| 401 | `NAO_AUTENTICADO` / `CREDENCIAIS_INVALIDAS` | Token ausente/expirado; e-mail ou senha incorretos |
| 403 | `SEM_PERMISSAO` | Papel insuficiente ou recurso de outro usuário (RN-014) |
| 403 | `SENHA_INCORRETA` | Senha atual errada ao excluir a conta (`DELETE /me`, S-59). É `403`, e não `401`, para o app não tratar como sessão expirada |
| 404 | `NAO_ENCONTRADO` | Recurso inexistente |
| 409 | `EMAIL_JA_CADASTRADO` | E-mail repetido (RN-022) |
| 409 | `DENUNCIA_EM_ABERTO` | Já existe denúncia em aberto do autor (RN-006). O corpo traz `erro.dados.denunciaEmAbertoId` para o app abrir essa denúncia |
| 413 / 415 | `ARQUIVO_INVALIDO` | **413:** foto acima de 5 MB. **415:** a foto não é um JPEG (conferido pelo **conteúdo**, não pela extensão nem pelo `Content-Type`) ou está quebrada (RN-013, S-49) |
| 422 | `TRANSICAO_INVALIDA` | Mudança de status não permitida (RN-004, RN-005) |
| 422 | `JUSTIFICATIVA_OBRIGATORIA` | Improcedente sem justificativa (RN-010) |
| 422 | `PREVISAO_NO_PASSADO` | Previsão de reparo anterior a agora (RN-009) |
| 422 | `LIMITE_FOTOS` | Mais de 3 fotos (RN-013) |
| 429 | `MUITAS_REQUISICOES` | *Rate limit* (S-18) |
| 500 | `ERRO_INTERNO` | Falha inesperada |

## Endpoints

### Autenticação

| Método | Rota | Auth | Descrição | Requisito |
|---|---|---|---|---|
| POST | `/auth/register` | — | Cadastra cidadão | RF-001, RF-002 |
| POST | `/auth/login` | — | Login (cidadão ou operador) | RF-003, RF-026 |

**`POST /auth/register`**
```json
// requisição
{ "nome": "Maria Silva", "email": "maria@exemplo.com", "senha": "minhasenha1",
  "telefone": "(94) 90000-0000", "aceiteTermos": true, "versaoTermos": "2026-11" }
// 201
{ "token": "<jwt>", "usuario": { "id": "uuid", "nome": "Maria Silva", "email": "maria@exemplo.com",
  "telefone": "(94) 90000-0000", "papel": "CIDADAO" } }
```
Erros: 400, 409 `EMAIL_JA_CADASTRADO`. `aceiteTermos` deve ser `true` (RN-020). Só cria `CIDADAO`.

**`POST /auth/login`**
```json
// requisição
{ "email": "maria@exemplo.com", "senha": "minhasenha1" }
// 200
{ "token": "<jwt>", "usuario": { "id": "uuid", "nome": "Maria Silva", "papel": "CIDADAO" } }
```
Erros: 401 `CREDENCIAIS_INVALIDAS`, 429. O cliente recusa o papel que não for o seu (app → `CIDADAO`, painel → `OPERADOR`).

### Perfil

| Método | Rota | Auth | Descrição | Requisito |
|---|---|---|---|---|
| GET | `/me` | Qualquer | Dados do usuário logado | RF-005 |
| PATCH | `/me` | Cidadão | Edita `nome` e `telefone` | RF-005 |
| DELETE | `/me` | Cidadão | Exclui a conta (RN-024) | RF-006 |
| PUT | `/me/push-token` | Cidadão | Registra o token de push `{ "token", "plataforma" }` | RF-025 |
| DELETE | `/me/push-token` | Cidadão | Remove o token (logout) | RF-004 |

**`PATCH /me`** (RF-005, decisão S-22; **implementada na F2-4**) → `200` com `{ id, nome, email, telefone, papel }`.
```json
// requisição: só nome e telefone; campo ausente = não muda; telefone "" ou null = apaga o telefone
{ "nome": "Maria Souza", "telefone": "(94) 98888-7777" }
```
O **e-mail é somente leitura**: é ignorado, assim como `papel`, `senha` e qualquer outro campo. Erros: `400 VALIDACAO_ERRO` (nome com menos de 2 ou mais de 100 caracteres, telefone sem DDD, corpo sem `nome` nem `telefone`), `401`, `403 SEM_PERMISSAO` (operador).

**`DELETE /me`** (RN-024, decisões S-50 e S-59; **implementada na F2-4**)
```json
// requisição
{ "senha": "minhasenha1" }
// 204, sem corpo
```
A API confere a senha atual antes de apagar. Numa transação: remove nome, e-mail, telefone, hash da senha, tokens de push, fotos (registros; os arquivos são apagados logo depois) e a resposta de necessidade especial; mantém as denúncias e o histórico **sem vínculo** com a conta. **Uma denúncia em aberto continua aberta** (o painel mostra "Conta excluída"). Depois do commit apaga os arquivos das fotos (uma falha de disco só vira log, sem dado pessoal) e **derruba as conexões em tempo real da conta**; o token antigo passa a receber `401` e o e-mail fica livre para um novo cadastro. A rota tem o limite de tentativas **por IP e por conta**, contando só as falhas (como o login).
Erros: `400 VALIDACAO_ERRO` (sem senha), `403 SENHA_INCORRETA` ("Senha incorreta.", sem mais detalhes; nada é apagado), `403 SEM_PERMISSAO` (operador), `429 MUITAS_REQUISICOES` (mesmo limite do login: 5 falhas por minuto, por IP e por conta, S-18).

### Bairros e indicadores

| Método | Rota | Auth | Descrição | Requisito |
|---|---|---|---|---|
| GET | `/bairros` | Qualquer | Lista fixa de bairros e folhas | RN-021 |
| GET | `/bairros/proximo?lat=&lng=` | Cidadão | Bairro de centro mais próximo (até 15 km); devolve também `distanciaKm`; 404 fora do raio | RF-016, RN-025 |
| GET | `/bairros/status` | Cidadão | Status de cada bairro, contagem e previsão | RF-019, RF-023 |
| GET | `/indicadores` | Cidadão | Indicadores dos últimos 30 dias | RF-018 |

**`GET /bairros/status`** → `200`
```json
{ "atualizadoEm": "2026-11-18T14:00:00Z",
  "bairros": [
    { "bairroId": 3, "nome": "Cidade Nova", "folha": null, "latitude": -5.37, "longitude": -49.12,
      "status": "SEM_LUZ", "emAberto": 4, "previsaoReparo": "2026-11-18T16:20:00Z" },
    { "bairroId": 7, "nome": "Velha Marabá (Orla)", "status": "NORMAL", "emAberto": 0, "previsaoReparo": null }
  ] }
```
`status` ∈ `SEM_LUZ` | `OSCILACAO` | `NORMAL` (RN-007). `previsaoReparo` segue RN-009.

**`GET /indicadores`** → `200`
```json
{ "periodoDias": 30, "usuariosCadastrados": 40532, "denunciasRegistradas": 698,
  "emAtendimento": 107, "resolvidas": 591, "taxaResolucao": 0.85 }
```

### Denúncias do cidadão

| Método | Rota | Auth | Descrição | Requisito |
|---|---|---|---|---|
| POST | `/denuncias` | Cidadão | Registra denúncia (com fotos opcionais) | RF-007 a RF-012 |
| GET | `/denuncias/minhas` | Cidadão | Lista as próprias denúncias | RF-013 |
| GET | `/denuncias/{id}` | Cidadão (autor) | Detalhe com histórico | RF-014 |
| POST | `/denuncias/{id}/cancelar` | Cidadão (autor) | Cancela se `RECEBIDA` | RF-015 |
| GET | `/denuncias/{id}/fotos/{fotoId}` | Autor ou Operador | Baixa a foto (rota autenticada) | RN-014, RNF-015 |

**`POST /denuncias`** (aceita **JSON** e **`multipart/form-data`**, decisão S-58; o `multipart` é o envio com fotos, F2-3). No `multipart` cada campo vai como texto (`bairroId=3`, `latitude=-5.37`, `necessidadeEspecial=true`...) e a API converte; um arquivo em outro campo que não `fotos` é recusado (`400`).
```
tipo=SEM_ENERGIA               (obrigatório: SEM_ENERGIA | OSCILACAO)
bairroId=3                     (obrigatório)
logradouro=Av. VP-3, Folha 28  (obrigatório)
cep=68500-000                  (opcional)
pontoReferencia=Próximo à rotatória   (opcional)
descricao=Estalo forte no poste…      (opcional, até 500)
latitude=-5.3712  longitude=-49.1231  (opcionais; sem GPS, omitir)
faixaPessoas=DE_4_A_8          (opcional: ATE_3 | DE_4_A_8 | DE_9_A_20 | RUA_TODA)
necessidadeEspecial=true       (opcional: true | false; ausente ou null = não informado. Só Sim/Não, S-46)
consentimentoNecessidade=true  (obrigatório e true quando necessidadeEspecial=true; LGPD, art. 11)
fotos=<arquivo>  fotos=<arquivo>   (opcional, só multipart: até 3, 5 MB cada, SÓ JPEG — S-49)
```
```json
// 201
{ "id": "uuid", "protocolo": "TL-2026-000123", "status": "RECEBIDA", "tipo": "SEM_ENERGIA",
  "bairro": { "id": 3, "nome": "Cidade Nova" }, "criadoEm": "2026-11-18T14:02:10Z" }
```
Erros: 400, 409 `DENUNCIA_EM_ABERTO`, 413/415 `ARQUIVO_INVALIDO`, 422 `LIMITE_FOTOS`. O "Sim" sem `consentimentoNecessidade: true` dá `400 VALIDACAO_ERRO` no campo `consentimentoNecessidade` ("Para enviar a necessidade especial, autorize o envio dessa informação à Equatorial."). O `detalheNecessidade` da Fase 1 não existe mais: se vier, é descartado (F2-2).
**Fotos (RF-009, RN-013, S-49, S-57):** a API confere a assinatura do conteúdo (`FF D8 FF`), recusa tudo que não for JPEG (`415`, mesmo com `Content-Type: image/jpeg`), acima de 5 MB (`413`) e a partir da 4ª (`422 LIMITE_FOTOS`; a mensagem diz qual foto tem problema), **remove os metadados (segmentos APP1: EXIF e XMP, onde fica o GPS)** e grava o arquivo com nome aleatório em `UPLOADS_DIR/{denunciaId}/{fotoId}.jpg`, **fora de qualquer rota pública**. Os arquivos só vão para o disco depois de validados; se o registro falhar (ex.: `409`), são apagados. O app já envia JPEG reduzido (lado maior de 1600 px) e sem EXIF; a limpeza do servidor é uma garantia a mais.
Efeitos: grava denúncia e histórico inicial (transação); com "Sim", grava também a data do consentimento; emite `denuncia:criada` e `ocorrencia:atualizada`.

**`GET /denuncias/minhas?status=&page=&limite=`** → `200`
```json
{ "itens": [ { "id": "uuid", "protocolo": "TL-2026-000123", "tipo": "SEM_ENERGIA",
    "status": "EM_ATENDIMENTO", "bairro": "Cidade Nova", "criadoEm": "2026-11-18T14:02:10Z",
    "previsaoReparo": "2026-11-18T16:20:00Z" } ],
  "pagina": 1, "total": 1 }
```

**`GET /denuncias/{id}/fotos/{fotoId}`** (RNF-015, RN-014) → `200` com o JPEG (`Content-Type: image/jpeg`, `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff`). **Só o autor da denúncia e o operador** (com o token no cabeçalho `Authorization`); outro cidadão, foto inexistente, id inválido, denúncia anonimizada (para cidadãos) e arquivo ausente respondem **`404`** igual, sem revelar nada. Sem token: `401`. A pasta das fotos nunca é servida como arquivo estático.

**`GET /denuncias/{id}`** → `200`
```json
{ "id": "uuid", "protocolo": "TL-2026-000123", "tipo": "SEM_ENERGIA", "status": "EM_ATENDIMENTO",
  "logradouro": "Av. VP-3, Folha 28", "bairro": { "id": 3, "nome": "Cidade Nova" },
  "descricao": "…", "latitude": -5.3712, "longitude": -49.1231,
  "faixaPessoas": "DE_4_A_8", "necessidadeEspecial": true,
  "previsaoReparo": "2026-11-18T16:20:00Z", "justificativa": null,
  "fotos": [ { "id": "uuid", "url": "/api/v1/denuncias/uuid/fotos/uuid" } ],
  "historico": [
    { "statusAnterior": null, "statusNovo": "RECEBIDA", "evento": "STATUS", "previsaoReparo": null,
      "por": "Você", "criadoEm": "2026-11-18T14:02:10Z" },
    { "statusAnterior": "RECEBIDA", "statusNovo": "EM_ATENDIMENTO", "evento": "STATUS",
      "previsaoReparo": "2026-11-18T16:20:00Z", "por": "Equatorial Pará",
      "justificativa": null, "criadoEm": "2026-11-18T14:10:41Z" },
    { "statusAnterior": "EM_ATENDIMENTO", "statusNovo": "EM_ATENDIMENTO", "evento": "PREVISAO",
      "previsaoReparo": null, "por": "Equatorial Pará", "justificativa": null,
      "criadoEm": "2026-11-18T15:00:00Z" } ] }
```
**Histórico (F2-5, S-60):** cada registro agora traz `evento` (`STATUS` ou `PREVISAO`) e `previsaoReparo`. Um registro `PREVISAO` quer dizer que **só a previsão mudou** (`statusAnterior` e `statusNovo` são iguais): `previsaoReparo` com data = definida ou trocada; **`null` = previsão removida**. Num registro `STATUS`, `previsaoReparo` é a previsão informada junto com a mudança (ex.: "Iniciar atendimento"), ou `null`. **Só somam campos**: quem lia só `statusAnterior`, `statusNovo`, `por`, `justificativa` e `criadoEm` continua funcionando (o painel e o app tratam a falta de `evento` como `STATUS`).
Erros: 404/403 se a denúncia não for do autor.

**`POST /denuncias/{id}/cancelar`** (RF-015, RN-005; **implementada na F2-1**), sem corpo → `200` com o detalhe completo (mesma forma de `GET /denuncias/{id}`), já com `status: CANCELADA` e a entrada `{ statusAnterior: RECEBIDA, statusNovo: CANCELADA, por: "Você" }` no histórico. Só o autor cancela, e só em `RECEBIDA`. A gravação é condicional ao status lido: se a operadora iniciar o atendimento ao mesmo tempo, só uma das duas vence e a outra recebe `422`.
Erros: `401` (sem token), `403 SEM_PERMISSAO` (operador: ele usa as rotas do painel), `404 NAO_ENCONTRADO` (não existe, id inválido ou é de outro cidadão, RN-014), `422 TRANSICAO_INVALIDA` (já em atendimento ou encerrada).
Efeitos: status, `finalizadaEm` e histórico na mesma transação (RN-011); emite `denuncia:status-atualizado` (autor e operadores, com `por: "Você"`), `ocorrencia:atualizada` e `bairro:status-atualizado`. **Não gera push** (RN-019).

### Ocorrências públicas

| Método | Rota | Auth | Descrição | Requisito |
|---|---|---|---|---|
| GET | `/ocorrencias?status=&bairroId=&q=&page=&limite=` | Cidadão | Lista pública anonimizada e pinos do mapa | RF-019 a RF-021 |

`status` aceita `SEM_LUZ` (sem energia em aberto), `OSCILACAO` (oscilação em aberto), `RESTABELECIDO` (resolvidas nas **últimas 24 h**, decisão S-21) ou ausente (a união dos três). Improcedentes e canceladas nunca aparecem. `q` busca por bairro ou folha, sem acentos nem diferença de caixa, e combina com `bairroId` (interseção). Ordem: da mais recente para a mais antiga. Paginação: `page` (padrão 1) e `limite` (padrão 20, máximo 50). Acesso só de **cidadão** (operador recebe 403).

```json
{ "totais": { "todos": 18, "semLuz": 9, "oscilacao": 6, "restabelecidos": 3 },
  "itens": [ { "id": "uuid", "tipo": "SEM_ENERGIA", "status": "RECEBIDA",
      "bairro": "Nova Marabá", "folha": "Folha 32", "logradouro": "Av. VP-8",
      "descricao": "Queda brusca de energia", "latitude": -5.371, "longitude": -49.123,
      "criadoEm": "2026-11-18T13:37:00Z" } ],
  "pagina": 1, "total": 18 }
```
Sem `autor`, protocolo, fotos, pessoas ou necessidade especial; coordenadas arredondadas a 3 casas (RN-014). `totais` respeita `bairroId` e `q`, mas **não** o chip escolhido (`status`), e `todos` é a soma dos três; `total` é o número de itens do chip escolhido. A resposta também traz `atualizadoEm` (ISO 8601).

### Painel da operadora (somente `OPERADOR`)

| Método | Rota | Descrição | Requisito |
|---|---|---|---|
| GET | `/painel/denuncias?status=&tipo=&bairroId=&prioritarias=&page=&limite=` | Lista com filtros; prioritárias primeiro e, em cada grupo, a mais antiga primeiro (RN-015) | RF-028, RF-029, RF-035 |
| GET | `/painel/denuncias/{id}` | Detalhe completo (autor, telefone, fotos, histórico) | RF-030 |
| PATCH | `/painel/denuncias/{id}/status` | Atualiza status (e previsão opcional) | RF-031 a RF-033, RF-036 |
| PATCH | `/painel/denuncias/{id}/previsao` | Define, troca ou **remove** só a previsão de reparo (denúncia em aberto; cada mudança vai para o histórico) | RF-033 |
| GET | `/painel/bairros` | Agrupado por bairro (contagem por tipo e status) | RF-034 |
| POST | `/painel/bairros/{bairroId}/resolver` | Resolve em lote todas as em aberto do bairro (RN-016) | RF-034 |

**`GET /painel/denuncias`**: filtros opcionais e combináveis. `status` aceita um ou vários valores (`status=RECEBIDA,EM_ATENDIMENTO` ou o parâmetro repetido); `tipo` (`SEM_ENERGIA` | `OSCILACAO`); `bairroId`; `prioritarias` (`true` | `false`). Paginação: `page` (padrão 1) e `limite` (padrão 20, máximo 100). Parâmetro inválido: `400 VALIDACAO_ERRO`. O `total` respeita os filtros. → `200`
```json
{ "itens": [ { "id": "uuid", "protocolo": "TL-2026-000123", "prioritaria": true,
    "tipo": "SEM_ENERGIA", "status": "RECEBIDA",
    "bairro": { "id": 3, "nome": "Cidade Nova", "folha": null }, "logradouro": "Av. VP-3",
    "latitude": -5.3712, "longitude": -49.1231, "previsaoReparo": null,
    "criadoEm": "2026-11-18T14:02:10Z" } ],
  "pagina": 1, "total": 12 }
```

**`GET /painel/denuncias/{id}`** → `200`: igual a `GET /denuncias/{id}` mais `autor: { id, nome, telefone }`, `cep`, `pontoReferencia`, `consentimentoNecessidadeEm` e `historico[].por` com o nome do operador.

**Necessidade especial nas respostas (RN-015, RN-026):** `necessidadeEspecial` é `true`, `false` ou `null` (não informada, ou **apagada** quando a denúncia fica Resolvida, Improcedente ou Cancelada). `prioritaria` é `true` só com `necessidadeEspecial === true`. Na lista do painel, a ordem é prioritárias primeiro (nulas no fim do grupo comum) e `prioritarias=false` traz as "Não" e as sem resposta. Toda mudança para status final (operador, cancelamento pelo autor e, na F2-6, o lote) apaga a resposta e o consentimento na mesma gravação.

**`PATCH /painel/denuncias/{id}/previsao`** (RF-033, RN-009, decisão S-60; **implementada na F2-5**) → `200` com o detalhe do painel atualizado.
```json
// definir ou trocar (data e hora no futuro, ISO 8601 com fuso)
{ "previsaoReparo": "2026-11-18T16:20:00Z" }
// remover
{ "previsaoReparo": null }
```
O campo é **obrigatório** (um corpo vazio nunca remove a previsão sem querer). Só vale **enquanto a denúncia está em aberto** (`RECEBIDA` ou `EM_ATENDIMENTO`); encerrada: `422 TRANSICAO_INVALIDA`, tanto para definir quanto para remover. Data no passado ou igual a agora: `422 PREVISAO_NO_PASSADO`. Corpo inválido: `400 VALIDACAO_ERRO`. Pedir o mesmo valor que já está salvo é `200` **sem** registro no histórico e **sem** evento. A gravação é condicional ao status lido (se o cidadão cancelou no meio tempo, `422 TRANSICAO_INVALIDA`, S-29).
Efeitos: a previsão e **um registro `PREVISAO` no histórico** na mesma transação (RNF-010); depois do commit emite `denuncia:status-atualizado` (autor e operadores; **mesmo formato de sempre**, com `status` e `statusAnterior` iguais e `previsaoReparo` novo ou `null`), `ocorrencia:atualizada` e `bairro:status-atualizado` (a previsão do bairro é a menor entre as denúncias em aberto, RN-009). Sem push.

**`PATCH /painel/denuncias/{id}/status`**
```json
// requisição
{ "status": "EM_ATENDIMENTO", "previsaoReparo": "2026-11-18T16:20:00Z" }
// ou
{ "status": "IMPROCEDENTE", "justificativa": "Local sem interrupção confirmada pela equipe." }
// 200: denúncia atualizada (mesma forma do detalhe)
```
Regras: `justificativa` (10 a 500 caracteres) só vale para `IMPROCEDENTE` e é descartada nos outros status; `previsaoReparo` (ISO 8601) só vale enquanto a denúncia **continua em aberto** (com status final, `400`). A mudança é gravada só se o status ainda for o que o operador viu: se outra pessoa mudou antes (ex.: dois operadores ao mesmo tempo, ou o cidadão cancelou), a resposta é `422 TRANSICAO_INVALIDA` e só uma das requisições vence. O operador não pode cancelar pelo autor (`403`).
Erros: 400, 403, 404, 422 `TRANSICAO_INVALIDA`, 422 `JUSTIFICATIVA_OBRIGATORIA`, 422 `PREVISAO_NO_PASSADO`, conflitos (ex.: o cidadão cancelou antes) resultam em 422 `TRANSICAO_INVALIDA`; não há controle de versão otimista no MVP (decisão S-29).
Efeitos: status + histórico na mesma transação (RNF-010); emite `denuncia:status-atualizado` (autor e operadores), `ocorrencia:atualizada` e `bairro:status-atualizado`; envia push (RN-019).

**`GET /painel/bairros`** (RF-034; **implementada na F2-6**) → `200` com os bairros que têm denúncias **em aberto** (`RECEBIDA` ou `EM_ATENDIMENTO`). Bairro sem nenhuma em aberto não aparece. Ordem: mais prioritárias primeiro, depois mais denúncias em aberto e, por fim, o nome (A a Z). A conta é a função pura `resumirPorBairro`.
```json
{ "bairros": [
  { "bairroId": 2, "nome": "Nova Marabá", "folha": "Folha 28", "emAberto": 3,
    "porTipo": { "SEM_ENERGIA": 2, "OSCILACAO": 1 },
    "porStatus": { "RECEBIDA": 2, "EM_ATENDIMENTO": 1 },
    "prioritarias": 1 } ] }
```

**`POST /painel/bairros/{bairroId}/resolver`** (RF-034, RN-016; **implementada na F2-6**) → `200 { "resolvidas": 4 }`.
```json
{ "confirmacao": true }
```
A confirmação é **obrigatória**: sem `"confirmacao": true` (ausente, `false` ou outro valor), `400 VALIDACAO_ERRO` e nada muda. Cidadão: `403`; sem login: `401`; bairro que não existe: `404`; `bairroId` que não é número: `400`. Bairro sem denúncias em aberto: `200 { "resolvidas": 0 }`, sem eventos.
Efeitos: numa **única transação**, cada denúncia em aberto do bairro vai para `RESOLVIDA` (única exceção de RN-004: `RECEBIDA → RESOLVIDA` direto), com **um registro no histórico por denúncia** (RN-011: operador, `evento: STATUS`), `finalizadaEm` e a retenção da necessidade especial (RN-026). A gravação é condicional ao status lido: a denúncia que mudou no meio tempo (ex.: o cidadão cancelou) fica de fora, sem derrubar as outras, e não entra na contagem de `resolvidas`. Depois do commit, emite **um `denuncia:status-atualizado` por denúncia resolvida** (e, com ele, `ocorrencia:atualizada` e `bairro:status-atualizado`), no mesmo formato de sempre. Sem push.

## Eventos WebSocket

Conexão: `io(API_URL, { auth: { token }, transports: ['websocket'] })` (Socket.IO 4). O servidor valida o JWT **e confirma o usuário no banco** no *handshake* e inscreve o cliente em salas ([ADR-0002](adr/0002-socketio-para-tempo-real.md)).

**Conexão recusada:** sem token, token inválido, expirado, de outro segredo ou de uma conta que não existe mais. O cliente recebe `connect_error` com `err.message = "NAO_AUTENTICADO"` e `err.data = { codigo: "NAO_AUTENTICADO", mensagem }`. A validade do token é conferida só ao conectar: uma conexão já aberta não é derrubada quando o token expira (ao reconectar é preciso um token válido).

Salas:

| Sala | Quem entra | Conteúdo |
|---|---|---|
| `papel:OPERADOR` | Operadores | Dados completos das denúncias |
| `cidadaos` | Cidadãos | Dados **anonimizados** e status de bairros |
| `usuario:{id}` | O próprio cidadão | Eventos privados da sua denúncia |

Todos os eventos são do servidor para o cliente. Os clientes **não** enviam eventos de negócio (ações são por REST).

| Evento | Sala de destino | Quando |
|---|---|---|
| `denuncia:criada` | `papel:OPERADOR` | Após criar denúncia |
| `denuncia:status-atualizado` | `usuario:{autorId}` e `papel:OPERADOR` | Mudança de status ou previsão |
| `ocorrencia:atualizada` | `cidadaos` | Criação ou mudança de status (versão pública) |
| `bairro:status-atualizado` | `cidadaos` | Sempre que o conjunto de denúncias em aberto do bairro muda (criação ou mudança de status/previsão): o servidor **recalcula** o status e envia o valor atual, que o cliente simplesmente substitui |

**`denuncia:criada`** (operadores)
```json
{ "id": "uuid", "protocolo": "TL-2026-000123", "prioritaria": true,
  "tipo": "SEM_ENERGIA", "status": "RECEBIDA",
  "bairro": { "id": 3, "nome": "Cidade Nova", "folha": null }, "logradouro": "Av. VP-3",
  "descricao": "Estalo forte no poste",
  "latitude": -5.3712, "longitude": -49.1231,
  "autor": { "id": "uuid", "nome": "Maria Silva", "telefone": "(94) 90000-0000" },
  "criadoEm": "2026-11-18T14:02:10Z" }
```

**`denuncia:status-atualizado`** (autor e operadores)
```json
{ "id": "uuid", "protocolo": "TL-2026-000123",
  "statusAnterior": "RECEBIDA", "status": "EM_ATENDIMENTO",
  "previsaoReparo": "2026-11-18T16:20:00Z", "justificativa": null,
  "alteradoEm": "2026-11-18T14:10:41Z", "por": "Equatorial Pará" }
```

**`ocorrencia:atualizada`** (cidadãos): mesmo formato de um item de `GET /ocorrencias`.

**`bairro:status-atualizado`** (cidadãos)
```json
{ "bairroId": 3, "nome": "Cidade Nova", "folha": null, "status": "SEM_LUZ", "emAberto": 4,
  "previsaoReparo": "2026-11-18T16:20:00Z" }
```

**Reconexão:** o cliente reconecta automaticamente e, ao reconectar, refaz as consultas REST ativas (RNF-009).

## Rascunho OpenAPI (trecho)

```yaml
openapi: 3.1.0
info: { title: Tá Ligado? API, version: 0.1.0 }
servers: [{ url: /api/v1 }]
components:
  securitySchemes:
    bearer: { type: http, scheme: bearer, bearerFormat: JWT }
  schemas:
    StatusDenuncia: { type: string, enum: [RECEBIDA, EM_ATENDIMENTO, RESOLVIDA, IMPROCEDENTE, CANCELADA] }
    TipoDenuncia:   { type: string, enum: [SEM_ENERGIA, OSCILACAO] }
    Erro:
      type: object
      properties:
        erro:
          type: object
          required: [codigo, mensagem]
          properties: { codigo: { type: string }, mensagem: { type: string }, detalhes: { type: array, items: { type: object } } }
paths:
  /auth/login:
    post:
      security: []
      requestBody: { required: true, content: { application/json: { schema: { type: object, required: [email, senha], properties: { email: { type: string, format: email }, senha: { type: string } } } } } }
      responses: { '200': { description: Token e usuário }, '401': { description: Credenciais inválidas } }
  /denuncias:
    post:
      security: [{ bearer: [] }]
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              required: [tipo, bairroId, logradouro]
              properties:
                tipo: { $ref: '#/components/schemas/TipoDenuncia' }
                bairroId: { type: integer }
                logradouro: { type: string }
                fotos: { type: array, maxItems: 3, items: { type: string, format: binary } }
      responses: { '201': { description: Criada }, '409': { description: Já existe denúncia em aberto } }
  /painel/denuncias/{id}/status:
    patch:
      security: [{ bearer: [] }]   # papel OPERADOR
      parameters: [{ name: id, in: path, required: true, schema: { type: string, format: uuid } }]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [status]
              properties:
                status: { $ref: '#/components/schemas/StatusDenuncia' }
                justificativa: { type: string }
                previsaoReparo: { type: string, format: date-time }
      responses: { '200': { description: Atualizada }, '422': { description: Transição inválida ou justificativa ausente } }
```

O arquivo completo (`apps/api/openapi.yaml`) será gerado na implementação, mantendo este documento como referência.
