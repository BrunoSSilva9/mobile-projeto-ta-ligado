# ADR-0001 – Integração simulada com a operadora via Painel Web

- **Status:** Aceita
- **Data:** 2026-11-18
- **Relacionados:** [07 – Arquitetura](../07-arquitetura.md), RF-026 a RF-036, RN-001, RN-004

## Contexto

As denúncias precisam chegar **em tempo real à Equatorial Pará**, que é quem resolve o problema, e o cidadão precisa acompanhar o andamento. A Equatorial **não oferece API pública** para esse fim, e o projeto é acadêmico (equipe pequena, prazo curto, sem acordo institucional com a concessionária).

## Decisão

**Simular a operadora dentro do próprio sistema:**

1. Criar um segundo papel de usuário, `OPERADOR`, com contas criadas por *seed* (sem cadastro público).
2. Construir um **Painel Web da Operadora** (`apps/painel`, React + Vite) onde o operador recebe as denúncias por WebSocket, filtra em lista e mapa, abre o detalhe e atualiza o status (Recebida → Em atendimento → Resolvida ou Improcedente, com previsão de reparo opcional).
3. Devolver **toda mudança de status** ao app do cidadão em tempo real (Socket.IO) e por push.
4. Isolar a integração na API em um módulo `operadora` (porta/adaptador). Hoje o "adaptador" é o fluxo interno acionado pelo painel.

## Consequências

**Positivas**
- Demonstra o ciclo completo (cidadão → operadora → cidadão) sem dependência externa.
- Exercita autenticação por papel, tempo real e auditoria.
- A regra de negócio (status, transições, histórico) fica no servidor, independente do cliente.

**Negativas / custos**
- Um segundo front-end para construir e testar.
- A Equatorial real **não** recebe nada: o texto "enviada à Equatorial Pará" é uma simulação e deve ser deixado claro na apresentação e nos Termos.
- Dados de operadores e fluxo de trabalho são fictícios.

**Trabalho futuro**
Em um cenário real, o painel é **substituído por uma integração via API** com o sistema da Equatorial: envio das denúncias (API ou fila), recebimento de status (*webhook* ou consulta periódica) e mapeamento de protocolos. O módulo `operadora` seria trocado por um cliente HTTP, sem mudar o app do cidadão.

## Alternativas consideradas

- **Mock estático** (respostas fixas, sem painel): simples, mas não demonstra o tempo real nem a atualização de status. Descartada.
- **Integração por e-mail/WhatsApp com a concessionária:** fora do escopo e sem canal garantido. Descartada.
- **Raspagem (*scraping*) do site da Equatorial:** frágil e eticamente discutível. Descartada.
