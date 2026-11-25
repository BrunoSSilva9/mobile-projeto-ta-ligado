# 06 – Design system (v2)

> **Versão 2, aprovada em 2026-11-23** ([ADR-0006](adr/0006-redesign-design-system-v2.md), decisão S-44). Ela **substitui** o design system extraído do Figma (paleta verde e Plus Jakarta Sans), que vigorou na Fase 1. O Figma deixa de ser a fonte visual do **app do cidadão**; a fonte é este documento. O **painel** continua com o tema verde próprio (`apps/painel/src/styles/tokens.css`) e fica fora do redesign (item B-045 do backlog).
>
> Contraste e acessibilidade: [12](12-acessibilidade.md). Plano de implementação: [17](17-plano-redesign.md).

## Princípios

1. **Uma ação principal por tela:** um único botão azul cheio, que é sempre o próximo passo.
2. **Todo ícone tem texto visível**, inclusive na barra inferior. Nenhum botão é só ícone.
3. **Azul é para tocar. Vermelho, laranja e verde só mostram a situação da energia.** A cor de situação nunca aparece sozinha: sempre vem com um **ícone de formato diferente** e um **texto** (WCAG 1.4.1).
4. **Letra grande e frases curtas.** Linguagem do dia a dia, uma pergunta por tela.

## 1. Cores

Todos os valores vivem em `apps/mobile/src/theme/colors.ts`. **Nenhuma cor escrita fora do tema.**

### Ação, texto e superfícies

| Token | Hex | Uso |
|---|---|---|
| `action` | `#1D4ED8` | Botões, links, aba ativa (branco sobre ele: **6,7:1**) |
| `actionPressed` | `#1E3A8A` | Estado pressionado e texto sobre fundo azul claro |
| `actionSoft` | `#EFF4FF` | Fundo de ícones e de cartão selecionado (azul sobre ele: 6,1:1) |
| `actionTabPill` | `#DBE6FE` | Pílula da aba ativa |
| `onAction` | `#FFFFFF` | Texto e ícone sobre `action` |
| `textPrimary` | `#0F172A` | Texto principal |
| `textSecondary` | `#475569` | Texto de apoio (7,6:1 sobre branco) |
| `bgPage` | `#F6F7F9` | Fundo das telas |
| `surface` | `#FFFFFF` | Cartões (brancos sobre `bgPage`, **sem sombra**) |
| `borderField` | `#64748B` | Borda de campos e de chips não selecionados (4,8:1) |
| `borderSubtle` / `borderDivider` | `#CBD5E1` / `#E2E8F0` | Divisórias e bordas **decorativas** |
| `disabledBg` / `disabledText` | `#E2E8F0` / `#475569` | Botão desativado (texto legível, nunca transparente) |
| `danger` | `#B42318` | Erros de campo: texto, ícone `warning` e borda |
| `brandNavy` / `lime` | `#0B1F3A` / `#A3E635` | **Só na marca** (logo, ícone, splash). Lima nunca sobre fundo claro |

### Situação da energia

Selo = fundo + texto + ícone. Marcador do mapa = preenchimento + ícone.

| Situação | Texto e ícone | Fundo do selo | Marcador | Ícone (Ionicons) |
|---|---|---|---|---|
| **Sem energia** | `#B42318` | `#FEE4E2` | `#D92D20`, ícone branco | `flash-off` |
| **Oscilando** | `#93370D` | `#FEF0C7` | `#F79009`, ícone `#1F2937` | `pulse` |
| **Normal** | `#067647` | `#DCFAE6` | `#067647`, ícone branco, **marcador quadrado** | `checkmark-circle` (selo) / `checkmark` (marcador) |

Em `colors.situacao.semEnergia | oscilando | normal`. O marcador de "Normal" é **quadrado** e os outros são circulares: o formato também diferencia a situação.

**Contorno do marcador no mapa:** o marcador laranja sozinho dá só 2,35:1 contra a borda branca. Por isso cada marcador tem um **contorno externo de 2 dp** por fora da borda branca, na cor de texto da própria situação (`#B42318`, `#93370D`, `#067647`), que passa de 3:1 contra os fundos típicos de mapa (decisão R-14). **Zona do bairro (R-02, ajustada):** no mapa, o bairro afetado ganha só uma **linha de 2 dp, sem preenchimento (tracejada no iOS)**, na cor de texto da situação; bairro Normal não tem área. A zona é apoio e nunca a única pista: o que informa são os marcadores (ícone e formato), a legenda e a lista. O botão **"Onde estou"** é o único elemento com sombra (`shadow.flutuante`).

