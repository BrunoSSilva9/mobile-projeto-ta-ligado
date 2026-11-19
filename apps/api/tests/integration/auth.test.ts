import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { criarAppDeTeste, criarOperador, limparBanco, prisma, SEGREDO_JWT } from '../helpers/banco';

const app = criarAppDeTeste();

const cadastroValido = {
  nome: 'Maria Silva',
  email: 'maria@exemplo.com',
  senha: 'minhasenha1',
  telefone: '(94) 90000-0000',
  aceiteTermos: true,
  versaoTermos: '2026-11',
};

async function cadastrar(extra: Record<string, unknown> = {}) {
  return request(app)
    .post('/api/v1/auth/register')
    .send({ ...cadastroValido, ...extra });
}

beforeEach(limparBanco);
afterAll(() => prisma.$disconnect());

describe('POST /api/v1/auth/register (RF-001, RF-002)', () => {
  it('cria a conta de cidadão e devolve token e usuário, sem a senha', async () => {
    const res = await cadastrar();

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.usuario).toMatchObject({
      nome: 'Maria Silva',
      email: 'maria@exemplo.com',
      telefone: '(94) 90000-0000',
      papel: 'CIDADAO',
    });
    expect(JSON.stringify(res.body)).not.toMatch(/senha|hash/i);
  });

  it('grava o consentimento (data e versão dos termos) e guarda só o hash da senha (RN-020, RNF-011)', async () => {
    await cadastrar();

    const usuario = await prisma.usuario.findUniqueOrThrow({
      where: { email: 'maria@exemplo.com' },
    });
    expect(usuario.consentimentoEm).toBeInstanceOf(Date);
    expect(usuario.versaoTermos).toBe('2026-11');
    expect(usuario.senhaHash).not.toBe('minhasenha1');
    expect(await bcrypt.compare('minhasenha1', usuario.senhaHash)).toBe(true);
  });

  it('normaliza o e-mail para minúsculas e remove espaços', async () => {
    const res = await cadastrar({ email: '  Maria@EXEMPLO.com ' });

    expect(res.status).toBe(201);
    expect(res.body.usuario.email).toBe('maria@exemplo.com');
  });

  it('o telefone é opcional (ausente ou vazio vira null)', async () => {
    const semTelefone = { ...cadastroValido, telefone: undefined };
    const a = await request(app).post('/api/v1/auth/register').send(semTelefone);
    expect(a.status).toBe(201);
    expect(a.body.usuario.telefone).toBeNull();

    const b = await cadastrar({ email: 'outra@exemplo.com', telefone: '   ' });
    expect(b.status).toBe(201);
    expect(b.body.usuario.telefone).toBeNull();
  });

  it.each(['(94) 3322-1234', '94900000000', '(94)90000-0000'])(
    'aceita o telefone %s',
    async (telefone) => {
      const res = await cadastrar({ telefone });
      expect(res.status).toBe(201);
    },
  );

  it('o cadastro público NUNCA cria operador, mesmo que o cliente peça (RN-001)', async () => {
    const res = await cadastrar({ papel: 'OPERADOR' });

    expect(res.status).toBe(201);
    expect(res.body.usuario.papel).toBe('CIDADAO');
    const gravado = await prisma.usuario.findUniqueOrThrow({
      where: { email: 'maria@exemplo.com' },
    });
    expect(gravado.papel).toBe('CIDADAO');
  });

  it('ignora CPF e data de nascimento: não são coletados (minimização)', async () => {
    const res = await cadastrar({ cpf: '123.456.789-09', nascimento: '1990-01-01' });

    expect(res.status).toBe(201);
    const campos = Object.keys(await prisma.usuario.findFirstOrThrow());
    expect(campos).not.toContain('cpf');
    expect(campos).not.toContain('nascimento');
  });

  it('recusa e-mail repetido com 409 (inclusive com maiúsculas diferentes)', async () => {
    await cadastrar();
    const repetido = await cadastrar({ email: 'MARIA@exemplo.com' });

    expect(repetido.status).toBe(409);
    expect(repetido.body.erro.codigo).toBe('EMAIL_JA_CADASTRADO');
    expect(await prisma.usuario.count()).toBe(1);
  });

  it('duas requisições simultâneas com o mesmo e-mail: só uma cria a conta', async () => {
    const [a, b] = await Promise.all([cadastrar(), cadastrar()]);

    expect([a.status, b.status].sort()).toEqual([201, 409]);
    expect(await prisma.usuario.count()).toBe(1);
  });

  describe('validação (400 VALIDACAO_ERRO, mensagens em português)', () => {
    it.each([
      ['senha com menos de 8 caracteres', { senha: '1234567' }, 'senha'],
      ['senha com mais de 72 caracteres', { senha: 'a'.repeat(73) }, 'senha'],
      ['e-mail inválido', { email: 'nao-e-email' }, 'email'],
      ['nome muito curto', { nome: 'A' }, 'nome'],
      ['nome com mais de 100 caracteres', { nome: 'A'.repeat(101) }, 'nome'],
      ['telefone inválido', { telefone: '12345' }, 'telefone'],
      ['aceite dos termos falso', { aceiteTermos: false }, 'aceiteTermos'],
      ['aceite dos termos como texto', { aceiteTermos: 'true' }, 'aceiteTermos'],
      ['versão dos termos vazia', { versaoTermos: '' }, 'versaoTermos'],
    ])('recusa %s', async (_nome, alteracao, campo) => {
      const res = await cadastrar(alteracao);

      expect(res.status).toBe(400);
      expect(res.body.erro.codigo).toBe('VALIDACAO_ERRO');
      expect(res.body.erro.detalhes.map((d: { campo: string }) => d.campo)).toContain(campo);
      expect(await prisma.usuario.count()).toBe(0);
    });

    it('recusa o cadastro sem aceite dos termos (campo ausente)', async () => {
      const { aceiteTermos: _ignorado, ...semAceite } = cadastroValido;
      const res = await request(app).post('/api/v1/auth/register').send(semAceite);

      expect(res.status).toBe(400);
      expect(res.body.erro.detalhes.map((d: { campo: string }) => d.campo)).toContain(
        'aceiteTermos',
      );
    });

    it('lista todos os campos com erro de uma vez', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({});

      expect(res.status).toBe(400);
      const campos = res.body.erro.detalhes.map((d: { campo: string }) => d.campo);
      expect(campos).toEqual(
        expect.arrayContaining(['nome', 'email', 'senha', 'aceiteTermos', 'versaoTermos']),
      );
    });

    it('campos ausentes recebem mensagens claras (não a mensagem genérica do Zod)', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({});

      const porCampo = Object.fromEntries(
        res.body.erro.detalhes.map((d: { campo: string; mensagem: string }) => [
          d.campo,
          d.mensagem,
        ]),
      );
      expect(porCampo.nome).toBe('Informe o nome.');
      expect(porCampo.email).toBe('Informe o e-mail.');
      expect(porCampo.senha).toBe('Informe a senha.');
      expect(porCampo.versaoTermos).toBe('Informe a versão dos termos.');
    });

    it('as mensagens vêm em português', async () => {
      const res = await cadastrar({ senha: '123', nome: 'A', aceiteTermos: false });

      const mensagens = res.body.erro.detalhes
        .map((d: { mensagem: string }) => d.mensagem)
        .join(' ');
      expect(mensagens).toContain('pelo menos 8 caracteres');
      expect(mensagens).toContain('Termos de Uso');
      expect(mensagens).not.toMatch(/\b(Invalid|Too small|expected)\b/);
    });
  });
});

