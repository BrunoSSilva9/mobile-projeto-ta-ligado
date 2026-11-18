# 06 – Design system

Extraído das telas do Figma. O arquivo **não define variáveis nem estilos** (`get_variable_defs` retornou vazio); os valores abaixo foram lidos do código de design de cada tela e **consolidados em tokens nomeados**. Os nomes dos tokens são proposta desta documentação. Contraste e acessibilidade estão em [12](12-acessibilidade.md).

## 1. Cores

### Marca e ação

| Token | Hex | Uso |
|---|---|---|
| `color.brand.900` | `#16382B` | Verde escuro institucional: logo, cartões escuros, formulários, painel de indicadores |
| `color.brand.700` | `#466556` | Cabeçalhos de faixa ("Lista dos lugares"), banner de ação, rótulos secundários |
| `color.primary` | `#34A853` | Botões primários, FAB, passo ativo, status "restabelecido" |
| `color.primary.dark` | `#006E2C` | Botão "Enviar denúncia", links, aba ativa, ícones de perfil |
| `color.accent.lime` | `#A3E635` | Destaque oficial do "?" sobre fundo escuro (as telas do protótipo usam `#84CC16`; por decisão do projeto vale `#A3E635`, o valor oficial do frame de identidade) |
| `color.accent.mint` | `#89FA9B` | Textos de destaque sobre verde escuro |

### Superfícies e texto

| Token | Hex | Uso |
|---|---|---|
| `color.bg.page` | `#F1FCF3` | Fundo das telas |
| `color.bg.card` | `#EBF7ED` | Cartões e blocos suaves |
| `color.bg.soft` | `#E5F1E7` | Botões secundários, selos, fundos de mapa |
| `color.bg.muted` | `#DAE5DC` | Rodapés e mapa |
| `color.surface.tint` | `#C3E5D2` | Ícones circulares, aviso de responsabilidade |
| `color.surface.mint` | `#C8EAD7` | Selos sobre verde escuro |
| `color.surface.white` | `#FFFFFF` | Campos, cartões de lista |
| `color.text.primary` | `#141E18` | Títulos e texto principal |
| `color.text.secondary` | `#3E4A3E` | Texto de apoio |
| `color.text.muted` | `#6E7A6D` | Placeholders, notas |
| `color.text.onDark` | `#FFFFFF` / `#E0EBE2` | Texto sobre verde escuro |
| `color.text.tagline` | `#64748B` | Subtítulo do logo ("MARABÁ • EM TEMPO REAL") |

### Semânticas (status)

| Token | Hex | Status |
|---|---|---|
| `status.noPower` | `#BA1A1A` | Sem luz / Sem energia (selo claro `#FFDAD6`, texto `#93000A`) |
| `status.flicker` | `#CE8300` | Oscilação (texto sobre claro `#855300`, fundo `#FFDDB8`) |
| `status.restored` | `#34A853` | Restabelecido / Normal |
| `status.inService` | `#CE8300` **[SUPOSIÇÃO]** | Em atendimento (reuso do âmbar) |
| `status.rejected` | `#6E7A6D` **[SUPOSIÇÃO]** | Improcedente e Cancelada (cinza neutro) |

> Não existe no protótipo um conjunto de cores para os status de **denúncia** (Recebida, Em atendimento, Resolvida, Improcedente, Cancelada). Proposta: Recebida = azul-petróleo `#466556`; Em atendimento = âmbar; Resolvida = verde; Improcedente/Cancelada = cinza. **[SUPOSIÇÃO]**

## 2. Tipografia

**Família:** Plus Jakarta Sans (Regular, SemiBold, Bold, ExtraBold, Italic). Carregar via `expo-font` / `@expo-google-fonts/plus-jakarta-sans`. No painel, a mesma família via Google Fonts.

| Token | Tamanho / altura de linha | Peso | Uso |
|---|---|---|---|
| `type.display` | 36 / 36 (−0,9 de espaçamento) | ExtraBold | Números dos indicadores |
| `type.h1.large` | 28 / 36 (−0,42) | Bold | "Onde Faltou Luz?" |
| `type.h1` | 22 / 27,5 (−0,22) | Bold | Títulos de herói |
| `type.title` | 18 / 26 | SemiBold | Títulos de seção, botões grandes |
| `type.subtitle` | 16 / 24 | SemiBold / Bold | Nomes de lista, título de header |
| `type.body` | 14 / 20 | Regular | Texto, campos |
| `type.button` | 14 / 20 (+0,14) | SemiBold | Botões |
| `type.caption` | 12 / 16 | Regular / SemiBold | Texto de apoio, chips |
| `type.label` | 11 / 14 (+0,44) | Bold | Selos, rótulos, datas |
| `type.logo` | 19 / 19 (−0,475) | ExtraBold | "Tá Ligado" |
| `type.tagline` | 8,5 / 8,5 (+1,36, maiúsculas) | Bold | Subtítulo do logo |

Respeitar **fontes dinâmicas** do sistema ([12](12-acessibilidade.md)): tamanhos em `sp`/`allowFontScaling` ativo.

## 3. Espaçamento, raios e elevação

