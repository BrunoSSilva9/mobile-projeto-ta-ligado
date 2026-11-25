# Requisitos funcionais

Prioridade em **MoSCoW**: Must (essencial ao MVP), Should (importante, entra se houver tempo), Could (desejável), Won't (fora do MVP, ver [14](../14-roadmap-e-backlog.md)).

Telas: `T-xx` = app do cidadão, `P-xx` = painel da operadora. Detalhes e links dos nodes do Figma em [05 – Telas e fluxos](../05-telas-e-fluxos.md). Regras citadas estão em [regras-de-negocio.md](regras-de-negocio.md).

## Resumo

| ID | Requisito | Prioridade | Tela |
|---|---|---|---|
| RF-001 | Cadastro de cidadão | Must | T-01 |
| RF-002 | Consentimento e Termos no cadastro | Must | T-01 |
| RF-003 | Login do cidadão | Must | T-02 |
| RF-004 | Logout | Must | T-08 |
| RF-005 | Visualizar e editar perfil | Should | T-08 |
| RF-006 | Excluir conta | Should | T-08 |
| RF-007 | Registrar denúncia | Must | T-05 |
| RF-008 | Localização por GPS com edição manual | Must | T-05 |
| RF-009 | Anexar fotos | Should | T-05 |
| RF-010 | Pessoas afetadas e necessidade especial | Should | T-05 |
| RF-011 | Limite de uma denúncia em aberto | Must | T-05 |
| RF-012 | Tela de sucesso com protocolo | Must | T-06 |
| RF-013 | Minhas denúncias | Must | T-09 |
| RF-014 | Detalhe da denúncia com histórico | Must | T-07 |
| RF-015 | Cancelar denúncia recebida | Should | T-07 |
| RF-016 | Home com bairro e status da rede | Must | T-03 |
| RF-017 | Alterar endereço de consulta | Could | T-03 |
| RF-018 | Indicadores dos últimos 30 dias (painel da operadora) | Should | P-02 |
| RF-019 | Mapa de ocorrências por bairro | Must | T-04 |
| RF-020 | Lista pública de ocorrências com filtro por status | Must | T-04 |
| RF-021 | Busca por bairro ou folha | Could | T-04 |
| RF-022 | Mapa em tela cheia | Could | T-04 |
| RF-023 | Cálculo do status do bairro | Must | T-03, T-04 |
| RF-024 | Atualização em tempo real no app | Must | T-03, T-04, T-07, T-09 |
| RF-025 | Notificação push na mudança de status | Should | (sistema) |
| RF-026 | Login do operador | Must | P-01 |
| RF-027 | Receber novas denúncias em tempo real com alerta | Must | P-02 |
| RF-028 | Listar denúncias com filtros | Must | P-02 |
| RF-029 | Ver denúncias no mapa | Must | P-02 |
| RF-030 | Detalhe completo da denúncia | Must | P-03 |
| RF-031 | Atualizar status da denúncia | Must | P-03 |
| RF-032 | Justificativa de improcedência | Must | P-03 |
| RF-033 | Informar previsão de reparo | Should | P-03 |
| RF-034 | Agrupar por bairro e resolver em lote | Should | P-02 |
| RF-035 | Destacar denúncias prioritárias | Should | P-02 |
| RF-036 | Registro de histórico de status (auditoria) | Must | P-03, T-07 |

## Autenticação e conta (app)

### RF-001 – Cadastro de cidadão
- **Descrição:** o usuário cria conta informando nome, e-mail, senha, confirmação de senha e telefone (opcional, recomendado). CPF e data de nascimento **não** são coletados (minimização). Regras: RN-001, RN-022.
- **Prioridade:** Must · **Tela:** T-01 (Figma `2033:857`).
- **Critérios de aceitação:**
  - Dado dados válidos, ao tocar em "Cadastrar", a conta `CIDADAO` é criada e o usuário entra no app (Home).
  - E-mail já cadastrado exibe erro "E-mail já cadastrado" sem criar conta.
  - Senha com menos de 8 caracteres ou diferente da confirmação bloqueia o envio com mensagem no campo.
  - Os botões "Entrar" e "Cadastrar" do topo alternam entre T-02 e T-01.

