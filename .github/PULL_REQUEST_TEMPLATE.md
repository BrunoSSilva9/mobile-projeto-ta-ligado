## O que mudou

<!-- Resumo objetivo. O título do PR segue o padrão Conventional Commits. -->

## Por quê

<!-- Contexto, issue relacionada (Closes #...) e requisitos (RF/RN/US/UC/B). -->

## Como testar

<!-- Passos para validar. Inclua comandos e dados de teste (sem dados pessoais reais). -->

## Capturas de tela (se houver mudança visual)

<!-- App e/ou painel. -->

## Checklist

- [ ] O título do PR e os commits seguem o **Conventional Commits**
- [ ] A branch segue o padrão (`feature/*`, `fix/*`, `docs/*`) e o PR aponta para a branch correta
- [ ] `npm run lint` e `npm test` passam localmente
- [ ] Adicionei ou atualizei **testes** (especialmente das regras de negócio em `domain/`)
- [ ] A documentação em `docs/` foi atualizada e os IDs (RF/RNF/RN/US/UC/B) continuam consistentes
- [ ] Atualizei `docs/10-api.md` se mudei endpoints ou eventos WebSocket
- [ ] Usei os **tokens** do design system (sem cores ou fontes soltas)
- [ ] Verifiquei **acessibilidade** (rótulos, contraste, alvos de toque) nas telas alteradas
- [ ] Não há segredos, `.env` nem dados pessoais no código ou nos logs
- [ ] Não coletei dados além do previsto (ex.: CPF, data de nascimento) e respeitei a visibilidade por papel (RN-014)
- [ ] Atualizei o `CHANGELOG.md` (quando visível ao usuário)
