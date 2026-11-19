# Requisitos não funcionais

Organizados pelas características da **ISO/IEC 25010**. As métricas valem para o ambiente de demonstração (API e banco na mesma rede/máquina, até ~50 usuários simultâneos) e são **metas** a verificar nos testes ([13](../13-estrategia-de-testes.md)).

| ID | Categoria | Requisito | Métrica / critério |
|---|---|---|---|
| RNF-001 | Desempenho | Tempo de resposta da API | Leituras: p95 ≤ 500 ms. Escritas (inclui `POST /denuncias` sem fotos): p95 ≤ 1 s. |
| RNF-002 | Desempenho | Propagação em tempo real | Evento WebSocket (`denuncia:criada`, `denuncia:status-atualizado`) entregue ao destinatário conectado em ≤ 2 s após o commit. |
| RNF-003 | Desempenho | Abertura do app | Primeira tela útil (Home com dados em cache) em ≤ 3 s; sem cache, em ≤ 5 s em 4G. |
| RNF-004 | Usabilidade | Rapidez do registro | Com GPS ativo, registrar uma denúncia (tipo + envio) em ≤ 90 s; campos obrigatórios limitados ao mínimo (tipo, logradouro, bairro). |
| RNF-005 | Usabilidade | Mensagens claras | Todas as mensagens ao usuário em pt-BR, sem códigos técnicos, indicando o que fazer. |
| RNF-006 | Usabilidade | Estados de tela | Toda tela que busca dados trata carregando, vazio e erro (com "Tentar novamente"). |
| RNF-007 | Confiabilidade | Leitura offline | Sem internet, o app mostra a última Home, lista de ocorrências e "Minhas denúncias" em cache, com aviso "Sem conexão" e data da última atualização. |
| RNF-008 | Confiabilidade | Rascunho de denúncia | O formulário é salvo localmente ao digitar; ao falhar o envio por falta de rede, nada é perdido e o usuário pode reenviar. Não há fila automática de envio no MVP (ver [ADR-0005](../adr/0005-estrategia-offline-simples.md)). |
| RNF-009 | Confiabilidade | Reconexão em tempo real | Após queda de conexão, o cliente WebSocket reconecta automaticamente em ≤ 30 s e refaz as consultas para recuperar eventos perdidos. |
| RNF-010 | Confiabilidade | Consistência | Mudança de status e registro de histórico ocorrem na **mesma transação**; nunca há status alterado sem histórico. |
| RNF-011 | Segurança | Senhas | Armazenadas com hash `bcrypt` (custo ≥ 10); nunca em log ou resposta. |
| RNF-012 | Segurança | Autenticação e autorização | JWT em toda rota privada; RBAC (`CIDADAO`, `OPERADOR`) validado no servidor; um cidadão só acessa os próprios dados. |
| RNF-013 | Segurança | Transporte e armazenamento do token | HTTPS/TLS e WSS em produção; no app o token fica em `expo-secure-store`. |
| RNF-014 | Segurança | Validação e abuso | Entradas validadas no servidor (schemas); rate limit conforme S-18; uploads limitados a tipo e tamanho (RN-013). |
| RNF-015 | Segurança | Acesso às fotos | Fotos servidas apenas por rota autenticada ao autor e ao operador; nomes de arquivo aleatórios (não previsíveis). |
| RNF-016 | Compatibilidade | Versões mínimas do app | Android 8.0 (API 26) e iOS 15.1 (decisão S-10); confirmar contra o Expo SDK adotado. |
| RNF-017 | Compatibilidade | Navegadores do painel | Últimas 2 versões estáveis de Chrome, Edge e Firefox, a partir de 1024 px de largura. |
| RNF-018 | Compatibilidade | Telas do app | Layout correto de 360 a 430 dp de largura (base do protótipo: 390), em retrato; fontes dinâmicas até 200%. |
| RNF-019 | Manutenibilidade | Qualidade de código | TypeScript em modo `strict`, ESLint e Prettier sem erros; CI executa lint e testes a cada PR. |
| RNF-020 | Manutenibilidade | Testabilidade | Regras de negócio isoladas em módulo de domínio puro, com cobertura ≥ 90% de linhas; demais módulos da API ≥ 70%. |
| RNF-021 | Manutenibilidade | Banco versionado | Esquema por *migrations* do Prisma e dados iniciais (bairros, operadores) por *seed* reproduzível. |
| RNF-022 | Portabilidade | Ambiente reproduzível | Banco via Docker Compose; API e painel rodam com `npm install` e variáveis de ambiente; app abre em Android e iOS pelo Expo. |
| RNF-023 | Portabilidade | Configuração | Nenhum segredo ou URL fixa no código; tudo por `.env` (com `.env.example` versionado). |
| RNF-024 | Usabilidade (acessibilidade) | WCAG 2.2 AA | Metas detalhadas em [12](../12-acessibilidade.md): contraste, alvos de toque, leitores de tela e fontes dinâmicas. |
| RNF-025 | Segurança (privacidade) | Conformidade com a LGPD | Minimização, consentimento, direitos do titular e compartilhamento informado, conforme [11](../11-seguranca-e-lgpd.md). |

## Notas

- **Offline:** o MVP é *offline-tolerante*, não *offline-first*. Leitura vem do cache; **envio exige internet** (RNF-007, RNF-008).
- **Internet instável:** requisições com *timeout* de 15 s, até 2 novas tentativas automáticas em leituras (não em `POST` de denúncia, para evitar duplicidade) e indicador de rede via `NetInfo`.
- **Capacidade:** metas de desempenho não pressupõem escala real; dimensionamento de produção é trabalho futuro.
