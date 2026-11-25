import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { StatusDenuncia } from '../../src/domain';
import { paraSnapshot } from '../../src/modules/denuncias/snapshot';
import { EVENTOS, SALAS } from '../../src/realtime/eventos';
import { PublicadorSocketIO } from '../../src/realtime/publicador-socket';
import { salasDoUsuario } from '../../src/realtime/socket';
import {
  criarBairro,
  entrarComoOperador,
  limparBanco,
  prisma,
  registrarCidadao,
  SEGREDO_JWT,
} from '../helpers/banco';
import {
  aguardar,
  doTipo,
  gravarEventos,
  iniciarServidorDeTeste,
  pausa,
} from '../helpers/tempo-real';

let servidor: Awaited<ReturnType<typeof iniciarServidorDeTeste>>;
let bairro: Awaited<ReturnType<typeof criarBairro>>;

beforeAll(async () => {
  servidor = await iniciarServidorDeTeste();
});
afterAll(async () => {
  await servidor.fechar();
  await prisma.$disconnect();
});
beforeEach(async () => {
  await limparBanco();
  bairro = await criarBairro();
});
afterEach(() => servidor.desconectarClientes());

const corpoBase = () => ({
  tipo: 'SEM_ENERGIA',
  bairroId: bairro.id,
  logradouro: 'Av. VP-3, Folha 28',
});

function registrarDenuncia(token: string, extra: Record<string, unknown> = {}) {
  return request(servidor.url)
    .post('/api/v1/denuncias')
    .set('Authorization', `Bearer ${token}`)
    .send({ ...corpoBase(), ...extra });
}

/** Faz o que o painel fará no Passo 5: grava a mudança e depois publica o evento. */
async function mudarStatus(
  id: string,
  status: StatusDenuncia,
  extras: { previsaoReparo?: Date; justificativa?: string } = {},
) {
  const antes = await prisma.denuncia.findUniqueOrThrow({ where: { id } });
  const atual = await prisma.denuncia.update({
    where: { id },
    data: { status, ...extras },
    include: { bairro: true },
  });
  await servidor.publicador.statusAtualizado({
    denuncia: paraSnapshot(atual),
    statusAnterior: antes.status,
    alteradoEm: new Date(),
    por: 'Equatorial Pará',
  });
}

describe('autenticação no handshake (ADR-0002, ADR-0004)', () => {
  const recusada = { message: 'NAO_AUTENTICADO', data: { codigo: 'NAO_AUTENTICADO' } };

  it('recusa a conexão sem token', async () => {
    await expect(servidor.conectar(undefined)).rejects.toMatchObject(recusada);
    await expect(servidor.conectar('')).rejects.toMatchObject(recusada);
  });

  it('recusa token inválido, de outro segredo ou expirado', async () => {
    const { id } = await registrarCidadao(servidor.app);
    const outroSegredo = jwt.sign({ papel: 'CIDADAO' }, 'outro-segredo-qualquer-123', {
      subject: id,
    });
    const expirado = jwt.sign({ papel: 'CIDADAO' }, SEGREDO_JWT, { subject: id, expiresIn: -10 });

    await expect(servidor.conectar('isso-nao-e-um-jwt')).rejects.toMatchObject(recusada);
    await expect(servidor.conectar(outroSegredo)).rejects.toMatchObject(recusada);
    await expect(servidor.conectar(expirado)).rejects.toMatchObject(recusada);
  });

  it('recusa token de uma conta que não existe mais', async () => {
    const { token, id } = await registrarCidadao(servidor.app);
    await prisma.usuario.delete({ where: { id } });

    await expect(servidor.conectar(token)).rejects.toMatchObject(recusada);
  });

  it('aceita cidadão e operador com token válido', async () => {
    const maria = await registrarCidadao(servidor.app);
    const operador = await entrarComoOperador(servidor.app);

    expect((await servidor.conectar(maria.token)).connected).toBe(true);
    expect((await servidor.conectar(operador.token)).connected).toBe(true);
  });
});

