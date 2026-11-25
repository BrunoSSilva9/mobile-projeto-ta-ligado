# 17 – Plano de implementação do redesign do app (design system v2)

> **Estado:** plano **aprovado com ajustes em 2026-11-23**; **etapas R0 a R10 implementadas** na branch `feature/redesign-v2` (falta o ensaio no celular e o merge). O prazo foi estendido: o redesign será feito **por completo, de R0 a R10**, e a **Fase 2 vem depois dele**, já usando os componentes novos. Nada além disso é cortado por prazo.
> **Escopo:** **somente `apps/mobile`**. O painel e a API não mudam; os contratos de [10 – API](10-api.md) e os eventos WebSocket continuam iguais.
> **Regra de ouro:** **nenhuma regra de negócio nova.** O fluxo de denúncia muda só na apresentação. O schema (`features/denuncia/schemas.ts`), o rascunho, o tratamento do 409, o modo offline e o GPS continuam os mesmos.
> **Como será feito:** **uma branch (`feature/redesign-v2`) e um PR**, no mesmo modelo da Fase 1 (S-42). **Uma etapa por vez:** ao fim de cada uma, `lint`, `typecheck` e `test` passam, e eu entrego a mensagem de commit, a lista de arquivos e um checklist do que conferir no celular. A etapa seguinte só começa depois do "ok" de Bruno, que faz os commits e pushes.

## 1. Objetivo e critério de pronto

**Entrega:** o app do cidadão com o design system v2 (azul para tocar, cor de situação sempre com ícone e texto, Atkinson Hyperlegible, letra grande), **sem mudar o comportamento** que a Fase 1 já entrega e testa.

**O redesign está pronto quando (tudo abaixo, sem cortes):**

- [ ] Nenhuma cor ou fonte escrita fora de `src/theme` (verificado por busca e por teste).
- [ ] Atkinson Hyperlegible carregada; Plus Jakarta Sans removida do código e do `package.json`.
- [ ] Barra inferior com 4 itens com texto (Início, Mapa, Denunciar, Perfil); o FAB some.
- [ ] Início no novo layout, sem o mini-mapa.
- [ ] Denunciar em 3 passos, com rascunho, 409, offline e GPS funcionando como hoje.
- [ ] Denúncia enviada no novo layout.
- [ ] Todos os pares de cor da tabela da seção 3.6 testados (≥ 4,5:1 texto; ≥ 3:1 ícone e borda).
- [ ] `npm run lint`, `typecheck`, `test` e `format:check` passam; o app empacota para Android e iOS.
- [ ] Ajuda, "Trocar" bairro e a lista do Mapa agrupada por bairro funcionando.
- [ ] Marcadores do mapa com ícone e contorno, e "Onde estou".
- [ ] O roteiro de demonstração do README continua funcionando (com os textos novos).

## 2. Escopo

**Entra (tudo):** tokens de cor, tipografia, espaços e cantos; componentes base; barra inferior; Início (com **Trocar** bairro e botão **Ajuda**); tela **Ajuda**; Mapa (chips, lista **agrupada por bairro**, marcadores com ícone e "Onde estou"); Denunciar em 3 passos; Denúncia enviada; ajustes em login, cadastro, perfil, minhas denúncias e detalhe; documentação.

**Não entra:**

| Item | Por quê |
|---|---|
| **Painel e API** | Fora do escopo; contratos congelados. Se algum campo faltar na resposta e for preciso mudar a API, **a implementação para e pergunta** |
| Alinhar as cores de situação do painel com as do app | Fica como item **Could** no backlog (B-045), para uma etapa futura |
| Fotos, pessoas no local, necessidade especial | Fase 2 (B-031, B-032), **depois do redesign**. Entram **no passo 3 do Denunciar** (Etapa R6) |
| Ícone do app e splash novos (arquivos de imagem) | Pendência PEN-09; aqui só muda a cor de fundo |
| Busca por rua | A API (`q`) só procura bairro e folha |

## 3. Diagnóstico do estado atual

### 3.1 Cor e fonte escritas fora do tema

Os 7 arquivos que você encontrou se confirmam. A busca achou mais 3 casos de fonte (tamanho fixo e maiúsculas forçadas):

| Arquivo | O que está escrito à mão | Destino |
|---|---|---|
| `app/(app)/denunciar.tsx` | `rgba(206,131,0,0.25)` (aviso 409), `rgba(186,26,26,0.25)` (erro geral) | A tela é reescrita (R6); os avisos usam os tokens de situação |
| `components/MapaOcorrencias.tsx` | `rgba(...)` calculado para o preenchimento dos círculos | Some com os marcadores novos (R8) |
| `components/Button.tsx` | `#006E2C` (só no comentário), `fontSize: 16` | Reescrito (R2); tamanho vem de `type.button` |
| `components/AuthLayout.tsx` | `rgba(218,229,220,0.2)` (selo do cartão) | Cartão vira branco (R9) |
| `app/(auth)/login.tsx` | `rgba(186,26,26,0.25)` (erro geral) | Componente `Aviso` de erro (R2) |
| `app/(auth)/cadastro.tsx` | `rgba(186,26,26,0.25)`, `fontFamily: type.button.fontFamily` | Idem |
| `app/(app)/(tabs)/_layout.tsx` | `rgba(255,255,255,0.95)`, `fontSize: 12` | Barra nova (R3) |
| `components/StatusBadge.tsx` | `.toUpperCase()` | Caixa normal (R2) |
| `components/LocationStatusCard.tsx` | `.toUpperCase()` | Substituído pelo cartão da Início (R4) |
| `components/OccurrenceListItem.tsx` | `.toUpperCase()` | Cartão novo da lista (R5) |

