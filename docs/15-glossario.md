# 15 – Glossário

| Termo | Definição |
|---|---|
| **Tá Ligado?** | Nome do produto. Aplicativo para registrar e acompanhar denúncias de queda de energia em Marabá-PA |
| **Cidadão** | Morador que usa o app (papel `CIDADAO`) |
| **Operador** | Funcionário (simulado) da Equatorial Pará que usa o Painel Web (papel `OPERADOR`) |
| **Equatorial Pará** | Concessionária de distribuição de energia elétrica do Pará; destinatária das denúncias. No MVP é **simulada** pelo Painel Web |
| **Painel Web da Operadora** | Aplicação web (`apps/painel`) onde o operador recebe e atualiza denúncias; simula a integração com a Equatorial ([ADR-0001](adr/0001-integracao-simulada-com-operadora.md)) |
| **Denúncia** | Registro de uma queda ou oscilação de energia feito por um cidadão, com localização, horário e detalhes |
| **Ocorrência** | Termo usado na interface pública (aba "Ocorrências"): denúncia vista de forma anonimizada |
| **Protocolo** | Identificador legível da denúncia, no formato `TL-AAAA-NNNNNN` (RN-023) |
| **Tipo** | Classificação da denúncia: **Sem energia** (`SEM_ENERGIA`) ou **Oscilação** (`OSCILACAO`) |
| **Sem energia** | Interrupção total do fornecimento no local |
| **Oscilação** | Variação ou instabilidade da energia (queda brusca, picos, falta de fase) sem interrupção total |
| **Status da denúncia** | `RECEBIDA`, `EM_ATENDIMENTO`, `RESOLVIDA`, `IMPROCEDENTE`, `CANCELADA` (RN-003) |
| **Em aberto** | Denúncia `RECEBIDA` ou `EM_ATENDIMENTO` |
| **Improcedente** | Denúncia que o operador considerou sem fundamento, com justificativa obrigatória (RN-010) |
| **Cancelada** | Denúncia cancelada pelo próprio autor enquanto estava `RECEBIDA` (RN-005) |
| **Status do bairro** | Situação calculada do bairro: **Sem luz**, **Oscilação** ou **Normal/Restabelecido** (RN-007) |
| **Rede Estável / Instável** | Selo da Home: estável = bairro Normal; instável = Sem luz ou Oscilação (RN-008) |
| **Previsão de reparo** | Data/hora estimada de restabelecimento, informada pelo operador (RN-009) |
| **Prioritária** | Denúncia com necessidade especial = Sim (RN-015) |
| **Necessidade especial** | Presença de pessoa que depende de energia (idoso, recém-nascido, acamado, aparelho hospitalar) |
| **Resolução em lote** | Ação do painel que resolve todas as denúncias em aberto de um bairro (RN-016) |
| **Bairro** | Região fixa da lista (seed) de Marabá-PA, com centro georreferenciado |
| **Folha** | Subdivisão urbana típica da **Nova Marabá** (ex.: "Folha 28", "Folha 32"), usada como parte do endereço |
| **Quadra / Lote** | Subdivisões do endereço dentro de uma folha (ex.: "Q. 2, Lote 14") |
| **Marabá** | Município do sudeste do Pará, com núcleos urbanos: Velha Marabá, Nova Marabá, Cidade Nova, São Félix e Morada Nova |
| **Velha Marabá (Orla)** | Núcleo histórico, na confluência dos rios Tocantins e Itacaiúnas |
| **VP (Via Perimetral)** | Vias principais da Nova Marabá, citadas em endereços como "Av. VP-3" |
| **Painel comunitário** | Indicadores dos últimos 30 dias exibidos na Home (RN-017) |
| **GPS / Geolocalização** | Coordenadas do dispositivo, obtidas com permissão do usuário; dado pessoal (LGPD) |
| **Tempo real** | Atualização de telas e eventos em ≤ 2 s sem recarregar, via WebSocket (RNF-002) |
| **WebSocket / Socket.IO** | Canal bidirecional persistente entre cliente e servidor; Socket.IO é a biblioteca adotada ([ADR-0002](adr/0002-socketio-para-tempo-real.md)) |
| **Sala (room)** | Grupo de conexões no Socket.IO que recebe os mesmos eventos (`papel:OPERADOR`, `cidadaos`, `usuario:{id}`) |
| **Push (notificação)** | Aviso enviado ao celular mesmo com o app fechado, via Expo Notifications |
| **JWT** | *JSON Web Token*: token assinado que identifica o usuário e seu papel ([ADR-0004](adr/0004-autenticacao-jwt-com-rbac.md)) |
| **RBAC** | *Role-Based Access Control*: controle de acesso por papel |
| **Seed** | Dados iniciais carregados no banco (bairros, operadores) |
| **MoSCoW** | Priorização em Must, Should, Could e Won't |
| **MVP** | *Minimum Viable Product*: versão mínima funcional entregue na disciplina |
| **LGPD** | Lei Geral de Proteção de Dados (Lei 13.709/2018) |
| **Controlador** | Quem decide como os dados pessoais são tratados (a equipe do projeto) |
| **Titular** | Pessoa a quem os dados se referem (o cidadão) |
| **Anonimização** | Remoção do vínculo entre o dado e a pessoa (RN-024) |
| **Minimização** | Princípio de coletar apenas o necessário (por isso não há CPF nem data de nascimento) |
| **WCAG 2.2 AA** | Diretrizes de acessibilidade na versão 2.2, nível AA |
| **ADR** | *Architecture Decision Record*: registro de decisão de arquitetura |
| **ACGM** | Sigla do rodapé do protótipo, **a definir** (PEN-01) |
| **Expo / EAS** | Plataforma e serviço de build para React Native; *development build* é um app de desenvolvimento com módulos nativos (necessário para push remoto) |
