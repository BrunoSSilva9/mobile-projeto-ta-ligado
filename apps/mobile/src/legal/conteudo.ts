import { VERSAO_TERMOS } from '@/config/constants';

/**
 * Textos legais exibidos no app (T-01, RF-002). São a versão em dados dos documentos
 * `docs/legal/termos-de-uso.md` e `docs/legal/politica-de-privacidade.md`.
 * Um teste confere que os títulos das seções e a versão continuam iguais aos dos documentos.
 *
 * ⚠️ Texto para fins acadêmicos, sem revisão jurídica (PEN-03). O contato da equipe está pendente.
 */
export type Secao = {
  titulo: string;
  paragrafos?: string[];
  itens?: string[];
};

export type DocumentoLegal = {
  titulo: string;
  versao: string;
  aviso: string;
  secoes: Secao[];
};

const CONTATO = 'Equipe do projeto: Bruno Santos, Gustavo Borges e Marilia Francalino.';
const EMAIL_PENDENTE = 'E-mail: [PREENCHER: e-mail da equipe]';

export const TERMOS_DE_USO: DocumentoLegal = {
  titulo: 'Termos de Uso',
  versao: VERSAO_TERMOS,
  aviso:
    'Texto para fins acadêmicos. O Tá Ligado? é um projeto da disciplina de Desenvolvimento Mobile (UNIFESSPA). Este texto é uma versão simples, sem revisão jurídica, e não representa um serviço oficial da Equatorial Pará nem de qualquer órgão público.',
  secoes: [
    {
      titulo: 'O que é o Tá Ligado?',
      paragrafos: [
        'O Tá Ligado? é um aplicativo para você registrar quedas e oscilações de energia elétrica em Marabá-PA e acompanhar o andamento. O app também mostra, de forma pública e sem identificar ninguém, a situação dos bairros.',
      ],
    },
    {
      titulo: 'Natureza acadêmica e simulação da operadora',
      itens: [
        'O serviço é um projeto de estudo, sem garantia de funcionamento contínuo.',
        'A comunicação com a Equatorial Pará é simulada: a Equatorial não recebe as denúncias feitas neste projeto. Elas chegam a um painel de demonstração, operado pela equipe. Em um cenário real, o painel seria substituído por uma integração com a concessionária.',
        'Mesmo assim, tratamos seus dados como se o envio fosse real, conforme a Política de Privacidade.',
        'Em emergências (risco de choque, fios rompidos, incêndio) ou para atendimento real, ligue para a concessionária e para os serviços de emergência. Este app não substitui esses canais.',
      ],
    },
    {
      titulo: 'Quem pode usar',
      paragrafos: [
        'Pessoas maiores de 18 anos, ou menores com autorização de responsável, que usem o app em Marabá-PA. É preciso criar uma conta com nome, e-mail e senha (telefone é opcional).',
      ],
    },
    {
      titulo: 'Sua conta',
      itens: [
        'Informe dados verdadeiros e mantenha sua senha em segredo.',
        'Você é responsável pelo que for feito com a sua conta.',
        'Você pode editar seu nome e telefone e excluir sua conta a qualquer momento, no Perfil.',
      ],
    },
    {
      titulo: 'Como registrar denúncias',
      paragrafos: ['Você se compromete a:'],
      itens: [
        'registrar apenas interrupções ou oscilações reais de energia;',
        'informar o local correto e, se puder, anexar fotos do problema (até 3 fotos de até 5 MB);',
        'não enviar denúncias falsas, repetidas de propósito, ofensivas ou com dados de terceiros;',
        'ter no máximo uma denúncia em aberto por vez.',
        'Denúncias podem ser marcadas como improcedentes pela operadora (com justificativa) ou canceladas por você, enquanto estiverem apenas "Recebidas".',
      ],
    },
    {
      titulo: 'O que os outros usuários veem',
      paragrafos: [
        'Outros cidadãos veem apenas o tipo, o bairro, a rua, a descrição, o status e o horário da ocorrência. Não veem seu nome, telefone, fotos, protocolo nem suas coordenadas exatas.',
      ],
    },
    {
      titulo: 'O que a operadora vê',
      paragrafos: [
        'A operadora (simulada) vê a denúncia completa: seu nome, telefone, endereço, coordenadas, fotos, quantidade de pessoas no local e se há alguém com necessidade especial.',
      ],
    },
    {
      titulo: 'Conduta proibida',
      paragrafos: [
        'É proibido tentar acessar dados de outras pessoas, sobrecarregar o sistema, enviar conteúdo ilegal ou usar o app para fins diferentes dos descritos. Contas com abuso podem ser limitadas ou removidas.',
      ],
    },
    {
      titulo: 'Limitação de responsabilidade',
      paragrafos: [
        'Por ser um projeto acadêmico, o serviço é oferecido "como está", sem garantia de disponibilidade, de prazo de atendimento ou de previsão de reparo. As informações de status e previsão são de demonstração.',
      ],
    },
    {
      titulo: 'Alterações destes termos',
      paragrafos: [
        'Podemos atualizar estes termos. Mudanças relevantes terão nova versão e novo aceite.',
      ],
    },
    {
      titulo: 'Contato',
      paragrafos: [CONTATO, EMAIL_PENDENTE],
    },
    {
      titulo: 'Lei aplicável',
      paragrafos: [
        'Lei brasileira, incluindo a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).',
      ],
    },
  ],
};

