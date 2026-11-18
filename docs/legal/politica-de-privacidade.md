# Política de Privacidade – Tá Ligado?

**Versão:** 2026-11 · **Idioma:** pt-BR · Texto complementar aos [Termos de Uso](termos-de-uso.md) e ao documento técnico [11 – Segurança e LGPD](../11-seguranca-e-lgpd.md).

> **Aviso: texto para fins acadêmicos.** Esta é uma versão simples, sem revisão jurídica, escrita para um projeto da disciplina de Desenvolvimento Mobile (UNIFESSPA).

## 1. Quem é o responsável pelos seus dados (controlador)

A **equipe do projeto Tá Ligado?**: Bruno Santos, Gustavo Borges e Marilia Francalino.
Contato: `[PREENCHER: e-mail da equipe]`

## 2. Quais dados coletamos e para quê

Coletamos **o mínimo necessário**. **Não pedimos CPF nem data de nascimento.**

| Dado | Quando | Para quê | Base legal (LGPD) |
|---|---|---|---|
| Nome | Cadastro | Identificar você perante a operadora e personalizar o app | Consentimento (art. 7º, I) |
| E-mail | Cadastro | Entrar na conta e entrar em contato | Consentimento |
| Senha | Cadastro | Proteger sua conta (guardamos só uma versão criptografada) | Consentimento |
| Telefone (opcional) | Cadastro ou Perfil | Permitir que a operadora ligue para você sobre a denúncia | Consentimento |
| **Localização (GPS)** | Ao registrar uma denúncia ou consultar seu bairro, com a sua permissão | Localizar a ocorrência e identificar o bairro | Consentimento |
| Endereço da ocorrência, ponto de referência, descrição | Denúncia | Localizar e entender o problema | Consentimento |
| Fotos (opcional) | Denúncia | Ajudar a operadora a avaliar o problema | Consentimento |
| Quantidade de pessoas no local | Denúncia | Dimensionar o atendimento | Consentimento |
| **Necessidade especial** (ex.: pessoa que depende de aparelho de saúde) | Denúncia, se você marcar "Sim" | **Priorizar** o atendimento. Pode revelar **dado de saúde** (dado sensível) | **Consentimento específico e destacado** (art. 11, I) |
| Token de notificação | Se você permitir notificações | Avisar você quando o status da denúncia mudar | Consentimento |
| Histórico de mudanças de status e registros de acesso | Uso do app | Segurança e auditoria | Legítimo interesse (art. 7º, IX) |

**Sobre a localização:** só coletamos o GPS **enquanto você usa o app**, quando precisa dele (registrar denúncia ou ver seu bairro). **Não rastreamos você em segundo plano.** Se você negar a permissão, ainda pode denunciar digitando o endereço e escolhendo o bairro.

## 3. Com quem compartilhamos

- **Equatorial Pará (simulada neste projeto):** recebe a denúncia **completa** (nome, telefone, endereço, coordenadas, fotos, pessoas no local, necessidade especial e descrição). Neste projeto acadêmico, ela é representada por um painel de demonstração operado pela equipe, mas tratamos os dados como se o envio fosse real.
- **Outros cidadãos:** veem somente tipo, bairro, rua, descrição, status e horário, **sem nome, telefone, fotos ou coordenadas exatas**.
- **Serviço de notificações (Expo):** recebe o token do aparelho para entregar os avisos.
- **Não vendemos nem usamos seus dados para publicidade.**

## 4. Por quanto tempo guardamos

| Dado | Prazo |
|---|---|
| Conta e dados pessoais | Enquanto sua conta existir |
| Denúncias | Mantidas para estatística, **sem vínculo com você** depois que você excluir a conta |
| Fotos | Enquanto a denúncia existir; apagadas se você excluir a conta |
| Token de notificação | Até você sair do app ou excluir a conta |
| Registros de acesso | 6 meses |

## 5. Seus direitos (art. 18 da LGPD)

Você pode, a qualquer momento:

- **confirmar e acessar** seus dados (Perfil e "Minhas denúncias");
- **corrigir** nome e telefone (Perfil);
- **excluir** sua conta e seus dados pessoais (Perfil → "Excluir conta");
- **revogar o consentimento** (excluindo a conta ou retirando as permissões do celular);
- pedir **informações sobre o compartilhamento** (seção 3);
- pedir **portabilidade** dos seus dados: enviamos um arquivo (JSON) mediante solicitação ao contato acima;
- pedir **anonimização** ou **revisão**, quando aplicável.

## 6. Como protegemos seus dados

- Senhas com criptografia (hash), nunca guardadas em texto.
- Comunicação protegida (HTTPS) em ambiente de produção.
- Acesso por perfil: o cidadão só vê o que é seu; a operadora só acessa o painel com conta própria.
- Fotos acessíveis apenas por você e pela operadora.
- Registro de **quem alterou o quê e quando** em cada denúncia.
- Limite de tentativas de login e de requisições, contra abuso.

Nenhum sistema é 100% seguro. Se houver um incidente que possa afetar você, avisaremos.

## 7. Denúncias falsas e abuso

Para proteger o serviço, cada pessoa pode ter **uma denúncia em aberto** por vez, e a operadora vê quem fez cada denúncia. Denúncias falsas podem ser marcadas como improcedentes e as contas podem ser limitadas.

## 8. Crianças e adolescentes

O app é destinado a maiores de 18 anos. Menores só devem usar com autorização de um responsável.

## 9. Alterações

Podemos atualizar esta política. Mudanças relevantes terão **nova versão** e pediremos um novo aceite.

## 10. Contato e reclamações

`[PREENCHER: e-mail da equipe]`. Você também pode procurar a **Autoridade Nacional de Proteção de Dados (ANPD)**.