### RF-002 – Consentimento e Termos
- **Descrição:** o cadastro exige aceite explícito dos Termos de Uso e da Política de Privacidade, que informam o **compartilhamento dos dados da denúncia com a Equatorial Pará**. Regra: RN-020.
- **Prioridade:** Must · **Tela:** T-01.
- **Critérios de aceitação:**
  - O botão "Cadastrar" fica desabilitado enquanto o checkbox não estiver marcado.
  - Os links "Termos de Uso" e "Política de Privacidade" abrem o texto correspondente.
  - A data/hora do consentimento e a versão dos termos são gravadas no usuário.

### RF-003 – Login do cidadão
- **Descrição:** login com e-mail e senha, mesmo layout do cadastro. "Esqueci a senha" e login com Google estão **fora do MVP**.
- **Prioridade:** Must · **Tela:** T-02 (a criar).
- **Critérios de aceitação:**
  - Credenciais válidas levam à Home e mantêm a sessão (token no armazenamento seguro).
  - Credenciais inválidas mostram "E-mail ou senha incorretos" sem indicar qual está errado.
  - Uma conta `OPERADOR` não consegue acessar o app do cidadão com a mesma tela (mensagem "Use o painel da operadora").

### RF-004 – Logout
- **Descrição:** botão "Sair" no Perfil encerra a sessão local e remove o token de push do dispositivo.
- **Prioridade:** Must · **Tela:** T-08.
- **Critérios de aceitação:** após sair, o app volta ao login e as telas protegidas não ficam acessíveis.

### RF-005 – Visualizar e editar perfil
- **Descrição:** o Perfil mostra nome, e-mail e telefone, com opção de editar nome e telefone (e-mail somente leitura no MVP, decisão S-22).
- **Prioridade:** Should · **Tela:** T-08.
- **Critérios de aceitação:** alterações válidas são salvas e refletidas na tela; telefone inválido exibe erro.

### RF-006 – Excluir conta
- **Descrição:** o usuário pode excluir a própria conta (direito do titular, LGPD). Regra: RN-024 (decisão S-50).
- **Prioridade:** Should · **Tela:** T-08.
- **Critérios de aceitação:**
  - Há confirmação explícita antes da exclusão, que explica o que é apagado e o que fica.
  - Após excluir, os dados pessoais, as fotos e a resposta de necessidade especial são removidos, as denúncias passam a ser anônimas (uma denúncia em aberto continua aberta) e a sessão é encerrada.
  - O painel mostra "Conta excluída" no lugar do autor.

## Denúncia (app)

### RF-007 – Registrar denúncia
- **Descrição:** o cidadão registra uma denúncia com **tipo obrigatório** ("Sem energia" ou "Oscilação"), logradouro, bairro (obrigatório), ponto de referência (opcional) e descrição (opcional). Regras: RN-002, RN-012, RN-023.
- **Prioridade:** Must · **Tela:** T-05 (Figma `2033:655`).
- **Critérios de aceitação:**
  - Sem tipo, logradouro ou bairro o envio é bloqueado com mensagem nos campos.
  - Com sucesso, a denúncia é criada como `RECEBIDA`, recebe um protocolo e aparece no painel da operadora em até 2 s (RNF-002).
  - Sem internet, o envio falha com mensagem clara e o rascunho é preservado (RNF-008).

### RF-008 – Localização por GPS com edição manual
- **Descrição:** o GPS preenche endereço e coordenadas automaticamente e o usuário pode editar. Com o GPS negado ou indisponível, o envio continua possível digitando logradouro e bairro. Não há validação de raio. Regra: RN-012, RN-025.
- **Prioridade:** Must · **Tela:** T-05.
- **Critérios de aceitação:**
  - Com permissão concedida, o mini-mapa mostra o pino e o selo "GPS Ativo", e os campos são preenchidos.
  - Com permissão negada, o selo indica "GPS desativado", as coordenadas ficam vazias e o bairro é escolhido em uma lista.
  - Editar o endereço mantém as coordenadas originais do GPS, salvo se o usuário mover o pino (decisão S-23).

