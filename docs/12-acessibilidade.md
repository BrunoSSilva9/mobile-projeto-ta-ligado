# 12 – Acessibilidade

Meta: **WCAG 2.2 nível AA** no app (adaptado ao mobile) e no painel web (RNF-024). Como o app é nativo, as diretrizes são aplicadas conforme o *WCAG2Mobile* e as recomendações de Android e iOS.

## 1. Metas

| Área | Meta | Critério WCAG 2.2 |
|---|---|---|
| Contraste de texto | ≥ 4,5:1 (texto normal) e ≥ 3:1 (texto grande ≥ 18,66 px negrito ou ≥ 24 px) | 1.4.3 |
| Contraste de componentes | ≥ 3:1 para bordas de campos, ícones e estados de foco | 1.4.11 |
| Cor não é a única pista | Status também em texto/ícone ("Sem luz", "Oscilação"), não só vermelho/âmbar | 1.4.1 |
| Alvos de toque | **≥ 48 × 48 dp** no app (decisão D-02); nunca menos que 24 × 24 px | 2.5.8 (mín.), boas práticas |
| Fontes dinâmicas | Texto escala até **200%** sem perda de conteúdo ou função | 1.4.4 |
| Leitor de tela | Todas as telas navegáveis e compreensíveis com TalkBack e VoiceOver | 1.1.1, 1.3.1, 4.1.2 |
| Foco e ordem | Ordem lógica de leitura; foco visível; sem armadilha de foco | 2.4.3, 2.4.7, 2.4.11 |
| Teclado (painel) | Todas as funções do painel operáveis por teclado | 2.1.1 |
| Erros e formulários | Erros identificados em texto, associados ao campo, com sugestão | 3.3.1, 3.3.3 |
| Movimento e tempo | Sem animação essencial; respeitar "reduzir movimento" | 2.3.3, 2.2.2 |
| Autenticação acessível | Sem teste cognitivo; senha pode ser colada e exibida | 3.3.8 |

## 2. Leitores de tela (TalkBack e VoiceOver)

- Todo elemento interativo tem `accessibilityRole` (`button`, `link`, `tab`, `checkbox`, `header`) e `accessibilityLabel` em pt-BR descritivo (ex.: "Denunciar falta de luz", não "ícone").
- Ícones puramente decorativos ficam fora da árvore de acessibilidade (`accessibilityElementsHidden` / `importantForAccessibility="no"`).
- Estados são anunciados (`accessibilityState`: selecionado, desabilitado, expandido, carregando). Ex.: chip "Sem luz, 9, selecionado".
- Campos: `label` ligado ao campo, `accessibilityHint` para formato (ex.: telefone) e erro anunciado ao aparecer (`accessibilityLiveRegion="polite"`; `AccessibilityInfo.announceForAccessibility`).
- **Atualizações em tempo real** (status mudou) são anunciadas de forma educada, sem tirar o foco do usuário.
- **Mapa:** é um elemento visual difícil para leitores de tela. Toda informação do mapa tem **equivalente em lista** (lista de ocorrências e status do bairro em texto), e o mapa tem rótulo "Mapa de ocorrências. A lista abaixo tem as mesmas informações".
- Barra inferior com texto em todos os itens; ordem de foco: Início → Mapa → Denunciar → Perfil.
- **Componentes do design system v2:** `CartaoDeEscolha` é `radio` com `checked`, e seus cartões ficam num `radiogroup` rotulado; `FilterChip` é `radio` com `selected`; `CabecalhoDePasso` tem uma `progressbar` com `accessibilityValue` (mín. 1, máx. 3, agora, texto "Passo X de 3"); `SeloDeSituacao` é lido como "Situação da energia: Sem energia" e `StatusBadge` como "Status: Recebida" (ícone e texto, nunca só cor); `Aviso` anuncia como alerta (`accessibilityRole="alert"` no texto, região `polite`) e pode ser silencioso (`anunciar={false}`); o botão de mostrar senha tem o texto "Mostrar"/"Ocultar" visível e o rótulo "Mostrar senha"/"Ocultar senha"; "Voltar" tem ícone **e** texto.
- **Início:** o cartão da energia é lido como "Situação da energia: Sem energia. 2 denúncias em aberto"; "Trocar", "Usar minha localização", "Ajuda" e "Ligar para a Equatorial" são botões com texto; os 3 passos de "Como funciona" são lidos como "Passo 1: …". O aviso do 193 na Ajuda é leitura normal (não é anunciado como alerta ao abrir a tela).
- Título de cada tela marcado como `header` para navegação por títulos.
- No painel: HTML semântico, `aria-live` para novas denúncias (`role="status"`), tabela com `scope`, foco gerenciado ao abrir/fechar diálogos.

## 3. Contraste (design system v2)

> **Substitui a análise do protótipo verde** (decisão D-01, que deixou de valer com a S-44). Os valores estão em [06](06-design-system.md) e **cada par abaixo é testado** em `apps/mobile/src/theme/theme.test.ts`. A meta é **4,5:1 para texto** (WCAG 1.4.3) e **3:1 para ícones, bordas e marcadores** (WCAG 1.4.11).