### Andamento da denúncia

| Status | Texto | Fundo | Ícone |
|---|---|---|---|
| Recebida | `#334155` | `#F1F5F9` | `time-outline` |
| Em atendimento | `#1E3A8A` | `#EFF4FF` | `construct-outline` |
| Resolvida | `#067647` | `#DCFAE6` | `checkmark` |
| Improcedente | `#334155` | `#F1F5F9` | `close-circle-outline` |
| Cancelada | `#334155` | `#F1F5F9` | `ban-outline` |

Em `colors.andamento.*`. Os textos dos status são em **caixa normal** ("Recebida"), nunca em maiúsculas.

## 2. Tipografia

**Família: Atkinson Hyperlegible** (Regular 400 e Bold 700), desenhada para baixa visão (letras bem distintas entre si). Pacote `@expo-google-fonts/atkinson-hyperlegible` 0.4.1. **Substitui a Plus Jakarta Sans.**

| Token | Tamanho / linha | Peso | Uso |
|---|---|---|---|
| `title1` | 28 / 34 | Bold | Título de tela ("Olá, Maria") |
| `title2` | 22 / 28 | Bold | Situação da energia, títulos de seção |
| `title3` | 20 / 26 | Bold | Endereço, títulos de cartão |
| `button` | 18 / 24 | Bold | Botões |
| `body` | 18 / 28 | Regular | **Texto base** |
| `bodySmall` | 16 / 24 | Regular | Texto de apoio quando o espaço é curto |
| `label` | 16 / 22 | Bold | Rótulos de campo, nomes em lista |
| `caption` | 14 / 20 | Regular | **Menor texto do app** |

Regras: os tamanhos são `sp` e **escalam com a fonte do sistema até 200%** (RNF-018); **nenhum tamanho abaixo de 14**; **sem `letterSpacing` negativo**; **sem texto todo em maiúsculas**. Use `minHeight`, nunca `height` fixa, em tudo que contém texto.

## 3. Espaço, cantos, toque e sombra

| Token | Valores |
|---|---|
| `space` | 4, 8, 12, 16, 24, 32, 48 (`xs` … `xxxl`) |
| `radius` | campo **8**, botão **12**, cartão **16**, selo em **pílula** |
| Alvos de toque | **mínimo 48 dp**, com **8 dp de espaço** entre alvos (D-02) |
| Botões e campos | **56 dp** de altura (`size.button`, `size.field`) |
| Sombras | **Quase nenhuma.** Cartões brancos sobre `bgPage`, sem sombra. A sombra (`shadow.flutuante`) fica só em botões que flutuam sobre o mapa ("Onde estou") |

## 4. Ícones e imagens

- Ícones **Ionicons** (`@expo/vector-icons`), sempre acompanhados de texto visível.
- **Logo:** quadrado azul-noite (`brandNavy`) com o raio lima e o nome "Tá Ligado?". Ícone do app e splash com fundo `#0B1F3A` (imagens finais: PEN-09).
- Mapa real (`react-native-maps`) no app e Leaflet no painel.

## 5. Componentes

Componentes base construídos na **etapa R2** (`apps/mobile/src/components`): `Button`, `TextField`, `Checkbox`, `StatusBadge`, `SeloDeSituacao`, `FilterChip`, `Logo`, `Cartao`, `Aviso`, `CartaoDeEscolha`, `CabecalhoDePasso`, `CabecalhoDeTela`, `Estados` e `AvisoDeConexao`. A barra inferior (R3, sem FAB) e o mapa (R8: `MarcadorDeSituacao`, área tracejada de apoio e botão "Onde estou") já estão prontos ([plano](17-plano-redesign.md)). Login e cadastro (R9) usam `AuthLayout` (cartão branco sobre `bgPage`) e `TopAuthBar` (botões de 48 dp); `TextField` e `Checkbox` perderam a variante `escura`; o histórico (`StatusTimeline`) usa os ícones de andamento. O formulário de denúncia (R6) usa `CabecalhoDePasso`, `CartaoDeEscolha`, `Aviso`, `Cartao` e `SeloDeSituacao`, com rodapé fixo de botões de 56 dp; `SeletorDeBairro` e `MiniMapa` já estão no estilo v2. A apresentação da situação e do andamento (textos e ícones) fica em `features/situacao.ts`.