### RF-009 – Anexar fotos
- **Descrição:** anexo **opcional** de até 3 fotos de até 5 MB cada (enviadas sempre em JPEG), da câmera ou da galeria, com opção de remover. Vídeo não é aceito. Texto de apoio: "Se puder, anexe fotos". O app reduz a imagem e remove os metadados (EXIF) antes de enviar; a API remove de novo (decisão S-49). Regra: RN-013.
- **Prioridade:** Should · **Tela:** T-05.
- **Critérios de aceitação:**
  - Foto acima de 5 MB ou o 4º anexo é recusado com mensagem.
  - O contador "N anexos" acompanha a lista.
  - As fotos só são visíveis ao autor e à operadora (RN-014).
  - O arquivo gravado não tem metadados de localização.

### RF-010 – Pessoas afetadas e necessidade especial
- **Descrição:** no passo 3 do Denunciar, o usuário informa, se quiser, a faixa de pessoas no local (1 a 3, 4 a 8, 9 a 20, Rua toda) e responde **Sim ou Não**: "Alguém no local depende de aparelho elétrico, como respirador ou geladeira de remédios, ou tem necessidade especial?". Não há campo de texto livre (decisões S-46 e S-48). Regras: RN-015, RN-026.
- **Prioridade:** Should · **Tela:** T-05.
- **Critérios de aceitação:**
  - Ao marcar "Sim", aparece um consentimento específico e destacado, separado dos Termos; com ele marcado, a denúncia é prioritária.
  - Sem o consentimento, o "Sim" não é enviado e o resumo avisa isso.
  - A resposta é apagada quando a denúncia termina (RN-026).

### RF-011 – Limite de uma denúncia em aberto
- **Descrição:** o cidadão só pode ter **uma** denúncia `RECEBIDA` ou `EM_ATENDIMENTO` por vez. Regra: RN-006.
- **Prioridade:** Must · **Tela:** T-05.
- **Critérios de aceitação:** com denúncia em aberto, o envio de outra é recusado (HTTP 409) e o app oferece "Ver minha denúncia em aberto".

### RF-012 – Tela de sucesso com protocolo
- **Descrição:** após o envio, mostra o protocolo, a mensagem "Sua denúncia foi enviada à Equatorial Pará" e os botões "Acompanhar denúncia" (vai a T-07) e "Voltar ao início" (vai a T-03).
- **Prioridade:** Must · **Tela:** T-06 (a criar).
- **Critérios de aceitação:** o protocolo exibido é o mesmo retornado pela API e consultável em "Minhas denúncias".

### RF-013 – Minhas denúncias
- **Descrição:** lista, dentro do Perfil, das denúncias do usuário com status atualizado em tempo real.
- **Prioridade:** Must · **Tela:** T-09 (a criar).
- **Critérios de aceitação:** itens ordenados da mais recente para a mais antiga; ao mudar o status no painel, o item atualiza sem recarregar; estado vazio "Você ainda não fez denúncias".

### RF-014 – Detalhe da denúncia com histórico
- **Descrição:** mostra tipo, endereço/bairro, descrição, fotos (só ao autor), status atual, previsão de reparo (se houver), justificativa (se improcedente) e histórico de status com data e hora.
- **Prioridade:** Must · **Tela:** T-07 (a criar).
- **Critérios de aceitação:** cada mudança feita pela operadora aparece no histórico em até 2 s com a tela aberta; um cidadão não abre denúncia de outro (403/404).

### RF-015 – Cancelar denúncia recebida
- **Descrição:** o autor pode cancelar uma denúncia que ainda esteja `RECEBIDA`. Regra: RN-005.
- **Prioridade:** Should · **Tela:** T-07 (decisão S-55).
- **Critérios de aceitação:** o botão "Cancelar denúncia" só aparece em `RECEBIDA`; após confirmar, o status vira `CANCELADA`, o painel é notificado e o limite de RN-006 é liberado.

## Home e ocorrências (app)

### RF-016 – Home com bairro e status da rede
- **Descrição:** saudação "Olá, {nome}!", selo "Rede Estável" ou "Instável" do bairro atual (GPS), endereço aproximado, banner "Faltou energia? Denuncie agora" e acesso ao Perfil. Regras: RN-008, RN-025.
- **Prioridade:** Must · **Tela:** T-03 (Figma `2033:161`).
- **Critérios de aceitação:** o selo reflete o status do bairro e muda em tempo real; o botão do banner abre T-05; sem GPS, usa-se o último bairro conhecido ou pede-se a escolha.