### 3.2 Textos em maiúsculas, tamanhos abaixo de 14 e botões só com ícone

| Onde | Hoje | Depois |
|---|---|---|
| `denunciar.tsx` | "REGISTRO EM TEMPO REAL", "GPS ATIVO", "ENVIAR DENÚNCIA" | Tela reescrita: "Achamos pela localização do celular", "Enviar denúncia" |
| `login.tsx` / `cadastro.tsx` | "ENTRAR", "CADASTRAR" | "Entrar", "Cadastrar" |
| `denuncia/sucesso.tsx` | "PROTOCOLO" | "Número da denúncia" |
| `denuncia/[id].tsx` | "JUSTIFICATIVA DA OPERADORA", "PREVISÃO DE REPARO", "LOCAL", "DESCRIÇÃO", "HISTÓRICO" | Caixa normal ("Local", "Histórico"…) |
| `(tabs)/perfil.tsx` | "{n} EM ABERTO" | "{n} em aberto" |
| `Logo.tsx` | "MARABÁ • EM TEMPO REAL" em `type.tagline` (**8,5**) | Sai: a marca nova é o quadrado com raio + nome (o subtítulo, se ficar, usa `caption` 14) |
| `(tabs)/_layout.tsx` | rótulo da aba em 12 | 14 negrito |
| `theme/typography.ts` | `caption` 12, `label` 12, `tagline` 8,5, `logo` 19 com letterSpacing negativo | Escala nova (seção 3.4) |
| Botões só com ícone | `ReportFab` (só ícone), botão de perfil da Início (só ícone), "Fechar" do seletor de bairro (só ícone), "Voltar" do cabeçalho (só ícone), olho da senha | FAB some; perfil sai da Início (está na barra); "Voltar" e "Fechar" ganham texto; o olho ganha texto "Mostrar"/"Ocultar" |

O componente `ScreenPlaceholder` não é mais usado por nenhuma rota e pode ser apagado.

### 3.3 Tokens de cor: antigo → novo

