import dotenv from 'dotenv';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET precisa ter pelo menos 16 caracteres'),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5173')
    .transform((valor) =>
      valor
        .split(',')
        .map((origem) => origem.trim())
        .filter(Boolean),
    ),
  UPLOADS_DIR: z.string().default('uploads'),
});

export type Env = z.infer<typeof schema>;

/** Lê e valida as variáveis de ambiente. Falha cedo, com mensagem clara, se algo estiver errado. */
export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const resultado = schema.safeParse(source);
  if (!resultado.success) {
    const problemas = resultado.error.issues
      .map((i) => `- ${i.path.join('.') || 'env'}: ${i.message}`)
      .join('\n');
    throw new Error(`Variáveis de ambiente inválidas:\n${problemas}`);
  }
  return resultado.data;
}

/** Carrega o arquivo .env (se existir) e valida. Usado apenas pelo servidor. */
export function loadEnvFromFile(): Env {
  dotenv.config({ quiet: true });
  return loadEnv();
}
