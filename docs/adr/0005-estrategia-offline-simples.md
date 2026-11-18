# ADR-0005 – Estratégia offline simples: cache de leitura e rascunho

- **Status:** Aceita
- **Data:** 2026-11-18
- **Relacionados:** [07 – Arquitetura](../07-arquitetura.md#estratégia-offline-adr-0005), RNF-007, RNF-008, RNF-009, RN-006

## Contexto

O público usa internet móvel instável, e justamente quando falta energia a conexão (Wi‑Fi de casa) costuma cair. Ao mesmo tempo, o projeto é um MVP acadêmico, e uma estratégia *offline-first* completa (fila de envio, sincronização e resolução de conflitos) é custosa e arriscada, além de conflitar com a regra de **uma denúncia em aberto por cidadão** (RN-006) e com o protocolo gerado no servidor (RN-023).

## Decisão

Adotar um comportamento **offline-tolerante**:

1. **Leitura offline:** o cache do TanStack Query é persistido em `AsyncStorage`. Sem rede, o app mostra o último estado de Home, Ocorrências, Detalhe e Minhas denúncias, com aviso "Sem conexão" e a data da última atualização.
2. **Escrita exige conexão:** o envio da denúncia só ocorre online. O formulário é **salvo como rascunho** local a cada alteração e só é apagado após o `201` do servidor.
3. **Sem fila automática de envio** no MVP. O usuário decide quando reenviar.
4. **Reconexão:** ao recuperar a rede ou voltar ao primeiro plano, o app reconecta o WebSocket e **refaz as consultas ativas**.
5. Requisições de leitura têm *timeout* de 15 s e até 2 tentativas; o `POST` de denúncia **não** é repetido automaticamente (evita duplicidade).

## Consequências

**Positivas**
- Implementação pequena e previsível; sem conflitos de sincronização nem duplicidade.
- Cobre o caso mais comum: consultar a situação e retomar o formulário depois.

**Negativas**
- Um cidadão sem internet **não consegue registrar** a denúncia naquele momento (ele só consegue se reconectar).
- Dados em cache podem estar desatualizados (mitigado pelo aviso de data).

**Trabalho futuro**
- Fila de envio offline com **idempotência** (`clientId` único por rascunho) e reenvio em segundo plano.
- Envio de contingência por SMS (depende de integração com a operadora).

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| *Offline-first* completo (banco local + sincronização) | Complexidade alta para o prazo; conflitos com RN-006 e protocolo no servidor |
| Sem nenhum offline (só online) | Perda de dados do formulário e telas em branco com internet instável |
| Fila simples de `POST` | Risco de duplicidade e de envio tardio de denúncia que já perdeu o sentido |