describe('POST /api/v1/auth/login (RF-003, RF-026)', () => {
  beforeEach(async () => {
    await cadastrar();
  });

  it('entra com e-mail e senha corretos e devolve token e usuário', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'maria@exemplo.com', senha: 'minhasenha1' });

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.usuario).toMatchObject({ email: 'maria@exemplo.com', papel: 'CIDADAO' });
    expect(JSON.stringify(res.body)).not.toMatch(/senha|hash/i);
  });

  it('ignora maiúsculas e espaços no e-mail', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: '  MARIA@Exemplo.COM ', senha: 'minhasenha1' });

    expect(res.status).toBe(200);
  });

  it('senha incorreta e e-mail inexistente dão a MESMA resposta genérica (não revela quem tem conta)', async () => {
    const senhaErrada = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'maria@exemplo.com', senha: 'senha-errada-1' });
    const semConta = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'ninguem@exemplo.com', senha: 'senha-errada-1' });

    expect(senhaErrada.status).toBe(401);
    expect(semConta.status).toBe(401);
    expect(senhaErrada.body).toEqual(semConta.body);
    expect(senhaErrada.body.erro.codigo).toBe('CREDENCIAIS_INVALIDAS');
  });

  it.each([
    ['sem e-mail', { senha: 'minhasenha1' }],
    ['sem senha', { email: 'maria@exemplo.com' }],
    ['corpo vazio', {}],
  ])('recusa login %s com 400', async (_nome, corpo) => {
    const res = await request(app).post('/api/v1/auth/login').send(corpo);

    expect(res.status).toBe(400);
    expect(res.body.erro.codigo).toBe('VALIDACAO_ERRO');
  });

  it('o token do cidadão vale 7 dias e carrega o papel (S-35)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'maria@exemplo.com', senha: 'minhasenha1' });

    const conteudo = jwt.verify(res.body.token, SEGREDO_JWT) as jwt.JwtPayload;
    expect(conteudo.papel).toBe('CIDADAO');
    expect(conteudo.sub).toBe(res.body.usuario.id);
    expect(conteudo.exp! - conteudo.iat!).toBe(7 * 24 * 60 * 60);
  });

  it('o operador (criado por seed) entra e o token dele vale 8 horas (S-35)', async () => {
    const operador = await criarOperador();
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: operador.email, senha: operador.senha });

    expect(res.status).toBe(200);
    expect(res.body.usuario.papel).toBe('OPERADOR');
    const conteudo = jwt.verify(res.body.token, SEGREDO_JWT) as jwt.JwtPayload;
    expect(conteudo.papel).toBe('OPERADOR');
    expect(conteudo.exp! - conteudo.iat!).toBe(8 * 60 * 60);
  });
});