| Token | Valores |
|---|---|
| `space` (base 4) | 2, 4, 6, 8, 10, 12, 14, 16, 24, 32 (o protótipo usa gutter de **16** e respiro entre seções de **24**) |
| `radius` | 8 (itens), 10 (ícone do logo), 12 (cartões, campos, botões), 16 (cartões grandes), 9999 (pílulas e círculos) |
| `size.touch` | alvo mínimo 44; botões 48 a 56; FAB 56; avatar/ícone circular 32 a 48 |
| `size.header` | 64 (header), 64 (barra inferior), 56 (barra do cadastro) |
| `layout.width` | base 390 dp; conteúdo com padding horizontal 16 |
| `shadow.sm` | `0 1 2 rgba(0,0,0,.05)` (cartões, campos) |
| `shadow.md` | `0 4 6 -1 rgba(0,0,0,.10)` + `0 2 4 -2 rgba(0,0,0,.10)` (botões, banners) |
| `shadow.lg` | `0 10 15 -3 rgba(0,0,0,.10)` + `0 4 6 -4 rgba(0,0,0,.10)` (botão grande, pinos) |
| `shadow.fab` | `0 6 16 -4 rgba(26,56,43,.25)` |
| Efeitos | Header e barra inferior com fundo translúcido (`rgba(241,252,243,.9)` / `rgba(255,255,255,.95)`) e *blur* de 12 |

## 4. Ícones e imagens

- Ícones em traço simples, de 12 a 24 dp, nas cores do texto ou do estado. O Figma os exporta como SVG; no app usar **`@expo/vector-icons`** (Feather/Ionicons) ou SVG do projeto, mantendo o mesmo significado: raio/alerta (queda), pin/local, mapa, casa, usuário, sino com cruz (denunciar), câmera, lixeira, lápis, check, relógio, telefone, olho (senha), seta/voltar, camadas, mira (GPS).
- **Logo:** lupa com raio em *squircle* verde escuro + "Tá Ligado" + "?" lima, em versão fundo claro e fundo escuro (altura 36 a 44). **Ícone do app:** 64 e 96 px (PEN-09).
- Ilustração do cadastro (celular, cadeado e folha) em vetores; exportar do Figma.
- O mapa do protótipo é uma imagem estática; no app será um mapa real (React Native Maps) e no painel Leaflet.

## 5. Componentes reutilizáveis

| Componente | Variações e observações | Telas |
|---|---|---|
| `AppHeader` | Logo + botão de perfil (64 dp); variante com voltar + título | T-03, T-04, T-05, T-07, T-09 |
| `TopAuthBar` | Logo + "Entrar"/"Cadastrar" (alternância) | T-01, T-02 |
| `BottomTabBar` | 4 itens + FAB central de 56 dp ([C-01](05-telas-e-fluxos.md)) | T-03, T-04, T-08 |
| `Button` | Primário `#34A853`, escuro `#006E2C`, secundário claro, branco (sobre verde), com ícone; estados normal/pressionado/desabilitado/carregando | todas |
| `TextField` | Rótulo + campo branco de 48 a 52 dp, raio 12, ícone à esquerda, ajuda e erro; variante senha com olho; variante textarea | T-01, T-02, T-05 |
| `Checkbox` | Na cor da marca (corrigir o azul do protótipo) | T-01 |
| `Chip` / `FilterChip` | Pílula com ponto de cor; selecionado `#006E2C` com texto branco; contagem entre parênteses | T-04, P-02 |
| `SegmentedOption` | Faixa de pessoas e Sim/Não da necessidade especial; selecionado branco com texto verde sobre fundo verde | T-05 |
| `StatusBadge` | Pílula: Rede Estável/Instável, status da denúncia, status do bairro | T-03, T-04, T-07, T-09 |
| `StatusDot` | Ponto de 8 a 12 dp nas cores de status | listas, legenda |
| `Card` | Fundo `#EBF7ED`/branco, raio 12 a 16, sombra `sm`; variante escura `#16382B` | todas |
| `HeroBanner` | Cartão escuro com selo, título, texto e CTA | T-03 |
| `StatCard` | Cartão escuro com ícone, selo opcional, valor 36 px e legenda | T-03 |
| `StepCard` | Círculo numerado + título + descrição | T-03 |
| `LocationStatusCard` | Cartão com localização, selo e previsão | T-03, T-04 |
| `MapView` + `MapZone` + `MapPin` + `MapLegend` | Círculo por bairro com cor do status; pino; legenda em pílula; botões flutuantes (centralizar/expandir) | T-03, T-04, T-05 |
| `OccurrenceListItem` | Cartão com borda esquerda de 4 dp na cor do status, bairro, descrição, data e botão circular de detalhe | T-04 |
| `ComplaintListItem` | Item de "Minhas denúncias" (a criar) | T-09 |
| `AttachmentCard` | Miniatura 56 dp, nome, tamanho, excluir e substituir | T-05 |
| `CollapsibleNotice` | Aviso recolhível ("Aviso de Responsabilidade") | T-05 |
| `StatusTimeline` | Linha do tempo do histórico (a criar) | T-07, P-03 |
| `InfoFooterCard` | Contatos institucionais | T-03, T-04 |
| `EmptyState`, `ErrorState`, `Skeleton`, `OfflineBanner` | **Não existem no Figma**; criar seguindo as cores e o espaçamento | todas |
| `Toast` / `Banner` de alerta (painel) | Alerta de nova denúncia (a criar) | P-02 |

## 6. Notas para a implementação

- Centralizar tokens em `apps/mobile/src/theme/` (`colors.ts`, `typography.ts`, `spacing.ts`) e em CSS variables no painel (`apps/painel/src/styles/tokens.css`). Nenhuma cor "solta" nos componentes.
- Estilo: **`StyleSheet` do React Native + tema próprio** (sem biblioteca de UI), para manter o controle do visual do Figma e a escala de fontes. **[SUPOSIÇÃO]**
- Pontos do protótipo a corrigir ao implementar: checkbox azul (`#0075FF`), lima `#84CC16` → `#A3E635`, aba "Mapa" → "Ocorrências", textos citados em [05](05-telas-e-fluxos.md).
