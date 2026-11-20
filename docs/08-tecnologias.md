# 08 – Tecnologias

As versões das tabelas abaixo eram **alvo**. Na Fase 0 elas foram **fixadas com `npm view`** (S-20, PEN-10) e estão registradas na seção [Versões fixadas na Fase 0](#versões-fixadas-na-fase-0) no fim deste documento, que **prevalece** sobre as colunas "Versão-alvo". O Expo SDK define as versões compatíveis de React Native, React e módulos nativos: usar `npx expo install` para esses pacotes.

## Concordância com a stack proposta

A stack preferida (React Native + Expo + TypeScript no app; Node.js + PostgreSQL + Prisma no backend) está **mantida**. Ajustes e pontos de atenção:

1. **Painel em React + Vite** e **Socket.IO** entram pelo requisito de tempo real e pela integração simulada ([ADR-0001](adr/0001-integracao-simulada-com-operadora.md), [ADR-0002](adr/0002-socketio-para-tempo-real.md)).
2. **Push remoto não funciona no Expo Go em Android recente.** A partir do SDK 53 o Expo Go deixou de suportar push remoto no Android (verificar na documentação do SDK adotado). Para demonstrar push é preciso um **development build** (`expo-dev-client` + EAS Build). Como o push é Should, o MVP funciona sem ele; o tempo real dentro do app (WebSocket) é suficiente para o Must.
3. **Mapas:** `react-native-maps` funciona no Expo Go; para builds de produção no Android é preciso chave do Google Maps (PEN-04).
4. **Monorepo com npm workspaces** (e não pnpm/Yarn PnP) para evitar atritos do Metro com dependências simbólicas ([ADR-0003](adr/0003-monorepo-com-tres-aplicacoes.md)).

## App do cidadão (`apps/mobile`)

| Tecnologia | Versão-alvo | Para que serve | Por que foi escolhida | Alternativas consideradas |
|---|---|---|---|---|
| React Native + **Expo** | Expo SDK estável mais recente (≥ 54) | Base do app Android/iOS | Domínio da equipe; build e *OTA* simples; módulos de câmera, localização e push prontos | React Native CLI (mais configuração nativa); Flutter (outra linguagem) |
| TypeScript | 5.x | Tipagem estática | Menos erros; contratos compartilháveis com a API | JavaScript puro |
| **Expo Router** | Compatível com o SDK | Navegação por arquivos, tabs e modais | Convenção simples, *deep link* (abrir detalhe pelo push) | React Navigation direto |
| `react-native-maps` | Compatível com o SDK | Mapa, círculos, pinos | Funciona no Expo Go; API madura | Mapbox (conta/tarifa), `expo-maps` (ainda em evolução) |
| `expo-location` | Compatível com o SDK | GPS e geocodificação reversa | Módulo oficial, permissões simples | `react-native-geolocation` |
| `expo-image-picker` | Compatível com o SDK | Fotos da câmera/galeria | Oficial, permissões e redimensionamento | `react-native-image-picker` |
| `expo-notifications` | Compatível com o SDK | Push e notificações locais | Integra com Expo Push Service | OneSignal, Firebase direto |
| `socket.io-client` | 4.x | Tempo real | Reconexão automática e salas ([ADR-0002](adr/0002-socketio-para-tempo-real.md)) | WebSocket nativo, SSE |
| **TanStack Query** | 5.x | Cache e sincronização de dados do servidor | Cache, revalidação e persistência offline simples | Redux Toolkit Query, SWR |
| **Zustand** | 5.x | Sessão e preferências | Pequeno e sem *boilerplate* | Redux, Context puro |
| React Hook Form + **Zod** | 7.x / 3.x–4.x | Formulários e validação | Validação tipada; schemas reaproveitáveis | Formik + Yup |
| `expo-secure-store` | Compatível com o SDK | Guardar o token | Keychain/Keystore | AsyncStorage (inseguro para token) |
| `@react-native-async-storage/async-storage` | Compatível com o SDK | Cache persistido e rascunho | Padrão da comunidade | MMKV |
| `@react-native-community/netinfo` | Compatível com o SDK | Detecção de rede | Padrão | — |
| `@expo-google-fonts/plus-jakarta-sans` | Última | Fonte do design | Fiel ao Figma | Fonte do sistema |
| Estilização | `StyleSheet` + tema próprio | Visual | Controle total do design do Figma | NativeWind, Tamagui, UI kits |

## Painel da operadora (`apps/painel`)

| Tecnologia | Versão-alvo | Para que serve | Por que foi escolhida | Alternativas |
|---|---|---|---|---|
| React | 19.x | UI | Mesma linguagem do app; reuso de conhecimento | Vue, Angular |
| **Vite** | 7.x | Build e *dev server* | Rápido, configuração mínima | Next.js (SSR desnecessário), CRA (descontinuado) |
| TypeScript | 5.x | Tipagem | Consistência | — |
| React Router | 7.x | Rotas | Padrão | TanStack Router |
| **Leaflet** (+ `react-leaflet`) | 1.9.x / 5.x | Mapa | Sem chave de API, OpenStreetMap | Google Maps JS, Mapbox GL |
| `socket.io-client` | 4.x | Tempo real | Idem app | — |
| TanStack Query | 5.x | Dados | Idem app | — |

## Backend (`apps/api`)

| Tecnologia | Versão-alvo | Para que serve | Por que foi escolhida | Alternativas |
|---|---|---|---|---|
| **Node.js** | 24 LTS (mín. 22 LTS) | Runtime | Domínio da equipe; mesma linguagem do front | Deno, Bun |
| **Express** | 5.x | HTTP/REST | Simples e conhecido | Fastify (mais rápido, curva maior), NestJS (pesado para o MVP) |
| **Socket.IO** | 4.x | Tempo real, salas por papel e usuário | Salas, reconexão e *fallback* embutidos ([ADR-0002](adr/0002-socketio-para-tempo-real.md)) | `ws`, SSE, Pusher/Ably |
| **PostgreSQL** | 17 (ou mais recente estável) | Banco relacional | Integridade, índices parciais (RN-006), pronto para PostGIS no futuro | MySQL, MongoDB, SQLite |
| **Prisma** | 6.x ou superior | ORM e *migrations* | Domínio da equipe; tipos gerados; migrations versionadas | TypeORM, Drizzle, Knex |
| `jsonwebtoken` (ou `jose`) | Última | JWT | Padrão ([ADR-0004](adr/0004-autenticacao-jwt-com-rbac.md)) | Sessão em cookie, Auth0/Firebase Auth |
| `bcrypt` (ou `bcryptjs`) | Última | Hash de senha | Padrão consolidado | argon2 |
| Zod | 3.x–4.x | Validação de entrada | Mesmo esquema do app | Joi, class-validator |
| `multer` | 2.x | Upload de fotos | Padrão com Express | `busboy` direto |
| `express-rate-limit`, `helmet`, `cors` | Últimas | Segurança básica | Cobrem S-18 e RNF-014 | — |
| `expo-server-sdk` | Última | Enviar push | Cliente oficial do Expo Push | FCM direto |
| `pino` | 9.x | Logs | Rápido, estruturado | winston |

## Qualidade, testes e entrega

| Tecnologia | Versão-alvo | Para que serve | Por que foi escolhida | Alternativas |
|---|---|---|---|---|
| **Vitest** | 3.x ou superior | Testes unitários e de integração (API e painel) | Rápido, TypeScript nativo, mesma configuração do Vite | Jest |
| **Supertest** | Última | Testes de API HTTP | Padrão com Express | — |
| **Jest** + `jest-expo` | Compatível com o SDK | Testes do app | Suporte oficial do Expo | Vitest (sem suporte nativo ao RN) |
| React Native Testing Library | Última | Testes de componentes | Foco em comportamento | Enzyme (obsoleto) |
| Playwright | Última | E2E do painel (Could) | Estável e rápido | Cypress |
| Maestro | Última | E2E do app (Could) | Fluxos em YAML, simples | Detox |
| **ESLint** (flat config) + typescript-eslint | 9.x | Lint | Padrão | Biome |
| **Prettier** | 3.x | Formatação | Padrão | Biome |
| Husky + lint-staged + commitlint | Últimas | Hooks e Conventional Commits | Padroniza commits (CONTRIBUTING) | — |
| **GitHub Actions** | — | CI: lint + testes (+ PostgreSQL de serviço) | Integrado ao GitHub | GitLab CI |
| **EAS Build** (opcional) | — | *Development build* e APK/IPA | Necessário para push e para entregar o app instalável | Build local com Android Studio/Xcode |
| **Docker Compose** | — | PostgreSQL local | Ambiente reproduzível (RNF-022) | Instalação local do Postgres |
| **npm workspaces** | npm 10+ | Gerenciar o monorepo | Zero ferramentas extras | pnpm, Turborepo, Nx |

## Decisões por tema solicitado

- **Mapas e geolocalização:** `react-native-maps` + `expo-location` no app; Leaflet + OpenStreetMap no painel. Detalhes na seção 6 de [07](07-arquitetura.md).
- **Notificações push:** Expo Notifications + Expo Push Service; envio pelo servidor com `expo-server-sdk`. Exige *development build*.
- **Autenticação:** JWT assinado pelo servidor, senhas com bcrypt, RBAC `CIDADAO`/`OPERADOR` ([ADR-0004](adr/0004-autenticacao-jwt-com-rbac.md)). Sem provedor externo (login com Google fora do MVP).
- **Testes:** Vitest/Jest/Supertest com foco nas regras de negócio ([13](13-estrategia-de-testes.md)).
- **Lint e formatação:** ESLint + Prettier com `.editorconfig`; Husky + commitlint para Conventional Commits.
- **CI/CD:** GitHub Actions executando lint e testes em cada PR (rascunho em `.github/workflows/ci.yml`). CD fica fora do MVP; a entrega é um build de desenvolvimento via EAS e a demonstração local ou em uma VPS.

## Versões fixadas na Fase 0

Fonte: `package.json` de cada app (2026-11-18), escolhidas com `npm view`. Estas versões foram **instaladas e validadas** em 2026-11-18 (`npm install`, lint, tipos, testes e build; ver `CHANGELOG.md`). Para o app, o `npx expo install` acrescentou `jest-expo ~58.0.15`, `jest ~30.5.2`, `@expo-google-fonts/plus-jakarta-sans ^0.4.2` e `@expo/vector-icons ^15.0.2`.

| Área | Pacote | Versão fixada | Observação |
|---|---|---|---|
| Monorepo | Node.js / npm | 24 LTS (mín. 22) / npm 11 | `engines.node >= 22` |
| Todos | TypeScript | `~6.0.3` | Mesma versão do template do Expo SDK 58 |
| App | Expo SDK | `~58.0.26` | Template oficial `create-expo-app` (SDK 58) |
| App | React / React Native | `19.3.0` / `0.88.1` | Definidos pelo SDK |
| App | Expo Router | `~58.0.32` | Rotas em `src/app/` |
| App | Testes | `jest-expo` + Jest | Via `npx expo install` |
| Painel | React / React DOM | `19.3.0` | Mesma versão do app (uma só cópia) |
| Painel | Vite / plugin-react | `^7.3.8` / `^5.2.0` | A linha 8 do Vite existe, mas a 7 é a estável e conhecida do projeto |
| Painel | Vitest / jsdom / Testing Library | `^3.2.7` / `^26.1.0` / `^16.3.3` | — |
| Painel | React Router | `^7.18.5` | — |
| API | Express | `^5.3.0` | — |
| API | Socket.IO | `^4.8.4` | — |
| API | **Prisma / @prisma/client** | **`^6.19.3`** | O `latest` do npm é 8.0.0-rc (pré-lançamento) e a 7.x exige `prisma.config.ts` e *driver adapters*; ficamos na 6.x estável (migração futura) |
| API | PostgreSQL (Docker) | `17` | `docker-compose.yml` |
| API | Zod | `^4.6.7` | — |
| API | bcryptjs | `^3.0.3` | JS puro (evita compilação nativa no Windows) |
| API | Vitest / Supertest / tsx | `^3.2.7` / `^7.3.2` / `^4.23.15` | — |
| Qualidade | ESLint | `^9.39.5` | A 10.x existe; a 9 é a usada pelo `eslint-config-expo` |
| Qualidade | typescript-eslint | `^8.73.0` | — |
| Qualidade | Prettier | `^3.0.0` | Config em `.prettierrc.json` |

**Diferenças em relação às tabelas acima**
- **Pino** (logs) e **Husky + lint-staged + commitlint** foram **adiados**: na Fase 0 a API usa `console` e o padrão de commits é conferido na revisão do PR. Entram quando houver necessidade (Fase 2 ou depois).
- **Instalados no Passo 6 (app):** `@tanstack/react-query ^5.108.1`, `zustand ^5.1.0`, `react-hook-form ^7.92.0`, `zod ^4.6.7`, `@hookform/resolvers ^7.0.7`, `expo-secure-store ~58.0.3` e, para testes, `@testing-library/react-native ^14.1.0` (o `render` e o `fireEvent` dessa versão são **assíncronos**).
- **Instalados no Passo 7 (app):** `expo-location ~58.0.22`, `react-native-maps 1.29.11`, `@react-native-async-storage/async-storage 2.2.0` e `expo-clipboard ~58.0.4`.
- **Instalado no Passo 8 (app):** `socket.io-client 4.8.4`.
- **Instalados no Passo 9 (painel):** `leaflet 1.9.4`, `react-leaflet 5.0.0`, `@types/leaflet 1.9.22`, `@tanstack/react-query 5.108.1` e `zustand 5.1.0`.
- **Instalado no Passo 10 (painel):** `socket.io-client 4.8.4`.
- **Instalados no Passo 13 (app):** `@react-native-community/netinfo 12.0.1`, `@tanstack/react-query-persist-client 5.108.1` e `@tanstack/query-async-storage-persister 5.108.1`.
- **Ainda não instalados** (entram quando a funcionalidade for implementada): `expo-image-picker` e `expo-notifications`.
