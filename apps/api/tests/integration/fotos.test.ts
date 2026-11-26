import { existsSync, readFileSync } from 'node:fs';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import request from 'supertest';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';

import { TAMANHO_MAXIMO_DA_FOTO } from '../../src/domain';
import { contarSegmentosApp1 } from '../../src/modules/fotos/metadados';
import {
  criarAppDeTeste,
  criarBairro,
  entrarComoOperador,
  limparBanco,
  prisma,
  registrarCidadao,
} from '../helpers/banco';
import { dimensoes, jpegComGps } from '../fixtures/construir-foto';

let pasta: string;
let app: ReturnType<typeof criarAppDeTeste>;
let bairro: Awaited<ReturnType<typeof criarBairro>>;

const FOTO_COM_GPS = Buffer.from(readFileSync(join(__dirname, '../fixtures/foto-com-gps.jpg')));
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const GIF = Buffer.from('GIF89a\u0001\u0000\u0001\u0000', 'latin1');

beforeEach(async () => {
  await limparBanco();
  bairro = await criarBairro();
  pasta = await mkdtemp(join(tmpdir(), 'taligado-fotos-'));
  app = criarAppDeTeste({}, { uploadsDir: pasta });
});
afterEach(() => rm(pasta, { recursive: true, force: true }));
afterAll(() => prisma.$disconnect());

type Anexo = { conteudo: Buffer; nome?: string; tipo?: string };
const jpeg = (nome = 'foto.jpg'): Anexo => ({ conteudo: FOTO_COM_GPS, nome, tipo: 'image/jpeg' });

/** Envia a denúncia em `multipart` (com ou sem fotos), como o app faz. */
function enviarComFotos(
  token: string,
  fotos: Anexo[],
  campos: Record<string, string> = {},
  alvo = app,
) {
  let req = request(alvo)
    .post('/api/v1/denuncias')
    .set('Authorization', `Bearer ${token}`)
    .field('tipo', 'SEM_ENERGIA')
    .field('bairroId', String(bairro.id))
    .field('logradouro', 'Av. VP-3, Folha 28');
  for (const [nome, valor] of Object.entries(campos)) req = req.field(nome, valor);
  for (const f of fotos) {
    req = req.attach('fotos', f.conteudo, {
      filename: f.nome ?? 'foto.jpg',
      contentType: f.tipo ?? 'image/jpeg',
    });
  }
  return req;
}

const arquivosNoDisco = async () => {
  const subpastas = await readdir(pasta);
  const todos: string[] = [];
  for (const sub of subpastas) {
    for (const nome of await readdir(join(pasta, sub))) todos.push(`${sub}/${nome}`); // sempre com "/", igual ao que vai para o banco
  }
  return todos;
};

const baixar = (token: string | null, denunciaId: string, fotoId: string) => {
  const req = request(app).get(`/api/v1/denuncias/${denunciaId}/fotos/${fotoId}`);
  return token ? req.set('Authorization', `Bearer ${token}`) : req;
};

