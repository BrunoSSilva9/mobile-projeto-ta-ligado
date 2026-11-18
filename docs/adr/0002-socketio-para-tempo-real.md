# ADR-0002 – Socket.IO para comunicação em tempo real

- **Status:** Aceita
- **Data:** 2026-11-18
- **Relacionados:** [07 – Arquitetura](../07-arquitetura.md), [10 – API](../10-api.md#eventos-websocket), RF-024, RF-027, RNF-002, RNF-009

## Contexto

O painel precisa receber novas denúncias sem recarregar, e o app do cidadão precisa ver as mudanças de status na hora. Há dois tipos de cliente (app React Native e painel web), dois papéis, eventos privados (por usuário) e públicos (por todos os cidadãos). A conexão em rede móvel é instável e precisa reconectar sozinha.

## Decisão

Usar **Socket.IO 4** no servidor (junto ao Express, no mesmo processo) e `socket.io-client` nos dois clientes.

- **Autenticação** no *handshake* com o JWT (`auth: { token }`); conexão recusada se inválido ([ADR-0004](0004-autenticacao-jwt-com-rbac.md)).
- **Salas:** `papel:OPERADOR`, `cidadaos` (eventos públicos anonimizados) e `usuario:{id}` (eventos privados do autor). O servidor decide em que salas cada cliente entra; o cliente não escolhe.
- **Eventos:** `denuncia:criada`, `denuncia:status-atualizado`, `ocorrencia:atualizada`, `bairro:status-atualizado` (contratos em [10](../10-api.md#eventos-websocket)).
- Eventos são emitidos **após o commit** da transação; a fonte de verdade continua sendo o banco e a API REST.
- Ao reconectar, o cliente **refaz as consultas** para recuperar eventos perdidos (o Socket.IO não garante entrega durante a desconexão).

## Consequências

**Positivas**
- Salas, reconexão automática, *heartbeat* e *fallback* para *long polling* prontos.
- Funciona no React Native e no navegador com a mesma API.
- Simples de testar (cliente de teste e servidor em memória).

**Negativas**
- Protocolo próprio sobre WebSocket: a API precisa do cliente Socket.IO (não aceita WebSocket "puro").
- Para escalar horizontalmente seria preciso um adaptador (Redis); fora do MVP (um único processo).
- Entrega "no máximo uma vez" durante desconexões: mitigada por *refetch* na reconexão.

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| `ws` (WebSocket puro) | Exigiria implementar salas, reconexão e *heartbeat* manualmente |
| Server-Sent Events | Unidirecional e sem salas; suporte irregular no React Native |
| Polling periódico | Latência alta e carga desnecessária; não cumpre "tempo real" |
| Pusher / Ably / Firebase | Serviço externo, conta e custo; desnecessário para o MVP |
| Somente push notification | Não atualiza telas abertas; push não é garantido nem imediato |

> **Nota:** o push (Expo Notifications) **complementa** o WebSocket quando o app está em segundo plano; não o substitui.