export const POLITICA_DE_PRIVACIDADE: DocumentoLegal = {
  titulo: 'Política de Privacidade',
  versao: VERSAO_TERMOS,
  aviso:
    'Texto para fins acadêmicos. Esta é uma versão simples, sem revisão jurídica, escrita para um projeto da disciplina de Desenvolvimento Mobile (UNIFESSPA).',
  secoes: [
    {
      titulo: 'Quem é o responsável pelos seus dados (controlador)',
      paragrafos: [
        'A equipe do projeto Tá Ligado?: Bruno Santos, Gustavo Borges e Marilia Francalino.',
        EMAIL_PENDENTE.replace('E-mail', 'Contato'),
      ],
    },
    {
      titulo: 'Quais dados coletamos e para quê',
      paragrafos: ['Coletamos o mínimo necessário. Não pedimos CPF nem data de nascimento.'],
      itens: [
        'Nome (cadastro): identificar você perante a operadora e personalizar o app. Base legal: consentimento.',
        'E-mail (cadastro): entrar na conta e entrar em contato. Base legal: consentimento.',
        'Senha (cadastro): proteger sua conta; guardamos só uma versão criptografada.',
        'Telefone, opcional (cadastro ou Perfil): permitir que a operadora ligue para você sobre a denúncia. Base legal: consentimento.',
        'Localização (GPS), ao registrar uma denúncia ou consultar seu bairro, com a sua permissão: localizar a ocorrência e identificar o bairro. Base legal: consentimento.',
        'Endereço da ocorrência, ponto de referência e descrição (denúncia): localizar e entender o problema. Base legal: consentimento.',
        'Fotos, opcional (denúncia): ajudar a operadora a avaliar o problema. Base legal: consentimento.',
        'Quantidade de pessoas no local (denúncia): dimensionar o atendimento. Base legal: consentimento.',
        'Necessidade especial, se você marcar "Sim" (denúncia): priorizar o atendimento. Pode revelar dado de saúde, que é dado sensível. Base legal: consentimento específico e destacado.',
        'Token de notificação, se você permitir notificações: avisar quando o status da denúncia mudar. Base legal: consentimento.',
        'Histórico de mudanças de status e registros de acesso: segurança e auditoria. Base legal: legítimo interesse.',
        'Sobre a localização: só coletamos o GPS enquanto você usa o app, quando precisa dele. Não rastreamos você em segundo plano. Se você negar a permissão, ainda pode denunciar digitando o endereço e escolhendo o bairro.',
      ],
    },
    {
      titulo: 'Com quem compartilhamos',
      itens: [
        'Equatorial Pará (simulada neste projeto): recebe a denúncia completa (nome, telefone, endereço, coordenadas, fotos, pessoas no local, necessidade especial e descrição). Neste projeto acadêmico, ela é representada por um painel de demonstração operado pela equipe, mas tratamos os dados como se o envio fosse real.',
        'Outros cidadãos: veem somente tipo, bairro, rua, descrição, status e horário, sem nome, telefone, fotos ou coordenadas exatas.',
        'Serviço de notificações (Expo): recebe o token do aparelho para entregar os avisos.',
        'Não vendemos nem usamos seus dados para publicidade.',
      ],
    },
    {
      titulo: 'Por quanto tempo guardamos',
      itens: [
        'Conta e dados pessoais: enquanto sua conta existir.',
        'Denúncias: mantidas para estatística, sem vínculo com você depois que você excluir a conta.',
        'Fotos: enquanto a denúncia existir; apagadas se você excluir a conta.',
        'Token de notificação: até você sair do app ou excluir a conta.',
        'Registros de acesso: 6 meses.',
      ],
    },
    {
      titulo: 'Seus direitos (art. 18 da LGPD)',
      paragrafos: ['Você pode, a qualquer momento:'],
      itens: [
        'confirmar e acessar seus dados (Perfil e "Minhas denúncias");',
        'corrigir nome e telefone (Perfil);',
        'excluir sua conta e seus dados pessoais (Perfil, "Excluir conta");',
        'revogar o consentimento (excluindo a conta ou retirando as permissões do celular);',
        'pedir informações sobre o compartilhamento;',
        'pedir portabilidade dos seus dados: enviamos um arquivo (JSON) mediante solicitação ao contato da equipe;',
        'pedir anonimização ou revisão, quando aplicável.',
      ],
    },
    {
      titulo: 'Como protegemos seus dados',
      itens: [
        'Senhas com criptografia (hash), nunca guardadas em texto.',
        'Comunicação protegida (HTTPS) em ambiente de produção.',
        'Acesso por perfil: o cidadão só vê o que é seu; a operadora só acessa o painel com conta própria.',
        'Fotos acessíveis apenas por você e pela operadora.',
        'Registro de quem alterou o quê e quando em cada denúncia.',
        'Limite de tentativas de login e de requisições, contra abuso.',
        'Nenhum sistema é 100% seguro. Se houver um incidente que possa afetar você, avisaremos.',
      ],
    },
    {
      titulo: 'Denúncias falsas e abuso',
      paragrafos: [
        'Para proteger o serviço, cada pessoa pode ter uma denúncia em aberto por vez, e a operadora vê quem fez cada denúncia. Denúncias falsas podem ser marcadas como improcedentes e as contas podem ser limitadas.',
      ],
    },
    {
      titulo: 'Crianças e adolescentes',
      paragrafos: [
        'O app é destinado a maiores de 18 anos. Menores só devem usar com autorização de um responsável.',
      ],
    },
    {
      titulo: 'Alterações',
      paragrafos: [
        'Podemos atualizar esta política. Mudanças relevantes terão nova versão e pediremos um novo aceite.',
      ],
    },
    {
      titulo: 'Contato e reclamações',
      paragrafos: [
        EMAIL_PENDENTE.replace('E-mail', 'Contato'),
        'Você também pode procurar a Autoridade Nacional de Proteção de Dados (ANPD).',
      ],
    },
  ],
};