describe('POST /denuncias em multipart: fotos (RF-009, RN-013, S-49, S-58)', () => {
  it('sem fotos, o multipart funciona como o JSON: campos de texto convertidos', async () => {
    const { token } = await registrarCidadao(app);

    const res = await enviarComFotos(token, [], {
      latitude: '-5.3712',
      longitude: '-49.1231',
      necessidadeEspecial: 'true',
      consentimentoNecessidade: 'true',
      faixaPessoas: 'DE_4_A_8',
    });

    expect(res.status).toBe(201);
    const d = await prisma.denuncia.findUniqueOrThrow({
      where: { id: res.body.id },
      include: { fotos: true },
    });
    expect(d.latitude?.toNumber()).toBeCloseTo(-5.3712, 4);
    expect(d.necessidadeEspecial).toBe(true);
    expect(d.faixaPessoas).toBe('DE_4_A_8');
    expect(d.fotos).toHaveLength(0);
    expect(await readdir(pasta)).toHaveLength(0);
  });

  it.each([1, 2, 3])('%i foto(s): 201, registros no banco e arquivos no disco', async (quantas) => {
    const { token } = await registrarCidadao(app);

    const res = await enviarComFotos(
      token,
      Array.from({ length: quantas }, (_, i) => jpeg(`f${i}.jpg`)),
    );

    expect(res.status).toBe(201);
    const fotos = await prisma.denunciaFoto.findMany({ where: { denunciaId: res.body.id } });
    expect(fotos).toHaveLength(quantas);
    expect((await arquivosNoDisco()).sort()).toEqual(fotos.map((f) => f.arquivo).sort());
    for (const f of fotos) {
      expect(f.mimeType).toBe('image/jpeg');
      expect(f.arquivo).toMatch(
        new RegExp(`^${res.body.id}/[0-9a-f-]{36}\\.jpg$`), // nome aleatório, pasta por denúncia
      );
    }
  });

  it('o arquivo gravado NÃO tem EXIF nem GPS, e a imagem continua abrindo (S-57)', async () => {
    const { token } = await registrarCidadao(app);

    const res = await enviarComFotos(token, [jpeg()]);
    const [foto] = await prisma.denunciaFoto.findMany({ where: { denunciaId: res.body.id } });
    const gravado = new Uint8Array(readFileSync(join(pasta, foto!.arquivo)));

    expect(contarSegmentosApp1(FOTO_COM_GPS)).toBe(2); // a de entrada tinha
    expect(contarSegmentosApp1(gravado)).toBe(0);
    for (const marca of ['Exif', 'xap', 'GPS']) {
      expect(Buffer.from(gravado).includes(marca, 0, 'latin1')).toBe(false);
    }
    expect(dimensoes(gravado)).toEqual({ largura: 16, altura: 8 });
    expect(foto!.tamanhoBytes).toBe(gravado.length);
  });

  it('4 fotos: 422 LIMITE_FOTOS, nada é criado nem gravado', async () => {
    const { token } = await registrarCidadao(app);

    const res = await enviarComFotos(token, [jpeg(), jpeg(), jpeg(), jpeg()]);

    expect(res.status).toBe(422);
    expect(res.body.erro.codigo).toBe('LIMITE_FOTOS');
    expect(await prisma.denuncia.count()).toBe(0);
    expect(await readdir(pasta)).toHaveLength(0);
  });

  it('6 fotos (acima do que o servidor aceita ler): também 422 LIMITE_FOTOS', async () => {
    const { token } = await registrarCidadao(app);

    const res = await enviarComFotos(
      token,
      Array.from({ length: 6 }, () => jpeg()),
    );

    expect(res.status).toBe(422);
    expect(res.body.erro.codigo).toBe('LIMITE_FOTOS');
    expect(await prisma.denuncia.count()).toBe(0);
  });

  it('foto acima de 5 MB: 413 ARQUIVO_INVALIDO', async () => {
    const { token } = await registrarCidadao(app);
    const grande = Buffer.concat([FOTO_COM_GPS, Buffer.alloc(TAMANHO_MAXIMO_DA_FOTO + 10)]);

    const res = await enviarComFotos(token, [{ conteudo: grande }]);

    expect(res.status).toBe(413);
    expect(res.body.erro.codigo).toBe('ARQUIVO_INVALIDO');
    expect(await prisma.denuncia.count()).toBe(0);
    expect(await readdir(pasta)).toHaveLength(0);
  });

  it.each([
    ['PNG', PNG, 'image/png', 'foto.png'],
    ['PNG renomeado .jpg e dizendo image/jpeg', PNG, 'image/jpeg', 'foto.jpg'],
    ['GIF dizendo image/jpeg', GIF, 'image/jpeg', 'foto.jpg'],
    ['texto dizendo image/jpeg', Buffer.from('oi, eu não sou foto'), 'image/jpeg', 'foto.jpg'],
  ])(
    '%s: 415 ARQUIVO_INVALIDO (o tipo vem do conteúdo, não do que o cliente diz)',
    async (_n, conteudo, tipo, nome) => {
      const { token } = await registrarCidadao(app);

      const res = await enviarComFotos(token, [jpeg(), { conteudo, tipo, nome }]);

      expect(res.status).toBe(415);
      expect(res.body.erro.codigo).toBe('ARQUIVO_INVALIDO');
      expect(res.body.erro.mensagem).toMatch(/foto 2/i);
      expect(await prisma.denuncia.count()).toBe(0);
      expect(await readdir(pasta)).toHaveLength(0); // a 1ª, que era boa, também não ficou
    },
  );

  it('um JPEG truncado (começa certo, mas está quebrado): 415', async () => {
    const { token } = await registrarCidadao(app);
    const quebrado = Buffer.from([0xff, 0xd8, 0xff, 0xe1, 0xff, 0xff, 0x00]);

    const res = await enviarComFotos(token, [{ conteudo: quebrado }]);

    expect(res.status).toBe(415);
    expect(res.body.erro.mensagem).toMatch(/não é um JPEG válido/);
  });

  it('arquivo em outro campo que não "fotos": 400 e nada é gravado', async () => {
    const { token } = await registrarCidadao(app);

    const res = await request(app)
      .post('/api/v1/denuncias')
      .set('Authorization', `Bearer ${token}`)
      .field('tipo', 'SEM_ENERGIA')
      .field('bairroId', String(bairro.id))
      .field('logradouro', 'Av. VP-3')
      .attach('anexo', FOTO_COM_GPS, { filename: 'a.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(400);
    expect(res.body.erro.codigo).toBe('VALIDACAO_ERRO');
    expect(await prisma.denuncia.count()).toBe(0);
  });

  it('erro de validação dos campos não deixa arquivo no disco (validação antes de gravar)', async () => {
    const { token } = await registrarCidadao(app);

    const res = await enviarComFotos(token, [jpeg()], { tipo: 'X' });

    expect(res.status).toBe(400);
    expect(await readdir(pasta)).toHaveLength(0);
  });

  it('já existe denúncia em aberto (409): os arquivos da tentativa são apagados (sem órfãos)', async () => {
    const { token } = await registrarCidadao(app);
    expect((await enviarComFotos(token, [jpeg()])).status).toBe(201);
    expect(await arquivosNoDisco()).toHaveLength(1);

    const res = await enviarComFotos(token, [jpeg(), jpeg()]);

    expect(res.status).toBe(409);
    expect(await arquivosNoDisco()).toHaveLength(1); // só a da primeira denúncia
  });

  it('o envio em JSON continua funcionando, sem fotos', async () => {
    const { token } = await registrarCidadao(app);

    const res = await request(app)
      .post('/api/v1/denuncias')
      .set('Authorization', `Bearer ${token}`)
      .send({ tipo: 'SEM_ENERGIA', bairroId: bairro.id, logradouro: 'Av. VP-3' });

    expect(res.status).toBe(201);
    expect(await prisma.denunciaFoto.count()).toBe(0);
  });

  it('sem token: 401; operador: 403', async () => {
    expect(
      (await request(app).post('/api/v1/denuncias').attach('fotos', FOTO_COM_GPS, 'a.jpg')).status,
    ).toBe(401);
    const operador = await entrarComoOperador(app);
    expect((await enviarComFotos(operador.token, [jpeg()])).status).toBe(403);
  });
});

describe('GET /denuncias/:id/fotos/:fotoId: acesso (RNF-015, RN-014)', () => {
  async function denunciaComFoto() {
    const maria = await registrarCidadao(app);
    const criada = await enviarComFotos(maria.token, [jpeg()]);
    const detalhe = await request(app)
      .get(`/api/v1/denuncias/${criada.body.id}`)
      .set('Authorization', `Bearer ${maria.token}`);
    return { maria, denunciaId: criada.body.id as string, foto: detalhe.body.fotos[0] };
  }

  it('o detalhe do autor lista a foto com a URL da rota autenticada', async () => {
    const { denunciaId, foto } = await denunciaComFoto();

    expect(foto).toEqual({
      id: expect.any(String),
      url: `/api/v1/denuncias/${denunciaId}/fotos/${foto.id}`,
    });
  });

  it('o autor baixa a própria foto: JPEG, sem cache, sem sniffing', async () => {
    const { maria, denunciaId, foto } = await denunciaComFoto();

    const res = await baixar(maria.token, denunciaId, foto.id);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/jpeg');
    expect(res.headers['cache-control']).toBe('private, no-store');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(Buffer.from(res.body).subarray(0, 3)).toEqual(Buffer.from([0xff, 0xd8, 0xff]));
    expect(contarSegmentosApp1(new Uint8Array(res.body))).toBe(0);
  });

  it('o operador também baixa, e o detalhe do painel lista a foto', async () => {
    const { denunciaId, foto } = await denunciaComFoto();
    const operador = await entrarComoOperador(app);

    expect((await baixar(operador.token, denunciaId, foto.id)).status).toBe(200);
    const detalhe = await request(app)
      .get(`/api/v1/painel/denuncias/${denunciaId}`)
      .set('Authorization', `Bearer ${operador.token}`);
    expect(detalhe.body.fotos).toEqual([
      { id: foto.id, url: `/api/v1/denuncias/${denunciaId}/fotos/${foto.id}` },
    ]);
  });

  it('outro cidadão recebe 404, igual a uma foto que não existe', async () => {
    const { denunciaId, foto } = await denunciaComFoto();
    const joao = await registrarCidadao(app);

    const alheia = await baixar(joao.token, denunciaId, foto.id);
    const inexistente = await baixar(
      joao.token,
      denunciaId,
      '00000000-0000-4000-8000-000000000000',
    );

    expect(alheia.status).toBe(404);
    expect(inexistente.status).toBe(404);
    expect(alheia.body).toEqual(inexistente.body.erro ? { erro: alheia.body.erro } : alheia.body);
    expect(alheia.body.erro.codigo).toBe('NAO_ENCONTRADO');
  });

  it('sem token: 401', async () => {
    const { denunciaId, foto } = await denunciaComFoto();

    expect((await baixar(null, denunciaId, foto.id)).status).toBe(401);
  });

  it('ids inválidos: 404 (não vira erro 500)', async () => {
    const maria = await registrarCidadao(app);

    expect((await baixar(maria.token, 'nao-e-uuid', 'tambem-nao')).status).toBe(404);
  });

  it('a foto de uma denúncia não é servida por outra denúncia (id da denúncia errado)', async () => {
    const { maria, foto } = await denunciaComFoto();

    const res = await baixar(maria.token, '11111111-1111-4111-8111-111111111111', foto.id);

    expect(res.status).toBe(404);
  });

  it('denúncia anonimizada (sem autor): nenhum cidadão vê a foto, o operador sim', async () => {
    const { maria, denunciaId, foto } = await denunciaComFoto();
    await prisma.denuncia.update({ where: { id: denunciaId }, data: { autorId: null } });
    const operador = await entrarComoOperador(app);

    expect((await baixar(maria.token, denunciaId, foto.id)).status).toBe(404);
    expect((await baixar(operador.token, denunciaId, foto.id)).status).toBe(200);
  });

  it('registro sem arquivo no disco: 404, sem vazar o caminho', async () => {
    const { maria, denunciaId, foto } = await denunciaComFoto();
    const [registro] = await prisma.denunciaFoto.findMany({ where: { denunciaId } });
    await rm(join(pasta, registro!.arquivo));

    const res = await baixar(maria.token, denunciaId, foto.id);

    expect(res.status).toBe(404);
    expect(JSON.stringify(res.body)).not.toContain(registro!.arquivo);
  });

  it('a pasta de fotos não é servida como arquivo estático', async () => {
    const { denunciaId, foto } = await denunciaComFoto();
    const [registro] = await prisma.denunciaFoto.findMany({ where: { denunciaId } });

    for (const caminho of [
      `/uploads/${registro!.arquivo}`,
      `/${registro!.arquivo}`,
      `/api/v1/uploads/${registro!.arquivo}`,
      `/api/v1/denuncias/${denunciaId}/fotos/${foto.id}.jpg`,
    ]) {
      // Nunca 200: ou a rota não existe (404) ou exige login (401), e nenhuma devolve a imagem.
      const res = await request(app).get(caminho);
      expect([401, 404]).toContain(res.status);
      expect(res.headers['content-type']).not.toBe('image/jpeg');
    }
    expect(existsSync(join(pasta, registro!.arquivo))).toBe(true);
  });
});

describe('fotos e o histórico da denúncia', () => {
  it('uma denúncia com fotos pode ser cancelada e as fotos continuam no detalhe do autor', async () => {
    const maria = await registrarCidadao(app);
    const criada = await enviarComFotos(maria.token, [jpeg(), jpeg()]);

    const res = await request(app)
      .post(`/api/v1/denuncias/${criada.body.id}/cancelar`)
      .set('Authorization', `Bearer ${maria.token}`);

    expect(res.status).toBe(200);
    expect(res.body.fotos).toHaveLength(2);
  });

  it('a foto de exemplo com EXIF não vaza para a visão pública das ocorrências', async () => {
    const maria = await registrarCidadao(app);
    const joao = await registrarCidadao(app);
    await enviarComFotos(maria.token, [jpeg()], { latitude: '-5.3712', longitude: '-49.1231' });

    const res = await request(app)
      .get('/api/v1/ocorrencias')
      .set('Authorization', `Bearer ${joao.token}`);

    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toMatch(/foto|jpg|arquivo/i);
  });
});

describe('jpegComGps (conferência do próprio teste)', () => {
  it('a foto gerada em memória também chega limpa', async () => {
    const { token } = await registrarCidadao(app);
    const res = await enviarComFotos(token, [{ conteudo: Buffer.from(jpegComGps()) }]);

    expect(res.status).toBe(201);
    const [foto] = await prisma.denunciaFoto.findMany({ where: { denunciaId: res.body.id } });
    expect(contarSegmentosApp1(new Uint8Array(readFileSync(join(pasta, foto!.arquivo))))).toBe(0);
  });
});