### RF-017 – Alterar endereço de consulta
- **Descrição:** o botão "Alterar endereço" permite informar outro bairro/endereço **apenas para consulta**; não é salvo no cadastro.
- **Prioridade:** Could · **Tela:** T-03.
- **Critérios de aceitação:** ao escolher outro bairro, a Home mostra o status dele com aviso "Consultando: {bairro}" e opção "Voltar à minha localização".

### RF-018 – Painel comunitário (30 dias)
- **Descrição:** quatro indicadores calculados do banco: usuários cadastrados, denúncias registradas, em atendimento e resolvidas (com taxa de resolução). Exibidos **só no painel da operadora**; o app não mostra indicadores (decisão S-52). Regra: RN-017.
- **Prioridade:** Should · **Tela:** P-02.
- **Critérios de aceitação:** os valores batem com a contagem do banco no período; os selos "+12%" e "Em rota" do protótipo não são exibidos (não há dados para eles).

### RF-019 – Mapa de ocorrências por bairro
- **Descrição:** a aba Ocorrências mostra o mapa de Marabá com círculos por bairro (cor = status) e pinos das denúncias em aberto, com legenda "Sem energia / Oscilação / Restabelecido". O card de localização mostra o status, a contagem de denúncias em aberto do bairro e a previsão de reparo. Regras: RN-007, RN-009, S-04, S-16.
- **Prioridade:** Must · **Tela:** T-04 (Figma `2033:403`).
- **Critérios de aceitação:** as cores seguem RN-007; o botão "centralizar na minha localização" move o mapa; o mapa atualiza em tempo real.

### RF-020 – Lista pública de ocorrências
- **Descrição:** "Lista dos lugares" com as ocorrências públicas (tipo, bairro, rua, descrição, status e horário relativo, **sem** nome, telefone ou fotos), com chips de filtro por status e contagem. Regra: RN-014.
- **Prioridade:** Must · **Tela:** T-04.
- **Critérios de aceitação:** chips "Todos (n)", "Sem luz (n)", "Oscilação (n)" e "Restabelecidos (n)" filtram a lista; a soma dos chips bate com "Todos"; item sem dado pessoal.

### RF-021 – Busca por bairro ou folha
- **Descrição:** campo de busca textual por nome de bairro ou folha (ex.: "Folha 28"). O CEP do protótipo foi retirado (S-15).
- **Prioridade:** Could · **Tela:** T-04.
- **Critérios de aceitação:** a lista filtra por correspondência parcial e ignora acentos e maiúsculas.

### RF-022 – Mapa em tela cheia
- **Descrição:** o botão "expandir" abre o mesmo mapa em tela cheia; não é uma tela nova. "Ver mapa ampliado" da Home leva à aba Ocorrências.
- **Prioridade:** Could · **Tela:** T-04, T-03.
- **Critérios de aceitação:** é possível fechar e voltar ao estado anterior sem perder filtros.

### RF-023 – Cálculo do status do bairro
- **Descrição:** o servidor calcula o status do bairro a partir das denúncias em aberto. Regra: RN-007.
- **Prioridade:** Must · **Tela:** T-03, T-04.
- **Critérios de aceitação:** testes unitários cobrem os três resultados (Sem luz, Oscilação, Normal) e a precedência de "Sem energia".

## Tempo real e notificações

### RF-024 – Atualização em tempo real no app
- **Descrição:** o app assina eventos WebSocket e atualiza Home, Ocorrências, Detalhe e Minhas denúncias sem recarregar.
- **Prioridade:** Must · **Tela:** T-03, T-04, T-07, T-09.
- **Critérios de aceitação:** a mudança de status feita no painel aparece no app em até 2 s (RNF-002); após queda de conexão, o app reconecta e refaz a consulta (RNF-009).

### RF-025 – Notificação push na mudança de status
- **Descrição:** o autor recebe push (Expo Notifications) quando o operador altera o status da denúncia. Regra: RN-019.
- **Prioridade:** Should · **Tela:** sistema.
- **Critérios de aceitação:** com o token registrado, o push chega com título e texto ("Sua denúncia TL-… está Em atendimento"); tocar na notificação abre T-07; sem permissão, nada quebra.

## Painel web da operadora

