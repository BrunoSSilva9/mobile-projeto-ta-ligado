import { readFileSync } from 'node:fs';
import path from 'node:path';

import { VERSAO_TERMOS } from '@/config/constants';
import { POLITICA_DE_PRIVACIDADE, TERMOS_DE_USO, type DocumentoLegal } from '@/legal/conteudo';

/** Raiz do repositório: apps/mobile/src/legal -> 4 níveis acima. */
const DOCS = path.resolve(__dirname, '../../../../docs/legal');

function lerDocumento(arquivo: string): string {
  return readFileSync(path.join(DOCS, arquivo), 'utf8').replace(/\r/g, '');
}

/** Títulos "## N. Título" do Markdown, sem a numeração. */
const titulosDoMarkdown = (texto: string) =>
  [...texto.matchAll(/^## \d+\. (.+)$/gm)].map((m) => m[1]!.trim());

const documentos: [string, DocumentoLegal, string][] = [
  ['Termos de Uso', TERMOS_DE_USO, 'termos-de-uso.md'],
  ['Política de Privacidade', POLITICA_DE_PRIVACIDADE, 'politica-de-privacidade.md'],
];

describe.each(documentos)(
  '%s: o app e docs/legal continuam iguais (RF-002, PEN-03)',
  (_nome, documento, arquivo) => {
    const markdown = lerDocumento(arquivo);

    it('as seções têm os mesmos títulos, na mesma ordem, que o documento', () => {
      expect(documento.secoes.map((s) => s.titulo)).toEqual(titulosDoMarkdown(markdown));
    });

    it('a versão é a que o cadastro envia à API (RN-020)', () => {
      expect(documento.versao).toBe(VERSAO_TERMOS);
      expect(markdown).toContain(`**Versão:** ${VERSAO_TERMOS}`);
    });

    it('traz o aviso de texto para fins acadêmicos', () => {
      expect(documento.aviso).toMatch(/fins acadêmicos/i);
      expect(markdown).toMatch(/fins acadêmicos/i);
    });

    it('toda seção tem conteúdo', () => {
      for (const secao of documento.secoes) {
        const total = (secao.paragrafos?.length ?? 0) + (secao.itens?.length ?? 0);
        expect(total).toBeGreaterThan(0);
      }
    });

    it('o contato da equipe continua como pendência (nada inventado)', () => {
      const texto = JSON.stringify(documento);
      expect(texto).toContain('[PREENCHER: e-mail da equipe]');
      expect(markdown).toContain('[PREENCHER: e-mail da equipe]');
    });
  },
);

describe('conteúdo dos textos legais', () => {
  const tudo = JSON.stringify([TERMOS_DE_USO, POLITICA_DE_PRIVACIDADE]);

  it('informa o compartilhamento com a Equatorial Pará e que a integração é simulada', () => {
    expect(tudo).toContain('Equatorial Pará');
    expect(tudo).toMatch(/simulada/);
  });

  it('afirma que CPF e data de nascimento não são coletados', () => {
    expect(POLITICA_DE_PRIVACIDADE.secoes[1]!.paragrafos![0]).toMatch(/CPF/);
  });

  it('cita os direitos do titular, a ANPD e a retenção', () => {
    expect(tudo).toContain('art. 18');
    expect(tudo).toContain('ANPD');
    expect(tudo).toMatch(/Por quanto tempo guardamos/);
  });

  it('identifica a equipe como controlador, com os três integrantes', () => {
    for (const nome of ['Bruno Santos', 'Gustavo Borges', 'Marilia Francalino']) {
      expect(tudo).toContain(nome);
    }
  });
});
