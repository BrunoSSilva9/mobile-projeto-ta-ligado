import { existsSync, readFileSync } from 'node:fs';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import request from 'supertest';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  criarAppDeTeste,
  criarBairro,
  entrarComoOperador,
  limparBanco,
  prisma,
  registrarCidadao,
} from '../helpers/banco';

const SENHA = 'senha-do-cidadao'; // a mesma que `registrarCidadao` usa
const FOTO = Buffer.from(readFileSync(join(__dirname, '../fixtures/foto-com-gps.jpg')));

let pasta: string;
let app: ReturnType<typeof criarAppDeTeste>;
let bairro: Awaited<ReturnType<typeof criarBairro>>;

beforeEach(async () => {
  await limparBanco();
  bairro = await criarBairro();
  pasta = await mkdtemp(join(tmpdir(), 'taligado-conta-'));
  app = criarAppDeTeste({}, { uploadsDir: pasta });
});
afterEach(() => rm(pasta, { recursive: true, force: true }));
afterAll(() => prisma.$disconnect());

const comToken = (token: string) => ({ Authorization: `Bearer ${token}` });
const editar = (token: string, corpo: Record<string, unknown>, alvo = app) =>
  request(alvo).patch('/api/v1/me').set(comToken(token)).send(corpo);
const excluir = (token: string, corpo: Record<string, unknown> = { senha: SENHA }, alvo = app) =>
  request(alvo).delete('/api/v1/me').set(comToken(token)).send(corpo);

/** Abre uma denúncia com necessidade especial e fotos (multipart), como o app faz. */
async function denunciaCompleta(token: string, quantasFotos = 2) {
  let req = request(app)
    .post('/api/v1/denuncias')
    .set(comToken(token))
    .field('tipo', 'SEM_ENERGIA')
    .field('bairroId', String(bairro.id))
    .field('logradouro', 'Av. VP-3, Folha 28')
    .field('necessidadeEspecial', 'true')
    .field('consentimentoNecessidade', 'true');
  for (let i = 0; i < quantasFotos; i++) {
    req = req.attach('fotos', FOTO, { filename: `f${i}.jpg`, contentType: 'image/jpeg' });
  }
  const res = await req;
  if (res.status !== 201) throw new Error(`Falha ao abrir denúncia: ${JSON.stringify(res.body)}`);
  return res.body.id as string;
}

describe('PATCH /api/v1/me: editar o perfil (RF-005, S-22)', () => {
  it('altera nome e telefone e devolve o usuário atualizado', async () => {
    const { token, id } = await registrarCidadao(app, { nome: 'Maria Silva' });

    const res = await editar(token, { nome: '  Maria S. Souza ', telefone: '(94) 90000-0000' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id,
      nome: 'Maria S. Souza',
      email: expect.any(String),
      telefone: '(94) 90000-0000',
      papel: 'CIDADAO',
    });
    expect((await prisma.usuario.findUniqueOrThrow({ where: { id } })).nome).toBe('Maria S. Souza');
  });

  it('o GET /me devolve o que foi salvo', async () => {
    const { token } = await registrarCidadao(app);
    await editar(token, { telefone: '(94) 3322-1234' });

    const res = await request(app).get('/api/v1/me').set(comToken(token));

    expect(res.body.telefone).toBe('(94) 3322-1234');
  });

  it('campo ausente não muda: só o telefone, só o nome', async () => {
    const { token, id } = await registrarCidadao(app, {
      nome: 'Maria Silva',
      telefone: '(94) 90000-0000',
    });

    await editar(token, { nome: 'Maria Souza' });
    let u = await prisma.usuario.findUniqueOrThrow({ where: { id } });
    expect([u.nome, u.telefone]).toEqual(['Maria Souza', '(94) 90000-0000']);

    await editar(token, { telefone: '(94) 98888-7777' });
    u = await prisma.usuario.findUniqueOrThrow({ where: { id } });
    expect([u.nome, u.telefone]).toEqual(['Maria Souza', '(94) 98888-7777']);
  });

  it.each([null, '', '   '])('telefone %j apaga o telefone', async (vazio) => {
    const { token, id } = await registrarCidadao(app, { telefone: '(94) 90000-0000' });

    const res = await editar(token, { telefone: vazio });

    expect(res.status).toBe(200);
    expect(res.body.telefone).toBeNull();
    expect((await prisma.usuario.findUniqueOrThrow({ where: { id } })).telefone).toBeNull();
  });

  it('o e-mail é somente leitura: é ignorado, assim como papel, senha e id', async () => {
    const { token, id } = await registrarCidadao(app, { email: 'maria@exemplo.com' });
    const antes = await prisma.usuario.findUniqueOrThrow({ where: { id } });

    const res = await editar(token, {
      nome: 'Maria Nova',
      email: 'outro@exemplo.com',
      papel: 'OPERADOR',
      senhaHash: 'x',
      id: '00000000-0000-4000-8000-000000000000',
    });

    expect(res.status).toBe(200);
    const depois = await prisma.usuario.findUniqueOrThrow({ where: { id } });
    expect(depois).toMatchObject({
      id,
      email: 'maria@exemplo.com',
      papel: 'CIDADAO',
      senhaHash: antes.senhaHash,
      nome: 'Maria Nova',
    });
  });

  it.each([
    ['nome curto', { nome: 'M' }, 'nome'],
    ['nome longo', { nome: 'M'.repeat(101) }, 'nome'],
    ['telefone sem DDD', { telefone: '90000-0000' }, 'telefone'],
    ['telefone com letras', { telefone: 'abc' }, 'telefone'],
    ['corpo vazio', {}, 'nome'],
  ])('recusa %s com 400 no campo certo', async (_nome, corpo, campo) => {
    const { token } = await registrarCidadao(app);

    const res = await editar(token, corpo);

    expect(res.status).toBe(400);
    expect(res.body.erro.codigo).toBe('VALIDACAO_ERRO');
    expect(res.body.erro.detalhes.map((d: { campo: string }) => d.campo)).toContain(campo);
  });

  it('sem token: 401; operador: 403', async () => {
    expect((await request(app).patch('/api/v1/me').send({ nome: 'Ana Paula' })).status).toBe(401);
    const operador = await entrarComoOperador(app);
    expect((await editar(operador.token, { nome: 'Ana Paula' })).status).toBe(403);
  });
});