### RF-026 – Login do operador
- **Descrição:** login por e-mail e senha de contas `OPERADOR` criadas por seed. Não há cadastro público. Regra: RN-001.
- **Prioridade:** Must · **Tela:** P-01 (a criar).
- **Critérios de aceitação:** conta `CIDADAO` é recusada no painel; o acesso a rotas `/painel/*` da API sem papel `OPERADOR` retorna 403.

### RF-027 – Receber novas denúncias em tempo real
- **Descrição:** o painel recebe `denuncia:criada` por WebSocket e mostra **alerta visual e sonoro**, sem recarregar a página. Regra: S-19.
- **Prioridade:** Must · **Tela:** P-02.
- **Critérios de aceitação:** a nova denúncia entra no topo da lista com destaque temporário e toca o som (se ativado) em até 2 s.

### RF-028 – Listar denúncias com filtros
- **Descrição:** lista paginada com filtros por **status**, **tipo** e **bairro**.
- **Prioridade:** Must · **Tela:** P-02.
- **Critérios de aceitação:** combinações de filtros retornam o conjunto esperado; filtros persistem ao receber novas denúncias.

### RF-029 – Ver denúncias no mapa
- **Descrição:** mapa (Leaflet) com pinos das denúncias conforme os filtros ativos; clicar no pino abre o resumo e o detalhe.
- **Prioridade:** Must · **Tela:** P-02.
- **Critérios de aceitação:** denúncias sem coordenadas não aparecem no mapa, mas aparecem na lista; cores por status e tipo.

### RF-030 – Detalhe completo da denúncia
- **Descrição:** o operador vê tudo: nome e telefone do autor, endereço, coordenadas, descrição, fotos, pessoas afetadas, necessidade especial, status, previsão e histórico. Regra: RN-014.
- **Prioridade:** Must · **Tela:** P-03.
- **Critérios de aceitação:** todos os campos coletados são exibidos; as fotos carregam por rota autenticada.

### RF-031 – Atualizar status da denúncia
- **Descrição:** o operador muda o status seguindo as transições permitidas (Recebida → Em atendimento → Resolvida, ou Improcedente). Regra: RN-004.
- **Prioridade:** Must · **Tela:** P-03.
- **Critérios de aceitação:** só as transições válidas ficam disponíveis; uma transição inválida via API retorna 422; a mudança chega ao app do autor em até 2 s e dispara push (RF-025).

### RF-032 – Justificativa de improcedência
- **Descrição:** marcar como `IMPROCEDENTE` exige justificativa em texto, mostrada ao cidadão. Regra: RN-010.
- **Prioridade:** Must · **Tela:** P-03.
- **Critérios de aceitação:** sem justificativa, a API retorna 422 e o formulário bloqueia o envio.

### RF-033 – Informar previsão de reparo
- **Descrição:** campo opcional com data/hora prevista, que o operador pode definir, trocar ou remover a qualquer momento enquanto a denúncia estiver em aberto; cada mudança vai para o histórico (decisão S-60). Regras: RN-009, RN-011.
- **Prioridade:** Should · **Tela:** P-03.
- **Critérios de aceitação:** a previsão aparece em T-07 e no card de bairro (T-04) em tempo real; datas passadas são recusadas.

### RF-034 – Agrupar por bairro e resolver em lote
- **Descrição:** visão agrupada por bairro (contagem por tipo e status) e ação "Resolver todas as denúncias do bairro". Regra: RN-016.
- **Prioridade:** Should · **Tela:** P-02.
- **Critérios de aceitação:** a ação afeta apenas denúncias em aberto do bairro, exige confirmação e gera histórico para cada denúncia (RF-036).

### RF-035 – Destacar denúncias prioritárias
- **Descrição:** denúncias com necessidade especial = Sim aparecem com destaque visual e no topo da lista. Regra: RN-015.
- **Prioridade:** Should · **Tela:** P-02.
- **Critérios de aceitação:** a ordenação padrão coloca prioritárias antes das demais; dentro de cada grupo, da mais antiga para a mais recente.

### RF-036 – Registro de histórico de status (auditoria)
- **Descrição:** toda mudança de status grava quem mudou, de qual para qual, quando e a justificativa. Regra: RN-011.
- **Prioridade:** Must · **Tela:** P-03, T-07.
- **Critérios de aceitação:** a criação da denúncia gera a 1ª entrada; o histórico é imutável e consultável pelo autor (versão simplificada) e pelo operador.
