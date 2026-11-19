# ADR-0003 – Monorepo com três aplicações (npm workspaces)

- **Status:** Aceita
- **Data:** 2026-11-18
- **Relacionados:** [07 – Arquitetura](../07-arquitetura.md), [08 – Tecnologias](../08-tecnologias.md), RNF-019, RNF-022

## Contexto

O sistema tem três aplicações que evoluem juntas (`mobile`, `painel`, `api`) e compartilham contratos (nomes de status, tipos, eventos). A equipe é pequena e o repositório será avaliado como um todo.

## Decisão

Um **único repositório (monorepo)** com **npm workspaces**:

```
apps/
├── mobile/   # Expo / React Native
├── painel/   # React + Vite
└── api/      # Express + Prisma + Socket.IO
docs/
.github/
```

- Cada app tem seu `package.json`, scripts (`dev`, `lint`, `test`, `build`) e `tsconfig`.
- O CI roda lint e testes por *workspace*.
- Tipos e constantes compartilhados (enums de status e tipo, nomes de eventos) ficam inicialmente **duplicados de forma controlada** e podem ser extraídos para um pacote `packages/shared` depois (decisão S-32); isso evita configurar o Metro para pacotes locais no MVP.

## Consequências

**Positivas**
- Um PR pode alterar API, painel e app de forma atômica; uma única história de commits e uma única documentação.
- Ferramentas únicas (ESLint, Prettier, commitlint) na raiz.
- Fácil de clonar e avaliar.

**Negativas**
- O Metro (React Native) exige cuidado com *hoisting* de dependências no monorepo; por isso o npm (com `node_modules` plano) em vez de pnpm.
- Dependências pesadas do app e da API convivem no mesmo `node_modules`.
- Risco de acoplamento entre apps se o código compartilhado crescer sem controle.

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| Três repositórios | Sincronizar contratos e versões, mais burocracia de PRs e CI |
| pnpm workspaces | *Symlinks* estritos costumam exigir ajustes no Metro; ganho pequeno no MVP |
| Turborepo/Nx | Ferramenta adicional sem necessidade para três apps pequenos |