describe('salas (o servidor decide, o cliente não escolhe)', () => {
  const idsNaSala = async (sala: string) =>
    (await servidor.io.in(sala).fetchSockets()).map((s) => s.data.usuario.id as string);

  it('cidadão entra em `cidadaos` e na própria sala, e não na dos operadores', async () => {
    const maria = await registrarCidadao(servidor.app);
    await servidor.conectar(maria.token);

    expect(await idsNaSala(SALAS.cidadaos)).toEqual([maria.id]);
    expect(await idsNaSala(SALAS.usuario(maria.id))).toEqual([maria.id]);
    expect(await idsNaSala(SALAS.operadores)).toEqual([]);
  });

  it('operador entra só na sala dos operadores', async () => {
    const operador = await entrarComoOperador(servidor.app);
    await servidor.conectar(operador.token);

    expect(await idsNaSala(SALAS.operadores)).toEqual([operador.id]);
    expect(await idsNaSala(SALAS.cidadaos)).toEqual([]);
    expect(await idsNaSala(SALAS.usuario(operador.id))).toEqual([]);
  });

  it('um cidadão não consegue entrar em outra sala pedindo ao servidor', async () => {
    const maria = await registrarCidadao(servidor.app);
    const joao = await registrarCidadao(servidor.app);
    const cliente = await servidor.conectar(maria.token);

    for (const pedido of [SALAS.operadores, SALAS.usuario(joao.id)]) {
      cliente.emit('join', pedido);
      cliente.emit('entrar', pedido);
      cliente.emit('subscribe', pedido);
    }
    await pausa(150);

    expect(await idsNaSala(SALAS.operadores)).toEqual([]);
    expect(await idsNaSala(SALAS.usuario(joao.id))).toEqual([]);
  });

  it('várias conexões do mesmo usuário ficam na mesma sala', async () => {
    const maria = await registrarCidadao(servidor.app);
    await servidor.conectar(maria.token);
    await servidor.conectar(maria.token);

    expect(await idsNaSala(SALAS.usuario(maria.id))).toEqual([maria.id, maria.id]);
  });

  it('salasDoUsuario devolve as salas certas por papel', () => {
    expect(salasDoUsuario({ id: 'u1', papel: 'OPERADOR' })).toEqual(['papel:OPERADOR']);
    expect(salasDoUsuario({ id: 'u1', papel: 'CIDADAO' })).toEqual(['cidadaos', 'usuario:u1']);
  });
});

