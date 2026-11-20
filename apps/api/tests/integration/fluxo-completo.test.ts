import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { EVENTOS } from '../../src/realtime/eventos';
import {
  criarBairro,
  entrarComoOperador,
  limparBanco,
  prisma,
  registrarCidadao,
} from '../helpers/banco';
import {
  aguardar,
  doTipo,
  gravarEventos,
  iniciarServidorDeTeste,
  pausa,
} from '../helpers/tempo-real';

/**
 * Roteiro de demonstração (docs/16, seção 8) inteiro, pela API e pelo Socket.IO, com os três
 * lados ao mesmo tempo: a cidadã que denuncia, outro cidadão que só vê a visão pública e o painel.
 */
let servidor: Awaited<ReturnType<typeof iniciarServidorDeTeste>>;

beforeAll(async () => {
  servidor = await iniciarServidorDeTeste();
});
beforeEach(limparBanco);
afterEach(() => servidor.desconectarClientes());
afterAll(async () => {
  await servidor.fechar();
  await prisma.$disconnect();
});

const com = (token: string) => ({ Authorization: `Bearer ${token}` });
const get = (token: string, caminho: string) =>
  request(servidor.url).get(`/api/v1${caminho}`).set(com(token));

describe('fluxo completo: denunciar, atender, resolver (RF-007 a RF-033)', () => {
  it('cobre o roteiro: envio, alerta, atendimento, resolução, limite e visão pública', async () => {
    const bairro = await criarBairro({ nome: 'Nova Marabá', folha: 'Folha 28' });
    const operador = await entrarComoOperador(servidor.app);
    const maria = await registrarCidadao(servidor.app, {
      nome: 'Maria Silva',
      telefone: '(94) 98888-7777',
    });
    const joao = await registrarCidadao(servidor.app);
    const painel = gravarEventos(await servidor.conectar(operador.token));
    const appMaria = gravarEventos(await servidor.conectar(maria.token));
    const appJoao = gravarEventos(await servidor.conectar(joao.token));

    // 4. Maria envia a denúncia e recebe o protocolo.
    const criada = await request(servidor.url)
      .post('/api/v1/denuncias')
      .set(com(maria.token))
      .send({
        tipo: 'SEM_ENERGIA',
        bairroId: bairro.id,
        logradouro: 'Av. VP-8',
        descricao: 'Queda brusca de energia',
        latitude: -5.371234,
        longitude: -49.123456,
      });
    expect(criada.status).toBe(201);
    expect(criada.body.protocolo).toMatch(/^TL-\d{4}-\d{6}$/);
    expect(criada.body.status).toBe('RECEBIDA');
    const id = criada.body.id as string;

    // 5. O painel recebe com os dados completos; o outro cidadão só a versão pública.
    await aguardar(() => doTipo(painel, EVENTOS.denunciaCriada).length === 1);
    await aguardar(() => doTipo(appJoao, EVENTOS.bairroStatusAtualizado).length === 1);
    expect(doTipo(painel, EVENTOS.denunciaCriada)[0]).toMatchObject({
      id,
      protocolo: criada.body.protocolo,
      autor: { nome: 'Maria Silva', telefone: '(94) 98888-7777' },
    });
    expect(JSON.stringify(doTipo(appJoao, EVENTOS.ocorrenciaAtualizada))).not.toMatch(
      /Maria|98888|protocolo|TL-/,
    );

    // A visão pública já mostra o bairro sem luz e a ocorrência anonimizada.
    const statusPublico = (await get(joao.token, '/bairros/status')).body.bairros[0];
    expect(statusPublico).toMatchObject({ status: 'SEM_LUZ', emAberto: 1 });
    const publica = (await get(joao.token, '/ocorrencias?status=SEM_LUZ')).body;
    expect(publica.itens).toHaveLength(1);
    expect(publica.itens[0]).toMatchObject({ latitude: -5.371, longitude: -49.123 });
    expect(JSON.stringify(publica)).not.toMatch(/Maria|98888|protocolo|TL-/);

    // 10. Uma segunda denúncia com a primeira em aberto: 409, apontando para a que está aberta.
    const segunda = await request(servidor.url)
      .post('/api/v1/denuncias')
      .set(com(maria.token))
      .send({ tipo: 'OSCILACAO', bairroId: bairro.id, logradouro: 'Rua 7' });
    expect(segunda.status).toBe(409);
    expect(segunda.body.erro.codigo).toBe('DENUNCIA_EM_ABERTO');
    expect(segunda.body.erro.dados).toEqual({ denunciaEmAbertoId: id });

    // 6. O painel vê a denúncia na lista (com prioridade e filtros) e no detalhe.
    const lista = await get(operador.token, '/painel/denuncias?status=RECEBIDA,EM_ATENDIMENTO');
    expect(lista.body.itens.map((i: { id: string }) => i.id)).toEqual([id]);
    expect((await get(operador.token, `/painel/denuncias/${id}`)).body.autor.nome).toBe(
      'Maria Silva',
    );

    // 6 e 7. O operador inicia o atendimento com previsão; a cidadã recebe em até 2 s.
    for (const lista of [painel, appMaria, appJoao]) lista.length = 0;
    const previsao = new Date(Date.now() + 3 * 3_600_000).toISOString();
    const inicio = Date.now();
    const atendimento = await request(servidor.url)
      .patch(`/api/v1/painel/denuncias/${id}/status`)
      .set(com(operador.token))
      .send({ status: 'EM_ATENDIMENTO', previsaoReparo: previsao });
    expect(atendimento.status).toBe(200);
    await aguardar(() => doTipo(appMaria, EVENTOS.statusAtualizado).length === 1);
    expect(Date.now() - inicio).toBeLessThan(2000);
    expect(doTipo(appMaria, EVENTOS.statusAtualizado)[0]).toMatchObject({
      status: 'EM_ATENDIMENTO',
      statusAnterior: 'RECEBIDA',
      previsaoReparo: previsao,
    });

    // O detalhe e "Minhas denúncias" da cidadã mostram o novo status e o histórico (RF-036).
    const detalhe = (await get(maria.token, `/denuncias/${id}`)).body;
    expect(detalhe.status).toBe('EM_ATENDIMENTO');
    expect(detalhe.previsaoReparo).toBe(previsao);
    expect(
      detalhe.historico.map((h: { statusNovo: string; por: string }) => `${h.statusNovo}:${h.por}`),
    ).toEqual(['RECEBIDA:Você', 'EM_ATENDIMENTO:Equatorial Pará']);
    expect((await get(maria.token, '/denuncias/minhas')).body.itens[0].status).toBe(
      'EM_ATENDIMENTO',
    );

    // A previsão aparece no status do bairro (RN-009).
    await aguardar(() => doTipo(appJoao, EVENTOS.bairroStatusAtualizado).length === 1);
    expect((await get(joao.token, '/bairros/status')).body.bairros[0].previsaoReparo).toBe(
      previsao,
    );

    // 8 e 9. O operador resolve: a cidadã é avisada, o bairro volta a Normal e aparece em "Restabelecidos".
    for (const lista of [painel, appMaria, appJoao]) lista.length = 0;
    const resolvida = await request(servidor.url)
      .patch(`/api/v1/painel/denuncias/${id}/status`)
      .set(com(operador.token))
      .send({ status: 'RESOLVIDA' });
    expect(resolvida.status).toBe(200);
    await aguardar(() => doTipo(appMaria, EVENTOS.statusAtualizado).length === 1);
    await aguardar(() => doTipo(appJoao, EVENTOS.bairroStatusAtualizado).length === 1);
    expect(doTipo(appJoao, EVENTOS.bairroStatusAtualizado)[0]).toMatchObject({
      status: 'NORMAL',
      emAberto: 0,
      previsaoReparo: null,
    });

    const aposResolver = (await get(joao.token, '/bairros/status')).body.bairros[0];
    expect(aposResolver).toMatchObject({ status: 'NORMAL', emAberto: 0, previsaoReparo: null });
    const totais = (await get(joao.token, '/ocorrencias')).body.totais;
    expect(totais).toEqual({ todos: 1, semLuz: 0, oscilacao: 0, restabelecidos: 1 });

    // Resolvida libera uma nova denúncia (RN-006).
    const nova = await request(servidor.url)
      .post('/api/v1/denuncias')
      .set(com(maria.token))
      .send({ tipo: 'OSCILACAO', bairroId: bairro.id, logradouro: 'Rua 7' });
    expect(nova.status).toBe(201);

    // Improcedente: justificativa obrigatória, aparece para a autora e some da visão pública.
    for (const lista of [painel, appMaria, appJoao]) lista.length = 0;
    const semMotivo = await request(servidor.url)
      .patch(`/api/v1/painel/denuncias/${nova.body.id}/status`)
      .set(com(operador.token))
      .send({ status: 'IMPROCEDENTE' });
    expect(semMotivo.status).toBe(422);

    const improcedente = await request(servidor.url)
      .patch(`/api/v1/painel/denuncias/${nova.body.id}/status`)
      .set(com(operador.token))
      .send({ status: 'IMPROCEDENTE', justificativa: 'Local sem interrupção confirmada.' });
    expect(improcedente.status).toBe(200);
    await aguardar(() => doTipo(appMaria, EVENTOS.statusAtualizado).length === 1);
    await pausa(100);

    const vistaPelaAutora = (await get(maria.token, `/denuncias/${nova.body.id}`)).body;
    expect(vistaPelaAutora).toMatchObject({
      status: 'IMPROCEDENTE',
      justificativa: 'Local sem interrupção confirmada.',
    });
    const publicaDepois = (await get(joao.token, '/ocorrencias')).body;
    expect(publicaDepois.itens.map((i: { id: string }) => i.id)).toEqual([id]); // só a resolvida
    expect((await get(joao.token, '/bairros/status')).body.bairros[0].status).toBe('NORMAL');
  });

  it('o cidadão não alcança o painel, e o operador não usa a visão pública (RN-001)', async () => {
    await criarBairro();
    const operador = await entrarComoOperador(servidor.app);
    const maria = await registrarCidadao(servidor.app);

    expect((await get(maria.token, '/painel/denuncias')).status).toBe(403);
    expect((await get(operador.token, '/ocorrencias')).status).toBe(403);
    expect((await get(operador.token, '/bairros/status')).status).toBe(403);
    expect(
      (await get(maria.token, '/painel/denuncias/00000000-0000-4000-8000-000000000000')).status,
    ).toBe(403);
  });

  it('um cidadão não vê a denúncia de outro (404 igual ao inexistente, RN-014)', async () => {
    const bairro = await criarBairro();
    const maria = await registrarCidadao(servidor.app);
    const joao = await registrarCidadao(servidor.app);
    const criada = await request(servidor.url)
      .post('/api/v1/denuncias')
      .set(com(maria.token))
      .send({ tipo: 'SEM_ENERGIA', bairroId: bairro.id, logradouro: 'Rua 1' });

    const alheia = await get(joao.token, `/denuncias/${criada.body.id}`);
    const inexistente = await get(joao.token, '/denuncias/00000000-0000-4000-8000-000000000000');

    expect(alheia.status).toBe(404);
    expect(alheia.body).toEqual(inexistente.body);
    expect((await get(joao.token, '/denuncias/minhas')).body.itens).toEqual([]);
  });
});
