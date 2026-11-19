import type { PrismaClient } from '@prisma/client';
import { Router } from 'express';

import { criarRotasAuth } from './modules/auth/routes';
import { criarServicoAuth } from './modules/auth/service';
import { criarAutenticacao } from './shared/auth';
import { limitadorGeral, LIMITES_PADRAO, type LimitesDeTaxa } from './shared/rate-limit';

export type RotasDeps = {
  prisma: PrismaClient;
  segredoJwt: string;
  limites?: Partial<LimitesDeTaxa>;
  /** Custo do bcrypt. Padrão 10 (RNF-011). */
  bcryptCost?: number;
};

/** Todas as rotas da API, montadas em `/api/v1` pelo `createApp`. */
export function criarRotas({ prisma, segredoJwt, limites, bcryptCost = 10 }: RotasDeps): Router {
  const limitesFinais: LimitesDeTaxa = { ...LIMITES_PADRAO, ...limites };
  const autenticacao = criarAutenticacao(prisma, segredoJwt);
  const router = Router();

  router.use(limitadorGeral(limitesFinais));

  router.use(
    criarRotasAuth({
      servico: criarServicoAuth({ prisma, segredoJwt, bcryptCost }),
      autenticar: autenticacao.autenticar,
      limites: limitesFinais,
    }),
  );

  return router;
}