| Token antigo | Onde é usado hoje | Novo |
|---|---|---|
| `action` (#006E2C) | 18 arquivos: botões, links, aba ativa | **`action` (#1D4ED8)**, mesmo nome |
| `primary` (#34A853) | só `ReportFab` | **Some** (o FAB some) |
| `brand900` (#16382B) | Início, Denunciar (cartão do formulário), AuthLayout, BannerDenunciar, Logo | **`brandNavy` (#0B1F3A)** só no Logo; os cartões escuros viram `surface` |
| `brand700` | ninguém | Some |
| `lime` / `mint` | Logo / links do cadastro | `lime` fica (só marca, nunca em fundo claro); `mint` some (links viram `action`) |
| `bgPage` (#F1FCF3) | 12 arquivos | **`bgPage` (#F6F7F9)**, mesmo nome |
| `bgCard` (#EBF7ED) | 10 arquivos (cartões) | **`surface` (#FFFFFF)** |
| `bgSoft` (#E5F1E7) | 8 arquivos (chips, selos, botão secundário) | `actionSoft` (fundo de ícone/selecionado) ou `surface` + `borderField` (chip não selecionado), caso a caso |
| `bgMuted` (#DAE5DC) | divisórias (SeletorDeBairro, StatusTimeline) | **`borderSubtle`** |
| `surfaceTint` / `surfaceMint` | selo "Normal" / rótulos sobre o cartão escuro (7 arquivos) | `situacao.normal.fundo` / some (sem cartão escuro, o rótulo usa `textSecondary`) |
| `white` | 13 arquivos | **`surface`** (cartões) ou `onAction` (texto sobre azul) |
| `textPrimary` / `textSecondary` | 23 / 24 arquivos | Mesmo nome, valores novos (#0F172A / #475569) |
| `textMuted` (#6E7A6D) | 7 arquivos | **Some**: vira `textSecondary` (o cinza claro não tem contraste para texto em 18) |
| `textOnDark`, `tagline` | ninguém / Logo | Somem |
| `status.noPower*`, `status.flicker*`, `status.restored*` | selos, mapa, erros de campo, aviso de conexão | **`situacao.semEnergia`, `situacao.oscilando`, `situacao.normal`**, cada um com `{ texto, fundo, marcador, iconeNoMarcador, icone }` |
| `complaintStatus.*` | `features/acompanhamento/status.ts` | **`andamento.*`** com `{ texto, fundo, icone }` |
| — | — | Novos: `actionPressed`, `actionSoft`, `actionTabPill`, `borderField`, `borderSubtle`, `borderDivider`, `disabledBg`, `disabledText`, `danger` (= texto de "sem energia", para erros de campo) |

**Erros de campo** passam a usar `danger` (#B42318, 6,6:1 sobre branco) com o ícone `warning`. **Aviso de conexão** ("Sem conexão", "Reconectando…") usa `situacao.oscilando` (texto #93370D sobre #FEF0C7, 6,6:1), com ícone.

### 3.4 Tipografia: antigo → novo

| Antigo | Uso | Novo |
|---|---|---|
| `display` (36) | ninguém | Some |
| `h1Large` (28) | sucesso, denunciar | **`title1`** 28/34 |
| `h1` (22) | 7 usos | **`title2`** 22/28 |
| `title` (18, semibold) | 8 usos | **`title3`** 20/26 |
| `subtitle` (16, semibold) | 15 usos | **`label`** 16/22 bold (títulos de cartão e nomes em lista) |
| `body` (14) | 48 usos | **`body`** 18/28 (texto base); onde o espaço é curto, `bodySmall` 16/24 |
| `button` (14) | 9 usos | **`button`** 18/24 bold |
| `caption` (12) | 20 usos | **`caption`** 14/20 (mínimo do app) |
| `label` (12, com letterSpacing) | 19 usos, quase todos com maiúsculas | **`label`** 16/22, sem letterSpacing |
| `logo`, `tagline` | Logo | Somem: a marca usa `title3`/`label` com a cor da marca |

Pesos: só **Regular 400** e **Bold 700** (Atkinson Hyperlegible não tem semibold). Pacote: `@expo-google-fonts/atkinson-hyperlegible` **0.4.1** (`npm view` em 2026-11-23). Remove `@expo-google-fonts/plus-jakarta-sans`.

### 3.5 Componentes afetados

| Componente | O que acontece |
|---|---|
| `Button` | Reescrito: `primario` (azul, 56, largura total), `secundario` (borda azul 2, fundo branco), `texto` (azul, negrito, sublinhado). `claro` some (era para cartão escuro). Desativado: `disabledBg`/`disabledText`, **sem opacidade** |
| `TextField` | 56 de altura, borda 2 `borderField`, canto 8, rótulo sempre acima; erro com borda `danger` + ícone `warning`. A variante `superficie="escura"` some |
| `Checkbox` | Sem variante escura; caixa com borda `borderField` |
| `StatusBadge` | Ícone + texto em caixa normal, cores de `andamento` |
| `FilterChip` | 48 de altura, ícone, selecionado azul cheio, não selecionado branco com borda `borderField` |
| **Novo `SeloDeSituacao`** | Selo da energia (Sem energia / Oscilando / Normal) com ícone de formato diferente |
| **Novo `CartaoDeEscolha`** | Cartão de rádio grande (≥ 104) para o passo 1 |
| **Novo `Cartao`** | Cartão branco, canto 16, sem sombra, borda opcional (`destaque` = borda azul 2) |
| **Novo `Aviso`** | Faixa de aviso com ícone (erro, atenção, informação), substitui os `rgba` |
| **Novo `CabecalhoDePasso`** | "Voltar" com texto, "Passo X de 3" e barra de 3 segmentos |
| `Logo` | Quadrado azul-noite com raio lima + nome |
| `ReportFab` | **Some** |
| `LocationStatusCard` | Substituído por `CartaoEnergiaDoBairro` (Início). No Mapa ele sai |
| `BannerDenunciar` | Some (vira o cartão da ação principal da Início) |
| `MapaOcorrencias` | Marcadores com ícone (R8); a zona vira linha tracejada sem preenchimento, só nos bairros afetados (decisão R-02, ajustada) |
| `OccurrenceListItem` | Cartão inteiro clicável com selo, nome, "Há X min" e "Ver" |
| `OpcoesSegmentadas`, `AvisoRecolhivel` | Deixam de ser usados no Denunciar (podem ser apagados) |
| `ContatosDeAtendimento` | Vira "Prefere falar com alguém?" com o botão de ligar |
| `CabecalhoDeTela`, `SeletorDeBairro`, `ComplaintListItem`, `StatusTimeline`, `Estados`, `AvisoDeConexao`, `MiniMapa`, `TopAuthBar`, `AuthLayout`, `DocumentoLegalView` | Recebem o tema; ajustes pontuais (texto no "Voltar"/"Fechar", tamanhos, sem maiúsculas) |

### 3.6 Contraste da paleta nova (calculado com a mesma fórmula de `theme/contrast.ts`)

Todos os pares de texto passam com folga (o menor é **5,11:1**, "Normal" sobre o próprio selo). Ícones e bordas passam (o menor é **4,44:1**, `borderField` sobre `bgPage`).

| Par | Razão | Mínimo |
|---|---|---|
| Branco / `action` | 6,70 | 4,5 |
| `action` / `actionSoft` | 6,08 | 4,5 |
| `actionPressed` / `actionTabPill` | 8,27 | 4,5 |
| `textSecondary` / `bgPage` | 7,07 | 4,5 |
| `disabledText` / `disabledBg` | 6,15 | 4,5 |
| `borderField` / branco · / `bgPage` | 4,76 · 4,44 | 3 |
| Sem energia (texto/selo · ícone branco/marcador) | 5,45 · 4,83 | 4,5 · 3 |
| Oscilando (texto/selo · ícone #1F2937/marcador) | 6,62 · 6,25 | 4,5 · 3 |
| Normal (texto/selo · ícone branco/marcador) | 5,11 · 5,69 | 4,5 · 3 |
| Recebida · Em atendimento · Resolvida | 9,45 · 9,40 · 5,11 | 4,5 |
| Lima / `brandNavy` | 10,96 | 3 |

**Um ponto de atenção:** o marcador de "Oscilando" (#F79009) contra a borda branca dá **2,35:1**. O que identifica o marcador é o ícone escuro (6,25:1) e o formato, e a borda branca serve para separá-lo do mapa, então ele cumpre o WCAG 1.4.11 pelo ícone. Mesmo assim, recomendo um contorno externo de 1 dp em #93370D (decisão R-14).

## 4. Estratégia de migração dos tokens

O risco é trocar 30 arquivos de uma vez e passar dias com o app quebrado. A migração vai em **três movimentos**, cada um com o app funcionando e os testes passando:

1. **Trocar valores mantendo nomes** (Etapa R1): `action`, `bgPage`, `textPrimary`, `textSecondary` mudam só de valor. Os tokens que **somem** (`bgCard`, `bgSoft`, `brand900`, `surfaceMint`, `textMuted`, `status.*`, `complaintStatus`) **continuam existindo por um tempo como apelidos** apontando para os valores novos, marcados com `/** @deprecated use X */`. O app inteiro já fica azul nesta etapa, sem tocar nas telas. Tipografia: a escala nova entra com os nomes novos, e os nomes antigos viram apelidos (`h1` → `title2`, `subtitle` → `label` etc.).
2. **Migrar tela por tela** (Etapas R2 a R9): cada etapa troca os apelidos pelos nomes novos nos arquivos que toca.
3. **Apagar os apelidos** (Etapa R10): o `tsc` aponta qualquer uso que sobrou. Um teste novo busca `#` e `rgba(` fora de `src/theme` e falha se encontrar.

## 5. Decisões (aprovadas em 2026-11-23)

| ID | Decisão |
|---|---|
| R-01 | **Denunciar em uma rota só**, com `passo` em estado e o mesmo `useForm`; cada passo valida só os seus campos com `trigger` (passo 1: `tipo`; passo 2: `bairroId`, `logradouro`, `cep`; passo 3: o schema inteiro no `handleSubmit`). O rascunho, o GPS, o 409 e o offline já vivem nesta tela e continuam num lugar só; um link direto não cai no meio do fluxo. O "voltar" do Android volta um passo (`BackHandler`) |
| R-02 | **Mapa com marcadores e a zona só como apoio** (ajustada em 2026-11-25, a pedido de Bruno): os marcadores (ícone + formato), um por ocorrência com coordenadas, são a informação principal. Os círculos de zona **deixam de ser preenchidos** e viram uma **linha tracejada de 2 dp, sem preenchimento, só em volta dos bairros afetados** (Sem energia e Oscilando), na cor de texto da situação. Bairro Normal não tem área. A situação de cada bairro continua na legenda, na lista e na Início. A zona é apoio visual: nada se perde sem ela, então ela não é a única pista (WCAG 1.4.1). O tracejado só existe no iOS: no Android a biblioteca não aceita (a linha fica contínua) |
| R-03 | **Lista "Lugares com aviso" agrupada por bairro, no app**, a partir das ocorrências públicas que já chegam (sem mudar a API). Um item por lugar: selo da situação, "Bairro (Folha)" em negrito, **"Há X min · N avisos"** e "Ver" com chevron. Regras do agrupamento: chave = bairro + folha; **"Há X min" conta a partir do aviso mais recente do grupo**; **N** = quantos avisos o grupo tem; **a situação do grupo é a mais grave** (Sem energia > Oscilando > Normal), a mesma regra do status do bairro (RN-007). Um aviso resolvido conta como Normal. "Ver" centraliza o mapa no bairro (o centro vem de `/bairros/status`, que o app já busca). **Se faltar algum campo na resposta e for preciso mudar a API, a implementação para e pergunta** |
| R-05 | Busca com o rótulo **"Procurar bairro ou folha"**: a API (`q`) só procura bairro e folha; **a API não muda** |
| R-06 | Chip **"Normal (n)"** continua sendo o filtro `RESTABELECIDO` da API (resolvidas nas últimas 24 h, S-21). Muda só o nome |
| R-07 | **"Trocar" endereço (Início):** abre o `SeletorDeBairro` que já existe. O bairro escolhido passa a valer no cartão "Energia no seu bairro agora" e fica salvo **só no aparelho** (AsyncStorage, uma chave por usuário, como o rascunho), **sem ir para o cadastro nem para a API**. O cartão mostra o botão de texto **"Usar minha localização"** para voltar ao GPS. Dados em cache e tempo real continuam funcionando, pois o cartão usa o status do bairro que já é buscado |
| R-08 | **"Ligar para a Equatorial":** abre o discador com `Linking.openURL('tel:…')`, usando o número de `constants.ts` (ainda placeholder, PEN-02). Se o aparelho não puder ligar (`canOpenURL` falso ou erro), mostra uma mensagem clara |
| R-09 | **Ajuda:** tela simples na rota **`/ajuda`**, aberta pelo botão "Ajuda" (ícone + texto) do cabeçalho da Início, com "Como funciona" (os mesmos 3 passos), o aviso "Fio caído ou risco de choque? Ligue 193", os contatos com "Ligar para a Equatorial" e os links para **Termos de Uso** e **Política de Privacidade**. Depois de criar a rota, regenerar o `typedRoutes` (`npx expo customize tsconfig.json`) |
| R-10 | **Login e cadastro com cartão branco** sobre `#F6F7F9`; o azul-noite fica só no logo |
| R-11 | **Ponto de referência só no passo 3.** A correção do passo 2 tem bairro, logradouro e CEP |
| R-12 | Ícones de **Improcedente** `close-circle-outline` e de **Cancelada** `ban-outline` |
| R-13 | Rótulos de situação e de andamento ficam num módulo novo de apresentação (`features/situacao.ts`). **`schemas.ts` não é tocado** |
| R-14 | **Contorno externo de 2 dp** por fora da borda branca de cada marcador do mapa, na cor de texto da própria situação (`#B42318`, `#93370D`, `#067647`), para o marcador ter pelo menos 3:1 contra o mapa. **O caso "Oscilando" entra no teste de contraste** (contra fundos típicos de mapa: ruas e terreno claros, parque verde, água e a própria borda branca) |
| R-15 | **Fonte do sistema em 200%:** nada de `maxFontSizeMultiplier` nas telas. Exceção possível só nos rótulos da barra inferior, limitados a 1,5× se quebrarem a barra no teste em aparelho, e registrada como exceção |
| R-16 | **Painel fora do escopo**, com tema próprio. Item **Could B-045** no backlog para alinhar as cores de situação do painel |

## 6. Etapas

Todas as etapas estão **dentro do escopo**. Estimativa: **P** ≈ 1–2 h · **M** ≈ 3–5 h · **G** ≈ 6–8 h (uma pessoa, com a atualização dos testes e da documentação da etapa incluídas). **Cada etapa só começa depois do "ok" da anterior.**

### R0 · Preparação (P)

- Bruno: `git checkout develop`, `git pull` e `git checkout -b feature/redesign-v2` (a `develop` já tem a Fase 1, PR #4).
- Abrir o PR em rascunho para a `develop`.
- Commit do plano (`docs/17`) e da atualização do backlog (`docs/14`).
- **Pronto quando:** a branch existe, o plano está commitado e a suíte inteira passa nela, sem mudanças de código.

### R1 · Tokens e fonte (M)

| Arquivo | Conteúdo |
|---|---|
| `theme/colors.ts` | Paleta nova (seção 3.3) + `situacao` + `andamento`; apelidos `@deprecated` para os nomes antigos |
| `theme/typography.ts` | Escala nova (seção 3.4) com Atkinson Hyperlegible; apelidos dos nomes antigos |
| `theme/spacing.ts` | Espaços 4–48 (`xxxl: 48`), cantos (`campo 8`, `botao 12`, `cartao 16`, `pilula`), `size.button 56`, `size.field 56`; `shadow` só `flutuante` |
| `app/_layout.tsx` | Carrega `AtkinsonHyperlegible_400Regular` e `_700Bold` |
| `package.json` | + `@expo-google-fonts/atkinson-hyperlegible` 0.4.1; − `plus-jakarta-sans` |
| `app.config.ts` | Splash e ícone adaptativo com fundo `#0B1F3A` |
| `theme/theme.test.ts` | Reescrito (seção 7) |

**Pronto quando:** o app abre inteiro azul e com a fonte nova, e a suíte passa (só `theme.test.ts` e o mock de fonte em `guarda-de-rotas.test.tsx` mudam).

### R2 · Componentes base (G)

`Button`, `TextField`, `Checkbox`, `StatusBadge`, `FilterChip`, `Logo`, `Estados`, `AvisoDeConexao`, `CabecalhoDeTela` (com "Voltar" em texto) e os novos `Cartao`, `Aviso`, `SeloDeSituacao`, `CartaoDeEscolha` e `CabecalhoDePasso`; `features/situacao.ts` (R-13).

**Pronto quando:** `componentes.test.tsx` cobre cada componente novo (papel, estado, altura ≥ 48/56, ícone + texto) e as telas antigas continuam funcionando com os componentes novos.

### R3 · Barra inferior (P)

`(tabs)/_layout.tsx` com 4 itens com texto. "Ocorrências" vira **"Mapa"** só no rótulo (a rota `/ocorrencias` fica). "Denunciar" vira um item normal (pílula azul 56×32 + texto azul) que abre `/denunciar`. Aba ativa com pílula `actionTabPill` e texto `actionPressed`; fundo branco com borda superior `borderSubtle`. Apaga `ReportFab`.

**Pronto quando:** o teste de navegação acha os 4 botões pelo nome e "Denunciar" abre o formulário.

### R4 · Início, Trocar bairro e Ajuda (G)

Cabeçalho com Logo e o botão **"Ajuda"** (ícone + texto); "Olá, {nome}"; cartão **"Energia no seu bairro agora"** (ícone grande, situação em `title2` na cor dela, frase de apoio, divisória, endereço com pino e **"Trocar"**); cartão de ação principal com **"Fazer denúncia"**; atalhos **"Ver onde falta energia"** e **"Minhas denúncias"**; "Como funciona" (3 frases novas); **"Prefere falar com alguém?"** com **"Ligar para a Equatorial"** (R-08). O mini-mapa sai. Os estados de GPS (buscando, negado, fora de Marabá, erro, offline) continuam, no visual novo.

| Arquivo | Conteúdo |
|---|---|
| `app/(app)/(tabs)/index.tsx`, `components/CartaoEnergiaDoBairro.tsx` | Layout novo; o cartão usa o bairro escolhido, se houver, senão o do GPS |
| `features/ocorrencias/bairro-escolhido.ts` | Leitura, gravação e limpeza do bairro escolhido, **só em AsyncStorage** (chave por usuário, valores validados como no rascunho; nada vai para a API) |
| `providers/LocalizacaoProvider.tsx` | Passa a expor `bairroEscolhido`, `escolherBairro(id)` e `usarMinhaLocalizacao()`; a Início e o Mapa leem o mesmo valor |
| `app/(app)/ajuda.tsx` | **Nova rota `/ajuda`** (R-09): "Como funciona", aviso do **193**, contatos, "Ligar para a Equatorial", links para `/termos` e `/privacidade`; `CabecalhoDeTela` com "Voltar" |
| `components/BotaoLigar.tsx` | `Linking.canOpenURL`/`openURL('tel:…')` com mensagem clara se o aparelho não puder ligar; usado na Início e na Ajuda |
| `app/(app)/_layout.tsx` | Registra a rota `ajuda`; regenerar o `typedRoutes` |

**Pronto quando:** os testes da Início passam com os textos novos (estados, evento `bairro:status-atualizado`, "Trocar" → bairro escolhido → "Usar minha localização" volta ao GPS, bairro escolhido sobrevive a fechar e reabrir, **nada é enviado à API**); a Ajuda abre pelo botão e mostra tudo; "Ligar" chama `tel:` e mostra a mensagem quando não dá.

### R5 · Mapa, parte 1: cabeçalho, chips e lista agrupada (G)

`(tabs)/ocorrencias.tsx`: título **"Onde falta energia"**, "Marabá · atualizado há X min" (de `atualizadoEm`), busca **"Procurar bairro ou folha"** (R-05), chips com ícone e contagem ("Todos", "Sem energia", "Oscilando", "Normal"), lista **"Lugares com aviso (n)"** **agrupada por bairro** (R-03). O `LocationStatusCard` e o banner saem desta tela. O mapa continua o atual nesta etapa.

| Arquivo | Conteúdo |
|---|---|
| `features/ocorrencias/agrupar.ts` | **Função pura** `agruparPorBairro(ocorrencias, bairros)` → `{ chave, nome, folha, situacao, avisos, maisRecente, centro }[]`: situação mais grave do grupo, contagem, aviso mais recente, centro do bairro (de `/bairros/status`); ordem: mais grave primeiro e, empatando, o aviso mais recente primeiro |
| `components/LugarComAviso.tsx` | Cartão inteiro clicável com `SeloDeSituacao`, nome em negrito, "Há X min · N avisos" e "Ver" com chevron |

**Pronto quando:** `agrupar.test.ts` cobre precedência de situação, contagem, "mais recente", empate, grupo só com resolvidas (Normal), bairro sem centro e lista vazia; os testes de chips, busca, vazio, erro, offline e tempo real passam com os textos novos.

### R6 · Denunciar em 3 passos (G)

Reescrita de `denunciar.tsx` (R-01), reaproveitando `useGps`, `useBairros`, `useCriarDenuncia`, o rascunho e o `MiniMapa`.

| Passo | Conteúdo | Avança quando |
|---|---|---|
| 1 · "O que está acontecendo?" | Dois `CartaoDeEscolha` ("Estou sem energia", "A energia está oscilando"), aviso de segurança com **193**, "Continuar" no rodapé fixo (desativado com "Escolha uma opção para continuar") | `trigger('tipo')` |
| 2 · "Onde está faltando energia?" | Mini-mapa com pino, "Achamos pela localização do celular", endereço (rua em `title3`, bairro e cidade), "Este endereço está certo?", **"Sim, está certo"** e **"Não, quero corrigir"** (abre bairro, logradouro e CEP). Estados de GPS negado e carregando, no visual novo; sem GPS os campos já vêm abertos | `trigger(['bairroId','logradouro','cep'])`; se falhar, os campos abrem com os erros |
| 3 · "Quer contar mais alguma coisa?" | Descrição e ponto de referência opcionais, **resumo** (tipo, endereço, bairro), **"Enviar denúncia"**. O aviso de 409 ("Ver minha denúncia"), os erros do servidor (que levam de volta ao passo do campo com erro) e o aviso offline ficam aqui | `handleSubmit` com o schema inteiro |

Cabeçalho em todos os passos: **"Voltar"** (no passo 1 fecha a tela), "Passo X de 3" e a barra de progresso. O rascunho continua salvo a cada alteração; ao reabrir, a tela volta ao passo 1 com tudo preenchido.

> **Fase 2:** fotos (B-031), pessoas no local e necessidade especial (B-032) entram **no passo 3**, acima do resumo, sem mudar os passos 1 e 2.

**Pronto quando:** todos os cenários do `denunciar.test.tsx` atual passam no fluxo de 3 passos (com um auxiliar `irAtePasso3`), mais os testes de navegação novos (seção 7).

### R7 · Denúncia enviada (P)

`denuncia/sucesso.tsx`: círculo verde-claro com visto, "Denúncia enviada!", o texto novo, cartão com **número da denúncia**, selo "Recebida" e local, **"Acompanhar minha denúncia"** e **"Voltar ao início"**. O local vem por parâmetro da rota (`bairro` e `logradouro`, que o app já tem no envio); o botão "Copiar" continua.

**Pronto quando:** `sucesso.test.tsx` passa com os textos novos e com o local.

### R8 · Mapa, parte 2: marcadores (G)

`MapaOcorrencias`: marcadores de 40 dp com **borda branca de 3 e contorno externo de 2 na cor da situação** (R-14) e o ícone da situação (o de "Normal" é **quadrado**), com `tracksViewChanges={false}`; ponto azul de "você está aqui" (`showsUserLocation`); botão flutuante **"Onde estou"** (ícone + texto, a única sombra do app); a **zona** de cada bairro afetado vira uma linha tracejada de 2 dp, sem preenchimento, na cor de texto da situação (R-02 ajustada; sem `rgba`); legenda com os 3 marcadores e texto; "Ver" na lista centraliza o mapa no bairro do grupo.

**Risco:** marcadores com `View` dentro do `react-native-maps` precisam ser vistos no Expo Go (Android e iOS). Se falharem, o plano B (a combinar com Bruno) é um ícone em imagem para o marcador; a lista mantém ícone e texto de qualquer forma.

**Pronto quando:** testes de marcador (ícone e formato por situação, quadrado para Normal), de "Onde estou" (centraliza no GPS; mensagem clara se não houver localização) e de "Ver"; contraste do contorno testado (7.2).

### R9 · Ajustes nas demais telas (M)

| Tela | Ajuste |
|---|---|
| Login e cadastro (`AuthLayout`, `TopAuthBar`) | **(feito na R9)** Cartão branco (R-10), sem variante escura dos campos; "Entrar"/"Cadastrar" em caixa normal; erro geral com `Aviso`; links do texto dos termos em `action` sublinhado |
| Perfil | "{n} em aberto"; "Sair" vira botão secundário |
| Minhas denúncias | Cartões com `StatusBadge` novo (ícone + texto em caixa normal) |
| Detalhe | Rótulos em caixa normal; justificativa em `Aviso`; `StatusTimeline` com os ícones de andamento |
| `SeletorDeBairro` | "Fechar" com texto; itens com 56 de altura |
| Termos e Privacidade | Só o tema |

### R10 · Limpeza e documentação (M)

**(feito)** Apagar os apelidos `@deprecated`, `ReportFab`, `ScreenPlaceholder`, `OpcoesSegmentadas`, `AvisoRecolhivel`, `BannerDenunciar` e `LocationStatusCard` (o que não for mais usado; também saíram `ContatosDeAtendimento` e `OccurrenceListItem`); teste que proíbe cor/fonte fora do tema; documentação da seção 9.

## 7. Testes

### 7.1 O que vai quebrar e como atualizar

| Arquivo (testes) | Por quê | Como atualizar |
|---|---|---|
| `theme/theme.test.ts` (10) | Regras de D-01 (verde `#006E2C`, âmbar `#855300`, `primary` < 4,5) deixam de existir | Reescrever: tabela de pares (7.2), escala de fonte (nenhum token < 14, sem letterSpacing negativo), alvos 48/56 |
| `components/componentes.test.tsx` (21) | Variantes do `Button`, olho da senha, `TopAuthBar` | Atualizar variantes e rótulos; somar os componentes novos |
| `__tests__/home-ocorrencias.test.tsx` (39) | Textos da Início ("Registre sua denúncia", "Ver mapa ampliado", "REDE ESTÁVEL/INSTÁVEL", "Meu perfil", mini-mapa) e do Mapa ("Sem luz (1)", "Oscilação (1)", "Restabelecidos (1)", "Localização atual", "SEM LUZ") | Reescrever a parte da Início; no Mapa, trocar textos e adaptar os testes de círculo à zona de apoio (R-02 ajustada) |
| `__tests__/denunciar.test.tsx` (28) | Formulário vira 3 passos; "ENVIAR DENÚNCIA", "GPS ATIVO", "Onde faltou luz?", "Antes de enviar" somem | Auxiliares `escolherTipo`, `confirmarEndereco`, `irAtePasso3`; os mesmos cenários de corpo enviado, 409, rascunho, offline, GPS negado e erros do servidor |
| `__tests__/sucesso.test.tsx` (5) | "Acompanhar denúncia", "PROTOCOLO" | Textos novos + local |
| `__tests__/guarda-de-rotas.test.tsx` (20) | Mock de `plus-jakarta-sans`; abas ("Ocorrências", "Denunciar falta de luz"); "Olá, Maria!"; "Onde faltou luz?" | Mock da Atkinson; nomes novos das abas e dos títulos |
| `__tests__/acompanhamento.test.tsx` (22), `__tests__/offline.test.tsx` (9) | Selos em maiúsculas ("RECEBIDA", "EM ATENDIMENTO", "RESOLVIDA"), "1 EM ABERTO" | Caixa normal |
| `features/ocorrencias/ocorrencias.test.ts` (15) | Rótulos dos chips e cores `colors.status.*` | Rótulos novos e `colors.situacao.*` |
| `features/denuncia/*.test.ts`, `services/*`, `store/*`, `legal/*`, `features/auth/*` | Lógica sem mudança | **Não devem mudar.** Se mudarem, é sinal de regressão |

Estimativa: **~140 dos 424 testes** do app são tocados (a maioria só no texto procurado).

### 7.2 Testes novos

- **Contraste:** um teste por linha da seção 3.6 (todos os pares de texto ≥ 4,5:1 e de ícone/borda ≥ 3:1), lidos dos próprios tokens.
- **Regras do tema:** nenhum token de fonte < 14; nenhum `letterSpacing` < 0; uma busca nos arquivos de `src/app` e `src/components` falha se achar `#RRGGBB`, `rgba(`, `fontSize:` ou `toUpperCase()` fora de `src/theme`.
- **Contorno dos marcadores (R-14):** `#B42318`, `#93370D` e `#067647` contra fundos típicos de mapa (`#F2EFE9` terreno, `#E5E3DF` ruas, `#C8E6C9` parque, `#AADAFF` água) e contra a borda branca: ≥ 3:1 em todos; o caso **Oscilando** é um teste próprio.
- **Agrupamento por bairro:** `agruparPorBairro` (precedência de situação, contagem, mais recente, empate, só resolvidas).
- **Trocar bairro e Ajuda:** bairro escolhido salvo só no aparelho (nenhuma chamada à API), "Usar minha localização", Ajuda com os 3 passos, 193, contatos e links, e "Ligar" com e sem suporte a `tel:`.
- **Situação nunca só por cor:** `SeloDeSituacao` e `StatusBadge` sempre com ícone e texto, para cada valor.
- **Barra inferior:** 4 itens com texto; aba ativa com `selected`; "Denunciar" abre `/denunciar`.
- **Denunciar:** "Continuar" desativado sem escolha; 1 → 2 → 3 e voltar; "Voltar" no passo 1 fecha; "Não, quero corrigir" abre os campos; GPS negado já abre os campos; endereço inválido não avança; erro do servidor em `logradouro` leva de volta ao passo 2; 409 no passo 3; rascunho restaurado no passo 1; botão de voltar do Android volta um passo; "Passo X de 3" anunciado.
- **Início e Mapa:** cartões, atalhos, chips com ícone e estado, lista clicável.

## 8. Acessibilidade

- **Alvos:** mínimo 48 com 8 de espaço entre eles; botões e campos com 56 (`minHeight`, nunca `height` fixa, para crescer com a fonte).
- **Papéis e estados:** `CartaoDeEscolha` com `accessibilityRole="radio"` e `accessibilityState={{ checked }}` dentro de um `radiogroup` rotulado; chips com `radio` + `selected`; abas com `selected`; "Continuar" desativado com `disabled`.
- **Passos:** o título de cada passo é `header`; a barra de progresso é `progressbar` com `accessibilityValue={{ min: 1, max: 3, now: passo }}`; ao trocar de passo, o foco vai para o título e o leitor de tela anuncia "Passo 2 de 3: Onde está faltando energia?" (`AccessibilityInfo.announceForAccessibility`).
- **Cor nunca sozinha (WCAG 1.4.1):** toda situação e todo andamento têm ícone de formato diferente e texto.
- **Fonte em 200% (RNF-018):** teste manual em aparelho Android (Tamanho da fonte no máximo) e iOS (Tamanhos maiores) em Início, Mapa, os 3 passos e Sucesso; nada cortado, rolagem funcionando, rodapé fixo do Denunciar sem cobrir os campos. Exceção possível só na barra (R-15).
- **Leitores de tela:** TalkBack em todo o fluxo de denúncia antes do merge.

## 9. Documentação a atualizar

| Documento | O que muda |
|---|---|
| `docs/06-design-system.md` | **Reescrito:** princípios, paleta, situação, andamento, tipografia, espaços, componentes |
| `docs/05-telas-e-fluxos.md` | Barra (Mapa, sem FAB), Início, Mapa, Denunciar em 3 passos, Sucesso; diagrama de navegação |
| `docs/12-acessibilidade.md` | Contrastes novos, fonte de baixa visão, cor nunca sozinha, anúncios dos passos, exceção R-15 se houver |
| `docs/01-visao-e-escopo.md` | **S-44** (paleta e fonte novas, "Ocorrências" → "Mapa" no rótulo, Denunciar em 3 passos); **D-01 substituída** |
| `docs/adr/0006-redesign-design-system-v2.md` | **Novo ADR:** público leigo e idoso, cor nunca sozinha (WCAG 1.4.1), conflito do verde da marca com o verde de "Normal", fonte para baixa visão, uma ação por tela |
| `docs/08-tecnologias.md` | Atkinson Hyperlegible 0.4.1 no lugar da Plus Jakarta Sans |
| `docs/14-roadmap-e-backlog.md` | Item novo do redesign e o impacto no cronograma da Fase 2 |
| `CHANGELOG.md` | Seção do redesign |
| `CLAUDE.md` | Seção "Design" (tokens novos, situação sempre com ícone, sem maiúsculas) e as menções à Plus Jakarta |
| `README.md` | Roteiro de demonstração com os textos novos ("Fazer denúncia", aba "Mapa", 3 passos) |

## 10. Estimativa e ordem

O prazo foi estendido: **o redesign inteiro entra, e a Fase 2 vem depois**, já com os componentes novos (a ordem está em [14](14-roadmap-e-backlog.md)).

| Etapa | Estimativa |
|---|---|
| R0 Preparação | P (0,5 h) |
| R1 Tokens e fonte | M (4 h) |
| R2 Componentes base | G (7 h) |
| R3 Barra inferior | P (2 h) |
| R4 Início, Trocar e Ajuda | G (8 h) |
| R5 Mapa (chips e lista agrupada) | G (6 h) |
| R6 Denunciar em 3 passos | G (8 h) |
| R7 Sucesso | P (1,5 h) |
| R8 Marcadores do mapa | G (7 h) |
| R9 Demais telas | M (4 h) |
| R10 Limpeza e documentação | M (4 h) |
| **Total** | **≈ 52 h** (cerca de 6 a 7 dias de trabalho de uma pessoa, mais a verificação em aparelho a cada etapa) |

## 11. Riscos

| Risco | Mitigação |
|---|---|
| Marcadores com ícone falharem no Expo Go | Verificação em aparelho já na R8; plano B combinado com Bruno antes de mudar (seção R8) |
| Reescrita do Denunciar quebrar rascunho, 409 ou offline | Os 28 testes atuais são portados **antes** de apagar a tela antiga; a etapa só fecha com todos passando |
| Fonte nova maior quebrar layouts | `minHeight` em vez de `height`; teste em 200% em aparelho a cada etapa de tela |
| Muitos testes quebrando de uma vez | Migração em três movimentos (seção 4); cada etapa termina com a suíte verde |
| Agrupamento precisar de campo que a API não devolve | **Parar e perguntar**; hoje a resposta traz bairro, folha, tipo, status, coordenadas arredondadas e data, o suficiente |
| A troca de paleta afetar o painel | O painel tem `tokens.css` próprio e **não muda**; alinhar as cores de situação é o item Could B-045 |

**Impacto no roteiro de demonstração (README):** os passos continuam os mesmos, com textos novos: "Fazer denúncia" no lugar de "Registre sua denúncia", a aba **Mapa** no lugar de Ocorrências, o envio em 3 passos e os selos "Sem energia / Oscilando / Normal". O README é atualizado na R10.

## 12. Sequência de commits sugerida

0. `docs: adiciona plano do redesign do app e atualiza o backlog` (R0)
1. `chore(mobile): adiciona Atkinson Hyperlegible e tokens do design system v2` (R1)
2. `feat(mobile): reescreve componentes base no design system v2` (R2)
3. `feat(mobile): barra inferior com texto em todos os itens e aba Mapa` (R3)
4. `feat(mobile): nova tela inicial com energia do bairro, trocar bairro e ajuda` (R4)
5. `feat(mobile): mapa com chips de situação e lugares agrupados por bairro` (R5)
6. `feat(mobile): denúncia em 3 passos` (R6)
7. `feat(mobile): nova tela de denúncia enviada` (R7)
8. `feat(mobile): marcadores do mapa com ícone e botão onde estou` (R8)
9. `style(mobile): aplica o design system v2 nas demais telas` (R9)
10. `refactor(mobile): remove tokens e componentes antigos` + `docs: design system v2 e ADR-0006` (R10)

Cada commit de etapa inclui os testes e a documentação daquela etapa (seção 9).

## 13. Decisões

Todas as decisões R-01 a R-16 foram **aprovadas em 2026-11-23** (seção 5). Pendência de produto que **não bloqueia**: o número real do telefone da Equatorial (PEN-02), hoje um placeholder.
