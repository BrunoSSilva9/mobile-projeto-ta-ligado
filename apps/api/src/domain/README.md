# domain/

Regras de negócio **puras**: sem banco, HTTP ou Socket.IO, só funções que recebem dados simples e devolvem resultados (decisão S-40). Têm testes unitários em `apps/api/tests/domain/` e **cobertura mínima de 90%**, exigida pelo `vitest.config.ts` (RNF-020).

| Arquivo | O que faz | Regras |
|---|---|---|
| `tipos.ts` | Tipos `Papel`, `TipoDenuncia`, `StatusDenuncia`, `StatusBairro`; status em aberto e finais | RN-002, RN-003 |
| `status-bairro.ts` | `calcularStatusBairro`, `redeEstavel` | RN-007, RN-008 |
| `transicoes.ts` | `validarTransicao`, `acoesDisponiveis` (inclui cancelamento, justificativa e resolução em lote) | RN-004, RN-005, RN-010, RN-016 |
| `fotos.ts` | `ehJpeg` (assinatura do conteúdo), `validarFotos` (até 3, 5 MB, só JPEG) | RN-013 |
| `lote.ts` | `resumirPorBairro` (visão por bairro do painel: em aberto por tipo e status, prioritárias) | RN-016, RF-034 |
| `limite-denuncia.ts` | `podeCriarDenuncia` | RN-006 |
| `permissoes.ts` | `temPapel`, `podeVerDenuncia`, `projetarOcorrenciaPublica` (visão anonimizada) | RN-001, RN-014 |
| `previsao.ts` | `validarPrevisao`, `menorPrevisaoFutura` | RN-009 |
| `protocolo.ts` | `formatarProtocolo`, `protocoloValido`, `lerProtocolo` (`TL-AAAA-NNNNNN`) | RN-023 |
| `prioridade.ts` | `compararPrioridade`, `ordenarPorPrioridade` | RN-015 |
| `necessidade.ts` | `validarNecessidade` (Sim só com consentimento), `ehPrioritaria`, `camposSensiveisAoMudarStatus` (retenção) | RN-015, RN-026 |
| `bairro-proximo.ts` | `distanciaKm` (Haversine), `bairroMaisProximo` (até 15 km) | RN-025 |
| `indicadores.ts` | `taxaResolucao` | RN-017 |

**Regra de ouro:** nada em `domain/` importa Prisma, Express, Socket.IO ou `process.env`. Quem consulta o banco é o *service*, que passa os dados já lidos para estas funções.
