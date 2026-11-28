import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { StatusAtualizadoEvento } from '../../src/realtime/publicador';
import {
  criarAppDeTeste,
  criarBairro,
  entrarComoOperador,
  limparBanco,
  prisma,
  registrarCidadao,
} from '../helpers/banco';

const statusAtualizado = vi.fn(async (_evento: StatusAtualizadoEvento) => undefined);
const app = criarAppDeTeste({}, { publicador: { denunciaCriada: vi.fn(), statusAtualizado } });

let bairro: Awaited<ReturnType<typeof criarBairro>>;

beforeEach(async () => {
  await limparBanco();
  bairro = await criarBairro();
  statusAtualizado.mockClear();
});
afterAll(() => prisma.$disconnect());

const comToken = (token: string) => ({ Authorization: `Bearer ${token}` });
const emMinutos = (minutos: number) => new Date(Date.now() + minutos * 60_000);

async function abrirDenuncia(token: string) {
  const res = await request(app)
    .post('/api/v1/denuncias')
    .set(comToken(token))
    .send({ tipo: 'SEM_ENERGIA', bairroId: bairro.id, logradouro: 'Av. VP-3, Folha 28' });
  return res.body.id as string;
}

const mudarStatus = (token: string, id: string, corpo: Record<string, unknown>) =>
  request(app).patch(`/api/v1/painel/denuncias/${id}/status`).set(comToken(token)).send(corpo);
const mudarPrevisao = (token: string, id: string, corpo: Record<string, unknown>) =>
  request(app).patch(`/api/v1/painel/denuncias/${id}/previsao`).set(comToken(token)).send(corpo);
const historicoDoBanco = (id: string) =>
  prisma.historicoStatus.findMany({ where: { denunciaId: id }, orderBy: { criadoEm: 'asc' } });

async function cenario() {
  const operador = await entrarComoOperador(app);
  const maria = await registrarCidadao(app);
  const id = await abrirDenuncia(maria.token);
  return { operador, maria, id };
}

