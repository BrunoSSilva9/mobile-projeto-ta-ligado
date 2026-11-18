# Contribuindo com o Tá Ligado?

Obrigado por contribuir! Este guia descreve o fluxo de trabalho do projeto.

## Fluxo de branches

| Branch | Uso | Origem | Destino |
|---|---|---|---|
| `main` | Código estável, pronto para entrega/demonstração. Protegida: só recebe merge de `develop` ou de `fix/*` urgentes por PR | — | — |
| `develop` | Integração contínua do trabalho em andamento | `main` | `main` |
| `feature/<escopo>-<descricao>` | Nova funcionalidade (ex.: `feature/api-registrar-denuncia`) | `develop` | `develop` |
| `fix/<escopo>-<descricao>` | Correção de bug (ex.: `fix/mobile-gps-negado`) | `develop` (ou `main` se urgente) | `develop` (e `main`) |
| `docs/<descricao>` | Mudanças só de documentação (ex.: `docs/atualiza-requisitos`) | `develop` | `develop` |

Regras:
- Nomes em minúsculas, sem acento, com hífens.
- Uma branch por assunto; PRs pequenos e focados.
- Nunca fazer *push* direto em `main` ou `develop`.
- Apague a branch depois do merge.

## Conventional Commits

Formato: `tipo(escopo opcional): descrição no imperativo, em minúsculas, sem ponto final`

| Tipo | Quando usar |
|---|---|
| `feat` | Nova funcionalidade |
| `fix` | Correção de bug |
| `docs` | Documentação |
| `style` | Formatação (sem mudar lógica) |
| `refactor` | Refatoração sem mudar comportamento |
| `test` | Testes |
| `chore` | Tarefas de manutenção, dependências, configuração |
| `build` | Build e dependências de build |
| `ci` | Pipeline de CI (GitHub Actions) |
| `perf` | Melhoria de desempenho |

**Escopos sugeridos:** `mobile`, `painel`, `api`, `docs`, `db`, `ci`.

Exemplos:

```
docs: adiciona requisitos funcionais
feat(api): registra denúncia com limite de uma em aberto
fix(mobile): preserva rascunho quando o envio falha sem rede
test(api): cobre transições de status permitidas
chore: configura eslint e prettier no monorepo
```

- Mudança que quebra compatibilidade: `feat(api)!: ...` e rodapé `BREAKING CHANGE: ...`.
- Referencie requisitos e issues no corpo ou rodapé: `Refs: RF-007, RN-006` ou `Closes #12`.
- Um commit = uma mudança lógica.

## Processo de Pull Request

1. Atualize sua branch com a `develop` (`git pull --rebase origin develop`).
2. Rode localmente: `npm run lint` e `npm test`.
3. Abra o PR para `develop` (ou `main` em casos de `fix/*` urgente) usando o **template** de PR.
4. Título do PR no padrão Conventional Commits (ex.: `feat(api): registra denúncia`).
5. Preencha: o que mudou, por quê, como testar, requisitos (`RF/RN`) relacionados e capturas de tela quando houver mudança visual.
6. Marque o checklist do template.
7. Aguarde a CI (lint e testes) ficar **verde** e ao menos **1 aprovação**.
8. Faça *squash merge* com a mensagem no padrão Conventional Commits.
9. Atualize o `CHANGELOG.md` na seção `[Não lançado]` quando a mudança for visível ao usuário.

## Padrões de código

- TypeScript em modo `strict`; ESLint e Prettier sem erros (`.editorconfig` respeitado).
- Regras de negócio em `apps/api/src/domain` como funções puras com testes unitários.
- Cores, fontes e espaçamentos só pelos **tokens** do design system ([docs/06-design-system.md](docs/06-design-system.md)).
- Nenhum segredo no repositório: use `.env` (ignorado) e atualize o `.env.example`.
- Mantenha os documentos em `docs/` consistentes com o código: se mudar uma regra, atualize o RF/RN/US/UC correspondente e a rastreabilidade.

## Documentação

Escreva em **português (pt-BR)**. Use IDs rastreáveis (`RF-xxx`, `RNF-xxx`, `RN-xxx`, `US-xxx`, `UC-xx`) e diagramas Mermaid quando ajudarem. Decisões que não vêm do Figma nem do enunciado devem receber um ID `S-xx` e ser listadas em [docs/01-visao-e-escopo.md](docs/01-visao-e-escopo.md#8-decisões-e-pendências).

## Relatando problemas

Use os templates de issue (bug, funcionalidade, documentação) em **Issues**.
