# 11 – Segurança e LGPD

> Este documento é uma análise técnica de **projeto acadêmico**, não parecer jurídico. Os textos finais de Termos de Uso e Política de Privacidade dependem de revisão (PEN-03).

## 1. Papéis na LGPD

| Papel | Quem |
|---|---|
| **Controlador** | A equipe do projeto Tá Ligado? (projeto acadêmico da disciplina de Desenvolvimento Mobile, UNIFESSPA). Nome/contato a preencher (PEN-01, PEN-03) |
| **Operador de dados (suboperador)** | Serviços usados: Expo Push Service (token de push) e provedor de hospedagem, se houver |
| **Destinatário dos dados** | **Equatorial Pará**, que recebe a denúncia completa (simulada no MVP via Painel Web, mas tratada **como real** nos Termos) |
| **Titulares** | Cidadãos cadastrados |

## 2. Dados pessoais coletados

Princípio da **minimização**: **CPF e data de nascimento não são coletados.**

| Dado | Origem | Finalidade | Base legal | Quem acessa |
|---|---|---|---|---|
| Nome | Cadastro | Identificar o autor para a operadora e personalizar o app | Consentimento (art. 7º, I) | Autor; Operador |
| E-mail | Cadastro | Login e contato | Consentimento; execução do serviço solicitado | Autor; Operador (S-30) |
| Senha | Cadastro | Autenticação | Consentimento; segurança | Ninguém (guardada só como hash) |
| Telefone (opcional) | Cadastro | Permitir que a operadora entre em contato | Consentimento | Autor; Operador |
| **Geolocalização** (GPS) | Registro da denúncia | Localizar a ocorrência e sugerir endereço | Consentimento (permissão do sistema + aceite) | Autor; Operador (exata). Outros cidadãos veem só posição aproximada (3 casas decimais) |
| Endereço da ocorrência (logradouro, bairro, CEP, ponto de referência) | Denúncia | Localizar o problema | Consentimento; execução do serviço solicitado | Autor; Operador; público (só logradouro/bairro) |
| Descrição, fotos, pessoas no local | Denúncia | Avaliar e priorizar o atendimento | Consentimento | Autor; Operador (fotos nunca ao público) |
| Necessidade especial, **só Sim/Não** (**dado de saúde = sensível**, art. 11) | Denúncia | Priorizar atendimento a pessoas dependentes de energia | **Consentimento específico e destacado** (art. 11, I), separado dos Termos e registrado com data | Autor; Operador (apagada ao fim da denúncia, RN-026) |
| Token de push | Dispositivo | Notificar mudança de status | Consentimento (permissão do sistema) | Servidor |
| Histórico de status e logs de acesso | Sistema | Auditoria e segurança | Legítimo interesse (art. 7º, IX) e obrigação de transparência | Operador; equipe técnica |

**Pontos de atenção**
- A **geolocalização é coletada só ao registrar a denúncia ou consultar o bairro**, com a permissão do sistema "ao usar o app". Não há rastreamento em segundo plano.
- O campo "necessidade especial" pode revelar dado de **saúde**. Por minimização, é **só Sim/Não, sem texto livre** (decisão S-46). Com "Sim", o passo 3 do Denunciar mostra um **consentimento específico e destacado**, separado dos Termos; sem o aceite, a resposta não é enviada. A resposta não fica no rascunho do aparelho (S-56), nunca aparece na visão pública nem em logs, e é **apagada quando a denúncia termina** (RN-026).
- As **fotos** podem conter a localização exata da casa nos metadados (EXIF). O app reduz a imagem e remove o EXIF antes de enviar, e a API remove de novo; o tipo é validado pelo conteúdo, o nome do arquivo é aleatório e a foto só é servida por rota autenticada ao autor e ao operador (S-49, RNF-015).
- A **localização do autor** pode identificar onde mora. Por isso o público vê só bairro e rua, com coordenadas arredondadas (RN-014).

## 3. Consentimento

- Aceite explícito dos **Termos de Uso** e da **Política de Privacidade** no cadastro (RF-002, RN-020), com `consentimentoEm` e `versaoTermos` guardados.
- Os textos informam, em linguagem simples: quais dados, para quê, o **compartilhamento com a Equatorial Pará** (nome, telefone, endereço, coordenadas, fotos, pessoas no local e necessidade especial), a visibilidade pública anonimizada, a retenção e como exercer os direitos.
- Consentimentos **específicos**: permissão de localização, câmera/galeria e notificações são pedidas pelo sistema operacional **no momento do uso** (e não no primeiro acesso).
- O consentimento pode ser **revogado**: excluir a conta (RF-006) e desativar permissões no sistema.
- Alteração relevante dos termos ⇒ nova versão e novo aceite.

## 4. Retenção e anonimização (decisão S-14)

