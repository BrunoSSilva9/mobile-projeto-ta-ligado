import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { criarArmazenamento } from '../../src/modules/fotos/armazenamento';

let pasta: string;
beforeEach(async () => {
  pasta = await mkdtemp(join(tmpdir(), 'taligado-armazenamento-'));
});
afterEach(() => rm(pasta, { recursive: true, force: true }));

describe('armazenamento das fotos (S-49)', () => {
  it('grava, lê e apaga, e a subpasta vazia some junto', async () => {
    const a = criarArmazenamento(pasta);
    const nome = a.nomeDoArquivo('den-1', 'foto-1');

    await a.gravar(nome, Uint8Array.from([1, 2, 3]));
    expect([...(await a.ler(nome))]).toEqual([1, 2, 3]);
    expect(await readdir(pasta)).toEqual(['den-1']);

    await a.apagar([nome]);
    expect(await readdir(pasta)).toEqual([]);
  });

  it('o nome é <denúncia>/<foto>.jpg', () => {
    expect(criarArmazenamento(pasta).nomeDoArquivo('d', 'f')).toBe('d/f.jpg');
  });

  it('apagar um arquivo que já não existe não é erro', async () => {
    await expect(criarArmazenamento(pasta).apagar(['d/nao-existe.jpg'])).resolves.toBeUndefined();
  });

  it('apagar uma foto mantém a pasta se sobrou outra da mesma denúncia', async () => {
    const a = criarArmazenamento(pasta);
    await a.gravar('d/1.jpg', Uint8Array.from([1]));
    await a.gravar('d/2.jpg', Uint8Array.from([2]));

    await a.apagar(['d/1.jpg']);

    expect(await readdir(join(pasta, 'd'))).toEqual(['2.jpg']);
  });

  it.each(['../fora.jpg', '../../etc/passwd', 'd/../../fora.jpg', '/etc/passwd'])(
    'recusa o caminho que sai da pasta raiz: %s',
    async (caminho) => {
      const a = criarArmazenamento(pasta);

      await expect(a.gravar(caminho, Uint8Array.from([1]))).rejects.toThrow(/inválido/);
      await expect(a.ler(caminho)).rejects.toThrow(/inválido/);
      await expect(a.apagar([caminho])).rejects.toThrow(/inválido/);
    },
  );

  it('nada é gravado fora da pasta raiz', async () => {
    const a = criarArmazenamento(pasta);
    await a.gravar('ok/1.jpg', Uint8Array.from([9]));

    expect(await readFile(join(pasta, 'ok', '1.jpg'))).toEqual(Buffer.from([9]));
  });
});
