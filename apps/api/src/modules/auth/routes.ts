import { Router } from 'express';

import type { Autenticacao } from '../../shared/auth';
import { limitadorLogin, type LimitesDeTaxa } from '../../shared/rate-limit';
import { validarCorpo } from '../../shared/validacao';
import { loginSchema, registerSchema } from './schemas';
import type { ServicoAuth } from './service';

type Deps = {
  servico: ServicoAuth;
  autenticar: Autenticacao['autenticar'];
  limites: LimitesDeTaxa;
};

/** Rotas de cadastro, login e do usuário logado (docs/10-api.md). */
export function criarRotasAuth({ servico, autenticar, limites }: Deps): Router {
  const router = Router();

  // RF-001, RF-002
  router.post('/auth/register', validarCorpo(registerSchema), async (req, res) => {
    res.status(201).json(await servico.registrar(req.body));
  });

  // RF-003, RF-026 (o mesmo login serve ao app e ao painel; o papel vem na resposta)
  router.post(
    '/auth/login',
    limitadorLogin(limites),
    validarCorpo(loginSchema),
    async (req, res) => {
      res.status(200).json(await servico.entrar(req.body));
    },
  );

  // Dados do usuário logado
  router.get('/me', autenticar, (req, res) => {
    const { id, nome, email, telefone, papel } = req.usuario!;
    res.json({ id, nome, email, telefone, papel });
  });

  return router;
}
