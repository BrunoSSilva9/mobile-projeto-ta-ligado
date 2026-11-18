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
- Botão central "Denunciar" com rótulo explícito, e ordem de foco: Início → Ocorrências → Denunciar → Perfil.
- Título de cada tela marcado como `header` para navegação por títulos.
- No painel: HTML semântico, `aria-live` para novas denúncias (`role="status"`), tabela com `scope`, foco gerenciado ao abrir/fechar diálogos.

## 3. Contraste: análise do protótipo

> **Os tokens do código têm prioridade sobre o Figma** nos dois casos reprovados abaixo ([06](06-design-system.md#6-desvios-deliberados-do-figma-os-tokens-do-código-têm-prioridade)).

Razões calculadas com base nas cores do Figma ([06](06-design-system.md)). **Pontos a corrigir ao implementar:**

| Combinação | Razão aprox. | Resultado | Ação |
|---|---|---|---|
| Branco sobre `#34A853` (botões primários, texto de 12 a 14 px) | **~3,1:1** | **Reprova** para texto normal (AA exige 4,5:1) | **Decidido (D-01):** botões com texto branco usam `#006E2C` (≈ 6,4:1). `#34A853` fica só em elementos sem texto (FAB, pontos de status) |
| Texto âmbar `#CE8300` sobre branco (legenda "Oscilação", 11 px) | **~3,1:1** | Reprova | **Decidido (D-01):** texto âmbar usa `#855300` (≈ 6,5:1); `#CE8300` só em ícones, pontos e bordas |
| Branco sobre `#BA1A1A` | ~6,5:1 | Passa | — |
| `#6E7A6D` (placeholder) sobre branco | ~4,5:1 | No limite | Manter só em placeholders e, no formulário, **sempre ter rótulo visível** |
| Lima `#A3E635` sobre `#16382B` | ~8,5:1 | Passa | — |
| Texto `#3E4A3E` sobre `#F1FCF3` | > 9:1 | Passa | — |
| Texto de 11 px (selos e rótulos) | — | Tamanho muito pequeno | Mínimo de 12 sp no app e permitir escala |

> As razões foram estimadas pela fórmula de luminância relativa da WCAG; a validação final deve ser feita com ferramenta (ex.: contraste do Figma, Accessibility Scanner).

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

- Usar tamanhos escaláveis do sistema (`allowFontScaling` padrão) com `maxFontSizeMultiplier` ≈ 2 nos textos de interface densos.
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