describe('denuncia:criada e eventos públicos (RF-024, RF-027)', () => {
  async function cenario() {
    const operador = await entrarComoOperador(servidor.app);
    const maria = await registrarCidadao(servidor.app, {
      nome: 'Maria Silva',
      telefone: '(94) 90000-0000',
    });
    const joao = await registrarCidadao(servidor.app);
    const painel = await servidor.conectar(operador.token);
    const painel2 = await servidor.conectar(operador.token);
    const app1 = await servidor.conectar(maria.token);
    const app2 = await servidor.conectar(joao.token);
    return {
      maria,
      joao,
      painel: gravarEventos(painel),
      painel2: gravarEventos(painel2),
      app1: gravarEventos(app1),
      app2: gravarEventos(app2),
    };
  }

  it('o painel recebe a denúncia completa, com o autor, em até 2 s (RNF-002)', async () => {
    const { maria, painel } = await cenario();

    const inicio = Date.now();
    const res = await registrarDenuncia(maria.token, {
      descricao: 'Estalo forte no poste',
      latitude: -5.3712,
      longitude: -49.1231,
      necessidadeEspecial: true,
      detalheNecessidade: 'Aparelho de oxigênio',
    });
    expect(res.status).toBe(201);
    await aguardar(() => doTipo(painel, EVENTOS.denunciaCriada).length > 0);
    const latencia = Date.now() - inicio;

    expect(latencia).toBeLessThan(2000);
    expect(doTipo(painel, EVENTOS.denunciaCriada)).toEqual([
      {
        id: res.body.id,
        protocolo: res.body.protocolo,
        prioritaria: true,
        tipo: 'SEM_ENERGIA',
        status: 'RECEBIDA',
        bairro: { id: bairro.id, nome: 'Nova Marabá', folha: 'Folha 28' },
        logradouro: 'Av. VP-3, Folha 28',
        descricao: 'Estalo forte no poste',
        latitude: -5.3712,
        longitude: -49.1231,
        autor: { id: maria.id, nome: 'Maria Silva', telefone: '(94) 90000-0000' },
        criadoEm: res.body.criadoEm,
      },
    ]);
  });

  it('todas as conexões do painel recebem; os cidadãos NÃO recebem `denuncia:criada`', async () => {
    const { maria, painel, painel2, app1, app2 } = await cenario();

    await registrarDenuncia(maria.token);
    await aguardar(() => doTipo(painel, EVENTOS.denunciaCriada).length > 0);
    await aguardar(() => doTipo(painel2, EVENTOS.denunciaCriada).length > 0);
    await pausa(150);

    expect(doTipo(painel, EVENTOS.denunciaCriada)).toHaveLength(1);
    expect(doTipo(painel2, EVENTOS.denunciaCriada)).toHaveLength(1);
    expect(doTipo(app1, EVENTOS.denunciaCriada)).toHaveLength(0);
    expect(doTipo(app2, EVENTOS.denunciaCriada)).toHaveLength(0);
  });

  it('o evento só sai depois do commit: a denúncia já está no banco quando o painel é avisado', async () => {
    const { maria, painel } = await cenario();

    const res = await registrarDenuncia(maria.token);
    await aguardar(() => doTipo(painel, EVENTOS.denunciaCriada).length > 0);

    const id = doTipo(painel, EVENTOS.denunciaCriada)[0]!.id;
    expect(await prisma.denuncia.count({ where: { id } })).toBe(1);
    expect(id).toBe(res.body.id);
  });

  it('os cidadãos recebem a ocorrência pública, SEM nenhum dado pessoal (RN-014)', async () => {
    const { maria, app1, app2, painel } = await cenario();

    const res = await registrarDenuncia(maria.token, {
      descricao: 'Estalo forte no poste',
      latitude: -5.371234,
      longitude: -49.123456,
      cep: '68500-000',
      pontoReferencia: 'Perto da rotatória',
      necessidadeEspecial: true,
      detalheNecessidade: 'Aparelho de oxigênio',
      faixaPessoas: 'DE_4_A_8',
    });
    await aguardar(() => doTipo(app1, EVENTOS.ocorrenciaAtualizada).length > 0);
    await aguardar(() => doTipo(app2, EVENTOS.ocorrenciaAtualizada).length > 0);

    for (const eventos of [app1, app2]) {
      const [ocorrencia] = doTipo(eventos, EVENTOS.ocorrenciaAtualizada);
      expect(ocorrencia).toEqual({
        id: res.body.id,
        tipo: 'SEM_ENERGIA',
        status: 'RECEBIDA',
        bairro: 'Nova Marabá',
        folha: 'Folha 28',
        logradouro: 'Av. VP-3, Folha 28',
        descricao: 'Estalo forte no poste',
        latitude: -5.371, // arredondada a 3 casas
        longitude: -49.123,
        criadoEm: res.body.criadoEm,
      });
      const json = JSON.stringify(ocorrencia);
      for (const proibido of [
        'Maria Silva',
        '90000-0000',
        res.body.protocolo,
        'Aparelho de oxigênio',
        'autor',
        'protocolo',
        'telefone',
        'necessidade',
        'rotatória',
        '68500-000',
        'DE_4_A_8',
        '-5.371234',
      ]) {
        expect(json).not.toContain(proibido);
      }
    }
    // O painel não está na sala pública.
    await pausa(100);
    expect(doTipo(painel, EVENTOS.ocorrenciaAtualizada)).toHaveLength(0);
  });

  it('os cidadãos recebem o status do bairro: SEM_LUZ com uma denúncia sem energia (RN-007)', async () => {
    const { maria, app1, app2 } = await cenario();

    await registrarDenuncia(maria.token);
    await aguardar(() => doTipo(app1, EVENTOS.bairroStatusAtualizado).length > 0);
    await aguardar(() => doTipo(app2, EVENTOS.bairroStatusAtualizado).length > 0);

    for (const eventos of [app1, app2]) {
      expect(doTipo(eventos, EVENTOS.bairroStatusAtualizado)).toEqual([
        {
          bairroId: bairro.id,
          nome: 'Nova Marabá',
          folha: 'Folha 28',
          status: 'SEM_LUZ',
          emAberto: 1,
          previsaoReparo: null,
        },
      ]);
    }
  });

  it('com só oscilação, o bairro fica OSCILACAO; uma sem energia depois muda para SEM_LUZ', async () => {
    const { maria, joao, app1 } = await cenario();

    await registrarDenuncia(maria.token, { tipo: 'OSCILACAO' });
    await aguardar(() => doTipo(app1, EVENTOS.bairroStatusAtualizado).length === 1);
    await registrarDenuncia(joao.token, { tipo: 'SEM_ENERGIA' });
    await aguardar(() => doTipo(app1, EVENTOS.bairroStatusAtualizado).length === 2);

    const [primeiro, segundo] = doTipo(app1, EVENTOS.bairroStatusAtualizado);
    expect(primeiro).toMatchObject({ status: 'OSCILACAO', emAberto: 1 });
    expect(segundo).toMatchObject({ status: 'SEM_LUZ', emAberto: 2 });
  });

  it('uma requisição recusada (validação ou limite) não emite nada', async () => {
    const { maria, painel, app1 } = await cenario();

    await registrarDenuncia(maria.token, { tipo: 'INVALIDO' }); // 400
    await registrarDenuncia(maria.token); // 201
    await aguardar(() => doTipo(painel, EVENTOS.denunciaCriada).length === 1);
    await registrarDenuncia(maria.token); // 409
    await pausa(200);

    expect(doTipo(painel, EVENTOS.denunciaCriada)).toHaveLength(1);
    expect(doTipo(app1, EVENTOS.ocorrenciaAtualizada)).toHaveLength(1);
    expect(doTipo(app1, EVENTOS.bairroStatusAtualizado)).toHaveLength(1);
  });
});

