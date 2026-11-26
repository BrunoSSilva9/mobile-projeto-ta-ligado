import { Router } from 'express';

import type { Autenticacao } from '../../shared/auth';
import {
  limitadorExclusaoDeConta,
  limitadorLogin,
  type LimitesDeTaxa,
} from '../../shared/rate-limit';
import { validarCorpo } from '../../shared/validacao';
import { atualizarPerfilSchema, excluirContaSchema, loginSchema, registerSchema } from './schemas';
import type { ServicoAuth } from './service';

type Deps = {
  servico: ServicoAuth;
  autenticar: Autenticacao['autenticar'];
  exigirPapel: Autenticacao['exigirPapel'];
  limites: LimitesDeTaxa;
};

/** Rotas de cadastro, login e do usuário logado (docs/10-api.md). */
export function criarRotasAuth({ servico, autenticar, exigirPapel, limites }: Deps): Router {
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

  // RF-005: edita nome e telefone (o e-mail é somente leitura, S-22). Só cidadão.
  router.patch(
    '/me',
    autenticar,
    exigirPapel('CIDADAO'),
    validarCorpo(atualizarPerfilSchema),
    async (req, res) => {
      res.json(await servico.atualizarPerfil(req.usuario!.id, req.body));
    },
  );

  // RF-006, RN-024, S-50, S-59: exclui a conta, conferindo a senha atual. Só cidadão; as tentativas
  // com senha errada têm o mesmo limite do login.
  router.delete(
    '/me',
    autenticar,
    exigirPapel('CIDADAO'),
    limitadorExclusaoDeConta(limites),
    validarCorpo(excluirContaSchema),
    async (req, res) => {
      await servico.excluirConta(req.usuario!.id, req.body.senha);
      res.status(204).end();
    },
  );

  return router;
}
