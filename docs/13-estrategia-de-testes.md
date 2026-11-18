# 13 – Estratégia de testes

Foco do MVP: **testes unitários das regras de negócio**, com integração da API nos fluxos principais e E2E apenas nos caminhos críticos. A pirâmide é proporcional a um projeto acadêmico (RNF-019, RNF-020).

```
        E2E (poucos, Could)
      Integração (API + banco)
   Unitários (regras de negócio, muitos)
```

## 1. Unitários (prioridade máxima)

Regras puras em `apps/api/src/domain/`, sem banco nem HTTP, com **Vitest**. Meta: **≥ 90% de cobertura de linhas** nesse módulo.

| Módulo | O que cobrir | Regras |
|---|---|---|
| `status-bairro` | Nenhuma em aberto ⇒ Normal; só Oscilação ⇒ Oscilação; qualquer Sem energia ⇒ Sem luz (precedência); ignora `RESOLVIDA`, `IMPROCEDENTE`, `CANCELADA`; denúncias de outros bairros não afetam | RN-007, RF-023 |
| `limite-denuncia` | 0 em aberto ⇒ permite; `RECEBIDA` ou `EM_ATENDIMENTO` ⇒ bloqueia; após cancelar/resolver ⇒ permite novamente | RN-006, RF-011 |
| `transicoes` | Todas as transições válidas da tabela; **todas** as inválidas (ex.: `RESOLVIDA → EM_ATENDIMENTO`, `RECEBIDA → RESOLVIDA` fora do lote); `IMPROCEDENTE` sem justificativa; cancelamento só pelo autor e só em `RECEBIDA`; exceção do lote | RN-004, RN-005, RN-010, RN-016 |
| `permissoes` | `CIDADAO` não acessa `/painel/*`; cidadão só lê a própria denúncia; operador lê qualquer uma; visibilidade dos campos por papel (projeção pública sem dados pessoais) | RN-001, RN-014 |
| `previsao` | Data futura aceita; passada recusada; menor previsão futura do bairro | RN-009 |
| `protocolo` | Formato `TL-AAAA-NNNNNN`, sequência e unicidade por ano | RN-023 |
| `prioridade` | Ordenação: prioritárias primeiro, depois da mais antiga à mais recente | RN-015 |
| `bairro-proximo` | Centro mais próximo (Haversine); fora de 15 km ⇒ nenhum | RN-025 |
| `validacoes` | Schemas Zod de cadastro (senha ≥ 8, e-mail, telefone), denúncia (tipo, bairro, logradouro, descrição ≤ 500, fotos) | RN-022, RN-012, RN-013 |
| `indicadores` | Contagens e taxa em 30 dias (limite de 100%) | RN-017 |

No **app** (Jest + React Native Testing Library): validações de formulário (schemas Zod), formatação de status/horário ("Há 25 min"), regras de exibição (botão "Cancelar" só em `RECEBIDA`; campo de necessidade especial condicional), *reducers*/hooks de sessão e rascunho.

No **painel** (Vitest + Testing Library): ações disponíveis por status, ordenação, filtros, exigência de justificativa.

## 2. Integração (API + PostgreSQL de teste)

**Supertest** contra o app Express com banco real (serviço PostgreSQL no CI ou Testcontainers/Docker Compose local), migrations aplicadas e banco limpo por teste.

| Fluxo | Verificações |
|---|---|
| Cadastro e login | 201/200, e-mail duplicado ⇒ 409, senha inválida ⇒ 400, operador não se cadastra, resposta sem `senhaHash` |
| Registrar denúncia | 201 + protocolo; histórico inicial gravado; 409 com outra em aberto; foto > 5 MB ⇒ 413; 4ª foto ⇒ 422 |
| Minhas e detalhe | Só as próprias; 403/404 de outra conta; histórico completo |
| Cancelar | `RECEBIDA` ⇒ 200; `EM_ATENDIMENTO` ⇒ 422; libera o limite |
| Ocorrências públicas | Sem campos pessoais; totais por chip; status do bairro |
| Painel | 403 para cidadão; filtros; atualização de status válida e inválida; justificativa; previsão passada; lote por bairro |
| Transação | Falha ao gravar o histórico desfaz a mudança de status (RNF-010) |
| Índice parcial | Duas criações concorrentes do mesmo autor ⇒ apenas uma conclui (RN-006) |

**Tempo real** (Vitest + `socket.io-client` em memória): operador conectado recebe `denuncia:criada`; autor recebe `denuncia:status-atualizado`; outro cidadão **não** recebe eventos privados; conexão sem token válido é recusada; sala por papel respeitada.

## 3. End-to-end (poucos, caminho crítico)

| Fluxo | Ferramenta | Prioridade |
|---|---|---|
| Painel: login ⇒ receber denúncia nova em tempo real ⇒ iniciar atendimento ⇒ resolver | **Playwright** | Could |
| App: cadastro ⇒ denunciar ⇒ ver sucesso ⇒ detalhe | **Maestro** (YAML) em emulador | Could |
| Demonstração completa (roteiro manual com app e painel lado a lado) | Roteiro | **Must** (apresentação) |

Se faltar tempo, os E2E automatizados cedem lugar ao **roteiro manual de demonstração** documentado no README.

## 4. Metas de cobertura

| Escopo | Meta de linhas |
|---|---|
| `apps/api/src/domain` (regras de negócio) | **≥ 90%** |
| `apps/api` (restante: *services*, controllers) | ≥ 70% |
| `apps/mobile` (lógica, hooks, validações) | ≥ 60% (não se mede UI visual) |
| `apps/painel` (lógica e componentes principais) | ≥ 60% |

A CI falha se a cobertura do `domain` cair abaixo da meta.

## 5. Ferramentas

| Camada | Ferramentas |
|---|---|
| API e painel | Vitest, Supertest, Testing Library, `@vitest/coverage-v8` |
| App | Jest, `jest-expo`, React Native Testing Library |
| Tempo real | `socket.io` + `socket.io-client` em memória |
| E2E | Playwright (painel), Maestro (app) |
| Qualidade | ESLint, Prettier, `tsc --noEmit` |
| Acessibilidade | `eslint-plugin-react-native-a11y`, `jsx-a11y`, axe, roteiro manual ([12](12-acessibilidade.md)) |
| CI | GitHub Actions: lint, `tsc`, testes (com PostgreSQL de serviço) |

## 6. Dados e ambiente de teste

- *Factories* de dados (usuário, bairro, denúncia) para cada teste; banco isolado e limpo.
- Relógio controlado (`vi.useFakeTimers`) para previsões, "Há X min" e janela de 30 dias.
- Seed de teste com 3 bairros e 1 operador; sem dependência de serviços externos (push e geocodificação *mockados*).
- Variáveis de ambiente específicas em `.env.test`.

## 7. Critérios de aceite do MVP

- Todos os testes unitários e de integração passam na CI.
- Cobertura do `domain` ≥ 90%.
- Fluxo ponta a ponta demonstrado: cidadão envia ⇒ painel recebe em ≤ 2 s ⇒ operador atualiza ⇒ app atualiza em ≤ 2 s.
- Sem erros de lint e sem erros de tipo.