describe('denuncia:status-atualizado (RF-024)', () => {
  async function cenario() {
    const operador = await entrarComoOperador(servidor.app);
    const maria = await registrarCidadao(servidor.app);
    const joao = await registrarCidadao(servidor.app);
    const painel = gravarEventos(await servidor.conectar(operador.token));
    const app1 = gravarEventos(await servidor.conectar(maria.token));
    const app2 = gravarEventos(await servidor.conectar(joao.token));
    const criada = await registrarDenuncia(maria.token);
    // Espera os eventos da criação e zera, para olhar só o que vem da mudança de status.
    await aguardar(() => doTipo(app2, EVENTOS.bairroStatusAtualizado).length === 1);
    await aguardar(() => doTipo(painel, EVENTOS.denunciaCriada).length === 1);
    for (const lista of [painel, app1, app2]) lista.length = 0;
    return {
      maria,
      joao,
      painel,
      app1,
      app2,
      id: criada.body.id as string,
      protocolo: criada.body.protocolo as string,
    };
  }

  it('o autor e o painel recebem o evento privado; outro cidadão não', async () => {
    const { id, protocolo, painel, app1, app2 } = await cenario();
    const previsao = new Date(Date.now() + 80 * 60_000);

    await mudarStatus(id, 'EM_ATENDIMENTO', { previsaoReparo: previsao });
    await aguardar(() => doTipo(app1, EVENTOS.statusAtualizado).length > 0);
    await aguardar(() => doTipo(painel, EVENTOS.statusAtualizado).length > 0);
    await pausa(150);

    for (const eventos of [app1, painel]) {
      const recebidos = doTipo(eventos, EVENTOS.statusAtualizado);
      expect(recebidos).toHaveLength(1);
      expect(recebidos[0]).toEqual({
        id,
        protocolo,
        statusAnterior: 'RECEBIDA',
        status: 'EM_ATENDIMENTO',
        previsaoReparo: previsao.toISOString(),
        justificativa: null,
        alteradoEm: expect.any(String),
        por: 'Equatorial Pará',
      });
    }
    expect(doTipo(app2, EVENTOS.statusAtualizado)).toHaveLength(0);
  });

  it('a justificativa de improcedência chega ao autor', async () => {
    const { id, app1 } = await cenario();

    await mudarStatus(id, 'IMPROCEDENTE', { justificativa: 'Local sem interrupção confirmada.' });
    await aguardar(() => doTipo(app1, EVENTOS.statusAtualizado).length > 0);

    expect(doTipo(app1, EVENTOS.statusAtualizado)[0]).toMatchObject({
      statusAnterior: 'RECEBIDA',
      status: 'IMPROCEDENTE',
      justificativa: 'Local sem interrupção confirmada.',
    });
  });

  it('todos os cidadãos recebem a ocorrência pública e o bairro atualizados', async () => {
    const { id, app1, app2, painel } = await cenario();

    await mudarStatus(id, 'EM_ATENDIMENTO');
    await aguardar(() => doTipo(app1, EVENTOS.bairroStatusAtualizado).length > 0);
    await aguardar(() => doTipo(app2, EVENTOS.bairroStatusAtualizado).length > 0);

    for (const eventos of [app1, app2]) {
      expect(doTipo(eventos, EVENTOS.ocorrenciaAtualizada)[0]).toMatchObject({
        id,
        status: 'EM_ATENDIMENTO',
        bairro: 'Nova Marabá',
      });
      expect(doTipo(eventos, EVENTOS.bairroStatusAtualizado)[0]).toMatchObject({
        status: 'SEM_LUZ',
        emAberto: 1,
      });
    }
    await pausa(100);
    expect(doTipo(painel, EVENTOS.bairroStatusAtualizado)).toHaveLength(0);
  });

  it('ao resolver, o bairro volta a NORMAL e a previsão some', async () => {
    const { id, app2 } = await cenario();

    await mudarStatus(id, 'RESOLVIDA');
    await aguardar(() => doTipo(app2, EVENTOS.bairroStatusAtualizado).length > 0);

    expect(doTipo(app2, EVENTOS.bairroStatusAtualizado)[0]).toEqual({
      bairroId: bairro.id,
      nome: 'Nova Marabá',
      folha: 'Folha 28',
      status: 'NORMAL',
      emAberto: 0,
      previsaoReparo: null,
    });
  });

  it('a previsão do bairro é a menor previsão futura entre as denúncias em aberto (RN-009)', async () => {
    const { id, joao, app2 } = await cenario();
    const em = (minutos: number) => new Date(Date.now() + minutos * 60_000);
    const em45 = em(45);
    const em120 = em(120);
    const outra = await registrarDenuncia(joao.token);
    await aguardar(() => doTipo(app2, EVENTOS.bairroStatusAtualizado).length === 1);

    await mudarStatus(id, 'EM_ATENDIMENTO', { previsaoReparo: em120 });
    await mudarStatus(outra.body.id, 'EM_ATENDIMENTO', { previsaoReparo: em45 });
    await aguardar(() => doTipo(app2, EVENTOS.bairroStatusAtualizado).length === 3);

    // O último evento considera as duas denúncias em aberto e escolhe a menor previsão (45 min).
    expect(doTipo(app2, EVENTOS.bairroStatusAtualizado).at(-1)).toMatchObject({
      emAberto: 2,
      previsaoReparo: em45.toISOString(),
    });
  });

  it('o autor cancela pelo app: o painel recebe a mudança e o bairro volta a NORMAL (RF-015)', async () => {
    const { id, maria, painel, app1, app2 } = await cenario();

    const res = await request(servidor.url)
      .post(`/api/v1/denuncias/${id}/cancelar`)
      .set('Authorization', `Bearer ${maria.token}`);
    expect(res.status).toBe(200);

    await aguardar(() => doTipo(painel, EVENTOS.statusAtualizado).length > 0);
    await aguardar(() => doTipo(app2, EVENTOS.bairroStatusAtualizado).length > 0);
    await aguardar(() => doTipo(app1, EVENTOS.statusAtualizado).length > 0);

    expect(doTipo(painel, EVENTOS.statusAtualizado)[0]).toMatchObject({
      id,
      statusAnterior: 'RECEBIDA',
      status: 'CANCELADA',
    });
    expect(doTipo(app2, EVENTOS.bairroStatusAtualizado)[0]).toMatchObject({
      status: 'NORMAL',
      emAberto: 0,
    });
    // Cancelada sai da lista pública: o evento público avisa os cidadãos para atualizar.
    expect(doTipo(app2, EVENTOS.ocorrenciaAtualizada)[0]).toMatchObject({
      id,
      status: 'CANCELADA',
    });
    // O evento privado só vai ao autor: outro cidadão não recebe.
    expect(doTipo(app2, EVENTOS.statusAtualizado)).toHaveLength(0);
  });

  it('se a conta do autor foi excluída, o painel ainda recebe e nada quebra', async () => {
    const { id, maria, painel } = await cenario();
    await prisma.usuario.delete({ where: { id: maria.id } }); // a denúncia fica anonimizada (autorId nulo)

    await mudarStatus(id, 'EM_ATENDIMENTO');
    await aguardar(() => doTipo(painel, EVENTOS.statusAtualizado).length > 0);

    expect(doTipo(painel, EVENTOS.statusAtualizado)[0]).toMatchObject({
      id,
      status: 'EM_ATENDIMENTO',
    });
  });
});

describe('servidor sem Socket.IO conectado', () => {
  it('o publicador não faz nada (nem falha) antes de receber o io', async () => {
    const sozinho = new PublicadorSocketIO(prisma);
    const maria = await registrarCidadao(servidor.app);
    const criada = await registrarDenuncia(maria.token);
    const d = await prisma.denuncia.findUniqueOrThrow({
      where: { id: criada.body.id },
      include: { bairro: true },
    });

    await expect(
      sozinho.statusAtualizado({
        denuncia: paraSnapshot(d),
        statusAnterior: 'RECEBIDA',
        alteradoEm: new Date(),
        por: 'Equatorial Pará',
      }),
    ).resolves.toBeUndefined();
  });
});
