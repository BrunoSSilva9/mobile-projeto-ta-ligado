# ADR-0004 – Autenticação JWT com RBAC (CIDADAO e OPERADOR)

- **Status:** Aceita
- **Data:** 2026-11-18
- **Relacionados:** [11 – Segurança e LGPD](../11-seguranca-e-lgpd.md), RF-003, RF-026, RN-001, RNF-011 a RNF-013

## Contexto

Há dois perfis com permissões muito diferentes: o cidadão (vê e altera só o que é seu) e o operador (vê dados completos e atualiza status). A autenticação precisa servir ao app (REST e Socket.IO) e ao painel, sem depender de serviço externo. O login com Google e "esqueci a senha" estão fora do MVP.

## Decisão

- **Credenciais:** e-mail e senha. A senha é guardada com **bcrypt** (custo ≥ 10).
- **Sessão:** **JWT** assinado (HS256) com `sub` (id do usuário) e `papel`. Validade de **7 dias no app** e **8 horas no painel** (S-08). Sem *refresh token* no MVP; ao expirar, o usuário entra de novo.
- **Armazenamento no cliente:** `expo-secure-store` no app; memória/`sessionStorage` no painel (nunca em `localStorage` persistente).
- **Autorização (RBAC):** *middleware* `exigirPapel(...)` por rota (`/painel/*` só `OPERADOR`) e verificações de **propriedade** no serviço (o cidadão só acessa o que é seu). As regras ficam em `domain/permissoes.ts` (RN-001, RN-014) e têm testes unitários.
- **Socket.IO:** o token é validado no *handshake*; o servidor coloca o cliente nas salas do seu papel e do seu `usuario:{id}`.
- **Operadores:** criados por *seed*; não há rota pública para criá-los.
- **Aplicação correta por login:** a resposta de `POST /auth/login` traz o `papel`; o app recusa `OPERADOR` e o painel recusa `CIDADAO`.
- **Abuso:** *rate limit* (S-18), mensagens genéricas em falha de login e *logs* de acesso.

## Consequências

**Positivas**
- Simples, sem estado no servidor, funciona igual para REST e WebSocket.
- Sem dependência de provedor externo; fácil de testar.
- O papel viaja no token, mas **é revalidado no banco** em operações sensíveis (o token por si só não concede nada além do que a regra permite).

**Negativas**
- Não há revogação imediata de tokens (mitigado pela validade curta no painel e por conferir o usuário no banco em operações sensíveis).
- Sem *refresh token*, a sessão do app expira em 7 dias.
- Quem tem o JWT_SECRET forja tokens: o segredo fica em variável de ambiente e é rotacionado em caso de vazamento.

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| Sessão em cookie (servidor guarda estado) | Menos natural para app nativo e Socket.IO; exige armazenamento de sessão |
| Firebase Auth / Auth0 | Serviço externo e custo; mais coisas para configurar no MVP |
| OAuth Google | Fora do escopo do MVP (backlog) |
| Access + refresh token | Mais robusto, porém mais complexo; fica para o backlog |
