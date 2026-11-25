# ADR-0006 – Redesign do app com o design system v2

- **Status:** Aceita
- **Data:** 2026-11-23
- **Relacionados:** [06 – Design system](../06-design-system.md), [12 – Acessibilidade](../12-acessibilidade.md), [17 – Plano do redesign](../17-plano-redesign.md), decisão S-44 em [01](../01-visao-e-escopo.md), WCAG 1.4.1, 1.4.3, 1.4.11

## Contexto

A Fase 1 entregou o app com o visual extraído do Figma: paleta **verde**, fonte **Plus Jakarta Sans** (corpo em 14 e legendas em 12), botões e atalhos só com ícone (o FAB da barra inferior) e vários textos em maiúsculas. Ao revisar o app, com o ciclo completo funcionando, apareceram problemas que têm a ver com **quem usa o app**:

- O público é **leigo e inclui pessoas idosas**, em casa, **sem energia elétrica**, muitas vezes com a tela do celular em brilho baixo e a ansiedade de uma queda de luz. Letra pequena, ícone sem texto e várias ações competindo na tela pesam mais nessa situação.
- **Conflito de significado do verde:** o verde da marca era o mesmo verde de "Normal / restabelecido" (a energia voltou). Um botão verde de ação e um selo verde de situação querem dizer coisas diferentes, e o usuário não tinha como distinguir só pela cor.
- **A cor sozinha carrega o sentido** em vários pontos (círculos do mapa, bolinhas de status), o que reprova o critério **WCAG 1.4.1** (a cor não pode ser o único meio de transmitir informação) e exclui pessoas com daltonismo ou baixa visão.
- Tamanhos abaixo de 14 (11, 12 e até 8,5 no logo), com `letterSpacing` e maiúsculas, pioram a leitura em baixa visão.

## Decisão

Adotar o **design system v2** no app do cidadão (`apps/mobile`), em quatro princípios:

1. **Uma ação principal por tela:** um único botão azul cheio, que é sempre o próximo passo. O fluxo de denunciar vira um passo a passo de 3 passos, com uma pergunta por tela.
2. **Todo ícone tem texto visível**, inclusive na barra inferior; nenhum botão é só ícone. O FAB some.
3. **Azul é para tocar. Vermelho, laranja e verde só mostram a situação da energia**, e **a cor de situação nunca aparece sozinha**: sempre com um ícone de formato diferente (`flash-off`, `pulse`, `checkmark-circle`; o marcador de "Normal" é quadrado) e um texto. Isso resolve o conflito do verde: o verde passa a significar **só** "Normal".
4. **Letra grande e frases curtas:** fonte **Atkinson Hyperlegible** (feita para baixa visão), corpo em 18, **mínimo de 14**, sem maiúsculas forçadas e sem `letterSpacing` negativo, escalando com a fonte do sistema até 200%. Linguagem do dia a dia ("Fazer denúncia", "Sem energia", "Oscilando", "Normal"; a aba "Ocorrências" vira "Mapa").

Os valores estão em [06](../06-design-system.md). Todos os pares de texto passam em **4,5:1** e os de ícone e borda em **3:1**, verificados por teste.

**Fica de fora:** o **painel** (tema verde próprio; alinhar as cores de situação é o item Could B-045), a **API**, os contratos e as **regras de negócio**. O fluxo de denúncia muda só na apresentação: schema, rascunho, tratamento do 409, modo offline e GPS continuam iguais.

## Consequências

**Positivas**
- Leitura mais fácil para baixa visão e para quem está sob estresse; um único próximo passo por tela.
- Situação da energia compreensível sem depender de cor (WCAG 1.4.1) e sem ambiguidade com a cor da marca.
- Contraste verificado por teste (nenhuma regressão silenciosa).

**Negativas**
- **Custo:** o app inteiro é tocado (cerca de 52 h de trabalho) e boa parte dos testes de tela é atualizada pelo texto procurado. A **Fase 2 é adiada** para depois do redesign.
- **Divergência entre apps:** o painel continua verde e o app, azul, até o B-045.
- **Divergência do Figma:** o Figma deixa de ser a fonte visual do app; este ADR e o documento 06 passam a ser. As decisões D-01 (`#006E2C`/`#855300`) deixam de valer; a D-02 (alvo de 48 dp) continua.
- Fonte maior exige mais rolagem e testes em 200%.

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| Manter o verde e só corrigir tamanhos | Não resolve o conflito de significado do verde nem a cor sozinha |
| Só trocar a paleta e a fonte, mantendo as telas | A tela de denunciar continua com muitos campos e várias ações competindo, pesada para o público |
| Biblioteca de UI pronta (Paper, NativeBase) | Perde o controle do visual e da escala de fontes (decisão S-27) |
| Redesenhar também o painel agora | Fora do escopo pedido; o painel é de uso interno da operadora (item B-045) |

## Implementação

Implementado em 2026-11 (etapas R0 a R10, branch `feature/redesign-v2`). Os apelidos de migração foram removidos na R10 e um teste (`regras-do-tema.test.ts`) impede cor, fonte e caixa alta fora de `src/theme`. Ajuste feito depois da aprovação: no mapa, a zona do bairro afetado virou uma linha tracejada de apoio, sem preenchimento (decisão R-02 ajustada em [17](../17-plano-redesign.md)).
