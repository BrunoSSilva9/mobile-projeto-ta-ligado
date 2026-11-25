import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, sep } from 'path';

/**
 * Regra do design system v2 (docs/06, ADR-0006): **nenhuma cor, fonte ou caixa alta solta no
 * código das telas e dos componentes**. Tudo vem dos tokens de `src/theme`. Este teste lê os
 * arquivos de `src` (menos o tema e os testes) e falha se achar uma cor `#RRGGBB`/`rgba(`, um
 * `fontSize`, `fontWeight`, `letterSpacing`, `textTransform`, `toUpperCase()` ou um nome de fonte
 * escrito à mão.
 */
const RAIZ = join(__dirname, '..');

function arquivos(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) return arquivos(caminho);
    return /\.(ts|tsx)$/.test(nome) ? [caminho] : [];
  });
}

const DO_APP = arquivos(RAIZ).filter((caminho) => {
  const rel = relative(RAIZ, caminho).split(sep).join('/');
  return !rel.startsWith('theme/') && !/\.test\.tsx?$/.test(rel) && !rel.startsWith('testing/');
});

/** O código sem comentários (os comentários podem citar `#1D4ED8` à vontade). */
function semComentarios(codigo: string): string {
  return codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

const REGRAS: { nome: string; padrao: RegExp }[] = [
  {
    nome: 'cor hexadecimal (#RGB, #RRGGBB, #RRGGBBAA)',
    padrao: /#[0-9A-Fa-f]{8}\b|#[0-9A-Fa-f]{6}\b|#[0-9A-Fa-f]{3}\b/,
  },
  { nome: 'cor rgb()/rgba()/hsl()', padrao: /\b(?:rgba?|hsla?)\(/ },
  { nome: 'fontSize escrito à mão', padrao: /\bfontSize\s*:/ },
  {
    nome: 'fontWeight (a fonte é Regular ou Bold pelo `fontFamily` do tema)',
    padrao: /\bfontWeight\s*:/,
  },
  { nome: 'letterSpacing', padrao: /\bletterSpacing\s*:/ },
  { nome: 'textTransform (nada em caixa alta)', padrao: /\btextTransform\s*:/ },
  { nome: 'toUpperCase()', padrao: /\.toUpperCase\s*\(/ },
  { nome: 'nome de fonte escrito à mão', padrao: /\bfontFamily\s*:\s*['"`]/ },
  {
    nome: 'cor por nome (white, black)',
    padrao: /\b(?:color|backgroundColor|borderColor)\s*:\s*['"`](?:white|black)['"`]/i,
  },
];

describe('regras do tema: nada de cor, fonte ou caixa alta fora de src/theme', () => {
  it('encontra os arquivos do app (a busca não pode ficar vazia)', () => {
    expect(DO_APP.length).toBeGreaterThan(50);
    expect(DO_APP.some((c) => c.endsWith('MapaOcorrencias.tsx'))).toBe(true);
    expect(DO_APP.some((c) => /theme[\\/]colors\.ts$/.test(c))).toBe(false);
  });

  it.each(REGRAS)('nenhum arquivo tem $nome', ({ padrao }) => {
    const infratores = DO_APP.filter((caminho) =>
      padrao.test(semComentarios(readFileSync(caminho, 'utf-8'))),
    ).map((caminho) => relative(RAIZ, caminho).split(sep).join('/'));

    expect(infratores).toEqual([]);
  });

  it('o teste enxerga uma infração (garante que as regras não são vazias)', () => {
    for (const exemplo of [
      "const a = { color: '#1D4ED8' };",
      'const b = "rgba(0, 0, 0, 0.5)";',
      'const c = { fontSize: 14 };',
      'const d = x.toUpperCase();',
      "const e = { fontFamily: 'Arial' };",
    ]) {
      expect(REGRAS.some((r) => r.padrao.test(semComentarios(exemplo)))).toBe(true);
    }
    expect(REGRAS.some((r) => r.padrao.test(semComentarios('// cor #1D4ED8 no comentário')))).toBe(
      false,
    );
  });

  it('o tema em si respeita a escala: nenhuma fonte menor que 14 e nenhum letterSpacing negativo', () => {
    const tipografia = readFileSync(join(RAIZ, 'theme', 'typography.ts'), 'utf-8');
    const tamanhos = [...tipografia.matchAll(/fontSize:\s*(\d+)/g)].map((m) => Number(m[1]));
    expect(tamanhos.length).toBeGreaterThan(5);
    expect(Math.min(...tamanhos)).toBeGreaterThanOrEqual(14);
    expect(tipografia).not.toMatch(/letterSpacing:\s*-/);
  });

  it('o tema não guarda mais apelidos @deprecated da migração', () => {
    for (const nome of ['colors.ts', 'typography.ts', 'spacing.ts']) {
      expect(readFileSync(join(RAIZ, 'theme', nome), 'utf-8')).not.toMatch(/@deprecated/);
    }
  });
});