describe('limite de tentativas (RNF-014, S-18)', () => {
  it('bloqueia com 429 depois de várias falhas do mesmo e-mail, sem afetar outros e-mails', async () => {
    const limitado = criarAppDeTeste({ login: 3 });
    await request(limitado).post('/api/v1/auth/register').send(cadastroValido);

    const errar = (email: string) =>
      request(limitado).post('/api/v1/auth/login').send({ email, senha: 'errada-errada' });

    for (let i = 0; i < 3; i++) expect((await errar('maria@exemplo.com')).status).toBe(401);
    const bloqueada = await errar('maria@exemplo.com');
    expect(bloqueada.status).toBe(429);
    expect(bloqueada.body.erro.codigo).toBe('MUITAS_REQUISICOES');

    // Outro e-mail, mesmo IP: continua livre.
    expect((await errar('outro@exemplo.com')).status).toBe(401);
  });

  it('logins corretos não contam para o limite', async () => {
    const limitado = criarAppDeTeste({ login: 2 });
    await request(limitado).post('/api/v1/auth/register').send(cadastroValido);

    for (let i = 0; i < 6; i++) {
      const res = await request(limitado)
        .post('/api/v1/auth/login')
        .send({ email: 'maria@exemplo.com', senha: 'minhasenha1' });
      expect(res.status).toBe(200);
    }
  });

  it('o limite geral por IP responde 429 ao exceder', async () => {
    const limitado = criarAppDeTeste({ geral: 3 });

    for (let i = 0; i < 3; i++) {
      expect((await request(limitado).get('/api/v1/me')).status).toBe(401);
    }
    const excedido = await request(limitado).get('/api/v1/me');
    expect(excedido.status).toBe(429);
    expect(excedido.body.erro.codigo).toBe('MUITAS_REQUISICOES');
  });
});

describe('GET /api/v1/me', () => {
  async function entrarComoMaria() {
    const res = await cadastrar();
    return { token: res.body.token as string, id: res.body.usuario.id as string };
  }

  it('devolve os dados do usuário logado, sem a senha', async () => {
    const { token } = await entrarComoMaria();
    const res = await request(app).get('/api/v1/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: expect.any(String),
      nome: 'Maria Silva',
      email: 'maria@exemplo.com',
      telefone: '(94) 90000-0000',
      papel: 'CIDADAO',
    });
  });

  it.each([
    ['sem cabeçalho', undefined],
    ['sem o prefixo Bearer', 'abc'],
    ['com token mal formado', 'Bearer isso-nao-e-um-jwt'],
  ])('recusa a requisição %s com 401', async (_nome, cabecalho) => {
    const req = request(app).get('/api/v1/me');
    if (cabecalho) req.set('Authorization', cabecalho);
    const res = await req;

    expect(res.status).toBe(401);
    expect(res.body.erro.codigo).toBe('NAO_AUTENTICADO');
  });

  it('recusa token assinado com outro segredo', async () => {
    const { id } = await entrarComoMaria();
    const falso = jwt.sign({ papel: 'CIDADAO' }, 'outro-segredo-qualquer-123', { subject: id });
    const res = await request(app).get('/api/v1/me').set('Authorization', `Bearer ${falso}`);

    expect(res.status).toBe(401);
  });

  it('recusa token expirado', async () => {
    const { id } = await entrarComoMaria();
    const expirado = jwt.sign({ papel: 'CIDADAO' }, SEGREDO_JWT, { subject: id, expiresIn: -10 });
    const res = await request(app).get('/api/v1/me').set('Authorization', `Bearer ${expirado}`);

    expect(res.status).toBe(401);
    expect(res.body.erro.mensagem).toMatch(/expirada|inválida/);
  });

  it('recusa token sem assinatura (alg "none")', async () => {
    const { id } = await entrarComoMaria();
    const semAssinatura = jwt.sign({ papel: 'OPERADOR' }, '', { algorithm: 'none', subject: id });
    const res = await request(app)
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${semAssinatura}`);

    expect(res.status).toBe(401);
  });

  it('recusa token de uma conta que não existe mais', async () => {
    const { token, id } = await entrarComoMaria();
    await prisma.usuario.delete({ where: { id } });
    const res = await request(app).get('/api/v1/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
  });

  it('o papel vale o do banco, não o do token (token antigo de quem foi promovido)', async () => {
    const { token, id } = await entrarComoMaria();
    await prisma.usuario.update({ where: { id }, data: { papel: 'OPERADOR' } });
    const res = await request(app).get('/api/v1/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.papel).toBe('OPERADOR');
  });
});