describe('DELETE /api/v1/me: excluir a conta (RF-006, RN-024, S-50, S-59)', () => {
  it('204 e a conta some; o token e o login antigos deixam de valer', async () => {
    const { token, id } = await registrarCidadao(app, { email: 'maria@exemplo.com' });

    const res = await excluir(token);

    expect(res.status).toBe(204);
    expect(res.text).toBe('');
    expect(await prisma.usuario.findUnique({ where: { id } })).toBeNull();
    expect((await request(app).get('/api/v1/me').set(comToken(token))).status).toBe(401);
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'maria@exemplo.com', senha: SENHA });
    expect(login.status).toBe(401);
  });

  it('o e-mail fica livre: dá para cadastrar de novo', async () => {
    const { token } = await registrarCidadao(app, { email: 'maria@exemplo.com' });
    await excluir(token);

    const novo = await registrarCidadao(app, { email: 'maria@exemplo.com' });

    expect(novo.token).toEqual(expect.any(String));
  });

  describe('senha errada ou ausente: nada é apagado', () => {
    it('senha errada: 403 SENHA_INCORRETA, "Senha incorreta." e mais nada', async () => {
      const { token, id } = await registrarCidadao(app);
      const denunciaId = await denunciaCompleta(token);

      const res = await excluir(token, { senha: 'senha-errada-123' });

      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        erro: { codigo: 'SENHA_INCORRETA', mensagem: 'Senha incorreta.' },
      });
      // Tudo continua: conta, denúncia ligada ao autor, fotos (registros e arquivos) e necessidade.
      expect(await prisma.usuario.findUnique({ where: { id } })).not.toBeNull();
      const d = await prisma.denuncia.findUniqueOrThrow({
        where: { id: denunciaId },
        include: { fotos: true },
      });
      expect(d.autorId).toBe(id);
      expect(d.necessidadeEspecial).toBe(true);
      expect(d.fotos).toHaveLength(2);
      expect(await readdir(join(pasta, denunciaId))).toHaveLength(2);
      // E a sessão continua valendo (o app não é desconectado por um 403).
      expect((await request(app).get('/api/v1/me').set(comToken(token))).status).toBe(200);
    });

    it.each([
      ['sem corpo', {}],
      ['senha vazia', { senha: '' }],
      ['senha que não é texto', { senha: 123 }],
    ])('%s: 400 e nada é apagado', async (_nome, corpo) => {
      const { token, id } = await registrarCidadao(app);

      const res = await excluir(token, corpo);

      expect(res.status).toBe(400);
      expect(res.body.erro.detalhes[0].campo).toBe('senha');
      expect(await prisma.usuario.findUnique({ where: { id } })).not.toBeNull();
    });

    it('não dá para usar a senha de outra conta', async () => {
      const maria = await registrarCidadao(app);
      await registrarCidadao(app); // outra conta, mesma senha de teste
      await prisma.usuario.update({
        where: { id: maria.id },
        data: { senhaHash: await (await import('bcryptjs')).hash('so-da-maria-123', 4) },
      });

      expect((await excluir(maria.token, { senha: SENHA })).status).toBe(403);
      expect((await excluir(maria.token, { senha: 'so-da-maria-123' })).status).toBe(204);
    });
  });

  describe('o que é apagado e o que fica (S-50)', () => {
    it('APAGA: usuário, tokens de push, registros e arquivos das fotos, necessidade e consentimento', async () => {
      const { token, id } = await registrarCidadao(app);
      await prisma.pushToken.create({
        data: { usuarioId: id, token: 'ExponentPushToken[abc]', plataforma: 'android' },
      });
      const denunciaId = await denunciaCompleta(token, 3);
      expect(await readdir(join(pasta, denunciaId))).toHaveLength(3);

      expect((await excluir(token)).status).toBe(204);

      expect(await prisma.usuario.count()).toBe(0);
      expect(await prisma.pushToken.count()).toBe(0);
      expect(await prisma.denunciaFoto.count()).toBe(0);
      expect(existsSync(join(pasta, denunciaId))).toBe(false); // arquivos e a pasta
      const d = await prisma.denuncia.findUniqueOrThrow({ where: { id: denunciaId } });
      expect(d.necessidadeEspecial).toBeNull();
      expect(d.consentimentoNecessidadeEm).toBeNull();
    });

    it('MANTÉM: a denúncia e o histórico, sem vínculo com a pessoa', async () => {
      const { token, id } = await registrarCidadao(app, { nome: 'Maria Silva' });
      const denunciaId = await denunciaCompleta(token, 0);

      await excluir(token);

      const d = await prisma.denuncia.findUniqueOrThrow({
        where: { id: denunciaId },
        include: { historico: true },
      });
      expect(d.autorId).toBeNull();
      expect(d.logradouro).toBe('Av. VP-3, Folha 28');
      expect(d.protocolo).toMatch(/^TL-\d{4}-\d{6}$/);
      expect(d.historico).toHaveLength(1);
      expect(d.historico[0]).toMatchObject({ statusNovo: 'RECEBIDA', alteradoPorId: null });
      // Nenhum dado pessoal sobrou em lugar nenhum do banco.
      const tudo = JSON.stringify(await prisma.denuncia.findMany({ include: { historico: true } }));
      expect(tudo).not.toContain('Maria Silva');
      expect(tudo).not.toContain(id);
    });

    it('uma denúncia EM ABERTO continua aberta e visível ao operador, como "Conta excluída" (autor nulo)', async () => {
      const maria = await registrarCidadao(app, {
        nome: 'Maria Silva',
        telefone: '(94) 90000-0000',
      });
      const denunciaId = await denunciaCompleta(maria.token, 0);
      const operador = await entrarComoOperador(app);

      await excluir(maria.token);

      const detalhe = await request(app)
        .get(`/api/v1/painel/denuncias/${denunciaId}`)
        .set(comToken(operador.token));
      expect(detalhe.status).toBe(200);
      expect(detalhe.body).toMatchObject({
        id: denunciaId,
        status: 'RECEBIDA', // não foi cancelada
        autor: null, // o painel mostra "Conta excluída"
        prioritaria: false, // a resposta de necessidade especial foi apagada
        necessidadeEspecial: null,
      });
      expect(JSON.stringify(detalhe.body)).not.toContain('Maria Silva');
      expect(JSON.stringify(detalhe.body)).not.toContain('90000-0000');
      // E o operador ainda consegue atender a denúncia.
      const atender = await request(app)
        .patch(`/api/v1/painel/denuncias/${denunciaId}/status`)
        .set(comToken(operador.token))
        .send({ status: 'EM_ATENDIMENTO' });
      expect(atender.status).toBe(200);
    });

    it('a denúncia aberta continua contando no status do bairro (a falta de energia pode ser real)', async () => {
      const maria = await registrarCidadao(app);
      const joao = await registrarCidadao(app);
      await denunciaCompleta(maria.token, 0);

      await excluir(maria.token);

      const res = await request(app).get('/api/v1/bairros/status').set(comToken(joao.token));
      expect(
        res.body.bairros.find((b: { bairroId: number }) => b.bairroId === bairro.id),
      ).toMatchObject({ status: 'SEM_LUZ', emAberto: 1 });
    });

    it('os dados das OUTRAS contas não são tocados', async () => {
      const maria = await registrarCidadao(app);
      const joao = await registrarCidadao(app);
      const deJoao = await denunciaCompleta(joao.token, 2);

      await excluir(maria.token);

      const d = await prisma.denuncia.findUniqueOrThrow({
        where: { id: deJoao },
        include: { fotos: true },
      });
      expect(d.autorId).toBe(joao.id);
      expect(d.necessidadeEspecial).toBe(true);
      expect(d.fotos).toHaveLength(2);
      expect(await readdir(join(pasta, deJoao))).toHaveLength(2);
      expect(await prisma.usuario.findUnique({ where: { id: joao.id } })).not.toBeNull();
    });

    it('uma conta sem denúncias nem fotos também é excluída', async () => {
      const { token, id } = await registrarCidadao(app);

      expect((await excluir(token)).status).toBe(204);
      expect(await prisma.usuario.findUnique({ where: { id } })).toBeNull();
    });

    it('denúncias já encerradas (e o histórico do operador) também ficam, sem autor', async () => {
      const maria = await registrarCidadao(app);
      const operador = await entrarComoOperador(app);
      const denunciaId = await denunciaCompleta(maria.token, 0);
      await request(app)
        .patch(`/api/v1/painel/denuncias/${denunciaId}/status`)
        .set(comToken(operador.token))
        .send({ status: 'EM_ATENDIMENTO' });
      await request(app)
        .patch(`/api/v1/painel/denuncias/${denunciaId}/status`)
        .set(comToken(operador.token))
        .send({ status: 'RESOLVIDA' });

      await excluir(maria.token);

      const historico = await prisma.historicoStatus.findMany({
        where: { denunciaId },
        orderBy: { criadoEm: 'asc' },
      });
      expect(historico.map((h) => h.statusNovo)).toEqual([
        'RECEBIDA',
        'EM_ATENDIMENTO',
        'RESOLVIDA',
      ]);
      // As mudanças do operador continuam com o operador; só a do cidadão perdeu o vínculo.
      expect(historico.map((h) => h.alteradoPorId === null)).toEqual([true, false, false]);
    });
  });

  describe('permissões e limite de tentativas', () => {
    it('sem token: 401; operador: 403 (e a conta do operador continua)', async () => {
      expect((await request(app).delete('/api/v1/me').send({ senha: SENHA })).status).toBe(401);
      const operador = await entrarComoOperador(app);

      expect((await excluir(operador.token, { senha: 'senha-do-operador' })).status).toBe(403);
      expect(await prisma.usuario.findUnique({ where: { id: operador.id } })).not.toBeNull();
    });

    it('a 6ª tentativa errada em um minuto: 429, mesmo com a senha certa (mesmo limite do login)', async () => {
      const limitado = criarAppDeTeste({ login: 5 }, { uploadsDir: pasta });
      const { token, id } = await registrarCidadao(limitado);

      for (let i = 0; i < 5; i++) {
        expect((await excluir(token, { senha: `errada-${i}-123456` }, limitado)).status).toBe(403);
      }
      const bloqueada = await excluir(token, { senha: SENHA }, limitado);

      expect(bloqueada.status).toBe(429);
      expect(bloqueada.body.erro.codigo).toBe('MUITAS_REQUISICOES');
      expect(await prisma.usuario.findUnique({ where: { id } })).not.toBeNull();
    });

    it('só as tentativas que falham contam: acertar depois de errar não é bloqueado', async () => {
      const limitado = criarAppDeTeste({ login: 2 }, { uploadsDir: pasta });
      const { token } = await registrarCidadao(limitado);

      expect((await excluir(token, { senha: 'errada-1-123456' }, limitado)).status).toBe(403);

      expect((await excluir(token, { senha: SENHA }, limitado)).status).toBe(204);
    });

    it('o limite é por conta: errar na conta de uma pessoa não bloqueia a de outra', async () => {
      const limitado = criarAppDeTeste({ login: 1 }, { uploadsDir: pasta });
      const maria = await registrarCidadao(limitado);
      const joao = await registrarCidadao(limitado);

      expect((await excluir(maria.token, { senha: 'errada-1-123456' }, limitado)).status).toBe(403);
      expect((await excluir(maria.token, { senha: 'errada-2-123456' }, limitado)).status).toBe(429);

      expect((await excluir(joao.token, { senha: SENHA }, limitado)).status).toBe(204);
    });
  });
});