| Dado | Retenção | Ao fim |
|---|---|---|
| Conta e dados pessoais | Enquanto a conta existir | Remoção ao excluir a conta (RN-024) |
| Denúncias | Mantidas por prazo indeterminado, para estatística e histórico | **Anonimizadas** (sem vínculo com o autor) quando a conta é excluída; uma denúncia em aberto continua aberta, e o painel mostra "Conta excluída" (S-50) |
| Fotos | Enquanto a denúncia existir | Apagadas (arquivos e registros) na exclusão da conta |
| Necessidade especial e consentimento | Enquanto a denúncia estiver em aberto | **Apagados** quando a denúncia fica Resolvida, Improcedente ou Cancelada (RN-026, S-47) e na exclusão da conta |
| Tokens de push | Até o logout ou a exclusão da conta | Removidos |
| Logs de acesso | 6 meses | Descarte automático |
| Histórico de status | Com a denúncia | Nome do autor da alteração removido na anonimização (`alteradoPorId` = nulo) |

Para ambiente de demonstração, os dados são fictícios e podem ser apagados ao fim da disciplina.

## 5. Direitos do titular (art. 18) e como atender

| Direito | Como o app atende |
|---|---|
| Confirmação e acesso | Tela Perfil mostra os dados; "Minhas denúncias" lista o que foi enviado |
| Correção | Edição de nome e telefone no Perfil (RF-005) |
| Eliminação | "Excluir conta" (RF-006, RN-024) |
| Portabilidade | Fora do MVP; sob solicitação, exportação em JSON feita pela equipe (S-31) |
| Informação sobre compartilhamento | Termos e Política descrevem o compartilhamento com a Equatorial Pará |
| Revogação do consentimento | Exclusão da conta e permissões do sistema |
| Contato com o controlador | Canal de contato na Política (PEN-03) |

## 6. Autenticação e autorização

- E-mail e senha; hash **bcrypt**; senha com no mínimo 8 caracteres (RN-022, RNF-011).
- **JWT** com validade curta no painel (8 h) e 7 dias no app ([ADR-0004](adr/0004-autenticacao-jwt-com-rbac.md)); token do app no **SecureStore**.
- **RBAC** com papéis `CIDADAO` e `OPERADOR`; rotas `/painel/*` só para `OPERADOR`; o cidadão acessa apenas os próprios recursos (RN-014).
- Contas de operador **só por seed**; nenhuma rota pública cria operador.
- **HTTPS/WSS** em produção; `helmet` e CORS restrito às origens do painel; segredos só em variáveis de ambiente (RNF-013, RNF-023).
- **Fotos** com nome aleatório, servidas apenas por rota autenticada ao autor e ao operador (RNF-015); tipos e tamanhos validados no servidor.
- **Auditoria:** cada mudança de status registra quem, o quê e quando (RN-011). O operador não consegue apagar histórico.
- **Mensagens de erro genéricas** no login; *rate limit* (S-18).

## 7. Proteção contra denúncias falsas, duplicadas e spam

| Ameaça | Medida | Origem |
|---|---|---|
| Spam e abuso | Conta obrigatória; **1 denúncia em aberto por cidadão** | RN-006 |
| Automação | *Rate limit* por IP e por usuário; limite de tentativas de login | S-18 |
| Denúncia falsa | Aviso de responsabilidade; autor identificável pelo operador; justificativa de `IMPROCEDENTE` registrada; histórico auditável | RN-010, RN-011 |
| Denúncias repetidas do mesmo problema | Agrupamento por bairro no painel e resolução em lote | RN-016, RN-018 |
| Fotos inadequadas | Só JPEG/PNG, 3 por denúncia, 5 MB; visíveis só ao autor e à operadora | RN-013, RN-014 |
| Contas fictícias | E-mail único; reputação e verificação de e-mail ficam no backlog | — |
| Vazamento de identidade | Projeção pública sem autor; coordenadas arredondadas | RN-014 |

Reincidência de denúncias improcedentes: **bloqueio de conta** é item de backlog (não no MVP).

## 8. Riscos e mitigações (resumo)

| Risco | Impacto | Mitigação |
|---|---|---|
| Exposição de localização/endereço da residência | Alto | Visibilidade restrita, arredondamento, consentimento claro |
| Vazamento do banco | Alto | Hash de senha, mínimo de dados, acesso restrito ao banco, backups protegidos |
| Token roubado | Médio | Validade curta no painel, SecureStore, HTTPS |
| Foto com dados de terceiros | Médio | Aviso na tela de envio; fotos nunca públicas |
| Dados de saúde (necessidade especial) | Alto | Consentimento específico, acesso restrito, uso apenas para priorização |
| "Enviada à Equatorial" mas é simulação | Médio (transparência) | Termos e apresentação deixam claro o caráter acadêmico da integração ([ADR-0001](adr/0001-integracao-simulada-com-operadora.md)) |

## 9. Itens para o texto dos Termos e da Política (checklist)

- [ ] Identificação do controlador e canal de contato (PEN-01, PEN-03).
- [ ] Dados coletados e finalidade, incluindo localização e dado de saúde.
- [ ] Compartilhamento com a Equatorial Pará.
- [ ] O que os outros cidadãos veem.
- [ ] Prazos de retenção e anonimização.
- [ ] Direitos do titular e como exercer.
- [ ] Natureza acadêmica do projeto e simulação da integração.
- [ ] Responsabilidade do usuário por informações verdadeiras.
