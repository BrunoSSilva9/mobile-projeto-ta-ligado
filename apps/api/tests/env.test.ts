import { describe, expect, it } from 'vitest';

import { loadEnv } from '../src/config/env';

const base = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  JWT_SECRET: 'segredo-com-mais-de-16-caracteres',
};

describe('loadEnv', () => {
  it('aplica valores padrão', () => {
    const env = loadEnv(base);

    expect(env.PORT).toBe(3000);
    expect(env.NODE_ENV).toBe('development');
    expect(env.UPLOADS_DIR).toBe('uploads');
    expect(env.CORS_ORIGINS).toEqual(['http://localhost:5173']);
  });

  it('converte PORT e separa as origens do CORS', () => {
    const env = loadEnv({ ...base, PORT: '4000', CORS_ORIGINS: 'http://a.com, http://b.com' });

    expect(env.PORT).toBe(4000);
    expect(env.CORS_ORIGINS).toEqual(['http://a.com', 'http://b.com']);
  });

  it('falha com mensagem clara se faltar DATABASE_URL', () => {
    expect(() => loadEnv({ JWT_SECRET: base.JWT_SECRET })).toThrow(/DATABASE_URL/);
  });

  it('recusa JWT_SECRET curto', () => {
    expect(() => loadEnv({ ...base, JWT_SECRET: 'curto' })).toThrow(/JWT_SECRET/);
  });
});
