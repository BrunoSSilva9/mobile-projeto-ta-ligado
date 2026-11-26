import { mkdir, readFile, rm, rmdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Armazenamento das fotos no disco do servidor (decisão S-49; a nuvem é o item futuro B-109).
 *
 * A pasta fica **fora de qualquer rota pública**: nada aqui é servido por `express.static`; a única
 * saída é a rota autenticada `GET /denuncias/{id}/fotos/{fotoId}` (RNF-015). Os arquivos têm nome
 * aleatório (UUID) e ficam numa subpasta por denúncia. No banco só vai o caminho relativo
 * (`<denunciaId>/<fotoId>.jpg`), que este módulo resolve **sem deixar sair da pasta raiz**.
 */
export type Armazenamento = ReturnType<typeof criarArmazenamento>;

export function criarArmazenamento(pastaRaiz: string) {
  const raiz = path.resolve(pastaRaiz);

  /** Caminho absoluto do arquivo, recusando qualquer caminho que escape da pasta raiz. */
  function resolver(arquivo: string): string {
    const completo = path.resolve(raiz, arquivo);
    if (completo !== raiz && !completo.startsWith(raiz + path.sep)) {
      throw new Error('Caminho de arquivo inválido.');
    }
    return completo;
  }

  return {
    /** Nome relativo guardado no banco para uma foto da denúncia. */
    nomeDoArquivo: (denunciaId: string, fotoId: string) => `${denunciaId}/${fotoId}.jpg`,

    async gravar(arquivo: string, bytes: Uint8Array): Promise<void> {
      const destino = resolver(arquivo);
      await mkdir(path.dirname(destino), { recursive: true });
      await writeFile(destino, bytes);
    },

    async ler(arquivo: string): Promise<Buffer> {
      return readFile(resolver(arquivo));
    },

    /** Apaga os arquivos (e as subpastas vazias). Um arquivo que já não existe não é erro. */
    async apagar(arquivos: readonly string[]): Promise<void> {
      for (const arquivo of arquivos) {
        await rm(resolver(arquivo), { force: true });
      }
      const pastas = new Set(arquivos.map((a) => path.dirname(resolver(a))));
      for (const pasta of pastas) {
        // `rmdir` só remove pasta vazia: se sobrou algo, a pasta fica.
        if (pasta !== raiz) await rmdir(pasta).catch(() => undefined);
      }
    },
  };
}
