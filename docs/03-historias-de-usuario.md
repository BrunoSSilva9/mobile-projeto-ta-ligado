# 03 – Histórias de usuário

Personas: **Maria** (cidadã) e **Carlos** (operador), descritas em [01](01-visao-e-escopo.md#4-personas). Cada história aponta os requisitos (`RF`) e regras (`RN`) que a sustentam; os critérios completos de cada RF estão em [requisitos-funcionais.md](02-requisitos/requisitos-funcionais.md).

## Resumo

| ID | História | Requisitos | Regras |
|---|---|---|---|
| US-001 | Criar conta | RF-001, RF-002 | RN-020, RN-022 |
| US-002 | Entrar no app | RF-003 | RN-001 |
| US-003 | Registrar denúncia | RF-007, RF-008, RF-011, RF-012 | RN-002, RN-006, RN-012, RN-023 |
| US-004 | Detalhar a denúncia | RF-009, RF-010 | RN-013, RN-015 |
| US-005 | Acompanhar minhas denúncias | RF-013, RF-014, RF-024 | RN-011, RN-014 |
| US-006 | Cancelar denúncia | RF-015 | RN-005 |
| US-007 | Saber a situação do meu bairro | RF-016, RF-023 | RN-007, RN-008, RN-025 |
| US-008 | Explorar ocorrências no mapa e na lista | RF-019, RF-020, RF-021, RF-022 | RN-007, RN-014 |
| US-009 | Receber notificação push | RF-025 | RN-019 |
| US-010 | Gerenciar perfil e conta | RF-004, RF-005, RF-006 | RN-024 |
| US-011 | Consultar outro endereço | RF-017 | RN-025 |
| US-012 | Ver indicadores dos últimos 30 dias (operador) | RF-018 | RN-017 |
| US-013 | Entrar no painel | RF-026 | RN-001 |
| US-014 | Receber denúncias em tempo real | RF-027 | — |
| US-015 | Filtrar lista e mapa | RF-028, RF-029 | — |
| US-016 | Atualizar status da denúncia | RF-030, RF-031, RF-032, RF-036 | RN-004, RN-010, RN-011 |
| US-017 | Informar previsão de reparo | RF-033 | RN-009 |
| US-018 | Priorizar casos de risco | RF-035 | RN-015 |
| US-019 | Resolver ocorrências por bairro | RF-034 | RN-016 |

## Cidadão

### US-001 – Criar conta
**Como** Maria, **quero** criar uma conta com e-mail e senha **para** registrar e acompanhar minhas denúncias.

```gherkin
Cenário: Cadastro com dados válidos
  Dado que estou na tela de cadastro
  E preenchi nome, e-mail, senha e confirmação válidos
  E marquei o aceite dos Termos e da Política de Privacidade
  Quando toco em "Cadastrar"
  Então minha conta de cidadão é criada
  E sou levada à Home

Cenário: Aceite não marcado
  Dado que preenchi todos os campos
  Quando não marquei o aceite dos Termos
  Então o botão "Cadastrar" permanece desabilitado

Cenário: E-mail já cadastrado
  Dado que o e-mail informado já existe
  Quando toco em "Cadastrar"
  Então vejo "E-mail já cadastrado" e nenhuma conta é criada
```

### US-002 – Entrar no app
**Como** Maria, **quero** entrar com e-mail e senha **para** acessar minhas denúncias.

```gherkin
Cenário: Login válido
  Dado que tenho uma conta de cidadão
  Quando informo e-mail e senha corretos em "Entrar"
  Então vejo a Home

Cenário: Credenciais inválidas
  Quando informo uma senha incorreta
  Então vejo "E-mail ou senha incorretos"

Cenário: Alternar entre entrar e cadastrar
  Dado que estou na tela de login
  Quando toco em "Cadastrar" no topo
  Então vejo o formulário de cadastro com o mesmo layout
```

### US-003 – Registrar denúncia
**Como** Maria, **quero** informar rapidamente que estou sem luz **para** que a operadora seja avisada.

```gherkin
Cenário: Denúncia com GPS ativo
  Dado que concedi permissão de localização
  E não tenho denúncia em aberto
  Quando abro "Denunciar", escolho o tipo "Sem energia" e toco em "Enviar denúncia"
  Então a denúncia é criada com status "Recebida"
  E vejo a tela de sucesso com o protocolo "TL-AAAA-NNNNNN"
  E a mensagem "Sua denúncia foi enviada à Equatorial Pará"

Cenário: GPS negado
  Dado que não concedi permissão de localização
  Quando preencho logradouro e escolho o bairro
  Então consigo enviar a denúncia sem coordenadas

Cenário: Campos obrigatórios ausentes
  Quando toco em "Enviar denúncia" sem escolher o tipo ou o bairro
  Então vejo os campos pendentes destacados e nada é enviado

Cenário: Já existe denúncia em aberto
  Dado que tenho uma denúncia "Recebida" ou "Em atendimento"
  Quando tento enviar outra
  Então vejo que só posso ter uma em aberto
  E o botão "Ver minha denúncia em aberto"

Cenário: Sem internet
  Dado que estou sem conexão
  Quando toco em "Enviar denúncia"
  Então vejo "Sem conexão. Seus dados foram mantidos, tente novamente"
  E o formulário continua preenchido
```

### US-004 – Detalhar a denúncia
**Como** Maria, **quero** anexar fotos e informar que há uma pessoa dependente de energia **para** que a operadora entenda a gravidade.

```gherkin
Cenário: Anexar fotos dentro do limite
  Quando anexo 3 fotos de até 5 MB cada
  Então vejo "3 anexos" e posso remover ou substituir cada uma

Cenário: Foto fora do limite
  Quando tento anexar uma foto de 8 MB ou uma 4ª foto
  Então a foto é recusada com uma mensagem explicando o limite

Cenário: Necessidade especial com consentimento
  Quando respondo "Sim" à pergunta de necessidade especial
  Então vejo um consentimento específico, separado dos Termos
  E, se eu autorizar, a denúncia será tratada como prioritária pela operadora

Cenário: Necessidade especial sem consentimento
  Quando respondo "Sim" e não autorizo o envio
  Então a resposta não é enviada e o resumo me avisa disso

Cenário: Retenção
  Dado que minha denúncia prioritária foi resolvida
  Então a resposta de necessidade especial é apagada
```

### US-005 – Acompanhar minhas denúncias
**Como** Maria, **quero** ver o status e o histórico da minha denúncia **para** saber quando a luz volta.

```gherkin
Cenário: Status muda em tempo real
  Dado que estou no detalhe da minha denúncia
  Quando o operador altera o status para "Em atendimento"
  Então o status e o histórico atualizam na minha tela em até 2 segundos
  E não preciso recarregar

Cenário: Previsão de reparo
  Dado que o operador informou uma previsão de reparo
  Quando abro o detalhe
  Então vejo a data e hora previstas

Cenário: Denúncia improcedente
  Quando o operador marca a denúncia como "Improcedente"
  Então vejo a justificativa informada

Cenário: Lista vazia
  Dado que nunca fiz denúncia
  Quando abro "Minhas denúncias"
  Então vejo "Você ainda não fez denúncias"
```

### US-006 – Cancelar denúncia
**Como** Maria, **quero** cancelar uma denúncia feita por engano **para** não ocupar a operadora.

```gherkin
Cenário: Cancelar denúncia recebida
  Dado que minha denúncia está "Recebida"
  Quando toco em "Cancelar denúncia" e confirmo
  Então o status passa a "Cancelada"
  E posso registrar uma nova denúncia

Cenário: Denúncia já em atendimento
  Dado que minha denúncia está "Em atendimento"
  Então não vejo o botão "Cancelar denúncia"
```

### US-007 – Saber a situação do meu bairro
**Como** Maria, **quero** ver se a rede do meu bairro está estável **para** decidir se é um problema só da minha casa.

```gherkin
Esquema do Cenário: Status do bairro
  Dado que o bairro tem denúncias em aberto: <denúncias>
  Quando abro a Home
  Então vejo o selo "<selo>" e o status "<status>"

  Exemplos:
    | denúncias                        | selo          | status     |
    | uma "Sem energia" e uma "Oscilação" | Instável   | Sem luz    |
    | apenas "Oscilação"               | Instável      | Oscilação  |
    | nenhuma                          | Rede Estável  | Normal     |
```

### US-008 – Explorar ocorrências no mapa e na lista
**Como** Maria, **quero** ver no mapa e em lista onde há falta de luz **para** saber se meus vizinhos já avisaram.

```gherkin
Cenário: Filtrar por status
  Dado que estou na aba "Ocorrências"
  Quando toco no chip "Sem luz"
  Então a lista mostra apenas ocorrências sem energia
  E o contador de cada chip continua visível

Cenário: Privacidade na lista
  Quando vejo uma ocorrência de outro morador
  Então não vejo nome, telefone nem fotos

Cenário: Mapa em tela cheia
  Quando toco em "expandir"
  Então o mapa abre em tela cheia e posso voltar sem perder os filtros

Cenário: Buscar por bairro
  Quando digito "Folha 28"
  Então a lista mostra apenas ocorrências dessa folha
```

### US-009 – Receber notificação push
**Como** Maria, **quero** ser avisada no celular quando o status mudar **para** não precisar abrir o app.

```gherkin
Cenário: Push na mudança de status
  Dado que permiti notificações
  Quando o operador altera o status da minha denúncia
  Então recebo uma notificação com o novo status
  E ao tocar nela abro o detalhe da denúncia

Cenário: Sem permissão
  Dado que neguei notificações
  Então continuo vendo as atualizações em tempo real dentro do app
```

### US-010 – Gerenciar perfil e conta
**Como** Maria, **quero** editar meus dados, sair e excluir minha conta **para** ter controle sobre meus dados.

```gherkin
Cenário: Editar telefone
  Quando altero meu telefone para um número válido e salvo
  Então vejo o novo telefone no Perfil

Cenário: Sair
  Quando toco em "Sair"
  Então volto ao login e a sessão é encerrada

Cenário: Excluir conta
  Quando toco em "Excluir minha conta", leio o que será apagado e confirmo
  Então meus dados pessoais, minhas fotos e a resposta de necessidade especial são removidos
  E minhas denúncias passam a ser anônimas
  E uma denúncia em aberto continua aberta para a operadora
  E volto à tela de login
```

### US-011 – Consultar outro endereço
**Como** Maria, **quero** consultar a situação de outro bairro **para** saber se a casa da minha mãe está sem luz.

```gherkin
Cenário: Alterar endereço de consulta
  Dado que estou na Home
  Quando toco em "Alterar endereço" e escolho outro bairro
  Então vejo o status desse bairro com o aviso "Consultando: {bairro}"
  E meu cadastro não é alterado
```

### US-012 – Ver indicadores dos últimos 30 dias (operador)
**Como** Carlos, **quero** ver números gerais dos últimos 30 dias **para** acompanhar o volume e a resolução das denúncias (decisão S-52: só no painel).

```gherkin
Cenário: Indicadores
  Quando abro o painel
  Então vejo usuários cadastrados, denúncias registradas, em atendimento e resolvidas
  E a taxa de resolução calculada sobre os últimos 30 dias
```

## Operador

### US-013 – Entrar no painel
**Como** Carlos, **quero** entrar no painel com minha conta **para** atender as denúncias.

```gherkin
Cenário: Login de operador
  Dado que tenho uma conta de operador criada pela equipe
  Quando informo e-mail e senha corretos
  Então vejo a lista de denúncias

Cenário: Cidadão tenta entrar
  Dado que a conta é de cidadão
  Quando tento entrar no painel
  Então o acesso é negado
```

### US-014 – Receber denúncias em tempo real
**Como** Carlos, **quero** ser avisado quando chega uma denúncia **para** agir sem recarregar a página.

```gherkin
Cenário: Nova denúncia
  Dado que estou com o painel aberto
  Quando um cidadão envia uma denúncia
  Então ela aparece no topo da lista em até 2 segundos
  E vejo um alerta visual
  E ouço um som, se o som estiver ativado
```

### US-015 – Filtrar lista e mapa
**Como** Carlos, **quero** filtrar por status, tipo e bairro **para** focar no que preciso.

```gherkin
Cenário: Filtros combinados
  Quando filtro status "Recebida", tipo "Sem energia" e bairro "Cidade Nova"
  Então lista e mapa mostram apenas as denúncias que atendem aos três filtros

Cenário: Mapa e lista sincronizados
  Quando clico em um pino do mapa
  Então vejo o resumo da denúncia e posso abrir o detalhe
```

### US-016 – Atualizar status da denúncia
**Como** Carlos, **quero** atualizar o status **para** manter o cidadão informado.

```gherkin
Cenário: Iniciar atendimento
  Dado uma denúncia "Recebida"
  Quando altero para "Em atendimento"
  Então o histórico registra a mudança com meu usuário, data e hora
  E o autor é avisado em tempo real e por push

Cenário: Resolver
  Dado uma denúncia "Em atendimento"
  Quando altero para "Resolvida"
  Então o status final é gravado e o autor é avisado

Cenário: Improcedente exige justificativa
  Quando escolho "Improcedente" sem escrever a justificativa
  Então o sistema bloqueia a ação e pede a justificativa

Cenário: Transição inválida
  Dado uma denúncia "Resolvida"
  Então não há ações de mudança de status disponíveis
```

### US-017 – Informar previsão de reparo
**Como** Carlos, **quero** informar uma previsão de reparo **para** reduzir as ligações perguntando "quando volta?".

```gherkin
Cenário: Informar previsão
  Dado uma denúncia em aberto
  Quando informo uma previsão futura e salvo
  Então o cidadão vê a previsão no detalhe e no card do bairro

Cenário: Previsão no passado
  Quando informo uma data já passada
  Então o sistema recusa com uma mensagem
```

### US-018 – Priorizar casos de risco
**Como** Carlos, **quero** ver primeiro as denúncias com pessoas dependentes de energia **para** priorizar o atendimento.

```gherkin
Cenário: Ordenação por prioridade
  Dado denúncias com e sem necessidade especial
  Quando abro a lista
  Então as prioritárias aparecem no topo, com destaque visual
```

### US-019 – Resolver ocorrências por bairro
**Como** Carlos, **quero** ver as denúncias agrupadas por bairro e resolvê-las de uma vez **para** não repetir a mesma ação várias vezes.

```gherkin
Cenário: Resolução em lote
  Dado várias denúncias em aberto no bairro "Cidade Nova"
  Quando escolho "Resolver todas do bairro" e confirmo
  Então todas passam a "Resolvida"
  E cada autor é avisado individualmente
  E cada denúncia ganha sua entrada de histórico
```