describe('PATCH /painel/denuncias/:id/previsao: definir, trocar e remover (RF-033, S-60)', () => {
  it.each(['RECEBIDA', 'EM_ATENDIMENTO'] as const)(
    'em %s: define a previsão e devolve o detalhe atualizado',
    async (status) => {
      const { operador, id } = await cenario();
      if (status === 'EM_ATENDIMENTO') await mudarStatus(operador.token, id, { status });
      const previsao = emMinutos(80);

      const res = await mudarPrevisao(operador.token, id, {
        previsaoReparo: previsao.toISOString(),
      });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id, status, previsaoReparo: previsao.toISOString() });
      expect((await prisma.denuncia.findUniqueOrThrow({ where: { id } })).previsaoReparo).toEqual(
        previsao,
      );
    },
  );

  it('troca a previsão por outra (data futura)', async () => {
    const { operador, id } = await cenario();
    await mudarPrevisao(operador.token, id, { previsaoReparo: emMinutos(60).toISOString() });
    const nova = emMinutos(180);

    const res = await mudarPrevisao(operador.token, id, { previsaoReparo: nova.toISOString() });

    expect(res.status).toBe(200);
    expect(res.body.previsaoReparo).toBe(nova.toISOString());
  });

  it('remove a previsão com null (RF-033: "editável", inclusive para tirar)', async () => {
    const { operador, id } = await cenario();
    await mudarPrevisao(operador.token, id, { previsaoReparo: emMinutos(60).toISOString() });

    const res = await mudarPrevisao(operador.token, id, { previsaoReparo: null });

    expect(res.status).toBe(200);
    expect(res.body.previsaoReparo).toBeNull();
    expect((await prisma.denuncia.findUniqueOrThrow({ where: { id } })).previsaoReparo).toBeNull();
  });

  it('o status não muda (só a previsão)', async () => {
    const { operador, id } = await cenario();

    await mudarPrevisao(operador.token, id, { previsaoReparo: emMinutos(60).toISOString() });

    expect((await prisma.denuncia.findUniqueOrThrow({ where: { id } })).status).toBe('RECEBIDA');
  });

  describe('histórico (RN-011): um registro por mudança', () => {
    it('definir, trocar e remover geram 3 registros PREVISAO, com o status igual antes e depois', async () => {
      const { operador, id } = await cenario();
      const a = emMinutos(60);
      const b = emMinutos(120);

      await mudarPrevisao(operador.token, id, { previsaoReparo: a.toISOString() });
      await mudarPrevisao(operador.token, id, { previsaoReparo: b.toISOString() });
      await mudarPrevisao(operador.token, id, { previsaoReparo: null });

      const historico = await historicoDoBanco(id);
      expect(historico.map((h) => h.evento)).toEqual([
        'STATUS',
        'PREVISAO',
        'PREVISAO',
        'PREVISAO',
      ]);
      expect(historico.slice(1).map((h) => h.previsaoReparo)).toEqual([a, b, null]); // null = removida
      for (const h of historico.slice(1)) {
        expect(h).toMatchObject({
          statusAnterior: 'RECEBIDA',
          statusNovo: 'RECEBIDA',
          papelAutor: 'OPERADOR',
          alteradoPorId: operador.id,
        });
      }
    });

    it('a previsão informada junto com "Iniciar atendimento" também fica no registro da mudança de status', async () => {
      const { operador, id } = await cenario();
      const previsao = emMinutos(90);

      await mudarStatus(operador.token, id, {
        status: 'EM_ATENDIMENTO',
        previsaoReparo: previsao.toISOString(),
      });

      const [, mudanca] = await historicoDoBanco(id);
      expect(mudanca).toMatchObject({
        evento: 'STATUS',
        statusAnterior: 'RECEBIDA',
        statusNovo: 'EM_ATENDIMENTO',
        previsaoReparo: previsao,
      });
    });

    it('uma mudança de status sem previsão não carrega previsão no registro', async () => {
      const { operador, id } = await cenario();

      await mudarStatus(operador.token, id, { status: 'EM_ATENDIMENTO' });

      expect((await historicoDoBanco(id))[1]!.previsaoReparo).toBeNull();
    });

    it('o detalhe do painel traz evento e previsão em cada registro, em ordem', async () => {
      const { operador, id } = await cenario();
      const previsao = emMinutos(60);
      await mudarPrevisao(operador.token, id, { previsaoReparo: previsao.toISOString() });
      await mudarPrevisao(operador.token, id, { previsaoReparo: null });

      const res = await request(app)
        .get(`/api/v1/painel/denuncias/${id}`)
        .set(comToken(operador.token));

      expect(res.body.historico.map((h: { evento: string }) => h.evento)).toEqual([
        'STATUS',
        'PREVISAO',
        'PREVISAO',
      ]);
      expect(res.body.historico[1]).toMatchObject({
        statusAnterior: 'RECEBIDA',
        statusNovo: 'RECEBIDA',
        previsaoReparo: previsao.toISOString(),
      });
      expect(res.body.historico[2].previsaoReparo).toBeNull();
    });

    it('o autor também vê as mudanças da previsão no histórico, como "Equatorial Pará"', async () => {
      const { operador, maria, id } = await cenario();
      const previsao = emMinutos(60);
      await mudarPrevisao(operador.token, id, { previsaoReparo: previsao.toISOString() });
      await mudarPrevisao(operador.token, id, { previsaoReparo: null });

      const res = await request(app).get(`/api/v1/denuncias/${id}`).set(comToken(maria.token));

      expect(res.body.historico).toEqual([
        expect.objectContaining({ evento: 'STATUS', por: 'Você' }),
        {
          statusAnterior: 'RECEBIDA',
          statusNovo: 'RECEBIDA',
          evento: 'PREVISAO',
          previsaoReparo: previsao.toISOString(),
          por: 'Equatorial Pará',
          justificativa: null,
          criadoEm: expect.any(String),
        },
        expect.objectContaining({ evento: 'PREVISAO', previsaoReparo: null }),
      ]);
      expect(JSON.stringify(res.body)).not.toContain(operador.id);
    });

    it('pedir o mesmo valor que já está salvo não muda nada (sem registro, sem evento)', async () => {
      const { operador, id } = await cenario();
      const previsao = emMinutos(60).toISOString();
      await mudarPrevisao(operador.token, id, { previsaoReparo: previsao });
      statusAtualizado.mockClear();
      // Uma segunda denúncia, sem previsão nenhuma: remover o que não existe também é "igual".
      const joao = await registrarCidadao(app);
      const semPrevisao = await abrirDenuncia(joao.token);

      const repetida = await mudarPrevisao(operador.token, id, { previsaoReparo: previsao });
      const removerSemTer = await mudarPrevisao(operador.token, semPrevisao, {
        previsaoReparo: null,
      });

      expect(repetida.status).toBe(200);
      expect(removerSemTer.status).toBe(200);
      expect((await historicoDoBanco(id)).filter((h) => h.evento === 'PREVISAO')).toHaveLength(1);
      expect(await historicoDoBanco(semPrevisao)).toHaveLength(1);
      expect(statusAtualizado).not.toHaveBeenCalled();
    });
  });

  describe('regras (RN-009): denúncia em aberto e data futura', () => {
    it.each(['RESOLVIDA', 'IMPROCEDENTE', 'CANCELADA'] as const)(
      'denúncia %s: 422 TRANSICAO_INVALIDA, para definir e para remover, e nada muda',
      async (status) => {
        const { operador, id } = await cenario();
        await prisma.denuncia.update({
          where: { id },
          data: {
            status,
            necessidadeEspecial: null,
            ...(status === 'IMPROCEDENTE' ? { justificativa: 'Sem interrupção confirmada.' } : {}),
          },
        });

        for (const previsaoReparo of [emMinutos(60).toISOString(), null]) {
          const res = await mudarPrevisao(operador.token, id, { previsaoReparo });
          expect(res.status).toBe(422);
          expect(res.body.erro.codigo).toBe('TRANSICAO_INVALIDA');
        }
        expect(await historicoDoBanco(id)).toHaveLength(1);
      },
    );

    it('data no passado: 422 PREVISAO_NO_PASSADO e nada muda', async () => {
      const { operador, id } = await cenario();

      const res = await mudarPrevisao(operador.token, id, {
        previsaoReparo: emMinutos(-5).toISOString(),
      });

      expect(res.status).toBe(422);
      expect(res.body.erro.codigo).toBe('PREVISAO_NO_PASSADO');
      expect(
        (await prisma.denuncia.findUniqueOrThrow({ where: { id } })).previsaoReparo,
      ).toBeNull();
      expect(await historicoDoBanco(id)).toHaveLength(1);
    });

    it('o cidadão cancelar e o operador definir a previsão ao mesmo tempo: só um vence', async () => {
      const { operador, maria, id } = await cenario();

      const [cancelar, previsao] = await Promise.all([
        request(app).post(`/api/v1/denuncias/${id}/cancelar`).set(comToken(maria.token)),
        mudarPrevisao(operador.token, id, { previsaoReparo: emMinutos(60).toISOString() }),
      ]);

      const d = await prisma.denuncia.findUniqueOrThrow({ where: { id } });
      if (cancelar.status === 200) {
        // O cancelamento venceu: a previsão é recusada (ou, se entrou antes, a denúncia ficou
        // cancelada de qualquer forma e o status final é o do cidadão).
        expect(d.status).toBe('CANCELADA');
        expect([200, 422]).toContain(previsao.status);
      } else {
        expect(cancelar.status).toBe(422);
        expect(d.status).toBe('RECEBIDA');
        expect(previsao.status).toBe(200);
      }
    });
  });

  describe('validação do corpo (400)', () => {
    it.each([
      ['corpo vazio (não remove sem querer)', {}],
      ['texto que não é data', { previsaoReparo: 'amanhã' }],
      ['data sem fuso', { previsaoReparo: '2030-01-01T10:00:00' }],
      ['texto vazio', { previsaoReparo: '' }],
      ['número', { previsaoReparo: 12345 }],
    ])('%s: 400 e nada muda', async (_nome, corpo) => {
      const { operador, id } = await cenario();
      await mudarPrevisao(operador.token, id, { previsaoReparo: emMinutos(60).toISOString() });
      const antes = await prisma.denuncia.findUniqueOrThrow({ where: { id } });

      const res = await mudarPrevisao(operador.token, id, corpo);

      expect(res.status).toBe(400);
      expect(res.body.erro.codigo).toBe('VALIDACAO_ERRO');
      expect((await prisma.denuncia.findUniqueOrThrow({ where: { id } })).previsaoReparo).toEqual(
        antes.previsaoReparo,
      );
    });
  });

  describe('permissões e ids', () => {
    it('sem token: 401; cidadão: 403 (nem o autor altera a previsão)', async () => {
      const { maria, id } = await cenario();

      expect(
        (
          await request(app)
            .patch(`/api/v1/painel/denuncias/${id}/previsao`)
            .send({ previsaoReparo: null })
        ).status,
      ).toBe(401);
      expect((await mudarPrevisao(maria.token, id, { previsaoReparo: null })).status).toBe(403);
    });

    it('denúncia que não existe ou id inválido: 404', async () => {
      const { operador } = await cenario();

      expect(
        (
          await mudarPrevisao(operador.token, '00000000-0000-4000-8000-000000000000', {
            previsaoReparo: null,
          })
        ).status,
      ).toBe(404);
      expect(
        (await mudarPrevisao(operador.token, 'nao-e-uuid', { previsaoReparo: null })).status,
      ).toBe(404);
    });
  });

  describe('eventos depois do commit (ADR-0002)', () => {
    it('publica o evento de sempre, com status e status anterior iguais e a previsão nova', async () => {
      const { operador, id } = await cenario();
      const previsao = emMinutos(60);

      await mudarPrevisao(operador.token, id, { previsaoReparo: previsao.toISOString() });

      expect(statusAtualizado).toHaveBeenCalledTimes(1);
      const evento = statusAtualizado.mock.calls[0]![0];
      expect(evento).toMatchObject({
        statusAnterior: 'RECEBIDA',
        por: 'Equatorial Pará',
        denuncia: { id, status: 'RECEBIDA', previsaoReparo: previsao },
      });
      const registro = (await historicoDoBanco(id)).at(-1)!;
      expect(evento.alteradoEm).toEqual(registro.criadoEm);
    });

    it('ao remover, o evento leva previsaoReparo nula', async () => {
      const { operador, id } = await cenario();
      await mudarPrevisao(operador.token, id, { previsaoReparo: emMinutos(60).toISOString() });
      statusAtualizado.mockClear();

      await mudarPrevisao(operador.token, id, { previsaoReparo: null });

      expect(statusAtualizado.mock.calls[0]![0].denuncia.previsaoReparo).toBeNull();
    });

    it('uma requisição recusada não publica nada', async () => {
      const { operador, id } = await cenario();

      await mudarPrevisao(operador.token, id, { previsaoReparo: emMinutos(-5).toISOString() });
      await mudarPrevisao(operador.token, id, { previsaoReparo: 'lixo' });

      expect(statusAtualizado).not.toHaveBeenCalled();
    });

    it('se a publicação falhar, a previsão continua salva (200)', async () => {
      const { operador, id } = await cenario();
      statusAtualizado.mockRejectedValueOnce(new Error('socket indisponível'));
      const erroNoConsole = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      const res = await mudarPrevisao(operador.token, id, {
        previsaoReparo: emMinutos(60).toISOString(),
      });

      expect(res.status).toBe(200);
      expect(
        (await prisma.denuncia.findUniqueOrThrow({ where: { id } })).previsaoReparo,
      ).not.toBeNull();
      expect(erroNoConsole).toHaveBeenCalled();
      erroNoConsole.mockRestore();
    });
  });

  describe('previsão do bairro (RN-009): a menor entre as denúncias em aberto', () => {
    it('trocar e remover atualizam o que o cidadão vê no bairro', async () => {
      const operador = await entrarComoOperador(app);
      const maria = await registrarCidadao(app);
      const joao = await registrarCidadao(app);
      const [a, b] = [await abrirDenuncia(maria.token), await abrirDenuncia(joao.token)];
      const em45 = emMinutos(45);
      await mudarPrevisao(operador.token, a, { previsaoReparo: emMinutos(120).toISOString() });
      await mudarPrevisao(operador.token, b, { previsaoReparo: em45.toISOString() });
      const previsaoDoBairro = async () =>
        (
          await request(app).get('/api/v1/bairros/status').set(comToken(maria.token))
        ).body.bairros.find((x: { bairroId: number }) => x.bairroId === bairro.id).previsaoReparo;

      expect(await previsaoDoBairro()).toBe(em45.toISOString());

      await mudarPrevisao(operador.token, b, { previsaoReparo: null });
      expect(await previsaoDoBairro()).not.toBe(em45.toISOString()); // sobrou a de 120 min
      expect(await previsaoDoBairro()).not.toBeNull();

      await mudarPrevisao(operador.token, a, { previsaoReparo: null });
      expect(await previsaoDoBairro()).toBeNull();
    });
  });
});