| Par | Razão | Mínimo |
|---|---|---|
| Branco sobre `action` `#1D4ED8` (botão) | 6,70 | 4,5 |
| `action` sobre `actionSoft` · sobre branco · sobre `bgPage` | 6,08 · 6,70 · 6,25 | 4,5 |
| `actionPressed` sobre `actionSoft` · sobre a pílula da aba | 9,40 · 8,27 | 4,5 |
| `textPrimary` sobre `bgPage` | 16,65 | 4,5 |
| `textSecondary` sobre branco · sobre `bgPage` | 7,58 · 7,07 | 4,5 |
| `disabledText` sobre `disabledBg` | 6,15 | 4,5 |
| Sem energia: texto sobre o selo · sobre branco | 5,45 · 6,57 | 4,5 |
| Oscilando: texto sobre o selo · sobre branco | 6,62 · 7,52 | 4,5 |
| Normal: texto sobre o selo · sobre branco | 5,11 · 5,69 | 4,5 |
| Recebida · Em atendimento · Resolvida (texto sobre o selo) | 9,45 · 9,40 · 5,11 | 4,5 |
| Erro `danger` sobre branco | 6,57 | 4,5 |
| Ícone sobre o marcador: Sem energia · Oscilando · Normal | 4,83 · 6,25 · 5,69 | 3 |
| `borderField` sobre branco · sobre `bgPage` | 4,76 · 4,44 | 3 |
| Raio lima sobre `brandNavy` | 10,96 | 3 |

**Cor nunca sozinha (WCAG 1.4.1):** toda situação da energia e todo andamento tem **ícone de formato diferente e texto**. O marcador de "Normal" é **quadrado**; os outros são circulares.

**Marcador "Oscilando" no mapa:** o laranja `#F79009` contra a borda branca dá só 2,35:1. O sentido é carregado pelo ícone escuro (6,25:1) e pelo formato; para o marcador também se destacar do mapa, ele tem um **contorno externo de 2 dp** na cor de texto da situação (`#93370D`), com 3:1 ou mais contra terreno, ruas, parque, água e a borda branca (decisão R-14, testada).

> As razões usam a fórmula de luminância relativa da WCAG (a mesma de `theme/contrast.ts`). A validação final em aparelho deve usar o Accessibility Scanner (Android) e o Inspetor de Acessibilidade (iOS).

## 4. Alvos de toque no protótipo

> **Decisão D-02:** todo alvo de toque do app tem no mínimo **48 × 48 dp**. A área tocável pode ser maior que o elemento visual, usando `hitSlop` ou *padding*, sem alterar o desenho. No código, o token `touch.min = 48` e o componente `Pressable` base aplicam a regra. O Figma não é alterado.

| Elemento | Tamanho no Figma | Ação |
|---|---|---|
| Itens da barra inferior | 56 × 44 | Área de toque de **no mínimo 48 dp** de altura (`minHeight: 48`) |
| Chips de filtro | altura 32 | `hitSlop` vertical de 8 dp (área de 48 dp) |
| Botão voltar | 44 × 44 | `hitSlop` de 2 dp (48 dp) |
| Botões circulares de detalhe | 40 × 40 | `hitSlop` de 4 dp (48 dp) |
| Botões do cabeçalho (perfil) | 32 × 32 | `hitSlop` de 8 dp (48 dp) |
| Opções de pessoas afetadas | altura 44 | `hitSlop` de 2 dp (48 dp) |
| Excluir/substituir foto | 36 × 36 | `hitSlop` de 6 dp (48 dp) |
| Espaço entre alvos | — | Manter ≥ 8 dp entre alvos adjacentes |

## 5. Fontes dinâmicas

- Usar tamanhos escaláveis do sistema (`allowFontScaling` padrão), **sem** `maxFontSizeMultiplier` nas telas (decisão R-15). **Exceção possível só nos rótulos da barra inferior**, limitados a 1,5× se quebrarem a barra no teste em aparelho; qualquer exceção é registrada aqui.
- A fonte é a **Atkinson Hyperlegible**, com corpo em 18 e **mínimo de 14** em qualquer texto (`caption`); sem `letterSpacing` negativo e sem texto todo em maiúsculas (testado em `theme.test.ts`).
- Os layouts não podem usar altura fixa para texto (cartões, chips, botões crescem com a fonte). Os campos usam `minHeight`.
- Testar com **200%** em Android ("Tamanho da fonte") e iOS ("Texto maior"). Incluir esse teste no roteiro de verificação da seção 7.
- A barra inferior com rótulos pode quebrar linha; os rótulos ficam abaixo do ícone e o componente cresce em altura.

## 6. Outras diretrizes

- **Idioma:** pt-BR declarado no app e no painel (`lang="pt-BR"`).
- **Mensagens de erro:** texto claro, sem depender de cor; ex.: "Senha com pelo menos 8 caracteres".
- **Tempo:** sem limite de tempo para preencher; rascunho preservado (RNF-008).
- **Notificações:** conteúdo claro e curto; não depender de som (o alerta sonoro do painel é acompanhado de alerta visual, RF-027).
- **Imagens:** miniaturas de foto com descrição ("Foto 1 de 3 anexada"). A foto em si não precisa de texto alternativo detalhado, pois o usuário a criou.
- **Painel:** foco visível (contorno de 2 px), ordem de tabulação lógica, "pular para o conteúdo", tabela navegável.

## 7. Verificação

| Quando | O quê | Ferramenta |
|---|---|---|
| Durante o desenvolvimento | Lint de acessibilidade (`eslint-plugin-react-native-a11y`, `eslint-plugin-jsx-a11y` no painel) | ESLint |
| Por tela | Roteiro manual com TalkBack, VoiceOver e fonte a 200% | Dispositivos reais ou emuladores |
| Contraste | Medição das combinações de cor | Figma, Accessibility Scanner (Android), Accessibility Inspector (Xcode) |
| Painel | Auditoria automática | axe DevTools / Lighthouse |
| Antes da entrega | Checklist de metas da seção 1 | Manual |