| Componente | Regras |
|---|---|
| `Button` | Prop `nomeDoIcone` (ícone na cor certa do botão); a variante antiga `claro` saiu na R9 (login e cadastro agora são cartões brancos). **Primário** (azul cheio, 56, largura total), **secundário** (borda azul de 2, fundo branco, 56) e **texto** (azul, negrito, **sublinhado**). Desativado: `disabledBg` + `disabledText`, **sem opacidade** |
| `TextField` | 56 de altura, borda de 2 em `borderField`, canto 8, **rótulo sempre visível acima** (nunca só placeholder). Erro: borda `danger`, ícone `warning` e uma frase dizendo como resolver |
| `SeloDeSituacao` | Pílula com ícone + texto da situação da energia (Sem energia, Oscilando, Normal) |
| `StatusBadge` | Pílula com ícone + texto do andamento da denúncia |
| `FilterChip` | 48 de altura, ícone, "Todos (n)"; selecionado **azul cheio** com texto branco; não selecionado branco com borda `borderField` |
| `CartaoDeEscolha` | Rádio grande (≥ 104 de altura) com ícone, título e descrição; selecionado: borda azul de 3, fundo `actionSoft` e rádio marcado |
| `Cartao` | Branco, canto 16, sem sombra; `destaque` = borda azul de 2 |
| `Aviso` | Faixa com **ícone e texto** (erro, atenção, informação); o papel de alerta fica no `Text`, não no `View` |
| `CabecalhoDePasso` | "Voltar" (ícone + texto), "Passo X de 3" e barra de 3 segmentos |
| Barra inferior (`BarraInferior.tsx`, **pronta na R3**) | 4 itens com ícone e texto (14 negrito): **Início, Mapa, Denunciar, Perfil**; aba ativa com pílula `actionTabPill` e texto `actionPressed`; fundo branco com borda superior `borderSubtle`; "Denunciar" com o ícone dentro de uma pílula azul cheia (56×32) |
| `CartaoEnergiaDoBairro` (**R4**) | Cartão "Energia no seu bairro agora": ícone grande e nome da situação na cor dela, frase de apoio, endereço com pino, "Trocar" e "Usar minha localização"; cuida dos estados de GPS, fora de Marabá, erro e sem conexão |
| `LugarComAviso` (**R5**) | Item da lista "Lugares com aviso": cartão inteiro clicável com `SeloDeSituacao`, nome em negrito, "Há X min · N avisos" e "Ver" com seta (`features/ocorrencias/agrupar.ts` faz o agrupamento por bairro) |
| `ListaDeBairrosModal` (**R4**) | Lista de bairros em tela cheia com busca por bairro ou folha e "Fechar" com texto; usada pelo seletor do formulário e pelo "Trocar" |
| `BotaoLigar` (**R4**) | Botão "Ligar para a Equatorial" (`tel:`); se o aparelho não puder ligar, mostra um `Aviso` com o número |
| `ComoFunciona` (**R4**) | Os 3 passos numerados, em frases curtas (Início e Ajuda) |
| Marcador do mapa | Círculo de 40 com borda branca de 3, contorno externo de 2 e ícone da situação; **"Normal" é quadrado** |

## 6. Mudanças de linguagem

| Antes | Depois |
|---|---|
| Registre sua denúncia / Registrar ocorrência | Fazer denúncia |
| Sem luz | Sem energia |
| Oscilação | Oscilando |
| Restabelecidos | Normal |
| Rede estável / instável | Normal / Sem energia / Oscilando |
| Ver mapa ampliado | Ver onde falta energia |
| GPS ATIVO | Achamos pela localização do celular |
| Ocorrências (aba) | Mapa |

## 7. Notas para a implementação

- Tokens em `apps/mobile/src/theme/` (`colors.ts`, `typography.ts`, `spacing.ts`). **Nenhuma cor ou fonte solta** nos componentes (verificado por teste na etapa R10).
- Durante a migração, os nomes antigos (`bgCard`, `brand900`, `status.*`, `h1`, `subtitle`…) existem como **apelidos `@deprecated`** apontando para os valores novos; somem na etapa R10.
- Estilo: **`StyleSheet` do React Native + tema próprio**, sem biblioteca de UI (decisão S-27).
- Título de cada tela marcado como `header`.
- No painel: HTML semântico, `aria-live` para novas denúncias, tabela com `scope` (tema verde próprio; alinhamento em B-045).

## 8. Histórico

A versão 1 (paleta verde `#006E2C`/`#34A853`, Plus Jakarta Sans, tokens extraídos do Figma e as decisões D-01 e D-02 sobre contraste do protótipo) vigorou na Fase 1 e está no histórico do Git (`git log -- docs/06-design-system.md`). A **D-02** (alvo de toque de 48 dp) continua valendo; a **D-01** (`#006E2C` e `#855300`) foi **substituída** pela paleta nova.
